package com.acme.mlgateway.controller;

import com.acme.mlgateway.dto.ImageDetections;
import com.acme.mlgateway.dto.VideoDetections;
import com.acme.mlgateway.service.DetectorService;
import com.acme.mlgateway.service.VideoProcessorService;
import jakarta.validation.constraints.NotNull;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.nio.file.Files;

@RestController
@RequestMapping("/detect")
public class DetectController {

  private final DetectorService detectorService;
  private final VideoProcessorService videoService;

  public DetectController(DetectorService detectorService, VideoProcessorService videoService) {
    this.detectorService = detectorService;
    this.videoService = videoService;
  }

  @GetMapping("/healthz")
  public String healthz() { return "ok"; }

  @PostMapping(value="/image", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
  public ImageDetections detectImage(@RequestPart("file") @NotNull MultipartFile file) throws Exception {
    byte[] bytes = file.getBytes();
    return detectorService.detect(bytes);
  }

  @PostMapping(value="/video", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
  public VideoDetections detectVideo(@RequestPart("file") @NotNull MultipartFile file) throws Exception {
    File tmp = File.createTempFile("vid",".mp4");
    file.transferTo(tmp);
    try {
      return videoService.detectOnVideo(tmp.getAbsolutePath());
    } finally {
      Files.deleteIfExists(tmp.toPath());
    }
  }
}
