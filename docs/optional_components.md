# RadixInsight: Optional Components

This document provides additional implementation details including code snippets, monitoring tool suggestions, and BI integration options for the RadixInsight platform.

## 1. Code Snippets & Architecture Patterns

### 1.1 JavaScript SDK Implementation

```javascript
/**
 * RadixInsight Analytics SDK
 * Lightweight client-side event tracking
 */
(function(window) {
  // Configuration defaults
  const DEFAULT_CONFIG = {
    endpoint: 'https://api.radixinsight.company.com/collect',
    batchSize: 10,
    batchInterval: 5000, // milliseconds
    retryLimit: 3,
    debug: false
  };
  
  class RadixInsight {
    constructor() {
      this.config = {...DEFAULT_CONFIG};
      this.queue = [];
      this.timer = null;
      this.userId = null;
      this.anonymousId = this._getOrCreateAnonymousId();
      this.sessionId = this._generateId();
      this.initialized = false;
      this.consentSettings = {
        analytics: true,
        profiling: false,
        sensitiveData: false
      };
    }
    
    /**
     * Initialize the SDK with configuration
     */
    init(config = {}) {
      this.config = {...DEFAULT_CONFIG, ...config};
      
      if (!this.config.projectId) {
        this._debug('Error: projectId is required');
        return false;
      }
      
      // Set up automatic event flushing
      this.timer = setInterval(() => {
        this._flushQueue();
      }, this.config.batchInterval);
      
      // Register page view on init
      this.pageView();
      
      // Set up unload handler to flush events
      window.addEventListener('beforeunload', () => {
        this._flushQueue(true);
      });
      
      this.initialized = true;
      this._debug('RadixInsight initialized with config:', this.config);
      
      return true;
    }
    
    /**
     * Identify a user
     */
    identify(userId, traits = {}) {
      if (!this.initialized) {
        this._debug('SDK not initialized');
        return false;
      }
      
      this.userId = userId;
      
      // Track identify event
      this.track('identify', {
        ...traits,
        previousAnonymousId: this.anonymousId
      });
      
      this._debug('User identified:', userId);
      return true;
    }
    
    /**
     * Track an event
     */
    track(eventName, properties = {}) {
      if (!this.initialized) {
        this._debug('SDK not initialized');
        return false;
      }
      
      // Check consent
      if (!this.consentSettings.analytics) {
        this._debug('Tracking blocked due to consent settings');
        return false;
      }
      
      // Check for sensitive data if consent not given
      if (!this.consentSettings.sensitiveData) {
        properties = this._stripPotentialPII(properties);
      }
      
      const event = {
        event_id: this._generateId(),
        event_name: eventName,
        project_id: this.config.projectId,
        timestamp: new Date().toISOString(),
        user: {
          user_id: this.userId,
          anonymous_id: this.anonymousId,
          session_id: this.sessionId
        },
        context: this._getContext(),
        properties: properties
      };
      
      this.queue.push(event);
      this._debug('Event queued:', eventName, properties);
      
      // Flush immediately if we've reached batch size
      if (this.queue.length >= this.config.batchSize) {
        this._flushQueue();
      }
      
      return true;
    }
    
    /**
     * Track page view
     */
    pageView(properties = {}) {
      const pageProperties = {
        url: window.location.href,
        path: window.location.pathname,
        referrer: document.referrer,
        title: document.title,
        ...properties
      };
      
      return this.track('page_view', pageProperties);
    }
    
    /**
     * Set consent preferences
     */
    setConsent(settings = {}) {
      this.consentSettings = {
        ...this.consentSettings,
        ...settings
      };
      
      this._debug('Consent settings updated:', this.consentSettings);
      return true;
    }
    
    /**
     * Reset user data (for logout)
     */
    reset() {
      this.userId = null;
      this.anonymousId = this._generateId();
      this.sessionId = this._generateId();
      
      // Clear any queued events
      this.queue = [];
      
      this._debug('User data reset');
      return true;
    }
    
    /**
     * Flush event queue
     */
    _flushQueue(sync = false) {
      if (this.queue.length === 0) {
        return;
      }
      
      const events = [...this.queue];
      this.queue = [];
      
      const sendData = () => {
        const options = {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(events),
          keepalive: sync // Use keepalive for beforeunload
        };
        
        fetch(this.config.endpoint, options)
          .then(response => {
            if (!response.ok) {
              throw new Error(`HTTP error ${response.status}`);
            }
            this._debug('Events sent successfully:', events.length);
            return response.json();
          })
          .catch(error => {
            this._debug('Error sending events:', error);
            // Put events back in queue for retry
            if (events.length > 0) {
              this.queue = [...events, ...this.queue];
            }
          });
      };
      
      // Use sendBeacon for sync flush if available
      if (sync && navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(events)], { type: 'application/json' });
        const success = navigator.sendBeacon(this.config.endpoint, blob);
        
        if (success) {
          this._debug('Events sent via sendBeacon:', events.length);
        } else {
          this._debug('sendBeacon failed, falling back to fetch');
          sendData();
        }
      } else {
        sendData();
      }
    }
    
    /**
     * Get browser and device context
     */
    _getContext() {
      return {
        ip: null, // Will be filled server-side
        user_agent: navigator.userAgent,
        locale: navigator.language,
        page: {
          url: window.location.href,
          referrer: document.referrer,
          title: document.title
        },
        screen: {
          width: window.screen.width,
          height: window.screen.height
        },
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        library: {
          name: 'radixinsight-js',
          version: '1.0.0'
        }
      };
    }
    
    /**
     * Strip potential PII from properties
     */
    _stripPotentialPII(properties) {
      const piiFields = [
        'email', 'phone', 'address', 'name', 'password', 'credit_card',
        'ssn', 'social_security', 'passport', 'id_number'
      ];
      
      const result = {...properties};
      
      // Remove known PII fields
      for (const field of piiFields) {
        if (field in result) {
          delete result[field];
        }
      }
      
      // Check for email patterns in other fields
      for (const [key, value] of Object.entries(result)) {
        if (typeof value === 'string' && 
            /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(value)) {
          result[key] = '[REDACTED_EMAIL]';
        }
      }
      
      return result;
    }
    
    /**
     * Generate a UUID v4
     */
    _generateId() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    /**
     * Get or create anonymous ID from storage
     */
    _getOrCreateAnonymousId() {
      try {
        const storedId = localStorage.getItem('radixinsight_anonymous_id');
        if (storedId) {
          return storedId;
        }
        
        const newId = this._generateId();
        localStorage.setItem('radixinsight_anonymous_id', newId);
        return newId;
      } catch (e) {
        // If localStorage is not available
        return this._generateId();
      }
    }
    
    /**
     * Debug logging
     */
    _debug(...args) {
      if (this.config.debug) {
        console.log('[RadixInsight]', ...args);
      }
    }
  }
  
  // Create singleton instance
  window.RadixInsight = new RadixInsight();
})(window);
```

