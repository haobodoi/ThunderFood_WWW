package vn.edu.iuh.fit.thunderfood.util;

import java.text.Normalizer;
import java.util.Locale;

public final class InputNormalizerUtil {

    private InputNormalizerUtil() {
    }

    public static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public static String text(String value) {
        return value == null ? null : value.trim().replaceAll("\\s+", " ");
    }

    public static String textOrNull(String value) {
        String normalized = text(value);
        return isBlank(normalized) ? null : normalized;
    }

    public static String email(String value) {
        return value == null ? null : value.trim().toLowerCase(Locale.ROOT);
    }

    public static String phone(String value) {
        if (value == null) {
            return null;
        }
        String digits = value.replaceAll("[\\s.\\-()]", "");
        if (digits.startsWith("+84")) {
            digits = "0" + digits.substring(3);
        } else if (digits.startsWith("84") && digits.length() == 11) {
            digits = "0" + digits.substring(2);
        }
        return digits;
    }

    public static String phoneOrNull(String value) {
        String normalized = phone(value);
        return isBlank(normalized) ? null : normalized;
    }

    public static String foldName(String value) {
        if (value == null) {
            return "";
        }
        String noAccent = Normalizer.normalize(value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "")
                .replace('đ', 'd')
                .replace('Đ', 'D');
        return noAccent.trim().replaceAll("\\s+", " ").toUpperCase(Locale.ROOT);
    }
}
