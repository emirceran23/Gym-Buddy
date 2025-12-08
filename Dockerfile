# Use Python 3.10 slim image (compatible with MediaPipe)
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies required for OpenCV and MediaPipe
# Note: libgl1-mesa-glx has been replaced with libgl1 in newer Debian versions
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY azure-requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r azure-requirements.txt

# Copy application files
COPY server/ ./server/
COPY scripts/ ./scripts/
COPY model_training/biceps_model.pkl ./model_training/biceps_model.pkl
COPY model_training/scaler.pkl ./model_training/scaler.pkl
COPY model_training/feature_extractor.py ./model_training/feature_extractor.py
COPY model_training/predict.py ./model_training/predict.py
COPY model_training/biceps_curl_rf_augmented.joblib ./model_training/biceps_curl_rf_augmented.joblib

# Create directory for static files (videos)
RUN mkdir -p /app/server/static/videos

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV FLASK_APP=server/app.py

# Expose port (Azure will set PORT env variable)
EXPOSE 8000

# Run the application with Gunicorn (single worker for in-memory state sharing)
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT:-8000} --workers 1 --threads 4 --timeout 300 --chdir /app server.app:app"]
