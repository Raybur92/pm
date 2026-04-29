#!/bin/bash
# Stop script for macOS and Linux

CONTAINER_NAME="pm-mvp"

echo "🛑 Stopping container..."

if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    docker stop "$CONTAINER_NAME" 2>/dev/null || true
    docker rm "$CONTAINER_NAME" 2>/dev/null || true
    echo "✓ Container stopped and removed"
else
    echo "⚠️  Container not running"
fi
