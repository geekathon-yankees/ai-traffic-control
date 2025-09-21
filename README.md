# 🚦 AI Traffic Control Dashboard

## 🎯 The Problem & Solution

**Problem**: Municipal councils across Portugal, including cities like Leiria, face mounting pressure to address traffic congestion and its environmental impact. Traditional traffic monitoring systems lack real-time analysis capabilities and environmental impact awareness, leaving municipal authorities without the tools needed to make data-driven decisions. With increasing urbanization and stricter EU environmental regulations, câmaras municipais urgently need better tools to understand vehicle patterns, measure CO2 emissions, and take immediate action to reduce their environmental footprint for sustainable urban development.

**Solution**: An AI-powered traffic control system specifically designed to empower municipal councils with actionable environmental data. This system provides real-time vehicle detection, comprehensive traffic pattern analysis, and precise CO2 emission tracking, enabling câmaras municipais to make immediate data-driven decisions for environmental improvement. Using advanced computer vision models (DETR), the system analyzes images and videos to identify vehicles, calculate traffic density, and deliver concrete environmental impact assessments that support municipal climate action plans.

## 🌐 Live Demo

**Try it now**: [https://yankees.pt](https://yankees.pt)

Experience the AI traffic analysis in action with our live deployment! Upload your own traffic images or videos to see real-time object detection and environmental impact calculations.

## 🎬 Demo Video

### Watch the AI Traffic Control System in Action

[![AI Traffic Control Demo](https://img.youtube.com/vi/YOUR_VIDEO_ID/maxresdefault.jpg)](https://www.youtube.com/watch?v=YOUR_VIDEO_ID)

**What you'll see in the demo:**
- 🚗 **Real-time vehicle detection** - Cars, trucks, buses, motorcycles identified with precision
- 📊 **Live analytics dashboard** - Traffic density and environmental impact calculations  
- 🎯 **Bounding box visualization** - Clear object detection overlays on images and videos
- 📱 **Responsive design** - Beautiful interface working seamlessly across all devices
- 🌱 **CO2 emissions tracking** - Environmental impact analysis based on vehicle types
- ⚡ **Fast processing** - Near real-time analysis powered by DETR AI models

> **Note**: Replace `YOUR_VIDEO_ID` with your actual YouTube video ID once you upload the demo video.

---

A beautiful, modern web interface featuring real-time object detection visualization optimized for traffic analysis and environmental monitoring.

## ✨ Features

- **🖼️ Image Detection**: Upload images and see real-time object detection with bounding boxes
- **🎥 Video Analysis**: Process videos frame-by-frame with detection timeline
- **📊 Visual Analytics**: Beautiful charts and statistics
- **🎨 Modern UI**: Gradient backgrounds, smooth animations, and responsive design
- **⚡ Real-time Processing**: Live API integration with loading states
- **📱 Mobile Friendly**: Responsive design works on all devices

## 🚀 Quick Start

### Prerequisites
- ML Gateway API running on `http://localhost:8000`
- Modern web browser with JavaScript enabled

> **📋 For complete system setup**, see the [Setup Documentation](docs/SETUP.md)

### Running the Frontend

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

## 🧪 Testing

### Run Backend Tests
```bash
cd ml-gateway
source .venv/bin/activate  # or .venv\Scripts\activate on Windows
pytest
```

### End-to-End Testing
```bash
# Test the API endpoints
curl -X POST "http://localhost:8000/detect/image" \
  -F "file=@test_image.jpg"
```

### Frontend Testing
The frontend can be tested manually by:
1. Uploading sample images/videos through the web interface
2. Verifying API connectivity and response handling
3. Testing responsive design across different screen sizes

> **📋 For complete setup and testing instructions**, see the [Setup Documentation](docs/SETUP.md)

## 🎯 How to Use

For detailed usage instructions, please see the [documentation](docs/).

## 🛠️ Technical Details

For complete technical documentation, API integration details, and architecture information, please see the [documentation](docs/).

## 📋 File Structure
```
frontend/
├── index.html      # Main HTML structure
├── styles.css      # Beautiful modern styling
├── script.js       # Interactive functionality
└── README.md       # This documentation
```

---

**Ready to see AI in action!** 🤖✨