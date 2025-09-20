FROM python:3.11-slim

# System deps for OpenCV + video codecs + ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg libgl1 libglib2.0-0 ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY env.example ./.env

# Ultralytics may download model caches to ~/.cache; set a writable HOME
ENV PYTHONUNBUFFERED=1 \
    UVICORN_WORKERS=1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
