package com.acme.mlgateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import ai.djl.Device;
import ai.djl.inference.Predictor;
import ai.djl.modality.cv.Image;
import ai.djl.repository.zoo.ZooModel;
import com.acme.mlgateway.infer.YoloV8Translator;
import com.acme.mlgateway.infer.ModelDownloader;

import java.nio.file.Path;

@Configuration
public class AppConfig {

  @Bean
  public ZooModel<Image, YoloV8Translator.YoloDetections> yoloModel(ModelProperties props) throws Exception {
    // Download model (HF or direct URL) to local cache
    Path onnxPath = ModelDownloader.ensureOnnxPresent(props);
    return YoloV8Translator.loadOnnxModel(onnxPath, props.getInputSize(), props.getConfThreshold(), props.getIouThreshold());
  }

  @Bean
  public Predictor<Image, YoloV8Translator.YoloDetections> predictor(ZooModel<Image, YoloV8Translator.YoloDetections> model) {
    return model.newPredictor();
  }

  @Bean
  public Device device() { return Device.cpu(); } // easy to swap later
}
