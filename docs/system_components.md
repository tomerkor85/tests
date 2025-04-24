# RadixInsight: System Components Breakdown

This document details the system components for the RadixInsight platform, an event-based analytics solution for internal organizational use.

## 1. Frontend Components

### 1.1 Analytics Dashboard (React Application)

The primary user interface for the RadixInsight platform will be built using React with the following modules:

- **Authentication Module**: Handles user login, session management, and permission checks
- **Project Selector**: Component for switching between different organizational projects/systems
- **Date Range Selector**: Interactive calendar for selecting analysis time periods
- **Dashboard Layout Manager**: Grid-based layout system for arranging visualization widgets
- **Visualization Components**:
  - Line/Bar/Area Charts (using D3.js or Chart.js)
  - Data Tables with sorting/filtering
  - Funnel Visualizations
  - User Flow Diagrams
  - Heatmaps
  - Cohort Analysis Grids
- **Query Builder**: Visual interface for creating custom analytics queries
- **Saved Views Manager**: For storing and retrieving custom dashboard configurations
- **Export Module**: For downloading data in CSV/Excel formats
- **Admin Panel**: For user management and system configuration

### 1.2 JavaScript SDK

A lightweight client-side library for web applications to track events:

- **Core Tracker**: Minimal base functionality (~5KB gzipped)
- **Plugin System**: For extending functionality without bloating the core
- **Queue Manager**: For handling offline events and batching
- **Session Manager**: For tracking user sessions and pageviews
- **Auto-tracking Module**: Optional automatic event collection (clicks, page views)
- **Identity Management**: For associating events with user identities
- **Consent Manager**: For handling privacy preferences and consent

## 2. Backend Components

### 2.1 API Gateway

- **Authentication Service**: Validates JWT tokens and handles user sessions
- **Rate Limiting**: Prevents abuse and ensures system stability
- **Request Routing**: Directs traffic to appropriate microservices
- **Request Validation**: Ensures data format compliance
- **Logging & Monitoring**: Captures API usage metrics

### 2.2 Event Ingestion Service

- **Event Validator**: Ensures events conform to schema
- **Batch Processor**: Handles bulk event uploads
- **Deduplication Logic**: Prevents duplicate event processing
- **Enrichment Pipeline**: Adds metadata to events (IP geolocation, device info)
- **Queue Producer**: Publishes validated events to message queue

### 2.3 Event Consumer Service

- **Queue Consumer**: Reads events from message queue
- **Transformation Logic**: Prepares events for storage
- **Storage Writer**: Writes to ClickHouse and updates metadata in PostgreSQL
- **Error Handler**: Manages failed writes and retries
- **Monitoring Agent**: Reports processing metrics

### 2.4 Analytics Engine

- **Query Processor**: Translates dashboard requests into database queries
- **Aggregation Engine**: Performs complex calculations and data summarization
- **Caching Layer**: Improves performance for common queries
- **Export Service**: Generates downloadable reports
- **Scheduled Reports**: Handles recurring report generation

### 2.5 User Management Service

- **User Directory Integration**: Connects with organizational OIDC/LDAP
- **Permission Manager**: Handles role-based access control
- **Audit Logger**: Tracks system access and changes
- **Team Management**: Organizes users into functional groups

## 3. Data Storage Components

### 3.1 ClickHouse Database

- **Events Table**: Primary storage for all event data
- **Materialized Views**: For common aggregation patterns
- **Partitioning Scheme**: Time-based partitioning for performance
- **Retention Policies**: For managing data lifecycle

### 3.2 PostgreSQL Database

- **User Metadata**: User accounts, permissions, preferences
- **Project Configuration**: Settings for different organizational projects
- **Event Definitions**: Schema definitions for different event types
- **Dashboard Configurations**: Saved dashboard layouts and queries
- **System Settings**: Global configuration parameters

### 3.3 Redis Cache

- **Session Store**: For user session data
- **Query Cache**: For frequently accessed analytics results
- **Rate Limiting**: For API request throttling
- **Job Queue**: For background processing tasks

## 4. DevOps & Infrastructure Components

### 4.1 CI/CD Pipeline

- **Source Control**: GitHub repository structure
- **Build System**: Automated build processes for all components
- **Test Automation**: Unit, integration, and end-to-end tests
- **Deployment Automation**: Infrastructure as Code templates

### 4.2 Monitoring & Alerting

- **Metrics Collection**: Prometheus for system metrics
- **Log Aggregation**: For centralized logging
- **Alert Manager**: For notification routing
- **Status Dashboard**: For system health visualization

### 4.3 Security Infrastructure

- **Secret Management**: For API keys and credentials
- **Vulnerability Scanning**: For code and dependencies
- **Network Security**: Firewall rules and access controls
- **Compliance Reporting**: For internal security audits

## 5. Integration Components

### 5.1 Data Export Connectors

- **BigQuery Connector**: For exporting to Google BigQuery
- **S3/GCS Connector**: For data lake integration
- **Webhook Service**: For real-time event notifications
- **BI Tool Connectors**: For Looker, Metabase, etc.

### 5.2 Import Connectors

- **Historical Data Importer**: For backfilling from existing systems
- **Server-side API Client**: For server-to-server event submission
- **Batch Import Tool**: For CSV/JSON data imports
