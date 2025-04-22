#!/bin/bash

# RadixInsight Analytics Platform Docker Deployment Script
# This script automates the Docker deployment process for the RadixInsight platform

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}  RadixInsight Analytics Platform Docker Deployment Script ${NC}"
echo -e "${BLUE}=========================================================${NC}"
echo ""

# Function to print status messages
print_status() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

# Function to print success messages
print_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to print warning messages
print_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to print error messages
print_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to check prerequisites
check_prerequisites() {
  print_status "Checking prerequisites..."
  
  # Check Docker
  if command_exists docker; then
    DOCKER_VERSION=$(docker --version)
    print_status "Docker is installed: $DOCKER_VERSION"
  else
    print_error "Docker is not installed. Please install Docker."
    exit 1
  fi
  
  # Check Docker Compose
  if command_exists docker-compose; then
    DOCKER_COMPOSE_VERSION=$(docker-compose --version)
    print_status "Docker Compose is installed: $DOCKER_COMPOSE_VERSION"
  else
    print_warning "Docker Compose is not installed. Some deployment options may not be available."
  fi
  
  print_success "Prerequisites check completed."
  echo ""
}

# Function to create Dockerfile
create_dockerfile() {
  print_status "Creating Dockerfile..."
  
  cat > Dockerfile <<EOL
FROM node:14-alpine

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
RUN npm run build

# Expose the port
EXPOSE \${PORT:-3000}

# Start the application
CMD ["npm", "start"]
EOL
  
  print_success "Dockerfile created successfully."
  echo ""
}

# Function to create Docker Compose file
create_docker_compose() {
  print_status "Creating Docker Compose file..."
  
  # Determine which database service to include based on DB_TYPE
  DB_SERVICE=""
  DB_DEPENDS=""
  
  case "${DB_TYPE:-postgresql}" in
    "postgresql")
      DB_SERVICE=$(cat <<EOL
  db:
    image: postgres:12
    environment:
      POSTGRES_DB: \${PG_DATABASE:-radixinsight}
      POSTGRES_USER: \${PG_USER:-postgres}
      POSTGRES_PASSWORD: \${PG_PASSWORD:-postgres}
    ports:
      - "\${PG_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
EOL
)
      DB_DEPENDS="      - db"
      ;;
    "mongodb")
      DB_SERVICE=$(cat <<EOL
  db:
    image: mongo:5
    environment:
      MONGO_INITDB_DATABASE: \${MONGO_DATABASE:-radixinsight}
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
EOL
)
      DB_DEPENDS="      - db"
      ;;
    "clickhouse")
      DB_SERVICE=$(cat <<EOL
  db:
    image: clickhouse/clickhouse-server:latest
    environment:
      CLICKHOUSE_DB: \${CH_DATABASE:-radixinsight}
      CLICKHOUSE_USER: \${CH_USER:-default}
      CLICKHOUSE_PASSWORD: \${CH_PASSWORD:-}
    ports:
      - "\${CH_PORT:-8123}:8123"
      - "9000:9000"
    volumes:
      - clickhouse_data:/var/lib/clickhouse
EOL
)
      DB_DEPENDS="      - db"
      ;;
    *)
      print_warning "Unknown database type: ${DB_TYPE}. No database service will be included."
      ;;
  esac
  
  # Determine if Redis service should be included
  REDIS_SERVICE=""
  REDIS_DEPENDS=""
  
  if [ "${USE_REDIS:-false}" = "true" ]; then
    REDIS_SERVICE=$(cat <<EOL
  redis:
    image: redis:6-alpine
    ports:
      - "\${REDIS_PORT:-6379}:6379"
    volumes:
      - redis_data:/data
EOL
)
    REDIS_DEPENDS="      - redis"
  fi
  
  # Create the Docker Compose file
  cat > docker-compose.yml <<EOL
version: '3'

