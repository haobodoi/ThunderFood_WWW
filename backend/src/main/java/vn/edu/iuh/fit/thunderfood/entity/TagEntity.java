package vn.edu.iuh.fit.thunderfood.entity;

import jakarta.persistence.*;
import vn.edu.iuh.fit.thunderfood.enums.TagTypeEnum;

@Entity
@Table(name = "tags")
public class TagEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "tag_id")
    private Integer id;

    @Enumerated(EnumType.STRING)
    @Column(name = "tag_type", nullable = false)
    private TagTypeEnum tagType;

    @Column(name = "tag_name", nullable = false, length = 100)
    private String tagName;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    public TagEntity() {
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public TagTypeEnum getTagType() { return tagType; }
    public void setTagType(TagTypeEnum tagType) { this.tagType = tagType; }
    public String getTagName() { return tagName; }
    public void setTagName(String tagName) { this.tagName = tagName; }
    public Integer getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}
