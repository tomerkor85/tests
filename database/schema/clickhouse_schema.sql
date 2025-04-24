-- ClickHouse Database Schema for RadixInsight Analytics Platform

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS radixinsight;

-- Use the database
USE radixinsight;

-- Events Table - Main table for storing all analytics events
CREATE TABLE IF NOT EXISTS events (
    -- Event identifiers
    event_id UUID,
    event_type String,
    event_name String,
    
    -- Time dimensions
    timestamp DateTime64(3),
    received_at DateTime64(3),
    
    -- Project and user identifiers
    project_id UUID,
    user_id String,
    session_id String,
    
    -- Device and location information
    ip_address String,
    user_agent String,
    device_type String,
    os String,
    browser String,
    country String,
    city String,
    
    -- Event properties (stored as JSON)
    properties String, -- JSON formatted string
    
    -- Referrer information
    referrer String,
    referrer_domain String,
    utm_source String,
    utm_medium String,
    utm_campaign String,
    utm_term String,
    utm_content String,
    
    -- For partitioning and performance
    date Date DEFAULT toDate(timestamp),
    
    -- Primary key
    PRIMARY KEY (project_id, date, event_type, event_id)
)
ENGINE = MergeTree()
PARTITION BY (project_id, toYYYYMM(date))
ORDER BY (project_id, date, event_type, event_id)
SETTINGS index_granularity = 8192;

-- User Sessions Table - For session analytics
CREATE TABLE IF NOT EXISTS user_sessions (
    -- Session identifiers
    session_id String,
    
    -- User and project identifiers
    user_id String,
    project_id UUID,
    
    -- Session timing
    started_at DateTime64(3),
    ended_at DateTime64(3),
    duration_seconds Float64,
    
    -- Session properties
    is_first_session Boolean,
    events_count UInt32,
    pages_count UInt32,
    
    -- Device and location information
    ip_address String,
    user_agent String,
    device_type String,
    os String,
    browser String,
    country String,
    city String,
    
    -- Referrer information
    entry_referrer String,
    entry_referrer_domain String,
    utm_source String,
    utm_medium String,
    utm_campaign String,
    
    -- For partitioning and performance
    date Date DEFAULT toDate(started_at),
    
    -- Primary key
    PRIMARY KEY (project_id, date, session_id)
)
ENGINE = MergeTree()
PARTITION BY (project_id, toYYYYMM(date))
ORDER BY (project_id, date, session_id)
SETTINGS index_granularity = 8192;

-- User Profiles Table - For user analytics
CREATE TABLE IF NOT EXISTS user_profiles (
    -- User identifiers
    user_id String,
    project_id UUID,
    
    -- User properties
    first_seen_at DateTime64(3),
    last_seen_at DateTime64(3),
    sessions_count UInt32,
    events_count UInt32,
    
    -- User attributes (stored as JSON)
    attributes String, -- JSON formatted string
    
    -- Computed metrics
    lifetime_value Float64,
    average_session_duration Float64,
    
    -- For partitioning and performance
    date Date DEFAULT toDate(first_seen_at),
    
    -- Primary key
    PRIMARY KEY (project_id, user_id)
)
ENGINE = MergeTree()
PARTITION BY project_id
ORDER BY (project_id, user_id)
SETTINGS index_granularity = 8192;

-- Funnel Steps Table - For funnel analysis
CREATE TABLE IF NOT EXISTS funnel_steps (
    -- Funnel identifiers
    funnel_id UUID,
    project_id UUID,
    
    -- Step information
    step_number UInt8,
    step_name String,
    event_type String,
    event_filter String, -- JSON formatted filter conditions
    
    -- Primary key
    PRIMARY KEY (project_id, funnel_id, step_number)
)
ENGINE = MergeTree()
ORDER BY (project_id, funnel_id, step_number)
SETTINGS index_granularity = 8192;

-- Funnel Events Table - For tracking users through funnels
CREATE TABLE IF NOT EXISTS funnel_events (
    -- Funnel identifiers
    funnel_id UUID,
    project_id UUID,
    
    -- User and event information
    user_id String,
    step_number UInt8,
    event_id UUID,
    timestamp DateTime64(3),
    
    -- For partitioning and performance
    date Date DEFAULT toDate(timestamp),
    
    -- Primary key
    PRIMARY KEY (project_id, funnel_id, date, user_id, step_number)
)
ENGINE = MergeTree()
PARTITION BY (project_id, toYYYYMM(date))
ORDER BY (project_id, funnel_id, date, user_id, step_number)
SETTINGS index_granularity = 8192;

