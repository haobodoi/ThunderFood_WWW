package vn.edu.iuh.fit.thunderfood.config;

import org.springframework.ai.retry.NonTransientAiException;
import org.springframework.boot.web.client.RestClientCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.retry.support.RetryTemplate;

import java.net.http.HttpClient;
import java.time.Duration;

/**
 * Giới hạn thời gian chờ dịch vụ AI (BUG-014).
 * Mặc định Spring AI thử lại 10 lần với backoff tăng tới 3 phút, nên khi mất mạng hoặc dịch vụ AI lỗi,
 * khách phải chờ hàng phút mới nhận được báo lỗi. Ở đây chỉ thử lại 1 lần, backoff ngắn,
 * và mọi lời gọi HTTP của RestClient có timeout kết nối/đọc rõ ràng.
 */
@Configuration
public class AiResilienceConfig {
    static final Duration CONNECT_TIMEOUT = Duration.ofSeconds(5);
    static final Duration READ_TIMEOUT = Duration.ofSeconds(25);

    /** Thay RetryTemplate mặc định của Spring AI (bean này có @ConditionalOnMissingBean). */
    @Bean
    public RetryTemplate retryTemplate() {
        return RetryTemplate.builder()
                .maxAttempts(2)
                .exponentialBackoff(Duration.ofMillis(500), 2, Duration.ofSeconds(2))
                .notRetryOn(NonTransientAiException.class)
                .build();
    }

    /** Timeout cho RestClient do Spring Boot tạo (Spring AI dùng để gọi Anthropic/Ollama). */
    @Bean
    public RestClientCustomizer aiTimeoutCustomizer() {
        return builder -> {
            var factory = new JdkClientHttpRequestFactory(HttpClient.newBuilder().connectTimeout(CONNECT_TIMEOUT).build());
            factory.setReadTimeout(READ_TIMEOUT);
            builder.requestFactory(factory);
        };
    }
}
