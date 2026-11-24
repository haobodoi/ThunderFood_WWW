package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;
import vn.edu.iuh.fit.thunderfood.repository.SepayPaymentRepository.Recipient;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Clock;
import java.util.Arrays;
import java.util.HexFormat;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Component
public class SepayConfiguration {
    private static final Pattern SIGNATURE = Pattern.compile("sha256=[a-fA-F0-9]{64}");
    private static final Pattern TIMESTAMP = Pattern.compile("[0-9]{1,12}");

    private final Clock clock;
    private final byte[] secret;
    private final byte[] mockAuthorization;
    private final Set<String> accounts;
    private final boolean mock;

    public SepayConfiguration(Clock clock, Environment environment, @Value("${app.sepay.webhook-secret}") String secret,
                              @Value("${app.sepay.bank-accounts}") String accounts,
                              @Value("${app.sepay.mock-token}") String mockToken) {
        this.clock = clock;
        this.mock = environment.matchesProfiles("sepay-mock");
        this.secret = secret.isBlank() ? new byte[0] : secret.getBytes(StandardCharsets.UTF_8);
        this.mockAuthorization = ("Apikey " + mockToken).getBytes(StandardCharsets.UTF_8);
        this.accounts = accounts.isBlank() ? Set.of() : Arrays.stream(accounts.split(",", -1))
                .map(String::strip).collect(Collectors.toUnmodifiableSet());
        if (mock && (enabled() || !this.accounts.isEmpty())) {
            throw new IllegalArgumentException("Profile sepay-mock yêu cầu để trống khóa và tài khoản SePay thật");
        }
        if (mock && mockToken.isBlank()) {
            throw new IllegalArgumentException("Cần cấu hình SEPAY_MOCK_TOKEN cho profile sepay-mock");
        }
        if (this.accounts.stream().anyMatch(account -> !account.matches("[0-9]{6}:[0-9]{6,19}"))) {
            throw new IllegalArgumentException("SEPAY_BANK_ACCOUNTS phải có định dạng BIN:SỐ_TÀI_KHOẢN");
        }
        if (!this.accounts.isEmpty() && !enabled()) {
            throw new IllegalArgumentException("Cần cấu hình SEPAY_WEBHOOK_SECRET cho tài khoản theo dõi qua SePay");
        }
    }

    public boolean enabled() {
        return secret.length > 0;
    }

    public boolean mockEnabled() {
        return mock;
    }

    public boolean verifiesMock(String authorization) {
        return mock && authorization != null
                && MessageDigest.isEqual(mockAuthorization, authorization.getBytes(StandardCharsets.UTF_8));
    }

    public boolean tracks(Recipient recipient) {
        return accounts.contains(recipient.bankBin() + ":" + recipient.accountNumber());
    }

    public boolean verifies(String timestamp, String signature, byte[] body) {
        if (!enabled() || timestamp == null || signature == null || !TIMESTAMP.matcher(timestamp).matches()
                || !SIGNATURE.matcher(signature).matches()
                || Math.abs(clock.instant().getEpochSecond() - Long.parseLong(timestamp)) > 300) return false;
        try {
            var mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            mac.update((timestamp + ".").getBytes(StandardCharsets.UTF_8));
            byte[] provided = HexFormat.of().parseHex(signature, "sha256=".length(), signature.length());
            return MessageDigest.isEqual(mac.doFinal(body), provided);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("Không thể xác minh chữ ký SePay", e);
        }
    }
}
