package com.acme.mlgateway.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @ToString
public class VideoFrameDetections {
  private int frameIndex;
  private double timeSec;
  private List<Detection> detections;
}
