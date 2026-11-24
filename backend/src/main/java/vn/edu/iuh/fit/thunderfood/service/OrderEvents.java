package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Báo cho trình duyệt biết đơn vừa đổi. Sự kiện chỉ mang mã đơn: client tải lại qua API thường,
 * nên dữ liệu vẫn đi qua đúng kiểm tra quyền. Danh sách kết nối nằm trong bộ nhớ, đủ cho một instance backend.
 */
@Component
public class OrderEvents {
    public record OrderChanged(long orderId, long customerId, long partnerId, boolean created) {}

    /** Hết hạn thì trình duyệt tự kết nối lại, nhờ đó tài khoản bị khóa hoặc đã đăng xuất mất luồng sau tối đa 5 phút. */
    private static final long STREAM_TIMEOUT_MS = 5 * 60 * 1000;
    private static final int MAX_STREAMS_PER_USER = 5;
    private static final long HEARTBEAT_MS = 25 * 1000;

    private final Map<Long, List<SseEmitter>> streams = new ConcurrentHashMap<>();

    public SseEmitter subscribe(long userId) {
        var emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(emitter::complete);
        emitter.onError(error -> remove(userId, emitter));
        SseEmitter oldest = null;
        synchronized (streams) {
            var mine = streams.computeIfAbsent(userId, id -> new CopyOnWriteArrayList<>());
            if (mine.size() >= MAX_STREAMS_PER_USER) oldest = mine.removeFirst();
            mine.add(emitter);
        }
        if (oldest != null) oldest.complete();
        // Gửi ngay một dòng để header đi qua proxy, EventSource biết đã kết nối.
        send(userId, emitter, SseEmitter.event().comment("connected"));
        return emitter;
    }

    /** Chạy sau commit: client nhận tín hiệu rồi tải lại sẽ luôn thấy dữ liệu mới. */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOrderChanged(OrderChanged event) {
        var data = Map.of("orderId", event.orderId(), "created", event.created());
        for (long userId : List.of(event.customerId(), event.partnerId())) {
            var mine = streams.get(userId);
            if (mine == null) continue;
            mine.forEach(emitter -> send(userId, emitter,
                    SseEmitter.event().name("order").data(data, MediaType.APPLICATION_JSON)));
        }
    }

    /** Giữ kết nối qua proxy và dọn các kết nối đã chết. */
    @Scheduled(fixedDelay = HEARTBEAT_MS)
    public void heartbeat() {
        streams.forEach((userId, mine) -> mine.forEach(
                emitter -> send(userId, emitter, SseEmitter.event().comment("ping"))));
    }

    private void remove(long userId, SseEmitter emitter) {
        synchronized (streams) {
            var mine = streams.get(userId);
            if (mine == null) return;
            mine.remove(emitter);
            if (mine.isEmpty()) streams.remove(userId);
        }
    }

    private void send(long userId, SseEmitter emitter, SseEmitter.SseEventBuilder event) {
        try {
            emitter.send(event);
        } catch (IOException | IllegalStateException closed) {
            remove(userId, emitter);
            emitter.complete();
        }
    }
}
