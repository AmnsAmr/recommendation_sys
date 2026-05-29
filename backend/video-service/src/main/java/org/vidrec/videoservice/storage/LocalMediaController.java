package org.vidrec.videoservice.storage;

import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/videos/media")
@RequiredArgsConstructor
public class LocalMediaController {

    private static final String MEDIA_PREFIX = "/videos/media/";

    private final R2StorageService storageService;

    @GetMapping("/**")
    public ResponseEntity<Resource> getMedia(HttpServletRequest request) {
        String key = request.getRequestURI().substring(MEDIA_PREFIX.length());
        String contentType = storageService.probeLocalContentType(key);
        MediaType mediaType = contentType == null
            ? MediaType.APPLICATION_OCTET_STREAM
            : MediaType.parseMediaType(contentType);

        return ResponseEntity.ok()
            .contentType(mediaType)
            .body(storageService.loadLocalResource(key));
    }
}
