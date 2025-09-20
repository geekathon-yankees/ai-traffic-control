package com.acme.mlgateway.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import lombok.Data;

@Data
@Component
@ConfigurationProperties(prefix = "model")
public class ModelProperties {
  private String repoId;
  private String filename;
  private String revision;
  private String modelUrl;    // optional direct URL (S3, CDN, etc.)
  private double confThreshold;
  private double iouThreshold;
  private int inputSize;

  @Data
  public static class VideoProps {
    private int fpsSample;
    private int maxFrames;
  }
  
  private VideoProps video = new VideoProps();
}
