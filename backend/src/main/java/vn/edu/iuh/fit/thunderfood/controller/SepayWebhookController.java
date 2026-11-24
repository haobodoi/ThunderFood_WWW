package vn.edu.iuh.fit.thunderfood.controller;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Validator;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.iuh.fit.thunderfood.dto.SepayTransfer;
import vn.edu.iuh.fit.thunderfood.service.OrderService;
import vn.edu.iuh.fit.thunderfood.service.SepayConfiguration;

import java.io.IOException;

@RestController
public class SepayWebhookController {
    public static final String PATH = "/api/webhooks/sepay";
    private static final int MAX_BODY_BYTES = 16 * 1024;

    public record Result(boolean success) {}

    private final SepayConfiguration sepay;
    private final OrderService orders;
    private final ObjectMapper json;
    private final Validator validator;

    public SepayWebhookController(SepayConfiguration sepay, OrderService orders, ObjectMapper json, Validator validator) {
        this.sepay = sepay;
        this.orders = orders;
        this.json = json;
        this.validator = validator;
    }

    @PostMapping(path = PATH, consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<Result> receive(HttpServletRequest request,
                                          @RequestHeader(value = "X-SePay-Timestamp", required = false) String timestamp,
                                          @RequestHeader(value = "X-SePay-Signature", required = false) String signature)
            throws IOException {
        if (!sepay.enabled()) return failure(HttpStatus.NOT_FOUND);
        byte[] body = request.getInputStream().readNBytes(MAX_BODY_BYTES + 1);
        if (body.length > MAX_BODY_BYTES) return failure(HttpStatus.PAYLOAD_TOO_LARGE);
        if (!sepay.verifies(timestamp, signature, body)) return failure(HttpStatus.UNAUTHORIZED);

        SepayTransfer transfer;
        try {
            transfer = json.readValue(body, SepayTransfer.class);
        } catch (JsonProcessingException malformed) {
            return failure(HttpStatus.BAD_REQUEST);
        }
        if (transfer == null || !validator.validate(transfer).isEmpty()) return failure(HttpStatus.BAD_REQUEST);
        orders.reconcileSepay(transfer);
        return ResponseEntity.ok(new Result(true));
    }

    private static ResponseEntity<Result> failure(HttpStatus status) {
        return ResponseEntity.status(status).body(new Result(false));
    }
}
