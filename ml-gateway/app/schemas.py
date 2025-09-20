from pydantic import BaseModel, Field
from typing import List, Optional

class BBox(BaseModel):
    x1: float
    y1: float
    x2: float
    y2: float

class Detection(BaseModel):
    bbox: BBox
    label: str
    cls_id: int | None = None
    score: float

class ImageDetections(BaseModel):
    model: str
    detections: List[Detection] = Field(default_factory=list)

class VideoFrameDetections(BaseModel):
    frame_index: int
    time_sec: float
    detections: List[Detection] = Field(default_factory=list)

class VideoDetections(BaseModel):
    model: str
    total_frames: int
    processed_frames: int
    fps_sample: int
    results: List[VideoFrameDetections] = Field(default_factory=list)
    counts_by_label: dict[str, int] = Field(default_factory=dict)
    tracking_info: Optional[dict] = Field(default=None, description="Object tracking information for unique counts")
