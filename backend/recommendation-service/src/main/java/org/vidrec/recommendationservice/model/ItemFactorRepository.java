package org.vidrec.recommendationservice.model;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ItemFactorRepository extends JpaRepository<ItemFactor, String> {
    Optional<ItemFactor> findByVideoId(String videoId);
    List<ItemFactor> findByCategoryId(String categoryId);
}