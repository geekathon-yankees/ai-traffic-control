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
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from .schemas import ImageDetections, VideoDetections
from .infer import detector
from .video import detect_on_video

# Setup enhanced logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# System information functions
def get_gpu_info():
    """Get GPU information if available"""
    gpu_info = {
        "available": False,
        "device": "cpu",
        "memory_used_mb": 0,
        "memory_total_mb": 0,
        "utilization_percent": 0
    }
    
    if not TORCH_AVAILABLE:
        return gpu_info
    
    try:
        # Check for CUDA (NVIDIA)
        if torch.cuda.is_available():
            gpu_info["available"] = True
            gpu_info["device"] = f"cuda:{torch.cuda.current_device()}"
            gpu_info["name"] = torch.cuda.get_device_name(0)
            
            # Get memory info
            memory_reserved = torch.cuda.memory_reserved(0)
            memory_allocated = torch.cuda.memory_allocated(0)
            gpu_info["memory_used_mb"] = round(memory_allocated / 1024**2, 2)
            gpu_info["memory_total_mb"] = round(memory_reserved / 1024**2, 2)
            
        # Check for MPS (Apple Silicon)
        elif hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            gpu_info["available"] = True
            gpu_info["device"] = "mps:0"
            gpu_info["name"] = "Apple Silicon GPU (MPS)"
            # MPS doesn't provide detailed memory stats like CUDA
            gpu_info["memory_used_mb"] = "N/A"
            gpu_info["memory_total_mb"] = "N/A"
            gpu_info["utilization_percent"] = "N/A"
            
    except Exception as e:
        logger.warning(f"Could not get GPU info: {e}")
    
    return gpu_info

def calculate_detection_stats(detections):
    """Calculate statistics from detection results"""
    vehicles = 0
    total_confidence = 0.0
    vehicle_types = ['car', 'truck', 'bus', 'motorcycle']
    
    for detection in detections:
        total_confidence += detection.score
        if detection.label.lower() in vehicle_types:
            vehicles += 1
    
    accuracy = (total_confidence / len(detections) * 100) if detections else 95.0
    
    return {
        'vehicles_detected': vehicles,
        'accuracy': round(accuracy, 1)
    }

def update_last_detection_run(detections, processing_time_ms, detection_type):
    """Update the last detection run tracking"""
    global last_detection_run
    stats = calculate_detection_stats(detections)
    
    last_detection_run.update({
        "timestamp": datetime.utcnow().isoformat(),
        "vehicles_detected": stats['vehicles_detected'],
        "processing_time_ms": round(processing_time_ms),
        "accuracy": stats['accuracy'],
        "detection_type": detection_type
    })

# Performance metrics
def reset_performance_metrics():
    """Reset all performance metrics to initial state"""
    global performance_metrics, last_detection_run
    performance_metrics = {
        "requests_count": 0,
        "average_response_time": 0,
        "total_detections": 0,
        "start_time": time.time()
    }
    last_detection_run = {
        "timestamp": None,
        "vehicles_detected": 0,
        "processing_time_ms": 0,
        "accuracy": 95.0,
        "detection_type": None
    }
    logger.info("🔄 Performance metrics reset to zero")

performance_metrics = {
    "requests_count": 0,
    "average_response_time": 0,
    "total_detections": 0,
    "start_time": time.time()
}

# Last detection run tracking
last_detection_run = {
    "timestamp": None,
    "vehicles_detected": 0,
    "processing_time_ms": 0,
    "accuracy": 95.0,
    "detection_type": None
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
    cpu_percent = psutil.cpu_percent(interval=0.05)  # Faster, less blocking call
    gpu_info = get_gpu_info()
    
    return {
        "status": "ok",
        "timestamp": datetime.utcnow().isoformat(),
        "model": {
            "name": detector.model_name,
            "backend": "detr"
        },
        "system": {
            "uptime_seconds": round(uptime, 2),
            "cpu_usage_percent": cpu_percent,
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "used_percent": memory.percent
            },
            "gpu": gpu_info
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
        "detections_per_request": round(performance_metrics["total_detections"] / performance_metrics["requests_count"], 2) if performance_metrics["requests_count"] > 0 else 0,
        "last_detection_run": last_detection_run
    }

@app.get("/system")
def get_system_metrics():
    """Get real-time system performance metrics (CPU, Memory, GPU)"""
    try:
        # CPU information
        cpu_percent = psutil.cpu_percent(interval=0.05)
        cpu_count = psutil.cpu_count()
        cpu_freq = psutil.cpu_freq()
        
        # Memory information
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        # Disk information
        disk = psutil.disk_usage('/')
        
        # GPU information
        gpu_info = get_gpu_info()
        
        # Process information
        process = psutil.Process()
        process_memory = process.memory_info()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu": {
                "usage_percent": cpu_percent,
                "count": cpu_count,
                "frequency_mhz": round(cpu_freq.current, 2) if cpu_freq else None,
                "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
            },
            "memory": {
                "total_gb": round(memory.total / (1024**3), 2),
                "available_gb": round(memory.available / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2),
                "used_percent": memory.percent,
                "swap_used_gb": round(swap.used / (1024**3), 2),
                "swap_percent": swap.percent
            },
            "disk": {
                "total_gb": round(disk.total / (1024**3), 2),
                "free_gb": round(disk.free / (1024**3), 2),
                "used_percent": round((disk.used / disk.total) * 100, 1)
            },
            "gpu": gpu_info,
            "process": {
                "memory_mb": round(process_memory.rss / (1024**2), 2),
                "cpu_percent": process.cpu_percent()
            }
        }
    except Exception as e:
        logger.error(f"Error getting system metrics: {e}")
        return {
            "error": f"Could not retrieve system metrics: {str(e)}",
            "timestamp": datetime.utcnow().isoformat()
        }

@app.post("/metrics/reset")
def reset_metrics():
    """Reset all performance metrics to zero"""
    reset_performance_metrics()
    return {
        "status": "success",
        "message": "All performance metrics have been reset to zero",
        "timestamp": datetime.utcnow().isoformat(),
        "reset_time": time.time()
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
        
        # Update last detection run
        update_last_detection_run(result.detections, total_time * 1000, "image")
        
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

    start_time = time.time()
    try:
        if file is not None:
            # Handle uploaded video file
            with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as tmp:
                tmp.write(await file.read())
                tmp_path = tmp.name
            try:
                res = await detect_on_video(tmp_path)
                
                # Calculate total detections from all frames for last run tracking
                all_detections = []
                for frame_result in res.results:
                    all_detections.extend(frame_result.detections)
                
                # Update last detection run
                total_time = time.time() - start_time
                update_last_detection_run(all_detections, total_time * 1000, "video")
                
                return JSONResponse(res.model_dump())
            finally:
                os.unlink(tmp_path)
        else:
            # Handle video URL
            if not source_url.startswith(("http://", "https://", "rtsp://", "rtmp://")):
                raise ValueError("Invalid URL format. Must start with http://, https://, rtsp://, or rtmp://")
            res = await detect_on_video(source_url)
            
            # Calculate total detections from all frames for last run tracking
            all_detections = []
            for frame_result in res.results:
                all_detections.extend(frame_result.detections)
            
            # Update last detection run
            total_time = time.time() - start_time
            update_last_detection_run(all_detections, total_time * 1000, "video")
            
            return JSONResponse(res.model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Video processing error: {str(e)}")
