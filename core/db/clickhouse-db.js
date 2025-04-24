// ייבוא מודולים נדרשים
const { ClickHouse } = require('clickhouse');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ייבוא קובץ הקונפיגורציה המרכזי
const config = require('../../config');

// ClickHouse configuration loaded from config
const clickhouseConfig = {
  protocol: 'http:',
  host: config.clickhouse.url.replace('http://', '') || 'clickhouse',
  port: config.clickhouse.port || 8123,
  path: '/',

  debug: process.env.CLICKHOUSE_DEBUG === 'true',

  basicAuth: {
    username: config.clickhouse.user || 'default',
    password: config.clickhouse.password || '',
  },

  isUseGzip: process.env.CLICKHOUSE_USE_GZIP
    ? process.env.CLICKHOUSE_USE_GZIP === 'true'
    : true,

  format: 'json',
  raw: process.env.CLICKHOUSE_RAW === 'true',

  config: {
    database: config.clickhouse.database || 'radixinsight',
    session_timeout: parseInt(process.env.CLICKHOUSE_SESSION_TIMEOUT, 10) || 60,
    output_format_json_quote_64bit_integers: 0,
    enable_http_compression: 1,
  },
};

// Build URL if required by client
clickhouseConfig.url = `${clickhouseConfig.protocol}//${clickhouseConfig.host}${clickhouseConfig.path}`;

console.log('⛓️ ClickHouse config:', clickhouseConfig);

// Instantiate ClickHouse client
const clickhouse = new ClickHouse(clickhouseConfig);

// Initialize database and schema
async function initializeClickhouse() {
  try {
    console.log('Checking ClickHouse database...');
    const dbExists = await clickhouse.query(
      `SELECT name FROM system.databases WHERE name = '${clickhouseConfig.config.database}'`
    ).toPromise();

    if (!dbExists.length) {
      console.log('Creating ClickHouse database...');
      await clickhouse.query(
        `CREATE DATABASE IF NOT EXISTS ${clickhouseConfig.config.database}`
      ).toPromise();
    }

    const tableExists = await clickhouse.query(
      `SELECT name FROM system.tables WHERE database = '${clickhouseConfig.config.database}' AND name = 'events'`
    ).toPromise();

    if (!tableExists.length) {
      console.log('ClickHouse tables not found. Creating schema...');
      const schemaSql = fs.readFileSync(
        path.join(__dirname, '../../database/schema/clickhouse_schema.sql'),
        'utf8'
      );
      const statements = schemaSql.split(';').map(s => s.trim()).filter(s => s);
      for (const stmt of statements) {
        await clickhouse.query(stmt).toPromise();
      }
      console.log('ClickHouse schema created successfully.');
    } else {
      console.log('ClickHouse schema already exists.');
    }
  } catch (err) {
    console.error('Error initializing ClickHouse:', err);
    throw err;
  }
}

