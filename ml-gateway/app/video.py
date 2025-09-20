import cv2
import math
import numpy as np
import logging
from collections import Counter
from .infer import detector
from .schemas import VideoDetections, VideoFrameDetections
from .config import settings
from .tracker import CentroidTracker

logger = logging.getLogger(__name__)

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
    
    # Initialize object tracker for unique counting
    tracker = CentroidTracker(max_disappeared=30, max_distance=100.0)
    raw_counts = Counter()  # Track raw detections for comparison

    processed = 0
    total = int(cap.get(cv2.CAP_PROP_FRAME_COUNT) or 0)
    
    logger.info(f"🎬 Starting video processing: {source_path}")
    logger.info(f"📊 Settings: fps_sample={fps_sample}, max_frames={max_frames}")

    for idx, frame, tsec in _sample_frames(cap, fps_sample, max_frames):
        # Get detections for current frame
        img_res = detector.predict_image(frame)
        
        # Count raw detections for comparison
        for detection in img_res.detections:
            raw_counts[detection.label] += 1
        
        # Update tracker with current frame detections
        tracked_objects = tracker.update(img_res.detections)
        
        # Store frame results (with original detections for visualization)
        results.append(VideoFrameDetections(
            frame_index=idx,
            time_sec=float(tsec),
            detections=img_res.detections
        ))
        
        processed += 1

    # Get unique object counts from tracker (this is the key change!)
    unique_counts = tracker.get_unique_counts()
    
    # Log the dramatic difference!
    raw_total = sum(raw_counts.values())
    unique_total = sum(unique_counts.values())
    reduction_percent = ((raw_total - unique_total) / raw_total * 100) if raw_total > 0 else 0
    
    logger.info(f"🔥 TRACKING RESULTS:")
    logger.info(f"📊 Raw detections (old method): {dict(raw_counts)} | Total: {raw_total}")
    logger.info(f"🎯 Unique objects (new method): {unique_counts} | Total: {unique_total}")
    logger.info(f"✂️ Reduction: {reduction_percent:.1f}% fewer counted objects!")
    
    # Create tracking info for debugging and insights
    tracking_info = {
        "total_unique_objects": tracker.get_total_unique_objects(),
        "unique_counts_by_label": unique_counts,
        "raw_counts_comparison": dict(raw_counts),
        "reduction_percentage": round(reduction_percent, 1),
        "tracking_method": "centroid_based",
        "max_disappeared_frames": 30,
        "max_distance_threshold": 100.0
    }
    
    cap.release()
    return VideoDetections(
        model=detector.model_name,
        total_frames=total,
        processed_frames=processed,
        fps_sample=fps_sample,
        results=results,
        counts_by_label=unique_counts,  # Now returns unique object counts, not frame-by-frame counts
        tracking_info=tracking_info
    )
