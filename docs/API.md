# API Reference

## 🚀 Base URL
```
http://localhost:8000
```

## 📋 API Endpoints

### Health Check
```http
GET /health
```

**Description**: Get system health status and performance metrics.

**Response**: `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-09-20T18:46:52.424Z",
  "model": {
    "name": "facebook/detr-resnet-50",
    "backend": "detr"
  },
  "system": {
    "uptime_seconds": 1234.56,
    "cpu_usage_percent": 15.2,
    "memory": {
      "total_gb": 16.0,
      "available_gb": 8.5,
      "used_percent": 46.9
    }
  },
  "performance": {
    "total_requests": 42,
    "total_detections": 156,
    "avg_response_time_ms": 540.2,
    "requests_per_minute": 12.3
  }
}
```

### Performance Metrics
```http
GET /metrics
```

**Description**: Get real-time performance metrics.

**Response**: `200 OK`
```json
{
  "timestamp": "2025-09-20T18:46:52.424Z",
  "uptime_seconds": 1234.56,
  "total_requests": 42,
  "total_detections": 156,
  "avg_response_time_ms": 540.2,
  "requests_per_minute": 12.3,
  "detections_per_request": 3.7
}
```

### Image Detection
```http
POST /detect/image
Content-Type: multipart/form-data
```

**Description**: Analyze an image for object detection.

**Parameters**:
- `file` (required): Image file (JPG, PNG, WebP)
- File size limit: 10MB
- Supported formats: JPEG, PNG, WebP, BMP

**Request Example**:
```bash
curl -X POST "http://localhost:8000/detect/image" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@traffic_scene.jpg"
```

**Response**: `200 OK`
```json
{
  "model": "facebook/detr-resnet-50",
  "detections": [
    {
      "bbox": {
        "x1": 123.45,
        "y1": 67.89,
        "x2": 234.56,
        "y2": 178.90
      },
      "label": "car",
      "cls_id": null,
      "score": 0.95
    },
    {
      "bbox": {
        "x1": 345.67,
        "y1": 123.45,
        "x2": 456.78,
        "y2": 234.56
      },
      "label": "person",
      "cls_id": null,
      "score": 0.87
    }
  ]
}
```

**Error Responses**:

`400 Bad Request` - Invalid file format:
```json
{
  "detail": "File must be an image"
}
```

`400 Bad Request` - File too large:
```json
{
  "detail": "File size must be less than 10MB"
}
```

`500 Internal Server Error` - Processing error:
```json
{
  "detail": "Internal server error: Model inference failed"
}
```

### Video Detection
```http
POST /detect/video
Content-Type: multipart/form-data
```

**Description**: Analyze a video file or stream for object detection.

**Parameters** (either one required):
- `file`: Video file (MP4, WebM, AVI, MOV)
- `source_url`: Video URL (HTTP/HTTPS/RTSP/RTMP)

**Query Parameters**:
- `source_url`: Video stream URL (alternative to file upload)

**Request Examples**:

Upload video file:
```bash
curl -X POST "http://localhost:8000/detect/video" \
  -H "accept: application/json" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@traffic_video.mp4"
```

Analyze video URL:
```bash
curl -X POST "http://localhost:8000/detect/video?source_url=https://example.com/traffic.mp4" \
  -H "accept: application/json"
```

**Response**: `200 OK`
```json
{
  "model": "facebook/detr-resnet-50",
  "total_frames": 300,
  "processed_frames": 60,
  "fps_sample": 2,
  "results": [
    {
      "frame_index": 0,
      "time_sec": 0.0,
      "detections": [
        {
          "bbox": {
            "x1": 123.45,
            "y1": 67.89,
            "x2": 234.56,
            "y2": 178.90
          },
          "label": "car",
          "cls_id": null,
          "score": 0.95
        }
      ]
    },
    {
      "frame_index": 5,
      "time_sec": 2.5,
      "detections": [
        {
          "bbox": {
            "x1": 345.67,
            "y1": 123.45,
            "x2": 456.78,
            "y2": 234.56
          },
          "label": "truck",
          "cls_id": null,
          "score": 0.92
        }
      ]
    }
  ],
  "counts_by_label": {
    "car": 15,
    "truck": 8,
    "person": 23,
    "bicycle": 5
  }
}
```

**Error Responses**:

`400 Bad Request` - No input provided:
```json
{
  "detail": "Provide a video file or source_url"
}
```

`400 Bad Request` - Invalid URL format:
```json
{
  "detail": "Video processing error: Invalid URL format. Must start with http://, https://, rtsp://, or rtmp://"
}
```

`400 Bad Request` - Video processing error:
```json
{
  "detail": "Video processing error: Unable to open video source"
}
```

## 📊 Data Schemas

### BBox
Bounding box coordinates.
```json
{
  "x1": 123.45,  // float: Left coordinate
  "y1": 67.89,   // float: Top coordinate  
  "x2": 234.56,  // float: Right coordinate
  "y2": 178.90   // float: Bottom coordinate
}
```

