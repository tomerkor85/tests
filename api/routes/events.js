const express = require('express');
const router = express.Router();
const { eventTracking, analyticsQueries } = require('../../core/db/clickhouse-db');
const auth = require('../middlewares/auth');
const paths = require('../../paths');
const { sanitizeInput } = require(paths.utils + '/validators');

/**
 * @route   POST /api/events/track
 * @desc    Track a single event
 * @access  Private (API key)
 */
router.post('/track', async (req, res) => {
  try {
    const { 
      projectId, 
      userId, 
      sessionId, 
      eventType, 
      eventName, 
      properties, 
      timestamp 
    } = req.body;
    
    // Validate required fields
    if (!projectId || !eventType) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID and event type are required' 
      });
    }
    
    // Validate API key from header
    const apiKey = req.header('X-API-Key');
    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        message: 'API key is required' 
      });
    }
    
    // TODO: Validate API key against project ID in database
    
    // Track event
    const result = await eventTracking.trackEvent({
      projectId,
      userId,
      sessionId,
      eventType,
      eventName,
      properties,
      timestamp: timestamp ? new Date(timestamp) : new Date(),
      ip: req.ip,
      userAgent: req.header('User-Agent'),
      referrer: req.header('Referer'),
      referrerDomain: req.header('Referer') ? new URL(req.header('Referer')).hostname : null,
      utmSource: req.query.utm_source,
      utmMedium: req.query.utm_medium,
      utmCampaign: req.query.utm_campaign,
      utmTerm: req.query.utm_term,
      utmContent: req.query.utm_content
    });
    
    res.status(200).json({
      success: true,
      message: 'Event tracked successfully',
      eventId: result.eventId
    });
  } catch (err) {
    console.error('Event tracking error:', err);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error tracking event' 
    });
  }
});

/**
 * @route   POST /api/events/batch
 * @desc    Track multiple events in batch
 * @access  Private (API key)
 */
router.post('/batch', async (req, res) => {
  try {
    const { events } = req.body;
    
    // Validate events array
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Events must be a non-empty array' 
      });
    }
    
    // Validate API key from header
    const apiKey = req.header('X-API-Key');
    if (!apiKey) {
      return res.status(401).json({ 
        success: false, 
        message: 'API key is required' 
      });
    }
    
    // TODO: Validate API key against project ID in database
    
    // Prepare events with request data
    const enrichedEvents = events.map(event => ({
      ...event,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
      ip: req.ip,
      userAgent: req.header('User-Agent'),
      referrer: req.header('Referer'),
      referrerDomain: req.header('Referer') ? new URL(req.header('Referer')).hostname : null,
      utmSource: req.query.utm_source,
      utmMedium: req.query.utm_medium,
      utmCampaign: req.query.utm_campaign,
      utmTerm: req.query.utm_term,
      utmContent: req.query.utm_content
    }));
    
    // Track events
    const result = await eventTracking.trackEvents(enrichedEvents);
    
    res.status(200).json({
      success: true,
      message: 'Events tracked successfully',
      count: result.count,
      eventIds: result.eventIds
    });
  } catch (err) {
    console.error('Batch event tracking error:', err);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error tracking events' 
    });
  }
});

/**
 * @route   GET /api/events/count-by-type
 * @desc    Get event count by type
 * @access  Private
 */
router.get('/count-by-type', auth, async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    
    // Validate required fields
    if (!projectId || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID, start date, and end date are required' 
      });
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dates must be in YYYY-MM-DD format' 
      });
    }
    
    // Get event count by type
    const result = await analyticsQueries.getEventCountByType(
      projectId,
      startDate,
      endDate
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Get event count by type error:', err);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving event count' 
    });
  }
});

/**
 * @route   GET /api/events/count-by-day
 * @desc    Get event count by day
 * @access  Private
 */
