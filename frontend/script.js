// AI Traffic Dashboard JavaScript
const API_BASE_URL = 'http://184.73.137.40:8000';

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

// Ensure clean start - check URL parameters for reset
function ensureCleanState() {
    const urlParams = new URLSearchParams(window.location.search);
    const forceReset = urlParams.get('reset') === 'true';
    
    if (forceReset) {
        console.log('🔄 Force reset detected in URL - clearing all data');
        localStorage.removeItem('trafficAnalytics');
        
        // Reset analytics to zero
        Object.assign(analytics, {
            totalVehicles: 0,
            totalPedestrians: 0,
            totalCyclists: 0,
            totalDetections: 0,
            accuracyRate: 95.2,
            totalCO2: 0,
            co2ByVehicleType: { 'car': 0, 'truck': 0, 'bus': 0, 'motorcycle': 0 },
            recentDetections: [],
            entityCounts: {
                'car': 0, 'truck': 0, 'bus': 0, 'motorcycle': 0,
                'person': 0, 'bicycle': 0, 'traffic light': 0, 'stop sign': 0
            }
        });
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('✅ State reset to zero values');
    }
}

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
                    // Auto-collapse the response by default
                    setTimeout(autoCollapseResponses, 100);
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
    
    // Auto-collapse the response by default
    setTimeout(autoCollapseResponses, 100);
    
    // Show results container
    document.getElementById('video-results').style.display = 'block';
    document.getElementById('video-results').scrollIntoView({ behavior: 'smooth' });
}

// Draw Bounding Boxes with Improved Label Positioning
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
    
    // Store label positions to prevent overlaps
    const usedLabelPositions = [];
    
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
            x1: Math.max(0, bbox.x1 * scaleX),
            y1: Math.max(0, bbox.y1 * scaleY),
            x2: Math.min(canvasWidth, bbox.x2 * scaleX),
            y2: Math.min(canvasHeight, bbox.y2 * scaleY)
        };
        
        // Enhanced label styling
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = 3;
        ctx.font = 'bold 14px Inter';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        // Draw bounding box with rounded corners effect
        const width = scaledBbox.x2 - scaledBbox.x1;
        const height = scaledBbox.y2 - scaledBbox.y1;
        
        // Draw main rectangle
        ctx.strokeRect(scaledBbox.x1, scaledBbox.y1, width, height);
        
        // Add corner accents for better visibility
        ctx.lineWidth = 4;
        const cornerSize = Math.min(15, width * 0.1, height * 0.1);
        
        // Top-left corner
        ctx.beginPath();
        ctx.moveTo(scaledBbox.x1, scaledBbox.y1 + cornerSize);
        ctx.lineTo(scaledBbox.x1, scaledBbox.y1);
        ctx.lineTo(scaledBbox.x1 + cornerSize, scaledBbox.y1);
        ctx.stroke();
        
        // Top-right corner
        ctx.beginPath();
        ctx.moveTo(scaledBbox.x2 - cornerSize, scaledBbox.y1);
        ctx.lineTo(scaledBbox.x2, scaledBbox.y1);
        ctx.lineTo(scaledBbox.x2, scaledBbox.y1 + cornerSize);
        ctx.stroke();
        
        // Bottom-left corner
        ctx.beginPath();
        ctx.moveTo(scaledBbox.x1, scaledBbox.y2 - cornerSize);
        ctx.lineTo(scaledBbox.x1, scaledBbox.y2);
        ctx.lineTo(scaledBbox.x1 + cornerSize, scaledBbox.y2);
        ctx.stroke();
        
        // Bottom-right corner
        ctx.beginPath();
        ctx.moveTo(scaledBbox.x2 - cornerSize, scaledBbox.y2);
        ctx.lineTo(scaledBbox.x2, scaledBbox.y2);
        ctx.lineTo(scaledBbox.x2, scaledBbox.y2 - cornerSize);
        ctx.stroke();
        
        // Reset shadow for label drawing
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Enhanced label positioning
        const labelText = `${label} ${Math.round((score || 0) * 100)}%`;
        const metrics = ctx.measureText(labelText);
        const labelPadding = 8;
        const labelHeight = 22;
        const labelWidth = metrics.width + labelPadding * 2;
        
        // Calculate optimal label position
        const labelPos = calculateOptimalLabelPosition(
            scaledBbox, 
            labelWidth, 
            labelHeight + labelPadding, 
            canvasWidth, 
            canvasHeight,
            usedLabelPositions
        );
        
        // Draw label with improved styling
        const gradient = ctx.createLinearGradient(0, labelPos.y - labelHeight, 0, labelPos.y);
        gradient.addColorStop(0, color);
        gradient.addColorStop(1, adjustColorBrightness(color, -0.2));
        
        ctx.fillStyle = gradient;
        ctx.fillRect(labelPos.x, labelPos.y - labelHeight, labelWidth, labelHeight);
        
        // Add label border for better definition
        ctx.strokeStyle = adjustColorBrightness(color, -0.3);
        ctx.lineWidth = 1;
        ctx.strokeRect(labelPos.x, labelPos.y - labelHeight, labelWidth, labelHeight);
        
        // Draw label text with better contrast
        ctx.fillStyle = getContrastColor(color);
        ctx.font = 'bold 13px Inter';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        
        // Add text shadow for better readability
        ctx.shadowColor = color === '#FFFFFF' || isLightColor(color) ? 'rgba(0, 0, 0, 0.8)' : 'rgba(255, 255, 255, 0.8)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        
        ctx.fillText(
            labelText, 
            labelPos.x + labelPadding, 
            labelPos.y - labelHeight / 2
        );
        
        // Reset text shadow
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        
        // Store this label position to prevent overlaps
        usedLabelPositions.push({
            x: labelPos.x,
            y: labelPos.y - labelHeight,
            width: labelWidth,
            height: labelHeight
        });
        
        console.log('🎯 Drew detection:', {
            label,
            score: Math.round((score || 0) * 100),
            originalBbox: bbox,
            scaledBbox,
            labelPos,
            color
        });
    });
}

