# 🎨 AI Traffic Dashboard

A beautiful, modern web interface for the ML Gateway API featuring real-time object detection visualization optimized for traffic analysis.

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

## 🎯 How to Use

1. **Start ML Gateway API**: Make sure your FastAPI backend is running
2. **Open Frontend**: Navigate to the frontend URL
3. **Upload Media**: 
   - Click "Image Detection" tab and upload an image
   - Or click "Video Detection" tab and upload a video
4. **View Results**: See beautiful visualizations with bounding boxes and analytics

## 🛠️ Technical Details

### API Integration
- Connects to ML Gateway at `http://localhost:8000`
- Uses `/detect/image` and `/detect/video` endpoints
- Automatic health checks and error handling

### Visualization Features
- **Canvas-based rendering** for precise bounding box overlays
- **Color-coded detections** with unique colors per object type
- **Animated statistics** and smooth transitions
- **Progress indicators** during processing

### File Support
- **Images**: JPG, PNG, GIF (up to 10MB)
- **Videos**: MP4, AVI, MOV (up to 50MB)
- **Drag & drop** support for easy uploads

## 🎨 Design Features

- **Modern gradients** and glass-morphism effects
- **Smooth animations** and micro-interactions
- **Responsive layout** adapting to all screen sizes
- **Professional typography** using Inter font
- **Accessible design** with proper contrast and focus states

## 🔧 Customization

### Changing API URL
Edit the `API_BASE_URL` in `script.js`:
```javascript
const API_BASE_URL = 'http://your-api-url:8000';
```

### Adding New Object Types
The frontend automatically handles new object types from the API with unique colors.

### Styling
Modify `styles.css` to customize:
- Colors and gradients
- Animation timings
- Layout and spacing
- Typography

## 📋 File Structure
```
frontend/
├── index.html      # Main HTML structure
├── styles.css      # Beautiful modern styling
├── script.js       # Interactive functionality
└── README.md       # This documentation
```

## 🌟 Features Showcase

- **Hero Section**: Animated statistics and floating elements
- **Upload Areas**: Drag & drop with visual feedback  
- **Results Display**: Canvas-based bounding box visualization
- **Video Timeline**: Frame-by-frame detection analysis
- **Loading States**: Smooth progress animations
- **Notifications**: Toast-style feedback messages
- **Mobile Ready**: Responsive design for all devices

## 🚀 Perfect for Showcasing

This frontend is designed to beautifully showcase your ML Gateway API:
- **Impressive visuals** for presentations and demos
- **Real-time processing** shows AI capabilities
- **Professional design** suitable for production use
- **Interactive experience** engages users effectively

---

**Ready to see AI in action!** 🤖✨