### 1.2 Event Ingestion Service (Python/FastAPI)

```python
# app/main.py
from fastapi import FastAPI, Depends, HTTPException, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional
import asyncio
import uuid
import time
import json
import logging
from datetime import datetime, timezone

from app.auth import verify_api_key
from app.db import clickhouse_client, kafka_producer
from app.enrichment import enrich_events

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="RadixInsight Event Ingestion API",
    description="API for collecting analytics events",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific domains
    allow_credentials=True,
    allow_methods=["POST", "OPTIONS"],
    allow_headers=["*"],
)

# Models
class UserContext(BaseModel):
    user_id: Optional[str] = None
    anonymous_id: str = Field(..., min_length=1, max_length=100)
    session_id: str = Field(..., min_length=1, max_length=100)

class PageContext(BaseModel):
    url: Optional[str] = None
    referrer: Optional[str] = None
    title: Optional[str] = None

class DeviceContext(BaseModel):
    type: Optional[str] = None
    manufacturer: Optional[str] = None
    model: Optional[str] = None

class AppContext(BaseModel):
    name: Optional[str] = None
    version: Optional[str] = None

class Context(BaseModel):
    ip: Optional[str] = None
    user_agent: Optional[str] = None
    locale: Optional[str] = None
    page: Optional[PageContext] = None
    app: Optional[AppContext] = None
    device: Optional[DeviceContext] = None

class Event(BaseModel):
    event_id: str = Field(..., min_length=36, max_length=36)
    event_name: str = Field(..., min_length=1, max_length=100)
    project_id: str = Field(..., min_length=1, max_length=50)
    timestamp: str
    user: UserContext
    context: Optional[Context] = None
    properties: Dict[str, Any] = Field(default_factory=dict)
    
    @validator('event_id')
    def validate_uuid(cls, v):
        try:
            uuid.UUID(v)
            return v
        except ValueError:
            raise ValueError('event_id must be a valid UUID')
            
    @validator('timestamp')
    def validate_timestamp(cls, v):
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
            return v
        except ValueError:
            raise ValueError('timestamp must be a valid ISO8601 datetime')

# Routes
@app.post("/collect", status_code=202)
async def collect_events(
    events: List[Event],
    request: Request,
    background_tasks: BackgroundTasks,
    api_key: str = Depends(verify_api_key)
):
    # Get client IP for enrichment
    client_ip = request.client.host
    
    # Log request
    logger.info(f"Received {len(events)} events from project {events[0].project_id if events else 'unknown'}")
    
    # Process events in background
    background_tasks.add_task(process_events, events, client_ip, api_key)
    
    return {
        "status": "accepted",
        "count": len(events),
        "server_time": datetime.now(timezone.utc).isoformat()
    }

async def process_events(events: List[Event], client_ip: str, api_key: str):
    try:
        # Enrich events with IP and other metadata
        enriched_events = await enrich_events(events, client_ip)
        
        # Send to Kafka for processing
        for event in enriched_events:
            event_dict = event.dict()
            # Add metadata about the API key used
            event_dict["_metadata"] = {
                "api_key_id": api_key,
                "ingested_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Send to Kafka
            await kafka_producer.send(
                topic="events",
                value=json.dumps(event_dict).encode("utf-8"),
                key=event.project_id.encode("utf-8")
            )
        
        logger.info(f"Successfully sent {len(enriched_events)} events to Kafka")
        
        # For small deployments or MVP, we might write directly to ClickHouse
        # This is a fallback option if Kafka is not set up
        if not kafka_producer.is_connected():
            await write_events_to_clickhouse(enriched_events)
            
    except Exception as e:
        logger.error(f"Error processing events: {str(e)}")
        # In production, send to dead letter queue or error tracking

async def write_events_to_clickhouse(events: List[Event]):
    """Direct write to ClickHouse for MVP or fallback"""
    try:
        # Prepare batch insert
        rows = []
        for event in events:
            event_dict = event.dict()
            # Flatten the structure for ClickHouse
            row = {
                "event_id": event_dict["event_id"],
                "event_name": event_dict["event_name"],
                "project_id": event_dict["project_id"],
                "timestamp": event_dict["timestamp"],
                "user_id": event_dict["user"]["user_id"],
                "anonymous_id": event_dict["user"]["anonymous_id"],
                "session_id": event_dict["user"]["session_id"],
                "ip_address": event_dict["context"]["ip"] if event_dict.get("context") else None,
                "user_agent": event_dict["context"]["user_agent"] if event_dict.get("context") else None,
                "properties": json.dumps(event_dict["properties"])
            }
            rows.append(row)
        
        # Insert into ClickHouse
        await clickhouse_client.execute(
            """
            INSERT INTO events (
                event_id, event_name, project_id, timestamp, 
                user_id, anonymous_id, session_id,
                ip_address, user_agent, properties
            ) VALUES
            """,
            rows
        )
        
        logger.info(f"Successfully wrote {len(rows)} events directly to ClickHouse")
        
    except Exception as e:
        logger.error(f"Error writing to ClickHouse: {str(e)}")

# Health check endpoint
@app.get("/health")
async def health_check():
    # Check connections to dependencies
    kafka_status = "connected" if kafka_producer.is_connected() else "disconnected"
    
    try:
        ch_result = await clickhouse_client.execute("SELECT 1")
        clickhouse_status = "connected" if ch_result else "error"
    except Exception:
        clickhouse_status = "disconnected"
    
    all_healthy = kafka_status == "connected" and clickhouse_status == "connected"
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "dependencies": {
            "kafka": kafka_status,
            "clickhouse": clickhouse_status
        }
    }

# Ready check for Kubernetes
@app.get("/ready")
async def ready_check():
    # Simplified version of health check for readiness probe
    try:
        await clickhouse_client.execute("SELECT 1")
        return {"status": "ready"}
    except Exception:
        raise HTTPException(status_code=503, detail="Service not ready")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
```