// Helper function to calculate optimal label position
function calculateOptimalLabelPosition(bbox, labelWidth, labelHeight, canvasWidth, canvasHeight, usedPositions) {
    const margin = 4;
    
    // Preferred positions in order of preference
    const positions = [
        // Above the box (preferred)
        { x: bbox.x1, y: bbox.y1 - margin },
        // Below the box
        { x: bbox.x1, y: bbox.y2 + labelHeight + margin },
        // Inside top
        { x: bbox.x1 + margin, y: bbox.y1 + labelHeight + margin },
        // Inside bottom
        { x: bbox.x1 + margin, y: bbox.y2 - margin },
        // Right side
        { x: bbox.x2 + margin, y: bbox.y1 + labelHeight },
        // Left side
        { x: bbox.x1 - labelWidth - margin, y: bbox.y1 + labelHeight }
    ];
    
    for (const pos of positions) {
        // Adjust position to stay within canvas bounds
        const adjustedPos = {
            x: Math.max(0, Math.min(pos.x, canvasWidth - labelWidth)),
            y: Math.max(labelHeight, Math.min(pos.y, canvasHeight))
        };
        
        // Check if this position overlaps with existing labels
        if (!overlapsWithExistingLabels(adjustedPos, labelWidth, labelHeight, usedPositions)) {
            return adjustedPos;
        }
    }
    
    // If no non-overlapping position found, use the first adjusted position
    return {
        x: Math.max(0, Math.min(positions[0].x, canvasWidth - labelWidth)),
        y: Math.max(labelHeight, Math.min(positions[0].y, canvasHeight))
    };
}

// Helper function to check label overlaps
function overlapsWithExistingLabels(pos, width, height, usedPositions) {
    const testRect = {
        x: pos.x,
        y: pos.y - height,
        width: width,
        height: height
    };
    
    return usedPositions.some(usedPos => {
        return !(testRect.x + testRect.width < usedPos.x ||
                usedPos.x + usedPos.width < testRect.x ||
                testRect.y + testRect.height < usedPos.y ||
                usedPos.y + usedPos.height < testRect.y);
    });
}

