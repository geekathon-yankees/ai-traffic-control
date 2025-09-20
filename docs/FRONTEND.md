# Frontend Dashboard Guide

## 🎨 Overview

The AI Traffic Dashboard provides an intuitive, modern web interface for real-time traffic monitoring and environmental impact analysis. Built with pure HTML5, CSS3, and JavaScript, it offers a responsive, interactive experience for visualizing traffic data and CO2 emissions.

## 🏠 Dashboard Layout

### Navigation Bar
```html
<nav class="navbar">
    <div class="nav-container">
        <div class="nav-logo">
            <i class="fas fa-brain"></i>
            <span>AI Traffic Dashboard</span>
        </div>
        <div class="nav-links">
            <a href="#home">Home</a>
            <a href="#demo">Demo</a>
            <a href="#results">Results</a>
        </div>
    </div>
</nav>
```

**Features**:
- Smooth scrolling navigation
- Responsive design for mobile/desktop
- Modern gradient styling

### Main Sections

1. **Hero Section**: Introduction and key statistics
2. **Demo Section**: Image and video upload interfaces
3. **Analytics Section**: Real-time traffic analytics and CO2 tracking
4. **Results Section**: Detection visualization and data

## 📤 Upload Interface

### Image Upload
```javascript
// Drag and drop functionality
function setupDragAndDrop(elementId, handler) {
    const element = document.getElementById(elementId);
    
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.classList.add('drag-over');
    });
    
    element.addEventListener('dragleave', () => {
        element.classList.remove('drag-over');
    });
    
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.classList.remove('drag-over');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handler({ files });
        }
    });
}
```

**Supported Formats**:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- WebP (.webp)
- BMP (.bmp)

**File Validation**:
- Maximum size: 10MB
- Content type validation
- Real-time file size display

### Video Upload
```javascript
async function handleVideoUpload(input) {
    const file = input.files[0];
    
    // Validate video file
    if (!file.type.startsWith('video/')) {
        showNotification('Please select a valid video file', 'error');
        return;
    }
    
    showLoading('Processing video for object detection...');
    
    try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${API_BASE_URL}/detect/video`, {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        await displayVideoResults(file, result);
        
    } catch (error) {
        console.error('Error processing video:', error);
        showNotification('Error processing video. Please try again.', 'error');
    } finally {
        hideLoading();
    }
}
```

**Video Features**:
- File upload or URL input
- Progress indicators
- Frame-by-frame analysis
- Real-time detection overlay

## 📊 Analytics Dashboard

### Live Detection Metrics

The dashboard displays real-time metrics with animated counters and progress bars:

```javascript
// Enhanced metric cards with animations
function updateEnhancedDashboard() {
    // Primary metrics
    animateCounter('total-vehicles', analytics.totalVehicles);
    animateCounter('total-pedestrians', analytics.totalPedestrians);
    animateCounter('total-cyclists', analytics.totalCyclists);
    
    // Environmental metrics
    updateVehicleCO2Displays();
    updateEnvironmentalMetrics();
    
    // Performance metrics
    updatePerformanceMetrics();
}
```

#### Metric Cards Structure
```html
<div class="metric-card enhanced primary">
    <div class="card-header">
        <div class="metric-icon vehicles">
            <i class="fas fa-car"></i>
        </div>
        <div class="metric-value">
            <h3 id="total-vehicles">0</h3>
            <span class="metric-label">Total Vehicles</span>
        </div>
    </div>
    <div class="metric-footer">
        <div class="progress-container">
            <div class="progress-bar vehicles-progress"></div>
        </div>
        <span class="trend-indicator positive">+12% vs last hour</span>
    </div>
