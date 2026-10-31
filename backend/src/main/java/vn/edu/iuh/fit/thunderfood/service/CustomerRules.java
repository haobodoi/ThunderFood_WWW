package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Component;
import vn.edu.iuh.fit.thunderfood.enums.AccountStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.CustomerDataRepository;
import vn.edu.iuh.fit.thunderfood.repository.OpeningHourRepository;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;

import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Map;

@Component
public class CustomerRules {
    private final UserRepository users;
    private final OpeningHourRepository openingHours;
    private final Clock clock;
    public CustomerRules(UserRepository users, OpeningHourRepository openingHours, Clock clock) { this.users = users; this.openingHours = openingHours; this.clock = clock; }
    public LocalDateTime now() { return LocalDateTime.now(clock); }
    /** Also serializes writes by one actor, including first-cart creation and rate checks. */
    public void actor(long id, String role, boolean lock) {
        var user = (lock ? users.findWithLockById(id) : users.findById(id)).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản"));
        if (user.getAccountStatus() != AccountStatusEnum.ACTIVE || !role.equals(user.getRole().getRoleCode()))
            throw new BusinessException("Tài khoản không có quyền thực hiện thao tác này");
    }
    public static String text(String value, int min, int max) {
        String result = Normalizer.normalize(value == null ? "" : value.strip(), Normalizer.Form.NFC);
        int length = result.codePointCount(0, result.length());
        if (length < min || length > max) throw new BusinessException("Nội dung phải có từ " + min + " đến " + max + " ký tự");
        return result;
    }
    public static void version(long current, long expected) {
        if (current != expected) throw new ConcurrentUpdateException();
    }
    public static void version(Map<String, Object> row, long expected) { version(CustomerDataRepository.number(row, "version"), expected); }
    public boolean open(long restaurantId, boolean manualOpen) {
        if (!manualOpen) return false;
        var now = now();
        return openingHours.findByRestaurantIdAndDayOfWeek(restaurantId, now.getDayOfWeek().getValue()).stream().anyMatch(h ->
                !now.toLocalTime().isBefore(h.getOpenTime()) && now.toLocalTime().isBefore(h.getCloseTime()));
    }
    public static boolean flag(Object value) { return Boolean.TRUE.equals(value) || value instanceof Number n && n.intValue() != 0; }
}
