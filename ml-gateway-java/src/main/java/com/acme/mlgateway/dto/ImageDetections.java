package com.acme.mlgateway.dto;

import lombok.*;
import java.util.List;

@Getter @Setter @NoArgsConstructor @AllArgsConstructor @ToString
public class ImageDetections {
  private String model;
  private List<Detection> detections;
}
