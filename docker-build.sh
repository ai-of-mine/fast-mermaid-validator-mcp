#!/bin/bash
# Build and push Docker image with CVE-2025-9230 fix
# This script builds multi-architecture images (amd64 and arm64)

set -e

VERSION="1.1.0"
IMAGE_NAME="gregoriomomm/fast-mermaid-validator-mcp"

echo "Building Docker image: ${IMAGE_NAME}:${VERSION}"
echo "Fixing CVE-2025-9230 (libssl3, libcrypto3)"
echo ""

# Check if Docker daemon is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker daemon is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi

# Build for current platform (faster for testing)
echo "Building for current platform..."
docker build \
    -t ${IMAGE_NAME}:${VERSION} \
    -t ${IMAGE_NAME}:latest \
    .

echo ""
echo "✅ Image built successfully for current platform"
echo ""

# Ask if user wants to build multi-arch and push
read -p "Build multi-arch (amd64/arm64) and push to Docker Hub? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Building multi-architecture images..."

    # Create buildx builder if it doesn't exist
    if ! docker buildx inspect multiarch-builder > /dev/null 2>&1; then
        echo "Creating buildx builder..."
        docker buildx create --name multiarch-builder --use
    else
        docker buildx use multiarch-builder
    fi

    # Build and push multi-arch
    docker buildx build \
        --platform linux/amd64,linux/arm64 \
        -t ${IMAGE_NAME}:${VERSION} \
        -t ${IMAGE_NAME}:latest \
        --push \
        .

    echo ""
    echo "✅ Multi-arch images built and pushed successfully!"
    echo ""
    echo "Images available:"
    echo "  - ${IMAGE_NAME}:${VERSION}"
    echo "  - ${IMAGE_NAME}:latest"
else
    echo ""
    echo "Skipping multi-arch build and push"
    echo ""
    echo "To push manually:"
    echo "  docker push ${IMAGE_NAME}:${VERSION}"
    echo "  docker push ${IMAGE_NAME}:latest"
fi

echo ""
echo "To run locally:"
echo "  docker run -p 8000:8000 ${IMAGE_NAME}:${VERSION}"
