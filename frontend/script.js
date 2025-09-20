// AI Traffic Dashboard JavaScript
const API_BASE_URL = 'http://localhost:8000';

// Global variables
let currentVideoData = null;
let detectionColors = {};
let colorIndex = 0;
const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471', '#82E0AA'
];

// Enhanced analytics tracking with CO2 emissions by vehicle type
let analytics = {
    totalVehicles: 0,
    totalPedestrians: 0,
    totalCyclists: 0,
    totalDetections: 0,
    accuracyRate: 95.2,
    totalCO2: 0, // Total CO2 emissions in kg/km
    co2ByVehicleType: {
        'car': 0,
        'truck': 0, 
        'bus': 0,
        'motorcycle': 0
    },
    recentDetections: [],
    entityCounts: {
        'car': 0, 'truck': 0, 'bus': 0, 'motorcycle': 0,
        'person': 0, 'bicycle': 0, 'traffic light': 0, 'stop sign': 0
    }
};

// CO2 emission factors (kg CO2/km per vehicle type)
const CO2_EMISSIONS = {
    'car': 0.12,        // Average car: 120g CO2/km
    'truck': 0.85,      // Heavy truck: 850g CO2/km  
    'bus': 0.64,        // City bus: 640g CO2/km
    'motorcycle': 0.09,  // Motorcycle: 90g CO2/km
    'van': 0.18,        // Van: 180g CO2/km
    'bicycle': 0.0,     // Bicycle: 0g CO2/km (eco-friendly!)
    'person': 0.0       // Pedestrian: 0g CO2/km (walking is green!)
};

// Chart instances removed

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadPersistedData();
    startPerformanceMonitoring();
    animateStats();
});

// Duplicate function removed - using enhanced version below

function setupEventListeners() {
    // Image input change
    document.getElementById('image-input').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleImageUpload(e.target);
        }
    });
    
    // Video input change
    document.getElementById('video-input').addEventListener('change', (e) => {
        if (e.target.files[0]) {
            handleVideoUpload(e.target);
        }
    });
    
    // Play detections button
    document.getElementById('play-detections').addEventListener('click', playVideoDetections);
    
    // Reset analytics button
    document.getElementById('reset-analytics').addEventListener('click', resetAnalytics);
    
    // Export analytics button
    document.getElementById('export-analytics').addEventListener('click', exportAnalytics);
}

function setupDragAndDrop(elementId, handler) {
    const element = document.getElementById(elementId);
    
    element.addEventListener('dragover', (e) => {
        e.preventDefault();
        element.style.borderColor = '#667eea';
        element.style.background = '#f0f4ff';
    });
    
    element.addEventListener('dragleave', (e) => {
        e.preventDefault();
        element.style.borderColor = '#ccc';
        element.style.background = '#f9f9f9';
    });
    
    element.addEventListener('drop', (e) => {
        e.preventDefault();
        element.style.borderColor = '#ccc';
        element.style.background = '#f9f9f9';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const input = elementId === 'image-upload' ? 
                document.getElementById('image-input') : 
                document.getElementById('video-input');
            
            // Create a new FileList-like object
            input.files = files;
            handler(input);
        }
    });
}

// Tab switching functionality
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Hide any existing results
    document.getElementById('image-results').style.display = 'none';
    document.getElementById('video-results').style.display = 'none';
}

