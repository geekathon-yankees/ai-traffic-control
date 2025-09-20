package com.acme.mlgateway.dto;

import lombok.*;
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @ToString
public class Detection {
  private BBox bbox;
  private String label;
  private Integer clsId;
  private double score;
}
