// AI Traffic Dashboard JavaScript
const API_BASE_URL = 'https://api.yankees.pt';

// Global variables
let currentVideoData = null;
let detectionColors = {};
let colorIndex = 0;
let isProcessingDragDrop = false; // Flag to prevent duplicate calls
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
    accuracyRate: 0, // Will be calculated from real detection confidence scores
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
    loadLastDetectionRun(); // Load real stats from last backend run
});

// Duplicate function removed - using enhanced version below

function setupEventListeners() {
    // Image input change
    document.getElementById('image-input').addEventListener('change', (e) => {
        if (e.target.files[0] && !isProcessingDragDrop) {
            handleImageUpload(e.target);
        }
    });
    
    // Video input change
    document.getElementById('video-input').addEventListener('change', (e) => {
        if (e.target.files[0] && !isProcessingDragDrop) {
            handleVideoUpload(e.target);
        }
    });
    
    // Play detections button
    document.getElementById('play-detections').addEventListener('click', playVideoDetections);
    
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
            
            // Set flag to prevent duplicate calls from change event
            isProcessingDragDrop = true;
            
            // Set files and call handler directly
            input.files = files;
            handler(input);
            
            // Reset flag after a short delay
            setTimeout(() => {
                isProcessingDragDrop = false;
            }, 500);
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
    
    // Clear previous analytics data for fresh results  
    clearAnalyticsForNewSession();
    
    // Hide time series charts (only for videos)
    hideTimeSeriesContainers();
    
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
        
        // Calculate real accuracy from detection confidence scores
        const confidenceScores = result.detections
            .map(d => d.score)
            .filter(score => score !== undefined && score !== null);
        
        const realAccuracy = confidenceScores.length > 0 
            ? (confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length) * 100
            : 95.2; // fallback if no scores available
        
        console.log('✅ API Success:', { 
            processingTime: `${processingTime}ms`,
            detections: result.detections?.length || 0,
            model: result.model,
            realAccuracy: `${realAccuracy.toFixed(1)}%`
        });
        
        // Filter out unwanted detections (like handbags)
        result.detections = filterDetections(result.detections);
        
        // Process detection results with enhanced analytics
        processDetectionResults(result.detections);
        
        // Display results
        await displayImageResults(file, result);
        
        hideLoading();
        showNotification(`Detected ${result.detections.length} objects in ${processingTime}ms!`, 'success');
        
        // Show Results section and navigation tab after image upload (if detections found)
        if (result.detections.length > 0) {
            showResultsNavigation();
        }
        
        // Refresh hero stats with latest detection run
        setTimeout(() => loadLastDetectionRun(), 500);
        
    } catch (error) {
        console.error('Error processing image:', error);
        hideLoading();
        showNotification('Error processing image. Please make sure the ML Gateway is running.', 'error');
    }
}

