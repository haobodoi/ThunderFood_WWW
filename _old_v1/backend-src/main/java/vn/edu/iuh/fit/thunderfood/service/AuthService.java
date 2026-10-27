package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.AccountType;
import vn.edu.iuh.fit.thunderfood.dto.RegisterRequest;
import vn.edu.iuh.fit.thunderfood.dto.UserResponse;
import vn.edu.iuh.fit.thunderfood.entity.AccountStatus;
import vn.edu.iuh.fit.thunderfood.entity.Restaurant;
import vn.edu.iuh.fit.thunderfood.entity.RestaurantStatus;
import vn.edu.iuh.fit.thunderfood.entity.Role;
import vn.edu.iuh.fit.thunderfood.entity.User;
import vn.edu.iuh.fit.thunderfood.exception.FieldValidationException;
import vn.edu.iuh.fit.thunderfood.repository.RestaurantRepository;
import vn.edu.iuh.fit.thunderfood.repository.RoleRepository;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizer;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private static final String PHONE_REGEX = "^0\\d{9}$";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final RestaurantRepository restaurantRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       RestaurantRepository restaurantRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.restaurantRepository = restaurantRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String fullName = InputNormalizer.text(request.fullName());
        String email = InputNormalizer.email(request.email());
        String phone = InputNormalizer.phone(request.phone());
        boolean partner = request.accountType() == AccountType.RESTAURANT_PARTNER;
        String restaurantName = InputNormalizer.text(request.restaurantName());
        String restaurantPhone = InputNormalizer.phone(request.restaurantPhone());
        String restaurantAddress = InputNormalizer.text(request.restaurantAddress());

        Map<String, String> errors = new LinkedHashMap<>();
        if (!request.password().equals(request.confirmPassword())) {
            errors.put("confirmPassword", "Mật khẩu nhập lại không khớp");
        }
        if (userRepository.existsByEmail(email)) {
            errors.put("email", "Email này đã được đăng ký");
        }
        if (userRepository.existsByPhone(phone)) {
            errors.put("phone", "Số điện thoại này đã được đăng ký");
        }
        if (partner) {
            if (InputNormalizer.isBlank(restaurantName)) {
                errors.put("restaurantName", "Vui lòng nhập tên nhà hàng");
            }
            if (InputNormalizer.isBlank(restaurantPhone)) {
                errors.put("restaurantPhone", "Vui lòng nhập số điện thoại nhà hàng");
            } else if (!restaurantPhone.matches(PHONE_REGEX)) {
                errors.put("restaurantPhone", "Số điện thoại gồm 10 chữ số và bắt đầu bằng 0");
            }
            if (InputNormalizer.isBlank(restaurantAddress)) {
                errors.put("restaurantAddress", "Vui lòng nhập địa chỉ nhà hàng");
            }
        }
        if (!errors.isEmpty()) {
            throw new FieldValidationException("Thông tin đăng ký chưa hợp lệ", errors);
        }

        String roleCode = request.accountType().getRoleCode();
        Role role = roleRepository.findByRoleCode(roleCode)
                .orElseThrow(() -> new IllegalStateException("Bảng roles chưa có role " + roleCode));

        User user = new User();
        user.setRole(role);
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setAccountStatus(AccountStatus.ACTIVE);
        User saved = userRepository.save(user);

        if (partner) {
            Restaurant restaurant = new Restaurant();
            restaurant.setOwnerUserId(saved.getId());
            restaurant.setRestaurantName(restaurantName);
            restaurant.setPhone(restaurantPhone);
            restaurant.setAddress(restaurantAddress);
            restaurant.setOpen(false);
            restaurant.setStatus(RestaurantStatus.PENDING);
            restaurantRepository.save(restaurant);
        }
        return UserResponse.from(saved);
    }

    @Transactional(readOnly = true)
    public Optional<UserResponse> findActiveUser(Long userId) {
        return userRepository.findById(userId)
                .filter(user -> !user.isLocked())
                .map(UserResponse::from);
    }
}