### 1.3 ClickHouse Schema and Query Patterns

```sql
-- Create database
CREATE DATABASE IF NOT EXISTS radixinsight;

-- Use database
USE radixinsight;

-- Events table with optimized schema
CREATE TABLE IF NOT EXISTS events (
    -- Primary event fields
    event_id UUID,
    event_name String,
    project_id String,
    timestamp DateTime64(3, 'UTC'),
    
    -- User identification
    user_id String,
    anonymous_id String,
    session_id String,
    
    -- Context fields
    ip_address String,
    user_agent String,
    country String,
    region String,
    city String,
    
    -- Properties as JSON
    properties String, -- JSON stored as string
    
    -- Optimized columns for common queries
    event_date Date DEFAULT toDate(timestamp),
    event_hour UInt8 DEFAULT toHour(timestamp),
    
    -- Indexes for common query patterns
    INDEX idx_event_name event_name TYPE bloom_filter GRANULARITY 4,
    INDEX idx_properties properties TYPE tokenbf_v1(512, 3, 0) GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (project_id, event_date, event_name, user_id)
SETTINGS index_granularity = 8192;

-- Materialized view for daily event counts
CREATE MATERIALIZED VIEW IF NOT EXISTS event_counts_daily
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

-- Materialized view for user sessions
CREATE MATERIALIZED VIEW IF NOT EXISTS user_sessions
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

-- Example query: Event counts over time
SELECT
    event_date,
    event_name,
    count() AS event_count
FROM events
WHERE project_id = 'my-project'
  AND event_date BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY
    event_date,
    event_name
ORDER BY
    event_date ASC,
    event_count DESC;

-- Example query: Funnel analysis
WITH
-- Step 1: Users who viewed the homepage
step1 AS (
    SELECT DISTINCT user_id
    FROM events
    WHERE project_id = 'my-project'
      AND event_date BETWEEN '2025-01-01' AND '2025-01-31'
      AND event_name = 'page_view'
      AND JSONExtractString(properties, 'path') = '/'
),
-- Step 2: Users who viewed a product
step2 AS (
    SELECT DISTINCT user_id
    FROM events
    WHERE project_id = 'my-project'
      AND event_date BETWEEN '2025-01-01' AND '2025-01-31'
      AND event_name = 'page_view'
      AND JSONExtractString(properties, 'path') LIKE '/product/%'
),
-- Step 3: Users who added to cart
step3 AS (
    SELECT DISTINCT user_id
    FROM events
    WHERE project_id = 'my-project'
      AND event_date BETWEEN '2025-01-01' AND '2025-01-31'
      AND event_name = 'add_to_cart'
),
-- Step 4: Users who completed checkout
step4 AS (
    SELECT DISTINCT user_id
    FROM events
    WHERE project_id = 'my-project'
      AND event_date BETWEEN '2025-01-01' AND '2025-01-31'
      AND event_name = 'purchase_complete'
)
-- Calculate conversion at each step
SELECT
    'Homepage View' AS step_name,
    count() AS user_count,
    100.0 AS conversion_rate
FROM step1
UNION ALL
SELECT
    'Product View' AS step_name,
    count() AS user_count,
    round(100.0 * count() / (SELECT count() FROM step1), 2) AS conversion_rate
FROM step2
WHERE user_id IN (SELECT user_id FROM step1)
UNION ALL
SELECT
    'Add to Cart' AS step_name,
    count() AS user_count,
    round(100.0 * count() / (SELECT count() FROM step1), 2) AS conversion_rate
FROM step3
WHERE user_id IN (SELECT user_id FROM step2)
UNION ALL
SELECT
    'Purchase Complete' AS step_name,
    count() AS user_count,
    round(100.0 * count() / (SELECT count() FROM step1), 2) AS conversion_rate
FROM step4
WHERE user_id IN (SELECT user_id FROM step3)
ORDER BY conversion_rate DESC;

-- Example query: Retention analysis
WITH
-- Get new users by day
new_users AS (
    SELECT
        user_id,
        min(event_date) AS first_date
    FROM events
    WHERE project_id = 'my-project'
      AND event_date BETWEEN '2025-01-01' AND '2025-01-31'
      AND user_id != ''
    GROUP BY user_id
),
-- Get active days for each user
user_activity AS (
    SELECT DISTINCT
        user_id,
        event_date
    FROM events
    WHERE project_id = 'my-project'
      AND event_date BETWEEN '2025-01-01' AND '2025-02-28'
      AND user_id != ''
)
-- Calculate retention by cohort
SELECT
    first_date AS cohort_date,
    count(DISTINCT new_users.user_id) AS cohort_size,
    days_since_first AS day,
    count(DISTINCT user_activity.user_id) AS active_users,
    round(100.0 * count(DISTINCT user_activity.user_id) / count(DISTINCT new_users.user_id), 2) AS retention_rate
FROM new_users
LEFT JOIN user_activity ON new_users.user_id = user_activity.user_id
CROSS JOIN (
    -- Generate days since first visit (0-30)
    SELECT number AS days_since_first
    FROM numbers(31)
) days
WHERE event_date = addDays(first_date, days_since_first)
GROUP BY
    first_date,
    days_since_first
ORDER BY
    first_date,
    days_since_first;
```

