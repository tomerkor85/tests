/**
 * User Flow Tracking API
 * 
 * This module provides API endpoints for the user flow tracking functionality.
 */

const express = require('express');
const UserFlowTracker = require('./index');
const router = express.Router();

// Create user flow tracker instance
const flowTracker = new UserFlowTracker({
  dbType: process.env.FLOW_DB_TYPE || 'clickhouse',
  dbConfig: {
    // ClickHouse config
    url: process.env.CLICKHOUSE_URL || 'http://localhost',
    port: process.env.CLICKHOUSE_PORT || 8123,
    basicAuth: {
      username: process.env.CLICKHOUSE_USER || 'default',
      password: process.env.CLICKHOUSE_PASSWORD || '',
    },
    config: {
      database: process.env.CLICKHOUSE_DB || 'radixinsight',
    },
    // PostgreSQL config
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'radixinsight',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
    // MongoDB config
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB || 'radixinsight',
  }
});

// Initialize flow tracker
flowTracker.initialize().catch(err => {
  console.error('Failed to initialize user flow tracker:', err);
});

/**
 * Start a new user flow
 * POST /api/flows/start
 */
router.post('/start', async (req, res) => {
  try {
    const { userId, sessionId, eventType, eventName, properties } = req.body;
    
    if (!userId || !sessionId || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, sessionId, eventType'
      });
    }
    
    const flow = await flowTracker.startFlow({
      userId,
      sessionId,
      eventType,
      eventName: eventName || eventType,
      properties
    });
    
    res.json({
      success: true,
      flow
    });
  } catch (error) {
    console.error('Error starting flow:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Add an event to an existing flow
 * POST /api/flows/:flowId/events
 */
router.post('/:flowId/events', async (req, res) => {
  try {
    const { flowId } = req.params;
    const { userId, sessionId, eventType, eventName, properties } = req.body;
    
    if (!userId || !sessionId || !eventType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: userId, sessionId, eventType'
      });
    }
    
    const flow = await flowTracker.addEvent({
      flowId,
      userId,
      sessionId,
      eventType,
      eventName: eventName || eventType,
      properties
    });
    
    res.json({
      success: true,
      flow
    });
  } catch (error) {
    console.error('Error adding event to flow:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * End a user flow
 * POST /api/flows/:flowId/end
 */
router.post('/:flowId/end', async (req, res) => {
  try {
    const { flowId } = req.params;
    const { eventType, eventName, properties } = req.body;
    
    if (!eventType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required field: eventType'
      });
    }
    
    const flow = await flowTracker.endFlow({
      flowId,
      eventType,
      eventName: eventName || eventType,
      properties
    });
    
    res.json({
      success: true,
      flow
    });
  } catch (error) {
    console.error('Error ending flow:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get a flow by ID
 * GET /api/flows/:flowId
 */
router.get('/:flowId', async (req, res) => {
  try {
    const { flowId } = req.params;
    const flow = await flowTracker.getFlow(flowId);
    
    if (!flow) {
      return res.status(404).json({
        success: false,
        message: 'Flow not found'
      });
    }
    
    res.json({
      success: true,
      flow
    });
  } catch (error) {
    console.error('Error getting flow:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get flows by session ID
 * GET /api/flows/session/:sessionId
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const flows = await flowTracker.getFlowsBySession(sessionId);
    
    res.json({
      success: true,
      flows
    });
  } catch (error) {
    console.error('Error getting flows by session:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Get flows by user ID
 * GET /api/flows/user/:userId
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit, offset } = req.query;
    
    const flows = await flowTracker.getFlowsByUser(userId, {
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0
    });
    
    res.json({
      success: true,
      flows
    });
  } catch (error) {
    console.error('Error getting flows by user:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/**
 * Search flows by criteria
 * GET /api/flows/search
 */
router.get('/search', async (req, res) => {
  try {
    const {
      userId,
      sessionId,
      eventType,
      startTimeFrom,
      startTimeTo,
      minDuration,
      maxDuration,
      limit,
      offset
    } = req.query;
    
    const criteria = {};
    if (userId) criteria.userId = userId;
    if (sessionId) criteria.sessionId = sessionId;
    if (eventType) criteria.eventType = eventType;
    if (startTimeFrom) criteria.startTimeFrom = startTimeFrom;
    if (startTimeTo) criteria.startTimeTo = startTimeTo;
    if (minDuration) criteria.minDuration = parseInt(minDuration, 10);
    if (maxDuration) criteria.maxDuration = parseInt(maxDuration, 10);
    
    const options = {
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0
    };
    
    const flows = await flowTracker.searchFlows(criteria, options);
    
    res.json({
      success: true,
      flows
    });
  } catch (error) {
    console.error('Error searching flows:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
