# AI Traffic Control System Documentation

## 📚 Documentation Overview

Welcome to the AI Traffic Control System - a comprehensive solution for real-time traffic monitoring with environmental impact analysis.

## 📖 Documentation Structure

- **[Architecture Overview](docs/ARCHITECTURE.md)** - System design and components
- **[API Reference](docs/API.md)** - Backend endpoints and schemas
- **[Setup Guide](docs/SETUP.md)** - Installation and configuration
- **[Frontend Guide](docs/FRONTEND.md)** - Dashboard features and usage
- **[CO2 Calculations](docs/CO2_CALCULATIONS.md)** - Environmental impact methodology
- **[Development Guide](docs/DEVELOPMENT.md)** - Contributing and extending the system

## 🚀 Quick Start

1. **Backend Setup**:
   ```bash
   cd ml-gateway
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app.main:app --host 0.0.0.0 --port 8000
   ```

2. **Frontend Setup**:
   ```bash
   cd frontend
   python3 -m http.server 8080
   ```

3. **Access the Dashboard**:
   - Frontend: http://localhost:8080
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

## 🎯 Key Features

- **Real-time Object Detection** - DETR/YOLOv8 model support
- **Environmental Impact Tracking** - CO2 emissions by vehicle type
- **Video & Image Analysis** - Comprehensive traffic monitoring
- **Interactive Dashboard** - Modern web interface with analytics
- **Performance Monitoring** - Real-time system metrics
- **Export Capabilities** - JSON data export for analysis

## 🏗️ System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   FastAPI       │    │   AI Models     │
│   Dashboard     │◄──►│   Backend       │◄──►│   DETR/YOLO     │
│   (Port 8080)   │    │   (Port 8000)   │    │   Hugging Face  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📊 Environmental Impact

The system calculates real-time CO2 emissions based on detected vehicle types:

- **Cars**: 120g CO2/km
- **Trucks**: 850g CO2/km
- **Buses**: 640g CO2/km
- **Motorcycles**: 90g CO2/km
- **Bicycles/Pedestrians**: 0g CO2/km (eco-friendly! 🌱)

## 🛠️ Technology Stack

**Backend**: FastAPI, PyTorch, Transformers, OpenCV, Pydantic
**Frontend**: HTML5, CSS3, JavaScript (ES6+), Chart.js
**AI Models**: DETR (facebook/detr-resnet-50), YOLOv8 (Ultralytics)
**Infrastructure**: Python 3.11+, Virtual environments, HTTP servers


**Last Updated**: September 2025
**Version**: 1.0.0