### 1.4 React Dashboard Component Example

```tsx
// src/components/EventsOverTime.tsx
import React, { useState, useEffect } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { DateRangePicker } from 'react-date-range';
import { format, subDays } from 'date-fns';
import { Spinner, Card, CardHeader, CardBody, Select } from './ui';
import { useQuery } from 'react-query';
import { fetchEventTimeSeries } from '../api/analytics';

interface EventsOverTimeProps {
  projectId: string;
}

const EventsOverTime: React.FC<EventsOverTimeProps> = ({ projectId }) => {
  // State for date range
  const [dateRange, setDateRange] = useState({
    startDate: subDays(new Date(), 30),
    endDate: new Date(),
    key: 'selection'
  });
  
  // State for selected events
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  
  // State for granularity
  const [granularity, setGranularity] = useState<'day' | 'hour' | 'week'>('day');
  
  // Fetch event types for this project
  const { data: eventTypes, isLoading: loadingEventTypes } = useQuery(
    ['eventTypes', projectId],
    () => fetchEventTypes(projectId)
  );
  
  // Fetch time series data
  const { data: timeSeriesData, isLoading: loadingTimeSeries } = useQuery(
    ['timeSeries', projectId, dateRange, selectedEvents, granularity],
    () => fetchEventTimeSeries({
      projectId,
      startDate: format(dateRange.startDate, 'yyyy-MM-dd'),
      endDate: format(dateRange.endDate, 'yyyy-MM-dd'),
      eventNames: selectedEvents,
      granularity
    }),
    {
      enabled: selectedEvents.length > 0
    }
  );
  
  // Handle date range change
  const handleDateRangeChange = (ranges: any) => {
    setDateRange(ranges.selection);
  };
  
  // Handle event selection change
  const handleEventSelectionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const options = e.target.options;
    const selected: string[] = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selected.push(options[i].value);
      }
    }
    
    setSelectedEvents(selected);
  };
  
  // Generate colors for each event type
  const getLineColor = (index: number) => {
    const colors = [
      '#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088fe',
      '#00c49f', '#ffbb28', '#ff8042', '#a4de6c', '#d0ed57'
    ];
    return colors[index % colors.length];
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Events Over Time</h2>
          <div className="flex space-x-4">
            <Select
              value={granularity}
              onChange={(e) => setGranularity(e.target.value as any)}
            >
              <option value="hour">Hourly</option>
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
            </Select>
            
            <div className="relative">
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={() => setShowDatePicker(!showDatePicker)}
              >
                {format(dateRange.startDate, 'MMM d, yyyy')} - {format(dateRange.endDate, 'MMM d, yyyy')}
              </button>
              
              {showDatePicker && (
                <div className="absolute right-0 mt-2 z-10">
                  <DateRangePicker
                    ranges={[dateRange]}
                    onChange={handleDateRangeChange}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardBody>
        <div className="flex mb-4">
          <div className="w-1/4">
            <label className="block mb-2 font-medium">Select Events</label>
            {loadingEventTypes ? (
              <Spinner />
            ) : (
              <select
                multiple
                className="w-full h-48 border rounded p-2"
                onChange={handleEventSelectionChange}
                value={selectedEvents}
              >
                {eventTypes?.map((type: string) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
          </div>
          
          <div className="w-3/4 pl-4">
            {loadingTimeSeries ? (
              <div className="flex justify-center items-center h-80">
                <Spinner size="lg" />
              </div>
            ) : timeSeriesData && timeSeriesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <LineChart
                  data={timeSeriesData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), granularity === 'hour' ? 'HH:mm' : 'MMM d')}
                  />
                  <YAxis />
                  <Tooltip 
                    labelFormatter={(date) => format(new Date(date), granularity === 'hour' ? 'MMM d, yyyy HH:mm' : 'MMM d, yyyy')}
                  />
                  <Legend />
                  {selectedEvents.map((eventName, index) => (
                    <Line
                      key={eventName}
                      type="monotone"
                      dataKey={eventName}
                      stroke={getLineColor(index)}
                      activeDot={{ r: 8 }}
                      name={eventName}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-80 text-gray-500">
                {selectedEvents.length === 0 
                  ? "Select one or more events to visualize" 
                  : "No data available for the selected criteria"}
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
};

export default EventsOverTime;
```

