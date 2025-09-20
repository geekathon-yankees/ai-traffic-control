#!/usr/bin/env python3
"""
YOLOv8 ONNX Model Downloader
Downloads YOLOv8n ONNX model for the ML Gateway application
"""

import os
import sys
import urllib.request
import urllib.error
from pathlib import Path

def download_model():
    """Download YOLOv8n ONNX model from multiple sources"""
    
    # Ensure models directory exists
    models_dir = Path("models")
    models_dir.mkdir(exist_ok=True)
    
    target_file = models_dir / "yolov8n.onnx"
    
    # Check if model already exists and is valid (> 1MB)
    if target_file.exists() and target_file.stat().st_size > 1_000_000:
        print(f"✅ Model already exists: {target_file}")
        print(f"   Size: {target_file.stat().st_size / 1_000_000:.1f} MB")
        return True
    
    # List of URLs to try
    urls = [
        "https://github.com/ultralytics/yolov8/releases/download/v8.0.0/yolov8n.onnx",
        "https://github.com/ultralytics/assets/releases/download/v8.0.0/yolov8n.onnx",
        "https://github.com/ultralytics/yolov8/releases/latest/download/yolov8n.onnx",
        "https://raw.githubusercontent.com/ultralytics/yolov8/main/yolov8n.onnx",
    ]
    
    for i, url in enumerate(urls, 1):
        print(f"🌐 Trying source {i}/{len(urls)}: {url}")
        
        try:
            # Create request with headers
            req = urllib.request.Request(url)
            req.add_header('User-Agent', 'Mozilla/5.0 (compatible; YOLOv8-Downloader)')
            
            with urllib.request.urlopen(req, timeout=30) as response:
                if response.status == 200:
                    # Get file size
                    content_length = response.headers.get('Content-Length')
                    if content_length and int(content_length) < 1000:
                        print(f"❌ File too small ({content_length} bytes), skipping...")
                        continue
                    
                    print(f"📥 Downloading... (Size: {content_length or 'unknown'} bytes)")
                    
                    # Download the file
                    with open(target_file, 'wb') as f:
                        while True:
                            chunk = response.read(8192)
                            if not chunk:
                                break
                            f.write(chunk)
                    
                    # Verify download
                    if target_file.stat().st_size > 1_000_000:  # At least 1MB
                        print(f"✅ Successfully downloaded YOLOv8n ONNX model!")
                        print(f"   Location: {target_file.absolute()}")
                        print(f"   Size: {target_file.stat().st_size / 1_000_000:.1f} MB")
                        return True
                    else:
                        print(f"❌ Downloaded file too small ({target_file.stat().st_size} bytes)")
                        target_file.unlink(missing_ok=True)
                        
        except urllib.error.HTTPError as e:
            print(f"❌ HTTP Error {e.code}: {e.reason}")
        except urllib.error.URLError as e:
            print(f"❌ URL Error: {e.reason}")
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n❌ All download attempts failed!")
    print("\n🛠️  Manual solutions:")
    print("1. Visit: https://github.com/ultralytics/yolov8/releases")
    print("2. Download yolov8n.onnx manually")
    print(f"3. Place the file at: {target_file.absolute()}")
    print("\n4. Or install ultralytics and export:")
    print("   pip install ultralytics")
    print("   python -c \"from ultralytics import YOLO; YOLO('yolov8n.pt').export(format='onnx')\"")
    
    return False

if __name__ == "__main__":
    print("🤖 YOLOv8 ONNX Model Downloader")
    print("=" * 35)
    
    success = download_model()
    
    if success:
        print("\n🚀 Ready to run: ./mvnw spring-boot:run")
        sys.exit(0)
    else:
        sys.exit(1)