// Image Upload Handler
async function handleImageUpload(input) {
    console.log('🖼️ handleImageUpload called:', { input: input.constructor.name, files: input.files?.length });
    
    const file = input.files[0];
    if (!file) {
        console.warn('❌ No file selected');
        return;
    }
    
    console.log('📁 File info:', { 
        name: file.name, 
        type: file.type, 
        size: file.size,
        lastModified: file.lastModified
    });
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        console.error('❌ Invalid file type:', file.type);
        showNotification('Please select a valid image file', 'error');
        return;
    }
    
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
        console.error('❌ File too large:', file.size);
        showNotification('Image size must be less than 10MB', 'error');
        return;
    }
    
    console.log('🚀 Starting image analysis...');
    showLoading('Analyzing image for objects...');
    
    try {
        const startTime = performance.now();
        
        // Create FormData for API call
        const formData = new FormData();
        formData.append('file', file);
        
        console.log('🌐 Making API call to:', `${API_BASE_URL}/detect/image`);
        
        // Call ML Gateway API
        const response = await fetch(`${API_BASE_URL}/detect/image`, {
            method: 'POST',
            body: formData
        });
        
        console.log('📡 API Response:', { 
            status: response.status, 
            statusText: response.statusText,
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ API Error:', { status: response.status, body: errorText });
            throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }
        
        const result = await response.json();
        const processingTime = Math.round(performance.now() - startTime);
        
        console.log('✅ API Success:', { 
            processingTime: `${processingTime}ms`,
            detections: result.detections?.length || 0,
            model: result.model 
        });
        
        // Process detection results with enhanced analytics
        processDetectionResults(result.detections);
        
        // Display results
        await displayImageResults(file, result);
        
        hideLoading();
        showNotification(`Detected ${result.detections.length} objects in ${processingTime}ms!`, 'success');
        
    } catch (error) {
        console.error('Error processing image:', error);
        hideLoading();
        showNotification('Error processing image. Please make sure the ML Gateway is running.', 'error');
    }
}

// Video Upload Handler
async function handleVideoUpload(input) {
    const file = input.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('video/')) {
        showNotification('Please select a valid video file', 'error');
        return;
    }
    
    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
        showNotification('Video size must be less than 50MB', 'error');
        return;
    }
    
    showLoading('Processing video frames...');
    
    try {
        const startTime = performance.now();
        
        // Create FormData for API call
        const formData = new FormData();
        formData.append('file', file);
        
        // Call ML Gateway API
        const response = await fetch(`${API_BASE_URL}/detect/video`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        const processingTime = Math.round(performance.now() - startTime);
        
        // Process all detections from video frames with enhanced analytics
        result.results.forEach(frame => {
            processDetectionResults(frame.detections, true);
        });
        
        // Store for later use
        currentVideoData = result;
        
        // Display results
        await displayVideoResults(file, result);
        
        const totalDetections = result.results.reduce((sum, frame) => sum + frame.detections.length, 0);
        hideLoading();
        showNotification(`Processed ${result.processed_frames} frames with ${totalDetections} total detections!`, 'success');
        
    } catch (error) {
        console.error('Error processing video:', error);
        hideLoading();
        showNotification('Error processing video. Please make sure the ML Gateway is running.', 'error');
    }
}

// Display Image Results
async function displayImageResults(file, result) {
    const canvas = document.getElementById('image-canvas');
    const ctx = canvas.getContext('2d');
    const previewImg = document.getElementById('preview-image');
    
    console.log('📸 Displaying image results:', {
        file: file.name,
        fileSize: file.size,
        detections: result.detections.length,
        canvas: !!canvas,
        ctx: !!ctx,
        previewImg: !!previewImg
    });
    
    if (!canvas || !ctx || !previewImg) {
        console.error('❌ Missing required elements for image display');
        showNotification('Error: Missing display elements. Please refresh the page.', 'error');
        return;
    }
    
    return new Promise((resolve, reject) => {
        previewImg.onload = () => {
            try {
                // Set canvas dimensions to match image
                const maxWidth = 800;
                const maxHeight = 600;
                let { width, height } = previewImg;
                
                // Scale down large images for better display
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                console.log('🖼️ Canvas dimensions:', { width, height, original: { w: previewImg.naturalWidth, h: previewImg.naturalHeight } });
                
                // Clear canvas and draw the image
                ctx.clearRect(0, 0, width, height);
                ctx.drawImage(previewImg, 0, 0, width, height);
                
                // Draw bounding boxes
                drawBoundingBoxes(ctx, result.detections, width, height, previewImg.naturalWidth, previewImg.naturalHeight);
                
                // Display detection list
                displayDetectionList(result.detections, 'image-detections');
                
                // Display JSON response
                const jsonElement = document.getElementById('image-json');
                if (jsonElement) {
                    jsonElement.textContent = JSON.stringify(result, null, 2);
                }
                
                // Show results container
                const resultsContainer = document.getElementById('image-results');
                if (resultsContainer) {
                    resultsContainer.style.display = 'block';
                    resultsContainer.scrollIntoView({ behavior: 'smooth' });
                }
                
                console.log('✅ Image display completed successfully');
                resolve();
            } catch (error) {
                console.error('❌ Error in image display:', error);
                showNotification('Error displaying image results', 'error');
                reject(error);
            }
        };
        
        previewImg.onerror = (error) => {
            console.error('❌ Error loading preview image:', error);
            showNotification('Error loading image preview', 'error');
            reject(error);
        };
        
        try {
            previewImg.src = URL.createObjectURL(file);
        } catch (error) {
            console.error('❌ Error creating object URL:', error);
            showNotification('Error processing uploaded file', 'error');
            reject(error);
        }
    });
}

