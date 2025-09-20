package com.acme.mlgateway.infer;

import ai.djl.MalformedModelException;
import ai.djl.engine.Engine;
import ai.djl.metric.Metrics;
import ai.djl.modality.cv.Image;
import ai.djl.modality.cv.output.DetectedObjects;
import ai.djl.ndarray.NDArray;
import ai.djl.ndarray.NDList;
import ai.djl.ndarray.NDManager;
import ai.djl.ndarray.index.NDIndex;
import ai.djl.ndarray.types.DataType;
import ai.djl.ndarray.types.Shape;
import ai.djl.repository.zoo.Criteria;
import ai.djl.repository.zoo.ModelNotFoundException;
import ai.djl.repository.zoo.ZooModel;
import ai.djl.translate.*;
import ai.djl.inference.Predictor;
import com.acme.mlgateway.util.NmsUtil;

import java.nio.file.Path;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Minimal YOLOv8 ONNX translator:
 * - Expects input [1,3,640,640] float32 normalized(0..1)
 * - Output can be [1,84,8400] or [1,8400,84]. We handle both by transposing when needed.
 * - Decodes [x,y,w,h, confs...] with class scores → boxes xyxy + NMS.
 */
public class YoloV8Translator implements Translator<Image, YoloV8Translator.YoloDetections> {

  private final int inputSize;
  private final double confThr;
  private final double iouThr;
  private final List<String> classNames;

  public record YoloBox(double x1,double y1,double x2,double y2,double score,int clsId){}
  public record YoloDetections(String model, List<YoloBox> boxes){}

  public YoloV8Translator(int inputSize, double confThr, double iouThr, List<String> classNames) {
    this.inputSize = inputSize;
    this.confThr = confThr;
    this.iouThr = iouThr;
    this.classNames = classNames;
  }

  @Override public NDList processInput(TranslatorContext ctx, Image input) {
    NDManager m = ctx.getNDManager();
    
    // Simple resize (keep aspect by padding):
    int w = input.getWidth(), h = input.getHeight();
    float scale = Math.min((float)inputSize / w, (float)inputSize / h);
    int nw = Math.round(w * scale), nh = Math.round(h * scale);
    
    // Resize with proper method signature
    Image tmp = input.getSubImage(0,0,w,h).resize(nw, nh, false);
    NDArray tensor = tmp.toNDArray(m).toType(DataType.FLOAT32,false).div(255f);

    // Pad to inputSize
    int top = (inputSize - nh)/2, left = (inputSize - nw)/2;
    NDArray pad = m.zeros(new Shape(inputSize, inputSize, 3), DataType.FLOAT32);
    pad.set(new NDIndex(top + ":" + (top+nh) + "," + left + ":" + (left+nw) + ",:"), tensor);

    // HWC -> CHW & add batch
    NDArray chw = pad.transpose(2,0,1).expandDims(0);
    ctx.setAttachment("scale", scale);
    ctx.setAttachment("padLeft", left);
    ctx.setAttachment("padTop", top);
    ctx.setAttachment("origW", w);
    ctx.setAttachment("origH", h);
    return new NDList(chw);
  }

