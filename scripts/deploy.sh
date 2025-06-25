#!/bin/bash

# N.Crisis Deploy Script for Homologation Environment
# Usage: ./deploy.sh [environment]

set -e  # Exit on any error

ENVIRONMENT=${1:-homolog}
APP_NAME="ncrisis"
COMPOSE_FILE="docker-compose.yml"

echo "🚀 Starting deployment for $APP_NAME in $ENVIRONMENT environment..."

# Check if Docker and Docker Compose are installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p uploads logs tmp
chmod 755 uploads logs tmp

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f $COMPOSE_FILE down --remove-orphans || true

# Remove old images (optional, comment out for faster deploys)
echo "🧹 Cleaning up old images..."
docker system prune -f || true

# Build and start services
echo "🏗️  Building and starting services..."
docker-compose -f $COMPOSE_FILE up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
for service in postgres redis app; do
    echo "Checking $service..."
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f $COMPOSE_FILE ps $service | grep -q "healthy\|Up"; then
            echo "✅ $service is ready"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ $service failed to start properly"
            docker-compose -f $COMPOSE_FILE logs $service
            exit 1
        fi
        
        echo "⏳ Waiting for $service... (attempt $attempt/$max_attempts)"
        sleep 5
        attempt=$((attempt + 1))
    done
done

# Test the application
echo "🧪 Testing application..."
sleep 5

if curl -f http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Application health check passed"
else
    echo "❌ Application health check failed"
    echo "📋 Application logs:"
    docker-compose -f $COMPOSE_FILE logs app
    exit 1
fi

# Show running services
echo "📊 Running services:"
docker-compose -f $COMPOSE_FILE ps

# Show useful information
echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📱 Application URL: http://localhost:8000"
echo "🗄️  Database: PostgreSQL on localhost:5432"
echo "🔄 Redis: localhost:6379"
echo ""
echo "📋 Useful commands:"
echo "  View logs: docker-compose logs -f [service]"
echo "  Stop: docker-compose down"
echo "  Restart: docker-compose restart [service]"
echo "  Shell access: docker-compose exec app sh"
echo ""
echo "🔍 Environment: $ENVIRONMENT"
echo "⏰ Deployed at: $(date)"
echo ""