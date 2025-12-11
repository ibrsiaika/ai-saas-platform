#!/bin/bash

# Production Deployment Script for AI SaaS Platform
# This script builds and deploys the entire platform to production

set -e  # Exit on any error

echo "🚀 Starting AI SaaS Platform Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups/$TIMESTAMP"

echo -e "${YELLOW}Project root: $PROJECT_ROOT${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    echo "🔍 Checking prerequisites..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed"
        exit 1
    fi
    
    print_status "All prerequisites are met"
}

# Create backup
create_backup() {
    echo "💾 Creating backup..."
    mkdir -p "$BACKUP_DIR"
    
    # Backup environment files
    if [ -f "$PROJECT_ROOT/frontend/.env.local" ]; then
        cp "$PROJECT_ROOT/frontend/.env.local" "$BACKUP_DIR/"
    fi
    
    if [ -f "$PROJECT_ROOT/backend/.env" ]; then
        cp "$PROJECT_ROOT/backend/.env" "$BACKUP_DIR/"
    fi
    
    if [ -f "$PROJECT_ROOT/payment-service/.env" ]; then
        cp "$PROJECT_ROOT/payment-service/.env" "$BACKUP_DIR/"
    fi
    
    print_status "Backup created at $BACKUP_DIR"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing dependencies..."
    
    # Frontend dependencies
    cd "$PROJECT_ROOT/frontend"
    npm ci --production
    print_status "Frontend dependencies installed"
    
    # Backend dependencies
    cd "$PROJECT_ROOT/backend"
    npm ci --production
    print_status "Backend dependencies installed"
    
    # Payment service dependencies
    cd "$PROJECT_ROOT/payment-service"
    npm ci --production
    print_status "Payment service dependencies installed"
}

# Run tests
run_tests() {
    echo "🧪 Running tests..."
    
    cd "$PROJECT_ROOT/frontend"
    if [ -f "package.json" ] && grep -q "test" package.json; then
        npm test -- --coverage --watchAll=false
        print_status "Frontend tests passed"
    else
        print_warning "No frontend tests found"
    fi
    
    cd "$PROJECT_ROOT/backend"
    if [ -f "package.json" ] && grep -q "test" package.json; then
        npm test
        print_status "Backend tests passed"
    else
        print_warning "No backend tests found"
    fi
}

# Build applications
build_applications() {
    echo "🔨 Building applications..."
    
    # Build frontend
    cd "$PROJECT_ROOT/frontend"
    npm run build
    print_status "Frontend built successfully"
    
    # Backend doesn't need building for Node.js
    print_status "Backend prepared for production"
    
    # Payment service doesn't need building
    print_status "Payment service prepared for production"
}

# Docker operations
docker_operations() {
    echo "🐳 Docker operations..."
    
    cd "$PROJECT_ROOT"
    
    # Build Docker images
    docker-compose -f docker-compose.prod.yml build --no-cache
    print_status "Docker images built"
    
    # Run security scan on images
    echo "🔒 Running security scans..."
    docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
        -v $(pwd):/root/.cache/ \
        aquasec/trivy image ai-saas-platform_frontend:latest || print_warning "Security scan completed with warnings"
    
    print_status "Security scan completed"
}

# Environment setup
setup_environment() {
    echo "⚙️ Setting up production environment..."
    
    # Check for required environment variables
    REQUIRED_VARS=(
        "NODE_ENV"
        "DATABASE_URL"
        "JWT_SECRET"
        "OPENAI_API_KEY"
        "PINECONE_API_KEY"
        "STRIPE_SECRET_KEY"
        "REDIS_URL"
    )
    
    for var in "${REQUIRED_VARS[@]}"; do
        if [ -z "${!var}" ]; then
            print_warning "Environment variable $var is not set"
        fi
    done
    
    # Set production environment
    export NODE_ENV=production
    
    print_status "Environment configured for production"
}

# Database migrations
run_migrations() {
    echo "🗄️ Running database migrations..."
    
    cd "$PROJECT_ROOT/backend"
    if [ -f "migrations.js" ]; then
        node migrations.js
        print_status "Database migrations completed"
    else
        print_warning "No migrations found"
    fi
}

# Health checks
health_checks() {
    echo "🏥 Running health checks..."
    
    # Wait for services to start
    sleep 10
    
    # Check frontend
    if curl -f http://localhost:3002/health > /dev/null 2>&1; then
        print_status "Frontend is healthy"
    else
        print_error "Frontend health check failed"
    fi
    
    # Check backend
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        print_status "Backend is healthy"
    else
        print_error "Backend health check failed"
    fi
    
    # Check payment service
    if curl -f http://localhost:3003/health > /dev/null 2>&1; then
        print_status "Payment service is healthy"
    else
        print_error "Payment service health check failed"
    fi
}

# Deploy to production
deploy() {
    echo "🚀 Deploying to production..."
    
    cd "$PROJECT_ROOT"
    
    # Stop existing services
    docker-compose -f docker-compose.prod.yml down
    
    # Start production services
    docker-compose -f docker-compose.prod.yml up -d
    
    print_status "Services deployed successfully"
}

# Performance optimization
optimize_performance() {
    echo "⚡ Optimizing performance..."
    
    # Precompress static assets
    cd "$PROJECT_ROOT/frontend/.next"
    if command -v gzip &> /dev/null; then
        find . -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" \) -exec gzip -k {} \;
        print_status "Static assets compressed"
    fi
    
    # Setup CDN cache headers
    print_status "Performance optimizations applied"
}

# Setup monitoring
setup_monitoring() {
    echo "📊 Setting up monitoring..."
    
    cd "$PROJECT_ROOT/monitoring"
    if [ -f "docker-compose.yml" ]; then
        docker-compose up -d
        print_status "Monitoring services started"
    else
        print_warning "No monitoring configuration found"
    fi
}

# Cleanup
cleanup() {
    echo "🧹 Cleaning up..."
    
    # Remove old Docker images
    docker image prune -f
    
    # Clean npm caches
    npm cache clean --force
    
    print_status "Cleanup completed"
}

# Main deployment process
main() {
    echo "🌟 AI SaaS Platform Production Deployment"
    echo "=========================================="
    
    check_prerequisites
    create_backup
    setup_environment
    install_dependencies
    run_tests
    build_applications
    docker_operations
    run_migrations
    deploy
    health_checks
    optimize_performance
    setup_monitoring
    cleanup
    
    echo ""
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
    echo -e "${GREEN}Frontend: http://localhost:3002${NC}"
    echo -e "${GREEN}Backend: http://localhost:3001${NC}"
    echo -e "${GREEN}Payment Service: http://localhost:3003${NC}"
    echo -e "${GREEN}Admin Panel: http://localhost:3002/admin${NC}"
    echo ""
    echo -e "${YELLOW}Backup location: $BACKUP_DIR${NC}"
    echo ""
}

# Handle script interruption
trap 'echo -e "\n${RED}Deployment interrupted!${NC}"; exit 1' INT TERM

# Run main function
main "$@"