</div>
```

### Environmental Impact Tracking

#### CO2 Emissions by Vehicle Type
```javascript
function updateVehicleCO2Displays() {
    const vehicleTypes = ['car', 'truck', 'bus'];

    vehicleTypes.forEach(vehicleType => {
        const co2Element = document.getElementById(`co2-${vehicleType}`);
        const co2Value = analytics.co2ByVehicleType[vehicleType];
        const co2InGrams = (co2Value * 1000).toFixed(0);
        
        // Animated counter update
        co2Element.textContent = `${co2InGrams}g`;
        
        // Dynamic impact classification
        const impactLevel = classifyEnvironmentalImpact(co2Value);
        updateImpactIndicator(vehicleType, impactLevel);
    });
}
```

#### Environmental Metrics Card
```html
<div class="analytics-card">
    <h3>
        <i class="fas fa-leaf"></i>
        Environmental Impact
    </h3>
    <div class="environmental-metrics">
        <div class="env-item">
            <span class="env-label">Total CO₂ Emissions</span>
            <span class="env-value" id="env-co2-total">0g/km</span>
        </div>
        <div class="env-item">
            <span class="env-label">Green Transport %</span>
            <span class="env-value" id="green-transport-pct">0%</span>
        </div>
        <div class="env-item">
            <span class="env-label">Eco Score</span>
            <div class="eco-score-bar">
                <div class="eco-score-fill" id="eco-score-fill"></div>
            </div>
        </div>
        <div class="env-recommendation" id="env-recommendation">
            <i class="fas fa-lightbulb"></i>
            <span>Encourage cycling and walking to reduce emissions!</span>
        </div>
    </div>
</div>
```

## 🎥 Visual Detection System

### Enhanced Bounding Box Rendering

The dashboard features an advanced label positioning system that prevents overlaps and ensures optimal readability:

```javascript
function drawBoundingBoxes(ctx, detections, canvasWidth, canvasHeight, originalWidth, originalHeight) {
    const usedLabelPositions = [];
    
    detections.forEach((detection, index) => {
        // Smart positioning algorithm
        const labelPos = calculateOptimalLabelPosition(
            scaledBbox, 
            labelWidth, 
            labelHeight, 
            canvasWidth, 
            canvasHeight,
            usedLabelPositions
        );
        
        // Enhanced visual styling
        const gradient = ctx.createLinearGradient(0, labelPos.y - labelHeight, 0, labelPos.y);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColorBrightness(color, -0.2));
        
        // Corner accents for better visibility
        drawCornerAccents(ctx, scaledBbox, color);
        
        // Auto-contrast text
        ctx.fillStyle = getContrastColor(color);
        ctx.fillText(labelText, labelPos.x + labelPadding, labelPos.y - labelHeight / 2);
    });
}
```

### Video Detection Overlay

Real-time video detection with synchronized bounding boxes:

```javascript
function playVideoDetections() {
    const video = document.getElementById('preview-video');
    let canvas = document.getElementById('detection-overlay');
    
    // Create canvas overlay
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'detection-overlay';
        canvas.style.position = 'absolute';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '10';
        
        video.parentElement.appendChild(canvas);
    }
    
    // Synchronize with video playback
    const drawDetections = () => {
        const currentTime = video.currentTime;
        const closestFrame = findClosestDetectionFrame(currentTime);
        
        if (closestFrame) {
            drawFrameDetections(canvas.getContext('2d'), closestFrame);
        }
        
        if (!video.paused) {
            requestAnimationFrame(drawDetections);
        }
    };
    
    drawDetections();
}
```

## 📊 Performance Monitoring

### Real-Time Metrics
```javascript
async function updatePerformanceMetrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/metrics`);
        const metrics = await response.json();
        
        // Update performance displays
        document.getElementById('api-response-time').textContent = 
            `${metrics.avg_response_time_ms}ms`;
        document.getElementById('total-requests').textContent = 
            metrics.total_requests;
        document.getElementById('requests-per-min').textContent = 
            metrics.requests_per_minute.toFixed(1);
        document.getElementById('system-uptime').textContent = 
            formatUptime(metrics.uptime_seconds);
            
    } catch (error) {
        console.warn('Could not fetch performance metrics:', error);
    }
}
```

