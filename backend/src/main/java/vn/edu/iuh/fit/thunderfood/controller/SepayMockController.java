package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.iuh.fit.thunderfood.dto.OrderResponses.MockPaymentResult;
import vn.edu.iuh.fit.thunderfood.service.OrderPaymentService;
import vn.edu.iuh.fit.thunderfood.service.SepayConfiguration;

@Profile("sepay-mock")
@RestController
public class SepayMockController {
    public static final String PATH = "/api/webhooks/sepay/mock";

    public record Request(@NotBlank @Size(max = 18) String code) {}

    private final OrderPaymentService payments;
    private final SepayConfiguration sepay;

    public SepayMockController(OrderPaymentService payments, SepayConfiguration sepay) {
        this.payments = payments;
        this.sepay = sepay;
    }

    @PostMapping(path = PATH, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<MockPaymentResult> pay(@RequestHeader(value = "Authorization", required = false) String authorization,
                                                 @Valid @RequestBody Request request) {
        if (!sepay.verifiesMock(authorization)) return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        return ResponseEntity.ok(payments.simulateSepay(request.code()));
    }
}
