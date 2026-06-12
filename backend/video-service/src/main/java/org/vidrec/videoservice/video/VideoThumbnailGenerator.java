package org.vidrec.videoservice.video;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.concurrent.TimeUnit;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

/**
 * Extracts a single JPEG frame from an uploaded video using ffmpeg, to use as
 * the catalog thumbnail. Best-effort: returns null on any failure so the caller
 * can leave thumbnailUrl null and let the frontend fall back to its placeholder.
 */
@Slf4j
@Component
public class VideoThumbnailGenerator {

    private static final int SEEK_SECONDS = 1;
    private static final long TIMEOUT_SECONDS = 30;

    /**
     * Generates a JPEG thumbnail from {@code source} and returns the path to a
     * temp file holding it, or null if generation failed. The caller owns the
     * returned file and must delete it.
     */
    public Path generateJpeg(Path source, String videoId) {
        Path output = null;
        try {
            output = Files.createTempFile("thumb-" + videoId + "-", ".jpg");

            ProcessBuilder builder = new ProcessBuilder(List.of(
                "ffmpeg",
                "-y",
                "-ss", String.valueOf(SEEK_SECONDS),
                "-i", source.toAbsolutePath().toString(),
                "-frames:v", "1",
                "-vf", "scale=640:-2",
                "-q:v", "3",
                output.toAbsolutePath().toString()
            ));
            builder.redirectErrorStream(true);

            Process process = builder.start();
            // Drain output so the process doesn't block on a full pipe buffer.
            process.getInputStream().readAllBytes();
            boolean finished = process.waitFor(TIMEOUT_SECONDS, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                log.warn("Thumbnail generation timed out for video={}", videoId);
                return cleanup(output);
            }
            if (process.exitValue() != 0) {
                log.warn("ffmpeg exited with code {} for video={}", process.exitValue(), videoId);
                return cleanup(output);
            }
            if (Files.size(output) <= 0) {
                log.warn("ffmpeg produced empty thumbnail for video={}", videoId);
                return cleanup(output);
            }
            return output;
        } catch (IOException | InterruptedException ex) {
            if (ex instanceof InterruptedException) {
                Thread.currentThread().interrupt();
            }
            log.warn("Thumbnail generation failed for video={}: {}", videoId, ex.getMessage());
            return cleanup(output);
        }
    }

    private Path cleanup(Path output) {
        if (output != null) {
            try {
                Files.deleteIfExists(output);
            } catch (IOException ex) {
                log.warn("Failed to delete failed thumbnail temp file {}: {}", output, ex.getMessage());
            }
        }
        return null;
    }
}
