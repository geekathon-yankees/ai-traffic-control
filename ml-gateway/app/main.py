import os
import tempfile
import shutil
import time
import logging
import uuid
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, Query, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import numpy as np
import cv2
import psutil

from .schemas import ImageDetections, VideoDetections
from .infer import detector
from .video import detect_on_video

# Setup enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Performance metrics
performance_metrics = {
    "requests_count": 0,
    "average_response_time": 0,
    "total_detections": 0,
    "start_time": time.time()
}

app = FastAPI(title="ML Gateway", version="0.1.0")

# Add CORS middleware to allow frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

@app.get("/health")
def health():
    uptime = time.time() - performance_metrics["start_time"]
    
    # Get system information
    memory = psutil.virtual_memory()
    cpu_percent = psutil.cpu_percent(interval=0.1)  # Non-blocking call
    
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "model": {
            "name": detector.model_name,
            "backend": "yolo" if hasattr(detector, "yolo") else "detr"
        },
        "system": {
            "uptime_seconds": round(uptime, 2),
            "cpu_usage_percent": cpu_percent,
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "used_percent": memory.percent
            }
        },
        "performance": {
            "total_requests": performance_metrics["requests_count"],
            "total_detections": performance_metrics["total_detections"],
            "avg_response_time_ms": round(performance_metrics["average_response_time"] * 1000, 2),
            "requests_per_minute": round(performance_metrics["requests_count"] / (uptime / 60), 2) if uptime > 0 else 0
        }
    }

@app.get("/metrics")
def get_metrics():
    """Get real-time performance metrics"""
    uptime = time.time() - performance_metrics["start_time"]
    return {
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": round(uptime, 2),
        "total_requests": performance_metrics["requests_count"],
        "total_detections": performance_metrics["total_detections"],
        "avg_response_time_ms": round(performance_metrics["average_response_time"] * 1000, 2),
        "requests_per_minute": round(performance_metrics["requests_count"] / (uptime / 60), 2) if uptime > 0 else 0,
        "detections_per_request": round(performance_metrics["total_detections"] / performance_metrics["requests_count"], 2) if performance_metrics["requests_count"] > 0 else 0
    }

@app.post("/detect/image", response_model=ImageDetections)
async def detect_image(request: Request, file: UploadFile = File(...)):
    request_id = str(uuid.uuid4())[:8]
    start_time = time.time()
    
    logger.info(f"Request {request_id}: Image detection started - file: {file.filename} ({file.size} bytes)")
    
    try:
        # Validate file
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        if file.size and file.size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="File size must be less than 10MB")
        
        data = await file.read()
        np_arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Not an image or unsupported format")
        
        # Perform inference
        inference_start = time.time()
        result = detector.predict_image(img)
        inference_time = time.time() - inference_start
        
        # Update performance metrics
        total_time = time.time() - start_time
        performance_metrics["requests_count"] += 1
        performance_metrics["total_detections"] += len(result.detections)
        
        # Update average response time
        current_avg = performance_metrics["average_response_time"]
        count = performance_metrics["requests_count"]
        performance_metrics["average_response_time"] = (current_avg * (count - 1) + total_time) / count
        
        logger.info(f"Request {request_id}: Completed - {len(result.detections)} detections in {inference_time:.3f}s (total: {total_time:.3f}s)")
        
        return JSONResponse(result.model_dump())
        
    except HTTPException:
        logger.warning(f"Request {request_id}: HTTP error - {file.filename}")
        raise
    except Exception as e:
        logger.error(f"Request {request_id}: Unexpected error - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

@app.post("/detect/video", response_model=VideoDetections)
async def detect_video(
    file: Optional[UploadFile] = File(None),
    source_url: Optional[str] = Query(default=None, description="HTTP/HTTPS/RTSP URL")
):
    # Allow either an uploaded file OR a URL; prefer file if both provided
    if file is None and not source_url:
        raise HTTPException(status_code=400, detail="Provide a video file or source_url")

    try:
        if file is not None:
            # Handle uploaded video file
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                tmp.write(await file.read())
                tmp_path = tmp.name
            try:
                res = detect_on_video(tmp_path)
                return JSONResponse(res.model_dump())
            finally:
                os.unlink(tmp_path)
        else:
            # Handle video URL
            if not source_url.startswith(("http://", "https://", "rtsp://", "rtmp://")):
                raise ValueError("Invalid URL format. Must start with http://, https://, rtsp://, or rtmp://")
            res = detect_on_video(source_url)
            return JSONResponse(res.model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Video processing error: {str(e)}")
