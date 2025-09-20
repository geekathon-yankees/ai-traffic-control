package com.acme.mlgateway.util;

import ai.djl.modality.cv.Image;
import ai.djl.modality.cv.ImageFactory;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.global.opencv_imgcodecs;

public class ImageUtil {
  public static Image fromBytes(byte[] bytes) {
    Mat mat = opencv_imgcodecs.imdecode(new Mat(bytes), opencv_imgcodecs.IMREAD_COLOR);
    if (mat == null || mat.empty()) throw new IllegalArgumentException("Invalid image");
    return ImageFactory.getInstance().fromImage(mat);
  }
}
