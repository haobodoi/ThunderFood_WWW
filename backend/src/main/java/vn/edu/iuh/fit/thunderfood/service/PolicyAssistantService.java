package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

/** RAG: truy xuất đoạn chính sách liên quan rồi đưa vào prompt, model chỉ trả lời dựa trên đoạn đó. */
@Service
public class PolicyAssistantService {
    private static final String SYSTEM = """
            Bạn là trợ lý hỗ trợ khách hàng của ThunderFood.
            Chỉ trả lời dựa trên phần "Ngữ cảnh" trong tin nhắn của người dùng.
            Nếu ngữ cảnh không có thông tin cần thiết, hãy nói rõ là chưa có thông tin và khuyên khách liên hệ quán hoặc bộ phận hỗ trợ.
            Trả lời bằng tiếng Việt, ngắn gọn, không bịa thêm quy định.
            """;
    private static final String NO_CONTEXT = "Hiện chưa có thông tin về câu hỏi này trong chính sách của ThunderFood. Vui lòng liên hệ quán hoặc bộ phận hỗ trợ.";

    private final ChatClient chatClient;
    private final VectorStore vectorStore;
    private final int topK;
    private final double threshold;

    public PolicyAssistantService(ChatClient.Builder builder, VectorStore vectorStore,
                                  @Value("${app.ai.rag.top-k:4}") int topK,
                                  @Value("${app.ai.rag.similarity-threshold:0.5}") double threshold) {
        this.chatClient = builder.build();
        this.vectorStore = vectorStore;
        this.topK = topK;
        this.threshold = threshold;
    }

    public PolicyAnswer ask(String question) {
        var docs = vectorStore.similaritySearch(SearchRequest.builder()
                .query(question).topK(topK).similarityThreshold(threshold).build());
        if (docs.isEmpty()) return new PolicyAnswer(NO_CONTEXT, List.of());

        String context = docs.stream()
                .map(d -> "[" + ShoppingAssistantService.sourceOf(d) + "]\n" + d.getText())
                .collect(Collectors.joining("\n\n"));
        String answer = chatClient.prompt()
                .system(SYSTEM)
                .user("Ngữ cảnh:\n" + context + "\n\nCâu hỏi: " + question)
                .call()
                .content();
        List<String> sources = docs.stream()
                .map(ShoppingAssistantService::sourceOf).filter(java.util.Objects::nonNull)
                .distinct().toList();
        return new PolicyAnswer(answer, sources);
    }

    public record PolicyAnswer(String answer, List<String> sources) {}
}
