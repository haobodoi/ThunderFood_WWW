package vn.edu.iuh.fit.thunderfood.controller;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.thunderfood.dto.AccountRequests.Password;
import vn.edu.iuh.fit.thunderfood.dto.AccountRequests.Profile;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.dto.UserResponseDto;
import vn.edu.iuh.fit.thunderfood.service.AccountService;

@RestController
@RequestMapping("/api/account")
public class AccountController {
    private final AccountService service;
    public AccountController(AccountService service) { this.service = service; }

    @PutMapping("/profile")
    public UserResponseDto profile(@AuthenticationPrincipal UserDetailsDto user, @Valid @RequestBody Profile request) {
        return service.update(user.getId(), request);
    }

    @PostMapping("/avatar")
    public UserResponseDto avatar(@AuthenticationPrincipal UserDetailsDto user, @RequestPart("file") MultipartFile file) {
        return service.uploadAvatar(user.getId(), file);
    }

    @DeleteMapping("/avatar")
    public UserResponseDto clearAvatar(@AuthenticationPrincipal UserDetailsDto user) { return service.clearAvatar(user.getId()); }

    @PutMapping("/password")
    public void password(@AuthenticationPrincipal UserDetailsDto user, @Valid @RequestBody Password request) {
        service.changePassword(user.getId(), request);
    }
}