### Performance Card
```html
<div class="analytics-card">
    <h3>
        <i class="fas fa-tachometer-alt"></i>
        Performance Metrics
    </h3>
    <div class="performance-metrics">
        <div class="perf-item">
            <span class="perf-label">API Response Time</span>
            <span class="perf-value" id="api-response-time">-</span>
        </div>
        <div class="perf-item">
            <span class="perf-label">Total Requests</span>
            <span class="perf-value" id="total-requests">0</span>
        </div>
        <div class="perf-item">
            <span class="perf-label">System Uptime</span>
            <span class="perf-value" id="system-uptime">-</span>
        </div>
    </div>
</div>
```

## 💾 Data Management

### Local Storage Persistence
```javascript
function saveAnalyticsData() {
    try {
        localStorage.setItem('trafficAnalytics', JSON.stringify(analytics));
    } catch (error) {
        console.warn('⚠️ Could not save analytics data:', error);
    }
}

function loadPersistedData() {
    try {
        const saved = localStorage.getItem('trafficAnalytics');
        if (saved) {
            const data = JSON.parse(saved);
            Object.assign(analytics, data);
            console.log('📊 Loaded persisted analytics data');
        }
    } catch (error) {
        console.warn('⚠️ Could not load persisted data:', error);
    }
}
```

