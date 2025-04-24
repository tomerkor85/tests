# RadixInsight Analytics Platform - API Documentation

This document provides detailed information about the RadixInsight Analytics Platform API endpoints, database structure, and integration options.

## Table of Contents

1. [Authentication](#authentication)
2. [Database Abstraction Layer](#database-abstraction-layer)
3. [Projects API](#projects-api)
4. [Events API](#events-api)
5. [Dashboards API](#dashboards-api)
6. [User Flow Tracking API](#user-flow-tracking-api)
7. [Cohort Analysis API](#cohort-analysis-api)
8. [A/B Testing API](#ab-testing-api)
9. [Session Recording API](#session-recording-api)
10. [Anomaly Detection API](#anomaly-detection-api)
11. [Heatmaps API](#heatmaps-api)
12. [SDK Integration](#sdk-integration)
13. [Link Validation](#link-validation)
14. [Visualization Components](#visualization-components)

## Authentication

All API requests must include authentication using JWT tokens.

### Endpoints

#### POST /api/auth/register
Register a new user.

**Request:**
```json
{
  "email": "user@radix-int.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please verify your email.",
  "userId": "user123"
}
```

#### POST /api/auth/login
Authenticate a user and get a JWT token.

**Request:**
```json
{
  "email": "user@radix-int.com",
  "password": "securePassword123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "email": "user@radix-int.com",
    "name": "John Doe"
  }
}
```

#### GET /api/auth/verify/:token
Verify a user's email address.

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully."
}
```

#### POST /api/auth/reset-password
Request a password reset.

**Request:**
```json
{
  "email": "user@radix-int.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Password reset instructions sent to your email."
}
```

## Database Abstraction Layer

The database abstraction layer provides a unified interface for database operations across different database systems.

### Supported Databases

- PostgreSQL
- ClickHouse
- MongoDB

### Interface Methods

- `initialize()`: Connect to the database
- `close()`: Close the database connection
- `query(query, params)`: Execute a query
- `insert(table, data)`: Insert data into a table
- `update(table, criteria, data)`: Update data in a table
- `delete(table, criteria)`: Delete data from a table
- `find(table, criteria, options)`: Find data in a table
- `findOne(table, criteria)`: Find a single record in a table
- `count(table, criteria)`: Count records in a table

### Configuration

Database configuration is stored in `config/database.js`:

```javascript
module.exports = {
  default: 'postgresql',
  connections: {
    postgresql: {
      host: process.env.PG_HOST || 'localhost',
      port: process.env.PG_PORT || 5432,
      database: process.env.PG_DATABASE || 'radixinsight',
      user: process.env.PG_USER || 'postgres',
      password: process.env.PG_PASSWORD || 'postgres'
    },
    clickhouse: {
      host: process.env.CH_HOST || 'localhost',
      port: process.env.CH_PORT || 8123,
      database: process.env.CH_DATABASE || 'radixinsight',
      user: process.env.CH_USER || 'default',
      password: process.env.CH_PASSWORD || ''
    },
    mongodb: {
      connectionString: process.env.MONGO_URI || 'mongodb://localhost:27017/radixinsight'
    }
  }
};
```

## Projects API

Manage analytics projects.

### Endpoints

#### GET /api/projects
Get all projects for the authenticated user.

**Response:**
```json
{
  "success": true,
  "projects": [
    {
      "id": "project123",
      "name": "Website Analytics",
      "description": "Analytics for the main website",
      "createdAt": "2025-01-15T12:00:00Z",
      "apiKey": "api_key_123"
    }
  ]
}
```

#### POST /api/projects
Create a new project.

**Request:**
```json
{
  "name": "Mobile App Analytics",
  "description": "Analytics for the mobile application"
}
```

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "project456",
    "name": "Mobile App Analytics",
    "description": "Analytics for the mobile application",
    "createdAt": "2025-04-22T08:00:00Z",
    "apiKey": "api_key_456"
  }
}
```

#### GET /api/projects/:id
Get a specific project.

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "project123",
    "name": "Website Analytics",
    "description": "Analytics for the main website",
    "createdAt": "2025-01-15T12:00:00Z",
    "apiKey": "api_key_123",
    "stats": {
      "events": 15243,
      "users": 2541,
      "sessions": 4872
    }
  }
}
```

#### PUT /api/projects/:id
Update a project.

**Request:**
```json
{
  "name": "Updated Website Analytics",
  "description": "Updated description"
}
```

**Response:**
```json
{
  "success": true,
  "project": {
    "id": "project123",
    "name": "Updated Website Analytics",
    "description": "Updated description",
    "createdAt": "2025-01-15T12:00:00Z",
    "apiKey": "api_key_123"
  }
}
```

#### DELETE /api/projects/:id
Delete a project.

**Response:**
```json
{
  "success": true,
  "message": "Project deleted successfully."
}
```

## Events API

Track and query analytics events.

### Endpoints

#### POST /api/events
Track a new event.

**Request:**
```json
{
  "projectId": "project123",
  "type": "page_view",
  "properties": {
    "url": "/dashboard",
    "referrer": "/login",
    "title": "User Dashboard"
  },
  "userId": "user123",
  "sessionId": "session456",
  "timestamp": "2025-04-22T08:10:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "event789"
}
```

#### POST /api/events/batch
Track multiple events in a batch.

**Request:**
```json
{
  "projectId": "project123",
  "events": [
    {
      "type": "page_view",
      "properties": {
        "url": "/dashboard",
        "title": "User Dashboard"
      },
      "userId": "user123",
      "sessionId": "session456",
      "timestamp": "2025-04-22T08:10:00Z"
    },
    {
      "type": "button_click",
      "properties": {
        "buttonId": "save-button",
        "page": "/dashboard"
      },
      "userId": "user123",
      "sessionId": "session456",
      "timestamp": "2025-04-22T08:11:30Z"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "eventIds": ["event789", "event790"]
}
```

#### GET /api/events
Query events with filters.

**Query Parameters:**
- `projectId` (required): Project ID
- `type`: Event type filter
- `userId`: Filter by user ID
- `sessionId`: Filter by session ID
- `startDate`: Start date for time range
- `endDate`: End date for time range
- `limit`: Maximum number of events to return (default: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "event789",
      "type": "page_view",
      "properties": {
        "url": "/dashboard",
        "referrer": "/login",
        "title": "User Dashboard"
      },
      "userId": "user123",
      "sessionId": "session456",
      "timestamp": "2025-04-22T08:10:00Z"
    }
  ],
  "pagination": {
    "total": 1543,
    "limit": 100,
    "offset": 0
  }
}
```

## Dashboards API

Manage analytics dashboards.

### Endpoints

#### GET /api/dashboards
Get all dashboards for a project.

**Query Parameters:**
- `projectId` (required): Project ID

**Response:**
```json
{
  "success": true,
  "dashboards": [
    {
      "id": "dashboard123",
      "name": "Website Overview",
      "description": "Overview of website performance",
      "projectId": "project123",
      "createdAt": "2025-01-20T14:30:00Z",
      "updatedAt": "2025-04-10T09:15:00Z"
    }
  ]
}
```

#### POST /api/dashboards
Create a new dashboard.

**Request:**
```json
{
  "projectId": "project123",
  "name": "Conversion Funnel",
  "description": "Tracks user conversion through the signup process",
  "widgets": [
    {
      "type": "funnel",
      "title": "Signup Funnel",
      "query": {
        "steps": [
          { "event": "page_view", "properties": { "url": "/signup" } },
          { "event": "form_submit", "properties": { "form": "signup-form" } },
          { "event": "account_created" }
        ]
      },
      "position": { "x": 0, "y": 0, "width": 6, "height": 4 }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "id": "dashboard456",
    "name": "Conversion Funnel",
    "description": "Tracks user conversion through the signup process",
    "projectId": "project123",
    "createdAt": "2025-04-22T08:20:00Z",
    "updatedAt": "2025-04-22T08:20:00Z",
    "widgets": [
      {
        "id": "widget123",
        "type": "funnel",
        "title": "Signup Funnel",
        "query": {
          "steps": [
            { "event": "page_view", "properties": { "url": "/signup" } },
            { "event": "form_submit", "properties": { "form": "signup-form" } },
            { "event": "account_created" }
          ]
        },
        "position": { "x": 0, "y": 0, "width": 6, "height": 4 }
      }
    ]
  }
}
```

#### GET /api/dashboards/:id
Get a specific dashboard.

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "id": "dashboard123",
    "name": "Website Overview",
    "description": "Overview of website performance",
    "projectId": "project123",
    "createdAt": "2025-01-20T14:30:00Z",
    "updatedAt": "2025-04-10T09:15:00Z",
    "widgets": [
      {
        "id": "widget456",
        "type": "line_chart",
        "title": "Page Views Over Time",
        "query": {
          "metric": "page_views",
          "interval": "day",
          "timeRange": { "days": 30 }
        },
        "position": { "x": 0, "y": 0, "width": 6, "height": 4 }
      }
    ]
  }
}
```

#### PUT /api/dashboards/:id
Update a dashboard.

**Request:**
```json
{
  "name": "Updated Website Overview",
  "description": "Updated description",
  "widgets": [
    {
      "id": "widget456",
      "type": "line_chart",
      "title": "Updated Page Views Chart",
      "query": {
        "metric": "page_views",
        "interval": "day",
        "timeRange": { "days": 60 }
      },
      "position": { "x": 0, "y": 0, "width": 6, "height": 4 }
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "dashboard": {
    "id": "dashboard123",
    "name": "Updated Website Overview",
    "description": "Updated description",
    "projectId": "project123",
    "createdAt": "2025-01-20T14:30:00Z",
    "updatedAt": "2025-04-22T08:25:00Z",
    "widgets": [
      {
        "id": "widget456",
        "type": "line_chart",
        "title": "Updated Page Views Chart",
        "query": {
          "metric": "page_views",
          "interval": "day",
          "timeRange": { "days": 60 }
        },
        "position": { "x": 0, "y": 0, "width": 6, "height": 4 }
      }
    ]
  }
}
```

#### DELETE /api/dashboards/:id
Delete a dashboard.

**Response:**
```json
{
  "success": true,
  "message": "Dashboard deleted successfully."
}
```

## User Flow Tracking API

Track and analyze user flows through the application.

### Endpoints

#### POST /api/flows
Start a new user flow.

**Request:**
```json
{
  "projectId": "project123",
  "userId": "user123",
  "sessionId": "session456",
  "startPage": "/login",
  "metadata": {
    "userAgent": "Mozilla/5.0...",
    "referrer": "https://google.com"
  }
}
```

**Response:**
```json
{
  "success": true,
  "flow": {
    "flowId": "flow789",
    "userId": "user123",
    "sessionId": "session456",
    "startTime": "2025-04-22T08:30:00Z",
    "startPage": "/login"
  }
}
```

#### POST /api/flows/:flowId/events
Add an event to a user flow.

**Request:**
```json
{
  "type": "page_view",
  "page": "/dashboard",
  "timestamp": "2025-04-22T08:32:00Z",
  "metadata": {
    "loadTime": 1.2,
    "isFirstLoad": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "event": {
    "eventId": "event123",
    "flowId": "flow789",
    "type": "page_view",
    "page": "/dashboard",
    "timestamp": "2025-04-22T08:32:00Z",
    "sequenceIndex": 1
  }
}
```

#### POST /api/flows/:flowId/end
End a user flow.

**Request:**
```json
{
  "endPage": "/logout",
  "timestamp": "2025-04-22T08:50:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "flow": {
    "flowId": "flow789",
    "userId": "user123",
    "sessionId": "session456",
    "startTime": "2025-04-22T08:30:00Z",
    "endTime": "2025-04-22T08:50:00Z",
    "duration": 1200,
    "eventCount": 15
  }
}
```

#### GET /api/flows
Get user flows with filters.

**Query Parameters:**
- `projectId` (required): Project ID
- `userId`: Filter by user ID
- `sessionId`: Filter by session ID
- `startDate`: Start date for time range
- `endDate`: End date for time range
- `minDuration`: Minimum flow duration in seconds
- `maxDuration`: Maximum flow duration in seconds
- `limit`: Maximum number of flows to return (default: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "flows": [
    {
      "flowId": "flow789",
      "userId": "user123",
      "sessionId": "session456",
      "startTime": "2025-04-22T08:30:00Z",
      "endTime": "2025-04-22T08:50:00Z",
      "duration": 1200,
      "startPage": "/login",
      "endPage": "/logout",
      "eventCount": 15
    }
  ],
  "pagination": {
    "total": 543,
    "limit": 100,
    "offset": 0
  }
}
```

#### GET /api/flows/:flowId
Get a specific user flow with events.

**Response:**
```json
{
  "success": true,
  "flow": {
    "flowId": "flow789",
    "userId": "user123",
    "sessionId": "session456",
    "startTime": "2025-04-22T08:30:00Z",
    "endTime": "2025-04-22T08:50:00Z",
    "duration": 1200,
    "startPage": "/login",
    "endPage": "/logout",
    "events": [
      {
        "eventId": "event123",
        "type": "page_view",
        "page": "/login",
        "timestamp": "2025-04-22T08:30:00Z",
        "sequenceIndex": 0
      },
      {
        "eventId": "event124",
        "type": "form_submit",
        "page": "/login",
        "timestamp": "2025-04-22T08:31:00Z",
        "sequenceIndex": 1
      },
      {
        "eventId": "event125",
        "type": "page_view",
        "page": "/dashboard",
        "timestamp": "2025-04-22T08:32:00Z",
        "sequenceIndex": 2
      }
    ]
  }
}
```

## Cohort Analysis API

Analyze user cohorts and their behavior over time.

### Endpoints

#### POST /api/cohorts
Create a new cohort.

**Request:**
```json
{
  "projectId": "project123",
  "name": "January Signups",
  "description": "Users who signed up in January 2025",
  "criteria": {
    "registrationDateStart": "2025-01-01",
    "registrationDateEnd": "2025-01-31"
  },
  "isDynamic": true
}
```

**Response:**
```json
{
  "success": true,
  "cohort": {
    "cohortId": "cohort123",
    "name": "January Signups",
    "description": "Users who signed up in January 2025",
    "criteria": {
      "registrationDateStart": "2025-01-01",
      "registrationDateEnd": "2025-01-31"
    },
    "creationDate": "2025-04-22T09:00:00Z",
    "isDynamic": true,
    "userCount": 0
  }
}
```

#### GET /api/cohorts
Get all cohorts.

**Query Parameters:**
- `projectId` (required): Project ID
- `limit`: Maximum number of cohorts to return (default: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "cohorts": [
    {
      "cohortId": "cohort123",
      "name": "January Signups",
      "description": "Users who signed up in January 2025",
      "creationDate": "2025-04-22T09:00:00Z",
      "isDynamic": true,
      "userCount": 256
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 100,
    "offset": 0
  }
}
```

#### GET /api/cohorts/:cohortId
Get a specific cohort.

**Query Parameters:**
- `includeMembers`: Whether to include cohort members (default: false)
- `includeMetrics`: Whether to include cohort metrics (default: false)
- `membersLimit`: Maximum number of members to return (default: 100)
- `membersOffset`: Offset for members pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "cohort": {
    "cohortId": "cohort123",
    "name": "January Signups",
    "description": "Users who signed up in January 2025",
    "criteria": {
      "registrationDateStart": "2025-01-01",
      "registrationDateEnd": "2025-01-31"
    },
    "creationDate": "2025-04-22T09:00:00Z",
    "isDynamic": true,
    "userCount": 256,
    "members": [
      {
        "userId": "user123",
        "joinDate": "2025-04-22T09:00:00Z",
        "properties": {
          "email": "user@example.com",
          "plan": "premium"
        }
      }
    ],
    "metrics": [
      {
        "periodNum": 0,
        "startDate": "2025-01-01T00:00:00Z",
        "endDate": "2025-01-31T23:59:59Z",
        "activeUsers": 256,
        "retentionRate": 1.0,
        "conversionRate": 0.45,
        "revenue": 12500,
        "eventsCount": 15243
      }
    ]
  }
}
```

#### POST /api/cohorts/:cohortId/users
Add a user to a cohort.

**Request:**
```json
{
  "userId": "user456",
  "properties": {
    "email": "user456@example.com",
    "plan": "basic"
  }
}
```

**Response:**
```json
{
  "success": true,
  "cohortId": "cohort123",
  "userId": "user456",
  "joinDate": "2025-04-22T09:10:00Z",
  "properties": {
    "email": "user456@example.com",
    "plan": "basic"
  }
}
```

#### DELETE /api/cohorts/:cohortId/users/:userId
Remove a user from a cohort.

**Response:**
```json
{
  "success": true,
  "cohortId": "cohort123",
  "userId": "user456",
  "removed": true
}
```

#### POST /api/cohorts/:cohortId/metrics
Calculate metrics for a cohort.

**Request:**
```json
{
  "startDate": "2025-01-01",
  "endDate": "2025-03-31",
  "periodType": "month",
  "metrics": ["retention", "conversion", "revenue", "events"]
}
```

**Response:**
```json
{
  "success": true,
  "cohortId": "cohort123",
  "name": "January Signups",
  "userCount": 256,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-03-31T23:59:59Z",
  "periodType": "month",
  "metrics": [
    {
      "periodNum": 0,
      "startDate": "2025-01-01T00:00:00Z",
      "endDate": "2025-01-31T23:59:59Z",
      "activeUsers": 256,
      "retentionRate": 1.0,
      "conversionRate": 0.45,
      "revenue": 12500,
      "eventsCount": 15243
    },
    {
      "periodNum": 1,
      "startDate": "2025-02-01T00:00:00Z",
      "endDate": "2025-02-28T23:59:59Z",
      "activeUsers": 230,
      "retentionRate": 0.9,
      "conversionRate": 0.52,
      "revenue": 14200,
      "eventsCount": 13567
    },
    {
      "periodNum": 2,
      "startDate": "2025-03-01T00:00:00Z",
      "endDate": "2025-03-31T23:59:59Z",
      "activeUsers": 210,
      "retentionRate": 0.82,
      "conversionRate": 0.55,
      "revenue": 15800,
      "eventsCount": 12345
    }
  ]
}
```

## A/B Testing API

Create and manage A/B tests.

### Endpoints

#### POST /api/experiments
Create a new experiment.

**Request:**
```json
{
  "projectId": "project123",
  "name": "Button Color Test",
  "description": "Testing different button colors",
  "variants": [
    { "name": "Control", "description": "Blue button", "weight": 1 },
    { "name": "Variant A", "description": "Green button", "weight": 1 },
    { "name": "Variant B", "description": "Red button", "weight": 1 }
  ],
  "trafficPercentage": 100,
  "status": "draft"
}
```

**Response:**
```json
{
  "success": true,
  "experiment": {
    "experimentId": "exp123",
    "name": "Button Color Test",
    "description": "Testing different button colors",
    "status": "draft",
    "trafficPercentage": 100,
    "variants": [
      { "variantId": "var1", "name": "Control", "description": "Blue button", "weight": 1 },
      { "variantId": "var2", "name": "Variant A", "description": "Green button", "weight": 1 },
      { "variantId": "var3", "name": "Variant B", "description": "Red button", "weight": 1 }
    ],
    "creationDate": "2025-04-22T09:30:00Z"
  }
}
```

#### GET /api/experiments
Get all experiments.

**Query Parameters:**
- `projectId` (required): Project ID
- `status`: Filter by status (draft, active, completed)
- `limit`: Maximum number of experiments to return (default: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "experiments": [
    {
      "experimentId": "exp123",
      "name": "Button Color Test",
      "description": "Testing different button colors",
      "status": "draft",
      "trafficPercentage": 100,
      "creationDate": "2025-04-22T09:30:00Z"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 100,
    "offset": 0
  }
}
```

#### GET /api/experiments/:experimentId
Get a specific experiment.

**Query Parameters:**
- `includeVariants`: Whether to include variants (default: true)
- `includeResults`: Whether to include results (default: false)

**Response:**
```json
{
  "success": true,
  "experiment": {
    "experimentId": "exp123",
    "name": "Button Color Test",
    "description": "Testing different button colors",
    "status": "active",
    "trafficPercentage": 100,
    "startDate": "2025-04-22T10:00:00Z",
    "endDate": null,
    "winningVariant": null,
    "variants": [
      { "variantId": "var1", "name": "Control", "description": "Blue button", "weight": 1 },
      { "variantId": "var2", "name": "Variant A", "description": "Green button", "weight": 1 },
      { "variantId": "var3", "name": "Variant B", "description": "Red button", "weight": 1 }
    ],
    "results": [
      {
        "variantId": "var1",
        "variantName": "Control",
        "participants": 324,
        "conversions": 45,
        "conversionRate": 0.139,
        "pValue": 0.5,
        "isSignificant": false
      },
      {
        "variantId": "var2",
        "variantName": "Variant A",
        "participants": 315,
        "conversions": 52,
        "conversionRate": 0.165,
        "pValue": 0.04,
        "isSignificant": true
      },
      {
        "variantId": "var3",
        "variantName": "Variant B",
        "participants": 310,
        "conversions": 38,
        "conversionRate": 0.123,
        "pValue": 0.12,
        "isSignificant": false
      }
    ]
  }
}
```

#### PUT /api/experiments/:experimentId
Update an experiment.

**Request:**
```json
{
  "name": "Updated Button Test",
  "description": "Updated description",
  "trafficPercentage": 50,
  "status": "active"
}
```

**Response:**
```json
{
  "success": true,
  "experiment": {
    "experimentId": "exp123",
    "name": "Updated Button Test",
    "description": "Updated description",
    "status": "active",
    "trafficPercentage": 50,
    "startDate": "2025-04-22T10:15:00Z",
    "endDate": null,
    "winningVariant": null
  }
}
```

#### POST /api/experiments/:experimentId/assign
Assign a user to a variant.

**Request:**
```json
{
  "userId": "user123",
  "sessionId": "session456",
  "forcedVariantId": null
}
```

**Response:**
```json
{
  "success": true,
  "experimentId": "exp123",
  "variantId": "var2",
  "variantName": "Variant A",
  "userId": "user123",
  "sessionId": "session456",
  "isNewAssignment": true
}
```

#### POST /api/experiments/:experimentId/convert
Track a conversion for an experiment.

**Request:**
```json
{
  "userId": "user123",
  "sessionId": "session456",
  "metricName": "signup_completion",
  "metricValue": 1
}
```

**Response:**
```json
{
  "success": true,
  "experimentId": "exp123",
  "variantId": "var2",
  "metricName": "signup_completion",
  "metricValue": 1
}
```

#### POST /api/experiments/:experimentId/results
Calculate results for an experiment.

**Response:**
```json
{
  "success": true,
  "experimentId": "exp123",
  "name": "Updated Button Test",
  "status": "active",
  "startDate": "2025-04-22T10:15:00Z",
  "endDate": null,
  "winningVariant": "var2",
  "results": [
    {
      "variantId": "var1",
      "variantName": "Control",
      "participants": 324,
      "conversions": 45,
      "conversionRate": 0.139,
      "pValue": 0.5,
      "isSignificant": false
    },
    {
      "variantId": "var2",
      "variantName": "Variant A",
      "participants": 315,
      "conversions": 52,
      "conversionRate": 0.165,
      "pValue": 0.04,
      "isSignificant": true
    },
    {
      "variantId": "var3",
      "variantName": "Variant B",
      "participants": 310,
      "conversions": 38,
      "conversionRate": 0.123,
      "pValue": 0.12,
      "isSignificant": false
    }
  ]
}
```

## Session Recording API

Record and replay user sessions.

### Endpoints

#### POST /api/recordings
Start a new recording session.

**Request:**
```json
{
  "projectId": "project123",
  "sessionId": "session456",
  "userId": "user123",
  "url": "https://example.com/dashboard",
  "userAgent": "Mozilla/5.0...",
  "deviceInfo": {
    "deviceType": "desktop",
    "browser": "Chrome",
    "os": "Windows",
    "country": "US"
  }
}
```

**Response:**
```json
{
  "success": true,
  "recording": {
    "recordingId": "rec123",
    "sessionId": "session456",
    "userId": "user123",
    "startTime": "2025-04-22T10:30:00Z",
    "url": "https://example.com/dashboard",
    "deviceType": "desktop",
    "browser": "Chrome",
    "os": "Windows"
  }
}
```

#### POST /api/recordings/:recordingId/events
Add an event to a recording.

**Request:**
```json
{
  "sessionId": "session456",
  "eventType": "click",
  "eventData": {
    "element": { "tag": "button", "id": "save-button" },
    "x": 150,
    "y": 300
  },
  "timestamp": "2025-04-22T10:30:15Z"
}
```

**Response:**
```json
{
  "success": true,
  "eventId": "evt123",
  "recordingId": "rec123",
  "sessionId": "session456",
  "eventType": "click",
  "timestamp": "2025-04-22T10:30:15Z",
  "sequenceIndex": 0
}
```

#### POST /api/recordings/:recordingId/end
End a recording session.

**Response:**
```json
{
  "success": true,
  "recordingId": "rec123",
  "sessionId": "session456",
  "userId": "user123",
  "startTime": "2025-04-22T10:30:00Z",
  "endTime": "2025-04-22T10:45:00Z",
  "duration": 900,
  "eventCount": 156
}
```

#### GET /api/recordings
Get recordings with filters.

**Query Parameters:**
- `projectId` (required): Project ID
- `userId`: Filter by user ID
- `sessionId`: Filter by session ID
- `url`: Filter by URL
- `deviceType`: Filter by device type
- `browser`: Filter by browser
- `startTimeFrom`: Filter by start time (from)
- `startTimeTo`: Filter by start time (to)
- `minDuration`: Minimum duration in seconds
- `maxDuration`: Maximum duration in seconds
- `limit`: Maximum number of recordings to return (default: 10)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "recordings": [
    {
      "recordingId": "rec123",
      "sessionId": "session456",
      "userId": "user123",
      "startTime": "2025-04-22T10:30:00Z",
      "endTime": "2025-04-22T10:45:00Z",
      "duration": 900,
      "url": "https://example.com/dashboard",
      "deviceType": "desktop",
      "browser": "Chrome",
      "os": "Windows",
      "eventCount": 156
    }
  ],
  "pagination": {
    "total": 543,
    "limit": 10,
    "offset": 0
  }
}
```

#### GET /api/recordings/:recordingId
Get a specific recording with events.

**Query Parameters:**
- `includeEvents`: Whether to include events (default: true)
- `startIndex`: Starting index for events (default: 0)
- `limit`: Maximum number of events to return (default: 1000)

**Response:**
```json
{
  "success": true,
  "recording": {
    "recordingId": "rec123",
    "sessionId": "session456",
    "userId": "user123",
    "startTime": "2025-04-22T10:30:00Z",
    "endTime": "2025-04-22T10:45:00Z",
    "duration": 900,
    "url": "https://example.com/dashboard",
    "deviceType": "desktop",
    "browser": "Chrome",
    "os": "Windows",
    "eventCount": 156,
    "events": [
      {
        "eventId": "evt123",
        "eventType": "click",
        "timestamp": "2025-04-22T10:30:15Z",
        "sequenceIndex": 0,
        "data": {
          "element": { "tag": "button", "id": "save-button" },
          "x": 150,
          "y": 300
        }
      }
    ],
    "eventsPagination": {
      "startIndex": 0,
      "limit": 1000,
      "hasMore": false
    }
  }
}
```

#### DELETE /api/recordings/:recordingId
Delete a recording.

**Response:**
```json
{
  "success": true,
  "recordingId": "rec123",
  "sessionId": "session456",
  "userId": "user123"
}
```

## Anomaly Detection API

Detect and manage anomalies in metrics.

### Endpoints

#### POST /api/metrics
Track a metric value.

**Request:**
```json
{
  "projectId": "project123",
  "name": "page_load_time",
  "value": 1.5,
  "timestamp": "2025-04-22T11:00:00Z",
  "dimensions": {
    "page": "/dashboard",
    "browser": "Chrome"
  }
}
```

**Response:**
```json
{
  "success": true,
  "metric": {
    "name": "page_load_time",
    "value": 1.5,
    "timestamp": "2025-04-22T11:00:00Z",
    "dimensions": {
      "page": "/dashboard",
      "browser": "Chrome"
    },
    "anomaly": {
      "anomalyId": "anom123",
      "metricName": "page_load_time",
      "value": 1.5,
      "expectedValue": 0.8,
      "deviation": 0.7,
      "score": 3.5,
      "method": "zscore",
      "severity": "medium"
    }
  }
}
```

#### GET /api/anomalies
Get anomalies with filters.

**Query Parameters:**
- `projectId` (required): Project ID
- `metricName`: Filter by metric name
- `startTime`: Filter by start time
- `endTime`: Filter by end time
- `severity`: Filter by severity (low, medium, high)
- `status`: Filter by status (active, acknowledged, resolved)
- `limit`: Maximum number of anomalies to return (default: 100)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "anomalies": [
    {
      "anomalyId": "anom123",
      "metricName": "page_load_time",
      "timestamp": "2025-04-22T11:00:00Z",
      "value": 1.5,
      "expectedValue": 0.8,
      "deviation": 0.7,
      "score": 3.5,
      "detectionMethod": "zscore",
      "severity": "medium",
      "status": "active"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 100,
    "offset": 0
  }
}
```

#### GET /api/anomalies/:anomalyId
Get a specific anomaly.

**Response:**
```json
{
  "success": true,
  "anomaly": {
    "anomalyId": "anom123",
    "metricName": "page_load_time",
    "timestamp": "2025-04-22T11:00:00Z",
    "value": 1.5,
    "expectedValue": 0.8,
    "deviation": 0.7,
    "score": 3.5,
    "detectionMethod": "zscore",
    "severity": "medium",
    "status": "active",
    "alerts": [
      {
        "alertId": "alert123",
        "timestamp": "2025-04-22T11:00:05Z",
        "message": "Anomaly detected in metric \"page_load_time\": value 1.5 is above expected value 0.80 (0.70 higher, score: 3.50)",
        "details": {
          "metricName": "page_load_time",
          "value": 1.5,
          "expectedValue": 0.8,
          "deviation": 0.7,
          "score": 3.5,
          "severity": "medium",
          "dimensions": {
            "page": "/dashboard",
            "browser": "Chrome"
          }
        },
        "notificationSent": true
      }
    ]
  }
}
```

#### PUT /api/anomalies/:anomalyId/status
Update anomaly status.

**Request:**
```json
{
  "status": "acknowledged"
}
```

**Response:**
```json
{
  "success": true,
  "anomaly": {
    "anomalyId": "anom123",
    "metricName": "page_load_time",
    "timestamp": "2025-04-22T11:00:00Z",
    "value": 1.5,
    "expectedValue": 0.8,
    "deviation": 0.7,
    "score": 3.5,
    "detectionMethod": "zscore",
    "severity": "medium",
    "status": "acknowledged"
  }
}
```

## Heatmaps API

Create and manage heatmaps for visualizing user interactions.

### Endpoints

#### POST /api/heatmaps
Create a new heatmap.

**Request:**
```json
{
  "projectId": "project123",
  "url": "https://example.com/landing",
  "pageTitle": "Landing Page",
  "type": "click",
  "deviceType": "desktop",
  "viewportWidth": 1920,
  "viewportHeight": 1080
}
```

**Response:**
```json
{
  "success": true,
  "heatmap": {
    "heatmapId": "hmap123",
    "url": "https://example.com/landing",
    "pageTitle": "Landing Page",
    "type": "click",
    "deviceType": "desktop",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "creationDate": "2025-04-22T11:30:00Z",
    "lastUpdated": "2025-04-22T11:30:00Z",
    "interactionCount": 0
  }
}
```

#### POST /api/heatmaps/:heatmapId/interactions
Track an interaction for a heatmap.

**Request:**
```json
{
  "sessionId": "session456",
  "userId": "user123",
  "type": "click",
  "x": 500,
  "y": 300,
  "value": 1,
  "timestamp": "2025-04-22T11:35:00Z",
  "metadata": {
    "element": { "tag": "button", "id": "signup-button" }
  }
}
```

**Response:**
```json
{
  "success": true,
  "interactionId": "inter123",
  "heatmapId": "hmap123",
  "sessionId": "session456",
  "type": "click",
  "x": 500,
  "y": 300,
  "timestamp": "2025-04-22T11:35:00Z"
}
```

#### POST /api/heatmaps/:heatmapId/screenshots
Add a screenshot for a heatmap.

**Request:**
```json
{
  "filePath": "/uploads/screenshots/landing-page.png",
  "width": 1920,
  "height": 1080,
  "fileSize": 256000,
  "timestamp": "2025-04-22T11:40:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "screenshotId": "ss123",
  "heatmapId": "hmap123",
  "filePath": "/uploads/screenshots/landing-page.png",
  "width": 1920,
  "height": 1080,
  "fileSize": 256000,
  "timestamp": "2025-04-22T11:40:00Z"
}
```

#### GET /api/heatmaps
Get heatmaps with filters.

**Query Parameters:**
- `projectId` (required): Project ID
- `url`: Filter by URL
- `type`: Filter by type (click, move, scroll, attention)
- `deviceType`: Filter by device type (desktop, tablet, mobile)
- `limit`: Maximum number of heatmaps to return (default: 10)
- `offset`: Offset for pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "heatmaps": [
    {
      "heatmapId": "hmap123",
      "url": "https://example.com/landing",
      "pageTitle": "Landing Page",
      "type": "click",
      "deviceType": "desktop",
      "viewportWidth": 1920,
      "viewportHeight": 1080,
      "creationDate": "2025-04-22T11:30:00Z",
      "lastUpdated": "2025-04-22T11:35:00Z",
      "interactionCount": 1
    }
  ],
  "pagination": {
    "total": 15,
    "limit": 10,
    "offset": 0
  }
}
```

#### GET /api/heatmaps/:heatmapId
Get a specific heatmap.

**Query Parameters:**
- `includeInteractions`: Whether to include interactions (default: false)
- `includeScreenshots`: Whether to include screenshots (default: true)
- `limit`: Maximum number of interactions to return (default: 1000)
- `offset`: Offset for interactions pagination (default: 0)

**Response:**
```json
{
  "success": true,
  "heatmap": {
    "heatmapId": "hmap123",
    "url": "https://example.com/landing",
    "pageTitle": "Landing Page",
    "type": "click",
    "deviceType": "desktop",
    "viewportWidth": 1920,
    "viewportHeight": 1080,
    "creationDate": "2025-04-22T11:30:00Z",
    "lastUpdated": "2025-04-22T11:35:00Z",
    "interactionCount": 1,
    "interactions": [
      {
        "interactionId": "inter123",
        "type": "click",
        "x": 500,
        "y": 300,
        "value": 1,
        "timestamp": "2025-04-22T11:35:00Z",
        "metadata": {
          "element": { "tag": "button", "id": "signup-button" }
        }
      }
    ],
    "screenshots": [
      {
        "screenshotId": "ss123",
        "timestamp": "2025-04-22T11:40:00Z",
        "filePath": "/uploads/screenshots/landing-page.png",
        "width": 1920,
        "height": 1080,
        "fileSize": 256000
      }
    ]
  }
}
```

#### GET /api/heatmaps/:heatmapId/data
Generate heatmap data for visualization.

**Query Parameters:**
- `resolution`: Grid cell size in pixels (default: 10)
- `blur`: Blur radius (default: 15)
- `maxOpacity`: Maximum opacity (default: 0.8)
- `minOpacity`: Minimum opacity (default: 0.05)
- `radius`: Point radius (default: 25)

**Response:**
```json
{
  "success": true,
  "heatmapData": {
    "heatmapId": "hmap123",
    "url": "https://example.com/landing",
    "type": "click",
    "width": 1920,
    "height": 1080,
    "resolution": 10,
    "blur": 15,
    "maxOpacity": 0.8,
    "minOpacity": 0.05,
    "radius": 25,
    "gradient": {
      "0.4": "blue",
      "0.6": "cyan",
      "0.7": "lime",
      "0.8": "yellow",
      "1.0": "red"
    },
    "points": [
      { "x": 500, "y": 300, "value": 1 }
    ],
    "grid": [
      [0, 0, 0, 0.5, 1, 0.5, 0, 0, 0]
    ],
    "maxValue": 1,
    "interactionCount": 1
  }
}
```

#### DELETE /api/heatmaps/:heatmapId
Delete a heatmap.

**Response:**
```json
{
  "success": true,
  "heatmapId": "hmap123",
  "url": "https://example.com/landing",
  "type": "click"
}
```

## SDK Integration

The RadixInsight SDK provides an easy way to integrate analytics into web and Node.js applications.

### Installation

```bash
npm install radix-insight-sdk
```

### Browser Usage

```javascript
import { initRadix } from 'radix-insight-sdk';

// Initialize the SDK
const analytics = initRadix({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  options: {
    automaticPageViews: true,
    sessionTimeout: 30, // minutes
    batchInterval: 2000, // milliseconds
    maxBatchSize: 10
  }
});

// Identify a user
analytics.identify('user123', {
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium'
});

// Track an event
analytics.track('button_click', {
  buttonId: 'signup-button',
  page: '/landing'
});

// Track a page view manually
analytics.pageView('/dashboard', 'User Dashboard');

// Reset user identification
analytics.reset();
```

### Node.js Usage

```javascript
const { initRadix } = require('radix-insight-sdk');

// Initialize the SDK
const analytics = initRadix({
  apiKey: 'your-api-key',
  projectId: 'your-project-id',
  options: {
    batchInterval: 5000, // milliseconds
    maxBatchSize: 50
  }
});

// Track server-side events
analytics.track('api_request', {
  endpoint: '/api/users',
  method: 'GET',
  responseTime: 45,
  statusCode: 200
}, 'user123');

// Flush events immediately
analytics.flush();
```

## Link Validation

The link validation system checks for broken links in HTML and Markdown files.

### CLI Usage

```bash
# Basic usage
node utils/link-validator/cli.js --dir ./docs --output validation-report.json

# Advanced options
node utils/link-validator/cli.js --dir ./docs --exclude node_modules,dist --check-external --timeout 5000 --output validation-report.json
```

### API Usage

```javascript
const { validateLinks } = require('./utils/link-validator');

// Basic usage
const results = await validateLinks({
  directories: ['./docs', './public'],
  excludePatterns: ['node_modules', '.git']
});

// Advanced options
const results = await validateLinks({
  directories: ['./docs', './public'],
  excludePatterns: ['node_modules', '.git'],
  checkExternal: true,
  timeout: 5000,
  concurrency: 5,
  fileTypes: ['.html', '.md', '.txt']
});

console.log(`Total links checked: ${results.totalLinks}`);
console.log(`Valid links: ${results.validLinks}`);
console.log(`Broken links: ${results.brokenLinks}`);

// Access detailed results
results.links.forEach(link => {
  if (!link.valid) {
    console.log(`Broken link: ${link.url} in file ${link.file}`);
    console.log(`Error: ${link.error}`);
  }
});
```

## Visualization Components

The visualization components provide interactive data visualizations using D3.js.

### Basic Usage

```html
<div id="chart-container" style="width: 600px; height: 400px;"></div>

<script src="/js/visualizations/index.js"></script>
<script>
  // Create a pie chart
  const pieChart = RadixVisualizations.createPieChart('#chart-container', {
    data: [
      { label: 'Category A', value: 30 },
      { label: 'Category B', value: 45 },
      { label: 'Category C', value: 25 }
    ],
    title: 'Sales by Category',
    colors: ['#3366CC', '#DC3912', '#FF9900'],
    donut: true,
    donutRatio: 0.5,
    legend: true
  });
  
  // Export as SVG
  pieChart.exportSVG('sales-chart.svg');
  
  // Export as PNG
  pieChart.exportPNG('sales-chart.png');
</script>
```

### Available Visualizations

#### Pie Chart

```javascript
const pieChart = RadixVisualizations.createPieChart('#container', {
  data: [
    { label: 'Category A', value: 30 },
    { label: 'Category B', value: 45 },
    { label: 'Category C', value: 25 }
  ],
  title: 'Sales by Category',
  colors: ['#3366CC', '#DC3912', '#FF9900'],
  donut: true,
  donutRatio: 0.5,
  legend: true
});
```

#### Data Table

```javascript
const dataTable = RadixVisualizations.createDataTable('#container', {
  data: [
    { id: 1, name: 'John Doe', email: 'john@example.com', age: 32 },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', age: 28 },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', age: 45 }
  ],
  columns: [
    { key: 'id', label: 'ID', sortable: true },
    { key: 'name', label: 'Name', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'age', label: 'Age', sortable: true }
  ],
  pagination: true,
  pageSize: 10,
  search: true
});

// Export as CSV
dataTable.exportCSV('users.csv');
```

#### Flow Diagram

```javascript
const flowDiagram = RadixVisualizations.createFlowDiagram('#container', {
  nodes: [
    { id: 'start', label: 'Start', type: 'start' },
    { id: 'signup', label: 'Signup Page', type: 'page' },
    { id: 'form', label: 'Form Submission', type: 'action' },
    { id: 'confirmation', label: 'Confirmation', type: 'page' },
    { id: 'end', label: 'End', type: 'end' }
  ],
  links: [
    { source: 'start', target: 'signup', value: 1000 },
    { source: 'signup', target: 'form', value: 800 },
    { source: 'form', target: 'confirmation', value: 600 },
    { source: 'confirmation', target: 'end', value: 500 }
  ],
  direction: 'horizontal',
  nodeWidth: 150,
  nodeHeight: 50,
  linkColor: '#999',
  nodeColors: {
    start: '#4CAF50',
    page: '#2196F3',
    action: '#FF9800',
    end: '#F44336'
  }
});
```

For more examples and detailed documentation, see the `public/visualizations-demo.html` file.
