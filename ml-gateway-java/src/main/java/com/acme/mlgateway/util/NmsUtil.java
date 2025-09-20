package com.acme.mlgateway.util;

import java.util.*;
public class NmsUtil {
  // IoU on [x1,y1,x2,y2]
  public static double iou(double[] a, double[] b) {
    double x1 = Math.max(a[0], b[0]);
    double y1 = Math.max(a[1], b[1]);
    double x2 = Math.min(a[2], b[2]);
    double y2 = Math.min(a[3], b[3]);
    double inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    double areaA = Math.max(0, a[2]-a[0]) * Math.max(0, a[3]-a[1]);
    double areaB = Math.max(0, b[2]-b[0]) * Math.max(0, b[3]-b[1]);
    double union = areaA + areaB - inter + 1e-9;
    return inter / union;
  }

  public static List<Integer> nms(List<double[]> boxes, List<Double> scores, double iouThr) {
    List<Integer> order = new ArrayList<>();
    for (int i = 0; i < scores.size(); i++) order.add(i);
    order.sort((i, j) -> Double.compare(scores.get(j), scores.get(i)));

    List<Integer> keep = new ArrayList<>();
    boolean[] removed = new boolean[scores.size()];

    for (int idx = 0; idx < order.size(); idx++) {
      int i = order.get(idx);
      if (removed[i]) continue;
      keep.add(i);
      for (int jdx = idx + 1; jdx < order.size(); jdx++) {
        int j = order.get(jdx);
        if (removed[j]) continue;
        if (iou(boxes.get(i), boxes.get(j)) > iouThr) removed[j] = true;
      }
    }
    return keep;
  }
}
