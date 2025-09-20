import os
import numpy as np
from typing import List, Tuple, Dict
from PIL import Image
from .schemas import Detection, BBox, ImageDetections
from .config import settings

# Optional DETR (Transformers)
from transformers import pipeline

# Optional YOLO (Ultralytics)
from ultralytics import YOLO

class Detector:
    def __init__(self):
        self.kind = settings.model_kind.lower().strip()
        if self.kind == "yolo":
            # Load model directly - ultralytics will auto-download if needed
            self.model_name = settings.hf_filename  # e.g., "yolov8n.pt" 
            self.yolo = YOLO(settings.hf_filename)  # ultralytics auto-downloads public models
            # configure thresholds
            self.yolo.overrides["conf"] = settings.conf_threshold
            self.yolo.overrides["iou"] = settings.iou_threshold
            self.labels = None  # YOLO returns names inside results
            self.backend = "yolo"
        else:
            # DETR via Transformers pipeline
            self.pipe = pipeline("object-detection", model="facebook/detr-resnet-50")
            self.model_name = "facebook/detr-resnet-50"
            self.backend = "detr"

    def predict_image(self, img_bgr: np.ndarray) -> ImageDetections:
        # Convert BGR (OpenCV) to RGB as most models expect RGB
        img_rgb = img_bgr[:, :, ::-1]

        if self.backend == "yolo":
            res = self.yolo.predict(source=img_rgb, verbose=False)[0]
            dets = []
            names = res.names
            for b in res.boxes:
                xyxy = b.xyxy.cpu().numpy().astype(float).ravel().tolist()
                cls_id = int(b.cls.item())
                conf = float(b.conf.item())
                dets.append(Detection(
                    bbox=BBox(x1=xyxy[0], y1=xyxy[1], x2=xyxy[2], y2=xyxy[3]),
                    label=names.get(cls_id, str(cls_id)),
                    cls_id=cls_id,
                    score=conf
                ))
            return ImageDetections(model=self.model_name, detections=dets)
        else:
            # DETR pipeline expects PIL Image
            img_pil = Image.fromarray(img_rgb)
            preds = self.pipe(img_pil)  # list of dicts with 'box' and 'score'/'label'
            dets = []
            for p in preds:
                box = p["box"]
                dets.append(Detection(
                    bbox=BBox(x1=float(box["xmin"]), y1=float(box["ymin"]),
                              x2=float(box["xmax"]), y2=float(box["ymax"])),
                    label=str(p["label"]),
                    score=float(p["score"]),
                    cls_id=None
                ))
            return ImageDetections(model=self.model_name, detections=dets)

detector = Detector()
