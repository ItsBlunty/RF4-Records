#!/bin/bash

# Build script for Docker container
echo "Building RF4 Records Docker container..."

# Build the Docker image
docker build -t rf4-records:latest .

echo "Docker build complete!"
echo "To run locally: docker run -p 8000:8000 rf4-records:latest" 