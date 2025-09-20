import os
import tempfile
import shutil
from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import numpy as np
import cv2

from .schemas import ImageDetections, VideoDetections
from .infer import detector
from .video import detect_on_video

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
    return {
        "status": "ok",
        "model": detector.model_name,
        "backend": "yolo" if hasattr(detector, "yolo") else "detr"
    }

@app.post("/detect/image", response_model=ImageDetections)
async def detect_image(file: UploadFile = File(...)):
    try:
        data = await file.read()
        np_arr = np.frombuffer(data, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Not an image or unsupported format")
        result = detector.predict_image(img)
        return JSONResponse(result.model_dump())
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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