## 2. Monitoring Tools Suggestions

### 2.1 Core Monitoring Stack

#### Prometheus + Grafana

Prometheus and Grafana form the backbone of the monitoring system for RadixInsight:

1. **Prometheus**:
   - Metrics collection from all services
   - Service health monitoring
   - Alert rule definitions
   - Time-series database for operational metrics

2. **Grafana**:
   - Visualization dashboards
   - Alert management
   - Multi-source data integration
   - Team-based dashboard sharing

**Implementation Example**:

```yaml
# prometheus-values.yaml for Helm
prometheus:
  prometheusSpec:
    retention: 15d
    resources:
      requests:
        memory: 2Gi
        cpu: 500m
      limits:
        memory: 4Gi
        cpu: 1000m
    storageSpec:
      volumeClaimTemplate:
        spec:
          storageClassName: standard
          accessModes: ["ReadWriteOnce"]
          resources:
            requests:
              storage: 50Gi
    additionalScrapeConfigs:
      - job_name: 'clickhouse'
        static_configs:
          - targets: ['radixinsight-clickhouse:8001']
      - job_name: 'kafka'
        static_configs:
          - targets: ['radixinsight-kafka-metrics:9308']

grafana:
  adminPassword: "${GRAFANA_ADMIN_PASSWORD}"
  persistence:
    enabled: true
    size: 10Gi
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
      - name: 'radixinsight'
        orgId: 1
        folder: 'RadixInsight'
        type: file
        disableDeletion: false
        editable: true
        options:
          path: /var/lib/grafana/dashboards/radixinsight
  dashboards:
    radixinsight:
      event-ingestion-dashboard:
        json: |
          {
            "annotations": {...},
            "editable": true,
            "gnetId": null,
            "graphTooltip": 0,
            "id": 1,
            "links": [],
            "panels": [
              {
                "aliasColors": {},
                "bars": false,
                "dashLength": 10,
                "dashes": false,
                "datasource": "Prometheus",
                "fieldConfig": {...},
                "fill": 1,
                "fillGradient": 0,
                "gridPos": {
                  "h": 8,
                  "w": 12,
                  "x": 0,
                  "y": 0
                },
                "hiddenSeries": false,
                "id": 2,
                "legend": {...},
                "lines": true,
                "linewidth": 1,
                "nullPointMode": "null",
                "options": {...},
                "percentage": false,
                "pointradius": 2,
                "points": false,
                "renderer": "flot",
                "seriesOverrides": [],
                "spaceLength": 10,
                "stack": false,
                "steppedLine": false,
                "targets": [
                  {
                    "expr": "sum(rate(radixinsight_events_received_total[5m])) by (project_id)",
                    "interval": "",
                    "legendFormat": "{{project_id}}",
                    "refId": "A"
                  }
                ],
                "thresholds": [],
                "timeFrom": null,
                "timeRegions": [],
                "timeShift": null,
                "title": "Events Received Rate",
                "tooltip": {...},
                "type": "graph",
                "xaxis": {...},
                "yaxes": [...],
                "yaxis": {...}
              }
            ],
            "refresh": "10s",
            "schemaVersion": 25,
            "style": "dark",
            "tags": [],
            "templating": {...},
            "time": {...},
            "timepicker": {...},
            "timezone": "",
            "title": "Event Ingestion Dashboard",
            "uid": "event-ingestion",
            "version": 1
          }
```

