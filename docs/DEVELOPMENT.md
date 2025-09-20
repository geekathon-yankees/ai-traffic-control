# Development Guide

## 🛠️ Development Setup

### Prerequisites
- **Python 3.11+** (3.13 compatible)
- **Git** for version control
- **Node.js 18+** (optional, for advanced frontend tooling)
- **Docker** (optional, for containerized development)

### Development Environment

#### Backend Development Setup
```bash
# Clone and navigate to project
git clone https://github.com/your-username/ai-traffic-control.git
cd ai-traffic-control/ml-gateway

# Create development virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies with development tools
pip install -r requirements.txt
pip install black isort flake8 mypy pytest pytest-asyncio httpx

# Install in editable mode
pip install -e .

# Start development server with hot reload
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### Frontend Development Setup
```bash
cd frontend

# Optional: Use live-server for auto-refresh
npm install -g live-server
live-server --port=8080 --host=localhost --open=/

# Or use Python's built-in server
python3 -m http.server 8080
```

#### Development with Docker
```bash
# Build development image
docker build -f Dockerfile.dev -t ai-traffic-dev .

# Run with volume mounts for hot reload
docker run -it \
  -p 8000:8000 \
  -v $(pwd):/app \
  -v /app/.venv \
  ai-traffic-dev
```

## 🏗️ Project Structure

```
ai-traffic-control/
├── docs/                          # Documentation
│   ├── README.md                  # Main documentation index
│   ├── ARCHITECTURE.md            # System architecture
│   ├── API.md                     # API reference
│   ├── SETUP.md                   # Installation guide
│   ├── FRONTEND.md                # Frontend guide
│   ├── CO2_CALCULATIONS.md        # Environmental methodology
│   └── DEVELOPMENT.md             # This file
├── ml-gateway/                    # Backend application
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py               # FastAPI application
│   │   ├── config.py             # Configuration management
│   │   ├── infer.py              # Model inference logic
│   │   ├── schemas.py            # Pydantic data models
│   │   └── video.py              # Video processing
│   ├── tests/                    # Backend tests
│   ├── requirements.txt          # Python dependencies
│   ├── .env.example              # Environment template
│   └── Dockerfile                # Container configuration
├── frontend/                     # Frontend application
│   ├── index.html                # Main HTML file
│   ├── script.js                 # JavaScript functionality
│   ├── styles.css                # CSS styling
│   └── README.md                 # Frontend documentation
└── README.md                     # Project overview
```

## 🧪 Testing

### Backend Testing

#### Unit Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_inference.py

# Run with verbose output
pytest -v -s
```

#### Test Structure
```python
# tests/test_inference.py
import pytest
from app.infer import Detector
import numpy as np

@pytest.fixture
def detector():
    return Detector()

@pytest.fixture
def sample_image():
    # Create a sample RGB image (300x300x3)
    return np.random.randint(0, 255, (300, 300, 3), dtype=np.uint8)

def test_detector_initialization(detector):
    assert detector is not None
    assert hasattr(detector, 'predict_image')

def test_image_prediction(detector, sample_image):
    result = detector.predict_image(sample_image)
    
    assert result.model is not None
    assert isinstance(result.detections, list)
    assert all(hasattr(det, 'bbox') for det in result.detections)
    assert all(hasattr(det, 'label') for det in result.detections)
    assert all(hasattr(det, 'score') for det in result.detections)

# tests/test_api.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_metrics_endpoint():
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "timestamp" in data
    assert "total_requests" in data
```

#### Integration Tests
```python
# tests/test_integration.py
def test_image_detection_flow():
    # Create test image
    with open("tests/fixtures/test_image.jpg", "rb") as f:
        response = client.post(
            "/detect/image",
            files={"file": ("test_image.jpg", f, "image/jpeg")}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "detections" in data
    assert "model" in data

def test_video_detection_flow():
    with open("tests/fixtures/test_video.mp4", "rb") as f:
        response = client.post(
            "/detect/video",
            files={"file": ("test_video.mp4", f, "video/mp4")}
        )
    
    assert response.status_code == 200
    data = response.json()
    assert "results" in data
    assert "total_frames" in data
```