-- Retention Cohorts Table - For retention analysis
CREATE TABLE IF NOT EXISTS retention_cohorts (
    -- Cohort identifiers
    cohort_date Date,
    project_id UUID,
    
    -- Cohort metrics
    users_count UInt32,
    
    -- Retention periods (days)
    day_1_count UInt32,
    day_7_count UInt32,
    day_14_count UInt32,
    day_30_count UInt32,
    day_60_count UInt32,
    day_90_count UInt32,
    
    -- Primary key
    PRIMARY KEY (project_id, cohort_date)
)
ENGINE = MergeTree()
PARTITION BY project_id
ORDER BY (project_id, cohort_date)
SETTINGS index_granularity = 8192;

-- Aggregated Events Table - For pre-aggregated metrics
CREATE TABLE IF NOT EXISTS aggregated_events (
    -- Dimensions
    project_id UUID,
    event_type String,
    date Date,
    hour UInt8,
    
    -- Metrics
    events_count UInt32,
    users_count UInt32,
    
    -- Primary key
    PRIMARY KEY (project_id, date, event_type, hour)
)
ENGINE = SummingMergeTree(events_count, users_count)
PARTITION BY (project_id, toYYYYMM(date))
ORDER BY (project_id, date, event_type, hour)
SETTINGS index_granularity = 8192;

-- Create materialized view to populate aggregated_events
CREATE MATERIALIZED VIEW IF NOT EXISTS events_to_aggregated_events
TO aggregated_events
AS
SELECT
    project_id,
    event_type,
    toDate(timestamp) AS date,
    toHour(timestamp) AS hour,
    count() AS events_count,
    uniqExact(user_id) AS users_count
FROM events
GROUP BY project_id, event_type, date, hour;

-- Create materialized view to populate user_sessions from events
CREATE MATERIALIZED VIEW IF NOT EXISTS events_to_user_sessions
TO user_sessions
AS
SELECT
    session_id,
    user_id,
    project_id,
    min(timestamp) AS started_at,
    max(timestamp) AS ended_at,
    dateDiff('second', min(timestamp), max(timestamp)) AS duration_seconds,
    count() AS events_count,
    uniqExact(if(event_type = 'page_view', event_id, null)) AS pages_count,
    any(ip_address) AS ip_address,
    any(user_agent) AS user_agent,
    any(device_type) AS device_type,
    any(os) AS os,
    any(browser) AS browser,
    any(country) AS country,
    any(city) AS city,
    any(referrer) AS entry_referrer,
    any(referrer_domain) AS entry_referrer_domain,
    any(utm_source) AS utm_source,
    any(utm_medium) AS utm_medium,
    any(utm_campaign) AS utm_campaign,
    toDate(min(timestamp)) AS date,
    false AS is_first_session -- This will be updated by a separate process
FROM events
GROUP BY session_id, user_id, project_id;

-- Create materialized view to populate user_profiles from events
CREATE MATERIALIZED VIEW IF NOT EXISTS events_to_user_profiles
TO user_profiles
AS
SELECT
    user_id,
    project_id,
    min(timestamp) AS first_seen_at,
    max(timestamp) AS last_seen_at,
    uniqExact(session_id) AS sessions_count,
    count() AS events_count,
    '{}' AS attributes, -- This will be updated by a separate process
    0 AS lifetime_value, -- This will be updated by a separate process
    0 AS average_session_duration, -- This will be updated by a separate process
    toDate(min(timestamp)) AS date
FROM events
GROUP BY user_id, project_id;

-- Create sample data for testing
INSERT INTO events VALUES (
    generateUUIDv4(), -- event_id
    'page_view', -- event_type
    'Home Page View', -- event_name
    now(), -- timestamp
    now(), -- received_at
    generateUUIDv4(), -- project_id
    'user123', -- user_id
    'session456', -- session_id
    '192.168.1.1', -- ip_address
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36', -- user_agent
    'desktop', -- device_type
    'Windows', -- os
    'Chrome', -- browser
    'United States', -- country
    'New York', -- city
    '{"button_id": "signup", "page_path": "/home"}', -- properties
    'https://google.com', -- referrer
    'google.com', -- referrer_domain
    'google', -- utm_source
    'cpc', -- utm_medium
    'spring_sale', -- utm_campaign
    'analytics', -- utm_term
    'banner_1', -- utm_content
    today() -- date
);
