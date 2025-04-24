# RadixInsight Database Schema Documentation

## Overview

RadixInsight uses two primary databases:

1. **PostgreSQL** - For user management, project configuration, and system settings
2. **ClickHouse** - For high-performance analytics data storage and processing

This document provides a detailed schema of both databases and documents which operations are recorded in which tables.

## PostgreSQL Database

### User Management Schema

#### `users` Table

Stores user account information and authentication details.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the user |
| `email` | VARCHAR(255) | User's email address (must be from @radix-int.com domain) |
| `password_hash` | VARCHAR(255) | Bcrypt-hashed password |
| `first_name` | VARCHAR(100) | User's first name |
| `last_name` | VARCHAR(100) | User's last name |
| `created_at` | TIMESTAMP | When the user account was created |
| `updated_at` | TIMESTAMP | When the user account was last updated |
| `last_login_at` | TIMESTAMP | When the user last logged in |
| `is_active` | BOOLEAN | Whether the user account is active |
| `is_admin` | BOOLEAN | Whether the user has admin privileges |
| `email_verified` | BOOLEAN | Whether the email has been verified |
| `verification_token` | VARCHAR(255) | Token for email verification (NULL after verification) |
| `role` | VARCHAR(50) | User role (user, admin, etc.) |

**Operations:**
- User registration: INSERT into `users` with verification_token
- Email verification: UPDATE `users` setting email_verified=true and verification_token=NULL
- User login: SELECT from `users` to verify credentials
- User profile update: UPDATE `users` with new profile information
- Password change: UPDATE `users` with new password_hash

#### `user_sessions` Table

Tracks active user sessions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the session |
| `user_id` | UUID | Foreign key to users.id |
| `token` | VARCHAR(255) | Session token |
| `created_at` | TIMESTAMP | When the session was created |
| `expires_at` | TIMESTAMP | When the session expires |
| `ip_address` | VARCHAR(45) | IP address of the client |
| `user_agent` | TEXT | User agent of the client |

**Operations:**
- User login: INSERT into `user_sessions` with new session token
- Session validation: SELECT from `user_sessions` to verify token
- User logout: DELETE from `user_sessions` to invalidate token
- Session cleanup: DELETE from `user_sessions` where expires_at < NOW()

#### `password_reset_tokens` Table

Manages password reset requests.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the reset token |
| `user_id` | UUID | Foreign key to users.id |
| `token` | VARCHAR(255) | Reset token |
| `created_at` | TIMESTAMP | When the token was created |
| `expires_at` | TIMESTAMP | When the token expires |
| `is_used` | BOOLEAN | Whether the token has been used |

**Operations:**
- Password reset request: INSERT into `password_reset_tokens` with new token
- Password reset verification: SELECT from `password_reset_tokens` to verify token
- Password reset completion: UPDATE `password_reset_tokens` setting is_used=true

### Project Management Schema

#### `projects` Table

Stores project information.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the project |
| `name` | VARCHAR(100) | Project name |
| `description` | TEXT | Project description |
| `created_at` | TIMESTAMP | When the project was created |
| `updated_at` | TIMESTAMP | When the project was last updated |
| `settings` | JSONB | Project settings as JSON |
| `created_by` | UUID | Foreign key to users.id of the creator |

**Operations:**
- Project creation: INSERT into `projects` with new project details
- Project update: UPDATE `projects` with modified project details
- Project retrieval: SELECT from `projects` to get project information
- Project deletion: DELETE from `projects` (cascades to related tables)

#### `project_members` Table

Manages project membership and roles.

| Column | Type | Description |
|--------|------|-------------|
| `project_id` | UUID | Foreign key to projects.id |
| `user_id` | UUID | Foreign key to users.id |
| `role` | VARCHAR(50) | Role of the user in the project |
| `created_at` | TIMESTAMP | When the membership was created |

**Operations:**
- Add member to project: INSERT into `project_members` with user and role
- Update member role: UPDATE `project_members` with new role
- Remove member from project: DELETE from `project_members`
- List project members: SELECT from `project_members` joined with `users`

#### `api_keys` Table

Manages API keys for project access.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the API key |
| `project_id` | UUID | Foreign key to projects.id |
| `name` | VARCHAR(100) | Name of the API key |
| `key_hash` | VARCHAR(255) | Hashed API key |
| `created_at` | TIMESTAMP | When the API key was created |
| `expires_at` | TIMESTAMP | When the API key expires |
| `is_active` | BOOLEAN | Whether the API key is active |
| `created_by` | UUID | Foreign key to users.id of the creator |

**Operations:**
- Create API key: INSERT into `api_keys` with new key details
- Validate API key: SELECT from `api_keys` to verify key_hash
- Deactivate API key: UPDATE `api_keys` setting is_active=false
- Delete API key: DELETE from `api_keys`