// Helper function to adjust color brightness
function adjustColorBrightness(color, percent) {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

// Helper function to get contrasting text color
function getContrastColor(hexColor) {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark backgrounds, black for light backgrounds
    return luminance > 0.5 ? '#000000' : '#FFFFFF';
}

// Helper function to check if color is light
function isLightColor(hexColor) {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5;
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
    
    // Check if we have tracking information (new unique counting method)
    if (result.tracking_info) {
        const uniqueObjects = result.tracking_info.total_unique_objects;
        const reductionPercent = result.tracking_info.reduction_percentage || 0;
        
        container.innerHTML = `
            <div class="video-stat-item highlight">
                <div class="video-stat-number">${uniqueObjects}</div>
                <div class="video-stat-label">🎯 Unique Objects</div>
                <div class="video-stat-note">Smart Tracking</div>
            </div>
            <div class="video-stat-item">
                <div class="video-stat-number">${result.processed_frames}</div>
                <div class="video-stat-label">Frames Processed</div>
            </div>
            <div class="video-stat-item comparison">
                <div class="video-stat-number">${totalDetections}</div>
                <div class="video-stat-label">Raw Detections</div>
                <div class="video-stat-note">(-${reductionPercent}%)</div>
            </div>
            <div class="video-stat-item">
                <div class="video-stat-number">${result.fps_sample}</div>
                <div class="video-stat-label">FPS Sample Rate</div>
            </div>
        `;
    } else {
        // Fallback to old display method
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

// Play Video Detections with real-time overlay
function playVideoDetections() {
    if (!currentVideoData) {
        showNotification('No video data available', 'error');
        return;
    }
    
    const video = document.getElementById('preview-video');
    const playBtn = document.getElementById('play-detections');
    
    if (!video || !video.src) {
        showNotification('No video loaded', 'error');
        return;
    }
    
    // Create or get existing canvas overlay
    let canvas = document.getElementById('detection-overlay');
    if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'detection-overlay';
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
        canvas.style.pointerEvents = 'none';
        canvas.style.zIndex = '10';
        
        // Make video container relative positioned
        const videoContainer = video.parentElement;
        if (videoContainer.style.position !== 'relative') {
            videoContainer.style.position = 'relative';
        }
        videoContainer.appendChild(canvas);
    }
    
    const ctx = canvas.getContext('2d');
    let animationFrame = null;
    let isPlaying = false;
    
    // Set canvas size to match video
    const resizeCanvas = () => {
        canvas.width = video.videoWidth || video.offsetWidth;
        canvas.height = video.videoHeight || video.offsetHeight;
        canvas.style.width = video.offsetWidth + 'px';
        canvas.style.height = video.offsetHeight + 'px';
    };
    
    // Draw detections for current video time
    const drawDetections = () => {
        if (!isPlaying) return;
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const currentTime = video.currentTime;
        const fps = currentVideoData.fps_sample || 1;
        
        // Find the closest detection frame
        let closestFrame = null;
        let minTimeDiff = Infinity;
        
        currentVideoData.results.forEach(frame => {
            const timeDiff = Math.abs(frame.time_sec - currentTime);
            if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff;
                closestFrame = frame;
            }
        });
        
        // Draw detections if we have a close frame (within 0.5 seconds)
        if (closestFrame && minTimeDiff < 0.5) {
            const scaleX = canvas.width / video.videoWidth;
            const scaleY = canvas.height / video.videoHeight;
            
            // Store label positions to prevent overlaps in video overlay
            const usedVideoLabelPositions = [];
            
            closestFrame.detections.forEach((detection, index) => {
                const { bbox, label, score } = detection;
                
                // Get color for this label
                if (!detectionColors[label]) {
                    detectionColors[label] = colors[colorIndex % colors.length];
                    colorIndex++;
                }
                const color = detectionColors[label];
                
                // Scale and clamp bounding box coordinates
                const scaledBbox = {
                    x1: Math.max(0, bbox.x1 * scaleX),
                    y1: Math.max(0, bbox.y1 * scaleY),
                    x2: Math.min(canvas.width, bbox.x2 * scaleX),
                    y2: Math.min(canvas.height, bbox.y2 * scaleY)
                };
                
                const width = scaledBbox.x2 - scaledBbox.x1;
                const height = scaledBbox.y2 - scaledBbox.y1;
                
                // Enhanced bounding box drawing with shadow
                ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                ctx.strokeStyle = color;
                ctx.lineWidth = 3;
                ctx.strokeRect(scaledBbox.x1, scaledBbox.y1, width, height);
                
                // Add corner accents for video overlay
                ctx.lineWidth = 4;
                const cornerSize = Math.min(12, width * 0.08, height * 0.08);
                
                // Draw corner accents
                const corners = [
                    [[scaledBbox.x1, scaledBbox.y1 + cornerSize], [scaledBbox.x1, scaledBbox.y1], [scaledBbox.x1 + cornerSize, scaledBbox.y1]],
                    [[scaledBbox.x2 - cornerSize, scaledBbox.y1], [scaledBbox.x2, scaledBbox.y1], [scaledBbox.x2, scaledBbox.y1 + cornerSize]],
                    [[scaledBbox.x1, scaledBbox.y2 - cornerSize], [scaledBbox.x1, scaledBbox.y2], [scaledBbox.x1 + cornerSize, scaledBbox.y2]],
                    [[scaledBbox.x2 - cornerSize, scaledBbox.y2], [scaledBbox.x2, scaledBbox.y2], [scaledBbox.x2, scaledBbox.y2 - cornerSize]]
                ];
                
                corners.forEach(corner => {
                    ctx.beginPath();
                    ctx.moveTo(corner[0][0], corner[0][1]);
                    ctx.lineTo(corner[1][0], corner[1][1]);
                    ctx.lineTo(corner[2][0], corner[2][1]);
                    ctx.stroke();
                });
                
                // Reset shadow for label drawing
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                
                // Enhanced video label positioning
                const labelText = `${label} ${Math.round((score || 0) * 100)}%`;
                ctx.font = 'bold 15px Inter';
                const metrics = ctx.measureText(labelText);
                const labelPadding = 8;
                const labelHeight = 24;
                const labelWidth = metrics.width + labelPadding * 2;
                
                // Calculate optimal label position for video
                const labelPos = calculateOptimalLabelPosition(
                    scaledBbox, 
                    labelWidth, 
                    labelHeight, 
                    canvas.width, 
                    canvas.height,
                    usedVideoLabelPositions
                );
                
                // Draw enhanced label background with gradient
                const gradient = ctx.createLinearGradient(0, labelPos.y - labelHeight, 0, labelPos.y);
                gradient.addColorStop(0, color);
                gradient.addColorStop(1, adjustColorBrightness(color, -0.3));
                
                // Add subtle shadow to label for better video visibility
                ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 2;
                ctx.shadowOffsetY = 2;
                
                ctx.fillStyle = gradient;
                ctx.fillRect(labelPos.x, labelPos.y - labelHeight, labelWidth, labelHeight);
                
                // Add label border
                ctx.strokeStyle = adjustColorBrightness(color, -0.4);
                ctx.lineWidth = 2;
                ctx.strokeRect(labelPos.x, labelPos.y - labelHeight, labelWidth, labelHeight);
                
                // Reset shadow for text
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                
                // Draw label text with enhanced readability for video
                ctx.fillStyle = getContrastColor(color);
                ctx.font = 'bold 14px Inter';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                
                // Add strong text shadow for video readability
                ctx.shadowColor = isLightColor(color) ? 'rgba(0, 0, 0, 1)' : 'rgba(255, 255, 255, 1)';
                ctx.shadowBlur = 3;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                
                ctx.fillText(
                    labelText, 
                    labelPos.x + labelPadding, 
                    labelPos.y - labelHeight / 2
                );
                
                // Reset all shadows
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                
                // Store this label position to prevent overlaps
                usedVideoLabelPositions.push({
                    x: labelPos.x,
                    y: labelPos.y - labelHeight,
                    width: labelWidth,
                    height: labelHeight
                });
            });
            
            // Show frame info
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(10, 10, 300, 50);
            ctx.fillStyle = 'white';
            ctx.font = '14px Inter';
            ctx.fillText(`Frame: ${closestFrame.frame_index}/${currentVideoData.total_frames}`, 20, 30);
            ctx.fillText(`Time: ${currentTime.toFixed(1)}s | Detections: ${closestFrame.detections.length}`, 20, 50);
        }
        
        if (isPlaying && !video.paused) {
            animationFrame = requestAnimationFrame(drawDetections);
        }
    };
    
    // Check if overlay is currently active
    const isCurrentlyActive = playBtn.dataset.active === 'true';
    
    // Toggle playback
    if (isCurrentlyActive) {
        // Stop detection overlay
        isPlaying = false;
        playBtn.dataset.active = 'false';
        if (animationFrame) {
            cancelAnimationFrame(animationFrame);
        }
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.display = 'none';
        playBtn.innerHTML = '<i class="fas fa-play"></i> Play with Detections';
        playBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        
        showNotification('Detection overlay stopped', 'info');
    } else {
        // Start detection overlay
        isPlaying = true;
        playBtn.dataset.active = 'true';
        canvas.style.display = 'block';
        resizeCanvas();
        
        // Update button
        playBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Detections';
        playBtn.style.background = 'linear-gradient(135deg, #dc3545, #c82333)';
        
        // Setup video event listeners
        video.addEventListener('loadedmetadata', resizeCanvas);
        video.addEventListener('resize', resizeCanvas);
        
        // Start drawing loop
        drawDetections();
        
        // Continue drawing while video plays
        video.addEventListener('play', () => {
            if (isPlaying) drawDetections();
        });
        
        video.addEventListener('pause', () => {
            if (animationFrame) {
                cancelAnimationFrame(animationFrame);
            }
        });
        
        video.addEventListener('ended', () => {
            isPlaying = false;
            playBtn.dataset.active = 'false';
            canvas.style.display = 'none';
            playBtn.innerHTML = '<i class="fas fa-play"></i> Play with Detections';
            playBtn.style.background = 'linear-gradient(135deg, #667eea, #764ba2)';
        });
        
        showNotification('Detection overlay activated! Play the video to see detections.', 'success');
    }
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
    // Don't update during reset
    if (isResetInProgress) {
        console.log('🚫 Skipping updateAnalyticsDashboard - reset in progress');
        return;
    }
    
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

                // Remove all impact labels - just clear the text
                trendElement.textContent = '';
                trendElement.style.color = '#6c757d'; // Keep neutral gray color
            }
        }
    });

    // Update progress bars with animation
    updateProgressBars();
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
    
    // Update environmental recommendation - remove all recommendation text
    if (envRecommendationElement) {
        const recommendationSpan = envRecommendationElement.querySelector('span');
        if (recommendationSpan) {
            recommendationSpan.textContent = '';
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
    
    // Ensure clean state if reset parameter is present
    ensureCleanState();
    
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

async function resetAnalytics() {
    if (confirm('🔄 Are you sure you want to reset ALL analytics data and backend metrics? This action cannot be undone.')) {
        // Set flag to prevent animations during reset
        isResetInProgress = true;
        console.log('🔒 Reset in progress - blocking animations and updates');
        // Reset frontend analytics object
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
        
        // Clear localStorage completely
        localStorage.removeItem('trafficAnalytics');
        
        // Debug: Log current analytics state
        console.log('🔍 Analytics state after reset:', JSON.stringify(analytics, null, 2));
        
        // Reset backend metrics via API call
        try {
            showNotification('🔄 Resetting all metrics...', 'info');
            
            const response = await fetch(`${API_BASE_URL}/metrics/reset`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const result = await response.json();
                console.log('🔄 Backend metrics reset successfully:', result);
                showNotification('✅ All analytics data and backend metrics reset to zero!', 'success');
            } else {
                console.warn('Failed to reset backend metrics');
                showNotification('⚠️ Frontend reset. Backend metrics may not have reset.', 'warning');
            }
        } catch (error) {
            console.error('Error resetting backend metrics:', error);
            showNotification('⚠️ Frontend reset. Backend unavailable.', 'warning');
        }
        
        // Force update all dashboard elements immediately
        updateAnalyticsDashboard();
        updateEnhancedDashboard();
        
        // Reset performance metrics display
        if (typeof updatePerformanceMetrics === 'function') {
            updatePerformanceMetrics();
        }
        
        // Force reset specific dashboard elements by their exact IDs
        const elementsToReset = {
            'total-vehicles': '0',
            'total-pedestrians': '0', 
            'total-cyclists': '0',
            'co2-car': '0g',
            'co2-truck': '0g',
            'co2-bus': '0g'
            // Note: accuracy-rate stays at 95.2%
        };
        
        console.log('🔍 DEBUG: Starting element reset process...');
        
        Object.entries(elementsToReset).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                console.log('🔄 Found element:', id, 'Current:', element.textContent, 'Setting to:', value);
                element.textContent = value;
                element.innerHTML = value; // Also try innerHTML in case textContent doesn't work
                
                // Verify the change was applied
                setTimeout(() => {
                    console.log('✅ Verification for', id, '- Current value:', element.textContent);
                }, 100);
            } else {
                console.warn('⚠️ Element not found:', id);
                
                // Try alternative search methods
                const byClass = document.querySelector(`#${id}`);
                const h3Elements = document.querySelectorAll('h3');
                console.log('🔍 Alternative search results:');
                console.log('- By querySelector:', byClass);
                console.log('- All h3 elements:', Array.from(h3Elements).map(h => ({id: h.id, content: h.textContent})));
            }
        });
        
        // More aggressive reset approach
        console.log('🔄 Trying aggressive reset of all number displays...');
        document.querySelectorAll('h3').forEach((h3, index) => {
            if (h3.textContent && /^\d+$/.test(h3.textContent.trim()) && !h3.textContent.includes('%')) {
                console.log(`🔄 Aggressive reset h3[${index}]:`, h3.id, h3.textContent, '→ 0');
                h3.textContent = '0';
                h3.innerHTML = '0';
            }
        });
        
        // Clear any trend indicators  
        document.querySelectorAll('.metric-footer .trend-indicator').forEach(el => {
            if (!el.classList.contains('excellent')) {
                el.textContent = '';
            }
        });
        
        // Clear environmental footers too
        document.querySelectorAll('.environmental-footer').forEach(el => {
            el.textContent = '';
        });
        
        // Hide results
        document.getElementById('image-results').style.display = 'none';
        document.getElementById('video-results').style.display = 'none';
        
        // Add a small delay to ensure all operations complete, then force one more update
        setTimeout(() => {
            console.log('🔄 Final cleanup after reset...');
            
            // Check analytics state before final update
            console.log('🔍 Analytics state before final update:', JSON.stringify(analytics, null, 2));
            
            // DON'T call updateEnhancedDashboard() as it might override our manual reset
            // updateEnhancedDashboard();
            
            // One more direct reset to be absolutely sure using the same approach
            const finalReset = {
                'total-vehicles': '0',
                'total-pedestrians': '0', 
                'total-cyclists': '0',
                'co2-car': '0g',
                'co2-truck': '0g',
                'co2-bus': '0g'
            };
            
            console.log('🔄 Final direct DOM manipulation...');
            Object.entries(finalReset).forEach(([id, value]) => {
                const element = document.getElementById(id);
                if (element) {
                    console.log('🔧 Final reset:', id, element.textContent, '→', value);
                    element.textContent = value;
                    element.innerHTML = value;
                    
                    // Force style update
                    element.style.color = '#333';
                    element.setAttribute('data-reset', 'true');
                }
            });
            
            // Check if there are any event listeners or intervals that might be updating the values
            console.log('🔍 Checking for any running intervals or pending updates...');
            
            // Clear all trend indicators and footers after final reset
            document.querySelectorAll('.trend-indicator').forEach(el => {
                if (!el.classList.contains('excellent')) {
                    el.textContent = '';
                }
            });
            document.querySelectorAll('.environmental-footer').forEach(el => {
                el.textContent = '';
            });
            
            // Clear the reset flag to allow normal operations
            isResetInProgress = false;
            console.log('🔓 Reset complete - re-enabling animations and updates');
            
            console.log('✅ Analytics reset complete - all data should be zero');
        }, 500);
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
    
    // Update system metrics every 10 seconds (less frequent as it's more resource intensive)
    setInterval(updateSystemMetrics, 10000);
    
    // Initial updates
    updatePerformanceMetrics();
    updateSystemMetrics();
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

async function updateSystemMetrics() {
    try {
        const [systemResponse, healthResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/system`),
            fetch(`${API_BASE_URL}/health`)
        ]);
        
        if (systemResponse.ok && healthResponse.ok) {
            const systemMetrics = await systemResponse.json();
            const healthMetrics = await healthResponse.json();
            
            // ===== APPLICATION-SPECIFIC METRICS =====
            
            // App CPU Usage (specific to ML Gateway process)
            const appCpuUsage = systemMetrics.process?.cpu_percent || 0;
            document.getElementById('app-cpu-usage').textContent = `${appCpuUsage.toFixed(1)}%`;
            document.getElementById('app-cpu-progress').style.width = `${Math.min(appCpuUsage, 100)}%`;
            
            // App Memory Usage (specific to ML Gateway process)
            const appMemoryMB = systemMetrics.process?.memory_mb || 0;
            document.getElementById('app-memory-usage').textContent = `${appMemoryMB.toFixed(1)} MB`;
            
            // Model Information
            const modelBackend = healthMetrics.model?.backend || 'Unknown';
            const modelName = healthMetrics.model?.name || 'Unknown';
            document.getElementById('model-backend').textContent = modelBackend.toUpperCase();
            document.getElementById('model-name').textContent = modelName;
            
            // Model Device (GPU or CPU)
            const modelDevice = systemMetrics.gpu?.available ? 
                (systemMetrics.gpu.device || 'GPU') : 'CPU';
            document.getElementById('model-device').textContent = `Running on: ${modelDevice}`;
            
            // GPU Information (for the application)
            if (systemMetrics.gpu?.available) {
                document.getElementById('gpu-status').textContent = 'Available';
                document.getElementById('gpu-name').textContent = systemMetrics.gpu.name || systemMetrics.gpu.device;
                
                if (systemMetrics.gpu.memory_used_mb !== 'N/A' && systemMetrics.gpu.memory_total_mb !== 'N/A') {
                    document.getElementById('gpu-memory').textContent = 
                        `${systemMetrics.gpu.memory_used_mb} / ${systemMetrics.gpu.memory_total_mb} MB`;
                } else {
                    document.getElementById('gpu-memory').textContent = 'Memory info not available';
                }
            } else {
                document.getElementById('gpu-status').textContent = 'CPU Only';
                document.getElementById('gpu-name').textContent = 'No GPU acceleration';
                document.getElementById('gpu-memory').textContent = '';
            }
            
            // Process Uptime
            const processUptime = healthMetrics.system?.uptime_seconds || 0;
            document.getElementById('process-uptime').textContent = formatUptime(processUptime);
            
            console.log('🤖 App metrics updated:', {
                appCpu: `${appCpuUsage.toFixed(1)}%`,
                appMemory: `${appMemoryMB.toFixed(1)} MB`,
                gpu: systemMetrics.gpu?.available ? 'Available' : 'Not available',
                model: `${modelName} (${modelBackend})`,
                uptime: formatUptime(processUptime)
            });
            
        } else {
            throw new Error(`HTTP ${systemResponse.status} or ${healthResponse.status}`);
        }
    } catch (error) {
        console.warn('Could not fetch app metrics:', error);
        // Set error states for app metrics only
        document.getElementById('app-cpu-usage').textContent = 'Error';
        document.getElementById('app-memory-usage').textContent = 'Error';
        document.getElementById('model-backend').textContent = 'Error';
        document.getElementById('gpu-status').textContent = 'Error';
        document.getElementById('process-uptime').textContent = 'Error';
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

// Enhanced Progress Bar Animation
function updateProgressBars() {
    // Calculate maximum values for scaling
    const maxVehicles = Math.max(analytics.totalVehicles || 1, 10);
    const maxPedestrians = Math.max(analytics.totalPedestrians || 1, 8);
    const maxCyclists = Math.max(analytics.totalCyclists || 1, 5);
    
    // Update vehicles progress
    const vehiclesProgress = document.querySelector('.vehicles-progress');
    if (vehiclesProgress) {
        const percentage = Math.min((analytics.totalVehicles / maxVehicles) * 100, 100);
        vehiclesProgress.style.width = `${percentage}%`;
    }
    
    // Update pedestrians progress
    const pedestriansProgress = document.querySelector('.pedestrians-progress');
    if (pedestriansProgress) {
        const percentage = Math.min((analytics.totalPedestrians / maxPedestrians) * 100, 100);
        pedestriansProgress.style.width = `${percentage}%`;
    }
    
    // Update cyclists progress
    const cyclistsProgress = document.querySelector('.cyclists-progress');
    if (cyclistsProgress) {
        const percentage = Math.min((analytics.totalCyclists / maxCyclists) * 100, 100);
        cyclistsProgress.style.width = `${percentage}%`;
    }
    
    // Accuracy progress is already set in HTML but can be updated
    const accuracyProgress = document.querySelector('.accuracy-progress');
    if (accuracyProgress) {
        accuracyProgress.style.width = `${analytics.accuracyRate}%`;
    }
}

// Enhanced Analytics Dashboard Update with Animations
function updateEnhancedDashboard() {
    // Don't update during reset
    if (isResetInProgress) {
        console.log('🚫 Skipping updateEnhancedDashboard - reset in progress');
        return;
    }
    
    // Trigger counter animations
    animateCounters();
    
    // Update CO2 displays
    updateVehicleCO2Displays();
    
    // Update environmental metrics
    updateEnvironmentalMetrics();
    
    // Update recent detections
    updateRecentDetections();
}

// Add a flag to prevent animation during reset
let isResetInProgress = false;

// Animated Counter Effect
function animateCounters() {
    // Don't animate during reset
    if (isResetInProgress) {
        console.log('🚫 Skipping animateCounters - reset in progress');
        return;
    }
    
    const counters = [
        { element: document.getElementById('total-vehicles'), target: analytics.totalVehicles },
        { element: document.getElementById('total-pedestrians'), target: analytics.totalPedestrians },
        { element: document.getElementById('total-cyclists'), target: analytics.totalCyclists }
    ];
    
    counters.forEach(({ element, target }) => {
        if (!element) return;
        
        const current = parseInt(element.textContent) || 0;
        if (current === target) return;
        
        const duration = 1000; // 1 second
        const startTime = Date.now();
        const startValue = current;
        
        function updateCounter() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = Math.round(startValue + (target - startValue) * easeOut);
            
            element.textContent = currentValue;
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            }
        }
        
        requestAnimationFrame(updateCounter);
    });
}

// Override the main update function to use enhanced dashboard
const originalUpdateAnalyticsDashboard = updateAnalyticsDashboard;
window.updateAnalyticsDashboard = function() {
    // Call original function for backward compatibility
    originalUpdateAnalyticsDashboard.call(this);
    
    // Update enhanced dashboard
    updateEnhancedDashboard();
};

// Collapsible sections functionality
function toggleCollapse(contentId) {
    const content = document.getElementById(contentId);
    const icon = document.getElementById(contentId.replace('-content', '-icon'));
    
    if (!content) {
        console.warn('Collapsible content not found:', contentId);
        return;
    }
    
    if (content.classList.contains('expanded')) {
        // Collapse
        content.classList.remove('expanded');
        if (icon) icon.classList.remove('rotated');
        console.log('🔽 Collapsed:', contentId);
    } else {
        // Expand
        content.classList.add('expanded');
        if (icon) icon.classList.add('rotated');
        console.log('🔼 Expanded:', contentId);
    }
}

// Auto-collapse JSON responses by default after they're populated
function autoCollapseResponses() {
    const responses = ['image-json-content', 'video-json-content'];
    responses.forEach(responseId => {
        const content = document.getElementById(responseId);
        const icon = document.getElementById(responseId.replace('-content', '-icon'));
        
        if (content && content.querySelector('pre') && content.querySelector('pre').textContent.trim()) {
            // Start collapsed by default if there's content
            content.classList.remove('expanded');
            if (icon) icon.classList.remove('rotated');
        }
    });
}