// Display Video Results
async function displayVideoResults(file, result) {
    const video = document.getElementById('preview-video');
    video.src = URL.createObjectURL(file);
    
    // Display video statistics
    displayVideoStats(result);
    
    // Display detection timeline
    displayVideoTimeline(result);
    
    // Display JSON response
    document.getElementById('video-json').textContent = JSON.stringify(result, null, 2);
    
    // Show results container
    document.getElementById('video-results').style.display = 'block';
    document.getElementById('video-results').scrollIntoView({ behavior: 'smooth' });
}

// Draw Bounding Boxes
function drawBoundingBoxes(ctx, detections, canvasWidth, canvasHeight, originalWidth, originalHeight) {
    if (!detections || detections.length === 0) {
        console.log('🔍 No detections to draw');
        return;
    }
    
    // Calculate scaling factors
    const scaleX = originalWidth ? canvasWidth / originalWidth : 1;
    const scaleY = originalHeight ? canvasHeight / originalHeight : 1;
    
    console.log('📏 Drawing bounding boxes:', {
        detections: detections.length,
        canvasSize: { width: canvasWidth, height: canvasHeight },
        originalSize: { width: originalWidth, height: originalHeight },
        scales: { x: scaleX, y: scaleY }
    });
    
    detections.forEach((detection, index) => {
        const { bbox, label, score } = detection;
        
        if (!bbox) {
            console.warn('⚠️ Detection missing bbox:', detection);
            return;
        }
        
        // Get or assign color for this label
        if (!detectionColors[label]) {
            detectionColors[label] = colors[colorIndex % colors.length];
            colorIndex++;
        }
        const color = detectionColors[label];
        
        // Scale bounding box coordinates
        const scaledBbox = {
            x1: bbox.x1 * scaleX,
            y1: bbox.y1 * scaleY,
            x2: bbox.x2 * scaleX,
            y2: bbox.y2 * scaleY
        };
        
        // Set drawing style
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.font = 'bold 14px Inter';
        
        // Draw bounding box
        const width = scaledBbox.x2 - scaledBbox.x1;
        const height = scaledBbox.y2 - scaledBbox.y1;
        ctx.strokeRect(scaledBbox.x1, scaledBbox.y1, width, height);
        
        // Draw label background
        const labelText = `${label} ${Math.round((score || 0) * 100)}%`;
        const metrics = ctx.measureText(labelText);
        const labelPadding = 6;
        const labelHeight = 20;
        
        // Ensure label stays within canvas bounds
        const labelY = Math.max(labelHeight + labelPadding, scaledBbox.y1);
        
        ctx.fillRect(
            scaledBbox.x1, 
            labelY - labelHeight - labelPadding,
            metrics.width + labelPadding * 2,
            labelHeight + labelPadding
        );
        
        // Draw label text
        ctx.fillStyle = 'white';
        ctx.fillText(
            labelText, 
            scaledBbox.x1 + labelPadding, 
            labelY - labelPadding
        );
        
        console.log('🎯 Drew detection:', {
            label,
            score: Math.round((score || 0) * 100),
            originalBbox: bbox,
            scaledBbox,
            color
        });
    });
}

