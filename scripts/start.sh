#!/bin/bash
# Start script for macOS and Linux - builds and runs full PM MVP application

set -e

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

# Check if .env file exists, if not copy from .env.example
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your OPENROUTER_API_KEY"
fi

# Build the Docker image (multi-stage: frontend + backend)
echo "🔨 Building Docker image (Frontend + Backend)..."
docker build -t pm-mvp:latest .

# Ensure persistent data directory exists on the host
mkdir -p "$PROJECT_DIR/data"

# Run the container
echo "🚀 Starting container on http://localhost:8000..."
docker run -d \
    --name pm-mvp \
    -p 8000:8000 \
    --env-file .env \
    -e DB_PATH=/app/data/kanban.db \
    -v "$PROJECT_DIR/data:/app/data" \
    pm-mvp:latest

echo "✓ Server started!"
echo "📍 Kanban Board: http://localhost:8000"
echo "📖 API Docs: http://localhost:8000/docs"
echo "💚 Health: http://localhost:8000/health"
