package vn.edu.iuh.fit.thunderfood.controller;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import vn.edu.iuh.fit.thunderfood.dto.UploadResultDto;
import vn.edu.iuh.fit.thunderfood.dto.UserDetailsDto;
import vn.edu.iuh.fit.thunderfood.enums.RoleCodeEnum;
import vn.edu.iuh.fit.thunderfood.enums.UploadKindEnum;
import vn.edu.iuh.fit.thunderfood.exception.ResourceNotFoundException;
import vn.edu.iuh.fit.thunderfood.service.FileStorageService;

@RestController
public class FileController {

    private final FileStorageService fileStorageService;

    public FileController(FileStorageService fileStorageService) {
        this.fileStorageService = fileStorageService;
    }

    @PostMapping(value = "/api/partner/uploads", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UploadResultDto upload(@AuthenticationPrincipal UserDetailsDto principal,
                                  @RequestParam UploadKindEnum kind,
                                  @RequestPart("file") MultipartFile file) {
        return new UploadResultDto(fileStorageService.store(principal.getId(), kind, file));
    }

    @GetMapping("/api/files/private/{ownerId}/{fileName:.+}")
    public ResponseEntity<Resource> privateFile(@AuthenticationPrincipal UserDetailsDto principal,
                                                @PathVariable Long ownerId,
                                                @PathVariable String fileName) {
        boolean admin = RoleCodeEnum.ADMIN.name().equals(principal.getRoleCode());
        if (!admin && !principal.getId().equals(ownerId)) {
            throw new ResourceNotFoundException("Không tìm thấy ảnh");
        }
        Resource resource = fileStorageService.loadPrivate(ownerId, fileName);
        return ResponseEntity.ok()
                .contentType(FileStorageService.mediaTypeOf(fileName))
                .header(HttpHeaders.CACHE_CONTROL, "private, max-age=600")
                .header("X-Content-Type-Options", "nosniff")
                .body(resource);
    }
}