### Frontend Testing

#### JavaScript Testing with Jest
```bash
# Install testing dependencies
npm install --save-dev jest jsdom

# Run tests
npm test
```

```javascript
// tests/frontend.test.js
/**
 * @jest-environment jsdom
 */

// Mock fetch API
global.fetch = jest.fn();

// Import functions (you might need to refactor script.js for this)
const { CO2_EMISSIONS, processDetectionResults } = require('../script.js');

describe('CO2 Calculations', () => {
    test('should calculate correct CO2 for car detection', () => {
        const detections = [
            { label: 'car', score: 0.9 },
            { label: 'car', score: 0.8 }
        ];
        
        const analytics = {
            totalCO2: 0,
            co2ByVehicleType: { car: 0 },
            entityCounts: { car: 0 }
        };
        
        processDetectionResults(detections);
        
        expect(analytics.totalCO2).toBe(0.24); // 2 cars * 0.12 kg/km
        expect(analytics.co2ByVehicleType.car).toBe(0.24);
    });
});

describe('Analytics Functions', () => {
    test('should update metrics correctly', () => {
        // Mock DOM elements
        document.body.innerHTML = `
            <span id="total-vehicles">0</span>
            <span id="total-pedestrians">0</span>
        `;
        
        analytics.totalVehicles = 5;
        analytics.totalPedestrians = 3;
        
        updateAnalyticsDashboard();
        
        expect(document.getElementById('total-vehicles').textContent).toBe('5');
        expect(document.getElementById('total-pedestrians').textContent).toBe('3');
    });
});
```

#### End-to-End Testing with Playwright
```bash
# Install Playwright
npm install --save-dev @playwright/test

# Run E2E tests
npx playwright test
```

```javascript
// tests/e2e/dashboard.spec.js
const { test, expect } = require('@playwright/test');

test('should upload and process image', async ({ page }) => {
    await page.goto('http://localhost:8080');
    
    // Upload image
    const fileInput = page.locator('#image-input');
    await fileInput.setInputFiles('tests/fixtures/test_image.jpg');
    
    // Wait for processing
    await expect(page.locator('#image-results')).toBeVisible();
    
    // Check results
    const detectionCount = await page.locator('.detection-item').count();
    expect(detectionCount).toBeGreaterThan(0);
});
```

## 🚀 Contributing

### Code Style

#### Python Code Style
```bash
# Format code with Black
black app/ tests/

# Sort imports with isort
isort app/ tests/

# Lint with flake8
flake8 app/ tests/

# Type checking with mypy
mypy app/
```

#### Configuration Files
```ini
# setup.cfg
[flake8]
max-line-length = 88
extend-ignore = E203, W503
exclude = .venv/

[tool:pytest]
testpaths = tests
python_files = test_*.py
addopts = -v --tb=short

[mypy]
python_version = 3.11
warn_return_any = True
warn_unused_configs = True
disallow_untyped_defs = True
```

```json
// .vscode/settings.json
{
    "python.defaultInterpreterPath": "./ml-gateway/.venv/bin/python",
    "python.formatting.provider": "black",
    "python.linting.flake8Enabled": true,
    "python.linting.mypyEnabled": true,
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.organizeImports": true
    }
}
```

#### JavaScript Code Style
```javascript
// Use ESLint configuration
module.exports = {
    env: {
        browser: true,
        es2021: true
    },
    extends: ['eslint:recommended'],
    rules: {
        'indent': ['error', 4],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always']
    }
};
```

### Git Workflow

#### Branch Strategy
```bash
# Create feature branch
git checkout -b feature/add-new-model-support

# Create bug fix branch
git checkout -b bugfix/fix-video-processing

# Create documentation branch
git checkout -b docs/update-api-documentation
```

#### Commit Message Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Examples**:
```bash
feat(inference): add YOLOv8 model support

- Implement YOLOv8 model loading from Hugging Face
- Add configuration options for confidence thresholds
- Update prediction pipeline for YOLO format
- Add unit tests for YOLO inference

Closes #123
```

