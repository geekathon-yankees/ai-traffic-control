package com.acme.mlgateway.service;

import ai.djl.inference.Predictor;
import ai.djl.modality.cv.Image;
import ai.djl.modality.cv.ImageFactory;
import com.acme.mlgateway.dto.*;
import com.acme.mlgateway.infer.YoloV8Translator;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class DetectorService {
  private final Predictor<Image, YoloV8Translator.YoloDetections> predictor;

  public DetectorService(Predictor<Image, YoloV8Translator.YoloDetections> predictor) {
    this.predictor = predictor;
  }

  public ImageDetections detect(byte[] imageBytes) throws Exception {
    Image img = ImageFactory.getInstance().fromImage(imageBytes);
    var out = predictor.predict(img);
    List<Detection> dets = new ArrayList<>();
    for (var b : out.boxes()) {
      BBox bbox = new BBox();
      bbox.setX1(b.x1()); bbox.setY1(b.y1()); bbox.setX2(b.x2()); bbox.setY2(b.y2());
      Detection det = new Detection();
      det.setBbox(bbox);
      det.setLabel(labelSafe(b.clsId()));
      det.setClsId(b.clsId());
      det.setScore(b.score());
      dets.add(det);
    }
    ImageDetections result = new ImageDetections();
    result.setModel(out.model());
    result.setDetections(dets);
    return result;
  }

  private String labelSafe(Integer clsId) {
    return (clsId == null) ? "unknown" : String.valueOf(clsId);
  }
}
