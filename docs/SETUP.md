# Setup Guide

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** (recommended for best compatibility)
- **Git** for cloning the repository
- **10GB+ free disk space** for models and dependencies
- **8GB+ RAM** recommended for optimal performance

### 1. Clone Repository
```bash
git clone https://github.com/your-username/ai-traffic-control.git
cd ai-traffic-control
```

### 2. Backend Setup
```bash
cd ml-gateway

# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

### 3. Configure Environment
```bash
# Copy example environment file
cp .env.example .env

# Edit configuration (optional)
nano .env
```

### 4. Start Backend Server
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. Start Frontend Server
```bash
# In a new terminal
cd ../frontend
python3 -m http.server 8080
```

### 6. Access Application
- **Frontend Dashboard**: http://localhost:8080
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 🔧 Detailed Installation

### Python Environment Setup

#### Using pyenv (Recommended)
```bash
# Install pyenv (macOS with Homebrew)
brew install pyenv

# Install Python 3.11
pyenv install 3.11.9
pyenv local 3.11.9
```

#### Using conda
```bash
# Create conda environment
conda create -n ai-traffic python=3.11
conda activate ai-traffic
```

### Backend Dependencies

#### Core Requirements
```bash
# Navigate to backend directory
cd ml-gateway

# Install from requirements.txt
pip install -r requirements.txt
```

#### Manual Installation (Alternative)
```bash
# Core framework
pip install fastapi>=0.115.0 uvicorn>=0.30.0

# AI/ML libraries  
pip install torch>=2.6.0 transformers>=4.44.0 ultralytics>=8.2.0
pip install huggingface_hub>=0.24.0 timm>=0.9.0

# Image/video processing
pip install opencv-python-headless>=4.10.0 pillow>=10.0.0
pip install ffmpeg-python>=0.2.0

# Data validation
pip install pydantic>=2.8.0 pydantic-settings>=2.4.0

# System monitoring
pip install psutil>=5.9.0
```

### Model Downloads

Models are automatically downloaded on first use. Ensure stable internet connection.

#### DETR Model (Default)
- **Model**: `facebook/detr-resnet-50`
- **Size**: ~160MB
- **Download**: Automatic via Transformers

#### YOLOv8 Model (Optional)
- **Model**: `ultralytics/yolov8n`
- **Size**: ~6MB  
- **Download**: Automatic via Hugging Face Hub

### Frontend Setup

The frontend requires no additional dependencies - it's pure HTML/CSS/JavaScript.

```bash
cd frontend

# Verify files are present
ls -la
# Should show: index.html, script.js, styles.css

# Start simple HTTP server
python3 -m http.server 8080

# Alternative: Using Node.js
npx serve . -p 8080

# Alternative: Using PHP
php -S localhost:8080
```

## ⚙️ Configuration

### Environment Variables

Create `.env` file in `ml-gateway/` directory:

```bash
# Model Configuration
MODEL_KIND=detr                    # "detr" or "yolo"
HF_REPO_ID=ultralytics/yolov8n    # For YOLO models
HF_FILENAME=yolov8n.pt            # Model file name
HF_TOKEN=                         # Optional: Hugging Face token

# Detection Thresholds
CONF_THRESHOLD=0.25               # Confidence threshold (0.0-1.0)
IOU_THRESHOLD=0.45                # IoU threshold for NMS (YOLO only)

# Video Processing
VIDEO_FPS_SAMPLE=2                # Process every Nth frame
VIDEO_MAX_FRAMES=120              # Maximum frames to process

# Server Configuration  
PORT=8000                         # Backend server port
```

### Model Selection

#### Using DETR (Recommended for accuracy)
```bash
MODEL_KIND=detr
# No additional configuration needed
```

#### Using YOLOv8 (Recommended for speed)
```bash
MODEL_KIND=yolo
HF_REPO_ID=ultralytics/yolov8n
HF_FILENAME=yolov8n.pt
CONF_THRESHOLD=0.25
IOU_THRESHOLD=0.45
```

### Advanced Configuration

#### Custom Model Repositories
```bash
# Use custom YOLO model
HF_REPO_ID=your-username/custom-yolo
HF_FILENAME=custom-model.pt

# Use private repository
HF_TOKEN=hf_your_token_here
```

#### Performance Tuning
```bash
# High accuracy (slower)
CONF_THRESHOLD=0.15
VIDEO_FPS_SAMPLE=1
VIDEO_MAX_FRAMES=300

# High speed (less accurate)
CONF_THRESHOLD=0.4
VIDEO_FPS_SAMPLE=5
VIDEO_MAX_FRAMES=60
```

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

Create `docker-compose.yml`:
```yaml
version: '3.8'

services:
  backend:
    build: ./ml-gateway
    ports:
      - "8000:8000"
    environment:
      - MODEL_KIND=detr
      - CONF_THRESHOLD=0.25
    volumes:
      - model_cache:/app/.cache

  frontend:
    image: nginx:alpine
    ports:
      - "8080:80"
    volumes:
      - ./frontend:/usr/share/nginx/html

