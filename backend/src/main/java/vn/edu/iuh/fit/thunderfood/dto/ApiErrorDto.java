package vn.edu.iuh.fit.thunderfood.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.Map;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiErrorDto(String code, String message, Map<String, String> errors) {

    public static ApiErrorDto of(String code, String message) {
        return new ApiErrorDto(code, message, null);
    }
}