```bash
fix(video): resolve memory leak in video processing

- Fix OpenCV VideoCapture not being properly released
- Add context manager for temporary file cleanup
- Improve error handling for invalid video URLs

Fixes #456
```

### Pull Request Process

1. **Create Feature Branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes**:
   - Write code following style guidelines
   - Add comprehensive tests
   - Update documentation

3. **Test Changes**:
   ```bash
   # Backend tests
   pytest --cov=app

   # Frontend tests (if applicable)
   npm test

   # Integration tests
   python scripts/test_integration.py
   ```

4. **Create Pull Request**:
   - Use clear title and description
   - Reference related issues
   - Include screenshots for UI changes
   - Ensure CI passes

5. **Review Process**:
   - Address reviewer feedback
   - Update documentation
   - Maintain clean commit history

## 🔧 Extending the System

### Adding New AI Models

#### 1. Create Model Interface
```python
# app/models/base.py
from abc import ABC, abstractmethod
from typing import List
import numpy as np
from app.schemas import Detection

class BaseModel(ABC):
    @abstractmethod
    def load_model(self) -> None:
        """Load the model from storage or download."""
        pass
    
    @abstractmethod
    def predict(self, image: np.ndarray) -> List[Detection]:
        """Run inference on image."""
        pass
    
    @abstractmethod
    def get_model_info(self) -> dict:
        """Return model metadata."""
        pass
```

#### 2. Implement New Model
```python
# app/models/yolov9.py
from app.models.base import BaseModel

class YOLOv9Model(BaseModel):
    def __init__(self, model_path: str):
        self.model_path = model_path
        self.model = None
    
    def load_model(self):
        from ultralytics import YOLO
        self.model = YOLO(self.model_path)
    
    def predict(self, image: np.ndarray) -> List[Detection]:
        results = self.model.predict(image)
        # Convert to Detection objects
        return self._convert_results(results)
    
    def get_model_info(self) -> dict:
        return {
            "name": "YOLOv9",
            "version": "1.0",
            "input_size": [640, 640],
            "classes": self.model.names
        }
```

#### 3. Register Model
```python
# app/infer.py
from app.models.yolov9 import YOLOv9Model

class Detector:
    def __init__(self):
        model_type = settings.model_kind.lower()
        
        if model_type == "yolov9":
            self.model = YOLOv9Model(settings.model_path)
        elif model_type == "detr":
            # existing DETR implementation
        # ... other models
        
        self.model.load_model()
```

### Adding New Vehicle Types

#### 1. Update CO2 Emissions Data
```javascript
// frontend/script.js
const CO2_EMISSIONS = {
    'car': 0.12,
    'truck': 0.85,
    'bus': 0.64,
    'motorcycle': 0.09,
    'electric_car': 0.05,    // New: Electric vehicles
    'hybrid_car': 0.08,      // New: Hybrid vehicles
    'electric_bus': 0.12,    // New: Electric bus
    'bicycle': 0.0,
    'person': 0.0
};
```

#### 2. Update Analytics Tracking
```javascript
function processDetectionResults(detections) {
    detections.forEach(detection => {
        const label = detection.label.toLowerCase();
        
        // Extended vehicle categorization
        if (['car', 'electric_car', 'hybrid_car', 'truck', 'bus', 'electric_bus', 'motorcycle'].includes(label)) {
            analytics.totalVehicles++;
        }
        
        // Track electric vs conventional
        if (['electric_car', 'electric_bus'].includes(label)) {
            analytics.electricVehicles++;
        }
        
        // ... rest of processing
    });
}
```

#### 3. Update Dashboard Display
```html
<!-- Add new metric cards -->
<div class="metric-card enhanced environmental">
    <div class="card-header">
        <div class="metric-icon electric-car">
            <i class="fas fa-bolt"></i>
        </div>
        <div class="metric-value">
            <h3 id="co2-electric">0g</h3>
            <span class="metric-label">Electric Vehicles CO₂/km</span>
        </div>
    </div>
</div>
```