// Display Detection List
function displayDetectionList(detections, containerId) {
    const container = document.getElementById(containerId);
    
    if (detections.length === 0) {
        container.innerHTML = '<div class="detection-item">No objects detected</div>';
        return;
    }
    
    container.innerHTML = detections.map((detection, index) => {
        const color = detectionColors[detection.label] || colors[index % colors.length];
        return `
            <div class="detection-item" style="border-left-color: ${color}">
                <div class="detection-label">${detection.label}</div>
                <div class="detection-confidence">Confidence: ${Math.round(detection.score * 100)}%</div>
            </div>
        `;
    }).join('');
}

// Display Video Statistics
function displayVideoStats(result) {
    const container = document.getElementById('video-stats');
    
    const totalDetections = result.results.reduce((sum, frame) => sum + frame.detections.length, 0);
    const uniqueLabels = Object.keys(result.counts_by_label).length;
    
    container.innerHTML = `
        <div class="video-stat-item">
            <div class="video-stat-number">${result.processed_frames}</div>
            <div class="video-stat-label">Frames Processed</div>
        </div>
        <div class="video-stat-item">
            <div class="video-stat-number">${totalDetections}</div>
            <div class="video-stat-label">Total Detections</div>
        </div>
        <div class="video-stat-item">
            <div class="video-stat-number">${uniqueLabels}</div>
            <div class="video-stat-label">Object Types</div>
        </div>
        <div class="video-stat-item">
            <div class="video-stat-number">${result.fps_sample}</div>
            <div class="video-stat-label">FPS Sample Rate</div>
        </div>
    `;
}

// Display Video Timeline
function displayVideoTimeline(result) {
    const container = document.getElementById('video-detections');
    
    container.innerHTML = result.results.slice(0, 10).map(frame => {
        const time = formatTime(frame.time_sec);
        const objectCount = frame.detections.length;
        const objects = frame.detections.map(d => d.label).join(', ') || 'No objects';
        
        return `
            <div class="timeline-frame">
                <div class="timeline-time">Frame ${frame.frame_index} (${time})</div>
                <div class="timeline-objects">${objectCount} objects: ${objects}</div>
            </div>
        `;
    }).join('') + (result.results.length > 10 ? 
        `<div class="timeline-frame" style="text-align: center; color: #666;">
            ... and ${result.results.length - 10} more frames
        </div>` : '');
}

// Play Video Detections (placeholder for future enhancement)
function playVideoDetections() {
    if (!currentVideoData) {
        showNotification('No video data available', 'error');
        return;
    }
    
    showNotification('Video detection playback feature coming soon!', 'info');
}

