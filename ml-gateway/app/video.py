import cv2
import math
import numpy as np
from collections import Counter
from .infer import detector
from .schemas import VideoDetections, VideoFrameDetections
from .config import settings

def _sample_frames(cap, fps_sample: int, max_frames: int):
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
    frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    step = max(1, int(round(fps / fps_sample)))
    processed = 0
    i = 0
    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if i % step == 0:
            yield i, frame, (i / (fps or 1.0))
            processed += 1
            if processed >= max_frames:
                break
        i += 1

def detect_on_video(source_path: str) -> VideoDetections:
    cap = cv2.VideoCapture(source_path)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open video source: {source_path}")

    fps_sample = int(settings.video_fps_sample)
    max_frames = int(settings.video_max_frames)
    results = []
    counts = Counter()

    processed = 0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)

    for idx, frame, tsec in _sample_frames(cap, fps_sample, max_frames):
        img_res = detector.predict_image(frame)
        results.append(VideoFrameDetections(
            frame_index=idx,
            time_sec=float(tsec),
            detections=img_res.detections
        ))
        for d in img_res.detections:
            counts[d.label] += 1
        processed += 1

    cap.release()
    return VideoDetections(
        model=detector.model_name,
        total_frames=total,
        processed_frames=processed,
        fps_sample=fps_sample,
        results=results,
        counts_by_label=dict(counts)
    )