  @Override public YoloDetections processOutput(TranslatorContext ctx, NDList list) {
    NDArray out = list.get(0); // shape [1,84,8400] or [1,8400,84]
    if (out.getShape().dimension() != 3) {
      throw new IllegalStateException("Unexpected YOLOv8 output shape: " + out.getShape());
    }
    NDManager m = out.getManager();
    NDArray preds = out;
    long c0 = out.getShape().get(1);
    long c2 = out.getShape().get(2);
    // If shape [1,84,8400], transpose to [1,8400,84]
    if (c0 < c2) {
      preds = out.transpose(0,2,1);
    }
    // preds: [1,8400,84] → squeeze batch
    preds = preds.squeeze(0);
    NDArray boxes = preds.get(":, :4");
    NDArray scoresAll = preds.get(":, 4:"); // [8400, numClasses]

    // Compute best class score & id
    NDArray best = scoresAll.argMax(1); // [8400]
    NDArray bestScore = scoresAll.max(new int[]{1}); // [8400]
    float[] s = bestScore.toFloatArray();
    int[] cls = best.toType(DataType.INT32, false).toIntArray();
    float[] b = boxes.toFloatArray(); // xywh

    List<double[]> xyxy = new ArrayList<>();
    List<Double> keepScores = new ArrayList<>();
    List<Integer> keepCls = new ArrayList<>();

    for (int i = 0; i < s.length; i++) {
      if (s[i] < confThr) continue;
      float x = b[i*4], y = b[i*4+1], w = b[i*4+2], h = b[i*4+3];
      double x1 = x - w/2.0, y1 = y - h/2.0, x2 = x + w/2.0, y2 = y + h/2.0;
      xyxy.add(new double[]{x1, y1, x2, y2});
      keepScores.add((double)s[i]);
      keepCls.add(cls[i]);
    }

    // NMS
    List<Integer> keep = NmsUtil.nms(xyxy, keepScores, iouThr);

    // Map back to original image coords
    double scale = (double) ctx.getAttachment("scale");
    int left = (int) ctx.getAttachment("padLeft");
    int top = (int) ctx.getAttachment("padTop");
    int origW = (int) ctx.getAttachment("origW");
    int origH = (int) ctx.getAttachment("origH");

    List<YoloBox> boxesOut = new ArrayList<>(keep.size());
    for (int idx : keep) {
      double[] bb = xyxy.get(idx);
      // Undo padding/scale: first to padded coords, then to original
      double x1 = (bb[0] - left) / scale;
      double y1 = (bb[1] - top) / scale;
      double x2 = (bb[2] - left) / scale;
      double y2 = (bb[3] - top) / scale;
      // clip
      x1 = Math.max(0, Math.min(x1, origW - 1));
      y1 = Math.max(0, Math.min(y1, origH - 1));
      x2 = Math.max(0, Math.min(x2, origW - 1));
      y2 = Math.max(0, Math.min(y2, origH - 1));
      boxesOut.add(new YoloBox(x1, y1, x2, y2, keepScores.get(idx), keepCls.get(idx)));
    }
    return new YoloDetections("yolov8-onnx", boxesOut);
  }

  @Override public Batchifier getBatchifier() { return Batchifier.STACK; }

  public static ZooModel<Image, YoloDetections> loadOnnxModel(Path onnxPath, int input, double conf, double iou)
      throws MalformedModelException, ModelNotFoundException, java.io.IOException {
    // COCO names
    List<String> names = Arrays.asList(
      "person","bicycle","car","motorcycle","airplane","bus","train","truck","boat","traffic light",
      "fire hydrant","stop sign","parking meter","bench","bird","cat","dog","horse","sheep","cow",
      "elephant","bear","zebra","giraffe","backpack","umbrella","handbag","tie","suitcase","frisbee",
      "skis","snowboard","sports ball","kite","baseball bat","baseball glove","skateboard","surfboard",
      "tennis racket","bottle","wine glass","cup","fork","knife","spoon","bowl","banana","apple",
      "sandwich","orange","broccoli","carrot","hot dog","pizza","donut","cake","chair","couch",
      "potted plant","bed","dining table","toilet","tv","laptop","mouse","remote","keyboard",
      "cell phone","microwave","oven","toaster","sink","refrigerator","book","clock","vase",
      "scissors","teddy bear","hair drier","toothbrush"
    );

    Criteria<Image, YoloDetections> c = Criteria.builder()
        .setTypes(Image.class, YoloDetections.class)
        .optModelPath(onnxPath)            // local path to ONNX
        .optEngine("OnnxRuntime")          // use ONNX Runtime
        .optTranslator(new YoloV8Translator(input, conf, iou, names))
        .build();
    return c.loadModel();
  }
}
