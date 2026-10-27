package vn.edu.iuh.fit.thunderfood.dto;

import vn.edu.iuh.fit.thunderfood.entity.User;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        String phone,
        String address,
        String avatarUrl,
        String role,
        String roleName
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                user.getAddress(),
                user.getAvatarUrl(),
                user.getRole().getRoleCode(),
                user.getRole().getRoleName()
        );
    }
}