### 2.2 Application Performance Monitoring

#### Datadog APM

For comprehensive application performance monitoring:

1. **Key Features**:
   - Distributed tracing
   - Service maps
   - Real user monitoring
   - Log correlation
   - Anomaly detection

2. **Implementation**:
   ```python
   # Python service instrumentation
   from ddtrace import patch_all
   from ddtrace import tracer
   
   # Patch all supported libraries
   patch_all()
   
   # Custom span for business logic
   @tracer.wrap(service="event-ingestion", resource="process_events")
   def process_events(events):
       # Processing logic here
       pass
   ```

#### New Relic (Alternative)

As an alternative to Datadog:

1. **Key Features**:
   - Full-stack observability
   - AI-powered analytics
   - Kubernetes monitoring
   - Custom dashboards
   - Alerting platform

2. **Implementation**:
   ```javascript
   // JavaScript SDK instrumentation
   import newrelic from 'newrelic';
   
   function trackEvent(eventName, properties) {
     // Start custom transaction
     newrelic.startWebTransaction(eventName, function() {
       const transaction = newrelic.getTransaction();
       
       // Your event tracking logic
       sendEventToBackend(eventName, properties)
         .then(() => {
           // Add custom attributes
           newrelic.addCustomAttribute('eventCount', properties.length);
           transaction.end();
         })
         .catch(error => {
           newrelic.noticeError(error);
           transaction.end();
         });
     });
   }
   ```

### 2.3 Log Management

#### Loki + Promtail

For efficient log collection and querying:

1. **Key Features**:
   - Label-based log querying
   - Integration with Grafana
   - Low resource requirements
   - Multi-tenant support

2. **Implementation**:
   ```yaml
   # loki-values.yaml for Helm
   loki:
     persistence:
       enabled: true
       size: 50Gi
     config:
       schema_config:
         configs:
           - from: 2023-01-01
             store: boltdb-shipper
             object_store: gcs
             schema: v12
             index:
               prefix: loki_index_
               period: 24h
       storage_config:
         boltdb_shipper:
           active_index_directory: /data/loki/index
           cache_location: /data/loki/cache
           cache_ttl: 168h
           shared_store: gcs
         gcs:
           bucket_name: radixinsight-logs
   
   promtail:
     config:
       snippets:
         extraScrapeConfigs: |
           - job_name: kubernetes-pods
             kubernetes_sd_configs:
               - role: pod
             relabel_configs:
               - source_labels: [__meta_kubernetes_pod_label_app]
                 action: keep
                 regex: radixinsight-.*
               - source_labels: [__meta_kubernetes_pod_label_component]
                 target_label: component
               - source_labels: [__meta_kubernetes_pod_container_name]
                 target_label: container
               - source_labels: [__meta_kubernetes_namespace]
                 target_label: namespace
             pipeline_stages:
               - json:
                   expressions:
                     level: level
                     message: message
                     timestamp: timestamp
               - labels:
                   level:
               - timestamp:
                   source: timestamp
                   format: RFC3339
   ```

#### ELK Stack (Alternative)

For organizations already using Elasticsearch:

1. **Key Features**:
   - Powerful search capabilities
   - Advanced analytics
   - Machine learning features
   - Visualization with Kibana
   - Log enrichment with Logstash

2. **Implementation**:
   ```yaml
   # filebeat-values.yaml for Helm
   filebeat:
     filebeatConfig:
       filebeat.yml: |
         filebeat.inputs:
         - type: container
           paths:
             - /var/log/containers/radixinsight-*.log
           processors:
             - add_kubernetes_metadata:
                 host: ${NODE_NAME}
                 matchers:
                   - logs_path:
                       logs_path: "/var/log/containers/"
         
         processors:
           - add_cloud_metadata: ~
           - add_host_metadata: ~
         
         output.elasticsearch:
           hosts: ['${ELASTICSEARCH_HOST:elasticsearch-master:9200}']
           username: ${ELASTICSEARCH_USERNAME}
           password: ${ELASTICSEARCH_PASSWORD}
           index: "radixinsight-%{[agent.version]}-%{+yyyy.MM.dd}"
   ```

### 2.4 Error Tracking

#### Sentry

For detailed error tracking and debugging:

1. **Key Features**:
   - Real-time error tracking
   - Release tracking
   - Performance monitoring
   - Session replay
   - Issue assignment and resolution

2. **Implementation**:
   ```javascript
   // JavaScript SDK integration
   import * as Sentry from '@sentry/browser';
   
   Sentry.init({
     dsn: 'https://examplePublicKey@o0.ingest.sentry.io/0',
     environment: process.env.NODE_ENV,
     release: 'radixinsight@1.0.0',
     integrations: [
       new Sentry.BrowserTracing({
         tracePropagationTargets: ['https://api.radixinsight.company.com'],
       }),
     ],
     tracesSampleRate: 0.2,
   });
   
   // Capture errors in SDK
   try {
     // SDK code
   } catch (error) {
     Sentry.captureException(error);
     // Fallback error handling
   }
   ```

