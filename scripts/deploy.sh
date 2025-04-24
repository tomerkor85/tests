#!/bin/bash

# RadixInsight Analytics Platform Deployment Script
# This script automates the deployment process for the RadixInsight platform

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}     RadixInsight Analytics Platform Deployment Script    ${NC}"
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
  
  # Check Node.js
  if command_exists node; then
    NODE_VERSION=$(node -v)
    print_status "Node.js is installed: $NODE_VERSION"
    
    # Check Node.js version
    NODE_VERSION_NUM=$(echo $NODE_VERSION | cut -d 'v' -f 2)
    NODE_MAJOR=$(echo $NODE_VERSION_NUM | cut -d '.' -f 1)
    
    if [ "$NODE_MAJOR" -lt 14 ]; then
      print_warning "Node.js version is below 14. Recommended version is 14.x or higher."
    else
      print_success "Node.js version is compatible."
    fi
  else
    print_error "Node.js is not installed. Please install Node.js 14.x or higher."
    exit 1
  fi
  
  # Check npm
  if command_exists npm; then
    NPM_VERSION=$(npm -v)
    print_status "npm is installed: $NPM_VERSION"
  else
    print_error "npm is not installed. Please install npm."
    exit 1
  fi
  
  # Check database availability based on configuration
  if [ -n "$DB_TYPE" ]; then
    print_status "Checking database: $DB_TYPE"
    
    case "$DB_TYPE" in
      "postgresql")
        if command_exists psql; then
          print_success "PostgreSQL client is installed."
        else
          print_warning "PostgreSQL client is not installed. You may need to install it for database operations."
        fi
        ;;
      "mongodb")
        if command_exists mongosh || command_exists mongo; then
          print_success "MongoDB client is installed."
        else
          print_warning "MongoDB client is not installed. You may need to install it for database operations."
        fi
        ;;
      "clickhouse")
        if command_exists clickhouse-client; then
          print_success "ClickHouse client is installed."
        else
          print_warning "ClickHouse client is not installed. You may need to install it for database operations."
        fi
        ;;
      *)
        print_warning "Unknown database type: $DB_TYPE. Skipping database client check."
        ;;
    esac
  else
    print_warning "Database type not specified. Skipping database client check."
  fi
  
  print_success "Prerequisites check completed."
  echo ""
}

# Function to load environment variables
load_environment() {
  print_status "Loading environment variables..."
  
  # Check if .env file exists
  if [ -f .env ]; then
    print_status "Found .env file, loading variables..."
    export $(grep -v '^#' .env | xargs)
    print_success "Environment variables loaded from .env file."
  else
    print_warning "No .env file found. Using default or system environment variables."
    
    # Set default environment variables if not already set
    export NODE_ENV=${NODE_ENV:-"production"}
    export PORT=${PORT:-3000}
    export DB_TYPE=${DB_TYPE:-"postgresql"}
    
    # Create a sample .env file
    print_status "Creating a sample .env file..."
    cat > .env.example <<EOL
# RadixInsight Analytics Platform Environment Variables

# Node.js Environment
NODE_ENV=production
PORT=3000

# Database Configuration
DB_TYPE=postgresql # Options: postgresql, mongodb, clickhouse

# PostgreSQL Configuration (if using PostgreSQL)
PG_HOST=localhost
PG_PORT=5432
PG_DATABASE=radixinsight
PG_USER=postgres
PG_PASSWORD=postgres

# MongoDB Configuration (if using MongoDB)
MONGO_URI=mongodb://localhost:27017/radixinsight

# ClickHouse Configuration (if using ClickHouse)
CH_HOST=clickhouse
CH_PORT=8123
CH_DATABASE=radixinsight
CH_USER=default
CH_PASSWORD=

# Redis Configuration (optional, for caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Secret for Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=86400

# Email Configuration
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=noreply@example.com

# Domain Restrictions (comma-separated list, leave empty for no restriction)
ALLOWED_EMAIL_DOMAINS=radix-int.com

# Logging Configuration
LOG_LEVEL=info
EOL
    print_success "Sample .env file created as .env.example"
    print_warning "Please copy .env.example to .env and update the values before running the application."
  fi
  
  # Display current environment
  print_status "Current environment: ${NODE_ENV:-"not set"}"
  echo ""
}

# Function to install dependencies
install_dependencies() {
  print_status "Installing dependencies..."
  
  # Check if package.json exists
  if [ -f package.json ]; then
    print_status "Found package.json, installing dependencies..."
    npm install
    
    if [ $? -eq 0 ]; then
      print_success "Dependencies installed successfully."
    else
      print_error "Failed to install dependencies."
      exit 1
    fi
  else
    print_error "package.json not found. Cannot install dependencies."
    exit 1
  fi
  
  echo ""
}

