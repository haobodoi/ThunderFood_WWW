package vn.edu.iuh.fit.thunderfood.dto;

import vn.edu.iuh.fit.thunderfood.entity.UserEntity;

public record UserResponseDto(
        Long id,
        String fullName,
        String email,
        String phone,
        String address,
        String avatarUrl,
        String role,
        String roleName
) {
    public static UserResponseDto from(UserEntity user) {
        return new UserResponseDto(
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