### 2.5 Uptime & Synthetic Monitoring

#### Uptime Robot + Checkly

For external monitoring of API endpoints and UI:

1. **Key Features**:
   - API endpoint monitoring
   - Browser-based UI testing
   - Global monitoring locations
   - Alerting integrations
   - Status page generation

2. **Implementation**:
   ```javascript
   // Checkly synthetic test
   const { test, expect } = require('@playwright/test');
   
   test('RadixInsight Dashboard Login', async ({ page }) => {
     // Navigate to login page
     await page.goto('https://dashboard.radixinsight.company.com/login');
     
     // Verify login form is present
     await expect(page.locator('form[data-testid="login-form"]')).toBeVisible();
     
     // Fill login form
     await page.fill('input[name="email"]', 'test@example.com');
     await page.fill('input[name="password"]', 'password123');
     
     // Click login button
     await page.click('button[type="submit"]');
     
     // Verify redirect to dashboard
     await expect(page).toHaveURL(/.*\/dashboard/);
     
     // Verify dashboard elements
     await expect(page.locator('h1:has-text("Dashboard")')).toBeVisible();
   });
   ```

## 3. BI Integration Options

### 3.1 Google BigQuery Integration

For advanced analytics and machine learning:

1. **Key Features**:
   - Serverless data warehouse
   - SQL interface
   - ML capabilities
   - Petabyte-scale analytics
   - Integration with Google Data Studio

2. **Implementation**:
   ```python
   # Python export script
   from google.cloud import bigquery
   import clickhouse_driver
   import pandas as pd
   
   def export_to_bigquery(project_id, date_from, date_to):
       # Connect to ClickHouse
       client = clickhouse_driver.Client(host='clickhouse-host')
       
       # Query data
       query = f"""
       SELECT
           event_id,
           event_name,
           project_id,
           timestamp,
           user_id,
           properties
       FROM events
       WHERE project_id = '{project_id}'
         AND event_date BETWEEN '{date_from}' AND '{date_to}'
       """
       
       # Execute query in batches
       data = []
       for batch in client.execute_iter(query, settings={'max_block_size': 100000}):
           data.append(batch)
       
       # Convert to DataFrame
       df = pd.DataFrame(data)
       
       # Initialize BigQuery client
       bq_client = bigquery.Client()
       
       # Define table reference
       table_id = f"radixinsight.events_{project_id.replace('-', '_')}"
       
       # Load data to BigQuery
       job_config = bigquery.LoadJobConfig(
           schema=[
               bigquery.SchemaField("event_id", "STRING"),
               bigquery.SchemaField("event_name", "STRING"),
               bigquery.SchemaField("project_id", "STRING"),
               bigquery.SchemaField("timestamp", "TIMESTAMP"),
               bigquery.SchemaField("user_id", "STRING"),
               bigquery.SchemaField("properties", "JSON"),
           ],
           write_disposition="WRITE_APPEND",
       )
       
       job = bq_client.load_table_from_dataframe(
           df, table_id, job_config=job_config
       )
       
       # Wait for job to complete
       job.result()
       
       print(f"Loaded {len(df)} rows to {table_id}")
   ```

### 3.2 Looker Integration

For enterprise-grade BI and visualization:

1. **Key Features**:
   - LookML modeling language
   - Self-service analytics
   - Embedded analytics
   - Data governance
   - Scheduled reporting

2. **Implementation**:
   ```lookml
   # LookML model for RadixInsight
   connection: "radixinsight_bigquery"
   
   include: "*.view.lkml"
   
   explore: events {
     label: "Event Analysis"
     description: "Analyze user events across projects"
     
     join: users {
       type: left_outer
       sql_on: ${events.user_id} = ${users.id} ;;
       relationship: many_to_one
     }
     
     join: sessions {
       type: left_outer
       sql_on: ${events.session_id} = ${sessions.id} ;;
       relationship: many_to_one
     }
   }
   
   view: events {
     sql_table_name: `radixinsight.events` ;;
     
     dimension: event_id {
       primary_key: yes
       type: string
       sql: ${TABLE}.event_id ;;
     }
     
     dimension: event_name {
       type: string
       sql: ${TABLE}.event_name ;;
     }
     
     dimension_group: timestamp {
       type: time
       timeframes: [
         raw,
         time,
         date,
         week,
         month,
         quarter,
         year
       ]
       sql: ${TABLE}.timestamp ;;
     }
     
     dimension: user_id {
       type: string
       sql: ${TABLE}.user_id ;;
     }
     
     dimension: project_id {
       type: string
       sql: ${TABLE}.project_id ;;
     }
     
     measure: count {
       type: count
       drill_fields: [event_id, event_name, timestamp_time]
     }
     
     measure: unique_users {
       type: count_distinct
       sql: ${user_id} ;;
       drill_fields: [user_id, count]
     }
   }
   ```

### 3.3 Metabase Integration

For smaller teams and simpler setup:

1. **Key Features**:
   - Open-source
   - User-friendly interface
   - SQL and visual query builders
   - Embeddable dashboards
   - Scheduled email reports

