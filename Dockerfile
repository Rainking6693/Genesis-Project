# Dockerfile for Genesis A2A Service
# Optimized for Railway deployment
# Supports: Railway, Render, Fly.io, Google Cloud Run, AWS ECS

FROM python:3.12-slim

# Set working directory
WORKDIR /app

# Install system dependencies in one layer (including git for git+ dependencies)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (for better layer caching)
# Try minimal requirements first, fallback to full if needed
COPY requirements_railway.txt requirements_production.txt ./

# Install Python dependencies
# Try minimal requirements first (faster, more reliable)
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir --timeout=300 -r requirements_railway.txt || \
    (echo "Minimal install failed, trying full requirements..." && \
     pip install --no-cache-dir --timeout=600 -r requirements_production.txt)

# Copy application code
COPY a2a_fastapi.py .
COPY infrastructure/ infrastructure/

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV GENESIS_ENV=production
ENV A2A_HOST=0.0.0.0
ENV PORT=8000
ENV A2A_PORT=8000

# Expose port (Railway uses PORT env var)
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

# Start application
CMD ["python", "a2a_fastapi.py"]
