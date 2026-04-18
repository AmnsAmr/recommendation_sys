package org.vidrec.videoservice.config;

import java.net.URI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;

@Configuration
public class R2Config {

    @Bean
    public S3Client s3Client(
        @Value("${r2.account-id}") String accountId,
        @Value("${r2.access-key-id}") String accessKeyId,
        @Value("${r2.secret-access-key}") String secretAccessKey
    ) {
        return S3Client.builder()
            .endpointOverride(URI.create("https://" + accountId + ".r2.cloudflarestorage.com"))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKeyId, secretAccessKey)))
            .region(Region.of("auto"))
            .forcePathStyle(true)
            .build();
    }
}
