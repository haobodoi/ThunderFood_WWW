package vn.edu.iuh.fit.thunderfood.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import vn.edu.iuh.fit.thunderfood.util.OrderCodeUtil;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

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
    public Optional<String> orderCode() {
        return OrderCodeUtil.findReference(code, content);
    }
}
