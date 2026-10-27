package vn.edu.iuh.fit.thunderfood.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import vn.edu.iuh.fit.thunderfood.entity.TagEntity;

import java.util.List;

public interface TagRepository extends JpaRepository<TagEntity, Integer> {

    List<TagEntity> findAllByOrderByTagTypeAscDisplayOrderAsc();
}
