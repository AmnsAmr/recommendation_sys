package org.vidrec.videoservice.video;

import java.nio.file.Path;
import lombok.extern.slf4j.Slf4j;
import org.mp4parser.IsoFile;
import org.mp4parser.boxes.iso14496.part12.MovieHeaderBox;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class VideoDurationProbe {

    public Integer probeSeconds(Path file) {
        try (IsoFile iso = new IsoFile(file.toFile())) {
            MovieHeaderBox mvhd = iso.getMovieBox().getMovieHeaderBox();
            long timescale = mvhd.getTimescale();
            if (timescale <= 0) {
                return null;
            }
            long seconds = mvhd.getDuration() / timescale;
            return Math.toIntExact(seconds);
        } catch (Exception ex) {
            log.warn("Duration probe failed for {}: {}", file, ex.getMessage());
            return null;
        }
    }
}
