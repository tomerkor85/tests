const { ClickHouse } = require('clickhouse');
const { v4: uuidv4 } = require('uuid');

// ClickHouse configuration
const clickhouseConfig = {
  url: process.env.CLICKHOUSE_URL || 'http://localhost',
  port: process.env.CLICKHOUSE_PORT || 8123,
  debug: false,
  basicAuth: {
    username: process.env.CLICKHOUSE_USER || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
  },
  isUseGzip: true,
  format: 'json',
  raw: false,
  config: {
    session_timeout: 60,
    output_format_json_quote_64bit_integers: 0,
    enable_http_compression: 1,
    database: process.env.CLICKHOUSE_DB || 'radixinsight',
  },
};

// Create ClickHouse client
const clickhouse = new ClickHouse(clickhouseConfig);

// ClickHouse initialization function
async function initializeClickhouse() {
  try {
    console.log('Checking ClickHouse database...');
    
    // Check if database exists
    const dbExists = await clickhouse.query(`
      SELECT name 
      FROM system.databases 
      WHERE name = '${clickhouseConfig.config.database}'
    `).toPromise();
    
    if (dbExists.length === 0) {
      console.log('Creating ClickHouse database...');
      await clickhouse.query(`
        CREATE DATABASE IF NOT EXISTS ${clickhouseConfig.config.database}
      `).toPromise();
    }
    
    // Check if events table exists
    const tableExists = await clickhouse.query(`
      SELECT name 
      FROM system.tables 
      WHERE database = '${clickhouseConfig.config.database}' AND name = 'events'
    `).toPromise();
    
    if (tableExists.length === 0) {
      console.log('ClickHouse tables not found. Creating schema...');
      
      // Read schema SQL file
      const fs = require('fs');
      const path = require('path');
      const schemaPath = path.join(__dirname, '../database/clickhouse_schema.sql');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      
      // Split SQL by semicolons and execute each statement
      const statements = schemaSql.split(';').filter(stmt => stmt.trim().length > 0);
      
      for (const statement of statements) {
        await clickhouse.query(statement).toPromise();
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
      
      // Parse user agent for device info
      const deviceInfo = parseUserAgent(userAgent);
      
      // Prepare event data
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
        country: null, // Will be enriched by IP lookup service
        city: null, // Will be enriched by IP lookup service
        properties: JSON.stringify(properties || {}),
        referrer: referrer,
        referrer_domain: referrerDomain,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
        utm_term: utmTerm,
        utm_content: utmContent,
        date: timestamp.toISOString().split('T')[0],
      };
      
      // Insert event into ClickHouse
      await clickhouse.insert('events', [eventData]).toPromise();
      
      return { success: true, eventId: eventData.event_id };
    } catch (err) {
      console.error('Error tracking event:', err);
      throw err;
    }
  },
  
  // Track batch of events
  async trackEvents(events) {
    try {
      if (!Array.isArray(events) || events.length === 0) {
        throw new Error('Events must be a non-empty array');
      }
      
      // Prepare batch of events
      const eventBatch = events.map(event => {
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
        
        // Parse user agent for device info
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
          country: null, // Will be enriched by IP lookup service
          city: null, // Will be enriched by IP lookup service
          properties: JSON.stringify(properties || {}),
          referrer: referrer,
          referrer_domain: referrerDomain,
          utm_source: utmSource,
          utm_medium: utmMedium,
          utm_campaign: utmCampaign,
          utm_term: utmTerm,
          utm_content: utmContent,
          date: timestamp.toISOString().split('T')[0],
        };
      });
      
      // Insert events into ClickHouse
      await clickhouse.insert('events', eventBatch).toPromise();
      
      return { 
        success: true, 
        count: eventBatch.length,
        eventIds: eventBatch.map(e => e.event_id)
      };
    } catch (err) {
      console.error('Error tracking events batch:', err);
      throw err;
    }
  }
};

