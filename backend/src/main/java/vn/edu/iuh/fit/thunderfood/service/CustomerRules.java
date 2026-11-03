package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Component;
import vn.edu.iuh.fit.thunderfood.entity.OpeningHourEntity;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantEntity;
import vn.edu.iuh.fit.thunderfood.enums.AccountStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.ConcurrentUpdateException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.OpeningHourRepository;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;

import java.text.Normalizer;
import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

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
    public boolean open(long restaurantId, boolean manualOpen) {
        if (!manualOpen) return false;
        var now = now();
        return openingHours.findByRestaurantIdAndDayOfWeek(restaurantId, now.getDayOfWeek().getValue()).stream().anyMatch(h -> within(h, now));
    }
    /** Như open() nhưng cho nhiều quán một lúc, để liệt kê giỏ không tốn một truy vấn giờ mở cửa cho mỗi quán. */
    public Set<Long> openRestaurants(Collection<RestaurantEntity> restaurants) {
        var manualOpen = restaurants.stream().filter(RestaurantEntity::getOpen).map(RestaurantEntity::getId).toList();
        if (manualOpen.isEmpty()) return Set.of();
        var now = now();
        return openingHours.findByRestaurantIdInAndDayOfWeek(manualOpen, now.getDayOfWeek().getValue()).stream()
                .filter(h -> within(h, now)).map(h -> h.getRestaurant().getId()).collect(Collectors.toSet());
    }
    private static boolean within(OpeningHourEntity hour, LocalDateTime now) {
        return !now.toLocalTime().isBefore(hour.getOpenTime()) && now.toLocalTime().isBefore(hour.getCloseTime());
    }
}