// Video Upload Handler
async function handleVideoUpload(input) {
    // Additional safety check to prevent duplicate calls
    if (input._processingVideo) {
        return;
    }
    input._processingVideo = true;
    
    const file = input.files[0];
    if (!file) {
        input._processingVideo = false;
        return;
    }
    
    // Validate file type
    if (!file.type.startsWith('video/')) {
        showNotification('Please select a valid video file', 'error');
        input._processingVideo = false;
        return;
    }
    
    // Validate file size (50MB)
    if (file.size > 50 * 1024 * 1024) {
        showNotification('Video size must be less than 50MB', 'error');
        input._processingVideo = false;
        return;
    }
    
    showLoading('Processing video frames...');
    
    // Clear previous analytics data for fresh results
    clearAnalyticsForNewSession();
    
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
        
        // Calculate real accuracy from all detection confidence scores
        let allConfidenceScores = [];
        result.results.forEach(frame => {
            frame.detections.forEach(detection => {
                if (detection.score) {
                    allConfidenceScores.push(detection.score);
                }
            });
        });
        
        const realAccuracy = allConfidenceScores.length > 0 
            ? (allConfidenceScores.reduce((sum, score) => sum + score, 0) / allConfidenceScores.length) * 100
            : 95.2; // fallback to default if no scores
        
        // Filter out unwanted detections from all video frames
        result.results.forEach(frame => {
            frame.detections = filterDetections(frame.detections);
        });
        
        // Apply object tracking to avoid counting the same object multiple times across frames
        const uniqueDetections = trackObjectsAcrossFrames(result.results);
        
        // Process unique detections as a single session
        processDetectionResults(uniqueDetections, true);
        
        // Generate and display time series charts for video
        generateTimeSeriesCharts(result.results);
        
        // Store for later use
        currentVideoData = result;
        
        // Display results
        await displayVideoResults(file, result);
        
        // Calculate original vs unique detection counts for user feedback
        const originalTotalDetections = result.results.reduce((sum, frame) => sum + frame.detections.length, 0);
        const uniqueDetectionCount = uniqueDetections.length;
        const duplicatesRemoved = originalTotalDetections - uniqueDetectionCount;
        
        hideLoading();
        
        if (duplicatesRemoved > 0) {
            showNotification(`📹 Processed ${result.processed_frames} frames: Found ${uniqueDetectionCount} unique objects (${duplicatesRemoved} duplicates removed)`, 'success');
        } else {
            showNotification(`📹 Processed ${result.processed_frames} frames with ${uniqueDetectionCount} unique objects!`, 'success');
        }
        
        // Show Results section and navigation tab after video upload
        showResultsNavigation();
        
        // Refresh hero stats with latest detection run
        setTimeout(() => loadLastDetectionRun(), 500);
        
        // Reset processing flag
        input._processingVideo = false;
        
    } catch (error) {
        console.error('Error processing video:', error);
        hideLoading();
        showNotification('Error processing video. Please make sure the ML Gateway is running.', 'error');
        
        // Reset processing flag in error case
        input._processingVideo = false;
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

// Load Last Detection Run Data
async function loadLastDetectionRun() {
    try {
        console.log('🔄 Loading last detection run data...');
        const response = await fetch(`${API_BASE_URL}/metrics`);
        
        if (response.ok) {
            const metrics = await response.json();
            const lastRun = metrics.last_detection_run;
            
            console.log('📊 Last detection run data:', lastRun);
            
            // Update hero section stats with real data
            updateHeroStats(lastRun);
            
        } else {
            console.warn('⚠️ Could not fetch last detection run data');
            // Fallback to demo data
            animateStatsFallback();
        }
    } catch (error) {
        console.warn('⚠️ Error loading last detection run:', error);
        // Fallback to demo data
        animateStatsFallback();
    }
}

function updateHeroStats(lastRun) {
    if (!lastRun || !lastRun.timestamp) {
        console.log('📊 No previous detection runs found, showing demo data');
        animateStatsFallback();
        return;
    }
    
    // Animate to real values from last detection run
    const vehicleElement = document.getElementById('detected-vehicles');
    const processingTimeElement = document.getElementById('processing-time');
    const accuracyElement = document.getElementById('accuracy');
    
    if (vehicleElement) {
        animateNumberTo(vehicleElement, lastRun.vehicles_detected, 2000);
    }
    
    if (processingTimeElement) {
        processingTimeElement.textContent = `${lastRun.processing_time_ms}ms`;
    }
    
    if (accuracyElement) {
        accuracyElement.textContent = `${lastRun.accuracy}%`;
    }
    
    console.log('✅ Hero stats updated with last detection run:', {
        vehicles: lastRun.vehicles_detected,
        processingTime: `${lastRun.processing_time_ms}ms`,
        accuracy: `${lastRun.accuracy}%`,
        timestamp: lastRun.timestamp
    });
}

function animateNumberTo(element, targetValue, duration = 2000) {
    const startValue = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    function updateNumber(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Smooth easing animation
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.round(startValue + (targetValue - startValue) * easeOut);
        
        element.textContent = currentValue;
        
        if (progress < 1) {
            requestAnimationFrame(updateNumber);
        }
    }
    
    requestAnimationFrame(updateNumber);
}

// Fallback animation for when no backend data is available
function animateStatsFallback() {
    console.log('🎭 Using fallback demo animation');
    // Use original demo animation
    setTimeout(() => {
        const vehicleElement = document.getElementById('detected-vehicles');
        animateNumberTo(vehicleElement, 1247, 2000);
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

// Filter unwanted object detections
function filterDetections(detections) {
    const unwantedLabels = ['handbag', 'purse', 'bag', 'backpack', 'suitcase', 'parking meter'];
    
    const filteredDetections = detections.filter(detection => {
        const label = detection.label.toLowerCase();
        const isUnwanted = unwantedLabels.some(unwanted => label.includes(unwanted));
        
        if (isUnwanted) {
            console.log(`🚫 Filtered out: ${detection.label} (confidence: ${Math.round(detection.score * 100)}%)`);
        }
        
        return !isUnwanted;
    });
    
    if (filteredDetections.length !== detections.length) {
        console.log(`🔍 Detection Filter: ${detections.length - filteredDetections.length} unwanted objects removed`);
    }
    
    return filteredDetections;
}

// Track objects across video frames to avoid double counting
function trackObjectsAcrossFrames(videoFrames) {
    console.log(`🎯 Tracking objects across ${videoFrames.length} video frames`);
    
    // Collect all detections with frame info
    const allDetections = [];
    videoFrames.forEach((frame, frameIndex) => {
        frame.detections.forEach(detection => {
            allDetections.push({
                ...detection,
                frameIndex,
                timestamp: frame.time_sec || frameIndex * 0.033 // Assume 30fps if no timestamp
            });
        });
    });
    
    if (allDetections.length === 0) {
        console.log('🎯 No detections to track');
        return [];
    }
    
    console.log(`🎯 Processing ${allDetections.length} total detections for tracking`);
    
    // Group detections by label
    const detectionsByLabel = {};
    allDetections.forEach(detection => {
        const label = detection.label.toLowerCase();
        if (!detectionsByLabel[label]) {
            detectionsByLabel[label] = [];
        }
        detectionsByLabel[label].push(detection);
    });
    
    const uniqueDetections = [];
    
    // Process each object type separately
    Object.entries(detectionsByLabel).forEach(([label, detections]) => {
        console.log(`🎯 Tracking ${detections.length} ${label} detections`);
        
        // Use spatial clustering to identify unique objects
        const uniqueObjects = clusterDetectionsByLocation(detections, label);
        uniqueDetections.push(...uniqueObjects);
        
        console.log(`🎯 Found ${uniqueObjects.length} unique ${label} objects (reduced from ${detections.length})`);
    });
    
    const duplicatesRemoved = allDetections.length - uniqueDetections.length;
    const reductionPercentage = allDetections.length > 0 ? (duplicatesRemoved / allDetections.length * 100).toFixed(1) : 0;
    console.log(`🎯 Object tracking complete: ${allDetections.length} → ${uniqueDetections.length} unique objects (${reductionPercentage}% duplicates removed)`);
    return uniqueDetections;
}

// Cluster detections by spatial proximity to identify unique objects
function clusterDetectionsByLocation(detections, label) {
    if (detections.length === 0) return [];
    
    // Calculate centroids for all detections
    const detectionsWithCentroids = detections.map(detection => ({
        ...detection,
        centroid: {
            x: (detection.bbox.x1 + detection.bbox.x2) / 2,
            y: (detection.bbox.y1 + detection.bbox.y2) / 2
        }
    }));
    
    // Use different clustering thresholds based on object type
    const clusterThresholds = {
        'car': 150,     // Cars are larger, can tolerate more movement
        'truck': 180,   // Trucks are even larger
        'bus': 200,     // Buses are largest
        'motorcycle': 100, // Motorcycles are smaller and move more
        'bicycle': 80,  // Bicycles move more and are smaller
        'person': 60    // People are smallest and move most
    };
    
    const threshold = clusterThresholds[label] || 100; // Default threshold
    
    // Simple clustering algorithm: group nearby detections
    const clusters = [];
    const used = new Array(detectionsWithCentroids.length).fill(false);
    
    for (let i = 0; i < detectionsWithCentroids.length; i++) {
        if (used[i]) continue;
        
        const cluster = [detectionsWithCentroids[i]];
        used[i] = true;
        
        // Find all other detections within threshold distance
        for (let j = i + 1; j < detectionsWithCentroids.length; j++) {
            if (used[j]) continue;
            
            const distance = Math.sqrt(
                Math.pow(detectionsWithCentroids[i].centroid.x - detectionsWithCentroids[j].centroid.x, 2) +
                Math.pow(detectionsWithCentroids[i].centroid.y - detectionsWithCentroids[j].centroid.y, 2)
            );
            
            if (distance <= threshold) {
                cluster.push(detectionsWithCentroids[j]);
                used[j] = true;
            }
        }
        
        clusters.push(cluster);
    }
    
    // Return the best representative from each cluster
    return clusters.map(cluster => {
        // Use the detection with highest confidence as representative
        return cluster.reduce((best, current) => 
            current.score > best.score ? current : best
        );
    });
}

// Global storage for chart instances
let timeSeriesCharts = {
    vehicles: null,
    pedestrians: null,
    cyclists: null
};

// Generate time series charts for video data
function generateTimeSeriesCharts(videoFrames) {
    console.log('📊 Generating time series charts for video frames');
    
    // Extract time series data for each object type
    const timeSeriesData = extractTimeSeriesData(videoFrames);
    
    // Create charts for each metric type
    createTimeSeriesChart('vehicles', timeSeriesData.vehicles, '#3b82f6');
    createTimeSeriesChart('pedestrians', timeSeriesData.pedestrians, '#10b981');  
    createTimeSeriesChart('cyclists', timeSeriesData.cyclists, '#f59e0b');
    
    // Show the chart containers
    showTimeSeriesContainers();
}

// Extract time series data from video frames
function extractTimeSeriesData(videoFrames) {
    const data = {
        vehicles: [],
        pedestrians: [],
        cyclists: []
    };
    
    const vehicleTypes = ['car', 'truck', 'bus', 'motorcycle'];
    
    videoFrames.forEach((frame, index) => {
        const timestamp = frame.time_sec || (index * 0.033); // Assume 30fps if no timestamp
        
        // Count different object types in this frame
        let vehicleCount = 0;
        let pedestrianCount = 0;
        let cyclistCount = 0;
        
        frame.detections.forEach(detection => {
            const label = detection.label.toLowerCase();
            
            if (vehicleTypes.includes(label)) {
                vehicleCount++;
            } else if (label === 'person') {
                pedestrianCount++;
            } else if (label === 'bicycle') {
                cyclistCount++;
            }
        });
        
        data.vehicles.push({ x: timestamp, y: vehicleCount });
        data.pedestrians.push({ x: timestamp, y: pedestrianCount });
        data.cyclists.push({ x: timestamp, y: cyclistCount });
    });
    
    console.log('📊 Extracted time series data:', {
        frames: videoFrames.length,
        vehicles: data.vehicles.length,
        pedestrians: data.pedestrians.length,
        cyclists: data.cyclists.length
    });
    
    return data;
}

// Create a time series chart for a specific metric type
function createTimeSeriesChart(type, data, color) {
    const canvas = document.getElementById(`${type}-timeseries-chart`);
    if (!canvas) {
        console.warn(`Canvas not found for ${type} time series chart`);
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // Destroy existing chart if it exists
    if (timeSeriesCharts[type]) {
        timeSeriesCharts[type].destroy();
    }
    
    // Clean up any existing custom tooltip
    const existingTooltip = document.getElementById(`chartjs-tooltip-${type}`);
    if (existingTooltip) {
        existingTooltip.remove();
    }
    
    // Calculate max value for Y-axis
    const maxValue = Math.max(...data.map(point => point.y)) || 1;
    const yAxisMax = Math.max(5, Math.ceil(maxValue * 1.2));
    
    timeSeriesCharts[type] = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: [{
                label: type.charAt(0).toUpperCase() + type.slice(1),
                data: data,
                borderColor: color,
                backgroundColor: color + '20',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 0,
                pointBackgroundColor: 'transparent',
                pointBorderColor: 'transparent',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            aspectRatio: 6.25,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: false, // Disable built-in tooltip
                    external: function(context) {
                        // Custom external tooltip to avoid clipping
                        const chart = context.chart;
                        const tooltip = context.tooltip;
                        
                        // Get or create tooltip element
                        let tooltipEl = document.getElementById(`chartjs-tooltip-${type}`);
                        if (!tooltipEl) {
                            tooltipEl = document.createElement('div');
                            tooltipEl.id = `chartjs-tooltip-${type}`;
                            tooltipEl.style.cssText = `
                                opacity: 0;
                                position: absolute;
                                background: rgba(0, 0, 0, 0.8);
                                color: white;
                                border-radius: 4px;
                                padding: 6px 8px;
                                font-size: 12px;
                                font-weight: 500;
                                pointer-events: none;
                                transition: all 0.2s ease;
                                z-index: 10000;
                                border: 1px solid ${color};
                                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
                            `;
                            document.body.appendChild(tooltipEl);
                        }
                        
                        // Hide if no tooltip
                        if (tooltip.opacity === 0) {
                            tooltipEl.style.opacity = 0;
                            return;
                        }
                        
                        // Set text
                        if (tooltip.body) {
                            const data = tooltip.dataPoints[0];
                            tooltipEl.innerHTML = `Time: ${data.parsed.x.toFixed(1)}s<br/>${type.charAt(0).toUpperCase() + type.slice(1)}: ${data.parsed.y}`;
                        }
                        
                        // Position tooltip relative to document
                        const canvasRect = chart.canvas.getBoundingClientRect();
                        const x = canvasRect.left + tooltip.caretX + window.scrollX;
                        const y = canvasRect.top + tooltip.caretY + window.scrollY - 50;
                        
                        tooltipEl.style.opacity = 1;
                        tooltipEl.style.left = x + 'px';
                        tooltipEl.style.top = y + 'px';
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    display: true,
                    title: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        font: {
                            size: 8
                        },
                        maxTicksLimit: 4
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        lineWidth: 1
                    }
                },
                y: {
                    display: true,
                    beginAtZero: true,
                    max: yAxisMax,
                    title: {
                        display: false
                    },
                    ticks: {
                        color: 'rgba(255, 255, 255, 0.5)',
                        font: {
                            size: 8
                        },
                        stepSize: 1,
                        maxTicksLimit: 3
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)',
                        lineWidth: 1
                    }
                }
            }
        }
    });
    
    console.log(`📊 Created ${type} time series chart with ${data.length} data points`);
}

// Show time series containers and add visual indicators
function showTimeSeriesContainers() {
    const types = ['vehicles', 'pedestrians', 'cyclists'];
    
    types.forEach(type => {
        const container = document.getElementById(`${type}-timeseries-container`);
        const card = container?.closest('.metric-card');
        
        if (container && card) {
            container.style.display = 'block';
            card.classList.add('has-timeseries');
            console.log(`📊 Showing ${type} time series chart (hiding metric footer)`);
        }
    });
}

// Hide time series containers (for image uploads)
function hideTimeSeriesContainers() {
    const types = ['vehicles', 'pedestrians', 'cyclists'];
    
    types.forEach(type => {
        const container = document.getElementById(`${type}-timeseries-container`);
        const card = container?.closest('.metric-card');
        
        if (container && card) {
            container.style.display = 'none';
            card.classList.remove('has-timeseries');
            console.log(`📊 Hiding ${type} time series chart (showing metric footer)`);
        }
        
        // Destroy existing chart
        if (timeSeriesCharts[type]) {
            timeSeriesCharts[type].destroy();
            timeSeriesCharts[type] = null;
        }
        
        // Clean up custom tooltip
        const tooltipEl = document.getElementById(`chartjs-tooltip-${type}`);
        if (tooltipEl) {
            tooltipEl.remove();
        }
    });
}

// Show Results Section and Navigation Tab
function showResultsNavigation() {
    const resultsNavLink = document.getElementById('results-nav-link');
    const resultsSection = document.getElementById('results');
    
    // Show the Results navigation tab
    if (resultsNavLink) {
        // Show the Results tab with a smooth animation
        resultsNavLink.style.display = 'block';
        resultsNavLink.style.opacity = '0';
        resultsNavLink.style.transform = 'translateY(-10px)';
        
        // Animate in
        setTimeout(() => {
            resultsNavLink.style.transition = 'all 0.3s ease';
            resultsNavLink.style.opacity = '1';
            resultsNavLink.style.transform = 'translateY(0)';
        }, 100);
        
        // Add a subtle notification badge
        if (!resultsNavLink.querySelector('.nav-badge')) {
            const badge = document.createElement('span');
            badge.className = 'nav-badge';
            badge.textContent = 'NEW';
            badge.style.cssText = `
                position: absolute;
                top: -8px;
                right: -12px;
                background: #ff4757;
                color: white;
                font-size: 0.7rem;
                font-weight: 600;
                padding: 2px 6px;
                border-radius: 10px;
                animation: pulse 2s infinite;
            `;
            resultsNavLink.style.position = 'relative';
            resultsNavLink.appendChild(badge);
            
            // Remove badge after 5 seconds
            setTimeout(() => {
                if (badge.parentNode) {
                    badge.style.animation = 'fadeOut 0.5s ease';
                    setTimeout(() => {
                        if (badge.parentNode) {
                            badge.parentNode.removeChild(badge);
                        }
                    }, 500);
                }
            }, 5000);
        }
    }
    
    // Show the entire Results section
    if (resultsSection) {
        resultsSection.style.display = 'block';
        resultsSection.style.opacity = '0';
        resultsSection.style.transform = 'translateY(20px)';
        
        // Animate the section in with a slight delay
        setTimeout(() => {
            resultsSection.style.transition = 'all 0.5s ease';
            resultsSection.style.opacity = '1';
            resultsSection.style.transform = 'translateY(0)';
        }, 200);
        
        console.log('✅ Results section and navigation tab shown after video upload');
        
        // Auto-scroll to the results section after it's shown
        setTimeout(() => {
            resultsSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }, 700);
    }
}

// Enhanced Analytics Functions


// Initialize charts removed
function initializeCharts() {
    updateAnalyticsDashboard();
}




function updateAnalyticsDashboard() {
    
    // Update metric cards with real analytics data from model analysis
    document.getElementById('total-vehicles').textContent = analytics.totalVehicles;
    document.getElementById('total-pedestrians').textContent = analytics.totalPedestrians;
    document.getElementById('total-cyclists').textContent = analytics.totalCyclists;
    document.getElementById('accuracy-rate').textContent = `${analytics.accuracyRate.toFixed(1)}%`;
    
    // Update accuracy progress bar
    const accuracyProgressBar = document.getElementById('accuracy-progress-bar');
    if (accuracyProgressBar) {
        accuracyProgressBar.style.width = `${Math.max(0, Math.min(100, analytics.accuracyRate))}%`;
    }
    
    console.log('📊 Current Detection Results Displayed:', {
        vehicles: analytics.totalVehicles,
        pedestrians: analytics.totalPedestrians,
        cyclists: analytics.totalCyclists,
        accuracy: `${analytics.accuracyRate.toFixed(1)}%`
    });
    
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

            // Update trend with dynamic baseline values and impact status
            if (trendElement) {
                const vehicleCount = analytics.entityCounts[vehicleType];
                const emissionRate = CO2_EMISSIONS[vehicleType] * 1000; // Convert to grams

                if (vehicleCount === 0) {
                    // Show dynamic baseline when no vehicles detected
                    trendElement.textContent = `${emissionRate}g baseline`;
                    trendElement.style.color = '#6c757d';
                } else if (co2Value < 0.1) {
                    // Low impact
                    trendElement.textContent = `Low impact (${vehicleCount} detected)`;
                    trendElement.style.color = '#28a745';
                } else if (co2Value < 0.5) {
                    // Medium impact
                    trendElement.textContent = `Medium impact (${vehicleCount} detected)`;
                    trendElement.style.color = '#ffc107';
                } else {
                    // High impact
                    trendElement.textContent = `High impact (${vehicleCount} detected)`;
                    trendElement.style.color = '#dc3545';
                }
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
    
    // Only show demo data if no real data exists AND no detection has been processed
    if (analytics.recentDetections.length === 0 && analytics.totalDetections === 0) {
        recentList.innerHTML = `
            <div class="detection-item" style="text-align: center; color: #666; font-style: italic;">
                <span class="detection-type">Upload an image or video to see detection results</span>
                <span class="detection-time"></span>
            </div>
        `;
    } else {
        recentList.innerHTML = analytics.recentDetections.map(detection => `
            <div class="detection-item">
                <span class="detection-type">${detection.type}</span>
                <span class="detection-time">${detection.time}</span>
            </div>
        `).join('');
    }
}

// Clear analytics data for a new upload session
function clearAnalyticsForNewSession() {
    console.log('🧹 Clearing analytics for new detection session');
    
    // Reset all counters to zero
    Object.assign(analytics, {
        totalVehicles: 0,
        totalPedestrians: 0, 
        totalCyclists: 0,
        totalCO2: 0,
        totalDetections: 0,
        accuracyRate: 0,
        co2ByVehicleType: { 'car': 0, 'truck': 0, 'bus': 0, 'motorcycle': 0 },
        entityCounts: {
            'car': 0, 'truck': 0, 'bus': 0, 'motorcycle': 0,
            'person': 0, 'bicycle': 0, 'traffic light': 0, 'stop sign': 0
        },
        recentDetections: []
    });
    
    // Hide time series charts when clearing session
    hideTimeSeriesContainers();
    
    // Clean up any remaining custom tooltips
    ['vehicles', 'pedestrians', 'cyclists'].forEach(type => {
        const tooltipEl = document.getElementById(`chartjs-tooltip-${type}`);
        if (tooltipEl) {
            tooltipEl.remove();
        }
    });
}

// Enhanced detection processing with CO2 calculation  
function processDetectionResults(detections, isVideo = false) {
    if (!detections || detections.length === 0) return;
    
    let sessionCO2 = 0; // CO2 for this detection session
    
    detections.forEach(detection => {
        const label = detection.label.toLowerCase();
        
        // Update entity counts for current session
        if (analytics.entityCounts.hasOwnProperty(label)) {
            analytics.entityCounts[label]++;
        }
        
        // Calculate CO2 emissions
        if (CO2_EMISSIONS.hasOwnProperty(label)) {
            const co2ForVehicle = CO2_EMISSIONS[label];
            analytics.totalCO2 += co2ForVehicle;
            sessionCO2 += co2ForVehicle;
            
            // Track CO2 by vehicle type for current session
            if (analytics.co2ByVehicleType.hasOwnProperty(label)) {
                analytics.co2ByVehicleType[label] += co2ForVehicle;
            }
        }
        
        // Categorize detections for current session
        if (['car', 'truck', 'bus', 'motorcycle'].includes(label)) {
            analytics.totalVehicles++;
        } else if (label === 'person') {
            analytics.totalPedestrians++;
        } else if (label === 'bicycle') {
            analytics.totalCyclists++;
        }
        
        // Add to current session detections with CO2 info
        const co2Info = CO2_EMISSIONS[label] ? ` (${(CO2_EMISSIONS[label] * 1000).toFixed(0)}g CO₂/km)` : '';
        if (analytics.recentDetections.length === 0 || 
            analytics.recentDetections[0].time !== 'Current Upload') {
            // Reset recent detections for new upload
            analytics.recentDetections = [];
        }
        analytics.recentDetections.unshift({
            type: `${label.charAt(0).toUpperCase() + label.slice(1)}${co2Info}`,
            time: 'Current Upload'
        });
    });
    
    analytics.totalDetections = detections.length; // Set to current session total
    
    // Calculate real AI accuracy from detection confidence scores
    if (detections.length > 0) {
        const totalConfidence = detections.reduce((sum, detection) => sum + (detection.score || 0), 0);
        const sessionAccuracy = (totalConfidence / detections.length) * 100;
        
        // Update overall accuracy (weighted average with previous detections)
        const previousWeight = Math.max(0, analytics.totalDetections - detections.length);
        const newWeight = detections.length;
        
        if (previousWeight > 0) {
            analytics.accuracyRate = (
                (analytics.accuracyRate * previousWeight + sessionAccuracy * newWeight) / 
                (previousWeight + newWeight)
            );
        } else {
            analytics.accuracyRate = sessionAccuracy;
        }
        
        console.log('🎯 Current Detection Session Results:', {
            currentSessionAccuracy: `${sessionAccuracy.toFixed(1)}%`,
            vehicles: analytics.totalVehicles,
            pedestrians: analytics.totalPedestrians, 
            cyclists: analytics.totalCyclists,
            totalDetections: detections.length
        });
    }
    
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
            
            // Show Results tab and section if we have persisted data with detections
            if (data.totalDetections && data.totalDetections > 0) {
                setTimeout(() => {
                    const resultsNavLink = document.getElementById('results-nav-link');
                    const resultsSection = document.getElementById('results');
                    
                    if (resultsNavLink) {
                        resultsNavLink.style.display = 'block';
                    }
                    
                    if (resultsSection) {
                        resultsSection.style.display = 'block';
                        console.log('📊 Results section and tab shown due to existing analytics data');
                    }
                }, 500);
            }
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
    
    // Real-time metrics are updated when detections are processed
    
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

// Removed random vehicle count updater - now using real detection data

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
    
    // Trigger counter animations
    animateCounters();
    
    // Update CO2 displays
    updateVehicleCO2Displays();
    
    // Update environmental metrics
    updateEnvironmentalMetrics();
    
    // Update recent detections
    updateRecentDetections();
}


// Animated Counter Effect
function animateCounters() {
    
    // Use real analytics data for animation
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