services:
  app:
    build: .
    ports:
      - "\${PORT:-3000}:3000"
    environment:
      - NODE_ENV=\${NODE_ENV:-production}
      - PORT=\${PORT:-3000}
      - DB_TYPE=\${DB_TYPE:-postgresql}
      # PostgreSQL
      - PG_HOST=\${PG_HOST:-db}
      - PG_PORT=\${PG_PORT:-5432}
      - PG_DATABASE=\${PG_DATABASE:-radixinsight}
      - PG_USER=\${PG_USER:-postgres}
      - PG_PASSWORD=\${PG_PASSWORD:-postgres}
      # MongoDB
      - MONGO_URI=\${MONGO_URI:-mongodb://db:27017/radixinsight}
      # ClickHouse
      - CH_HOST=\${CH_HOST:-db}
      - CH_PORT=\${CH_PORT:-8123}
      - CH_DATABASE=\${CH_DATABASE:-radixinsight}
      - CH_USER=\${CH_USER:-default}
      - CH_PASSWORD=\${CH_PASSWORD:-}
      # Redis
      - REDIS_HOST=\${REDIS_HOST:-redis}
      - REDIS_PORT=\${REDIS_PORT:-6379}
      # JWT
      - JWT_SECRET=\${JWT_SECRET:-default-jwt-secret-change-in-production}
      - JWT_EXPIRATION=\${JWT_EXPIRATION:-86400}
      # Email
      - SMTP_HOST=\${SMTP_HOST:-}
      - SMTP_PORT=\${SMTP_PORT:-587}
      - SMTP_USER=\${SMTP_USER:-}
      - SMTP_PASSWORD=\${SMTP_PASSWORD:-}
      - SMTP_FROM=\${SMTP_FROM:-noreply@example.com}
      # Domain Restrictions
      - ALLOWED_EMAIL_DOMAINS=\${ALLOWED_EMAIL_DOMAINS:-}
      # Logging
      - LOG_LEVEL=\${LOG_LEVEL:-info}
    depends_on:
${DB_DEPENDS}
${REDIS_DEPENDS}
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
${DB_SERVICE}
${REDIS_SERVICE}

volumes:
  postgres_data:
  mongo_data:
  clickhouse_data:
  redis_data:
EOL
  
  print_success "Docker Compose file created successfully."
  echo ""
}

# Function to create .dockerignore file
create_dockerignore() {
  print_status "Creating .dockerignore file..."
  
  cat > .dockerignore <<EOL
node_modules
npm-debug.log
.git
.gitignore
.env
.env.example
.dockerignore
Dockerfile
docker-compose.yml
logs
*.log
EOL
  
  print_success ".dockerignore file created successfully."
  echo ""
}

# Function to build Docker image
build_docker_image() {
  print_status "Building Docker image..."
  
  docker build -t radixinsight .
  
  if [ $? -eq 0 ]; then
    print_success "Docker image built successfully."
  else
    print_error "Failed to build Docker image."
    exit 1
  fi
  
  echo ""
}

# Function to start Docker containers
start_docker_containers() {
  print_status "Starting Docker containers..."
  
  if command_exists docker-compose; then
    docker-compose up -d
    
    if [ $? -eq 0 ]; then
      print_success "Docker containers started successfully."
    else
      print_error "Failed to start Docker containers."
      exit 1
    fi
  else
    print_warning "Docker Compose is not installed. Starting only the application container..."
    
    docker run -d -p ${PORT:-3000}:3000 --name radixinsight radixinsight
    
    if [ $? -eq 0 ]; then
      print_success "Docker container started successfully."
    else
      print_error "Failed to start Docker container."
      exit 1
    fi
  fi
  
  echo ""
}

# Function to display deployment summary
display_summary() {
  print_status "Docker Deployment Summary"
  echo -e "${BLUE}=========================================================${NC}"
  echo -e "Application: RadixInsight Analytics Platform"
  echo -e "Environment: ${NODE_ENV:-"production"}"
  echo -e "Database: ${DB_TYPE:-"postgresql"}"
  echo -e "Port: ${PORT:-3000}"
  
  if command_exists docker-compose; then
    CONTAINER_STATUS=$(docker-compose ps)
  else
    CONTAINER_STATUS=$(docker ps --filter "name=radixinsight")
  fi
  
  echo -e "${BLUE}=========================================================${NC}"
  echo -e "Container Status:"
  echo -e "$CONTAINER_STATUS"
  echo -e "${BLUE}=========================================================${NC}"
  echo ""
  print_success "Docker deployment completed successfully!"
  print_status "The application should be available at: http://localhost:${PORT:-3000}"
  echo ""
}

# Main deployment process
main() {
  # Parse command line arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --env=*)
        export NODE_ENV="${1#*=}"
        shift
        ;;
      --db=*)
        export DB_TYPE="${1#*=}"
        shift
        ;;
      --port=*)
        export PORT="${1#*=}"
        shift
        ;;
      --redis)
        export USE_REDIS=true
        shift
        ;;
      --build-only)
        BUILD_ONLY=true
        shift
        ;;
      --help)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --env=ENVIRONMENT    Set the environment (development, production, test)"
        echo "  --db=DATABASE_TYPE   Set the database type (postgresql, mongodb, clickhouse)"
        echo "  --port=PORT          Set the application port"
        echo "  --redis              Include Redis service"
        echo "  --build-only         Only build the Docker image, don't start containers"
        echo "  --help               Display this help message"
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information."
        exit 1
        ;;
    esac
  done
  
  # Run deployment steps
  check_prerequisites
  create_dockerfile
  create_dockerignore
  create_docker_compose
  build_docker_image
  
  if [ "$BUILD_ONLY" != "true" ]; then
    start_docker_containers
    display_summary
  else
    print_status "Docker image built successfully. Skipping container start as requested."
  fi
}

# Run the main function
main "$@"
