/**
 * RadixInsight Analytics Platform
 * User Flow Tracking Module
 * 
 * This module provides functionality to track user flows through the application.
 */

const { v4: uuidv4 } = require('uuid');
const { DatabaseFactory } = require('../../database/abstraction');

/**
 * User Flow Tracker class
 */
class UserFlowTracker {
  /**
   * Create a new UserFlowTracker instance
   * @param {Object} options - Configuration options
   * @param {string} options.dbType - Database type ('postgresql', 'mongodb', 'clickhouse')
   * @param {Object} options.dbConfig - Database configuration
   */
  constructor(options) {
    const { dbType, dbConfig } = options;
    
    this.dbType = dbType || 'postgresql';
    this.dbConfig = dbConfig || {};
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the tracker
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) return;
    
    this.db = DatabaseFactory.createDatabase(this.dbType, this.dbConfig);
    await this.db.initialize();
    
    // Ensure the flows collection/table exists
    if (this.dbType === 'mongodb') {
      await this.db.createCollection('flows');
      await this.db.createIndex('flows', { userId: 1 });
      await this.db.createIndex('flows', { sessionId: 1 });
    }
    
    this.initialized = true;
  }

  /**
   * Start tracking a new user flow
   * @param {Object} options - Flow options
   * @param {string} options.userId - User ID
   * @param {string} options.sessionId - Session ID
   * @param {string} options.startPage - Starting page
   * @param {Object} [options.metadata] - Additional metadata
   * @returns {Promise<Object>} - Flow object
   */
  async startFlow(options) {
    if (!this.initialized) await this.initialize();
    
    const { userId, sessionId, startPage, metadata = {} } = options;
    
    if (!userId || !sessionId) {
      throw new Error('userId and sessionId are required');
    }
    
    const flowId = uuidv4();
    const timestamp = new Date();
    
    const flow = {
      id: flowId,
      userId,
      sessionId,
      startPage,
      startTime: timestamp,
      lastUpdated: timestamp,
      events: [],
      metadata,
      status: 'active'
    };
    
    await this.db.insert('flows', flow);
    
    return flow;
  }

  /**
   * Add an event to an existing flow
   * @param {string} flowId - Flow ID
   * @param {Object} event - Event data
   * @param {string} event.type - Event type
   * @param {string} event.page - Page where the event occurred
   * @param {Object} [event.data] - Additional event data
   * @returns {Promise<Object>} - Updated flow
   */
  async addEvent(flowId, event) {
    if (!this.initialized) await this.initialize();
    
    if (!flowId) {
      throw new Error('flowId is required');
    }
    
    if (!event || !event.type) {
      throw new Error('event with type is required');
    }
    
    const timestamp = new Date();
    const eventWithTimestamp = {
      ...event,
      timestamp
    };
    
    // Get the current flow
    const flow = await this.getFlow(flowId);
    
    if (!flow) {
      throw new Error(`Flow with ID ${flowId} not found`);
    }
    
    if (flow.status !== 'active') {
      throw new Error(`Flow with ID ${flowId} is not active`);
    }
    
    // Add the event to the flow
    flow.events.push(eventWithTimestamp);
    flow.lastUpdated = timestamp;
    
    // Update the flow in the database
    await this.db.update('flows', { id: flowId }, {
      events: flow.events,
      lastUpdated: timestamp
    });
    
    return flow;
  }

  /**
   * End a flow
   * @param {string} flowId - Flow ID
   * @param {Object} [options] - End options
   * @param {string} [options.endPage] - Ending page
   * @param {Object} [options.metadata] - Additional metadata
   * @returns {Promise<Object>} - Completed flow
   */
  async endFlow(flowId, options = {}) {
    if (!this.initialized) await this.initialize();
    
    if (!flowId) {
      throw new Error('flowId is required');
    }
    
    const { endPage, metadata = {} } = options;
    const timestamp = new Date();
    
    // Get the current flow
    const flow = await this.getFlow(flowId);
    
    if (!flow) {
      throw new Error(`Flow with ID ${flowId} not found`);
    }
    
    if (flow.status !== 'active') {
      throw new Error(`Flow with ID ${flowId} is already completed`);
    }
    
    // Update flow data
    flow.endTime = timestamp;
    flow.endPage = endPage;
    flow.duration = timestamp - new Date(flow.startTime);
    flow.status = 'completed';
    flow.metadata = { ...flow.metadata, ...metadata };
    flow.lastUpdated = timestamp;
    
    // Calculate metrics
    flow.metrics = this.calculateFlowMetrics(flow);
    
    // Update the flow in the database
    await this.db.update('flows', { id: flowId }, {
      endTime: timestamp,
      endPage,
      duration: flow.duration,
      status: 'completed',
      metadata: flow.metadata,
      lastUpdated: timestamp,
      metrics: flow.metrics
    });
    
    return flow;
  }

  /**
   * Get a flow by ID
   * @param {string} flowId - Flow ID
   * @returns {Promise<Object>} - Flow object
   */
  async getFlow(flowId) {
    if (!this.initialized) await this.initialize();
    
    if (!flowId) {
      throw new Error('flowId is required');
    }
    
    const flow = await this.db.findOne('flows', { id: flowId });
    return flow;
  }

  /**
   * Get flows by criteria
   * @param {Object} criteria - Search criteria
   * @param {string} [criteria.userId] - Filter by user ID
   * @param {string} [criteria.sessionId] - Filter by session ID
   * @param {string} [criteria.status] - Filter by status
   * @param {Date} [criteria.startTimeFrom] - Filter by start time (from)
   * @param {Date} [criteria.startTimeTo] - Filter by start time (to)
   * @param {number} [limit] - Maximum number of results
   * @param {number} [offset] - Result offset
   * @returns {Promise<Array<Object>>} - Array of flow objects
   */
  async getFlows(criteria = {}, limit = 100, offset = 0) {
    if (!this.initialized) await this.initialize();
    
    const query = {};
    
    if (criteria.userId) query.userId = criteria.userId;
    if (criteria.sessionId) query.sessionId = criteria.sessionId;
    if (criteria.status) query.status = criteria.status;
    
    if (criteria.startTimeFrom || criteria.startTimeTo) {
      query.startTime = {};
      if (criteria.startTimeFrom) query.startTime.$gte = criteria.startTimeFrom;
      if (criteria.startTimeTo) query.startTime.$lte = criteria.startTimeTo;
    }
    
    const flows = await this.db.find('flows', query, limit, offset);
    return flows;
  }

  /**
   * Calculate metrics for a flow
   * @param {Object} flow - Flow object
   * @returns {Object} - Flow metrics
   * @private
   */
  calculateFlowMetrics(flow) {
    const metrics = {
      totalEvents: flow.events.length,
      eventTypes: {},
      pagesVisited: new Set(),
      timeOnPage: {}
    };
    
    // Count event types
    flow.events.forEach(event => {
      metrics.eventTypes[event.type] = (metrics.eventTypes[event.type] || 0) + 1;
      if (event.page) metrics.pagesVisited.add(event.page);
    });
    
    // Calculate time on page
    let lastPageEvent = { page: flow.startPage, timestamp: flow.startTime };
    flow.events.forEach(event => {
      if (event.page && event.page !== lastPageEvent.page) {
        const timeOnPage = new Date(event.timestamp) - new Date(lastPageEvent.timestamp);
        metrics.timeOnPage[lastPageEvent.page] = (metrics.timeOnPage[lastPageEvent.page] || 0) + timeOnPage;
        lastPageEvent = event;
      }
    });
    
    // Handle the last page
    if (flow.endPage && flow.endTime) {
      const timeOnLastPage = new Date(flow.endTime) - new Date(lastPageEvent.timestamp);
      metrics.timeOnPage[lastPageEvent.page] = (metrics.timeOnPage[lastPageEvent.page] || 0) + timeOnLastPage;
    }
    
    // Convert Set to Array
    metrics.pagesVisited = Array.from(metrics.pagesVisited);
    
    return metrics;
  }

  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.db) {
      await this.db.close();
      this.initialized = false;
    }
  }
}

module.exports = UserFlowTracker;
