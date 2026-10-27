package vn.edu.iuh.fit.thunderfood.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record OpeningHourDto(
        @NotNull(message = "Thiếu ngày trong tuần")
        @Min(value = 1, message = "Ngày trong tuần không hợp lệ")
        @Max(value = 7, message = "Ngày trong tuần không hợp lệ")
        Integer dayOfWeek,

        @NotNull(message = "Vui lòng chọn giờ mở cửa")
        LocalTime openTime,

        @NotNull(message = "Vui lòng chọn giờ đóng cửa")
        LocalTime closeTime
) {
}