// Analytics query functions
const analyticsQueries = {
  // Get event count by type
  async getEventCountByType(projectId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          event_type,
          count() as count
        FROM events
        WHERE project_id = '${projectId}'
          AND date >= '${startDate}'
          AND date <= '${endDate}'
        GROUP BY event_type
        ORDER BY count DESC
      `;
      
      const result = await clickhouse.query(query).toPromise();
      
      return result;
    } catch (err) {
      console.error('Error querying event count by type:', err);
      throw err;
    }
  },
  
  // Get event count by day
  async getEventCountByDay(projectId, startDate, endDate, eventType = null) {
    try {
      let query = `
        SELECT 
          date,
          count() as count
        FROM events
        WHERE project_id = '${projectId}'
          AND date >= '${startDate}'
          AND date <= '${endDate}'
      `;
      
      if (eventType) {
        query += ` AND event_type = '${eventType}'`;
      }
      
      query += `
        GROUP BY date
        ORDER BY date
      `;
      
      const result = await clickhouse.query(query).toPromise();
      
      return result;
    } catch (err) {
      console.error('Error querying event count by day:', err);
      throw err;
    }
  },
  
  // Get unique users by day
  async getUniqueUsersByDay(projectId, startDate, endDate) {
    try {
      const query = `
        SELECT 
          date,
          uniqExact(user_id) as unique_users
        FROM events
        WHERE project_id = '${projectId}'
          AND date >= '${startDate}'
          AND date <= '${endDate}'
        GROUP BY date
        ORDER BY date
      `;
      
      const result = await clickhouse.query(query).toPromise();
      
      return result;
    } catch (err) {
      console.error('Error querying unique users by day:', err);
      throw err;
    }
  },
  
  // Get funnel conversion
  async getFunnelConversion(projectId, steps, startDate, endDate) {
    try {
      if (!Array.isArray(steps) || steps.length < 2) {
        throw new Error('Steps must be an array with at least 2 elements');
      }
      
      // Build funnel query
      let query = `
        SELECT
          step_1.user_id,
      `;
      
      // Add step flags
      for (let i = 2; i <= steps.length; i++) {
        query += `
          step_${i}.user_id IS NOT NULL as reached_step_${i},
        `;
      }
      
      // Add step timestamps
      for (let i = 1; i <= steps.length; i++) {
        query += `
          step_${i}.min_timestamp as step_${i}_timestamp${i < steps.length ? ',' : ''}
        `;
      }
      
      // First step
      query += `
        FROM (
          SELECT
            user_id,
            min(timestamp) as min_timestamp
          FROM events
          WHERE project_id = '${projectId}'
            AND date >= '${startDate}'
            AND date <= '${endDate}'
            AND event_type = '${steps[0].eventType}'
      `;
      
      // Add first step conditions
      if (steps[0].conditions) {
        for (const [key, value] of Object.entries(steps[0].conditions)) {
          query += ` AND JSONExtractString(properties, '${key}') = '${value}'`;
        }
      }
      
      query += `
          GROUP BY user_id
        ) as step_1
      `;
      
      // Add subsequent steps
      for (let i = 2; i <= steps.length; i++) {
        query += `
        LEFT JOIN (
          SELECT
            user_id,
            min(timestamp) as min_timestamp
          FROM events
          WHERE project_id = '${projectId}'
            AND date >= '${startDate}'
            AND date <= '${endDate}'
            AND event_type = '${steps[i-1].eventType}'
        `;
        
        // Add step conditions
        if (steps[i-1].conditions) {
          for (const [key, value] of Object.entries(steps[i-1].conditions)) {
            query += ` AND JSONExtractString(properties, '${key}') = '${value}'`;
          }
        }
        
        query += `
          GROUP BY user_id
        ) as step_${i} ON step_1.user_id = step_${i}.user_id AND step_${i}.min_timestamp > step_${i-1}.min_timestamp
        `;
      }
      
      // Execute query
      const userPaths = await clickhouse.query(query).toPromise();
      
      // Calculate conversion rates
      const totalUsers = userPaths.length;
      const stepCounts = [totalUsers];
      
      for (let i = 2; i <= steps.length; i++) {
        const reachedStep = userPaths.filter(path => path[`reached_step_${i}`] === 1).length;
        stepCounts.push(reachedStep);
      }
      
      // Calculate conversion rates
      const conversionRates = [];
      for (let i = 1; i < stepCounts.length; i++) {
        const rate = stepCounts[i] / stepCounts[i-1];
        conversionRates.push({
          step: i,
          from_step: i,
          to_step: i + 1,
          conversion_rate: rate,
          from_count: stepCounts[i-1],
          to_count: stepCounts[i]
        });
      }
      
      // Calculate overall conversion
      const overallRate = stepCounts[stepCounts.length - 1] / stepCounts[0];
      
      return {
        steps: steps.map((step, index) => ({
          step: index + 1,
          event_type: step.eventType,
          count: stepCounts[index],
          drop_off: index > 0 ? stepCounts[index-1] - stepCounts[index] : 0,
          drop_off_rate: index > 0 ? 1 - (stepCounts[index] / stepCounts[index-1]) : 0
        })),
        conversion_rates: conversionRates,
        overall_conversion: overallRate,
        total_users: totalUsers
      };
    } catch (err) {
      console.error('Error querying funnel conversion:', err);
      throw err;
    }
  },
  
  // Get retention cohorts
  async getRetentionCohorts(projectId, startDate, endDate, interval = 'day') {
    try {
      // Validate interval
      const validIntervals = ['day', 'week', 'month'];
      if (!validIntervals.includes(interval)) {
        throw new Error(`Invalid interval: ${interval}. Must be one of: ${validIntervals.join(', ')}`);
      }
      
      // Define date functions based on interval
      let dateFunction, intervalName;
      if (interval === 'day') {
        dateFunction = 'toDate';
        intervalName = 'Day';
      } else if (interval === 'week') {
        dateFunction = 'toMonday';
        intervalName = 'Week';
      } else if (interval === 'month') {
        dateFunction = 'toStartOfMonth';
        intervalName = 'Month';
      }
      
      // Build retention query
      const query = `
        WITH
          -- First-time users by cohort
          first_seen AS (
            SELECT
              user_id,
              min(${dateFunction}(timestamp)) as cohort_date
            FROM events
            WHERE project_id = '${projectId}'
              AND date >= '${startDate}'
              AND date <= '${endDate}'
            GROUP BY user_id
          ),
          
          -- All user activity
          activity AS (
            SELECT
              user_id,
              ${dateFunction}(timestamp) as activity_date
            FROM events
            WHERE project_id = '${projectId}'
              AND date >= '${startDate}'
              AND date <= '${endDate}'
            GROUP BY user_id, activity_date
          ),
          
          -- Join first_seen with activity
          cohort_activity AS (
            SELECT
              fs.cohort_date,
              a.activity_date,
              dateDiff('${interval}', fs.cohort_date, a.activity_date) as period
            FROM first_seen fs
            JOIN activity a ON fs.user_id = a.user_id
          ),
          
          -- Count users by cohort and period
          cohort_size AS (
            SELECT
              cohort_date,
              count(DISTINCT user_id) as users
            FROM first_seen
            GROUP BY cohort_date
          )
          
        -- Calculate retention for each cohort and period
        SELECT
          ca.cohort_date,
          ca.period,
          count(DISTINCT ca.user_id) as users,
          cs.users as cohort_size,
          round(count(DISTINCT ca.user_id) / cs.users * 100, 2) as retention_rate
        FROM cohort_activity ca
        JOIN cohort_size cs ON ca.cohort_date = cs.cohort_date
        WHERE ca.period <= 8 -- Limit to 8 periods
        GROUP BY ca.cohort_date, ca.period, cs.users
        ORDER BY ca.cohort_date, ca.period
      `;
      
      const result = await clickhouse.query(query).toPromise();
      
      // Transform result into cohort format
      const cohorts = {};
      const periods = new Set();
      
      result.forEach(row => {
        const cohortDate = row.cohort_date;
        const period = row.period;
        
        periods.add(period);
        
        if (!cohorts[cohortDate]) {
          cohorts[cohortDate] = {
            cohort_date: cohortDate,
            cohort_size: row.cohort_size,
            retention: {}
          };
        }
        
        cohorts[cohortDate].retention[period] = {
          users: row.users,
          rate: row.retention_rate
        };
      });
      
      // Convert to array and ensure all periods exist
      const sortedPeriods = Array.from(periods).sort((a, b) => a - b);
      const cohortsArray = Object.values(cohorts).map(cohort => {
        sortedPeriods.forEach(period => {
          if (!cohort.retention[period]) {
            cohort.retention[period] = { users: 0, rate: 0 };
          }
        });
        return cohort;
      });
      
      return {
        interval: intervalName,
        periods: sortedPeriods,
        cohorts: cohortsArray
      };
    } catch (err) {
      console.error('Error querying retention cohorts:', err);
      throw err;
    }
  },
  
  // Get recent events
  async getRecentEvents(projectId, limit = 100, offset = 0, filters = {}) {
    try {
      let query = `
        SELECT
          event_id,
          event_type,
          event_name,
          timestamp,
          user_id,
          session_id,
          properties
        FROM events
        WHERE project_id = '${projectId}'
      `;
      
      // Add filters
      if (filters.eventType) {
        query += ` AND event_type = '${filters.eventType}'`;
      }
      
      if (filters.userId) {
        query += ` AND user_id = '${filters.userId}'`;
      }
      
      if (filters.sessionId) {
        query += ` AND session_id = '${filters.sessionId}'`;
      }
      
      if (filters.startDate) {
        query += ` AND date >= '${filters.startDate}'`;
      }
      
      if (filters.endDate) {
        query += ` AND date <= '${filters.endDate}'`;
      }
      
      // Add sorting, limit and offset
      query += `
        ORDER BY timestamp DESC
        LIMIT ${limit}
        OFFSET ${offset}
      `;
      
      const result = await clickhouse.query(query).toPromise();
      
      // Parse properties JSON
      return result.map(event => ({
        ...event,
        properties: JSON.parse(event.properties)
      }));
    } catch (err) {
      console.error('Error querying recent events:', err);
      throw err;
    }
  }
};

// Helper function to parse user agent
function parseUserAgent(userAgent) {
  if (!userAgent) {
    return {
      deviceType: 'unknown',
      os: 'unknown',
      browser: 'unknown'
    };
  }
  
  // Simple parsing logic - in production, use a proper user-agent parsing library
  const deviceType = userAgent.includes('Mobile') || userAgent.includes('Android') ? 'mobile' :
                    userAgent.includes('Tablet') ? 'tablet' : 'desktop';
  
  let os = 'unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac OS')) os = 'MacOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
  
  let browser = 'unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) browser = 'Internet Explorer';
  
  return { deviceType, os, browser };
}

// Export ClickHouse functions
module.exports = {
  clickhouse,
  initializeClickhouse,
  eventTracking,
  analyticsQueries
};
