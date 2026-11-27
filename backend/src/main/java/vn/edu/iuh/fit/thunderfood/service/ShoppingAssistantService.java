package vn.edu.iuh.fit.thunderfood.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.service.AssistantTools.Collected;
import vn.edu.iuh.fit.thunderfood.service.AssistantTools.DishCard;
import vn.edu.iuh.fit.thunderfood.service.AssistantTools.RestaurantCard;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * Trợ lý mua sắm: system prompt + chat memory (nhớ "món đầu tiên" khách vừa xem) + tool calling (tìm quán, món, giỏ)
 * + RAG chính sách (đoạn chính sách liên quan được thêm vào system prompt của lượt hỏi đó).
 * Khi dịch vụ AI chưa cấu hình, lỗi hoặc quá thời gian chờ, trả lời bằng {@link AssistantFallback}
 * để khách luôn nhận được phản hồi nhanh thay vì chờ rồi báo lỗi (BUG-014).
 */
@Service
public class ShoppingAssistantService {
    private static final Logger log = LoggerFactory.getLogger(ShoppingAssistantService.class);
    private static final String SYSTEM = """
            Bạn là trợ lý ảo tự động của ThunderFood, nền tảng đặt đồ ăn trực tuyến. Luôn trả lời bằng tiếng Việt, thân thiện, ngắn gọn.
            Bạn có thể: tìm quán, tìm món theo ngân sách, gợi ý món được đặt nhiều, xem thực đơn, xem giỏ hàng, thêm món vào giỏ,
            xem đơn hàng gần đây và giải đáp chính sách của ThunderFood.

            Quy tắc:
            - Chỉ dùng dữ liệu trả về từ công cụ hoặc phần "Chính sách liên quan". Không bịa tên quán, món, giá hay quy định.
            - Khi khách nêu tên một quán hoặc một món cụ thể, gọi ngay searchRestaurants hoặc searchDishes với đúng tên đó,
              không hỏi lại khu vực. Nếu không thấy, thử lại với từ khóa ngắn hơn (ví dụ "cơm tấm" thay vì cả tên quán dài).
              Khi khách muốn đặt món ở một quán, có thể gọi getRestaurantMenu để xem món của quán đó.
            - Chỉ khi khách hỏi "gần đây", "gần tôi": gọi getMyDeliveryAddress rồi tìm theo khu vực đó. Nếu không có địa chỉ hoặc
              không có quán trong khu vực, nói rõ rồi gợi ý quán phù hợp ở nơi khác.
            - Ưu tiên giới thiệu quán đang mở cửa; nếu quán đang đóng cửa thì nói rõ.
            - Giao diện tự hiện thẻ cho các quán và món bạn vừa tìm được, kèm nút "Xem quán", "Thêm vào giỏ" và "Đặt ngay".
              Vì vậy KHÔNG viết đường dẫn hay URL nào; hãy mời khách bấm các nút trên thẻ bên dưới.
            - Nếu khách muốn bạn thêm món vào giỏ qua tin nhắn: nêu tên món, quán, số lượng, đơn giá và hỏi xác nhận.
              Chỉ gọi addToCart khi khách đồng ý rõ ràng (ví dụ "đồng ý", "ok", "thêm đi").
            - Bạn không tự đặt hàng hay thanh toán. Sau khi thêm vào giỏ, nhắc khách mở Giỏ hàng để nhập địa chỉ và đặt hàng.
            - Nếu công cụ trả về "error", giải thích ngắn gọn cho khách bằng lời thân thiện.
            - Định dạng: dùng **chữ đậm** cho tên quán, món và giá; dùng danh sách gạch đầu dòng "- " hoặc đánh số "1. ".
              Không dùng bảng, không dùng tiêu đề #, không chèn ảnh. Giá viết dạng 35.000đ.
            - Câu hỏi không liên quan đến ăn uống hay ThunderFood: trả lời thật ngắn (một câu) là bạn không hỗ trợ nội dung đó,
              không gọi công cụ, rồi gợi ý một việc bạn có thể giúp.
            """;

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final VectorStore vectorStore;
    private final PolicyLibrary library;
    private final AssistantFallback fallback;
    private final boolean ragEnabled;
    private final boolean aiConfigured;
    private final int topK;
    private final double threshold;

