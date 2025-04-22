# RadixInsight: Data Flow and Event Tracking Logic

This document details the data flow architecture and event tracking logic for the RadixInsight platform.

## 1. Event Data Structure

### 1.1 Core Event Schema

Every event tracked in RadixInsight will follow this base schema:

```json
{
  "event_id": "uuid-v4-string",
  "event_name": "string",
  "project_id": "string",
  "timestamp": "ISO8601 datetime",
  "user": {
    "user_id": "string",
    "anonymous_id": "string (optional)",
    "session_id": "string"
  },
  "context": {
    "ip": "string (optional)",
    "user_agent": "string (optional)",
    "locale": "string (optional)",
    "page": {
      "url": "string (optional)",
      "referrer": "string (optional)",
      "title": "string (optional)"
    },
    "app": {
      "name": "string (optional)",
      "version": "string (optional)"
    },
    "device": {
      "type": "string (optional)",
      "manufacturer": "string (optional)",
      "model": "string (optional)"
    }
  },
  "properties": {
    // Custom event properties as key-value pairs
  }
}
```

### 1.2 Event Types

Events will be categorized into the following types:

1. **Page/Screen Events**: Tracking page views and screen loads
   - `page_view`, `screen_view`

2. **User Action Events**: Tracking specific user interactions
   - `button_click`, `form_submit`, `link_click`, etc.

3. **Lifecycle Events**: Tracking user journey stages
   - `signup_started`, `signup_completed`, `onboarding_step_1`, etc.

4. **System Events**: Tracking application behavior
   - `api_call`, `error_occurred`, `performance_metric`, etc.

5. **Custom Events**: Organization-specific events
   - Defined by individual teams based on their needs

### 1.3 User Identity Management

RadixInsight will support both identified and anonymous users:

- **Identified Users**: Tracked with a persistent `user_id`
- **Anonymous Users**: Tracked with a cookie-based `anonymous_id`
- **Identity Resolution**: Logic to merge anonymous activity with user accounts after identification
- **Session Management**: Using `session_id` to group events within a single user session

## 2. Data Flow Architecture

### 2.1 Event Collection Flow

```
[Client Application] → [JS SDK] → [API Gateway] → [Event Ingestion Service] → [Kafka/Redis Streams] → [Event Consumer Service] → [ClickHouse]
```

1. **Event Generation**: User interacts with application, triggering event
2. **SDK Capture**: JS SDK captures event details and context
3. **Event Batching**: SDK batches events (configurable, default: 10 events or 5 seconds)
4. **API Submission**: Batched events sent to API Gateway
5. **Validation & Enrichment**: Events validated against schema and enriched with metadata
6. **Queueing**: Valid events published to message queue
7. **Consumption**: Events consumed from queue and prepared for storage
8. **Storage**: Events written to ClickHouse database

### 2.2 Analytics Query Flow

```
[Dashboard UI] → [API Gateway] → [Analytics Engine] → [ClickHouse] → [Analytics Engine] → [API Gateway] → [Dashboard UI]
```

1. **Query Construction**: User builds query through dashboard interface
2. **API Request**: Query parameters sent to API Gateway
3. **Query Processing**: Analytics Engine translates request to optimized ClickHouse query
4. **Data Retrieval**: ClickHouse executes query and returns results
5. **Result Processing**: Analytics Engine formats and aggregates results
6. **Response Delivery**: Processed results returned to dashboard
7. **Visualization**: Dashboard renders data visualizations

### 2.3 Real-time Processing Flow

For real-time analytics and alerting:

```
[Kafka/Redis Streams] → [Stream Processing Service] → [Alert Manager] → [Notification Service]
```

1. **Stream Tapping**: Stream processor subscribes to event stream
2. **Pattern Matching**: Processor identifies events matching alert conditions
3. **Alert Generation**: Matching events trigger alert creation
4. **Notification**: Alerts delivered via configured channels (email, Slack, etc.)

## 3. Event Tracking Implementation

### 3.1 JavaScript SDK Implementation

The SDK will be implemented with these principles:

- **Minimal Core**: Base functionality under 5KB gzipped
- **Asynchronous Loading**: Non-blocking page load
- **Graceful Degradation**: Fallback mechanisms for errors
- **Configurable Batching**: Adjustable batch size and frequency
- **Retry Logic**: Exponential backoff for failed submissions
- **Local Storage Backup**: Offline event caching

Example SDK initialization:

```javascript
// Initialize RadixInsight SDK
RadixInsight.init({
  projectId: 'internal-crm',
  endpoint: 'https://api.radixinsight.company.com/collect',
  batchSize: 10,
  batchInterval: 5000, // milliseconds
  debug: false
});

// Identify user
RadixInsight.identify('user-123', {
  email: 'user@company.com',
  department: 'Sales',
  role: 'Manager'
});

// Track event
RadixInsight.track('button_click', {
  button_id: 'submit-form',
  form_id: 'lead-capture',
  page_section: 'hero'
});
```

