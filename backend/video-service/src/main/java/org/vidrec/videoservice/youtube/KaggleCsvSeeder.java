package org.vidrec.videoservice.youtube;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class KaggleCsvSeeder {

    private static final int PERSIST_BATCH_SIZE = 25;

    private final YouTubeSyncPersister persister;
    private final ObjectMapper objectMapper;

    @EventListener(ApplicationReadyEvent.class)
    public void seedDatabase() {
        log.info("Checking for Kaggle dataset files to seed...");
        
        int totalSaved = 0;
        totalSaved += seedRegion("USvideos.csv", "US_category_id.json", "en");
        totalSaved += seedRegion("FRvideos.csv", "FR_category_id.json", "fr");
        
        if (totalSaved > 0) {
            log.info("Kaggle CSV Seeding complete! Inserted {} new videos.", totalSaved);
        } else {
            log.info("No new Kaggle videos seeded (files might be missing or already processed).");
        }
    }

    private int seedRegion(String csvFilename, String jsonFilename, String defaultAudioLanguage) {
        Resource csvResource = new ClassPathResource("data/" + csvFilename);
        Resource jsonResource = new ClassPathResource("data/" + jsonFilename);

        if (!csvResource.exists() || !jsonResource.exists()) {
            log.debug("Files for {} / {} not found in src/main/resources/data/, skipping region.", csvFilename, jsonFilename);
            return 0;
        }

        log.info("Starting seed for {} and {}...", csvFilename, jsonFilename);
        try (InputStream jsonInput = jsonResource.getInputStream();
             InputStream csvInput = csvResource.getInputStream()) {
            Map<String, String> categoryMap = loadCategoryMap(jsonInput);
            return parseAndPersistCsv(csvInput, categoryMap, defaultAudioLanguage, csvFilename);
        } catch (Exception e) {
            log.error("Failed to seed region data for {}", csvFilename, e);
            return 0;
        }
    }

    private Map<String, String> loadCategoryMap(InputStream is) throws Exception {
        Map<String, String> map = new HashMap<>();
        JsonNode root = objectMapper.readTree(is);
        JsonNode items = root.get("items");
        if (items != null && items.isArray()) {
            for (JsonNode item : items) {
                String id = item.path("id").asText("");
                String title = item.path("snippet").path("title").asText("");
                if (!id.isBlank() && !title.isBlank()) {
                    map.put(id, title.toLowerCase().replace(" & ", "-").replace(" ", "-"));
                }
            }
        }
        return map;
    }

    private int parseAndPersistCsv(
            InputStream is,
            Map<String, String> categoryMap,
            String defaultAudioLanguage,
            String csvFilename) throws Exception {
        List<YouTubeVideo> batch = new ArrayList<>(PERSIST_BATCH_SIZE);
        int malformedRows = 0;
        int parsedRows = 0;
        int savedRows = 0;
        try (BufferedReader br = new BufferedReader(new InputStreamReader(is, StandardCharsets.UTF_8))) {
            String header = br.readLine(); // skip header
            if (header == null) {
                return 0;
            }

            String record;
            while ((record = readNextRecord(br)) != null) {
                String[] values = record.split(",(?=(?:[^\"]*\"[^\"]*\")*[^\"]*$)", -1);
                if (values.length < 16) {
                    malformedRows++;
                    continue;
                }

                try {
                    String videoId = sanitizeCsvField(values[0]);
                    String title = sanitizeCsvField(values[1]);
                    String categoryIdRaw = sanitizeCsvField(values[4]);
                    String tagsRaw = sanitizeCsvField(values[6]);
                    String thumbnailLink = sanitizeCsvField(values[11]);
                    String description = sanitizeCsvField(values[15]);

                    if (videoId.isBlank() || title.isBlank()) {
                        malformedRows++;
                        continue;
                    }

                    String localCategory = categoryMap.getOrDefault(categoryIdRaw, "entertainment");

                    List<String> tagsList = new ArrayList<>();
                    if (!tagsRaw.equalsIgnoreCase("[none]")) {
                        String[] tagsArray = tagsRaw.split("\\|");
                        for (int i = 0; i < Math.min(tagsArray.length, 10); i++) {
                            String cleanTag = tagsArray[i].replaceAll("[^a-zA-Z0-9-]", "-").toLowerCase().trim();
                            if (!cleanTag.isEmpty() && cleanTag.length() <= 50) {
                                tagsList.add(cleanTag);
                            }
                        }
                    }

                    batch.add(new YouTubeVideo(
                            videoId,
                            title,
                            description,
                            thumbnailLink,
                            0, // durationSeconds
                            defaultAudioLanguage,
                            tagsList,
                            localCategory
                    ));
                    parsedRows++;

                    if (batch.size() >= PERSIST_BATCH_SIZE) {
                        savedRows += persister.persistNewVideos(batch);
                        log.info("Seed progress for {}: parsed={}, saved={}", csvFilename, parsedRows, savedRows);
                        batch.clear();
                    }
                } catch (Exception parseEx) {
                    malformedRows++;
                }
            }
        }

        if (!batch.isEmpty()) {
            savedRows += persister.persistNewVideos(batch);
            batch.clear();
        }

        if (malformedRows > 0) {
            log.warn("Skipped {} malformed Kaggle CSV rows.", malformedRows);
        }

        log.info("Parsed {} videos from {}. Persisted {} new videos.", parsedRows, csvFilename, savedRows);
        return savedRows;
    }

    private String readNextRecord(BufferedReader br) throws Exception {
        String line = br.readLine();
        if (line == null) {
            return null;
        }

        StringBuilder record = new StringBuilder(line);
        while (hasUnbalancedQuotes(record)) {
            String continuation = br.readLine();
            if (continuation == null) {
                break;
            }
            record.append("\n").append(continuation);
        }
        return record.toString();
    }

    private boolean hasUnbalancedQuotes(CharSequence value) {
        int quoteCount = 0;
        for (int i = 0; i < value.length(); i++) {
            if (value.charAt(i) == '"') {
                quoteCount++;
            }
        }
        return quoteCount % 2 != 0;
    }

    private String sanitizeCsvField(String value) {
        String sanitized = value == null ? "" : value.trim();
        if (sanitized.startsWith("\"") && sanitized.endsWith("\"") && sanitized.length() >= 2) {
            sanitized = sanitized.substring(1, sanitized.length() - 1);
        }
        return sanitized
                .replace("\"\"", "\"")
                .replace("\r", " ")
                .replace("\n", " ")
                .trim();
    }
}
