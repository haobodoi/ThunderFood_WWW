package vn.edu.iuh.fit.thunderfood.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.util.*;

/**
 * Kho chính sách đọc trực tiếp từ classpath:documents/*.md, tìm theo từ khóa (không phân biệt dấu tiếng Việt).
 * Dùng khi RAG/vector store hoặc dịch vụ AI không sẵn sàng, để trợ lý vẫn trả lời được câu hỏi chính sách
 * ngay lập tức thay vì báo lỗi hoặc chờ lâu.
 */
@Component
public class PolicyLibrary {
    private static final Logger log = LoggerFactory.getLogger(PolicyLibrary.class);
    private static final Set<String> STOP_WORDS = Set.of(
            "toi", "minh", "ban", "co", "duoc", "khong", "la", "va", "cua", "cho", "thi", "the", "nao", "gi", "khi",
            "sau", "truoc", "da", "dang", "se", "bi", "ve", "o", "tai", "nhu", "nhung", "cac", "mot", "neu", "hay",
            "voi", "de", "den", "tu", "trong", "nay", "do", "vay", "a", "oi", "nhe", "em", "anh", "chi", "lam", "sao",
            "bao", "lau", "nhieu", "ai", "ma", "roi", "con", "hoi", "muon", "can", "phai", "thunderfood", "khach",
            "goi", "vai", "ngon", "duoi", "tren", "xin", "giup", "vui", "long");

    /** Một mục chính sách: tên file, tiêu đề (tài liệu — mục) và nội dung. */
    public record Section(String source, String title, String body) {}

    private record Indexed(Section section, Set<String> words, Set<String> pairs, Set<String> titleWords) {}

    private final List<Indexed> sections;
    private final Map<String, Integer> documentFrequency = new HashMap<>();

    public PolicyLibrary() {
        this(load());
    }

    /** Dùng trong kiểm thử: nhận sẵn danh sách (tên file, nội dung markdown). */
    PolicyLibrary(Map<String, String> documents) {
        List<Indexed> list = new ArrayList<>();
        documents.forEach((file, markdown) -> parse(file, markdown).forEach(s -> list.add(index(s))));
        this.sections = List.copyOf(list);
        sections.forEach(s -> s.words().forEach(w -> documentFrequency.merge(w, 1, Integer::sum)));
    }

    public boolean isEmpty() { return sections.isEmpty(); }

    /** Các mục liên quan nhất tới câu hỏi, đã sắp theo độ phù hợp; rỗng nếu không có mục nào đủ liên quan. */
    public List<Section> search(String question, int limit) {
        List<String> tokens = contentTokens(question);
        if (tokens.isEmpty() || sections.isEmpty()) return List.of();
        Set<String> pairs = pairs(tokens);
        record Scored(Section section, double score) {}
        List<Scored> scored = new ArrayList<>();
        Set<String> distinct = new LinkedHashSet<>(tokens);
        // Cần khớp ít nhất 2 từ (hoặc một cụm 2 từ liền nhau) để tránh trả lời sai chủ đề chỉ vì trùng một từ đơn lẻ.
        int needed = Math.min(2, distinct.size());
        for (Indexed s : sections) {
            double score = 0;
            int matched = 0;
            boolean pairMatched = false;
            for (String w : distinct) {
                if (s.words().contains(w)) { score += idf(w) * (s.titleWords().contains(w) ? 1.5 : 1); matched++; }
            }
            for (String p : pairs) if (s.pairs().contains(p)) { score += 2.0; pairMatched = true; }
            if (score > 0 && (matched >= needed || pairMatched)) scored.add(new Scored(s.section(), score));
        }
        scored.sort(Comparator.comparingDouble(Scored::score).reversed());
        if (scored.isEmpty() || scored.getFirst().score() < 4.0) return List.of();
        double best = scored.getFirst().score();
        return scored.stream().filter(s -> s.score() >= best * 0.7).limit(limit).map(Scored::section).toList();
    }

    /** Câu trả lời trích nguyên văn chính sách, dùng khi không gọi được AI. */
    public static String quote(List<Section> found) {
        StringBuilder out = new StringBuilder();
        for (Section s : found) {
            if (!out.isEmpty()) out.append("\n\n");
            out.append("**").append(s.title()).append("**\n").append(s.body().strip());
        }
        return out.toString();
    }

    private double idf(String word) {
        return Math.log(1 + (double) sections.size() / documentFrequency.getOrDefault(word, 1));
    }

    private static Map<String, String> load() {
        Map<String, String> documents = new TreeMap<>();
        try {
            Resource[] files = new PathMatchingResourcePatternResolver().getResources("classpath:documents/*.md");
            for (Resource file : files) {
                try (var in = file.getInputStream()) {
                    documents.put(file.getFilename(), new String(in.readAllBytes(), StandardCharsets.UTF_8));
                }
            }
        } catch (IOException e) {
            log.warn("Không đọc được tài liệu chính sách", e);
        }
        return documents;
    }

    /** Chia tài liệu theo tiêu đề cấp 2 (##); tiêu đề cấp 1 (#) là tên tài liệu. */
    static List<Section> parse(String file, String markdown) {
        List<Section> result = new ArrayList<>();
        String document = file.replaceAll("\\.md$", "");
        String heading = null;
        StringBuilder body = new StringBuilder();
        for (String line : markdown.split("\\R")) {
            if (line.startsWith("# ")) { document = line.substring(2).trim(); continue; }
            if (line.startsWith("## ")) {
                if (heading != null && !body.toString().isBlank()) result.add(new Section(file, document + " — " + heading, body.toString()));
                heading = line.substring(3).trim();
                body.setLength(0);
                continue;
            }
            body.append(line).append('\n');
        }
        if (heading != null && !body.toString().isBlank()) result.add(new Section(file, document + " — " + heading, body.toString()));
        else if (heading == null && !body.toString().isBlank()) result.add(new Section(file, document, body.toString()));
        return result;
    }

    private static Indexed index(Section s) {
        String title = s.title();
        int dash = title.indexOf(" — ");
        List<String> titleTokens = contentTokens(dash < 0 ? title : title.substring(dash + 3));
        List<String> all = new ArrayList<>(titleTokens);
        all.addAll(contentTokens(s.body()));
        Set<String> pairs = pairs(titleTokens);
        pairs.addAll(pairs(contentTokens(s.body())));
        return new Indexed(s, new HashSet<>(all), pairs, new HashSet<>(titleTokens));
    }

    private static Set<String> pairs(List<String> tokens) {
        Set<String> result = new HashSet<>();
        for (int i = 1; i < tokens.size(); i++) result.add(tokens.get(i - 1) + " " + tokens.get(i));
        return result;
    }

    static List<String> contentTokens(String text) {
        List<String> tokens = new ArrayList<>();
        for (String t : normalize(text).split("[^a-z0-9]+")) {
            if (t.length() > 1 && !STOP_WORDS.contains(t) && !t.chars().allMatch(Character::isDigit)) tokens.add(t);
        }
        return tokens;
    }

    /** Bỏ dấu tiếng Việt, đổi đ → d, chữ thường. */
    public static String normalize(String value) {
        if (value == null) return "";
        String noMarks = Normalizer.normalize(value, Normalizer.Form.NFD).replaceAll("\\p{M}", "");
        return noMarks.replace('đ', 'd').replace('Đ', 'D').toLowerCase(Locale.ROOT);
    }
}