2. **Implementation**:
   ```yaml
   # metabase-values.yaml for Helm
   metabase:
     database:
       type: postgres
       host: radixinsight-postgres
       port: 5432
       dbname: metabase
       username: metabase
       password: ${METABASE_DB_PASSWORD}
     
     config:
       site-name: "RadixInsight Analytics"
       site-url: "https://metabase.radixinsight.company.com"
       
     resources:
       requests:
         memory: 2Gi
         cpu: 500m
       limits:
         memory: 4Gi
         cpu: 1000m
         
     persistence:
       enabled: true
       size: 10Gi
       
     ingress:
       enabled: true
       hosts:
         - metabase.radixinsight.company.com
       tls:
         - secretName: metabase-tls
           hosts:
             - metabase.radixinsight.company.com
   ```

### 3.4 Custom Data API for BI Tools

For integration with any BI tool:

1. **Key Features**:
   - REST API for data access
   - Authentication and authorization
   - Query parameter support
   - Data format options (JSON, CSV)
   - Rate limiting and caching

2. **Implementation**:
   ```python
   # FastAPI data export endpoint
   from fastapi import FastAPI, Depends, HTTPException, Query
   from fastapi.responses import StreamingResponse
   from typing import List, Optional
   import io
   import csv
   import json
   
   from app.auth import get_current_user, User
   from app.db import clickhouse_client
   
   app = FastAPI()
   
   @app.get("/api/v1/export")
   async def export_data(
       project_id: str,
       start_date: str,
       end_date: str,
       event_names: Optional[List[str]] = Query(None),
       format: str = "json",
       current_user: User = Depends(get_current_user)
   ):
       # Check permissions
       if not current_user.has_project_access(project_id):
           raise HTTPException(status_code=403, detail="No access to this project")
       
       # Build query
       query = f"""
       SELECT
           event_id,
           event_name,
           timestamp,
           user_id,
           properties
       FROM events
       WHERE project_id = %(project_id)s
         AND event_date BETWEEN %(start_date)s AND %(end_date)s
       """
       
       params = {
           "project_id": project_id,
           "start_date": start_date,
           "end_date": end_date
       }
       
       if event_names:
           event_list = ", ".join([f"'{e}'" for e in event_names])
           query += f" AND event_name IN ({event_list})"
       
       # Execute query
       result = await clickhouse_client.execute(query, params)
       
       # Return in requested format
       if format == "csv":
           output = io.StringIO()
           writer = csv.writer(output)
           
           # Write header
           writer.writerow(["event_id", "event_name", "timestamp", "user_id", "properties"])
           
           # Write data
           for row in result:
               writer.writerow(row)
               
           output.seek(0)
           
           return StreamingResponse(
               iter([output.getvalue()]),
               media_type="text/csv",
               headers={"Content-Disposition": f"attachment; filename=events_{project_id}.csv"}
           )
       else:
           # JSON format
           data = []
           for row in result:
               data.append({
                   "event_id": row[0],
                   "event_name": row[1],
                   "timestamp": row[2].isoformat(),
                   "user_id": row[3],
                   "properties": json.loads(row[4])
               })
               
           return {"data": data}
   ```

### 3.5 Tableau Integration

For organizations using Tableau:

1. **Key Features**:
   - Interactive visualizations
   - Data blending
   - Advanced analytics
   - Mobile-friendly dashboards
   - Enterprise governance

2. **Implementation**:
   ```python
   # Create Tableau Hyper extract
   from tableauhyperapi import HyperProcess, Connection, SqlType, TableDefinition, Inserter, CreateMode
   import clickhouse_driver
   
   def create_tableau_extract(project_id, output_path):
       # Define schema
       events_table = TableDefinition(
           table_name="events",
           columns=[
               TableDefinition.Column("event_id", SqlType.text()),
               TableDefinition.Column("event_name", SqlType.text()),
               TableDefinition.Column("timestamp", SqlType.timestamp()),
               TableDefinition.Column("user_id", SqlType.text()),
               TableDefinition.Column("properties", SqlType.text()),
           ]
       )
       
       # Connect to ClickHouse
       ch_client = clickhouse_driver.Client(host='clickhouse-host')
       
       # Query data
       query = f"""
       SELECT
           event_id,
           event_name,
           timestamp,
           user_id,
           properties
       FROM events
       WHERE project_id = '{project_id}'
         AND event_date >= dateAdd(day, -30, today())
       """
       
       result = ch_client.execute(query)
       
       # Create Hyper file
       with HyperProcess(telemetry=Telemetry.SEND_USAGE_DATA_TO_TABLEAU) as hyper:
           with Connection(hyper.endpoint, output_path, CreateMode.CREATE_AND_REPLACE) as connection:
               connection.catalog.create_table(events_table)
               
               with Inserter(connection, events_table) as inserter:
                   for row in result:
                       inserter.add_row([
                           row[0],  # event_id
                           row[1],  # event_name
                           row[2],  # timestamp
                           row[3],  # user_id
                           row[4],  # properties
                       ])
                   
                   inserter.execute()
       
       print(f"Created Tableau extract at {output_path}")
   ```