volumes:
  model_cache:
```

Start with Docker Compose:
```bash
docker-compose up -d
```

### Manual Docker Setup

#### Backend Container
```bash
cd ml-gateway

# Build image
docker build -t ai-traffic-backend .

# Run container
docker run -d \
  -p 8000:8000 \
  -e MODEL_KIND=detr \
  -v model_cache:/app/.cache \
  ai-traffic-backend
```

#### Frontend Container
```bash
cd frontend

# Simple nginx setup
docker run -d \
  -p 8080:80 \
  -v $(pwd):/usr/share/nginx/html \
  nginx:alpine
```

## 🧪 Development Setup

### Hot Reload Development

#### Backend Development
```bash
cd ml-gateway
source .venv/bin/activate

# Install development dependencies
pip install watchfiles

# Start with auto-reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Development
```bash
cd frontend

# Use live-server for auto-refresh
npx live-server --port=8080 --host=0.0.0.0

# Alternative: Python with auto-refresh
python3 -c "
import http.server
import socketserver
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
# ... auto-refresh logic ...
"
```

### Code Quality Tools

```bash
# Install development tools
pip install black isort flake8 mypy pytest

# Format code
black .
isort .

# Lint code
flake8 .
mypy .

# Run tests
pytest
```

## 🔧 Troubleshooting

### Common Issues

#### 1. Model Download Failures
```bash
# Error: Unable to download model
# Solution: Check internet connection and try again
rm -rf ~/.cache/huggingface/transformers/
python -c "from transformers import pipeline; pipeline('object-detection', model='facebook/detr-resnet-50')"
```

#### 2. Port Already in Use
```bash
# Error: [Errno 48] Address already in use
# Solution: Kill process using the port
lsof -ti:8000 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

#### 3. Virtual Environment Issues
```bash
# Error: Command 'uvicorn' not found
# Solution: Ensure virtual environment is activated
source .venv/bin/activate
which python  # Should point to .venv/bin/python
pip list | grep fastapi  # Should show fastapi installed
```

#### 4. CORS Issues
```bash
# Error: CORS policy blocks requests
# Solution: Ensure backend CORS middleware is configured
# Check app/main.py contains:
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 5. Memory Issues
```bash
# Error: Out of memory during inference
# Solution: Reduce batch size or video processing parameters
VIDEO_FPS_SAMPLE=5      # Process fewer frames
VIDEO_MAX_FRAMES=60     # Limit total frames
```

### Platform-Specific Issues

#### macOS
```bash
# Install Xcode command line tools
xcode-select --install

# Install Homebrew (if needed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Use Python from Homebrew
brew install python@3.11
```

#### Windows
```powershell
# Use Windows Subsystem for Linux (WSL) for best compatibility
wsl --install

# Or use Anaconda/Miniconda
# Download from: https://www.anaconda.com/products/individual
conda create -n ai-traffic python=3.11
conda activate ai-traffic
```

#### Linux (Ubuntu/Debian)
```bash
# Install system dependencies
sudo apt update
sudo apt install python3.11 python3.11-venv python3-pip
sudo apt install ffmpeg libsm6 libxext6 libfontconfig1 libxrender1

# For GPU support (optional)
sudo apt install nvidia-cuda-toolkit
```

### Performance Optimization

#### CPU Optimization
```bash
# Set CPU affinity (Linux)
taskset -c 0-7 uvicorn app.main:app --host 0.0.0.0 --port 8000

# Increase worker processes
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

#### Memory Optimization
```bash
# Limit PyTorch memory usage
export PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.0
export OMP_NUM_THREADS=4
```

#### GPU Support
```bash
# Install CUDA version of PyTorch
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118

# Verify GPU availability
python -c "import torch; print(torch.cuda.is_available())"
```

## ✅ Verification

### Backend Health Check
```bash
curl http://localhost:8000/health
# Should return JSON with status: "ok"
```

### Frontend Accessibility  
```bash
curl http://localhost:8080
# Should return HTML content
```

### End-to-End Test
```bash
# Test image detection
curl -X POST "http://localhost:8000/detect/image" \
  -F "file=@test_image.jpg"
# Should return detections JSON
```

### Performance Baseline
- **Model load time**: ~5-30 seconds (first run)
- **Image detection**: ~0.4-0.8 seconds per image
- **Memory usage**: ~2-4GB RAM
- **Disk usage**: ~1GB for models and cache

## 📊 Monitoring

### System Metrics
```bash
# Check backend logs
tail -f ml-gateway/logs/app.log

# Monitor system resources
htop
# or
docker stats
```

### Application Metrics
- Visit http://localhost:8000/metrics for real-time performance
- Use browser developer tools to monitor frontend performance
- Check console logs for JavaScript errors

You're now ready to use the AI Traffic Control system! 🚗✨