#### `client_configs` Table

Stores client-side configuration for projects.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the configuration |
| `project_id` | UUID | Foreign key to projects.id |
| `name` | VARCHAR(100) | Name of the configuration |
| `config` | JSONB | Configuration as JSON |
| `created_at` | TIMESTAMP | When the configuration was created |
| `updated_at` | TIMESTAMP | When the configuration was last updated |

**Operations:**
- Create client config: INSERT into `client_configs` with new config
- Update client config: UPDATE `client_configs` with modified config
- Get client config: SELECT from `client_configs` to retrieve config
- Delete client config: DELETE from `client_configs`

### Dashboard Schema

#### `dashboards` Table

Stores dashboard configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the dashboard |
| `project_id` | UUID | Foreign key to projects.id |
| `name` | VARCHAR(100) | Dashboard name |
| `description` | TEXT | Dashboard description |
| `layout` | JSONB | Dashboard layout as JSON |
| `created_at` | TIMESTAMP | When the dashboard was created |
| `updated_at` | TIMESTAMP | When the dashboard was last updated |
| `created_by` | UUID | Foreign key to users.id of the creator |

**Operations:**
- Create dashboard: INSERT into `dashboards` with new dashboard details
- Update dashboard: UPDATE `dashboards` with modified dashboard details
- Get dashboard: SELECT from `dashboards` to retrieve dashboard
- Delete dashboard: DELETE from `dashboards`

#### `saved_queries` Table

Stores saved queries for reuse.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the query |
| `project_id` | UUID | Foreign key to projects.id |
| `name` | VARCHAR(100) | Query name |
| `description` | TEXT | Query description |
| `query_type` | VARCHAR(50) | Type of query |
| `query_params` | JSONB | Query parameters as JSON |
| `created_at` | TIMESTAMP | When the query was created |
| `updated_at` | TIMESTAMP | When the query was last updated |
| `created_by` | UUID | Foreign key to users.id of the creator |

**Operations:**
- Save query: INSERT into `saved_queries` with query details
- Update saved query: UPDATE `saved_queries` with modified query details
- Execute saved query: SELECT from `saved_queries` to get query_params
- Delete saved query: DELETE from `saved_queries`

#### `visualizations` Table

Stores visualization configurations.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the visualization |
| `project_id` | UUID | Foreign key to projects.id |
| `query_id` | UUID | Foreign key to saved_queries.id |
| `name` | VARCHAR(100) | Visualization name |
| `description` | TEXT | Visualization description |
| `visualization_type` | VARCHAR(50) | Type of visualization |
| `config` | JSONB | Visualization configuration as JSON |
| `created_at` | TIMESTAMP | When the visualization was created |
| `updated_at` | TIMESTAMP | When the visualization was last updated |
| `created_by` | UUID | Foreign key to users.id of the creator |

**Operations:**
- Create visualization: INSERT into `visualizations` with new visualization details
- Update visualization: UPDATE `visualizations` with modified visualization details
- Get visualization: SELECT from `visualizations` to retrieve visualization
- Delete visualization: DELETE from `visualizations`

### Audit Schema

#### `audit_logs` Table

Records user actions for auditing.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the log entry |
| `user_id` | UUID | Foreign key to users.id |
| `action` | VARCHAR(100) | Action performed |
| `entity_type` | VARCHAR(100) | Type of entity affected |
| `entity_id` | UUID | ID of the entity affected |
| `details` | JSONB | Additional details as JSON |
| `ip_address` | VARCHAR(45) | IP address of the client |
| `user_agent` | TEXT | User agent of the client |
| `created_at` | TIMESTAMP | When the action was performed |

**Operations:**
- Record user action: INSERT into `audit_logs` with action details
- Audit review: SELECT from `audit_logs` to review user actions
- Compliance reporting: SELECT from `audit_logs` with filters for compliance reports

#### `system_logs` Table

Records system events.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key, unique identifier for the log entry |
| `component` | VARCHAR(100) | System component |
| `level` | VARCHAR(20) | Log level (info, warning, error) |
| `message` | TEXT | Log message |
| `details` | JSONB | Additional details as JSON |
| `created_at` | TIMESTAMP | When the event occurred |

**Operations:**
- Record system event: INSERT into `system_logs` with event details
- System monitoring: SELECT from `system_logs` to monitor system health
- Error investigation: SELECT from `system_logs` where level='error'

## ClickHouse Database

ClickHouse is used for high-performance analytics data storage and processing. It stores event data, user sessions, and aggregated metrics.

### Events Schema

#### `events` Table

Main table for storing all analytics events.

