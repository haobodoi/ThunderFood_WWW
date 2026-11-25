package vn.edu.iuh.fit.thunderfood.util;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.MatchResult;
import java.util.regex.Pattern;
import java.util.stream.Stream;

public final class OrderCodeUtil {
    private static final String ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
    private static final int SUFFIX_LENGTH = 6;
    private static final String ORDER_CODE = "TF(-?)([0-9]{8})\\1([" + ALPHABET + "]{" + SUFFIX_LENGTH + "})";
    private static final Pattern EXACT_CODE = Pattern.compile(ORDER_CODE, Pattern.CASE_INSENSITIVE);
    private static final Pattern REFERENCE = Pattern.compile(
            "(?<![A-Z0-9])" + ORDER_CODE + "(?![A-Z0-9])", Pattern.CASE_INSENSITIVE);
    private static final SecureRandom RANDOM = new SecureRandom();

    private OrderCodeUtil() {}

    public static String generate(LocalDate date) {
        var suffix = new StringBuilder(SUFFIX_LENGTH);
        for (int i = 0; i < SUFFIX_LENGTH; i++) {
            suffix.append(ALPHABET.charAt(RANDOM.nextInt(ALPHABET.length())));
        }
        return format(date.format(DateTimeFormatter.BASIC_ISO_DATE), suffix.toString());
    }

    public static String transferContent(String orderCode) {
        return orderCode.replace("-", "");
    }

    public static Optional<String> parse(String code) {
        var match = EXACT_CODE.matcher(code);
        return match.matches() ? Optional.of(normalize(match)) : Optional.empty();
    }

    public static Optional<String> findReference(String code, String content) {
        var matches = Stream.of(code, content).filter(value -> value != null)
                .flatMap(value -> REFERENCE.matcher(value).results())
                .map(OrderCodeUtil::normalize)
                .distinct().limit(2).toList();
        return matches.size() == 1 ? Optional.of(matches.getFirst()) : Optional.empty();
    }

    private static String normalize(MatchResult match) {
        return format(match.group(2), match.group(3).toUpperCase(Locale.ROOT));
    }

    private static String format(String date, String suffix) {
        return "TF-" + date + "-" + suffix;
    }
}