# Function to build the project
build_project() {
  print_status "Building the project..."
  
  # Check if build script exists in package.json
  if grep -q "\"build\":" package.json; then
    print_status "Running build script..."
    npm run build
    
    if [ $? -eq 0 ]; then
      print_success "Project built successfully."
    else
      print_error "Failed to build the project."
      exit 1
    fi
  else
    print_warning "No build script found in package.json. Skipping build step."
  fi
  
  echo ""
}

# Function to initialize the database
initialize_database() {
  print_status "Initializing database..."
  
  # Check if db:init script exists in package.json
  if grep -q "\"db:init\":" package.json; then
    print_status "Running database initialization script..."
    npm run db:init
    
    if [ $? -eq 0 ]; then
      print_success "Database initialized successfully."
    else
      print_error "Failed to initialize the database."
      exit 1
    fi
  else
    print_warning "No db:init script found in package.json."
    
    # Check database type and run appropriate initialization
    if [ "$DB_TYPE" = "postgresql" ]; then
      if [ -f database/schema/postgres/init.sql ]; then
        print_status "Found PostgreSQL schema, initializing database..."
        
        # Check if database variables are set
        if [ -n "$PG_HOST" ] && [ -n "$PG_DATABASE" ] && [ -n "$PG_USER" ]; then
          PGPASSWORD=$PG_PASSWORD psql -h $PG_HOST -U $PG_USER -d $PG_DATABASE -f database/schema/postgres/init.sql
          
          if [ $? -eq 0 ]; then
            print_success "PostgreSQL database initialized successfully."
          else
            print_error "Failed to initialize PostgreSQL database."
            exit 1
          fi
        else
          print_error "PostgreSQL connection variables not set. Cannot initialize database."
          exit 1
        fi
      else
        print_warning "PostgreSQL schema file not found. Skipping database initialization."
      fi
    elif [ "$DB_TYPE" = "mongodb" ]; then
      print_status "MongoDB does not require schema initialization. Skipping."
    elif [ "$DB_TYPE" = "clickhouse" ]; then
      if [ -f database/schema/clickhouse/init.sql ]; then
        print_status "Found ClickHouse schema, initializing database..."
        
        # Check if database variables are set
        if [ -n "$CH_HOST" ] && [ -n "$CH_DATABASE" ]; then
          cat database/schema/clickhouse/init.sql | clickhouse-client --host=$CH_HOST --port=$CH_PORT --database=$CH_DATABASE --user=$CH_USER --password=$CH_PASSWORD
          
          if [ $? -eq 0 ]; then
            print_success "ClickHouse database initialized successfully."
          else
            print_error "Failed to initialize ClickHouse database."
            exit 1
          fi
        else
          print_error "ClickHouse connection variables not set. Cannot initialize database."
          exit 1
        fi
      else
        print_warning "ClickHouse schema file not found. Skipping database initialization."
      fi
    else
      print_warning "Unknown database type or not specified. Skipping database initialization."
    fi
  fi
  
  echo ""
}

# Function to run tests
run_tests() {
  print_status "Running tests..."
  
  # Check if test script exists in package.json
  if grep -q "\"test\":" package.json; then
    print_status "Running test script..."
    npm test
    
    if [ $? -eq 0 ]; then
      print_success "Tests passed successfully."
    else
      print_error "Tests failed."
      exit 1
    fi
  else
    print_warning "No test script found in package.json. Skipping tests."
  fi
  
  echo ""
}

# Function to start the application
start_application() {
  print_status "Starting the application..."
  
  # Check if start script exists in package.json
  if grep -q "\"start\":" package.json; then
    print_status "Running start script..."
    npm start
  else
    print_warning "No start script found in package.json. Trying to start server.js directly..."
    node server.js
  fi
  
  echo ""
}

