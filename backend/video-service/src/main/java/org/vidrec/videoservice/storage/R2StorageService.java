package org.vidrec.videoservice.storage;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.vidrec.videoservice.shared.exception.ApiException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception;

@Slf4j
@Service
@RequiredArgsConstructor
public class R2StorageService {

    private static final String LOCAL_PROVIDER = "local";

    private final ObjectProvider<S3Client> s3ClientProvider;

    @Value("${r2.bucket-name}")
    private String bucketName;

    @Value("${r2.account-id}")
    private String accountId;

    @Value("${video.storage.provider:r2}")
    private String storageProvider;

    @Value("${video.storage.local-directory:uploads}")
    private String localDirectory;

    @Value("${video.storage.public-base-url:http://localhost:8080/videos/media}")
    private String publicBaseUrl;

    @Value("${r2.public-base-url:}")
    private String r2PublicBaseUrl;

    public String upload(String key, InputStream inputStream, long contentLength, String contentType) {
        if (isLocalProvider()) {
            return uploadLocal(key, inputStream, contentLength);
        }

        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .contentType(contentType)
            .build();

        try {
            s3Client().putObject(request, RequestBody.fromInputStream(inputStream, contentLength));
        } catch (S3Exception ex) {
            log.error("R2 upload failed for bucket={} key={} status={}", bucketName, key, ex.statusCode(), ex);
            throw new ApiException(HttpStatus.BAD_GATEWAY, "STORAGE_UPLOAD_FAILED",
                "Video storage upload failed. Check R2 credentials, bucket access, and network connectivity.", java.util.List.of());
        }
        log.info("Uploaded to R2: bucket={} key={} size={}", bucketName, key, contentLength);
        return key;
    }

    public String getPublicUrl(String key) {
        if (isLocalProvider()) {
            return publicBaseUrl.replaceAll("/+$", "") + "/" + key.replace("\\", "/");
        }

        if (StringUtils.hasText(r2PublicBaseUrl)) {
            return r2PublicBaseUrl.replaceAll("/+$", "") + "/" + key.replace("\\", "/");
        }

        return "https://pub-" + accountId + ".r2.dev/" + key;
    }

    public void delete(String key) {
        if (isLocalProvider()) {
            try {
                Files.deleteIfExists(resolveLocalPath(key));
            } catch (IOException ex) {
                log.warn("Local media delete failed for key={}: {}", key, ex.getMessage());
            }
            return;
        }

        s3Client().deleteObject(DeleteObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .build());
        log.info("Deleted from R2: bucket={} key={}", bucketName, key);
    }

    public Resource loadLocalResource(String key) {
        if (!isLocalProvider()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "MEDIA_NOT_FOUND", "Local media storage is not enabled.", java.util.List.of());
        }

        try {
            Resource resource = new UrlResource(resolveLocalPath(key).toUri());
            if (!resource.exists() || !resource.isReadable()) {
                throw new ApiException(HttpStatus.NOT_FOUND, "MEDIA_NOT_FOUND", "Media file not found.", java.util.List.of());
            }
            return resource;
        } catch (IOException ex) {
            throw new ApiException(HttpStatus.NOT_FOUND, "MEDIA_NOT_FOUND", "Media file not found.", java.util.List.of());
        }
    }

    public String probeLocalContentType(String key) {
        try {
            return Files.probeContentType(resolveLocalPath(key));
        } catch (IOException ex) {
            return null;
        }
    }

    private String uploadLocal(String key, InputStream inputStream, long contentLength) {
        try {
            Path target = resolveLocalPath(key);
            Files.createDirectories(target.getParent());
            Files.copy(inputStream, target, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
            log.info("Saved local media: key={} path={} size={}", key, target, contentLength);
            return key;
        } catch (IOException ex) {
            log.error("Local media upload failed for key={}", key, ex);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_UPLOAD_FAILED",
                "Failed to save uploaded video locally.", java.util.List.of());
        }
    }

    private Path resolveLocalPath(String key) throws IOException {
        Path root = Path.of(localDirectory).toAbsolutePath().normalize();
        Path target = root.resolve(key).normalize();
        if (!target.startsWith(root)) {
            throw new IOException("Invalid media key.");
        }
        return target;
    }

    private boolean isLocalProvider() {
        return LOCAL_PROVIDER.equalsIgnoreCase(storageProvider);
    }

    private S3Client s3Client() {
        S3Client s3Client = s3ClientProvider.getIfAvailable();
        if (s3Client == null) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "STORAGE_NOT_CONFIGURED",
                "R2 storage is not configured.", java.util.List.of());
        }
        return s3Client;
    }
}
