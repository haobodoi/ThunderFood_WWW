package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public final class RestaurantProfileUpdateDtos {
    private RestaurantProfileUpdateDtos() {}

    public record Payload(@NotNull @Valid RestaurantBasicDto basic,
                          @NotNull @Valid RestaurantRepresentativeDto representative,
                          @NotNull @Valid RestaurantBankDto bank,
                          @NotNull @Valid RestaurantDetailsDto details) {}

    public record Save(@NotNull @Valid Payload payload, long version) {}

    public record Reject(@Size(min = 5, max = 500, message = "Lý do từ chối phải từ 5 đến 500 ký tự") String reason) {}

    public record Response(long requestId,
                           long restaurantId,
                           String restaurantName,
                           String status,
                           String reason,
                           long version,
                           LocalDateTime submittedAt,
                           LocalDateTime reviewedAt,
                           Payload proposed,
                           RestaurantRegistrationDto current) {}
}
