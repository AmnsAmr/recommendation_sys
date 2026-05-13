package org.vidrec.recommendationservice.model;

import java.time.LocalDateTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.vidrec.recommendationservice.content.ContentVectorizer;

@Service
@RequiredArgsConstructor
public class ItemFactorService {

    private final ItemFactorRepository itemFactorRepository;

    @Transactional
    public ItemFactor upsert(
            String videoId,
            List<String> tags,
            String categoryId,
            String thumbnailUrl,
            String language) {
        ItemFactor itemFactor = itemFactorRepository.findById(videoId)
                .orElseGet(() -> ItemFactor.builder()
                        .videoId(videoId)
                        .viewCount(0L)
                        .globalScore(0.0)
                        .build());

        itemFactor.setTags(toArray(tags));
        itemFactor.setCategoryId(categoryId);
        itemFactor.setThumbnailUrl(thumbnailUrl);
        itemFactor.setLanguage(language);
        itemFactor.setVector(ContentVectorizer.encodeBoxed(tags, categoryId, language));
        itemFactor.setUpdatedAt(LocalDateTime.now());

        return itemFactorRepository.save(itemFactor);
    }

    @Transactional
    public ItemFactor incrementViewCount(String videoId) {
        ItemFactor itemFactor = itemFactorRepository.findById(videoId)
                .orElseGet(() -> ItemFactor.builder()
                        .videoId(videoId)
                        .viewCount(0L)
                        .globalScore(0.0)
                        .build());

        long nextViewCount = safeLong(itemFactor.getViewCount()) + 1L;
        itemFactor.setViewCount(nextViewCount);
        itemFactor.setGlobalScore(Math.log(nextViewCount + 1.0));
        itemFactor.setUpdatedAt(LocalDateTime.now());

        return itemFactorRepository.save(itemFactor);
    }

    private String[] toArray(List<String> values) {
        if (values == null) {
            return new String[0];
        }
        return values.stream()
                .filter(value -> value != null && !value.isBlank())
                .map(String::trim)
                .distinct()
                .toArray(String[]::new);
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }
}
