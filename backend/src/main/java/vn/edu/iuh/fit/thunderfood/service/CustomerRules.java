package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Component;
import vn.edu.iuh.fit.thunderfood.repository.CustomerDataRepository;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException;

import java.sql.Time;
import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Map;
import static vn.edu.iuh.fit.thunderfood.repository.CustomerDataRepository.number;

@Component
public class CustomerRules {
    private final CustomerDataRepository db;
    private final Clock clock;
    public CustomerRules(CustomerDataRepository db, Clock clock) { this.db = db; this.clock = clock; }
    public LocalDateTime now() { return LocalDateTime.now(clock); }
    /** Also serializes writes by one actor, including first-cart creation and rate checks. */
    public void actor(long id, String role, boolean lock) {
        var user = db.one("SELECT u.account_status, r.role_code FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.user_id=?" + (lock ? " FOR UPDATE" : ""), id);
        if (!"ACTIVE".equals(user.get("account_status")) || !role.equals(user.get("role_code")))
            throw new BusinessException("Tài khoản không có quyền thực hiện thao tác này");
    }
    public static String text(String value, int min, int max) {
        String result = Normalizer.normalize(value == null ? "" : value.strip(), Normalizer.Form.NFC);
        int length = result.codePointCount(0, result.length());
        if (length < min || length > max) throw new BusinessException("Nội dung phải có từ " + min + " đến " + max + " ký tự");
        return result;
    }
    public static void version(Map<String, Object> row, long expected) {
        if (number(row, "version") != expected) throw new ConcurrentUpdateException();
    }
    public boolean open(long restaurantId, boolean manualOpen) {
        if (!manualOpen) return false;
        var now = now();
        return db.rows("SELECT open_time, close_time FROM restaurant_opening_hours WHERE restaurant_id=? AND day_of_week=?",
                restaurantId, now.getDayOfWeek().getValue()).stream().anyMatch(h ->
                !now.toLocalTime().isBefore(time(h.get("open_time"))) && now.toLocalTime().isBefore(time(h.get("close_time"))));
    }
    private static LocalTime time(Object value) { return value instanceof Time t ? t.toLocalTime() : LocalTime.parse(value.toString()); }
    public static boolean flag(Object value) { return Boolean.TRUE.equals(value) || value instanceof Number n && n.intValue() != 0; }
}
