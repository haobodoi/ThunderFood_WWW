package vn.edu.iuh.fit.thunderfood.util;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.Optional;

/** Dựng chuỗi VietQR (chuẩn EMVCo của NAPAS) cho lệnh chuyển nhanh 24/7 đến số tài khoản. */
public final class VietQrUtil {

    private static final String NAPAS_AID = "A000000727";
    private static final String TO_ACCOUNT_SERVICE = "QRIBFTTA";
    private static final String DYNAMIC_QR = "12";
    private static final String CURRENCY_VND = "704";
    private static final int MAX_AMOUNT_DIGITS = 13;
    private static final int MAX_CONTENT_LENGTH = 25;

    /** Khóa là tên ngân hàng trong form đăng ký quán (frontend/src/utils/bankUtils.js). */
    private static final Map<String, String> BANK_BINS = Map.ofEntries(
            Map.entry("Vietcombank", "970436"),
            Map.entry("VietinBank", "970415"),
            Map.entry("BIDV", "970418"),
            Map.entry("Agribank", "970405"),
            Map.entry("Techcombank", "970407"),
            Map.entry("MB Bank", "970422"),
            Map.entry("ACB", "970416"),
            Map.entry("VPBank", "970432"),
            Map.entry("TPBank", "970423"),
            Map.entry("Sacombank", "970403"),
            Map.entry("VIB", "970441"),
            Map.entry("HDBank", "970437"),
            Map.entry("SHB", "970443"),
            Map.entry("OCB", "970448"),
            Map.entry("MSB", "970426"),
            Map.entry("SeABank", "970440"),
            Map.entry("Eximbank", "970431"),
            Map.entry("LPBank", "970449"),
            Map.entry("Nam A Bank", "970428"),
            Map.entry("Bac A Bank", "970409")
    );

    private VietQrUtil() {
    }

    public static Optional<String> binOf(String bankName) {
        return bankName == null ? Optional.empty() : Optional.ofNullable(BANK_BINS.get(bankName.trim()));
    }

    /** VND không có phần lẻ; QR chỉ hợp lệ với số tiền dương, nguyên và vừa trường 54. */
    public static boolean isPayableAmount(BigDecimal amount) {
        if (amount == null || amount.signum() <= 0) {
            return false;
        }
        BigDecimal normalized = amount.stripTrailingZeros();
        return normalized.scale() <= 0 && normalized.toPlainString().length() <= MAX_AMOUNT_DIGITS;
    }

    public static String payload(String bin, String accountNumber, BigDecimal amount, String content) {
        if (bin == null || !bin.matches("\\d{6}")) {
            throw new IllegalArgumentException("Mã BIN ngân hàng không hợp lệ");
        }
        if (accountNumber == null || !accountNumber.matches("\\d{6,19}")) {
            throw new IllegalArgumentException("Số tài khoản không hợp lệ");
        }
        if (!isPayableAmount(amount)) {
            throw new IllegalArgumentException("Số tiền không hợp lệ");
        }
        if (content == null || !content.matches("[A-Za-z0-9]{1," + MAX_CONTENT_LENGTH + "}")) {
            throw new IllegalArgumentException("Nội dung chuyển khoản không hợp lệ");
        }

        String beneficiary = field("00", bin) + field("01", accountNumber);
        String merchantAccount = field("00", NAPAS_AID) + field("01", beneficiary) + field("02", TO_ACCOUNT_SERVICE);
        String body = field("00", "01")
                + field("01", DYNAMIC_QR)
                + field("38", merchantAccount)
                + field("53", CURRENCY_VND)
                + field("54", amount.stripTrailingZeros().toPlainString())
                + field("58", "VN")
                + field("62", field("08", content))
                + "6304";
        return body + crc16(body);
    }

    private static String field(String id, String value) {
        return id + "%02d".formatted(value.length()) + value;
    }

    /** CRC-16/CCITT-FALSE, được tính trên toàn bộ chuỗi kể cả "6304". */
    static String crc16(String value) {
        int crc = 0xFFFF;
        for (byte b : value.getBytes(StandardCharsets.UTF_8)) {
            crc ^= (b & 0xFF) << 8;
            for (int i = 0; i < 8; i++) {
                crc = (crc & 0x8000) != 0 ? (crc << 1) ^ 0x1021 : crc << 1;
                crc &= 0xFFFF;
            }
        }
        return "%04X".formatted(crc);
    }
}
