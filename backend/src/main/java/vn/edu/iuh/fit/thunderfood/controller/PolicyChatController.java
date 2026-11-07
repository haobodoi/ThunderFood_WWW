package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.thunderfood.service.PolicyAssistantService;
import vn.edu.iuh.fit.thunderfood.service.PolicyAssistantService.PolicyAnswer;

@RestController
@RequestMapping("/api/customer/ai")
public class PolicyChatController {
    private final PolicyAssistantService assistant;

    public PolicyChatController(PolicyAssistantService assistant) { this.assistant = assistant; }

    @PostMapping("/policy-chat")
    public PolicyAnswer ask(@Valid @RequestBody PolicyQuestion request) {
        return assistant.ask(request.question());
    }

    public record PolicyQuestion(@NotBlank @Size(max = 500) String question) {}
}
