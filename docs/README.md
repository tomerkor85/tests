# RadixInsight Analytics Platform - README

## Project Overview

RadixInsight Analytics Platform is a comprehensive analytics solution designed for tracking, analyzing, and visualizing user behavior and application performance. This platform provides a modern, minimalist UI with powerful analytics capabilities, multi-database support, and comprehensive data visualization tools.

## Key Features

- **Modern Minimalist UI**: Clean interface with small buttons and modern design elements
- **Multi-Database Support**: Flexible database abstraction layer supporting PostgreSQL, ClickHouse, and MongoDB
- **Comprehensive Visualizations**: Interactive charts, diagrams, pie charts, flow diagrams, and heatmaps
- **Secure Authentication**: Email verification with configurable domain restrictions
- **Simplified SDK**: Easy-to-implement JavaScript SDK for web and Node.js applications
- **Complete API**: RESTful endpoints for all platform functionality
- **Interactive Dashboards**: Real-time data visualization and analysis
- **User Flow Tracking**: Complete tracking of user journeys from login to logout
- **Advanced Analytics**: Cohort analysis, A/B testing, session recording, anomaly detection, and heatmaps

## Getting Started

### Prerequisites

- Node.js 14.x or higher
- One of the following databases:
  - PostgreSQL 12.x or higher
  - ClickHouse 21.x or higher
  - MongoDB 5.x or higher
- Redis 6.x or higher (optional, for caching)
- SMTP server for email notifications

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure environment variables in `.env` file (see `.env.example` for required variables)
4. Choose and configure your database in `config/database.js`
5. Initialize the database:
   ```bash
   npm run db:init
   ```
6. Start the server:
   ```bash
   npm start
   ```

### Quick Deployment

For a quick deployment and testing, use the provided deployment script:

```bash
./scripts/deploy.sh
```

This script will test all components, build the project, deploy it locally, and generate deployment instructions.

## Project Structure

```
project/
├── auth/                  # Authentication system
│   ├── AuthenticationSystem.js
│   ├── authRoutes.js
│   └── middleware/
├── css/                   # Stylesheets
│   └── modern-styles.css
├── database/              # Database schemas and connections
│   ├── abstraction/       # Database abstraction layer
│   │   ├── DatabaseInterface.js
│   │   ├── DatabaseFactory.js
│   │   ├── PostgresAdapter.js
│   │   ├── ClickHouseAdapter.js
│   │   ├── MongoAdapter.js
│   │   └── index.js
│   ├── schema/            # Database schemas
│   │   ├── postgres/
│   │   ├── clickhouse/
│   │   └── mongodb/
│   ├── db.js              # Legacy database connection
│   └── clickhouse-db.js   # Legacy ClickHouse connection
├── images/                # Images and assets
│   └── architecture/      # Architecture diagrams
├── js/                    # JavaScript files
│   ├── analytics-visualizer.js
│   ├── dashboard-manager.js
│   └── visualizations/    # Visualization components
│       ├── index.js       # Main visualization library
│       └── examples.js    # Example implementations
├── middleware/            # Express middleware
├── modules/               # Feature modules
│   ├── analytics-features/# Advanced analytics features
│   │   ├── cohort-analysis.js
│   │   ├── ab-testing.js
│   │   ├── session-recording.js
│   │   ├── anomaly-detection.js
│   │   └── heatmaps-integration.js
│   └── user-flow-tracking/# User flow tracking
│       ├── index.js
│       ├── api.js
│       ├── client.js
│       └── integration.js
├── public/                # Public assets
│   └── visualizations-demo.html # Demo page for visualizations
├── routes/                # API routes
│   ├── auth.js
│   ├── projects.js
│   ├── events.js
│   └── dashboards.js
├── sdk/                   # Client SDK package
│   ├── src/               # SDK source code
│   ├── examples/          # SDK usage examples
│   ├── package.json       # SDK package configuration
│   └── README.md          # SDK documentation
├── utils/                 # Utility functions
│   └── link-validator/    # Link validation system
│       ├── index.js
│       ├── cli.js
│       ├── api.js
│       └── integration.js
├── app.js                 # Express application
├── server.js              # Server entry point
├── scripts/               # Deployment and utility scripts
│   └── deploy.sh          # Deployment script
├── DOCUMENTATION.md       # Detailed documentation
└── README.md              # This file
```

## Architecture

The platform follows a modern, scalable architecture:

1. **Frontend Layer**: HTML5, CSS3, JavaScript with D3.js for visualizations
2. **Backend Layer**: Node.js/Express API server
3. **Data Layer**: Multi-database support (PostgreSQL, ClickHouse, MongoDB)
4. **Integration Layer**: JavaScript SDK, RESTful API

For detailed architecture information, see the architecture diagrams in the `images/architecture/` directory and the comprehensive documentation in `DOCUMENTATION.md`.

## Database Abstraction Layer

The platform now features a flexible database abstraction layer that:

1. Provides a consistent interface for database operations
2. Supports multiple database systems (PostgreSQL, ClickHouse, MongoDB)
3. Allows easy switching between database systems
4. Simplifies query operations with a unified API

To configure your database:

```javascript
const { DatabaseFactory } = require('./database/abstraction');

// Create a database instance
const db = DatabaseFactory.createDatabase('mongodb', {
  connectionString: 'mongodb://localhost:27017/radixinsight'
});

// Initialize the connection
await db.initialize();

// Use the database
const results = await db.query('users', { email: 'user@example.com' });
```

## Client SDK

The platform includes a simplified JavaScript SDK for easy integration:

```javascript
// Browser usage
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

// Identify a user
analytics.identify('user123', {
  email: 'user@example.com',
  plan: 'premium'
});

// Track page view
analytics.pageView();
```

For detailed SDK documentation, see the `sdk/README.md` file.

## Link Validation System

The platform includes a comprehensive link validation system that:

1. Scans HTML and Markdown files for links
2. Validates internal and external links
3. Checks API endpoints for proper functionality
4. Reports failures in a detailed log file

To use the link validator:

```bash
# CLI usage
node utils/link-validator/cli.js --dir ./docs --output validation-report.json

# API usage
const { validateLinks } = require('./utils/link-validator');

const results = await validateLinks({
  directories: ['./docs', './public'],
  excludePatterns: ['node_modules', '.git']
});
```

## Visualization Components

The platform provides a rich set of visualization components built with D3.js:

1. **Pie Charts**: Standard and donut charts with interactive legends
2. **Data Tables**: Sortable, paginated tables with search functionality
3. **Flow Diagrams**: Visualize user journeys and conversion funnels
4. **Heatmaps**: Visualize user interactions on web pages

All visualizations support:
- SVG/PNG export
- Responsive design
- Interactive elements
- Customizable styling

For examples, see the `public/visualizations-demo.html` file.

## User Flow Tracking

The platform now includes comprehensive user flow tracking:

1. Tracks complete user journeys from login to logout
2. Records all user actions and events in sequence
3. Provides methods for retrieving and analyzing flow data
4. Supports multiple database backends

To use user flow tracking:

```javascript
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

// Add events to the flow
await flowTracker.addEvent(flow.flowId, {
  type: 'page_view',
  page: '/dashboard',
  timestamp: new Date()
});

// End the flow
await flowTracker.endFlow(flow.flowId, {
  endPage: '/logout',
  duration: 1200 // seconds
});
```

## Advanced Analytics Features

### Cohort Analysis

Track user groups over time to analyze retention, conversion, and behavior:

```javascript
const CohortAnalysis = require('./modules/analytics-features/cohort-analysis');

const cohortAnalyzer = new CohortAnalysis({
  dbType: 'clickhouse',
  dbConfig: { /* database configuration */ }
});

// Create a cohort
const cohort = await cohortAnalyzer.createCohort({
  name: 'January Signups',
  description: 'Users who signed up in January 2025',
  criteria: {
    registrationDateStart: '2025-01-01',
    registrationDateEnd: '2025-01-31'
  }
});

// Calculate cohort metrics
const metrics = await cohortAnalyzer.calculateCohortMetrics(cohort.cohortId, {
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  periodType: 'month',
  metrics: ['retention', 'conversion', 'revenue']
});
```

### A/B Testing

Create experiments, assign users to variants, and track results:

```javascript
const ABTesting = require('./modules/analytics-features/ab-testing');

const abTester = new ABTesting({
  dbType: 'postgresql',
  dbConfig: { /* database configuration */ }
});

// Create an experiment
const experiment = await abTester.createExperiment({
  name: 'Button Color Test',
  description: 'Testing different button colors',
  variants: [
    { name: 'Control', description: 'Blue button', weight: 1 },
    { name: 'Variant A', description: 'Green button', weight: 1 },
    { name: 'Variant B', description: 'Red button', weight: 1 }
  ],
  trafficPercentage: 100,
  status: 'active'
});

// Assign a user to a variant
const assignment = await abTester.assignVariant(experiment.experimentId, {
  userId: 'user123',
  sessionId: 'session456'
});

// Track a conversion
await abTester.trackConversion(experiment.experimentId, {
  userId: 'user123',
  sessionId: 'session456',
  metricName: 'signup_completion',
  metricValue: 1
});

// Calculate results
const results = await abTester.calculateResults(experiment.experimentId);
```

