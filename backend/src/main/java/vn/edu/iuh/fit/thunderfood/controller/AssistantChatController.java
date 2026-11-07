package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.service.ShoppingAssistantService;
import vn.edu.iuh.fit.thunderfood.service.ShoppingAssistantService.AssistantReply;

/** Trợ lý ảo cho khách: id khách lấy từ phiên đăng nhập, không nhận từ request. */
@RestController
@RequestMapping("/api/customer/ai/assistant")
public class AssistantChatController {
    private final ShoppingAssistantService assistant;

    public AssistantChatController(ShoppingAssistantService assistant) { this.assistant = assistant; }

    @PostMapping
    public AssistantReply chat(@AuthenticationPrincipal UserDetailsDto user, @Valid @RequestBody AssistantMessage request) {
        return assistant.chat(user.getId(), request.message().trim());
    }

    @DeleteMapping("/history")
    public ResponseEntity<Void> reset(@AuthenticationPrincipal UserDetailsDto user) {
        assistant.reset(user.getId());
        return ResponseEntity.noContent().build();
    }

    public record AssistantMessage(@NotBlank @Size(max = 500) String message) {}
}
