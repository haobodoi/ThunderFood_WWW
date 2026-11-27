package vn.edu.iuh.fit.thunderfood.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

/**
 * RAG: truy xuất đoạn chính sách liên quan rồi đưa vào prompt, model chỉ trả lời dựa trên đoạn đó.
 * Khi RAG tắt hoặc vector store lỗi, tìm trong kho chính sách cục bộ ({@link PolicyLibrary}).
 * Khi dịch vụ AI chưa cấu hình hoặc lỗi, trả nguyên văn mục chính sách liên quan thay vì báo lỗi (BUG-007).
 */
@Service
public class PolicyAssistantService {
    private static final Logger log = LoggerFactory.getLogger(PolicyAssistantService.class);
    private static final String SYSTEM = """
            Bạn là trợ lý hỗ trợ khách hàng của ThunderFood.
            Chỉ trả lời dựa trên phần "Ngữ cảnh" trong tin nhắn của người dùng.
            Nếu ngữ cảnh không có thông tin cần thiết, hãy nói rõ là chưa có thông tin và khuyên khách liên hệ quán hoặc bộ phận hỗ trợ.
            Trả lời bằng tiếng Việt, ngắn gọn, không bịa thêm quy định.
            """;
    private static final String NO_CONTEXT = "Hiện chưa có thông tin về câu hỏi này trong chính sách của ThunderFood. "
            + "Bạn thử hỏi về hủy đơn, thanh toán, hoàn tiền, phí giao hàng, giỏ hàng hoặc đánh giá, hoặc liên hệ quán để được hỗ trợ.";

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final PolicyLibrary library;
    private final boolean ragEnabled;
    private final boolean aiConfigured;
    private final int topK;
    private final double threshold;

    public PolicyAssistantService(ChatClient.Builder builder, VectorStore vectorStore, PolicyLibrary library,
                                  @Value("${app.ai.rag.enabled:false}") boolean ragEnabled,
                                  @Value("${spring.ai.anthropic.api-key:}") String apiKey,
                                  @Value("${app.ai.rag.top-k:4}") int topK,
                                  @Value("${app.ai.rag.similarity-threshold:0.5}") double threshold) {
        this.chatClient = builder.build();
        this.vectorStore = vectorStore;
        this.library = library;
        this.ragEnabled = ragEnabled;
        this.aiConfigured = ShoppingAssistantService.isConfigured(apiKey);
        this.topK = topK;
        this.threshold = threshold;
    }

    public PolicyAnswer ask(String question) {
        List<Context> context = retrieve(question);
        if (context.isEmpty()) return new PolicyAnswer(NO_CONTEXT, List.of());
        List<String> sources = context.stream().map(Context::source).filter(Objects::nonNull).distinct().toList();

        if (aiConfigured) {
            try {
                String text = context.stream().map(c -> "[" + c.source() + "]\n" + c.text()).collect(Collectors.joining("\n\n"));
                String answer = chatClient.prompt()
                        .system(SYSTEM)
                        .user("Ngữ cảnh:\n" + text + "\n\nCâu hỏi: " + question)
                        .call()
                        .content();
                if (answer != null && !answer.isBlank()) return new PolicyAnswer(answer, sources);
            } catch (RuntimeException e) {
                log.warn("Gọi model trả lời chính sách thất bại, dùng nguyên văn chính sách", e);
            }
        }
        // Không gọi được AI: trích các mục chính sách khớp nhất từ kho cục bộ.
        var sections = library.search(question, 2);
        if (sections.isEmpty()) return new PolicyAnswer(NO_CONTEXT, List.of());
        return new PolicyAnswer("Theo chính sách của ThunderFood:\n\n" + PolicyLibrary.quote(sections) + "\n\n" + AssistantFallback.NOTICE,
                sections.stream().map(PolicyLibrary.Section::source).distinct().toList());
    }

    private record Context(String source, String text) {}

    private List<Context> retrieve(String question) {
        if (ragEnabled) {
            try {
                List<Document> docs = vectorStore.similaritySearch(SearchRequest.builder()
                        .query(question).topK(topK).similarityThreshold(threshold).build());
                if (!docs.isEmpty()) return docs.stream().map(d -> new Context(ShoppingAssistantService.sourceOf(d), d.getText())).toList();
            } catch (RuntimeException e) {
                log.warn("Không truy xuất được vector store chính sách, dùng kho chính sách cục bộ", e);
            }
        }
        return library.search(question, 3).stream().map(s -> new Context(s.source(), s.title() + "\n" + s.body())).toList();
    }

    public record PolicyAnswer(String answer, List<String> sources) {}
}
