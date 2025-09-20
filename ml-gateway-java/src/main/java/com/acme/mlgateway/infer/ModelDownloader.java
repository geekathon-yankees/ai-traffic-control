package com.acme.mlgateway.infer;

import com.acme.mlgateway.config.ModelProperties;
import okhttp3.*;
import org.apache.commons.io.FileUtils;

import java.io.File;
import java.io.InputStream;
import java.nio.file.*;

public class ModelDownloader {
  // For public models, construct direct URL; supports optional HF token via env HUGGING_FACE_HUB_TOKEN
  public static Path ensureOnnxPresent(ModelProperties props) throws Exception {
    Path dir = Paths.get("models");
    Files.createDirectories(dir);
    Path target = dir.resolve(props.getFilename());
    
    // If model already exists locally, return it
    if (Files.exists(target) && Files.size(target) > 0) {
      System.out.println("✅ Using existing model: " + target.toAbsolutePath());
      return target;
    }

    String direct = props.getModelUrl();
    String url = null;
    
    // Only attempt download if URL is provided
    if (direct != null && !direct.isBlank()) {
      url = direct;
    } else if (props.getRepoId() != null && !props.getRepoId().isBlank()) {
      url = String.format("https://huggingface.co/%s/resolve/%s/%s", 
          props.getRepoId(), props.getRevision(), props.getFilename());
    }
    
    if (url == null) {
      throw new IllegalStateException(
          "❌ Model not found locally and no download URL configured.\n" +
          "Please either:\n" +
          "1. Download yolov8n.onnx manually to: " + target.toAbsolutePath() + "\n" +
          "2. Set model.modelUrl in application.yaml\n" +
          "3. Configure model.repoId for Hugging Face (requires HUGGING_FACE_HUB_TOKEN)\n" +
          "You can download YOLOv8n ONNX from: https://github.com/ultralytics/yolov8/releases"
      );
    }

    System.out.println("📥 Downloading model from: " + url);
    OkHttpClient client = new OkHttpClient();
    Request.Builder rb = new Request.Builder().url(url);
    String token = System.getenv("HUGGING_FACE_HUB_TOKEN");
    if (token != null && !token.isBlank()) {
      rb.header("Authorization", "Bearer " + token);
      System.out.println("🔑 Using Hugging Face token");
    }
    
    try (Response resp = client.newCall(rb.build()).execute()) {
      if (!resp.isSuccessful()) {
        throw new IllegalStateException(
            "❌ Failed to download model: " + resp + "\n" +
            "URL: " + url + "\n" +
            "Please download the model manually to: " + target.toAbsolutePath()
        );
      }
      try (InputStream in = resp.body().byteStream()) {
        FileUtils.copyInputStreamToFile(in, target.toFile());
        System.out.println("✅ Model downloaded successfully: " + target.toAbsolutePath());
      }
    }
    return target;
  }
}
