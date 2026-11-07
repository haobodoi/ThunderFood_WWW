package vn.edu.iuh.fit.thunderfood.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.document.Document;
import org.springframework.ai.reader.TextReader;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/** Nạp tài liệu chính sách vào vector store: đọc -> chia nhỏ -> lưu (embedding do VectorStore thực hiện). */
@Component
@ConditionalOnProperty(name = "app.ai.rag.enabled", havingValue = "true")
public class PolicyDocumentIngestor {
    private static final Logger log = LoggerFactory.getLogger(PolicyDocumentIngestor.class);
    private final VectorStore vectorStore;

    public PolicyDocumentIngestor(VectorStore vectorStore) { this.vectorStore = vectorStore; }

    @EventListener(ApplicationReadyEvent.class)
    public void ingest() throws IOException {
        Resource[] files = new PathMatchingResourcePatternResolver().getResources("classpath:documents/*.md");
        var splitter = new TokenTextSplitter();
        List<Document> chunks = new ArrayList<>();
        for (Resource file : files) {
            var reader = new TextReader(file);
            reader.setCharset(StandardCharsets.UTF_8);
            var parts = splitter.apply(reader.get());
            for (int i = 0; i < parts.size(); i++) {
                String source = file.getFilename() + "#" + i;
                // ID cố định: chạy lại ứng dụng sẽ ghi đè đúng các đoạn cũ, không nhân đôi dữ liệu.
                String id = UUID.nameUUIDFromBytes(source.getBytes(StandardCharsets.UTF_8)).toString();
                var metadata = new java.util.HashMap<String, Object>(parts.get(i).getMetadata());
                metadata.put("filename", file.getFilename());
                chunks.add(new Document(id, parts.get(i).getText(), metadata));
            }
        }
        if (!chunks.isEmpty()) vectorStore.add(chunks);
        log.info("Đã nạp {} đoạn từ {} tài liệu chính sách", chunks.size(), files.length);
    }
}
