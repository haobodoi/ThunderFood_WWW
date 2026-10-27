package vn.edu.iuh.fit.thunderfood.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.edu.iuh.fit.thunderfood.dto.RegistrationOptionsDto;
import vn.edu.iuh.fit.thunderfood.dto.TagDto;
import vn.edu.iuh.fit.thunderfood.entity.TagEntity;
import vn.edu.iuh.fit.thunderfood.enums.TagTypeEnum;
import vn.edu.iuh.fit.thunderfood.repository.TagRepository;
import vn.edu.iuh.fit.thunderfood.util.ProvinceUtil;

import java.util.List;

@Service
public class MetaService {

    private final TagRepository tagRepository;

    public MetaService(TagRepository tagRepository) {
        this.tagRepository = tagRepository;
    }

    @Transactional(readOnly = true)
    public RegistrationOptionsDto registrationOptions() {
        List<TagEntity> tags = tagRepository.findAllByOrderByTagTypeAscDisplayOrderAsc();
        return new RegistrationOptionsDto(
                ProvinceUtil.PROVINCES,
                tags.stream().filter(t -> t.getTagType() == TagTypeEnum.SERVICE_TYPE).map(TagDto::from).toList(),
                tags.stream().filter(t -> t.getTagType() == TagTypeEnum.CUISINE).map(TagDto::from).toList()
        );
    }
}
