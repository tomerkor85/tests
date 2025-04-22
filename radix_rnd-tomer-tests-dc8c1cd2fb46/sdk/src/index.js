/**
 * RadixInsight SDK - Core module
 * 
 * This is the main entry point for the RadixInsight SDK.
 * It provides a simple interface for tracking events and user behavior.
 */

import { v4 as uuidv4 } from 'uuid';
import { sendEvent, sendBatchEvents } from './transport';
import { getSessionId, getUserId, getBrowserInfo, getPageInfo } from './utils';

class RadixInsight {
  /**
   * Create a new RadixInsight instance
   * @param {Object} config - Configuration options
   * @param {string} config.apiKey - Your RadixInsight API key
   * @param {string} config.endpoint - API endpoint URL (optional)
   * @param {boolean} config.debug - Enable debug mode (optional)
   * @param {boolean} config.autoTrack - Automatically track page views and clicks (optional)
   */
  constructor(config) {
    if (!config || !config.apiKey) {
      throw new Error('RadixInsight: API key is required');
    }

    this.config = {
      apiKey: config.apiKey,
      endpoint: config.endpoint || 'https://api.radixinsight.com/v1',
      debug: config.debug || false,
      autoTrack: config.autoTrack !== false, // Default to true
      batchSize: config.batchSize || 10,
      batchInterval: config.batchInterval || 2000, // 2 seconds
    };

    this.userId = getUserId();
    this.sessionId = getSessionId();
    this.eventQueue = [];
    this.initialized = false;

    // Bind methods to maintain context
    this.track = this.track.bind(this);
    this.identify = this.identify.bind(this);
    this.page = this.page.bind(this);
    this.flush = this.flush.bind(this);
    this._processBatch = this._processBatch.bind(this);

    // Set up batch processing interval
    this.batchIntervalId = setInterval(this._processBatch, this.config.batchInterval);

    // Initialize auto-tracking if enabled
    if (this.config.autoTrack && typeof window !== 'undefined') {
      this._setupAutoTracking();
    }

    this.initialized = true;
    this._log('RadixInsight SDK initialized');

    // Track initialization
    this.track('sdk_initialized', {
      version: '1.0.0',
      config: {
        ...this.config,
        apiKey: '***' // Don't log the actual API key
      }
    });
  }

  /**
   * Track an event
   * @param {string} eventName - Name of the event
   * @param {Object} properties - Event properties (optional)
   * @returns {Promise<Object>} - Event tracking result
   */
  track(eventName, properties = {}) {
    if (!eventName) {
      throw new Error('RadixInsight: Event name is required');
    }

    const event = {
      event_id: uuidv4(),
      event_name: eventName,
      timestamp: new Date().toISOString(),
      user_id: this.userId,
      session_id: this.sessionId,
      properties: {
        ...getBrowserInfo(),
        ...properties
      }
    };

    this._log('Tracking event:', eventName, properties);

    // Add to queue for batch processing
    this.eventQueue.push(event);

    // If queue exceeds batch size, process immediately
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }

    return Promise.resolve({ success: true, eventId: event.event_id });
  }

  /**
   * Identify a user
   * @param {string} userId - User ID
   * @param {Object} traits - User traits (optional)
   * @returns {Promise<Object>} - Identification result
   */
  identify(userId, traits = {}) {
    if (!userId) {
      throw new Error('RadixInsight: User ID is required');
    }

    this.userId = userId;
    localStorage.setItem('radixinsight_user_id', userId);

    this._log('User identified:', userId, traits);

    // Track identify event
    return this.track('identify', {
      user_id: userId,
      ...traits
    });
  }

  /**
   * Track a page view
   * @param {string} pageName - Name of the page (optional)
   * @param {Object} properties - Page properties (optional)
   * @returns {Promise<Object>} - Page tracking result
   */
  page(pageName = null, properties = {}) {
    const pageInfo = getPageInfo();
    const pageName = pageName || pageInfo.title;

    this._log('Page viewed:', pageName, pageInfo);

    // Track page view event
    return this.track('page_view', {
      page_name: pageName,
      ...pageInfo,
      ...properties
    });
  }

  /**
   * Flush the event queue immediately
   * @returns {Promise<Object>} - Flush result
   */
  flush() {
    if (this.eventQueue.length === 0) {
      return Promise.resolve({ success: true, count: 0 });
    }

    const events = [...this.eventQueue];
    this.eventQueue = [];

    this._log(`Flushing ${events.length} events`);

    return sendBatchEvents(events, {
      apiKey: this.config.apiKey,
      endpoint: this.config.endpoint
    }).catch(error => {
      this._log('Error flushing events:', error);
      
      // Put events back in the queue on failure
      this.eventQueue = [...events, ...this.eventQueue];
      
      throw error;
    });
  }

  /**
   * Reset the current session
   * @returns {Object} - New session information
   */
  resetSession() {
    this.sessionId = uuidv4();
    localStorage.setItem('radixinsight_session_id', this.sessionId);
    
    this._log('Session reset:', this.sessionId);
    
    // Track session reset event
    this.track('session_reset', {
      new_session_id: this.sessionId
    });
    
    return { sessionId: this.sessionId };
  }

  /**
   * Process events in batch
   * @private
   */
  _processBatch() {
    if (this.eventQueue.length > 0) {
      this.flush().catch(error => {
        this._log('Error in batch processing:', error);
      });
    }
  }

  /**
   * Set up automatic event tracking
   * @private
   */
  _setupAutoTracking() {
    // Track page views
    window.addEventListener('load', () => {
      this.page();
    });

    // Track page navigation
    if (window.history) {
      const originalPushState = window.history.pushState;
      window.history.pushState = function() {
        originalPushState.apply(this, arguments);
        this.page();
      }.bind(this);

      window.addEventListener('popstate', () => {
        this.page();
      });
    }

    // Track clicks
    document.addEventListener('click', event => {
      const element = event.target;
      const tagName = element.tagName.toLowerCase();
      
      if (tagName === 'a' || tagName === 'button' || element.role === 'button') {
        const properties = {
          element_type: tagName,
          element_id: element.id || null,
          element_class: element.className || null,
          element_text: element.innerText || null,
          href: element.href || null
        };
        
        this.track('element_click', properties);
      }
    });
  }

  /**
   * Log debug messages
   * @private
   */
  _log(...args) {
    if (this.config.debug && console) {
      console.log('[RadixInsight]', ...args);
    }
  }
}

/**
 * Initialize the RadixInsight SDK
 * @param {Object} config - Configuration options
 * @returns {RadixInsight} - RadixInsight instance
 */
export function initRadix(config) {
  return new RadixInsight(config);
}

export default {
  initRadix
};
