package com.ticketdesk.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.*;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.Map;

@RestController
@RequestMapping("/api/attachments")
@CrossOrigin(origins = "*")
public class AttachmentController {

    @Value("${aws.s3.bucket:ticketdesk-attachments}")
    private String bucketName;

    @Value("${aws.s3.region:ap-south-1}")
    private String region;

    @Value("${aws.access-key:}")
    private String accessKey;

    @Value("${aws.secret-key:}")
    private String secretKey;

    private S3Presigner presigner;

    @PostConstruct
    public void init() {
        S3Presigner.Builder builder = S3Presigner.builder()
                .region(Region.of(region));

        if (accessKey != null && !accessKey.trim().isEmpty()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKey, secretKey)
            ));
        }

        this.presigner = builder.build();
    }

    @PreDestroy
    public void cleanup() {
        if (this.presigner != null) {
            this.presigner.close();
        }
    }

    @GetMapping("/presigned-put")
    public Map<String, String> getPresignedPutUrl(@RequestParam String key) {
        PutObjectRequest objectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(objectRequest)
                .build();

        PresignedPutObjectRequest presigned = presigner.presignPutObject(presignRequest);
        return Map.of("url", presigned.url().toString());
    }

    @GetMapping("/presigned-get")
    public Map<String, String> getPresignedGetUrl(@RequestParam String key) {
        GetObjectRequest objectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(key)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(objectRequest)
                .build();

        PresignedGetObjectRequest presigned = presigner.presignGetObject(presignRequest);
        return Map.of("url", presigned.url().toString());
    }

    @GetMapping("/presigned-thumbnail")
    public Map<String, String> getPresignedThumbnailUrl(@RequestParam String key) {
        String thumbnailKey = "thumbnails/" + key;
        GetObjectRequest objectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(thumbnailKey)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(objectRequest)
                .build();

        PresignedGetObjectRequest presigned = presigner.presignGetObject(presignRequest);
        return Map.of("url", presigned.url().toString());
    }
}
