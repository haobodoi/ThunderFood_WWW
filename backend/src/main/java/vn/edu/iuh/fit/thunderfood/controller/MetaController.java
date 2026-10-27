package vn.edu.iuh.fit.thunderfood.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.edu.iuh.fit.thunderfood.dto.RegistrationOptionsDto;
import vn.edu.iuh.fit.thunderfood.service.MetaService;

@RestController
@RequestMapping("/api/meta")
public class MetaController {

    private final MetaService metaService;

    public MetaController(MetaService metaService) {
        this.metaService = metaService;
    }

    @GetMapping("/registration-options")
    public RegistrationOptionsDto registrationOptions() {
        return metaService.registrationOptions();
    }
}
