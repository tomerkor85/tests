#!/bin/bash

# RadixInsight Analytics Platform Packaging Script
# This script packages the RadixInsight platform for distribution

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}=========================================================${NC}"
echo -e "${BLUE}     RadixInsight Analytics Platform Packaging Script     ${NC}"
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

# Function to create package directory structure
create_package_structure() {
  print_status "Creating package directory structure..."
  
  # Create directories
  mkdir -p "$PACKAGE_DIR"
  mkdir -p "$PACKAGE_DIR/docs"
  
  print_success "Package directory structure created."
  echo ""
}

# Function to copy source files
copy_source_files() {
  print_status "Copying source files..."
  
  # Copy all files except node_modules, .git, etc.
  rsync -av --exclude='node_modules' --exclude='.git' --exclude='.env' \
    --exclude='*.log' --exclude='logs' --exclude='tmp' \
    "$SOURCE_DIR/" "$PACKAGE_DIR/"
  
  print_success "Source files copied."
  echo ""
}

# Function to create documentation
create_documentation() {
  print_status "Creating documentation..."
  
  # Copy existing documentation
  cp "$SOURCE_DIR/README.md" "$PACKAGE_DIR/docs/"
  cp "$SOURCE_DIR/DOCUMENTATION.md" "$PACKAGE_DIR/docs/"
  
  # Create CHANGELOG.md
  cat > "$PACKAGE_DIR/docs/CHANGELOG.md" <<EOL
# RadixInsight Analytics Platform - Changelog

## Version 2.0.0 (April 22, 2025)

### Major Features

#### Database Abstraction Layer
- Created a flexible database abstraction layer
- Added support for PostgreSQL, ClickHouse, and MongoDB
- Implemented adapters for each database system
- Provided a unified API for database operations

#### SDK Improvements
- Simplified SDK implementation
- Created a minimal bootstrapping interface
- Added comprehensive documentation
- Provided examples for browser and Node.js environments

#### Link Validation System
- Implemented a system to scan HTML and Markdown files for broken links
- Added validation for API endpoints and documentation references
- Created both CLI and API interfaces for integration

#### Visualization Components
- Developed dynamic visualization components using D3.js
- Added pie charts, data tables, and flow diagrams
- Implemented SVG/PNG export functionality
- Created a demo page to showcase the components

#### User Flow Tracking
- Implemented comprehensive user flow tracking
- Added support for tracking complete user journeys
- Created API endpoints for retrieving and analyzing flow data
- Integrated with the client-side JavaScript library

#### Advanced Analytics Features
- Added cohort analysis for tracking user groups over time
- Implemented A/B testing with statistical significance calculations
- Created session recording with privacy controls
- Added anomaly detection using multiple detection methods
- Implemented heatmaps integration for visualizing user interactions

### Other Improvements
- Updated documentation with comprehensive information about all features
- Created deployment scripts for various environments
- Added Docker deployment support
- Implemented comprehensive testing for all components

## Version 1.0.0 (Initial Release)

- Modern minimalist UI with clean interface
- Comprehensive visualizations with charts and diagrams
- Secure authentication with email verification
- PostgreSQL for metadata and ClickHouse for analytics data
- Complete API with RESTful endpoints
- Interactive dashboards with real-time data visualization
EOL
  
  # Create UPGRADE.md
  cat > "$PACKAGE_DIR/docs/UPGRADE.md" <<EOL
# RadixInsight Analytics Platform - Upgrade Guide

This document provides instructions for upgrading from version 1.0.0 to version 2.0.0 of the RadixInsight Analytics Platform.

## Upgrading from 1.0.0 to 2.0.0

### Database Changes

#### Using the New Database Abstraction Layer

The platform now uses a database abstraction layer that supports PostgreSQL, ClickHouse, and MongoDB. To configure your database:

1. Update your configuration in \`config/database.js\`:

\`\`\`javascript
module.exports = {
  default: 'postgresql', // or 'mongodb', 'clickhouse'
  connections: {
    postgresql: {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DATABASE || 'radixinsight',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres'
    },
    mongodb: {
      connectionString: process.env.MONGO_URI || 'mongodb://localhost:27017/radixinsight'
    },
    clickhouse: {
      host: process.env.CH_HOST || 'localhost',
      port: process.env.CH_PORT || 8123,
      database: process.env.CH_DATABASE || 'radixinsight',
      user: process.env.CH_USER || 'default',
      password: process.env.CH_PASSWORD || ''
    }
  }
};
\`\`\`

2. Update your code to use the new database abstraction layer:

\`\`\`javascript
const { DatabaseFactory } = require('./database/abstraction');

// Create a database instance
const db = DatabaseFactory.createDatabase('postgresql', {
  host: 'localhost',
  port: 5432,
  database: 'radixinsight',
  user: 'postgres',
  password: 'postgres'
});

// Initialize the connection
await db.initialize();

// Use the database
const results = await db.query('users', { email: 'user@example.com' });
\`\`\`

#### Migrating to MongoDB (Optional)

If you want to migrate from PostgreSQL to MongoDB:

1. Install MongoDB:
   \`\`\`bash
   # Ubuntu/Debian
   sudo apt-get install -y mongodb
   
   # macOS
   brew install mongodb-community
   \`\`\`

2. Export your data from PostgreSQL:
   \`\`\`bash
   pg_dump -U postgres -d radixinsight -t users -t projects -t events > pg_data.sql
   \`\`\`

3. Use the provided migration script:
   \`\`\`bash
   node scripts/migrate-pg-to-mongo.js
   \`\`\`

### SDK Changes

The SDK has been simplified and improved. To use the new SDK:

1. Install the SDK package:
   \`\`\`bash
   npm install radix-insight-sdk
   \`\`\`

2. Update your client-side code:
   \`\`\`javascript
   import { initRadix } from 'radix-insight-sdk';

   const analytics = initRadix({
     apiKey: 'your-api-key',
     projectId: 'your-project-id'
   });

   // Track an event
   analytics.track('button_click', {
     buttonId: 'signup-button',
     page: '/landing'
   });
   \`\`\`

### New Features

#### Link Validation

To use the link validation system:

\`\`\`bash
# CLI usage
node utils/link-validator/cli.js --dir ./docs --output validation-report.json

# API usage
const { validateLinks } = require('./utils/link-validator');

const results = await validateLinks({
  directories: ['./docs', './public'],
  excludePatterns: ['node_modules', '.git']
});
\`\`\`

#### Visualization Components

To use the visualization components:

\`\`\`html
<div id="chart-container"></div>

<script src="/js/visualizations/index.js"></script>
<script>
  const pieChart = RadixVisualizations.createPieChart('#chart-container', {
    data: [
      { label: 'Category A', value: 30 },
      { label: 'Category B', value: 45 },
      { label: 'Category C', value: 25 }
    ],
    title: 'Sales by Category'
  });
</script>
\`\`\`

#### User Flow Tracking

To use user flow tracking:

\`\`\`javascript
const UserFlowTracker = require('./modules/user-flow-tracking');

const flowTracker = new UserFlowTracker({
  dbType: 'mongodb',
  dbConfig: { /* database configuration */ }
});

// Start tracking a user flow
const flow = await flowTracker.startFlow({
  userId: 'user123',
  sessionId: 'session456',
  startPage: '/login'
});
\`\`\`

#### Advanced Analytics Features

See the README.md and DOCUMENTATION.md files for detailed information on using the new analytics features.

### Deployment Changes

The platform now includes deployment scripts for various environments:

\`\`\`bash
# Standard deployment
./scripts/deploy.sh

# Docker deployment
./scripts/docker-deploy.sh
\`\`\`

## Need Help?

If you encounter any issues during the upgrade process, please contact the RadixInsight team for assistance.
EOL
  
  # Create FEATURES.md
  cat > "$PACKAGE_DIR/docs/FEATURES.md" <<EOL
# RadixInsight Analytics Platform - Features

This document provides a detailed overview of all features available in the RadixInsight Analytics Platform.

## Core Features

### Database Abstraction Layer

The database abstraction layer provides a unified interface for database operations across different database systems:

- **Multi-Database Support**: PostgreSQL, ClickHouse, and MongoDB
- **Unified API**: Consistent interface for all database operations
- **Easy Configuration**: Simple configuration through environment variables
- **Seamless Switching**: Change database systems without changing application code

### SDK

The RadixInsight SDK provides an easy way to integrate analytics into web and Node.js applications:

- **Minimal Bootstrapping**: Simple initialization with \`import { initRadix } from 'radix-insight-sdk'\`
- **Automatic Event Batching**: Efficient event collection and transmission
- **Session Management**: Automatic session tracking and management
- **User Identification**: Easy user identification and tracking
- **Cross-Platform**: Works in both browser and Node.js environments

### Link Validation System

The link validation system checks for broken links in HTML and Markdown files:

- **Comprehensive Scanning**: Scans all HTML and Markdown files for links
- **Validation**: Validates both internal and external links
- **API Endpoint Checking**: Checks API endpoints for proper functionality
- **Detailed Reporting**: Reports failures in a detailed log file
- **Multiple Interfaces**: Provides both CLI and API interfaces

### Visualization Components

The visualization components provide interactive data visualizations using D3.js:

- **Pie Charts**: Standard and donut charts with interactive legends
- **Data Tables**: Sortable, paginated tables with search functionality
- **Flow Diagrams**: Visualize user journeys and conversion funnels
- **Export Functionality**: Export visualizations as SVG or PNG
- **Responsive Design**: Adapts to container size
- **Interactive Elements**: Hover effects and tooltips
- **Customizable Styling**: Extensive configuration options

### User Flow Tracking

The user flow tracking system tracks complete user journeys through the application:

- **Complete Journey Tracking**: Tracks user flows from login to logout
- **Event Sequencing**: Records all user actions and events in sequence
- **Multi-Database Support**: Stores flow data in PostgreSQL, ClickHouse, or MongoDB
- **Analysis Tools**: Provides methods for retrieving and analyzing flow data
- **REST API**: Complete API for flow management and retrieval
- **Client-Side Integration**: JavaScript library for automatic tracking

## Advanced Analytics Features

### Cohort Analysis

Track user groups over time to analyze retention, conversion, and behavior patterns:

- **User Grouping**: Create cohorts based on various criteria
- **Retention Analysis**: Track how many users return over time
- **Conversion Tracking**: Measure conversion rates for different cohorts
- **Behavior Patterns**: Analyze how different cohorts interact with your application
- **Dynamic Cohorts**: Automatically update cohorts as new users match criteria

### A/B Testing

Create experiments, assign users to variants, and track results with statistical significance:

- **Experiment Creation**: Create A/B tests with multiple variants
- **User Assignment**: Assign users to variants based on configurable weights
- **Conversion Tracking**: Track conversions for each variant
- **Statistical Analysis**: Calculate statistical significance of results
- **Winner Selection**: Automatically determine the winning variant

### Session Recording

Capture user interactions for playback and analysis with privacy controls:

- **Interaction Capture**: Record clicks, form inputs, and page navigation
- **Playback**: Replay user sessions to understand behavior
- **Privacy Controls**: Mask sensitive data and provide opt-out options
- **Filtering**: Find recordings based on user, page, or event criteria
- **Integration**: Connect recordings to other analytics data

### Anomaly Detection

Identify unusual patterns in metrics using multiple detection methods:

- **Multiple Detection Methods**: Z-score, IQR, moving average, and more
- **Real-Time Monitoring**: Detect anomalies as they occur
- **Configurable Sensitivity**: Adjust detection sensitivity to reduce false positives
- **Alerting**: Generate alerts when anomalies are detected
- **Historical Analysis**: Analyze past anomalies to identify patterns

### Heatmaps

Visualize user interactions on web pages to identify popular areas:

- **Click Heatmaps**: Visualize where users click on your pages
- **Move Heatmaps**: Track mouse movement patterns
- **Scroll Heatmaps**: See how far users scroll down your pages
- **Device Segmentation**: Separate heatmaps for desktop, tablet, and mobile
- **Screenshot Integration**: Overlay heatmaps on page screenshots

## Additional Features

### Authentication System

The platform implements a secure authentication system:

- **Email Verification**: Require email verification for new accounts
- **Domain Restrictions**: Restrict registration to specific email domains
- **JWT Tokens**: Secure API authentication using JWT
- **Password Reset**: Provide password reset functionality

### API

The platform provides a comprehensive API for integration:

- **RESTful Endpoints**: Well-designed RESTful API
- **Authentication**: Secure authentication using JWT
- **Comprehensive Coverage**: API endpoints for all platform functionality
- **Documentation**: Detailed API documentation

### Deployment

The platform includes deployment scripts for various environments:

- **Standard Deployment**: Deploy to a standard Node.js environment
- **Docker Deployment**: Deploy using Docker and Docker Compose
- **Environment Configuration**: Configure the application using environment variables
- **Database Initialization**: Automatically initialize the database schema
EOL
  
  print_success "Documentation created."
  echo ""
}

# Function to create .env.example file
create_env_example() {
  print_status "Creating .env.example file..."
  
  cat > "$PACKAGE_DIR/.env.example" <<EOL
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
CH_HOST=localhost
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
  
  print_success ".env.example file created."
  echo ""
}

# Function to create migration scripts
create_migration_scripts() {
  print_status "Creating migration scripts..."
  
  mkdir -p "$PACKAGE_DIR/scripts/migrations"
  
  # Create PostgreSQL to MongoDB migration script
  cat > "$PACKAGE_DIR/scripts/migrations/migrate-pg-to-mongo.js" <<EOL
/**
 * RadixInsight Analytics Platform
 * PostgreSQL to MongoDB Migration Script
 * 
 * This script migrates data from PostgreSQL to MongoDB
 */

const { Client } = require('pg');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  postgresql: {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'radixinsight',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres'
  },
  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/radixinsight'
  },
  batchSize: 1000,
  logFile: path.join(__dirname, 'migration.log')
};

// Logger
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = \`[\${timestamp}] \${message}\n\`;
    console.log(logMessage.trim());
    fs.appendFileSync(config.logFile, logMessage);
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    const errorMessage = \`[\${timestamp}] ERROR: \${message}\n\${error ? error.stack : ''}\n\`;
    console.error(errorMessage.trim());
    fs.appendFileSync(config.logFile, errorMessage);
  }
};

// Initialize log file
fs.writeFileSync(config.logFile, \`Migration started at \${new Date().toISOString()}\n\n\`);

// Connect to PostgreSQL
async function connectToPostgres() {
  logger.log('Connecting to PostgreSQL...');
  const client = new Client(config.postgresql);
  await client.connect();
  logger.log('Connected to PostgreSQL');
  return client;
}

// Connect to MongoDB
async function connectToMongo() {
  logger.log('Connecting to MongoDB...');
  const client = new MongoClient(config.mongodb.uri);
  await client.connect();
  logger.log('Connected to MongoDB');
  return client;
}

// Get table names from PostgreSQL
async function getTableNames(pgClient) {
  logger.log('Getting table names from PostgreSQL...');
  const result = await pgClient.query(\`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
  \`);
  const tableNames = result.rows.map(row => row.table_name);
  logger.log(\`Found \${tableNames.length} tables: \${tableNames.join(', ')}\`);
  return tableNames;
}

// Get table schema from PostgreSQL
async function getTableSchema(pgClient, tableName) {
  logger.log(\`Getting schema for table \${tableName}...\`);
  const result = await pgClient.query(\`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    ORDER BY ordinal_position
  \`, [tableName]);
  logger.log(\`Schema for \${tableName}: \${JSON.stringify(result.rows)}\`);
  return result.rows;
}

// Migrate table data
async function migrateTable(pgClient, mongoClient, tableName) {
  logger.log(\`Migrating table \${tableName}...\`);
  
  // Get total count
  const countResult = await pgClient.query(\`SELECT COUNT(*) FROM \${tableName}\`);
  const totalCount = parseInt(countResult.rows[0].count);
  logger.log(\`Total records in \${tableName}: \${totalCount}\`);
  
  // Get MongoDB collection
  const db = mongoClient.db();
  const collection = db.collection(tableName);
  
  // Drop collection if it exists
  try {
    await collection.drop();
    logger.log(\`Dropped existing collection \${tableName}\`);
  } catch (error) {
    // Collection doesn't exist, which is fine
  }
  
  // Create indexes if needed
  if (tableName === 'users') {
    await collection.createIndex({ email: 1 }, { unique: true });
    logger.log('Created unique index on users.email');
  } else if (tableName === 'events') {
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ sessionId: 1 });
    await collection.createIndex({ timestamp: 1 });
    logger.log('Created indexes on events collection');
  } else if (tableName === 'projects') {
    await collection.createIndex({ apiKey: 1 }, { unique: true });
    logger.log('Created unique index on projects.apiKey');
  }
  
  // Migrate data in batches
  let offset = 0;
  let migratedCount = 0;
  
  while (offset < totalCount) {
    logger.log(\`Migrating batch for \${tableName}: \${offset} to \${offset + config.batchSize}\`);
    
    const result = await pgClient.query(\`
      SELECT *
      FROM \${tableName}
      ORDER BY id
      LIMIT \${config.batchSize}
      OFFSET \${offset}
    \`);
    
    if (result.rows.length === 0) {
      break;
    }
    
    // Transform data if needed
    const documents = result.rows.map(row => {
      // Convert PostgreSQL specific types to MongoDB compatible types
      Object.keys(row).forEach(key => {
        // Convert date objects
        if (row[key] instanceof Date) {
          row[key] = new Date(row[key]);
        }
        
        // Convert PostgreSQL JSON to MongoDB JSON
        if (typeof row[key] === 'string' && (
          key === 'properties' || 
          key === 'metadata' || 
          key === 'settings' ||
          key === 'config'
        )) {
          try {
            row[key] = JSON.parse(row[key]);
          } catch (e) {
            // Not valid JSON, leave as string
          }
        }
      });
      
      return row;
    });
    
    // Insert into MongoDB
    if (documents.length > 0) {
      await collection.insertMany(documents);
      migratedCount += documents.length;
      logger.log(\`Inserted \${documents.length} documents into \${tableName}\`);
    }
    
    offset += config.batchSize;
  }
  
  logger.log(\`Migration completed for table \${tableName}. Migrated \${migratedCount} records.\`);
}

// Main migration function
async function migrate() {
  let pgClient;
  let mongoClient;
  
  try {
    // Connect to databases
    pgClient = await connectToPostgres();
    mongoClient = await connectToMongo();
    
    // Get table names
    const tableNames = await getTableNames(pgClient);
    
    // Migrate each table
    for (const tableName of tableNames) {
      await migrateTable(pgClient, mongoClient, tableName);
    }
    
    logger.log('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  } finally {
    // Close connections
    if (pgClient) {
      await pgClient.end();
      logger.log('PostgreSQL connection closed');
    }
    if (mongoClient) {
      await mongoClient.close();
      logger.log('MongoDB connection closed');
    }
  }
}

// Run migration
migrate().catch(error => {
  logger.error('Unhandled error', error);
  process.exit(1);
});
EOL
  
  # Create ClickHouse to MongoDB migration script
  cat > "$PACKAGE_DIR/scripts/migrations/migrate-ch-to-mongo.js" <<EOL
/**
 * RadixInsight Analytics Platform
 * ClickHouse to MongoDB Migration Script
 * 
 * This script migrates analytics data from ClickHouse to MongoDB
 */

const { createClient } = require('@clickhouse/client');
const { MongoClient } = require('mongodb');
const fs = require('fs');
const path = require('path');

// Configuration
const config = {
  clickhouse: {
    host: process.env.CH_HOST || 'localhost',
    port: process.env.CH_PORT || 8123,
    database: process.env.CH_DATABASE || 'radixinsight',
    username: process.env.CH_USER || 'default',
    password: process.env.CH_PASSWORD || ''
  },
  mongodb: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/radixinsight'
  },
  batchSize: 10000,
  logFile: path.join(__dirname, 'ch-migration.log')
};

// Logger
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = \`[\${timestamp}] \${message}\n\`;
    console.log(logMessage.trim());
    fs.appendFileSync(config.logFile, logMessage);
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    const errorMessage = \`[\${timestamp}] ERROR: \${message}\n\${error ? error.stack : ''}\n\`;
    console.error(errorMessage.trim());
    fs.appendFileSync(config.logFile, errorMessage);
  }
};

// Initialize log file
fs.writeFileSync(config.logFile, \`ClickHouse migration started at \${new Date().toISOString()}\n\n\`);

// Connect to ClickHouse
async function connectToClickHouse() {
  logger.log('Connecting to ClickHouse...');
  const client = createClient({
    host: \`http://\${config.clickhouse.host}:\${config.clickhouse.port}\`,
    database: config.clickhouse.database,
    username: config.clickhouse.username,
    password: config.clickhouse.password
  });
  logger.log('Connected to ClickHouse');
  return client;
}

// Connect to MongoDB
async function connectToMongo() {
  logger.log('Connecting to MongoDB...');
  const client = new MongoClient(config.mongodb.uri);
  await client.connect();
  logger.log('Connected to MongoDB');
  return client;
}

// Get table names from ClickHouse
async function getTableNames(chClient) {
  logger.log('Getting table names from ClickHouse...');
  const result = await chClient.query({
    query: \`
      SELECT name
      FROM system.tables
      WHERE database = '\${config.clickhouse.database}'
    \`,
    format: 'JSONEachRow'
  });
  
  const json = await result.json();
  const tableNames = json.map(row => row.name);
  logger.log(\`Found \${tableNames.length} tables: \${tableNames.join(', ')}\`);
  return tableNames;
}

// Get table schema from ClickHouse
async function getTableSchema(chClient, tableName) {
  logger.log(\`Getting schema for table \${tableName}...\`);
  const result = await chClient.query({
    query: \`
      DESCRIBE TABLE \${tableName}
    \`,
    format: 'JSONEachRow'
  });
  
  const json = await result.json();
  logger.log(\`Schema for \${tableName}: \${JSON.stringify(json)}\`);
  return json;
}

// Migrate table data
async function migrateTable(chClient, mongoClient, tableName) {
  logger.log(\`Migrating table \${tableName}...\`);
  
  // Get total count
  const countResult = await chClient.query({
    query: \`SELECT COUNT(*) as count FROM \${tableName}\`,
    format: 'JSONEachRow'
  });
  
  const countJson = await countResult.json();
  const totalCount = parseInt(countJson[0].count);
  logger.log(\`Total records in \${tableName}: \${totalCount}\`);
  
  // Get MongoDB collection
  const db = mongoClient.db();
  const collection = db.collection(tableName);
  
  // Drop collection if it exists
  try {
    await collection.drop();
    logger.log(\`Dropped existing collection \${tableName}\`);
  } catch (error) {
    // Collection doesn't exist, which is fine
  }
  
  // Create indexes based on table name
  if (tableName === 'events') {
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ sessionId: 1 });
    await collection.createIndex({ timestamp: 1 });
    logger.log('Created indexes on events collection');
  } else if (tableName === 'page_views') {
    await collection.createIndex({ url: 1 });
    await collection.createIndex({ timestamp: 1 });
    logger.log('Created indexes on page_views collection');
  }
  
  // Migrate data in batches
  let offset = 0;
  let migratedCount = 0;
  
  while (offset < totalCount) {
    logger.log(\`Migrating batch for \${tableName}: \${offset} to \${offset + config.batchSize}\`);
    
    const result = await chClient.query({
      query: \`
        SELECT *
        FROM \${tableName}
        ORDER BY timestamp
        LIMIT \${config.batchSize}
        OFFSET \${offset}
      \`,
      format: 'JSONEachRow'
    });
    
    const rows = await result.json();
    
    if (rows.length === 0) {
      break;
    }
    
    // Transform data if needed
    const documents = rows.map(row => {
      // Convert ClickHouse specific types to MongoDB compatible types
      Object.keys(row).forEach(key => {
        // Convert date strings to Date objects
        if (key === 'timestamp' || key.endsWith('_at') || key.endsWith('_date')) {
          if (typeof row[key] === 'string') {
            row[key] = new Date(row[key]);
          }
        }
      });
      
      return row;
    });
    
    // Insert into MongoDB
    if (documents.length > 0) {
      await collection.insertMany(documents);
      migratedCount += documents.length;
      logger.log(\`Inserted \${documents.length} documents into \${tableName}\`);
    }
    
    offset += config.batchSize;
  }
  
  logger.log(\`Migration completed for table \${tableName}. Migrated \${migratedCount} records.\`);
}

// Main migration function
async function migrate() {
  let chClient;
  let mongoClient;
  
  try {
    // Connect to databases
    chClient = await connectToClickHouse();
    mongoClient = await connectToMongo();
    
    // Get table names
    const tableNames = await getTableNames(chClient);
    
    // Migrate each table
    for (const tableName of tableNames) {
      await migrateTable(chClient, mongoClient, tableName);
    }
    
    logger.log('Migration completed successfully');
  } catch (error) {
    logger.error('Migration failed', error);
    process.exit(1);
  } finally {
    // Close connections
    if (mongoClient) {
      await mongoClient.close();
      logger.log('MongoDB connection closed');
    }
    logger.log('ClickHouse connection closed');
  }
}

// Run migration
migrate().catch(error => {
  logger.error('Unhandled error', error);
  process.exit(1);
});
EOL
  
  print_success "Migration scripts created."
  echo ""
}

# Function to create package.json
create_package_json() {
  print_status "Creating package.json..."
  
  # Copy original package.json
  cp "$SOURCE_DIR/package.json" "$PACKAGE_DIR/package.json.orig"
  
  # Update package.json
  cat > "$PACKAGE_DIR/package.json" <<EOL
{
  "name": "radixinsight",
  "version": "2.0.0",
  "description": "RadixInsight Analytics Platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "build": "echo 'Building RadixInsight...' && npm run build:sdk",
    "build:sdk": "cd sdk && npm install && npm run build",
    "test": "node scripts/test.sh",
    "db:init": "node scripts/init-db.js",
    "deploy": "scripts/deploy.sh",
    "docker:deploy": "scripts/docker-deploy.sh",
    "migrate:pg-to-mongo": "node scripts/migrations/migrate-pg-to-mongo.js",
    "migrate:ch-to-mongo": "node scripts/migrations/migrate-ch-to-mongo.js"
  },
  "keywords": [
    "analytics",
    "dashboard",
    "visualization",
    "tracking",
    "mongodb",
    "postgresql",
    "clickhouse"
  ],
  "author": "RadixInsight Team",
  "license": "UNLICENSED",
  "dependencies": {
    "@clickhouse/client": "^0.2.2",
    "axios": "^1.6.0",
    "bcrypt": "^5.1.1",
    "cheerio": "^1.0.0-rc.12",
    "cors": "^2.8.5",
    "d3": "^7.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "glob": "^10.3.10",
    "jsonwebtoken": "^9.0.2",
    "marked": "^9.1.5",
    "mongodb": "^6.2.0",
    "pg": "^8.11.3",
    "uuid": "^9.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=14.0.0"
  }
}
EOL
  
  print_success "package.json created."
  echo ""
}

# Function to create init-db.js script
create_init_db_script() {
  print_status "Creating database initialization script..."
  
  mkdir -p "$PACKAGE_DIR/scripts"
  
  cat > "$PACKAGE_DIR/scripts/init-db.js" <<EOL
/**
 * RadixInsight Analytics Platform
 * Database Initialization Script
 * 
 * This script initializes the database based on the configured database type
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { DatabaseFactory } = require('../database/abstraction');

// Configuration
const dbType = process.env.DB_TYPE || 'postgresql';
const dbConfig = {
  postgresql: {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE || 'radixinsight',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres'
  },
  mongodb: {
    connectionString: process.env.MONGO_URI || 'mongodb://localhost:27017/radixinsight'
  },
  clickhouse: {
    host: process.env.CH_HOST || 'localhost',
    port: process.env.CH_PORT || 8123,
    database: process.env.CH_DATABASE || 'radixinsight',
    user: process.env.CH_USER || 'default',
    password: process.env.CH_PASSWORD || ''
  }
};

// Logger
function log(message) {
  console.log(\`[\${new Date().toISOString()}] \${message}\`);
}

// Initialize PostgreSQL
async function initPostgres() {
  log('Initializing PostgreSQL database...');
  
  const schemaPath = path.join(__dirname, '..', 'database', 'schema', 'postgres', 'init.sql');
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(\`PostgreSQL schema file not found: \${schemaPath}\`);
  }
  
  try {
    // Create database if it doesn't exist
    const createDbCommand = \`PGPASSWORD=\${dbConfig.postgresql.password} psql -h \${dbConfig.postgresql.host} -U \${dbConfig.postgresql.user} -p \${dbConfig.postgresql.port} -c "CREATE DATABASE \${dbConfig.postgresql.database} WITH ENCODING 'UTF8' LC_COLLATE='en_US.UTF-8' LC_CTYPE='en_US.UTF-8' TEMPLATE=template0;"\`;
    
    try {
      execSync(createDbCommand, { stdio: 'pipe' });
      log(\`Created database \${dbConfig.postgresql.database}\`);
    } catch (error) {
      // Database might already exist, which is fine
      log(\`Database \${dbConfig.postgresql.database} might already exist\`);
    }
    
    // Run schema initialization
    const initCommand = \`PGPASSWORD=\${dbConfig.postgresql.password} psql -h \${dbConfig.postgresql.host} -U \${dbConfig.postgresql.user} -p \${dbConfig.postgresql.port} -d \${dbConfig.postgresql.database} -f \${schemaPath}\`;
    execSync(initCommand, { stdio: 'inherit' });
    
    log('PostgreSQL database initialized successfully');
  } catch (error) {
    throw new Error(\`Failed to initialize PostgreSQL database: \${error.message}\`);
  }
}

// Initialize MongoDB
async function initMongo() {
  log('Initializing MongoDB database...');
  
  try {
    const db = DatabaseFactory.createDatabase('mongodb', dbConfig.mongodb);
    await db.initialize();
    
    // Create collections
    const collections = [
      'users',
      'projects',
      'events',
      'dashboards',
      'flows',
      'cohorts',
      'experiments',
      'recordings',
      'anomalies',
      'heatmaps'
    ];
    
    for (const collection of collections) {
      await db.createCollection(collection);
      log(\`Created collection: \${collection}\`);
    }
    
    // Create indexes
    await db.createIndex('users', { email: 1 }, { unique: true });
    await db.createIndex('projects', { apiKey: 1 }, { unique: true });
    await db.createIndex('events', { userId: 1 });
    await db.createIndex('events', { sessionId: 1 });
    await db.createIndex('events', { timestamp: 1 });
    await db.createIndex('flows', { userId: 1 });
    await db.createIndex('flows', { sessionId: 1 });
    
    log('MongoDB database initialized successfully');
    await db.close();
  } catch (error) {
    throw new Error(\`Failed to initialize MongoDB database: \${error.message}\`);
  }
}

// Initialize ClickHouse
async function initClickHouse() {
  log('Initializing ClickHouse database...');
  
  const schemaPath = path.join(__dirname, '..', 'database', 'schema', 'clickhouse', 'init.sql');
  
  if (!fs.existsSync(schemaPath)) {
    throw new Error(\`ClickHouse schema file not found: \${schemaPath}\`);
  }
  
  try {
    // Create database if it doesn't exist
    const createDbCommand = \`echo "CREATE DATABASE IF NOT EXISTS \${dbConfig.clickhouse.database}" | curl '\${dbConfig.clickhouse.host}:\${dbConfig.clickhouse.port}' --data-binary @-\`;
    
    try {
      execSync(createDbCommand, { stdio: 'pipe' });
      log(\`Created database \${dbConfig.clickhouse.database}\`);
    } catch (error) {
      // Database might already exist, which is fine
      log(\`Database \${dbConfig.clickhouse.database} might already exist\`);
    }
    
    // Run schema initialization
    const initCommand = \`cat \${schemaPath} | curl '\${dbConfig.clickhouse.host}:\${dbConfig.clickhouse.port}/?database=\${dbConfig.clickhouse.database}' --data-binary @-\`;
    execSync(initCommand, { stdio: 'inherit' });
    
    log('ClickHouse database initialized successfully');
  } catch (error) {
    throw new Error(\`Failed to initialize ClickHouse database: \${error.message}\`);
  }
}

// Main function
async function main() {
  log(\`Initializing \${dbType} database...\`);
  
  try {
    switch (dbType) {
      case 'postgresql':
        await initPostgres();
        break;
      case 'mongodb':
        await initMongo();
        break;
      case 'clickhouse':
        await initClickHouse();
        break;
      default:
        throw new Error(\`Unsupported database type: \${dbType}\`);
    }
    
    log('Database initialization completed successfully');
  } catch (error) {
    console.error(\`Database initialization failed: \${error.message}\`);
    process.exit(1);
  }
}

// Run the main function
main().catch(console.error);
EOL
  
  print_success "Database initialization script created."
  echo ""
}

# Function to create README.md for the package
create_package_readme() {
  print_status "Creating package README.md..."
  
  cat > "$PACKAGE_DIR/README.md" <<EOL
# RadixInsight Analytics Platform v2.0.0

## Overview

This package contains the RadixInsight Analytics Platform with all the refactored components and new features as requested. The platform now includes:

1. **Database Abstraction Layer** - A flexible abstraction layer supporting PostgreSQL, ClickHouse, and MongoDB
2. **Simplified SDK** - An easy-to-implement JavaScript SDK for web and Node.js applications
3. **Link Validation System** - A system to scan HTML and Markdown files for broken links
4. **Visualization Components** - Dynamic visualization components using D3.js
5. **User Flow Tracking** - Comprehensive tracking of user journeys
6. **Advanced Analytics Features** - Cohort analysis, A/B testing, session recording, anomaly detection, and heatmaps

## Documentation

Detailed documentation is available in the \`docs/\` directory:

- \`README.md\` - Main documentation with overview of all features
- \`DOCUMENTATION.md\` - Detailed API documentation
- \`CHANGELOG.md\` - List of changes in this version
- \`UPGRADE.md\` - Instructions for upgrading from previous versions
- \`FEATURES.md\` - Detailed description of all features

## Installation

1. Extract the package to your desired location
2. Copy \`.env.example\` to \`.env\` and update the values
3. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`
4. Initialize the database:
   \`\`\`bash
   npm run db:init
   \`\`\`
5. Start the application:
   \`\`\`bash
   npm start
   \`\`\`

## Deployment

The package includes deployment scripts for various environments:

- Standard deployment:
  \`\`\`bash
  npm run deploy
  \`\`\`

- Docker deployment:
  \`\`\`bash
  npm run docker:deploy
  \`\`\`

## Testing

To test the implementation:

\`\`\`bash
npm test
\`\`\`

Or test specific components:

\`\`\`bash
./scripts/test.sh --db-abstraction
./scripts/test.sh --sdk
./scripts/test.sh --link-validation
./scripts/test.sh --visualizations
./scripts/test.sh --user-flow
./scripts/test.sh --analytics
./scripts/test.sh --docs
./scripts/test.sh --deployment
\`\`\`

## Migration

If you want to migrate from PostgreSQL to MongoDB:

\`\`\`bash
npm run migrate:pg-to-mongo
\`\`\`

If you want to migrate from ClickHouse to MongoDB:

\`\`\`bash
npm run migrate:ch-to-mongo
\`\`\`

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
EOL
  
  print_success "Package README.md created."
  echo ""
}

# Function to create package zip
create_package_zip() {
  print_status "Creating package zip..."
  
  cd "$PACKAGE_DIR/.."
  zip -r "radixinsight-v2.0.0.zip" "$(basename "$PACKAGE_DIR")"
  
  if [ $? -eq 0 ]; then
    print_success "Package zip created: radixinsight-v2.0.0.zip"
  else
    print_error "Failed to create package zip."
    exit 1
  fi
  
  echo ""
}

# Function to display summary
display_summary() {
  print_status "Packaging Summary"
  echo -e "${BLUE}=========================================================${NC}"
  echo -e "Package: RadixInsight Analytics Platform v2.0.0"
  echo -e "Location: $(dirname "$PACKAGE_DIR")/radixinsight-v2.0.0.zip"
  echo -e "Size: $(du -h "$(dirname "$PACKAGE_DIR")/radixinsight-v2.0.0.zip" | cut -f1)"
  echo -e "${BLUE}=========================================================${NC}"
  echo ""
  print_success "Packaging completed successfully!"
  echo ""
}

# Main function
main() {
  # Parse command line arguments
  while [[ $# -gt 0 ]]; do
    case $1 in
      --source=*)
        SOURCE_DIR="${1#*=}"
        shift
        ;;
      --output=*)
        PACKAGE_DIR="${1#*=}"
        shift
        ;;
      --help)
        echo "Usage: $0 [options]"
        echo ""
        echo "Options:"
        echo "  --source=DIR    Source directory (default: current directory)"
        echo "  --output=DIR    Output directory (default: ./radix_project_package)"
        echo "  --help          Display this help message"
        exit 0
        ;;
      *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information."
        exit 1
        ;;
    esac
  done
  
  # Set default values if not provided
  SOURCE_DIR="${SOURCE_DIR:-$(pwd)}"
  PACKAGE_DIR="${PACKAGE_DIR:-$(pwd)/radix_project_package}"
  
  # Run packaging steps
  create_package_structure
  copy_source_files
  create_documentation
  create_env_example
  create_migration_scripts
  create_package_json
  create_init_db_script
  create_package_readme
  create_package_zip
  display_summary
}

# Run the main function
main "$@"
