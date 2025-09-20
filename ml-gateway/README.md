# ML Gateway (FastAPI)

A REST API service for object detection on images and videos using YOLOv8 or DETR models.

## Features

- **Image Detection**: Upload images for object detection
- **Video Detection**: Process video files or stream from URLs
- **Flexible Models**: Switch between YOLOv8 (Ultralytics) and DETR (Facebook)
- **Hugging Face Integration**: Automatic model downloads from HF Hub
- **Docker Support**: Containerized deployment

## Quick Start

### 1. Local Development

```bash
# Clone and setup
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Configure (optional)
cp env.example .env
# Edit .env to customize model settings

# Run the server
uvicorn app.main:app --reload --port 8000
```

### 2. Docker

```bash
docker build -t ml-gateway:latest .
docker run -p 8000:8000 --env-file env.example ml-gateway:latest
```

## Configuration

### Model Selection

**YOLOv8 from HF Hub (default):**
```bash
MODEL_KIND=yolo
HF_REPO_ID=ultralytics/yolov8n
HF_FILENAME=yolov8n.pt
```

**DETR (Transformers):**
```bash
MODEL_KIND=detr
# HF_* variables ignored for DETR
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MODEL_KIND` | `yolo` | Model type: `yolo` or `detr` |
| `HF_REPO_ID` | `ultralytics/yolov8n` | Hugging Face repository ID |
| `HF_FILENAME` | `yolov8n.pt` | Model filename in the repo |
| `CONF_THRESHOLD` | `0.25` | Confidence threshold for detections |
| `IOU_THRESHOLD` | `0.45` | IoU threshold for NMS |
| `VIDEO_FPS_SAMPLE` | `2` | Sample rate for video processing (FPS) |
| `VIDEO_MAX_FRAMES` | `120` | Maximum frames to process per video |
| `PORT` | `8000` | Server port |
| `HF_TOKEN` | | Hugging Face token (for private repos) |

## API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Image Detection
```bash
curl -X POST "http://localhost:8000/detect/image" \\
  -F "file=@sample.jpg"
```

### Video Detection (File Upload)
```bash
curl -X POST "http://localhost:8000/detect/video" \\
  -F "file=@sample.mp4"
```

### Video Detection (URL/Stream)
```bash
curl -X POST "http://localhost:8000/detect/video?source_url=https://sample-videos.com/video321/mp4/720/big_buck_bunny_720p_1mb.mp4"
```

## Response Format

### Image Detection Response
```json
{
  "model": "ultralytics/yolov8n:yolov8n.pt",
  "detections": [
    {
      "bbox": {
        "x1": 100.5,
        "y1": 150.2,
        "x2": 300.8,
        "y2": 400.1
      },
      "label": "person",
      "cls_id": 0,
      "score": 0.85
    }
  ]
}
```

### Video Detection Response
```json
{
  "model": "ultralytics/yolov8n:yolov8n.pt",
  "total_frames": 1000,
  "processed_frames": 60,
  "fps_sample": 2,
  "results": [
    {
      "frame_index": 0,
      "time_sec": 0.0,
      "detections": [...]
    }
  ],
  "counts_by_label": {
    "person": 45,
    "car": 12
  }
}
```

## Development

### Project Structure
```
ml-gateway/
├── app/
│   ├── main.py          # FastAPI application
│   ├── infer.py         # Model inference logic
│   ├── video.py         # Video processing
│   ├── schemas.py       # Pydantic models
│   └── config.py        # Configuration management
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container definition
├── env.example         # Environment template
└── README.md           # This file
```

### Adding New Models

1. Update `infer.py` to add a new backend
2. Modify `Detector.__init__()` to handle the new model type
3. Implement prediction logic in `predict_image()`

## Troubleshooting

### Model Download Issues
- For private repositories, set the `HF_TOKEN` environment variable
- Check your internet connection for Hugging Face downloads
- Verify the `HF_REPO_ID` and `HF_FILENAME` are correct

### Video Processing Issues
- Ensure FFmpeg is properly installed
- For RTSP streams, you may need additional codecs
- Check that the video URL is accessible from your network

### Performance
- Use GPU-enabled Docker images for better performance
- Adjust `VIDEO_FPS_SAMPLE` and `VIDEO_MAX_FRAMES` for your needs
- Consider using smaller models (yolov8n vs yolov8x) for faster inference