### Data Export Functionality
```javascript
function exportAnalytics() {
    const exportData = {
        timestamp: new Date().toISOString(),
        analytics: analytics,
        performance: {
            export_time: new Date().toISOString(),
            session_duration: Date.now() - performanceMonitor.sessionStart
        }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { 
        type: 'application/json' 
    });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `traffic-analytics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    showNotification('Analytics data exported successfully!', 'success');
}
```

## 🎨 Visual Design System

### Color Palette
```css
:root {
    /* Primary Colors */
    --primary-gradient: linear-gradient(135deg, #667eea, #764ba2);
    --secondary-gradient: linear-gradient(135deg, #f093fb, #f5576c);
    
    /* Vehicle Type Colors */
    --car-color: linear-gradient(135deg, #667eea, #764ba2);
    --truck-color: linear-gradient(135deg, #fd7e14, #e55100);
    --bus-color: linear-gradient(135deg, #ffc107, #ff8f00);
    
    /* Environmental Colors */
    --eco-green: #28a745;
    --warning-yellow: #ffc107;
    --danger-red: #dc3545;
    
    /* Background Colors */
    --bg-primary: #ffffff;
    --bg-secondary: #f8f9fa;
    --bg-dark: #1a1a1a;
}
```

### Animation System
```css
/* Counter Animation */
@keyframes countUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

/* Progress Bar Shimmer */
@keyframes shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

/* Card Hover Effects */
.metric-card:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 0 20px 60px rgba(102, 126, 234, 0.15);
}
```

### Responsive Breakpoints
```css
/* Desktop First Design */
@media (max-width: 1200px) {
    .primary-metrics-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

@media (max-width: 768px) {
    .primary-metrics-grid {
        grid-template-columns: 1fr;
    }
    
    .nav-links {
        flex-direction: column;
    }
}

@media (max-width: 480px) {
    .metric-card .card-header {
        flex-direction: column;
        align-items: flex-start;
    }
}
```

## 🔔 Notification System

### Smart Notifications
```javascript
function showNotification(message, type = 'info', duration = 5000) {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
        </div>
        <button class="notification-close">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add to notification container
    document.body.appendChild(notification);
    
    // Auto-remove after duration
    setTimeout(() => {
        notification.remove();
    }, duration);
}

// Environmental impact notifications
function processDetectionResults(detections) {
    // ... processing logic ...
    
    // Smart environmental notifications
    if (sessionCO2 > 0.5) {
        showNotification(
            `High CO₂ impact detected: ${(sessionCO2 * 1000).toFixed(0)}g CO₂/km`, 
            'warning'
        );
    } else if (sessionCO2 === 0 && detections.length > 0) {
        showNotification(
            'Eco-friendly traffic detected! 🌱 Zero emissions from pedestrians & cyclists', 
            'success'
        );
    }
}
```

## 📱 Mobile Optimization

### Touch-Friendly Interface
```css
/* Touch targets */
.upload-area {
    min-height: 120px;
    touch-action: manipulation;
}

/* Smooth scrolling */
html {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
}

/* Mobile navigation */
@media (max-width: 768px) {
    .nav-links a {
        padding: 1rem;
        display: block;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
}
```

### Mobile-Specific Features
```javascript
// Touch gesture support for video overlay
function setupTouchGestures() {
    let touchStartX = null;
    let touchStartY = null;
    
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    });
    
    canvas.addEventListener('touchend', (e) => {
        if (!touchStartX || !touchStartY) return;
        
        const touchEndX = e.changedTouches[0].clientX;
        const touchEndY = e.changedTouches[0].clientY;
        
        const deltaX = touchStartX - touchEndX;
        const deltaY = touchStartY - touchEndY;
        
        // Handle swipe gestures
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 50) {
                // Swipe left
                nextFrame();
            } else if (deltaX < -50) {
                // Swipe right
                previousFrame();
            }
        }
    });
}
```

## ⚡ Performance Optimizations

### Efficient DOM Updates
```javascript
// Batch DOM updates
function updateDashboardEfficiently() {
    // Use DocumentFragment for bulk updates
    const fragment = document.createDocumentFragment();
    
    // Batch all metric updates
    const updates = [
        { id: 'total-vehicles', value: analytics.totalVehicles },
        { id: 'total-pedestrians', value: analytics.totalPedestrians },
        { id: 'total-cyclists', value: analytics.totalCyclists }
    ];
    
    updates.forEach(update => {
        const element = document.getElementById(update.id);
        if (element) {
            element.textContent = update.value;
        }
    });
}
```

### Canvas Optimization
```javascript
// Optimize canvas rendering
function optimizeCanvasRendering(ctx) {
    // Use appropriate image scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Batch drawing operations
    ctx.save();
    
    // Group similar operations
    drawAllBoundingBoxes(ctx, detections);
    drawAllLabels(ctx, detections);
    
    ctx.restore();
}
```

## 🎯 User Experience Features

### Progressive Enhancement
```javascript
// Check for advanced features
if ('IntersectionObserver' in window) {
    // Use intersection observer for animations
    setupScrollAnimations();
} else {
    // Fallback to immediate display
    showAllElements();
}

// Feature detection for drag/drop
if ('FileReader' in window && 'File' in window && 'FileList' in window) {
    setupDragAndDrop();
} else {
    // Show file input only
    showFileInputOnly();
}
```

### Accessibility Features
```html
<!-- Semantic HTML -->
<main role="main">
    <section aria-label="Traffic Analysis Dashboard">
        <h2 id="analytics-title">Real-Time Traffic Analytics</h2>
        
        <div class="metric-card" role="region" aria-labelledby="vehicles-label">
            <h3 id="vehicles-label">Total Vehicles</h3>
            <span aria-live="polite" id="total-vehicles">0</span>
        </div>
    </section>
</main>
```

```css
/* High contrast mode support */
@media (prefers-contrast: high) {
    .metric-card {
        border: 2px solid currentColor;
        background: white;
        color: black;
    }
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
    * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
    }
}
```

## 🚀 Getting Started

### Quick Integration
1. Open `http://localhost:8080` in your browser
2. Ensure backend is running at `http://localhost:8000`
3. Upload an image or video file
4. View real-time analytics and environmental impact
5. Export data for further analysis

### Customization
- Modify `styles.css` for visual customization
- Update `script.js` for functionality changes  
- Edit `index.html` for layout modifications
- Configure API endpoints in `API_BASE_URL` constant

The frontend provides a complete, production-ready interface for traffic monitoring with environmental impact analysis, designed for both technical users and general audiences. 🚗✨