# Function to generate deployment documentation
generate_deployment_docs() {
  print_status "Generating deployment documentation..."
  
  cat > DEPLOYMENT.md <<EOL
# RadixInsight Analytics Platform - Deployment Guide

This document provides instructions for deploying the RadixInsight Analytics Platform in various environments.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Installation](#installation)
4. [Database Setup](#database-setup)
5. [Running the Application](#running-the-application)
6. [Production Deployment](#production-deployment)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 14.x or higher
- npm 6.x or higher
- One of the following databases:
  - PostgreSQL 12.x or higher
  - MongoDB 5.x or higher
  - ClickHouse 21.x or higher
- Redis 6.x or higher (optional, for caching)
- SMTP server for email notifications

## Environment Configuration

1. Copy the sample environment file:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Edit the \`.env\` file and update the values according to your environment:
   \`\`\`bash
   # Database Configuration
   DB_TYPE=postgresql # Options: postgresql, mongodb, clickhouse
   
   # PostgreSQL Configuration (if using PostgreSQL)
   PG_HOST=localhost
   PG_PORT=5432
   PG_DATABASE=radixinsight
   PG_USER=postgres
   PG_PASSWORD=your-password
   
   # MongoDB Configuration (if using MongoDB)
   MONGO_URI=mongodb://localhost:27017/radixinsight
   
   # ClickHouse Configuration (if using ClickHouse)
   CH_HOST=clickhouse
   CH_PORT=8123
   CH_DATABASE=radixinsight
   CH_USER=default
   CH_PASSWORD=your-password
   
   # JWT Secret for Authentication
   JWT_SECRET=your-secret-key-here
   \`\`\`

## Installation

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Build the project:
   \`\`\`bash
   npm run build
   \`\`\`

## Database Setup

### PostgreSQL

1. Create the database:
   \`\`\`bash
   createdb radixinsight
   \`\`\`

2. Initialize the database schema:
   \`\`\`bash
   psql -d radixinsight -f database/schema/postgres/init.sql
   \`\`\`

### MongoDB

MongoDB does not require schema initialization. The collections will be created automatically when data is first inserted.

### ClickHouse

1. Create the database:
   \`\`\`bash
   clickhouse-client --query "CREATE DATABASE IF NOT EXISTS radixinsight"
   \`\`\`

2. Initialize the database schema:
   \`\`\`bash
   cat database/schema/clickhouse/init.sql | clickhouse-client --database=radixinsight
   \`\`\`

## Running the Application

### Development Mode

\`\`\`bash
npm run dev
\`\`\`

### Production Mode

\`\`\`bash
npm start
\`\`\`

The application will be available at http://localhost:3000 (or the port specified in your .env file).

## Production Deployment

### Using PM2

1. Install PM2:
   \`\`\`bash
   npm install -g pm2
   \`\`\`

2. Start the application with PM2:
   \`\`\`bash
   pm2 start server.js --name "radixinsight" --env production
   \`\`\`

3. Configure PM2 to start on system boot:
   \`\`\`bash
   pm2 startup
   pm2 save
   \`\`\`

### Using Docker

1. Build the Docker image:
   \`\`\`bash
   docker build -t radixinsight .
   \`\`\`

2. Run the container:
   \`\`\`bash
   docker run -d -p 3000:3000 --env-file .env --name radixinsight radixinsight
   \`\`\`

### Using Docker Compose

1. Create a \`docker-compose.yml\` file:
   \`\`\`yaml
   version: '3'
   services:
     app:
       build: .
       ports:
         - "3000:3000"
       env_file: .env
       depends_on:
         - db
     db:
       image: postgres:12
       environment:
         POSTGRES_DB: radixinsight
         POSTGRES_USER: postgres
         POSTGRES_PASSWORD: postgres
       volumes:
         - postgres_data:/var/lib/postgresql/data
   volumes:
     postgres_data:
   \`\`\`

2. Start the services:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

## Troubleshooting

### Database Connection Issues

- Verify that the database server is running
- Check the database connection parameters in the .env file
- Ensure that the database user has the necessary permissions

### Application Startup Issues

- Check the application logs for error messages
- Verify that all required environment variables are set
- Ensure that the port specified in the .env file is available

### Authentication Issues

- Verify that the JWT_SECRET is set in the .env file
- Check that the SMTP server is configured correctly for email verification
- Ensure that the allowed email domains are configured correctly

For additional support, please contact the RadixInsight team.
EOL
  
  print_success "Deployment documentation generated: DEPLOYMENT.md"
  echo ""
}

# Function to display deployment summary
display_summary() {
  print_status "Deployment Summary"
  echo -e "${BLUE}=========================================================${NC}"
  echo -e "Application: RadixInsight Analytics Platform"
  echo -e "Environment: ${NODE_ENV:-"not set"}"
  echo -e "Database: ${DB_TYPE:-"not set"}"
  echo -e "Port: ${PORT:-3000}"
  echo -e "${BLUE}=========================================================${NC}"
  echo ""
  print_success "Deployment completed successfully!"
  print_status "To start the application, run: npm start"
  print_status "For detailed deployment instructions, see: DEPLOYMENT.md"
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
      --skip-tests)
        SKIP_TESTS=true
        shift
        ;;
      --skip-build)
        SKIP_BUILD=true
        shift
        ;;
      --help)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --env=ENVIRONMENT    Set the environment (development, production, test)"
        echo "  --db=DATABASE_TYPE   Set the database type (postgresql, mongodb, clickhouse)"
        echo "  --port=PORT          Set the application port"
        echo "  --skip-tests         Skip running tests"
        echo "  --skip-build         Skip building the project"
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
  load_environment
  install_dependencies
  
  if [ "$SKIP_BUILD" != "true" ]; then
    build_project
  else
    print_warning "Skipping build step as requested."
  fi
  
  initialize_database
  
  if [ "$SKIP_TESTS" != "true" ]; then
    run_tests
  else
    print_warning "Skipping tests as requested."
  fi
  
  generate_deployment_docs
  display_summary
}

# Run the main function
main "$@"
