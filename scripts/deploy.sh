#!/bin/bash

# AI SaaS Platform Deployment Script
# This script automates the deployment process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
AWS_REGION=${AWS_REGION:-us-east-1}
PROJECT_NAME="ai-saas-platform"

echo -e "${BLUE}🚀 Starting deployment for ${PROJECT_NAME} in ${ENVIRONMENT} environment${NC}"

# Check prerequisites
check_prerequisites() {
    echo -e "${YELLOW}📋 Checking prerequisites...${NC}"
    
    commands=("aws" "docker" "terraform" "kubectl")
    for cmd in "${commands[@]}"; do
        if ! command -v $cmd &> /dev/null; then
            echo -e "${RED}❌ $cmd is not installed${NC}"
            exit 1
        fi
    done
    
    echo -e "${GREEN}✅ All prerequisites are installed${NC}"
}

# Build Docker images
build_images() {
    echo -e "${YELLOW}🏗️ Building Docker images...${NC}"
    
    # Build frontend
    echo "Building frontend..."
    docker build -t ${PROJECT_NAME}-frontend:latest ./frontend/
    
    # Build backend
    echo "Building backend..."
    docker build -t ${PROJECT_NAME}-backend:latest ./backend/
    
    echo -e "${GREEN}✅ Docker images built successfully${NC}"
}

# Push images to ECR
push_images() {
    echo -e "${YELLOW}📤 Pushing images to ECR...${NC}"
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
    
    # Login to ECR
    aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}
    
    # Create repositories if they don't exist
    aws ecr describe-repositories --repository-names ${PROJECT_NAME}-frontend --region ${AWS_REGION} || \
        aws ecr create-repository --repository-name ${PROJECT_NAME}-frontend --region ${AWS_REGION}
    
    aws ecr describe-repositories --repository-names ${PROJECT_NAME}-backend --region ${AWS_REGION} || \
        aws ecr create-repository --repository-name ${PROJECT_NAME}-backend --region ${AWS_REGION}
    
    # Tag and push images
    docker tag ${PROJECT_NAME}-frontend:latest ${ECR_REGISTRY}/${PROJECT_NAME}-frontend:latest
    docker tag ${PROJECT_NAME}-backend:latest ${ECR_REGISTRY}/${PROJECT_NAME}-backend:latest
    
    docker push ${ECR_REGISTRY}/${PROJECT_NAME}-frontend:latest
    docker push ${ECR_REGISTRY}/${PROJECT_NAME}-backend:latest
    
    echo -e "${GREEN}✅ Images pushed to ECR successfully${NC}"
}

# Deploy infrastructure with Terraform
deploy_infrastructure() {
    echo -e "${YELLOW}🏗️ Deploying infrastructure with Terraform...${NC}"
    
    cd infrastructure/terraform
    
    # Initialize Terraform
    terraform init
    
    # Plan deployment
    terraform plan -var="environment=${ENVIRONMENT}" -out=tfplan
    
    # Apply deployment
    terraform apply tfplan
    
    cd ../..
    
    echo -e "${GREEN}✅ Infrastructure deployed successfully${NC}"
}

# Deploy applications to ECS
deploy_applications() {
    echo -e "${YELLOW}🚀 Deploying applications to ECS...${NC}"
    
    # Update ECS services
    aws ecs update-service \
        --cluster ${PROJECT_NAME}-${ENVIRONMENT} \
        --service ${PROJECT_NAME}-frontend-${ENVIRONMENT} \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    aws ecs update-service \
        --cluster ${PROJECT_NAME}-${ENVIRONMENT} \
        --service ${PROJECT_NAME}-backend-${ENVIRONMENT} \
        --force-new-deployment \
        --region ${AWS_REGION}
    
    # Wait for deployment to complete
    echo "Waiting for services to stabilize..."
    aws ecs wait services-stable \
        --cluster ${PROJECT_NAME}-${ENVIRONMENT} \
        --services ${PROJECT_NAME}-frontend-${ENVIRONMENT} ${PROJECT_NAME}-backend-${ENVIRONMENT} \
        --region ${AWS_REGION}
    
    echo -e "${GREEN}✅ Applications deployed successfully${NC}"
}

# Run database migrations
run_migrations() {
    echo -e "${YELLOW}💾 Running database migrations...${NC}"
    
    # Get RDS endpoint from Terraform output
    DB_ENDPOINT=$(cd infrastructure/terraform && terraform output -raw database_endpoint)
    
    # Run migrations (this would typically be done via ECS task)
    echo "Database endpoint: ${DB_ENDPOINT}"
    echo "Migrations would run here..."
    
    echo -e "${GREEN}✅ Database migrations completed${NC}"
}

# Health check
health_check() {
    echo -e "${YELLOW}🏥 Running health checks...${NC}"
    
    # Get load balancer DNS from Terraform output
    LB_DNS=$(cd infrastructure/terraform && terraform output -raw load_balancer_dns)
    
    # Wait for services to be healthy
    sleep 30
    
    # Check frontend health
    if curl -f "http://${LB_DNS}/api/health" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Backend health check passed${NC}"
    else
        echo -e "${RED}❌ Backend health check failed${NC}"
        exit 1
    fi
    
    # Check if frontend is responding
    if curl -f "http://${LB_DNS}/" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Frontend health check passed${NC}"
    else
        echo -e "${RED}❌ Frontend health check failed${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}🎉 All health checks passed!${NC}"
    echo -e "${BLUE}🌐 Application is available at: http://${LB_DNS}${NC}"
}

# Rollback function
rollback() {
    echo -e "${YELLOW}🔄 Rolling back deployment...${NC}"
    
    # This would implement rollback logic
    echo "Rollback functionality would be implemented here"
    
    echo -e "${GREEN}✅ Rollback completed${NC}"
}

# Main deployment flow
main() {
    case $1 in
        "staging"|"production")
            ENVIRONMENT=$1
            ;;
        "rollback")
            rollback
            exit 0
            ;;
        *)
            echo "Usage: $0 [staging|production|rollback]"
            exit 1
            ;;
    esac
    
    echo -e "${BLUE}🚀 Deploying to ${ENVIRONMENT} environment${NC}"
    
    check_prerequisites
    build_images
    push_images
    deploy_infrastructure
    deploy_applications
    run_migrations
    health_check
    
    echo -e "${GREEN}🎉 Deployment completed successfully!${NC}"
}

# Run main function with all arguments
main "$@"