// Event tracking functions
const eventTracking = {
  // Track a single event
  async trackEvent(event) {
    try {
      const {
        projectId,
        userId,
        sessionId,
        eventType,
        eventName,
        properties,
        timestamp = new Date(),
        ip,
        userAgent,
        referrer,
        referrerDomain,
        utmSource,
        utmMedium,
        utmCampaign,
        utmTerm,
        utmContent,
      } = event;
      const deviceInfo = parseUserAgent(userAgent);
      const eventData = {
        event_id: uuidv4(),
        event_type: eventType,
        event_name: eventName,
        timestamp: timestamp.toISOString(),
        received_at: new Date().toISOString(),
        project_id: projectId,
        user_id: userId,
        session_id: sessionId,
        ip_address: ip,
        user_agent: userAgent,
        device_type: deviceInfo.deviceType,
        os: deviceInfo.os,
        browser: deviceInfo.browser,
        country: null,
        city: null,
        properties: JSON.stringify(properties || {}),
        referrer,
        referrer_domain: referrerDomain,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_term: utmTerm,
        utm_content: utmContent,
        date: timestamp.toISOString().split('T')[0],
      };
      await clickhouse.insert('events', [eventData]).toPromise();
      return { success: true, eventId: eventData.event_id };
    } catch (err) {
      console.error('Error tracking event:', err);
      throw err;
    }
  },

  // Track a batch of events
  async trackEvents(events) {
    try {
      if (!Array.isArray(events) || events.length === 0) {
        throw new Error('Events must be a non-empty array');
      }
      const batch = events.map(ev => {
        const {
          projectId,
          userId,
          sessionId,
          eventType,
          eventName,
          properties,
          timestamp = new Date(),
          ip,
          userAgent,
          referrer,
          referrerDomain,
          utmSource,
          utmMedium,
          utmCampaign,
          utmTerm,
          utmContent,
        } = ev;
        const deviceInfo = parseUserAgent(userAgent);
        return {
          event_id: uuidv4(),
          event_type: eventType,
          event_name: eventName,
          timestamp: timestamp.toISOString(),
          received_at: new Date().toISOString(),
          project_id: projectId,
          user_id: userId,
          session_id: sessionId,
          ip_address: ip,
          user_agent: userAgent,
          device_type: deviceInfo.deviceType,
          os: deviceInfo.os,
          browser: deviceInfo.browser,
          country: null,
          city: null,
          properties: JSON.stringify(properties || {}),
          referrer,
          referrer_domain: referrerDomain,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_term: utmTerm,
          utm_content: utmContent,
          date: timestamp.toISOString().split('T')[0],
        };
      });
      await clickhouse.insert('events', batch).toPromise();
      return { success: true, count: batch.length, eventIds: batch.map(e => e.event_id) };
    } catch (err) {
      console.error('Error tracking events batch:', err);
      throw err;
    }
  }
};

