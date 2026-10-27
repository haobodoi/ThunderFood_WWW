package vn.edu.iuh.fit.thunderfood.dto;

import java.util.List;

public record RegistrationOptionsDto(List<String> provinces, List<TagDto> serviceTypes, List<TagDto> cuisines) {
}
