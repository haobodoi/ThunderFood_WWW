package vn.edu.iuh.fit.thunderfood.dto;

import vn.edu.iuh.fit.thunderfood.entity.TagEntity;

public record TagDto(Integer id, String type, String name) {

    public static TagDto from(TagEntity tag) {
        return new TagDto(tag.getId(), tag.getTagType().name(), tag.getTagName());
    }
}
