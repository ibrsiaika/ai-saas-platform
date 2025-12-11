# AI SaaS Platform - Cloud Deployment Guide

## Overview
This guide covers the complete cloud deployment setup for the AI SaaS Platform using AWS infrastructure, Docker containers, and CI/CD pipelines.

## Architecture

### Infrastructure Components
- **Frontend**: Next.js application deployed on Vercel/AWS ECS
- **Backend**: Node.js/Express API with Socket.io on AWS ECS
- **Database**: PostgreSQL on AWS RDS
- **Cache**: Redis on AWS ElastiCache
- **Storage**: AWS S3 for file storage
- **Load Balancer**: AWS Application Load Balancer
- **Monitoring**: Prometheus, Grafana, Loki stack
- **CI/CD**: GitHub Actions with automated deployments

### Deployment Environments
- **Development**: Local Docker Compose
- **Staging**: AWS ECS with limited resources
- **Production**: AWS ECS with auto-scaling and high availability

## Prerequisites

### Required Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Terraform
wget https://releases.hashicorp.com/terraform/1.6.0/terraform_1.6.0_linux_amd64.zip
unzip terraform_1.6.0_linux_amd64.zip
sudo mv terraform /usr/local/bin/

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### AWS Configuration
```bash
# Configure AWS credentials
aws configure
# AWS Access Key ID: [Your Access Key]
# AWS Secret Access Key: [Your Secret Key]
# Default region name: us-east-1
# Default output format: json
```

## Local Development Setup

### Using Docker Compose
```bash
# Copy environment variables
cp .env.example .env

# Edit .env with your values
nano .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Manual Setup
```bash
# Start backend
cd backend
npm install
npm run dev

# Start frontend (in another terminal)
cd frontend
npm install
npm run dev

# Start monitoring stack
cd monitoring
docker-compose -f docker-compose.monitoring.yml up -d
```

## Production Deployment

### 1. Infrastructure Deployment
```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="environment=production" -var="domain_name=your-domain.com"

# Apply infrastructure
terraform apply

# Note the outputs (database endpoint, load balancer DNS, etc.)
```

### 2. Application Deployment
```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

### 3. DNS Configuration
```bash
# Get load balancer DNS from Terraform output
terraform output load_balancer_dns

# Create CNAME record in your DNS provider:
# CNAME: your-domain.com -> [load-balancer-dns]
```

## CI/CD Pipeline

### GitHub Actions Setup
1. Add secrets to your GitHub repository:
   ```
   AWS_ACCESS_KEY_ID
   AWS_SECRET_ACCESS_KEY
   AWS_REGION
   STAGING_URL
   PRODUCTION_URL
   SLACK_WEBHOOK (optional)
   ```

2. Push to trigger deployment:
   ```bash
   git push origin main        # Deploys to production
   git push origin develop     # Deploys to staging
   ```

### Pipeline Stages
1. **Test & Build**: Runs tests and builds applications
2. **Security Scan**: Vulnerability scanning with Trivy
3. **Docker Build**: Builds and pushes Docker images
4. **Deploy**: Deploys to staging/production
5. **Health Check**: Verifies deployment success
6. **Performance Test**: Runs Lighthouse and load tests

## Monitoring & Observability

### Metrics Dashboard
- **URL**: `http://your-domain.com:3001` (Grafana)
- **Login**: admin / admin123
- **Dashboards**: Pre-configured for application and infrastructure metrics

### Log Aggregation
- **Loki**: Centralized log collection
- **Promtail**: Log shipping agent
- **Grafana**: Log visualization and alerting

### Distributed Tracing
- **Jaeger**: `http://your-domain.com:16686`
- **Traces**: API requests, database queries, external service calls

### Alerting
- **AlertManager**: Handles alert routing and notification
- **Channels**: Slack, email, PagerDuty integration
- **Rules**: CPU usage, memory, error rates, response times

## Environment Variables

