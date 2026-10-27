package vn.edu.iuh.fit.thunderfood.util;

import java.util.Locale;

public final class InputNormalizer {

    private InputNormalizer() {
    }

    public static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    public static String text(String value) {
        return value == null ? null : value.trim().replaceAll("\\s+", " ");
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
}
