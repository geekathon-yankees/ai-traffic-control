from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    model_kind: str = "yolo"   # "yolo" or "detr"
    hf_filename: str = "yolov8n.pt"  # Model name for ultralytics (e.g., yolov8n.pt, yolov8s.pt, yolov8m.pt)
    conf_threshold: float = 0.25
    iou_threshold: float = 0.45
    video_fps_sample: int = 2
    video_max_frames: int = 120
    port: int = 8000
    hf_token: Optional[str] = None  # Keep for future use if needed
    
    class Config:
        env_file = ".env"

settings = Settings()