### Custom Environmental Calculations

#### 1. Implement Custom Calculator
```python
# app/environmental.py
class EnvironmentalCalculator:
    def __init__(self, emission_factors: dict):
        self.emission_factors = emission_factors
    
    def calculate_emissions(self, detections: List[Detection]) -> dict:
        total_co2 = 0
        by_type = {}
        
        for detection in detections:
            vehicle_type = detection.label.lower()
            if vehicle_type in self.emission_factors:
                co2 = self.emission_factors[vehicle_type]
                total_co2 += co2
                by_type[vehicle_type] = by_type.get(vehicle_type, 0) + co2
        
        return {
            "total_co2": total_co2,
            "by_type": by_type,
            "green_percentage": self._calculate_green_percentage(detections)
        }
    
    def _calculate_green_percentage(self, detections: List[Detection]) -> float:
        total = len(detections)
        green = sum(1 for d in detections if d.label.lower() in ['bicycle', 'person'])
        return (green / total * 100) if total > 0 else 0
```

#### 2. Add API Endpoint
```python
# app/main.py
@app.post("/analyze/environmental", response_model=EnvironmentalAnalysis)
async def analyze_environmental_impact(
    file: UploadFile = File(...),
    calculator_type: str = "standard"
):
    # Process image
    detections = detector.predict_image(image)
    
    # Calculate environmental impact
    calculator = get_calculator(calculator_type)
    analysis = calculator.calculate_emissions(detections.detections)
    
    return EnvironmentalAnalysis(**analysis)
```

## 🐛 Debugging

### Backend Debugging

#### Enable Debug Logging
```python
# app/main.py
import logging

# Configure detailed logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('debug.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = time.time()
    logger.debug(f"Request: {request.method} {request.url}")
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    logger.debug(f"Response: {response.status_code} ({process_time:.3f}s)")
    
    return response
```

#### Model Debugging
```python
# app/infer.py
def predict_image(self, img_bgr: np.ndarray) -> ImageDetections:
    logger.debug(f"Input image shape: {img_bgr.shape}")
    
    # Convert BGR to RGB
    img_rgb = img_bgr[:, :, ::-1]
    logger.debug(f"Converted to RGB: {img_rgb.shape}")
    
    if self.backend == "detr":
        img_pil = Image.fromarray(img_rgb)
        logger.debug(f"PIL image size: {img_pil.size}")
        
        predictions = self.pipe(img_pil)
        logger.debug(f"Raw predictions: {len(predictions)} detections")
        
        # Log first few predictions
        for i, pred in enumerate(predictions[:3]):
            logger.debug(f"Detection {i}: {pred}")
```

### Frontend Debugging

#### Console Debugging
```javascript
// Enhanced console logging
const DEBUG = true;

function debugLog(message, data = null) {
    if (DEBUG) {
        console.log(`🐛 ${message}`, data ? data : '');
    }
}

async function handleImageUpload(input) {
    debugLog('Image upload started', { 
        fileName: input.files[0]?.name,
        fileSize: input.files[0]?.size 
    });
    
    try {
        const response = await fetch(`${API_BASE_URL}/detect/image`, {
            method: 'POST',
            body: formData
        });
        
        debugLog('API response received', { 
            status: response.status,
            ok: response.ok 
        });
        
    } catch (error) {
        debugLog('API error occurred', error);
    }
}
```

#### Performance Profiling
```javascript
// Performance monitoring
function measurePerformance(label, fn) {
    return async function(...args) {
        const start = performance.now();
        console.time(label);
        
        try {
            const result = await fn.apply(this, args);
            return result;
        } finally {
            const end = performance.now();
            console.timeEnd(label);
            console.log(`${label} took ${(end - start).toFixed(2)}ms`);
        }
    };
}

// Wrap functions for monitoring
const measuredHandleImageUpload = measurePerformance('Image Upload', handleImageUpload);
const measuredDrawBoundingBoxes = measurePerformance('Draw Bounding Boxes', drawBoundingBoxes);
```

## 📊 Performance Optimization

### Backend Optimization