### 3.2 Server-Side API Implementation

For server-generated events:

```python
# Python example
import requests
import uuid
import time
import json

def track_event(event_name, user_id, properties=None):
    event = {
        "event_id": str(uuid.uuid4()),
        "event_name": event_name,
        "project_id": "backend-service",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime()),
        "user": {
            "user_id": user_id
        },
        "properties": properties or {}
    }
    
    response = requests.post(
        "https://api.radixinsight.company.com/collect",
        headers={"Content-Type": "application/json", "X-API-Key": "server-key-123"},
        data=json.dumps([event])
    )
    
    return response.status_code == 202
```

### 3.3 Event Validation Rules

Events will be validated against these rules:

1. **Required Fields**: `event_id`, `event_name`, `project_id`, `timestamp`
2. **Field Format Validation**: UUID format for IDs, ISO8601 for timestamps
3. **Project Validation**: Verify project_id exists in system
4. **Size Limits**: Maximum event size of 100KB
5. **Rate Limiting**: Per-project and per-user rate limits
6. **Schema Validation**: Event properties validated against registered schemas

### 3.4 Event Enrichment Process

Events will be enriched with:

1. **IP Geolocation**: Country, region, city
2. **User Agent Parsing**: Browser, OS, device details
3. **UTM Parameters**: Marketing campaign data
4. **Referrer Analysis**: Traffic source categorization
5. **Time Enrichment**: Local time, day of week, business hours flag

## 4. Data Storage Strategy

### 4.1 ClickHouse Schema Design

Primary events table structure:

```sql
CREATE TABLE events (
    event_id UUID,
    event_name String,
    project_id String,
    timestamp DateTime64(3, 'UTC'),
    user_id String,
    anonymous_id String,
    session_id String,
    ip_address String,
    user_agent String,
    country String,
    region String,
    city String,
    properties String, -- JSON stored as string
    
    -- Optimized columns for common queries
    event_date Date DEFAULT toDate(timestamp),
    event_hour UInt8 DEFAULT toHour(timestamp),
    
    INDEX idx_event_name event_name TYPE bloom_filter GRANULARITY 4,
    INDEX idx_properties properties TYPE tokenbf_v1(512, 3, 0) GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, event_date, event_name, user_id)
SETTINGS index_granularity = 8192;
```

### 4.2 Materialized Views

For common query patterns:

```sql
-- Daily event counts by project and event type
CREATE MATERIALIZED VIEW event_counts_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (project_id, event_date, event_name)
AS SELECT
    project_id,
    event_date,
    event_name,
    count() AS event_count
FROM events
GROUP BY project_id, event_date, event_name;

-- User session summary
CREATE MATERIALIZED VIEW user_sessions
ENGINE = MergeTree()
PARTITION BY toYYYYMM(session_start_date)
ORDER BY (project_id, session_start_date, user_id, session_id)
AS SELECT
    project_id,
    user_id,
    session_id,
    min(timestamp) AS session_start,
    max(timestamp) AS session_end,
    toDate(min(timestamp)) AS session_start_date,
    count() AS event_count,
    uniqExact(event_name) AS unique_event_types
FROM events
GROUP BY project_id, user_id, session_id;
```

### 4.3 Data Retention Policy

Data retention will be implemented as:

1. **Hot Storage**: Full resolution data for 90 days
2. **Warm Storage**: Aggregated daily data for 1 year
3. **Cold Storage**: Archived raw data in GCS/S3 for 7 years
4. **Data Pruning**: Automatic TTL-based deletion from ClickHouse
5. **Compliance Process**: Special handling for GDPR deletion requests

## 5. Query Optimization Strategies

### 5.1 Common Query Patterns

Optimized implementations for:

1. **Event Funnels**: Tracking conversion through defined steps
2. **Retention Analysis**: Cohort-based user retention over time
3. **Session Analysis**: User behavior within sessions
4. **Path Analysis**: Common user journeys through the application
5. **Segmentation**: User grouping by properties and behaviors

### 5.2 Query Caching Strategy

Multi-level caching approach:

1. **Result Cache**: Complete query results cached in Redis (TTL: 1 hour)
2. **Aggregate Cache**: Common aggregations cached in Redis (TTL: 4 hours)
3. **Materialized Views**: Pre-computed aggregations in ClickHouse
4. **Application-level Cache**: Dashboard component data caching

### 5.3 Performance Optimization Techniques

1. **Query Rewriting**: Automatic optimization of inefficient queries
2. **Sampling**: Using data sampling for trend analysis on large datasets
3. **Approximate Algorithms**: Using HyperLogLog for cardinality estimation
4. **Parallel Processing**: Distributing complex queries across ClickHouse cluster
5. **Time-based Partitioning**: Limiting queries to relevant time partitions
