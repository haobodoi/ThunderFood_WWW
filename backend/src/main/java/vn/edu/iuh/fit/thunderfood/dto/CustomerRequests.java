package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.*;

public final class CustomerRequests {
    private CustomerRequests() {}
    public record AddItem(@NotNull @Positive Long itemId, @Min(1) @Max(99) int quantity,
                          @Size(max = 300) String note, @NotNull @PositiveOrZero Long version) {}
    public record ChangeItem(@Min(1) @Max(99) int quantity, @Size(max = 300) String note,
                             @NotNull @PositiveOrZero Long version) {}
    public record Review(@NotNull @Positive Long orderId, @Min(1) @Max(5) int rating,
                         @NotBlank @Size(max = 1000) String content) {}
    public record EditReview(@Min(1) @Max(5) int rating, @NotBlank @Size(max = 1000) String content,
                             @NotNull @PositiveOrZero Long version) {}
    public record Reply(@NotBlank @Size(max = 1000) String content, @NotNull @PositiveOrZero Long version) {}
    public record Report(@NotBlank String reasonCode, @NotBlank @Size(min = 5, max = 500) String reason) {}
    public record Moderate(@NotBlank String status, @NotBlank @Size(min = 5, max = 500) String reason,
                           @NotNull @PositiveOrZero Long version) {}
    public record ResolveReport(@NotBlank String status, @NotBlank @Size(max = 500) String note) {}
}
