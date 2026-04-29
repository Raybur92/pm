# Multi-stage Dockerfile for Project Management MVP

# Stage 1: Build Next.js frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend .
RUN npm run build

# Stage 2: Python backend with FastAPI
FROM python:3.11-slim

# Install uv package manager
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

WORKDIR /app

# Copy backend files
COPY backend/pyproject.toml pyproject.toml
COPY backend/app ./app
COPY .env.example .env

# Copy built frontend from Stage 1
COPY --from=frontend-builder /app/frontend/out ./static

# Install dependencies with uv
RUN uv pip install --system --no-cache-dir fastapi uvicorn sqlalchemy python-dotenv openai pydantic pydantic-settings

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Run application
CMD ["python", "-m", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
