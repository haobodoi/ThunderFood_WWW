package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.thunderfood.dto.AccountRequests.Password;
import vn.edu.iuh.fit.thunderfood.dto.AccountRequests.Profile;
import vn.edu.iuh.fit.thunderfood.dto.UserResponseDto;
import vn.edu.iuh.fit.thunderfood.enums.UploadKindEnum;
import vn.edu.iuh.fit.thunderfood.exception.BusinessException;
import vn.edu.iuh.fit.thunderfood.exception.FieldValidationException;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.repository.UserRepository;
import vn.edu.iuh.fit.thunderfood.util.InputNormalizerUtil;

import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Set;

@Service
@Transactional
public class AccountService {
    private static final Set<String> EDITABLE_ROLES = Set.of("CUSTOMER", "RESTAURANT_PARTNER");

    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final FileStorageService files;

    public AccountService(UserRepository users, PasswordEncoder passwords, FileStorageService files) {
        this.users = users;
        this.passwords = passwords;
        this.files = files;
    }

    private vn.edu.iuh.fit.thunderfood.entity.UserEntity editable(long id) {
        var user = users.findWithLockById(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy tài khoản"));
        if (!EDITABLE_ROLES.contains(user.getRole().getRoleCode()))
            throw new BusinessException("Vai trò này không có quyền tự chỉnh sửa tài khoản");
        return user;
    }

    public UserResponseDto update(long id, Profile request) {
        var user = editable(id);
        String phone = InputNormalizerUtil.phone(request.phone());
        if (users.existsByPhoneAndIdNot(phone, id))
            throw new FieldValidationException("Thông tin cá nhân chưa hợp lệ", Map.of("phone", "Số điện thoại này đã được đăng ký"));
        user.setFullName(InputNormalizerUtil.text(request.fullName()));
        user.setPhone(phone);
        user.setAddress(InputNormalizerUtil.textOrNull(request.address()));
        return UserResponseDto.from(user);
    }

    public UserResponseDto uploadAvatar(long id, MultipartFile file) {
        var user = editable(id);
        user.setAvatarUrl(files.store(id, UploadKindEnum.PROFILE_AVATAR, file));
        return UserResponseDto.from(user);
    }

    public UserResponseDto clearAvatar(long id) {
        var user = editable(id);
        user.setAvatarUrl(null);
        return UserResponseDto.from(user);
    }

    public void changePassword(long id, Password request) {
        var user = editable(id);
        if (!passwords.matches(request.currentPassword(), user.getPasswordHash()))
            throw new FieldValidationException("Không thể đổi mật khẩu", Map.of("currentPassword", "Mật khẩu hiện tại không đúng"));
        if (!request.newPassword().equals(request.confirmPassword()))
            throw new FieldValidationException("Không thể đổi mật khẩu", Map.of("confirmPassword", "Mật khẩu nhập lại không khớp"));
        if (request.newPassword().getBytes(StandardCharsets.UTF_8).length > 72)
            throw new FieldValidationException("Không thể đổi mật khẩu", Map.of("newPassword", "Mật khẩu tối đa 72 byte UTF-8"));
        user.setPasswordHash(passwords.encode(request.newPassword()));
    }
}