### Detection
Single object detection result.
```json
{
  "bbox": {       // BBox: Bounding box coordinates
    "x1": 123.45,
    "y1": 67.89,
    "x2": 234.56,
    "y2": 178.90
  },
  "label": "car", // string: Detected object class
  "cls_id": null, // int|null: Class ID (model-specific)
  "score": 0.95   // float: Confidence score (0.0-1.0)
}
```

### ImageDetections
Complete image analysis result.
```json
{
  "model": "facebook/detr-resnet-50", // string: Model identifier
  "detections": [                     // Detection[]: List of detections
    {
      "bbox": { "x1": 123.45, "y1": 67.89, "x2": 234.56, "y2": 178.90 },
      "label": "car",
      "cls_id": null,
      "score": 0.95
    }
  ]
}
```

### VideoFrameDetections
Detections for a single video frame.
```json
{
  "frame_index": 0,    // int: Frame number (0-based)
  "time_sec": 0.0,     // float: Timestamp in seconds
  "detections": [      // Detection[]: List of detections in this frame
    {
      "bbox": { "x1": 123.45, "y1": 67.89, "x2": 234.56, "y2": 178.90 },
      "label": "car",
      "cls_id": null,
      "score": 0.95
    }
  ]
}
```

### VideoDetections
Complete video analysis result.
```json
{
  "model": "facebook/detr-resnet-50",     // string: Model identifier
  "total_frames": 300,                    // int: Total frames in video
  "processed_frames": 60,                 // int: Frames actually processed
  "fps_sample": 2,                        // int: Frame sampling rate
  "results": [                            // VideoFrameDetections[]: Frame results
    {
      "frame_index": 0,
      "time_sec": 0.0,
      "detections": [...]
    }
  ],
  "counts_by_label": {                    // dict[str, int]: Aggregated counts
    "car": 15,
    "truck": 8,
    "person": 23,
    "bicycle": 5
  }
}
```

## 🏷️ Supported Object Classes

The system can detect the following object classes:

### Vehicle Classes
- `car` - Passenger cars, sedans, hatchbacks
- `truck` - Trucks, lorries, commercial vehicles
- `bus` - Buses, coaches
- `motorcycle` - Motorcycles, scooters
- `bicycle` - Bicycles, e-bikes

### Person Classes  
- `person` - Pedestrians, people

### Infrastructure Classes
- `traffic light` - Traffic signals
- `stop sign` - Stop signs

*Note: Uses DETR model for object detection*

## ⚙️ Configuration

### Model Configuration

The system uses Facebook's DETR model by default. No additional model configuration is required.

### Detection Thresholds

```bash
CONF_THRESHOLD=0.25    # Minimum confidence score (0.0-1.0)
```

### Video Processing

```bash
VIDEO_FPS_SAMPLE=2     # Process every Nth frame
VIDEO_MAX_FRAMES=120   # Maximum frames to process
```

## 🚦 Rate Limits

- **No explicit rate limits** currently implemented
- **File size limits**: 10MB for images, no explicit limit for videos
- **Processing time**: Varies by content complexity (0.4-2.0s typical)
- **Concurrent requests**: Supported via FastAPI async processing

## 🔐 Authentication

- **No authentication** required currently
- **CORS**: Enabled for all origins (`*`)
- **Public access**: All endpoints are publicly accessible

## 📱 Client Libraries

### cURL Examples

Basic image detection:
```bash
curl -X POST "http://localhost:8000/detect/image" \
  -F "file=@image.jpg"
```

Video analysis with URL:
```bash
curl -X POST "http://localhost:8000/detect/video" \
  --data-urlencode "source_url=https://example.com/video.mp4"
```

Check system health:
```bash
curl "http://localhost:8000/health"
```

### JavaScript (Frontend Integration)

```javascript
// Image detection
const formData = new FormData();
formData.append('file', imageFile);

const response = await fetch('http://localhost:8000/detect/image', {
  method: 'POST',
  body: formData
});

const result = await response.json();
console.log(`Detected ${result.detections.length} objects`);
```

### Python Client

```python
import requests

# Image detection
with open('traffic.jpg', 'rb') as f:
    files = {'file': f}
    response = requests.post('http://localhost:8000/detect/image', files=files)
    result = response.json()
    
print(f"Detected {len(result['detections'])} objects")

# Video URL analysis  
params = {'source_url': 'https://example.com/traffic.mp4'}
response = requests.post('http://localhost:8000/detect/video', params=params)
result = response.json()

print(f"Processed {result['processed_frames']}/{result['total_frames']} frames")
```

## 🐛 Error Handling

The API returns standard HTTP status codes:

- `200` - Success
- `400` - Bad Request (invalid input, file format, etc.)
- `422` - Unprocessable Entity (validation errors)
- `500` - Internal Server Error (model/processing errors)

All error responses include a `detail` field with a descriptive message.

## 📚 Interactive Documentation

Visit `http://localhost:8000/docs` for interactive API documentation powered by Swagger UI, where you can:

- Test all endpoints directly in the browser
- View detailed request/response schemas
- Download OpenAPI specification
- Explore examples and validation rules

## 🔄 WebSocket Support

Currently **not supported**. All endpoints use standard HTTP request/response pattern.

For real-time applications, consider:
- Polling the `/metrics` endpoint
- Implementing client-side queuing for batch processing
- Using the frontend's real-time analytics for live updates
