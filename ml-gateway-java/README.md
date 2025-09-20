# ML Gateway (Java, Spring Boot, DJL + ONNX Runtime)

A REST API service for YOLOv8 object detection on images and videos using Deep Java Library (DJL) and ONNX Runtime.

## 🚀 Quick Start

### 1. Get YOLOv8 ONNX Model

**Option A - Hugging Face (Recommended):**
```bash
# Get a free token from https://huggingface.co/settings/tokens
export HUGGING_FACE_HUB_TOKEN=your_token_here
./mvnw spring-boot:run
```

**Option B - Manual Download:**
```bash
# Try the download script
./download-model.sh

# If that fails, manually download any YOLOv8 ONNX model to:
# ml-gateway-java/models/yolov8n.onnx
```

### 2. Run Application
```bash
./mvnw spring-boot:run
# App starts on http://localhost:8080
```

## 📝 Model Configuration

Edit `src/main/resources/application.yaml`:

- `model.repoId`: Hugging Face repo (e.g. `ultralytics/yolov8n`)
- `model.filename`: Model filename (e.g. `yolov8n.onnx`) 
- `model.modelUrl`: Direct URL (overrides repoId/filename)

For private HF repos, set: `export HUGGING_FACE_HUB_TOKEN=your_token`

## Endpoints
- `GET /detect/healthz` → ok
- `POST /detect/image` (multipart/form-data, key `file`)
- `POST /detect/video` (multipart/form-data, key `file`)

## cURL examples
```bash
curl -F "file=@sample.jpg" http://localhost:8080/detect/image | jq
curl -F "file=@sample.mp4" http://localhost:8080/detect/video | jq
```

## Docker
```bash
docker build -t ml-gateway-java:latest .
docker run -p 8080:8080 -e HUGGING_FACE_HUB_TOKEN=xxxx ml-gateway-java:latest
```

## AWS hints
- Use ECS Fargate, attach task role with S3/HF access as needed.
- ALB health check: `/actuator/health` (enable Spring Boot Actuator).
- Put config in SSM Parameter Store; mount as env via ECS task def.
