package vn.edu.iuh.fit.thunderfood.controller;

import org.springframework.web.bind.annotation.*;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantMenuResponseDto;
import vn.edu.iuh.fit.thunderfood.dto.RestaurantPublicDto;
import vn.edu.iuh.fit.thunderfood.service.PublicRestaurantService;

import java.util.List;

@RestController
@RequestMapping("/api/restaurants")
public class PublicRestaurantController {

    private final PublicRestaurantService publicRestaurantService;

    public PublicRestaurantController(PublicRestaurantService publicRestaurantService) {
        this.publicRestaurantService = publicRestaurantService;
    }

    @GetMapping
    public List<RestaurantPublicDto> list(@RequestParam(required = false) String keyword,
                                         @RequestParam(required = false) String province) {
        return publicRestaurantService.search(keyword, province);
    }

    @GetMapping("/{id}")
    public RestaurantPublicDto detail(@PathVariable Long id) {
        return publicRestaurantService.getDetail(id);
    }

    @GetMapping("/{id}/menu")
    public RestaurantMenuResponseDto menu(@PathVariable Long id) {
        return publicRestaurantService.getMenu(id);
    }
}
