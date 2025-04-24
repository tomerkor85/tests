/**
 * Anomaly Detection Module
 * 
 * This module provides anomaly detection functionality for the RadixInsight platform.
 * It identifies unusual patterns in metrics and user behavior.
 */

const { DatabaseFactory } = require('../../database/abstraction');

class AnomalyDetection {
  /**
   * Create a new AnomalyDetection instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      dbType: options.dbType || 'clickhouse',
      dbConfig: options.dbConfig || {},
      anomaliesTable: options.anomaliesTable || 'anomalies',
      metricsTable: options.metricsTable || 'metrics',
      alertsTable: options.alertsTable || 'anomaly_alerts',
      sensitivityLevel: options.sensitivityLevel || 'medium', // 'low', 'medium', 'high'
      detectionMethods: options.detectionMethods || ['zscore', 'iqr', 'moving_average'],
      minDataPoints: options.minDataPoints || 30,
      ...options
    };
    
    this.db = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the anomaly detection module
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;
    
    // Create database connection
    this.db = DatabaseFactory.createDatabase(this.options.dbType, this.options.dbConfig);
    await this.db.initialize();
    
    // Ensure tables exist
    await this._ensureTablesExist();
    
    this.initialized = true;
  }
  
  /**
   * Ensure required tables exist
   * @private
   * @returns {Promise<void>}
   */
  async _ensureTablesExist() {
    // Implementation depends on database type
    if (this.options.dbType === 'clickhouse') {
      await this._ensureClickHouseTables();
    } else if (this.options.dbType === 'postgresql') {
      await this._ensurePostgreSQLTables();
    } else if (this.options.dbType === 'mongodb') {
      // MongoDB creates collections automatically
    } else {
      throw new Error(`Unsupported database type: ${this.options.dbType}`);
    }
  }
  