| Column | Type | Description |
|--------|------|-------------|
| `event_id` | UUID | Unique identifier for the event |
| `event_type` | String | Type of event |
| `event_name` | String | Name of the event |
| `timestamp` | DateTime64(3) | When the event occurred |
| `received_at` | DateTime64(3) | When the event was received |
| `project_id` | UUID | Project identifier |
| `user_id` | String | User identifier |
| `session_id` | String | Session identifier |
| `ip_address` | String | IP address of the client |
| `user_agent` | String | User agent of the client |
| `device_type` | String | Type of device |
| `os` | String | Operating system |
| `browser` | String | Browser |
| `country` | String | Country |
| `city` | String | City |
| `properties` | String | Event properties as JSON |
| `referrer` | String | Referrer URL |
| `referrer_domain` | String | Referrer domain |
| `utm_source` | String | UTM source |
| `utm_medium` | String | UTM medium |
| `utm_campaign` | String | UTM campaign |
| `utm_term` | String | UTM term |
| `utm_content` | String | UTM content |
| `date` | Date | Date of the event (for partitioning) |

**Operations:**
- Record event: INSERT into `events` with event details
- Query events: SELECT from `events` with filters for analysis
- Aggregate events: SELECT from `events` with GROUP BY for metrics

#### `user_sessions` Table

Stores session information for user analytics.

| Column | Type | Description |
|--------|------|-------------|
| `session_id` | String | Unique identifier for the session |
| `user_id` | String | User identifier |
| `project_id` | UUID | Project identifier |
| `started_at` | DateTime64(3) | When the session started |
| `ended_at` | DateTime64(3) | When the session ended |
| `duration_seconds` | Float64 | Duration of the session in seconds |
| `is_first_session` | Boolean | Whether this is the user's first session |
| `events_count` | UInt32 | Number of events in the session |
| `pages_count` | UInt32 | Number of pages viewed in the session |
| `ip_address` | String | IP address of the client |
| `user_agent` | String | User agent of the client |
| `device_type` | String | Type of device |
| `os` | String | Operating system |
| `browser` | String | Browser |
| `country` | String | Country |
| `city` | String | City |
| `entry_referrer` | String | Entry referrer URL |
| `entry_referrer_domain` | String | Entry referrer domain |
| `utm_source` | String | UTM source |
| `utm_medium` | String | UTM medium |
| `utm_campaign` | String | UTM campaign |
| `date` | Date | Date of the session (for partitioning) |

**Operations:**
- Create session: Materialized view populates from `events`
- Query sessions: SELECT from `user_sessions` with filters for analysis
- Aggregate sessions: SELECT from `user_sessions` with GROUP BY for metrics

#### `user_profiles` Table

Stores user profile information for analytics.

| Column | Type | Description |
|--------|------|-------------|
| `user_id` | String | Unique identifier for the user |
| `project_id` | UUID | Project identifier |
| `first_seen_at` | DateTime64(3) | When the user was first seen |
| `last_seen_at` | DateTime64(3) | When the user was last seen |
| `sessions_count` | UInt32 | Number of sessions |
| `events_count` | UInt32 | Number of events |
| `attributes` | String | User attributes as JSON |
| `lifetime_value` | Float64 | Lifetime value of the user |
| `average_session_duration` | Float64 | Average session duration in seconds |
| `date` | Date | Date the user was first seen (for partitioning) |

**Operations:**
- Create profile: Materialized view populates from `events`
- Update profile: Background process updates metrics
- Query profiles: SELECT from `user_profiles` with filters for analysis
- Segment users: SELECT from `user_profiles` with filters for segmentation

### Funnel Analysis Schema

#### `funnel_steps` Table

Defines steps in conversion funnels.

| Column | Type | Description |
|--------|------|-------------|
| `funnel_id` | UUID | Funnel identifier |
| `project_id` | UUID | Project identifier |
| `step_number` | UInt8 | Step number in the funnel |
| `step_name` | String | Name of the step |
| `event_type` | String | Type of event for this step |
| `event_filter` | String | Filter conditions as JSON |

**Operations:**
- Define funnel: INSERT into `funnel_steps` with step details
- Update funnel: UPDATE `funnel_steps` with modified step details
- Get funnel definition: SELECT from `funnel_steps` to retrieve funnel
- Delete funnel: DELETE from `funnel_steps`

#### `funnel_events` Table

Tracks users through funnel steps.

| Column | Type | Description |
|--------|------|-------------|
| `funnel_id` | UUID | Funnel identifier |
| `project_id` | UUID | Project identifier |
| `user_id` | String | User identifier |
| `step_number` | UInt8 | Step number in the funnel |
| `event_id` | UUID | Event identifier |
| `timestamp` | DateTime64(3) | When the step was completed |
| `date` | Date | Date of the event (for partitioning) |