### Session Recording

Capture user interactions for playback and analysis:

```javascript
const SessionRecording = require('./modules/analytics-features/session-recording');

const recorder = new SessionRecording({
  dbType: 'mongodb',
  dbConfig: { /* database configuration */ },
  maskSensitiveData: true
});

// Start a recording
const recording = await recorder.startRecording({
  sessionId: 'session456',
  userId: 'user123',
  url: 'https://example.com/dashboard',
  userAgent: 'Mozilla/5.0...'
});

// Add events to the recording
await recorder.addEvent(recording.recordingId, {
  sessionId: 'session456',
  eventType: 'click',
  eventData: {
    element: { tag: 'button', id: 'save-button' },
    x: 150,
    y: 300
  }
});

// End the recording
await recorder.endRecording(recording.recordingId);

// Get the recording
const playback = await recorder.getRecording(recording.recordingId, {
  includeEvents: true
});
```

### Anomaly Detection

Identify unusual patterns in metrics and user behavior:

```javascript
const AnomalyDetection = require('./modules/analytics-features/anomaly-detection');

const detector = new AnomalyDetection({
  dbType: 'clickhouse',
  dbConfig: { /* database configuration */ },
  sensitivityLevel: 'medium',
  detectionMethods: ['zscore', 'iqr', 'moving_average']
});

// Track a metric
const result = await detector.trackMetric({
  name: 'page_load_time',
  value: 1.5, // seconds
  dimensions: {
    page: '/dashboard',
    browser: 'Chrome'
  }
});

// If an anomaly is detected
if (result.anomaly) {
  console.log(`Anomaly detected: ${result.anomaly.severity} severity`);
}

// Get anomalies for a metric
const anomalies = await detector.getAnomaliesByMetric('page_load_time', {
  startTime: '2025-01-01',
  endTime: '2025-01-31',
  severity: 'high'
});
```

### Heatmaps Integration

Visualize user interactions on web pages:

```javascript
const HeatmapsIntegration = require('./modules/analytics-features/heatmaps-integration');

const heatmaps = new HeatmapsIntegration({
  dbType: 'postgresql',
  dbConfig: { /* database configuration */ }
});

// Create a heatmap
const heatmap = await heatmaps.createHeatmap({
  url: 'https://example.com/landing',
  pageTitle: 'Landing Page',
  type: 'click',
  deviceType: 'desktop',
  viewportWidth: 1920,
  viewportHeight: 1080
});

// Track an interaction
await heatmaps.trackInteraction(heatmap.heatmapId, {
  sessionId: 'session456',
  userId: 'user123',
  type: 'click',
  x: 500,
  y: 300
});

// Generate heatmap data for visualization
const heatmapData = await heatmaps.generateHeatmapData(heatmap.heatmapId, {
  resolution: 10,
  blur: 15,
  maxOpacity: 0.8
});
```

## Authentication

The platform implements a secure authentication system that:

1. Supports configurable email domain restrictions
2. Requires email verification
3. Uses JWT tokens for API authentication
4. Provides password reset functionality

## API Documentation

The platform provides a comprehensive API for integration:

- `/api/auth`: Authentication endpoints
- `/api/projects`: Project management
- `/api/events`: Event tracking and querying
- `/api/dashboards`: Dashboard configuration
- `/api/flows`: User flow tracking
- `/api/cohorts`: Cohort analysis
- `/api/experiments`: A/B testing
- `/api/recordings`: Session recording
- `/api/anomalies`: Anomaly detection
- `/api/heatmaps`: Heatmaps

For detailed API documentation, see the `DOCUMENTATION.md` file.

## Deployment

For production deployment instructions, see the `DEPLOYMENT.md` file generated by the deployment script.

## Security

- All passwords are hashed using bcrypt
- JWT tokens for authentication
- HTTPS required for production
- Configurable email domain restrictions
- Input validation
- CORS configuration
- Sensitive data masking in session recordings

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.

## Support

For support, please contact the RadixInsight team.