    public ShoppingAssistantService(ChatClient.Builder builder, ChatMemory chatMemory, VectorStore vectorStore, AssistantTools tools,
                                    PolicyLibrary library, AssistantFallback fallback,
                                    @Value("${app.ai.rag.enabled:false}") boolean ragEnabled,
                                    @Value("${spring.ai.anthropic.api-key:}") String apiKey,
                                    @Value("${app.ai.rag.top-k:4}") int topK,
                                    @Value("${app.ai.assistant.policy-threshold:0.6}") double threshold) {
        this.chatClient = builder
                .defaultTools(tools)
                .defaultAdvisors(MessageChatMemoryAdvisor.builder(chatMemory).build())
                .build();
        this.chatMemory = chatMemory;
        this.vectorStore = vectorStore;
        this.library = library;
        this.fallback = fallback;
        this.ragEnabled = ragEnabled;
        this.aiConfigured = isConfigured(apiKey);
        this.topK = topK;
        this.threshold = threshold;
    }

    /** Khóa API chưa đặt (giá trị mặc định "not-configured") thì không gọi AI, trả lời nhanh bằng dữ liệu hệ thống. */
    static boolean isConfigured(String apiKey) {
        return apiKey != null && !apiKey.isBlank() && !"not-configured".equalsIgnoreCase(apiKey.trim());
    }

    public AssistantReply chat(long customerId, String message) {
        if (!aiConfigured) return fallbackReply(customerId, message);
        List<Policy> policies = relatedPolicies(message);
        String system = policies.isEmpty() ? SYSTEM : SYSTEM + "\nChính sách liên quan (chỉ dùng khi câu hỏi liên quan tới chính sách):\n"
                + policies.stream().map(p -> "[" + p.source() + "]\n" + p.text()).collect(Collectors.joining("\n\n"));
        var collected = new Collected();
        String answer;
        try {
            answer = chatClient.prompt()
                    .system(system)
                    .user(message)
                    .toolContext(Map.<String, Object>of(AssistantTools.CUSTOMER_ID, customerId, AssistantTools.COLLECTED, collected))
                    .advisors(a -> a.param(ChatMemory.CONVERSATION_ID, conversationId(customerId)))
                    .call()
                    .content();
        } catch (RuntimeException e) {
            log.warn("Gọi model trợ lý thất bại, trả lời bằng dữ liệu hệ thống", e);
            return fallbackReply(customerId, message);
        }
        if (answer == null || answer.isBlank()) return fallbackReply(customerId, message);
        // Chỉ ghi nguồn chính sách khi câu trả lời không dựa vào công cụ (câu hỏi thuần về chính sách).
        List<String> sources = collected.toolUsed() ? List.of()
                : policies.stream().map(Policy::source).filter(Objects::nonNull).distinct().toList();
        return new AssistantReply(answer, sources, collected.cartChanged(), collected.restaurants(), collected.dishes());
    }

    private AssistantReply fallbackReply(long customerId, String message) {
        try {
            return fallback.reply(customerId, message);
        } catch (RuntimeException e) {
            log.warn("Trả lời dự phòng của trợ lý thất bại", e);
            throw new BusinessException("Trợ lý AI tạm thời không phản hồi. Vui lòng thử lại sau.");
        }
    }

    public void reset(long customerId) {
        chatMemory.clear(conversationId(customerId));
    }

    private record Policy(String source, String text) {}

    /** Vector store chỉ dùng khi bật RAG (tránh chờ kết nối Qdrant/Ollama không chạy); không có thì dùng kho chính sách cục bộ. */
    private List<Policy> relatedPolicies(String message) {
        if (ragEnabled) {
            try {
                List<Document> docs = vectorStore.similaritySearch(SearchRequest.builder()
                        .query(message).topK(topK).similarityThreshold(threshold).build());
                return docs.stream().map(d -> new Policy(sourceOf(d), d.getText())).toList();
            } catch (RuntimeException e) {
                log.warn("Không truy xuất được chính sách cho trợ lý, dùng kho chính sách cục bộ", e);
            }
        }
        return library.search(message, 2).stream().map(s -> new Policy(s.source(), s.title() + "\n" + s.body())).toList();
    }

    /** Tên file chính sách: "filename" do bộ nạp đặt, hoặc "source" do TextReader đặt cho dữ liệu nạp trước đó. */
    static String sourceOf(Document d) {
        Object name = d.getMetadata().get("filename");
        if (name == null) name = d.getMetadata().get("source");
        return name == null ? null : name.toString();
    }

    private static String conversationId(long customerId) { return "customer-" + customerId; }

    public record AssistantReply(String answer, List<String> sources, boolean cartUpdated,
                                 List<RestaurantCard> restaurants, List<DishCard> dishes) {}
}
