# 🚦 AI Traffic Control Dashboard

## 🎯 The Problem & Solution

**Problem**: Municipal councils across Portugal, including cities like Leiria, face mounting pressure to address traffic congestion and its environmental impact. Traditional traffic monitoring systems lack real-time analysis capabilities and environmental impact awareness, leaving municipal authorities without the tools needed to make data-driven decisions. With increasing urbanization and stricter EU environmental regulations, municipal councils urgently need better tools to understand vehicle patterns, measure CO2 emissions, and take immediate action to reduce their environmental footprint for sustainable urban development.

**Solution**: An AI-powered traffic control system specifically designed to empower municipal councils with actionable environmental data. This system provides real-time vehicle detection, comprehensive traffic pattern analysis, and estimated CO2 emission tracking, enabling municipal councils to make immediate data-driven decisions for environmental improvement. Using advanced computer vision models (DETR), the system analyzes images and videos to identify vehicles and to provid concrete environmental impact assessments that support municipal climate action plans.

## 🌐 Live Demo

**Try it now**: [https://yankees.pt](https://yankees.pt)

Experience the AI traffic analysis in action with our live deployment! Upload your own traffic images or videos to see real-time object detection and environmental impact calculations.

## 🎬 Demo Video

### Watch the AI Traffic Control System in Action

> **📹 Demo Video Coming Soon!** - Upload your demo video to YouTube and update this section.

**What the system demonstrates:**
- 🚗 **Real-time vehicle detection** - Cars, trucks, buses, motorcycles identified with precision
- 📊 **Live analytics dashboard** - Traffic density and environmental impact calculations  
- 🎯 **Bounding box visualization** - Clear object detection overlays on images and videos
- 📱 **Responsive design** - Beautiful interface working seamlessly across all devices
- 🌱 **CO2 emissions tracking** - Environmental impact analysis based on vehicle types
- ⚡ **Fast processing** - Near real-time analysis powered by DETR AI models

---

A beautiful, modern web interface featuring real-time object detection visualization optimized for traffic analysis and environmental monitoring.

## 🏗️ Architecture Overview

The AI Traffic Control System follows a **three-tier architecture** designed for scalability, maintainability, and real-time performance:

- **Frontend Layer** (Port 8080): HTML5 dashboard with JavaScript analytics and Chart.js visualizations
- **Backend Layer** (Port 8000): FastAPI server with CORS middleware and request validation  
- **AI/ML Layer**: DETR (Detection Transformer) model with Hugging Face integration

## ✨ Features

- **🖼️ Image Detection**: Upload images and see real-time object detection with bounding boxes
- **🎥 Video Analysis**: Process videos frame-by-frame with detection timeline
- **📊 Visual Analytics**: Beautiful charts and statistics with environmental impact tracking
- **🎨 Modern UI**: Gradient backgrounds, smooth animations, and responsive design
- **⚡ Real-time Processing**: Live API integration with loading states
- **📱 Mobile Friendly**: Responsive design works on all devices
- **🤖 DETR AI Model**: Uses Facebook's Detection Transformer for accurate object detection
- **🐳 Docker Support**: Containerized deployment for easy scaling

## 🚀 Quick Start

### Prerequisites
- **Python 3.11+** (recommended for best compatibility)
- **Git** for cloning the repository
- **10GB+ free disk space** for AI models and dependencies
- **8GB+ RAM** recommended for optimal performance
- **Modern web browser** with JavaScript enabled

> **📋 For complete system setup**, see the [Setup Documentation](docs/SETUP.md)

### 1. Clone Repository
```bash
git clone https://github.com/your-username/ai-traffic-control.git
cd ai-traffic-control
```

### 2. Setup ML Gateway (Backend)
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

# Configure environment (optional)
cp .env.example .env

# Start the API server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Setup Frontend
In a new terminal:

1. **Option 1: Python HTTP Server**
   ```bash
   cd frontend
   python3 -m http.server 8080
   ```
   Open: http://localhost:8080

2. **Option 2: Node.js HTTP Server**
   ```bash
   cd frontend
   npx serve .
   ```

3. **Option 3: Live Server (VS Code Extension)**
   - Install "Live Server" extension
   - Right-click `index.html` → "Open with Live Server"

### 4. Docker Deployment (Alternative)
```bash
# Build and run the ML Gateway with Docker
cd ml-gateway
docker build -t ai-traffic-ml-gateway .
docker run -p 8000:8000 --env-file .env.example ai-traffic-ml-gateway
```

## 🧪 Testing

### 1. Health Check
```bash
# Verify the API is running
curl http://localhost:8000/health
```

### 2. Backend API Testing
```bash
# Test image detection
curl -X POST "http://localhost:8000/detect/image" \
  -F "file=@test_image.jpg"

# Test video processing
curl -X POST "http://localhost:8000/detect/video" \
  -F "file=@traffic_scene.jpg"
```

### 3. Frontend Testing
1. Open http://localhost:8080 in your browser
2. Upload the provided `test_image.jpg` or `traffic_scene.jpg`
3. Verify object detection results and analytics display
4. Test responsive design on different screen sizes

### 4. Run Backend Unit Tests (if available)
```bash
cd ml-gateway
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pytest
```

> **📋 For complete setup and testing instructions**, see the [Setup Documentation](docs/SETUP.md)

## 🎯 How to Use

1. **Start the system**: Follow the Quick Start guide above
2. **Access the dashboard**: Open http://localhost:8080
3. **Upload content**: Drag and drop images or videos for analysis
4. **View results**: See real-time object detection with bounding boxes
5. **Analyze data**: Review traffic statistics and environmental impact

For detailed usage instructions, please see the [documentation](docs/).

## ⚙️ Configuration

### Environment Variables (ML Gateway)
| Variable | Default | Description |
|----------|---------|-------------|
| `CONF_THRESHOLD` | `0.25` | Detection confidence threshold |
| `VIDEO_FPS_SAMPLE` | `2` | Video sampling rate (FPS) |
| `VIDEO_MAX_FRAMES` | `120` | Max frames per video |
| `PORT` | `8000` | API server port |
| `HF_TOKEN` | | Hugging Face token (optional) |

## 🛠️ Technical Details

**AI Model**: Facebook's DETR (Detection Transformer) via Hugging Face  
**Backend**: FastAPI with async processing and CORS support  
**Frontend**: Vanilla JavaScript with Chart.js for analytics  
**Processing**: OpenCV for video handling, real-time frame analysis  

For complete technical documentation, API integration details, and architecture information, please see the [documentation](docs/).

## 🔌 API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Image Detection
```bash
curl -X POST "http://localhost:8000/detect/image" \
  -F "file=@test_image.jpg"
```

### Video Detection
```bash
# Upload video file
curl -X POST "http://localhost:8000/detect/video" \
  -F "file=@sample.mp4"

# Process video from URL
curl -X POST "http://localhost:8000/detect/video?source_url=https://example.com/video.mp4"
```

## 📋 Project Structure
```
ai-traffic-control/
├── frontend/
│   ├── index.html      # Main HTML dashboard
│   ├── styles.css      # Modern CSS styling
│   ├── script.js       # Interactive functionality
│   └── README.md       # Frontend documentation
├── ml-gateway/
│   ├── app/
│   │   ├── main.py     # FastAPI application
│   │   ├── infer.py    # AI model inference
│   │   ├── video.py    # Video processing
│   │   ├── schemas.py  # Data models
│   │   └── config.py   # Configuration
│   ├── requirements.txt # Python dependencies
│   ├── Dockerfile      # Container definition
│   └── .env.example    # Environment template
├── docs/
│   ├── SETUP.md        # Complete setup guide
│   ├── ARCHITECTURE.md # System architecture
│   └── API.md          # API documentation
└── README.md           # This file
```

---

**Ready to see AI in action!** 🤖✨