  /**
   * Ensure ClickHouse tables exist
   * @private
   * @returns {Promise<void>}
   */
  async _ensureClickHouseTables() {
    // Create anomalies table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.anomaliesTable} (
        anomaly_id String,
        metric_name String,
        timestamp DateTime,
        value Float64,
        expected_value Float64,
        deviation Float64,
        score Float64,
        detection_method String,
        severity String,
        status String,
        date Date DEFAULT toDate(timestamp)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, anomaly_id)
    `);
    
    // Create metrics table if it doesn't exist
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.metricsTable} (
        metric_name String,
        timestamp DateTime,
        value Float64,
        dimensions String,
        date Date DEFAULT toDate(timestamp)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, metric_name, timestamp)
    `);
    
    // Create alerts table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.alertsTable} (
        alert_id String,
        anomaly_id String,
        timestamp DateTime,
        message String,
        details String,
        notification_sent UInt8,
        date Date DEFAULT toDate(timestamp)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, alert_id)
    `);
  }
  
  /**
   * Ensure PostgreSQL tables exist
   * @private
   * @returns {Promise<void>}
   */
  async _ensurePostgreSQLTables() {
    // Create anomalies table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.anomaliesTable} (
        anomaly_id VARCHAR(36) PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        value FLOAT NOT NULL,
        expected_value FLOAT,
        deviation FLOAT,
        score FLOAT,
        detection_method VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create metrics table if it doesn't exist
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.metricsTable} (
        id SERIAL PRIMARY KEY,
        metric_name VARCHAR(100) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        value FLOAT NOT NULL,
        dimensions JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create alerts table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.alertsTable} (
        alert_id VARCHAR(36) PRIMARY KEY,
        anomaly_id VARCHAR(36) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        message TEXT NOT NULL,
        details JSONB,
        notification_sent BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (anomaly_id) REFERENCES ${this.options.anomaliesTable}(anomaly_id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.anomaliesTable}_metric_name
      ON ${this.options.anomaliesTable} (metric_name)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.anomaliesTable}_timestamp
      ON ${this.options.anomaliesTable} (timestamp)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.metricsTable}_metric_name
      ON ${this.options.metricsTable} (metric_name)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.metricsTable}_timestamp
      ON ${this.options.metricsTable} (timestamp)
    `);
  }
  
  /**
   * Track a metric value
   * @param {Object} data - Metric data
   * @returns {Promise<Object>} - Tracking result
   */
  async trackMetric(data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      name,
      value,
      timestamp = new Date(),
      dimensions = {}
    } = data;
    
    // Validate required fields
    if (!name || value === undefined) {
      throw new Error('Metric name and value are required');
    }
    
    // Create metric record
    const metricData = {
      metric_name: name,
      timestamp,
      value,
      dimensions: JSON.stringify(dimensions)
    };
    
    // Insert metric record
    await this.db.insert(this.options.metricsTable, metricData);
    
    // Detect anomalies
    const anomaly = await this._detectAnomaly(name, value, timestamp, dimensions);
    
    return {
      name,
      value,
      timestamp,
      dimensions,
      anomaly
    };
  }
  
  /**
   * Detect anomalies for a metric
   * @param {string} metricName - Metric name
   * @param {number} value - Current value
   * @param {Date} timestamp - Timestamp
   * @param {Object} dimensions - Metric dimensions
   * @returns {Promise<Object|null>} - Detected anomaly or null
   * @private
   */
  async _detectAnomaly(metricName, value, timestamp, dimensions) {
    // Get historical data for the metric
    let historicalData;
    if (this.options.dbType === 'mongodb') {
      historicalData = await this.db.find(
        this.options.metricsTable,
        { metric_name: metricName },
        { 
          sort: { timestamp: -1 },
          limit: 1000 // Get last 1000 data points
        }
      );
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.metricsTable}
        WHERE metric_name = $1
        ORDER BY timestamp DESC
        LIMIT 1000
      `, [metricName]);
      
      historicalData = result.rows || [];
    }
    
    // Check if we have enough data points
    if (historicalData.length < this.options.minDataPoints) {
      return null; // Not enough data for anomaly detection
    }
    
    // Sort data by timestamp (oldest first)
    historicalData.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    // Extract values
    const values = historicalData.map(item => item.value);
    
    // Apply detection methods
    let anomaly = null;
    
    for (const method of this.options.detectionMethods) {
      let isAnomaly = false;
      let expectedValue = 0;
      let deviation = 0;
      let score = 0;
      
      if (method === 'zscore') {
        const result = this._detectWithZScore(values, value);
        isAnomaly = result.isAnomaly;
        expectedValue = result.expectedValue;
        deviation = result.deviation;
        score = result.score;
      } else if (method === 'iqr') {
        const result = this._detectWithIQR(values, value);
        isAnomaly = result.isAnomaly;
        expectedValue = result.expectedValue;
        deviation = result.deviation;
        score = result.score;
      } else if (method === 'moving_average') {
        const result = this._detectWithMovingAverage(values, value);
        isAnomaly = result.isAnomaly;
        expectedValue = result.expectedValue;
        deviation = result.deviation;
        score = result.score;
      }
      
      if (isAnomaly) {
        // Determine severity
        let severity;
        if (score > 5) {
          severity = 'high';
        } else if (score > 3) {
          severity = 'medium';
        } else {
          severity = 'low';
        }
        
        // Check if severity meets the threshold
        if (
          (this.options.sensitivityLevel === 'low' && severity === 'high') ||
          (this.options.sensitivityLevel === 'medium' && (severity === 'high' || severity === 'medium')) ||
          (this.options.sensitivityLevel === 'high')
        ) {
          // Generate anomaly ID
          const anomalyId = this._generateId();
          
          // Create anomaly record
          const anomalyData = {
            anomaly_id: anomalyId,
            metric_name: metricName,
            timestamp,
            value,
            expected_value: expectedValue,
            deviation,
            score,
            detection_method: method,
            severity,
            status: 'active'
          };
          
          // Insert anomaly record
          await this.db.insert(this.options.anomaliesTable, anomalyData);
          
          // Create alert
          await this._createAlert(anomalyId, metricName, value, expectedValue, deviation, score, severity, dimensions);
          
          anomaly = {
            anomalyId,
            metricName,
            value,
            expectedValue,
            deviation,
            score,
            method,
            severity
          };
          
          break; // Stop after first detected anomaly
        }
      }
    }
    
    return anomaly;
  }
  
  /**
   * Detect anomalies using Z-Score method
   * @param {Array<number>} values - Historical values
   * @param {number} currentValue - Current value
   * @returns {Object} - Detection result
   * @private
   */
  _detectWithZScore(values, currentValue) {
    // Calculate mean
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    
    // Calculate standard deviation
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate Z-Score
    const zScore = stdDev === 0 ? 0 : Math.abs((currentValue - mean) / stdDev);
    
    // Determine if it's an anomaly
    const isAnomaly = zScore > 3; // Z-Score > 3 is considered an anomaly
    
    return {
      isAnomaly,
      expectedValue: mean,
      deviation: currentValue - mean,
      score: zScore
    };
  }
  
  /**
   * Detect anomalies using IQR method
   * @param {Array<number>} values - Historical values
   * @param {number} currentValue - Current value
   * @returns {Object} - Detection result
   * @private
   */
  _detectWithIQR(values, currentValue) {
    // Sort values
    const sortedValues = [...values].sort((a, b) => a - b);
    
    // Calculate quartiles
    const q1Index = Math.floor(sortedValues.length * 0.25);
    const q3Index = Math.floor(sortedValues.length * 0.75);
    const q1 = sortedValues[q1Index];
    const q3 = sortedValues[q3Index];
    
    // Calculate IQR
    const iqr = q3 - q1;
    
    // Calculate bounds
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    // Determine if it's an anomaly
    const isAnomaly = currentValue < lowerBound || currentValue > upperBound;
    
    // Calculate median
    const medianIndex = Math.floor(sortedValues.length / 2);
    const median = sortedValues.length % 2 === 0
      ? (sortedValues[medianIndex - 1] + sortedValues[medianIndex]) / 2
      : sortedValues[medianIndex];
    
    // Calculate score (how many IQRs away from the bounds)
    let score = 0;
    if (currentValue < lowerBound) {
      score = Math.abs((lowerBound - currentValue) / iqr);
    } else if (currentValue > upperBound) {
      score = Math.abs((currentValue - upperBound) / iqr);
    }
    
    return {
      isAnomaly,
      expectedValue: median,
      deviation: currentValue - median,
      score
    };
  }
  
  /**
   * Detect anomalies using Moving Average method
   * @param {Array<number>} values - Historical values
   * @param {number} currentValue - Current value
   * @returns {Object} - Detection result
   * @private
   */
  _detectWithMovingAverage(values, currentValue) {
    // Calculate moving average (last 10 points)
    const windowSize = Math.min(10, values.length);
    const recentValues = values.slice(-windowSize);
    const movingAvg = recentValues.reduce((sum, val) => sum + val, 0) / windowSize;
    
    // Calculate standard deviation of recent values
    const squaredDiffs = recentValues.map(val => Math.pow(val - movingAvg, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / windowSize;
    const stdDev = Math.sqrt(variance);
    
    // Calculate deviation
    const deviation = currentValue - movingAvg;
    
    // Calculate score (how many standard deviations away)
    const score = stdDev === 0 ? 0 : Math.abs(deviation / stdDev);
    
    // Determine if it's an anomaly
    const isAnomaly = score > 2.5; // More than 2.5 standard deviations is considered an anomaly
    
    return {
      isAnomaly,
      expectedValue: movingAvg,
      deviation,
      score
    };
  }
  
  /**
   * Create an alert for an anomaly
   * @param {string} anomalyId - Anomaly ID
   * @param {string} metricName - Metric name
   * @param {number} value - Current value
   * @param {number} expectedValue - Expected value
   * @param {number} deviation - Deviation
   * @param {number} score - Anomaly score
   * @param {string} severity - Anomaly severity
   * @param {Object} dimensions - Metric dimensions
   * @returns {Promise<Object>} - Created alert
   * @private
   */
  async _createAlert(anomalyId, metricName, value, expectedValue, deviation, score, severity, dimensions) {
    // Generate alert ID
    const alertId = this._generateId();
    
    // Create alert message
    const message = `Anomaly detected in metric "${metricName}": value ${value} is ${deviation > 0 ? 'above' : 'below'} expected value ${expectedValue.toFixed(2)} (${Math.abs(deviation).toFixed(2)} ${deviation > 0 ? 'higher' : 'lower'}, score: ${score.toFixed(2)})`;
    
    // Create alert record
    const alertData = {
      alert_id: alertId,
      anomaly_id: anomalyId,
      timestamp: new Date(),
      message,
      details: JSON.stringify({
        metricName,
        value,
        expectedValue,
        deviation,
        score,
        severity,
        dimensions
      }),
      notification_sent: 0
    };
    
    // Insert alert record
    await this.db.insert(this.options.alertsTable, alertData);
    
    return {
      alertId,
      anomalyId,
      message,
      severity,
      timestamp: alertData.timestamp
    };
  }
  
  /**
   * Get anomalies by metric name
   * @param {string} metricName - Metric name
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Anomalies
   */
  async getAnomaliesByMetric(metricName, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      startTime = null,
      endTime = null,
      severity = null,
      status = 'active',
      limit = 100,
      offset = 0
    } = options;
    
    // Build query
    let query = {};
    let params = [];
    let whereClause = 'WHERE metric_name = $1';
    params.push(metricName);
    
    if (startTime) {
      const startDate = new Date(startTime);
      if (this.options.dbType === 'mongodb') {
        query.timestamp = query.timestamp || {};
        query.timestamp.$gte = startDate;
      } else {
        whereClause += ' AND timestamp >= $' + (params.length + 1);
        params.push(startDate);
      }
    }
    
    if (endTime) {
      const endDate = new Date(endTime);
      if (this.options.dbType === 'mongodb') {
        query.timestamp = query.timestamp || {};
        query.timestamp.$lte = endDate;
      } else {
        whereClause += ' AND timestamp <= $' + (params.length + 1);
        params.push(endDate);
      }
    }
    
    if (severity) {
      if (this.options.dbType === 'mongodb') {
        query.severity = severity;
      } else {
        whereClause += ' AND severity = $' + (params.length + 1);
        params.push(severity);
      }
    }
    
    if (status) {
      if (this.options.dbType === 'mongodb') {
        query.status = status;
      } else {
        whereClause += ' AND status = $' + (params.length + 1);
        params.push(status);
      }
    }
    
    // Get anomalies
    let anomalies;
    if (this.options.dbType === 'mongodb') {
      query.metric_name = metricName;
      
      anomalies = await this.db.find(
        this.options.anomaliesTable,
        query,
        { 
          sort: { timestamp: -1 },
          skip: offset,
          limit: limit
        }
      );
    } else {
      const sql = `
        SELECT * FROM ${this.options.anomaliesTable}
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await this.db.query(sql, params);
      anomalies = result.rows || [];
    }
    
    return anomalies;
  }
  
  /**
   * Get all anomalies
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Anomalies
   */
  async getAnomalies(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      startTime = null,
      endTime = null,
      metricName = null,
      severity = null,
      status = 'active',
      limit = 100,
      offset = 0
    } = options;
    
    // Build query
    let query = {};
    let params = [];
    let whereClause = '';
    
    if (metricName) {
      if (this.options.dbType === 'mongodb') {
        query.metric_name = metricName;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'metric_name = $' + (params.length + 1);
        params.push(metricName);
      }
    }
    
    if (startTime) {
      const startDate = new Date(startTime);
      if (this.options.dbType === 'mongodb') {
        query.timestamp = query.timestamp || {};
        query.timestamp.$gte = startDate;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'timestamp >= $' + (params.length + 1);
        params.push(startDate);
      }
    }
    
    if (endTime) {
      const endDate = new Date(endTime);
      if (this.options.dbType === 'mongodb') {
        query.timestamp = query.timestamp || {};
        query.timestamp.$lte = endDate;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'timestamp <= $' + (params.length + 1);
        params.push(endDate);
      }
    }
    
    if (severity) {
      if (this.options.dbType === 'mongodb') {
        query.severity = severity;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'severity = $' + (params.length + 1);
        params.push(severity);
      }
    }
    
    if (status) {
      if (this.options.dbType === 'mongodb') {
        query.status = status;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'status = $' + (params.length + 1);
        params.push(status);
      }
    }
    
    // Get anomalies
    let anomalies;
    if (this.options.dbType === 'mongodb') {
      anomalies = await this.db.find(
        this.options.anomaliesTable,
        query,
        { 
          sort: { timestamp: -1 },
          skip: offset,
          limit: limit
        }
      );
    } else {
      const sql = `
        SELECT * FROM ${this.options.anomaliesTable}
        ${whereClause}
        ORDER BY timestamp DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await this.db.query(sql, params);
      anomalies = result.rows || [];
    }
    
    return anomalies;
  }
  
  /**
   * Get an anomaly by ID
   * @param {string} anomalyId - Anomaly ID
   * @returns {Promise<Object>} - Anomaly
   */
  async getAnomaly(anomalyId) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Get anomaly
    let anomaly;
    if (this.options.dbType === 'mongodb') {
      anomaly = await this.db.findOne(this.options.anomaliesTable, { anomaly_id: anomalyId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.anomaliesTable}
        WHERE anomaly_id = $1
      `, [anomalyId]);
      
      anomaly = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (!anomaly) {
      return null;
    }
    
    // Get alerts for this anomaly
    let alerts;
    if (this.options.dbType === 'mongodb') {
      alerts = await this.db.find(this.options.alertsTable, { anomaly_id: anomalyId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.alertsTable}
        WHERE anomaly_id = $1
        ORDER BY timestamp DESC
      `, [anomalyId]);
      
      alerts = result.rows || [];
    }
    
    // Parse alert details
    alerts = alerts.map(alert => ({
      ...alert,
      details: typeof alert.details === 'string' ? JSON.parse(alert.details) : alert.details
    }));
    
    anomaly.alerts = alerts;
    
    return anomaly;
  }
  
  /**
   * Update anomaly status
   * @param {string} anomalyId - Anomaly ID
   * @param {string} status - New status ('active', 'acknowledged', 'resolved')
   * @returns {Promise<Object>} - Updated anomaly
   */
  async updateAnomalyStatus(anomalyId, status) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Validate status
    if (!['active', 'acknowledged', 'resolved'].includes(status)) {
      throw new Error('Invalid status. Must be one of: active, acknowledged, resolved');
    }
    
    // Update anomaly
    if (this.options.dbType === 'mongodb') {
      await this.db.update(
        this.options.anomaliesTable,
        { anomaly_id: anomalyId },
        { status }
      );
    } else {
      await this.db.query(`
        UPDATE ${this.options.anomaliesTable}
        SET status = $1
        WHERE anomaly_id = $2
      `, [status, anomalyId]);
    }
    
    // Get updated anomaly
    return await this.getAnomaly(anomalyId);
  }
  
  /**
   * Generate a unique ID
   * @private
   * @returns {string} - Unique ID
   */
  _generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
  
  /**
   * Close the anomaly detection module
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
    
    this.initialized = false;
  }
}

module.exports = AnomalyDetection;