#### Database Query Optimization (if using database)
```python
# Use connection pooling
from sqlalchemy.pool import StaticPool

engine = create_engine(
    DATABASE_URL,
    poolclass=StaticPool,
    pool_pre_ping=True,
    pool_recycle=300
)
```

#### Memory Management
```python
# app/infer.py
import gc
import torch

def predict_image(self, img_bgr: np.ndarray) -> ImageDetections:
    try:
        # Clear GPU cache before inference
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        # Run prediction
        result = self._run_inference(img_bgr)
        
        return result
    finally:
        # Force garbage collection
        gc.collect()
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
```

#### Async Optimization
```python
# app/main.py
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Create thread pool for CPU-intensive tasks
thread_pool = ThreadPoolExecutor(max_workers=4)

@app.post("/detect/image")
async def detect_image(file: UploadFile = File(...)):
    # Read file asynchronously
    data = await file.read()
    
    # Process image in thread pool
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(
        thread_pool,
        process_image_sync,
        data
    )
    
    return result
```

### Frontend Optimization

#### Lazy Loading
```javascript
// Lazy load heavy components
function loadChartLibrary() {
    if (window.Chart) {
        return Promise.resolve();
    }
    
    return new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
        script.onload = resolve;
        document.head.appendChild(script);
    });
}

async function initializeCharts() {
    await loadChartLibrary();
    // Initialize charts only when needed
    setupAnalyticsCharts();
}
```

#### Image Optimization
```javascript
// Optimize image uploads
function compressImage(file, maxWidth = 1920, quality = 0.8) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
            canvas.width = img.width * ratio;
            canvas.height = img.height * ratio;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };
        
        img.src = URL.createObjectURL(file);
    });
}
```

## 🔐 Security Considerations

### Backend Security
```python
# File validation
def validate_uploaded_file(file: UploadFile):
    # Check file size
    if file.size > 10 * 1024 * 1024:  # 10MB
        raise HTTPException(400, "File too large")
    
    # Check file type
    allowed_types = ['image/jpeg', 'image/png', 'video/mp4']
    if file.content_type not in allowed_types:
        raise HTTPException(400, "Invalid file type")
    
    # Verify file content matches extension
    magic_numbers = {
        b'\xff\xd8\xff': 'image/jpeg',
        b'\x89PNG': 'image/png',
        b'\x00\x00\x00\x20ftypmp4': 'video/mp4'
    }
    
    header = file.file.read(20)
    file.file.seek(0)
    
    for magic, expected_type in magic_numbers.items():
        if header.startswith(magic) and file.content_type == expected_type:
            return True
    
    raise HTTPException(400, "File content doesn't match declared type")
```

### Frontend Security
```javascript
// Sanitize user input
function sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// Validate API responses
function validateApiResponse(response) {
    const requiredFields = ['model', 'detections'];
    
    for (const field of requiredFields) {
        if (!(field in response)) {
            throw new Error(`Invalid API response: missing ${field}`);
        }
    }
    
    return response;
}
```

## 📦 Deployment

### Production Configuration
```python
# app/config.py
class ProductionSettings(Settings):
    debug: bool = False
    log_level: str = "INFO"
    cors_origins: List[str] = ["https://yourdomain.com"]
    max_workers: int = 4
    
    class Config:
        env_file = ".env.production"
```

### Docker Production
```dockerfile
# Dockerfile.prod
FROM python:3.11-slim

# Security: run as non-root user
RUN useradd --create-home --shell /bin/bash app
USER app
WORKDIR /home/app

# Install dependencies
COPY requirements.txt .
RUN pip install --user -r requirements.txt

# Copy application
COPY --chown=app:app . .

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### CI/CD Pipeline
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v3
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install -r ml-gateway/requirements.txt
        pip install pytest pytest-cov
    
    - name: Run tests
      run: |
        cd ml-gateway
        pytest --cov=app --cov-report=xml
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - name: Deploy to production
      run: |
        # Your deployment commands here
        echo "Deploying to production..."
```

Ready to contribute to the AI Traffic Control System! 🚀
