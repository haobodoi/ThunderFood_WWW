package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.MockPaymentResult;
import vn.edu.iuh.fit.thunderfood.service.OrderService;
import vn.edu.iuh.fit.thunderfood.service.SepayConfiguration;

@Profile("sepay-mock")
@RestController
public class SepayMockController {
    public static final String PATH = "/api/webhooks/sepay/mock";

    public record Request(@NotBlank @Pattern(regexp = "(?i)TF(?:[0-9]{8}[2-9A-HJ-KM-NP-Z]{6}|-[0-9]{8}-[2-9A-HJ-KM-NP-Z]{6})") String code) {}

    private final OrderService orders;
    private final SepayConfiguration sepay;

    public SepayMockController(OrderService orders, SepayConfiguration sepay) {
        this.orders = orders;
        this.sepay = sepay;
    }

    @PostMapping(path = PATH, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<MockPaymentResult> pay(@RequestHeader(value = "Authorization", required = false) String authorization,
                                                 @Valid @RequestBody Request request) {
        if (!sepay.verifiesMock(authorization)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(orders.simulateSepay(request.code()));
    }
}