### Required Environment Variables
```bash
# Backend (.env)
NODE_ENV=production
JWT_SECRET=your-super-secure-jwt-secret
OPENAI_API_KEY=sk-your-openai-key
PINECONE_API_KEY=your-pinecone-key
PINECONE_ENVIRONMENT=your-pinecone-env
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://host:6379

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXT_PUBLIC_WS_URL=wss://api.your-domain.com
```

## Scaling Configuration

### Auto Scaling
```hcl
# ECS Service Auto Scaling
resource "aws_appautoscaling_target" "ecs_target" {
  max_capacity       = 10
  min_capacity       = 2
  resource_id        = "service/ai-saas-production/ai-saas-backend"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "scale_up" {
  name               = "scale-up"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.ecs_target.resource_id
  scalable_dimension = aws_appautoscaling_target.ecs_target.scalable_dimension
  service_namespace  = aws_appautoscaling_target.ecs_target.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
```

### Database Scaling
- **Read Replicas**: Automatic read scaling
- **Storage**: Auto-scaling from 20GB to 100GB
- **Connection Pooling**: PgBouncer for connection management

## Security Features

### Network Security
- **VPC**: Isolated network environment
- **Security Groups**: Firewall rules for each service
- **Private Subnets**: Database and cache in private networks
- **WAF**: Web Application Firewall for public endpoints

### Data Security
- **Encryption at Rest**: All data encrypted in RDS and S3
- **Encryption in Transit**: TLS/SSL for all communications
- **Secrets Management**: AWS Secrets Manager for sensitive data
- **IAM Roles**: Least privilege access for all services

### Application Security
- **JWT Authentication**: Secure token-based authentication
- **Rate Limiting**: API rate limiting with Redis
- **CORS**: Configured Cross-Origin Resource Sharing
- **Security Headers**: Comprehensive security headers in Nginx

## Backup & Recovery

### Database Backups
- **Automated Backups**: Daily backups with 7-day retention
- **Point-in-Time Recovery**: 5-minute granularity
- **Cross-Region Backups**: Automated cross-region backup

### Disaster Recovery
- **Multi-AZ Deployment**: High availability across availability zones
- **Auto Failover**: Automatic failover for RDS and ElastiCache
- **Blue-Green Deployment**: Zero-downtime deployments

## Cost Optimization

### Resource Optimization
- **Right-sizing**: t3.micro instances for development
- **Reserved Instances**: 1-year reservations for production
- **Spot Instances**: For non-critical workloads
- **Auto Scaling**: Scale down during low usage periods

### Monitoring Costs
- **CloudWatch**: Cost and usage monitoring
- **Budgets**: Alerts for unexpected cost increases
- **Cost Explorer**: Detailed cost analysis and optimization recommendations

## Troubleshooting

### Common Issues
1. **Database Connection**: Check security groups and connection strings
2. **Load Balancer Health**: Verify health check endpoints
3. **Container Startup**: Check ECS logs and environment variables
4. **SSL Certificate**: Ensure certificate is valid and properly configured

### Debug Commands
```bash
# Check ECS service status
aws ecs describe-services --cluster ai-saas-production --services ai-saas-backend

# View container logs
aws logs get-log-events --log-group-name /ecs/ai-saas-backend

# Check load balancer health
aws elbv2 describe-target-health --target-group-arn [target-group-arn]

# Test database connection
psql -h [rds-endpoint] -U ai_saas_user -d ai_saas_platform
```

## Support & Maintenance

### Regular Maintenance
- **Security Updates**: Monthly security patches
- **Dependency Updates**: Quarterly dependency updates
- **Performance Review**: Monthly performance optimization
- **Cost Review**: Quarterly cost optimization review

### Monitoring Checklist
- [ ] Application health checks passing
- [ ] Database performance within thresholds
- [ ] Error rates below 1%
- [ ] Response times under 500ms
- [ ] SSL certificates valid
- [ ] Backup jobs completing successfully
- [ ] Security scans passing
- [ ] Cost within budget

## Documentation Links
- [AWS Best Practices](https://aws.amazon.com/architecture/well-architected/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Terraform Documentation](https://www.terraform.io/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)