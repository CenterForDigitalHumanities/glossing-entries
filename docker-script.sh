#!/bin/bash
# Define variables
IMAGE_NAME="glossing_entries_image"
CONTAINER_NAME="glossing_entries_container"
PORT=8080
CURRENT_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
# Step 1: Build the Docker image
echo "Building Docker image..."
docker build -t ${IMAGE_NAME}:${CURRENT_TIMESTAMP} . || { echo "Docker build failed"; exit 1; }
docker tag ${IMAGE_NAME}:${CURRENT_TIMESTAMP} ${IMAGE_NAME}:latest
# Step 2: Stop and remove the existing container (if it exists)
EXISTING_CONTAINER=$(docker ps -q -f name=${CONTAINER_NAME})
if [ ! -z "$EXISTING_CONTAINER" ]; then
    echo "Stopping and removing existing container..."
    docker stop ${CONTAINER_NAME}
    docker rm ${CONTAINER_NAME}
fi
# Step 3: Run the new container
echo "Running new container..."
docker run -d --name ${CONTAINER_NAME} -p ${PORT}:80/tcp ${IMAGE_NAME}:latest || { echo "Docker run failed"; exit 1; }
echo "Container is up and running on port ${PORT}."