// Analytics query functions
const analyticsQueries = {
  async getEventCountByType(projectId, startDate, endDate) {
    try {
      const query = `SELECT event_type, count() as count FROM events WHERE project_id='${projectId}' AND date>='${startDate}' AND date<='${endDate}' GROUP BY event_type ORDER BY count DESC`;
      return await clickhouse.query(query).toPromise();
    } catch (err) {
      console.error('Error querying event count by type:', err);
      throw err;
    }
  },

  async getEventCountByDay(projectId, startDate, endDate, eventType = null) {
    try {
      let query = `SELECT date, count() as count FROM events WHERE project_id='${projectId}' AND date>='${startDate}' AND date<='${endDate}'`;
      if (eventType) query += ` AND event_type='${eventType}'`;
      query += ` GROUP BY date ORDER BY date`;
      return await clickhouse.query(query).toPromise();
    } catch (err) {
      console.error('Error querying event count by day:', err);
      throw err;
    }
  },

  async getUniqueUsersByDay(projectId, startDate, endDate) {
    try {
      const query = `SELECT date, uniqExact(user_id) as unique_users FROM events WHERE project_id='${projectId}' AND date>='${startDate}' AND date<='${endDate}' GROUP BY date ORDER BY date`;
      return await clickhouse.query(query).toPromise();
    } catch (err) {
      console.error('Error querying unique users by day:', err);
      throw err;
    }
  },

  async getFunnelConversion(projectId, steps, startDate, endDate) {
    try {
      if (!Array.isArray(steps) || steps.length < 2) throw new Error('Steps must have at least 2 elements');
      let query = `SELECT step_1.user_id`;
      for (let i = 2; i <= steps.length; i++) query += `, step_${i}.user_id IS NOT NULL as reached_step_${i}`;
      for (let i = 1; i <= steps.length; i++) query += `, step_${i}.min_timestamp as step_${i}_timestamp`;
      query += ` FROM (SELECT user_id, min(timestamp) as min_timestamp FROM events WHERE project_id='${projectId}' AND date>='${startDate}' AND date<='${endDate}' AND event_type='${steps[0].eventType}' GROUP BY user_id) as step_1`;
      for (let i = 2; i <= steps.length; i++) {
        query += ` LEFT JOIN (SELECT user_id, min(timestamp) as min_timestamp FROM events WHERE project_id='${projectId}' AND date>='${startDate}' AND date<='${endDate}' AND event_type='${steps[i-1].eventType}' GROUP BY user_id) as step_${i}`;
        query += ` ON step_1.user_id=step_${i}.user_id AND step_${i}.min_timestamp>step_${i-1}.min_timestamp`;
      }
      const paths = await clickhouse.query(query).toPromise();
      const total = paths.length;
      const counts = [total];
      for (let i = 2; i <= steps.length; i++) counts.push(paths.filter(p => p[`reached_step_${i}`] === 1).length);
      const conversion = counts.map((c, idx) => ({ step: idx+1, count: c, rate: idx>0?c/counts[idx-1]:1 }));
      return { totalUsers: total, conversionSteps: conversion };
    } catch (err) {
      console.error('Error querying funnel conversion:', err);
      throw err;
    }
  },

  async getRetentionCohorts(projectId, startDate, endDate, interval='day') {
    try {
      const valid=['day','week','month']; if(!valid.includes(interval)) throw new Error(`Invalid interval ${interval}`);
      const df = interval==='day'?'toDate':interval==='week'?'toMonday':'toStartOfMonth';
      const query = `WITH first_seen AS (SELECT user_id, min(${df}(timestamp)) as cohort FROM events WHERE project_id='${projectId}' AND date>='${startDate}' AND date<='${endDate}' GROUP BY user_id), activity AS (SELECT user_id, ${df}(timestamp) as activity FROM events WHERE project_id='${projectId}' AND date>='${startDate}' AND date<='${endDate}' GROUP BY user_id,activity), cohort_activity AS (SELECT fs.cohort, ca.activity, dateDiff('${interval}',fs.cohort,ca.activity) as period FROM first_seen fs JOIN activity ca ON fs.user_id=ca.user_id), cohort_size AS (SELECT cohort, count(DISTINCT user_id) as size FROM first_seen GROUP BY cohort) SELECT ca.cohort,ca.period,count(DISTINCT ca.user_id) as users,cs.size as cohort_size,round(count(DISTINCT ca.user_id)/cs.size*100,2) as rate FROM cohort_activity ca JOIN cohort_size cs ON ca.cohort=cs.cohort WHERE ca.period<=8 GROUP BY ca.cohort,ca.period,cs.size ORDER BY ca.cohort,ca.period`;
      return await clickhouse.query(query).toPromise();
    } catch(err) { console.error('Error querying retention cohorts:',err); throw err; }
  },

  async getRecentEvents(projectId, limit=100, offset=0, filters={}) {
    try {
      let query = `SELECT event_id,event_type,event_name,timestamp,user_id,session_id,properties FROM events WHERE project_id='${projectId}'`;
      if(filters.eventType) query+=` AND event_type='${filters.eventType}'`;
      if(filters.userId)    query+=` AND user_id='${filters.userId}'`;
      if(filters.sessionId) query+=` AND session_id='${filters.sessionId}'`;
      if(filters.startDate) query+=` AND date>='${filters.startDate}'`;
      if(filters.endDate)   query+=` AND date<='${filters.endDate}'`;
      query+=` ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
      const res = await clickhouse.query(query).toPromise();
      return res.map(ev=>({...ev,properties:JSON.parse(ev.properties)}));
    } catch(err) { console.error('Error querying recent events:',err); throw err; }
  }
};

// User-agent parser function
function parseUserAgent(ua) { 
  if (!ua) return { deviceType: 'unknown', os: 'unknown', browser: 'unknown' }; 
  const deviceType = /Mobile|Android/.test(ua)?'mobile':/Tablet/.test(ua)?'tablet':'desktop'; 
  let os='unknown'; 
  if(ua.includes('Windows'))os='Windows';
  else if(ua.includes('Mac OS'))os='MacOS';
  else if(ua.includes('Linux'))os='Linux';
  else if(ua.includes('Android'))os='Android';
  else if(/iOS|iPhone|iPad/.test(ua))os='iOS'; 
  
  let browser='unknown'; 
  if(/Chrome/.test(ua))browser='Chrome';
  else if(/Firefox/.test(ua))browser='Firefox';
  else if(/Safari/.test(ua))browser='Safari';
  else if(/Edge/.test(ua))browser='Edge';
  else if(/MSIE|Trident/.test(ua))browser='Internet Explorer'; 
  
  return { deviceType, os, browser }; 
}

module.exports = { clickhouse, initializeClickhouse, eventTracking, analyticsQueries };
