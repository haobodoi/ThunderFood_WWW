package vn.edu.iuh.fit.thunderfood.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthStatusDto(boolean authenticated, UserResponseDto user) {

    public static AuthStatusDto guest() {
        return new AuthStatusDto(false, null);
    }

    public static AuthStatusDto of(UserResponseDto user) {
        return new AuthStatusDto(true, user);
    }
}
