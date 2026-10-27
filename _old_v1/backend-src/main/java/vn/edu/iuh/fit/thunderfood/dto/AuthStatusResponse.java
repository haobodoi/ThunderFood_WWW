package vn.edu.iuh.fit.thunderfood.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record AuthStatusResponse(boolean authenticated, UserResponse user) {

    public static AuthStatusResponse guest() {
        return new AuthStatusResponse(false, null);
    }

    public static AuthStatusResponse of(UserResponse user) {
        return new AuthStatusResponse(true, user);
    }
}
