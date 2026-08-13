package com.ticketdesk.controller;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestConstructor;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "aws.access-key=mockkey",
        "aws.secret-key=mocksecret",
        "aws.s3.bucket=test-bucket",
        "aws.s3.region=us-east-1"
})
@AutoConfigureMockMvc
@ActiveProfiles("test")
@TestConstructor(autowireMode = TestConstructor.AutowireMode.ALL)
public class AttachmentControllerTest {

    private final MockMvc mockMvc;

    public AttachmentControllerTest(MockMvc mockMvc) {
        this.mockMvc = mockMvc;
    }

    @Test
    public void testGetPresignedPutUrl() throws Exception {
        mockMvc.perform(get("/api/attachments/presigned-put")
                        .param("key", "test-file.txt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", containsString("test-bucket")))
                .andExpect(jsonPath("$.url", containsString("test-file.txt")));
    }

    @Test
    public void testGetPresignedGetUrl() throws Exception {
        mockMvc.perform(get("/api/attachments/presigned-get")
                        .param("key", "test-file.txt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", containsString("test-bucket")))
                .andExpect(jsonPath("$.url", containsString("test-file.txt")));
    }

    @Test
    public void testGetPresignedThumbnailUrl() throws Exception {
        mockMvc.perform(get("/api/attachments/presigned-thumbnail")
                        .param("key", "test-file.txt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.url", containsString("test-bucket")))
                .andExpect(jsonPath("$.url", containsString("thumbnails/test-file.txt")));
    }
}
