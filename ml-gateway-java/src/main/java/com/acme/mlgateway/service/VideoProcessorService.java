package com.acme.mlgateway.service;

import com.acme.mlgateway.config.ModelProperties;
import com.acme.mlgateway.dto.*;
import org.bytedeco.opencv.global.opencv_videoio;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_videoio.VideoCapture;
import org.springframework.stereotype.Service;

import ai.djl.modality.cv.Image;
import ai.djl.modality.cv.ImageFactory;
import ai.djl.inference.Predictor;
import com.acme.mlgateway.infer.YoloV8Translator;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class VideoProcessorService {

  private final Predictor<Image, YoloV8Translator.YoloDetections> predictor;
  private final ModelProperties props;

  public VideoProcessorService(Predictor<Image, YoloV8Translator.YoloDetections> predictor, ModelProperties props) {
    this.predictor = predictor;
    this.props = props;
  }

  public VideoDetections detectOnVideo(String path) throws Exception {
    VideoCapture cap = new VideoCapture(path);
    if (!cap.isOpened()) throw new IllegalArgumentException("Unable to open video source: " + path);

    double fps = cap.get(opencv_videoio.CAP_PROP_FPS);
    if (Double.isNaN(fps) || fps <= 0) fps = 30.0;
    int step = Math.max(1, (int)Math.round(fps / props.getVideo().getFpsSample()));
    int maxFrames = Math.max(1, props.getVideo().getMaxFrames());
    int totalFrames = (int) cap.get(opencv_videoio.CAP_PROP_FRAME_COUNT);

    List<VideoFrameDetections> results = new ArrayList<>();
    Map<String, Integer> counts = new HashMap<>();
    Mat frame = new Mat();

    int processed = 0;
    int idx = 0;
    while (cap.read(frame)) {
      if (idx % step == 0) {
        Image img = ImageFactory.getInstance().fromImage(frame);
        var out = predictor.predict(img);

        List<Detection> dets = new ArrayList<>();
        for (var b : out.boxes()) {
          String label = String.valueOf(b.clsId());
          BBox bbox = new BBox();
          bbox.setX1(b.x1()); bbox.setY1(b.y1()); bbox.setX2(b.x2()); bbox.setY2(b.y2());
          Detection det = new Detection();
          det.setBbox(bbox); det.setLabel(label); det.setClsId(b.clsId()); det.setScore(b.score());
          dets.add(det);
          counts.merge(label, 1, Integer::sum);
        }
        VideoFrameDetections frameResult = new VideoFrameDetections();
        frameResult.setFrameIndex(idx);
        frameResult.setTimeSec(idx / fps);
        frameResult.setDetections(dets);
        results.add(frameResult);
        processed++;
        if (processed >= maxFrames) break;
      }
      idx++;
    }
    cap.release();

    VideoDetections result = new VideoDetections();
    result.setModel("yolov8-onnx");
    result.setTotalFrames(totalFrames);
    result.setProcessedFrames(processed);
    result.setFpsSample(props.getVideo().getFpsSample());
    result.setResults(results);
    result.setCountsByLabel(counts);
    return result;
  }
}
