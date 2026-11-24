package vn.edu.iuh.fit.thunderfood.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;
import java.util.stream.Stream;

public record SepayTransfer(@NotNull @Positive Long id,
                            @NotBlank @Size(max = 100) String gateway,
                            @NotNull @JsonFormat(pattern = "uuuu-MM-dd HH:mm:ss") LocalDateTime transactionDate,
                            @NotBlank @Size(max = 50) String accountNumber,
                            @Size(max = 100) String subAccount,
                            @Size(max = 190) String code,
                            @Size(max = 4000) String content,
                            @NotBlank @Size(max = 10) String transferType,
                            @NotNull @Positive BigDecimal transferAmount,
                            @Size(max = 190) String referenceCode) {
    private static final Pattern ORDER_REFERENCE = Pattern.compile("(?<![A-Z0-9])TF([0-9]{8})([2-9A-HJ-KM-NP-Z]{6})(?![A-Z0-9])");

    public Optional<String> orderCode() {
        var codes = Stream.of(code, content).filter(value -> value != null)
                .flatMap(value -> ORDER_REFERENCE.matcher(value.toUpperCase(Locale.ROOT)).results())
                .map(match -> "TF-" + match.group(1) + "-" + match.group(2))
                .distinct().limit(2).toList();
        return codes.size() == 1 ? Optional.of(codes.getFirst()) : Optional.empty();
    }
}