// Utility Functions
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function showLoading(text = 'Processing...') {
    document.getElementById('loading-text').textContent = text;
    document.getElementById('loading-overlay').style.display = 'flex';
    
    // Animate progress bar
    const progressFill = document.querySelector('.progress-fill');
    progressFill.style.animation = 'none';
    setTimeout(() => {
        progressFill.style.animation = 'progressFill 3s ease-in-out';
    }, 100);
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Style based on type
    const colors = {
        success: '#10B981',
        error: '#EF4444',
        info: '#3B82F6'
    };
    
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${colors[type]};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        z-index: 3000;
        transform: translateX(400px);
        transition: transform 0.3s ease;
        max-width: 300px;
        font-weight: 500;
    `;
    
    // Animate in
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.style.transform = 'translateX(400px)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

function updateStats() {
    document.getElementById('detected-vehicles').textContent = stats.totalDetected;
    document.getElementById('processing-time').textContent = `${stats.processingTime}ms`;
}

function animateStats() {
    // Animate the statistics numbers on page load
    const animateNumber = (element, target, duration = 2000) => {
        const start = 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (target - start) * progress);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    };
    
    // Initial animation for demo purposes
    setTimeout(() => {
        const vehicleElement = document.getElementById('detected-vehicles');
        animateNumber(vehicleElement, 1247);
    }, 1000);
}

// API Health Check
async function checkAPIHealth() {
    try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
            console.log('✅ ML Gateway API is running');
            return true;
        }
    } catch (error) {
        console.warn('⚠️ ML Gateway API not available. Make sure to start the backend first.');
        return false;
    }
}

// Check API on load
checkAPIHealth();

// Enhanced Analytics Functions


// Initialize charts removed
function initializeCharts() {
    updateAnalyticsDashboard();
}




function updateAnalyticsDashboard() {
    // Update metric cards
    document.getElementById('total-vehicles').textContent = analytics.totalVehicles;
    document.getElementById('total-pedestrians').textContent = analytics.totalPedestrians;
    document.getElementById('total-cyclists').textContent = analytics.totalCyclists;
    document.getElementById('accuracy-rate').textContent = `${analytics.accuracyRate.toFixed(1)}%`;
    
    // Update CO2 metrics by vehicle type
    updateVehicleCO2Displays();
    
    // Update environmental metrics
    updateEnvironmentalMetrics();
    
    // Update recent detections
    updateRecentDetections();
}

function updateVehicleCO2Displays() {
    // Update individual vehicle CO2 displays
    const vehicleTypes = ['car', 'truck', 'bus'];
    
    vehicleTypes.forEach(vehicleType => {
        const co2Element = document.getElementById(`co2-${vehicleType}`);
        const trendElement = document.getElementById(`co2-${vehicleType}-trend`);
        
        if (co2Element) {
            const co2Value = analytics.co2ByVehicleType[vehicleType];
            const co2InGrams = (co2Value * 1000).toFixed(0);
            co2Element.textContent = `${co2InGrams}g`;
            
            // Update trend color and message based on emissions level
            if (trendElement) {
                const vehicleCount = analytics.entityCounts[vehicleType];
                const emissionRate = CO2_EMISSIONS[vehicleType] * 1000; // Convert to grams
                
                if (vehicleCount === 0) {
                    trendElement.textContent = `${emissionRate}g per ${vehicleType}`;
                    trendElement.style.color = '#6c757d'; // Gray for no detections
                } else if (co2Value < 0.1) {
                    trendElement.textContent = `🌱 Low impact (${vehicleCount} detected)`;
                    trendElement.style.color = '#28a745';
                } else if (co2Value < 0.5) {
                    trendElement.textContent = `🟡 Moderate (${vehicleCount} detected)`;
                    trendElement.style.color = '#ffc107';
                } else {
                    trendElement.textContent = `🔴 High impact (${vehicleCount} detected)`;
                    trendElement.style.color = '#dc3545';
                }
            }
        }
    });
}

function updateEnvironmentalMetrics() {
    // Calculate green transport percentage
    const totalTransport = analytics.totalVehicles + analytics.totalPedestrians + analytics.totalCyclists;
    const greenTransport = analytics.totalPedestrians + analytics.totalCyclists;
    const greenPercent = totalTransport > 0 ? ((greenTransport / totalTransport) * 100) : 0;
    
    // Update environmental display elements
    const envCO2Element = document.getElementById('env-co2-total');
    const greenTransportElement = document.getElementById('green-transport-pct');
    const ecoScoreFillElement = document.getElementById('eco-score-fill');
    const envRecommendationElement = document.getElementById('env-recommendation');
    
    if (envCO2Element) {
        envCO2Element.textContent = `${(analytics.totalCO2 * 1000).toFixed(1)}g/km`;
    }
    
    if (greenTransportElement) {
        greenTransportElement.textContent = `${greenPercent.toFixed(1)}%`;
        greenTransportElement.style.color = greenPercent > 50 ? '#28a745' : greenPercent > 25 ? '#ffc107' : '#dc3545';
    }
    
    // Calculate eco score (0-100, higher is better)
    let ecoScore = 100;
    if (analytics.totalCO2 > 0) {
        ecoScore = Math.max(0, 100 - (analytics.totalCO2 * 100));
    }
    ecoScore = Math.min(100, ecoScore + greenPercent); // Bonus for green transport
    
    if (ecoScoreFillElement) {
        ecoScoreFillElement.style.width = `${ecoScore}%`;
    }
    
    // Update environmental recommendation
    if (envRecommendationElement) {
        const recommendationSpan = envRecommendationElement.querySelector('span');
        if (recommendationSpan) {
            if (greenPercent > 75) {
                recommendationSpan.textContent = 'Excellent! Your area promotes sustainable transport! 🌱';
            } else if (analytics.totalCO2 > 1.0) {
                recommendationSpan.textContent = 'High emissions detected. Consider promoting electric vehicles and public transport.';
            } else if (greenPercent < 25) {
                recommendationSpan.textContent = 'Encourage more cycling and walking to improve air quality!';
            } else {
                recommendationSpan.textContent = 'Good balance! Keep promoting green transportation options.';
            }
        }
    }
}

function updateRecentDetections() {
    const recentList = document.getElementById('recent-detections-list');
    if (!recentList) return;
    
    // Add demo data if no real data exists
    if (analytics.recentDetections.length === 0) {
        // Add some demo CO₂ data for each vehicle type
        analytics.co2ByVehicleType.car = 0.24; // 2 cars
        analytics.co2ByVehicleType.truck = 0.85; // 1 truck
        analytics.co2ByVehicleType.bus = 1.28; // 2 buses
        analytics.entityCounts.car = 2;
        analytics.entityCounts.truck = 1;
        analytics.entityCounts.bus = 2;
        analytics.entityCounts.person = 3;
        analytics.entityCounts.bicycle = 1;
        analytics.totalVehicles = 5;
        analytics.totalPedestrians = 3;
        analytics.totalCyclists = 1;
        
        analytics.recentDetections = [
            { type: 'Car (120g CO₂/km)', time: '2 min ago' },
            { type: 'Pedestrian (0g CO₂/km)', time: '3 min ago' },
            { type: 'Truck (850g CO₂/km)', time: '5 min ago' },
            { type: 'Bicycle (0g CO₂/km)', time: '7 min ago' },
            { type: 'Bus (640g CO₂/km)', time: '12 min ago' }
        ];
        
        // Update the displays with demo data
        updateVehicleCO2Displays();
    }
    
    recentList.innerHTML = analytics.recentDetections.map(detection => `
        <div class="detection-item">
            <span class="detection-type">${detection.type}</span>
            <span class="detection-time">${detection.time}</span>
        </div>
    `).join('');
}

// Enhanced detection processing with CO2 calculation
function processDetectionResults(detections, isVideo = false) {
    if (!detections || detections.length === 0) return;
    
    let sessionCO2 = 0; // CO2 for this detection session
    
    detections.forEach(detection => {
        const label = detection.label.toLowerCase();
        
        // Update entity counts
        if (analytics.entityCounts.hasOwnProperty(label)) {
            analytics.entityCounts[label]++;
        }
        
        // Calculate CO2 emissions
        if (CO2_EMISSIONS.hasOwnProperty(label)) {
            const co2ForVehicle = CO2_EMISSIONS[label];
            analytics.totalCO2 += co2ForVehicle;
            sessionCO2 += co2ForVehicle;
            
            // Track CO2 by vehicle type
            if (analytics.co2ByVehicleType.hasOwnProperty(label)) {
                analytics.co2ByVehicleType[label] += co2ForVehicle;
            }
        }
        
        // Categorize detections
        if (['car', 'truck', 'bus', 'motorcycle'].includes(label)) {
            analytics.totalVehicles++;
        } else if (label === 'person') {
            analytics.totalPedestrians++;
        } else if (label === 'bicycle') {
            analytics.totalCyclists++;
        }
        
        // Add to recent detections with CO2 info
        const co2Info = CO2_EMISSIONS[label] ? ` (${(CO2_EMISSIONS[label] * 1000).toFixed(0)}g CO₂/km)` : '';
        analytics.recentDetections.unshift({
            type: `${label.charAt(0).toUpperCase() + label.slice(1)}${co2Info}`,
            time: 'Just now'
        });
        
        // Keep only last 10 detections
        if (analytics.recentDetections.length > 10) {
            analytics.recentDetections.pop();
        }
    });
    
    analytics.totalDetections += detections.length;
    
    // Show CO2 impact notification for significant emissions
    if (sessionCO2 > 0.5) {
        showNotification(`High CO₂ impact detected: ${(sessionCO2 * 1000).toFixed(0)}g CO₂/km from detected vehicles`, 'warning');
    } else if (sessionCO2 === 0 && detections.length > 0) {
        showNotification('Eco-friendly traffic detected! 🌱 Zero emissions from pedestrians & cyclists', 'success');
    }
    
    // Update dashboard
    updateAnalyticsDashboard();
}


// Enhanced app initialization
function initializeApp() {
    console.log('🚀 AI Traffic Dashboard Initialized');
    
    // Setup drag and drop for upload areas
    setupDragAndDrop('image-upload', handleImageUpload);
    setupDragAndDrop('video-upload', handleVideoUpload);
    
    // Initialize charts
    initializeCharts();
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Enhanced functionality for data management and performance monitoring

function resetAnalytics() {
    if (confirm('Are you sure you want to reset all analytics data? This cannot be undone.')) {
        // Reset analytics object
        analytics = {
            totalVehicles: 0,
            totalPedestrians: 0,
            totalCyclists: 0,
            totalDetections: 0,
            accuracyRate: 95.2,
            totalCO2: 0,
            co2ByVehicleType: {
                'car': 0,
                'truck': 0, 
                'bus': 0,
                'motorcycle': 0
            },
            recentDetections: [],
            entityCounts: {
                'car': 0, 'truck': 0, 'bus': 0, 'motorcycle': 0,
                'person': 0, 'bicycle': 0, 'traffic light': 0, 'stop sign': 0
            }
        };
        
        // Clear localStorage
        localStorage.removeItem('trafficAnalytics');
        
        // Update displays
        updateAnalyticsDashboard();
        
        // Hide results
        document.getElementById('image-results').style.display = 'none';
        document.getElementById('video-results').style.display = 'none';
        
        showNotification('Analytics data has been reset successfully!', 'success');
    }
}

function exportAnalytics() {
    const exportData = {
        timestamp: new Date().toISOString(),
        analytics: analytics,
        performance: {
            export_time: new Date().toISOString(),
            session_duration: Date.now() - performanceMonitor.sessionStart
        }
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
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

function saveAnalyticsData() {
    try {
        localStorage.setItem('trafficAnalytics', JSON.stringify(analytics));
    } catch (error) {
        console.warn('⚠️ Could not save analytics data:', error);
    }
}

// Performance monitoring
const performanceMonitor = {
    sessionStart: Date.now(),
    requestTimes: [],
    lastMetricsUpdate: 0
};

function startPerformanceMonitoring() {
    // Update performance metrics every 5 seconds
    setInterval(updatePerformanceMetrics, 5000);
    
    // Initial update
    updatePerformanceMetrics();
}

async function updatePerformanceMetrics() {
    try {
        const response = await fetch(`${API_BASE_URL}/metrics`);
        if (response.ok) {
            const metrics = await response.json();
            
            document.getElementById('api-response-time').textContent = 
                metrics.avg_response_time_ms ? `${metrics.avg_response_time_ms}ms` : '-';
            
            document.getElementById('total-requests').textContent = 
                metrics.total_requests || '0';
            
            document.getElementById('requests-per-min').textContent = 
                metrics.requests_per_minute ? metrics.requests_per_minute.toFixed(1) : '0';
            
            document.getElementById('system-uptime').textContent = 
                formatUptime(metrics.uptime_seconds || 0);
            
        }
    } catch (error) {
        console.warn('Could not fetch performance metrics:', error);
        document.getElementById('api-response-time').textContent = 'Error';
    }
}

function formatUptime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
        return `${minutes}m ${secs}s`;
    } else {
        return `${secs}s`;
    }
}

// Enhanced processDetectionResults to auto-save data
const originalProcessDetectionResults = processDetectionResults;
function enhancedProcessDetectionResults(detections, isVideo = false) {
    originalProcessDetectionResults.call(this, detections, isVideo);
    saveAnalyticsData(); // Auto-save after processing results
}

// Replace the function
window.processDetectionResults = enhancedProcessDetectionResults;
