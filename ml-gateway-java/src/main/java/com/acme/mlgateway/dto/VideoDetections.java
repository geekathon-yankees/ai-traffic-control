package com.acme.mlgateway.dto;

import lombok.*;
import java.util.List;
import java.util.Map;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @ToString
public class VideoDetections {
  private String model;
  private int totalFrames;
  private int processedFrames;
  private int fpsSample;
  private List<VideoFrameDetections> results;
  private Map<String, Integer> countsByLabel;
}