router.get('/count-by-day', auth, async (req, res) => {
  try {
    const { projectId, startDate, endDate, eventType } = req.query;
    
    // Validate required fields
    if (!projectId || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID, start date, and end date are required' 
      });
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dates must be in YYYY-MM-DD format' 
      });
    }
    
    // Get event count by day
    const result = await analyticsQueries.getEventCountByDay(
      projectId,
      startDate,
      endDate,
      eventType
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Get event count by day error:', err);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving event count' 
    });
  }
});

/**
 * @route   GET /api/events/unique-users
 * @desc    Get unique users by day
 * @access  Private
 */
router.get('/unique-users', auth, async (req, res) => {
  try {
    const { projectId, startDate, endDate } = req.query;
    
    // Validate required fields
    if (!projectId || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID, start date, and end date are required' 
      });
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dates must be in YYYY-MM-DD format' 
      });
    }
    
    // Get unique users by day
    const result = await analyticsQueries.getUniqueUsersByDay(
      projectId,
      startDate,
      endDate
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Get unique users error:', err);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving unique users' 
    });
  }
});

/**
 * @route   POST /api/events/funnel
 * @desc    Get funnel conversion
 * @access  Private
 */
router.post('/funnel', auth, async (req, res) => {
  try {
    const { projectId, steps, startDate, endDate } = req.body;
    
    // Validate required fields
    if (!projectId || !steps || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID, steps, start date, and end date are required' 
      });
    }
    
    // Validate steps
    if (!Array.isArray(steps) || steps.length < 2) {
      return res.status(400).json({ 
        success: false, 
        message: 'Steps must be an array with at least 2 elements' 
      });
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dates must be in YYYY-MM-DD format' 
      });
    }
    
    // Get funnel conversion
    const result = await analyticsQueries.getFunnelConversion(
      projectId,
      steps,
      startDate,
      endDate
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Get funnel conversion error:', err);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving funnel conversion' 
    });
  }
});

/**
 * @route   GET /api/events/retention
 * @desc    Get retention cohorts
 * @access  Private
 */
router.get('/retention', auth, async (req, res) => {
  try {
    const { projectId, startDate, endDate, interval } = req.query;
    
    // Validate required fields
    if (!projectId || !startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID, start date, and end date are required' 
      });
    }
    
    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dates must be in YYYY-MM-DD format' 
      });
    }
    
    // Validate interval
    const validIntervals = ['day', 'week', 'month'];
    if (interval && !validIntervals.includes(interval)) {
      return res.status(400).json({ 
        success: false, 
        message: `Interval must be one of: ${validIntervals.join(', ')}` 
      });
    }
    
    // Get retention cohorts
    const result = await analyticsQueries.getRetentionCohorts(
      projectId,
      startDate,
      endDate,
      interval || 'day'
    );
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    console.error('Get retention cohorts error:', err);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving retention cohorts' 
    });
  }
});

/**
 * @route   GET /api/events/recent
 * @desc    Get recent events
 * @access  Private
 */
router.get('/recent', auth, async (req, res) => {
  try {
    const { 
      projectId, 
      limit = 100, 
      offset = 0, 
      eventType, 
      userId, 
      sessionId, 
      startDate, 
      endDate 
    } = req.query;
    
    // Validate required fields
    if (!projectId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Project ID is required' 
      });
    }
    
    // Validate limit and offset
    if (isNaN(parseInt(limit)) || isNaN(parseInt(offset))) {
      return res.status(400).json({ 
        success: false, 
        message: 'Limit and offset must be numbers' 
      });
    }
    
    // Prepare filters
    const filters = {
      eventType,
      userId,
      sessionId,
      startDate,
      endDate
    };
    
    // Get recent events
    const events = await analyticsQueries.getRecentEvents(
      projectId,
      parseInt(limit),
      parseInt(offset),
      filters
    );
    
    res.status(200).json({
      success: true,
      count: events.length,
      events
    });
  } catch (err) {
    console.error('Get recent events error:', err);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving recent events' 
    });
  }
});

module.exports = router;