**Operations:**
- Record funnel progress: Background process populates from `events`
- Analyze funnel conversion: SELECT from `funnel_events` with GROUP BY for conversion rates
- Track user journey: SELECT from `funnel_events` to follow user progress

### Retention Analysis Schema

#### `retention_cohorts` Table

Stores cohort data for retention analysis.

| Column | Type | Description |
|--------|------|-------------|
| `cohort_date` | Date | Cohort date |
| `project_id` | UUID | Project identifier |
| `users_count` | UInt32 | Number of users in the cohort |
| `day_1_count` | UInt32 | Number of users retained after 1 day |
| `day_7_count` | UInt32 | Number of users retained after 7 days |
| `day_14_count` | UInt32 | Number of users retained after 14 days |
| `day_30_count` | UInt32 | Number of users retained after 30 days |
| `day_60_count` | UInt32 | Number of users retained after 60 days |
| `day_90_count` | UInt32 | Number of users retained after 90 days |

**Operations:**
- Create cohort: Background process populates from `events`
- Update retention metrics: Background process updates retention counts
- Analyze retention: SELECT from `retention_cohorts` for retention analysis

### Aggregated Metrics Schema

#### `aggregated_events` Table

Stores pre-aggregated metrics for performance.

| Column | Type | Description |
|--------|------|-------------|
| `project_id` | UUID | Project identifier |
| `event_type` | String | Type of event |
| `date` | Date | Date of the events |
| `hour` | UInt8 | Hour of the events |
| `events_count` | UInt32 | Number of events |
| `users_count` | UInt32 | Number of unique users |

**Operations:**
- Aggregate metrics: Materialized view populates from `events`
- Query metrics: SELECT from `aggregated_events` for quick metrics retrieval
- Generate reports: SELECT from `aggregated_events` with GROUP BY for reporting

## Authentication Flow and Database Operations

### Registration Process

1. User submits registration form with email (must be @radix-int.com), password, and name
2. Backend validates email domain and password strength
3. Backend creates user record in PostgreSQL `users` table with email_verified=false and a verification_token
4. Backend sends verification email with token
5. User clicks verification link
6. Backend verifies token and updates user record with email_verified=true and verification_token=NULL

### Login Process

1. User submits login form with email and password
2. Frontend sends credentials to backend API
3. Backend checks if user exists in PostgreSQL `users` table
4. Backend verifies if email is verified (email_verified=true)
5. Backend verifies password hash
6. On successful verification:
   - Backend generates JWT token and session ID
   - Backend stores session in Redis and PostgreSQL `user_sessions` table
   - Backend returns token and user info to frontend
   - Frontend stores token in localStorage and redirects to dashboard
7. On failure:
   - Backend returns error message
   - Frontend displays error to user

### Event Tracking Process

1. Client SDK captures event on user action
2. SDK sends event to Event Ingestion Service
3. Event Ingestion Service validates event and project API key
4. Event is inserted into ClickHouse `events` table
5. Materialized views automatically update:
   - `user_sessions` table with session data
   - `user_profiles` table with user data
   - `aggregated_events` table with aggregated metrics

## Database Relationships

### PostgreSQL Relationships

- `users` ← `user_sessions` (one-to-many): A user can have multiple sessions
- `users` ← `password_reset_tokens` (one-to-many): A user can have multiple reset tokens
- `users` ← `projects` (created_by) (one-to-many): A user can create multiple projects
- `users` ↔ `projects` through `project_members` (many-to-many): Users can be members of multiple projects
- `projects` ← `api_keys` (one-to-many): A project can have multiple API keys
- `projects` ← `client_configs` (one-to-many): A project can have multiple client configurations
- `projects` ← `dashboards` (one-to-many): A project can have multiple dashboards
- `projects` ← `saved_queries` (one-to-many): A project can have multiple saved queries
- `saved_queries` ← `visualizations` (one-to-many): A saved query can have multiple visualizations

### ClickHouse Relationships

ClickHouse doesn't enforce relationships through foreign keys, but logical relationships exist:

- `events` → `user_sessions` (materialized view): Events are aggregated into sessions
- `events` → `user_profiles` (materialized view): Events are aggregated into user profiles
- `events` → `aggregated_events` (materialized view): Events are aggregated into metrics
- `funnel_steps` → `funnel_events` (background process): Funnel definitions determine funnel event tracking
- `events` → `retention_cohorts` (background process): Events are used to calculate retention metrics

## Conclusion

This document provides a comprehensive overview of the RadixInsight database schema, including tables, columns, operations, and relationships. The system uses PostgreSQL for user management and configuration data, and ClickHouse for high-performance analytics data storage and processing.
