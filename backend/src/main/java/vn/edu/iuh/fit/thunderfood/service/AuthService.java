package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.RegisterRequestDto;
import vn.edu.iuh.fit.thunderfood.dto.UserResponseDto;
import vn.edu.iuh.fit.thunderfood.entity.RoleEntity;
import vn.edu.iuh.fit.thunderfood.entity.UserEntity;
import vn.edu.iuh.fit.thunderfood.enums.AccountStatusEnum;
import vn.edu.iuh.fit.thunderfood.exception.FieldValidationException;
import vn.edu.iuh.fit.thunderfood.repository.RoleRepository;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    public AuthService(UserRepository userRepository,
                       RoleRepository roleRepository,
                       PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public UserResponseDto register(RegisterRequestDto request) {
        String fullName = InputNormalizerUtil.text(request.fullName());
        String email = InputNormalizerUtil.email(request.email());
        String phone = InputNormalizerUtil.phone(request.phone());

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
        if (!errors.isEmpty()) {
            throw new FieldValidationException("Thông tin đăng ký chưa hợp lệ", errors);
        }

        String roleCode = request.accountType().getRoleCode().name();
        RoleEntity role = roleRepository.findByRoleCode(roleCode)
                .orElseThrow(() -> new IllegalStateException("Bảng roles chưa có role " + roleCode));

        UserEntity user = new UserEntity();
        user.setRole(role);
        user.setFullName(fullName);
        user.setEmail(email);
        user.setPhone(phone);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setAccountStatus(AccountStatusEnum.ACTIVE);
        return UserResponseDto.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public Optional<UserResponseDto> findActiveUser(Long userId) {
        return userRepository.findById(userId)
                .filter(user -> !user.isLocked())
                .map(UserResponseDto::from);
    }
}
