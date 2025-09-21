import numpy as np
from PIL import Image
from .schemas import Detection, BBox, ImageDetections
from .config import settings

# DETR via Transformers
from transformers import pipeline

class Detector:
    def __init__(self):
        # Use DETR via Transformers pipeline
        self.pipe = pipeline("object-detection", model="facebook/detr-resnet-50")
        self.model_name = "facebook/detr-resnet-50"
        self.backend = "detr"

    def predict_image(self, img_bgr: np.ndarray) -> ImageDetections:
        # Convert BGR (OpenCV) to RGB as most models expect RGB
        img_rgb = img_bgr[:, :, ::-1]
        
        # DETR pipeline expects PIL Image
        img_pil = Image.fromarray(img_rgb)
        preds = self.pipe(img_pil)  # list of dicts with 'box' and 'score'/'label'
        
        # Filter detections by confidence threshold
        dets = []
        for p in preds:
            if float(p["score"]) >= settings.conf_threshold:
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