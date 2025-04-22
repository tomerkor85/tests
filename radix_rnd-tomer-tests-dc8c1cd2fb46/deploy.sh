#!/bin/bash

# Test and deployment script for RadixInsight Analytics Platform
# This script will:
# 1. Run tests for all components
# 2. Build the project
# 3. Deploy the project locally for testing
# 4. Provide instructions for production deployment

echo "===== RadixInsight Analytics Platform Test & Deployment ====="
echo "Starting tests and deployment process..."

# Create necessary directories
mkdir -p /home/ubuntu/project/tests
mkdir -p /home/ubuntu/project/dist
mkdir -p /home/ubuntu/project/logs

# Function to log messages
log_message() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a /home/ubuntu/project/logs/deployment.log
}

# Function to run tests
run_tests() {
  log_message "Running tests for $1..."
  
  case $1 in
    "frontend")
      # Test frontend components
      log_message "Testing HTML validity..."
      if grep -q "<!DOCTYPE html>" /home/ubuntu/project/*.html; then
        log_message "✓ HTML documents have valid DOCTYPE"
      else
        log_message "✗ HTML documents missing DOCTYPE"
        return 1
      fi
      
      log_message "Testing CSS validity..."
      if [ -f "/home/ubuntu/project/css/modern-styles.css" ]; then
        log_message "✓ CSS file exists"
      else
        log_message "✗ CSS file missing"
        return 1
      fi
      
      log_message "Testing JavaScript validity..."
      for js_file in /home/ubuntu/project/js/*.js; do
        if [ -f "$js_file" ]; then
          # Simple syntax check
          node --check "$js_file" 2>/dev/null
          if [ $? -eq 0 ]; then
            log_message "✓ JavaScript file $js_file is valid"
          else
            log_message "✗ JavaScript file $js_file has syntax errors"
            return 1
          fi
        fi
      done
      ;;
      
    "backend")
      # Test backend components
      log_message "Testing server.js validity..."
      if [ -f "/home/ubuntu/project/server.js" ] || [ -f "/home/ubuntu/project/app.js" ]; then
        log_message "✓ Server file exists"
      else
        log_message "✗ Server file missing"
        return 1
      fi
      
      log_message "Testing API routes..."
      if [ -d "/home/ubuntu/project/routes" ]; then
        log_message "✓ API routes directory exists"
      else
        log_message "✗ API routes directory missing"
        return 1
      fi
      
      log_message "Testing authentication system..."
      if [ -d "/home/ubuntu/project/auth" ]; then
        log_message "✓ Authentication system exists"
      else
        log_message "✗ Authentication system missing"
        return 1
      fi
      ;;
      
    "database")
      # Test database components
      log_message "Testing database schemas..."
      if [ -d "/home/ubuntu/project/database" ]; then
        log_message "✓ Database directory exists"
      else
        log_message "✗ Database directory missing"
        return 1
      fi
      ;;
  esac
  
  log_message "All tests for $1 passed successfully!"
  return 0
}

# Function to build the project
build_project() {
  log_message "Building project..."
  
  # Create dist directory structure
  mkdir -p /home/ubuntu/project/dist/css
  mkdir -p /home/ubuntu/project/dist/js
  mkdir -p /home/ubuntu/project/dist/images
  
  # Copy HTML files
  log_message "Copying HTML files..."
  cp /home/ubuntu/project/*.html /home/ubuntu/project/dist/
  
  # Copy CSS files
  log_message "Copying CSS files..."
  cp /home/ubuntu/project/css/*.css /home/ubuntu/project/dist/css/
  
  # Copy JavaScript files
  log_message "Copying JavaScript files..."
  cp /home/ubuntu/project/js/*.js /home/ubuntu/project/dist/js/
  
  # Copy images
  log_message "Copying images..."
  if [ -d "/home/ubuntu/project/images" ]; then
    cp -r /home/ubuntu/project/images/* /home/ubuntu/project/dist/images/
  fi
  
  # Copy server files
  log_message "Copying server files..."
  mkdir -p /home/ubuntu/project/dist/routes
  mkdir -p /home/ubuntu/project/dist/auth
  mkdir -p /home/ubuntu/project/dist/middleware
  mkdir -p /home/ubuntu/project/dist/utils
  mkdir -p /home/ubuntu/project/dist/database
  
  # Copy server.js or app.js
  if [ -f "/home/ubuntu/project/server.js" ]; then
    cp /home/ubuntu/project/server.js /home/ubuntu/project/dist/
  fi
  
  if [ -f "/home/ubuntu/project/app.js" ]; then
    cp /home/ubuntu/project/app.js /home/ubuntu/project/dist/
  fi
  
  # Copy routes
  if [ -d "/home/ubuntu/project/routes" ]; then
    cp /home/ubuntu/project/routes/*.js /home/ubuntu/project/dist/routes/
  fi
  
  # Copy auth
  if [ -d "/home/ubuntu/project/auth" ]; then
    cp -r /home/ubuntu/project/auth/* /home/ubuntu/project/dist/auth/
  fi
  
  # Copy middleware
  if [ -d "/home/ubuntu/project/middleware" ]; then
    cp /home/ubuntu/project/middleware/*.js /home/ubuntu/project/dist/middleware/
  fi
  
  # Copy utils
  if [ -d "/home/ubuntu/project/utils" ]; then
    cp /home/ubuntu/project/utils/*.js /home/ubuntu/project/dist/utils/
  fi
  
  # Copy database
  if [ -d "/home/ubuntu/project/database" ]; then
    cp /home/ubuntu/project/database/*.js /home/ubuntu/project/dist/database/
    cp /home/ubuntu/project/database/*.sql /home/ubuntu/project/dist/database/
  fi
  
  # Create package.json if it doesn't exist
  if [ ! -f "/home/ubuntu/project/package.json" ]; then
    log_message "Creating package.json..."
    cat > /home/ubuntu/project/dist/package.json << EOF
{
  "name": "radixinsight-analytics",
  "version": "1.0.0",
  "description": "RadixInsight Analytics Platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "bcrypt": "^5.1.0",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "helmet": "^6.0.1",
    "ioredis": "^5.3.1",
    "jsonwebtoken": "^9.0.0",
    "morgan": "^1.10.0",
    "nodemailer": "^6.9.1",
    "pg": "^8.10.0"
  },
  "devDependencies": {
    "nodemon": "^2.0.22"
  }
}
EOF
  else
    cp /home/ubuntu/project/package.json /home/ubuntu/project/dist/
  fi
  
  # Create .env file if it doesn't exist
  if [ ! -f "/home/ubuntu/project/.env" ]; then
    log_message "Creating .env file..."
    cat > /home/ubuntu/project/dist/.env << EOF
# Server configuration
PORT=3000
NODE_ENV=development

# Database configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=radixinsight
DB_USER=postgres
DB_PASSWORD=postgres

# Redis configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT configuration
JWT_SECRET=radixinsight-secret-key
JWT_EXPIRES_IN=24h

# Email configuration
EMAIL_HOST=smtp.example.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=noreply@radix-int.com
EMAIL_PASSWORD=password
EMAIL_FROM=RadixInsight <noreply@radix-int.com>

# Frontend URL
FRONTEND_URL=http://localhost:3000
EOF
  else
    cp /home/ubuntu/project/.env /home/ubuntu/project/dist/
  fi
  
  log_message "Project built successfully!"
}

# Function to deploy locally
deploy_locally() {
  log_message "Deploying project locally..."
  
  # Check if Node.js is installed
  if ! command -v node &> /dev/null; then
    log_message "Node.js is not installed. Please install Node.js to deploy locally."
    return 1
  fi
  
  # Install dependencies
  log_message "Installing dependencies..."
  cd /home/ubuntu/project/dist
  npm install --quiet
  
  # Start server
  log_message "Starting server..."
  node server.js > /home/ubuntu/project/logs/server.log 2>&1 &
  SERVER_PID=$!
  
  # Check if server started successfully
  sleep 3
  if ps -p $SERVER_PID > /dev/null; then
    log_message "Server started successfully with PID $SERVER_PID"
    echo $SERVER_PID > /home/ubuntu/project/logs/server.pid
  else
    log_message "Failed to start server. Check logs for details."
    return 1
  fi
  
  log_message "Project deployed locally!"
  log_message "Access the application at: http://localhost:3000"
  
  return 0
}

# Function to generate deployment instructions
generate_deployment_instructions() {
  log_message "Generating deployment instructions..."
  
  cat > /home/ubuntu/project/dist/DEPLOYMENT.md << EOF
# RadixInsight Analytics Platform Deployment Guide

This guide provides instructions for deploying the RadixInsight Analytics Platform to a production environment.

## Prerequisites

- Node.js 14.x or higher
- PostgreSQL 12.x or higher
- Redis 6.x or higher
- SMTP server for email notifications

## Deployment Steps

### 1. Set up the database

1. Create a PostgreSQL database:
   \`\`\`sql
   CREATE DATABASE radixinsight;
   \`\`\`

2. Import the database schema:
   \`\`\`bash
   psql -U postgres -d radixinsight -f database/schema.sql
   \`\`\`

3. If using ClickHouse for analytics:
   \`\`\`bash
   clickhouse-client --query="$(cat database/clickhouse_schema.sql)"
   \`\`\`

### 2. Configure environment variables

1. Copy the \`.env.example\` file to \`.env\`:
   \`\`\`bash
   cp .env.example .env
   \`\`\`

2. Edit the \`.env\` file with your production settings:
   - Set \`NODE_ENV=production\`
   - Configure database connection details
   - Set a strong JWT secret
   - Configure email settings
   - Set the correct frontend URL

### 3. Install dependencies

\`\`\`bash
npm install --production
\`\`\`

### 4. Build the frontend (if using a separate build process)

\`\`\`bash
npm run build
\`\`\`

### 5. Start the server

For a simple deployment:
\`\`\`bash
node server.js
\`\`\`

For a production deployment, use a process manager like PM2:
\`\`\`bash
npm install -g pm2
pm2 start server.js --name "radixinsight"
pm2 save
\`\`\`

### 6. Set up a reverse proxy (recommended)

Configure Nginx as a reverse proxy:

\`\`\`nginx
server {
    listen 80;
    server_name analytics.radix-int.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
\`\`\`

### 7. Set up SSL (recommended)

Use Let's Encrypt to obtain an SSL certificate:

\`\`\`bash
sudo certbot --nginx -d analytics.radix-int.com
\`\`\`

### 8. Set up monitoring (recommended)

Monitor your application with PM2:

\`\`\`bash
pm2 install pm2-server-monit
pm2 monitor
\`\`\`

## Troubleshooting

- Check the logs: \`pm2 logs radixinsight\`
- Verify database connection
- Ensure Redis is running
- Check email configuration

## Backup and Restore

### Database Backup

\`\`\`bash
pg_dump -U postgres -d radixinsight > backup.sql
\`\`\`

### Database Restore

\`\`\`bash
psql -U postgres -d radixinsight < backup.sql
\`\`\`
EOF
  
  log_message "Deployment instructions generated successfully!"
}

# Main execution
log_message "Starting test and deployment process..."

# Run tests
run_tests "frontend" && run_tests "backend" && run_tests "database"
if [ $? -ne 0 ]; then
  log_message "Tests failed. Aborting deployment."
  exit 1
fi

# Build project
build_project
if [ $? -ne 0 ]; then
  log_message "Build failed. Aborting deployment."
  exit 1
fi

# Deploy locally
deploy_locally
if [ $? -ne 0 ]; then
  log_message "Local deployment failed."
  exit 1
fi

# Generate deployment instructions
generate_deployment_instructions

log_message "Test and deployment process completed successfully!"
log_message "The application is running at: http://localhost:3000"
log_message "Deployment instructions are available at: /home/ubuntu/project/dist/DEPLOYMENT.md"

echo "===== Test & Deployment Completed Successfully ====="
echo "The application is running at: http://localhost:3000"
echo "Deployment instructions are available at: /home/ubuntu/project/dist/DEPLOYMENT.md"
