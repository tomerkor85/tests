/**
 * User Flow Tracking Client
 * 
 * This module provides a client-side library for tracking user flows.
 */

class UserFlowClient {
  /**
   * Create a new UserFlowClient instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      apiUrl: options.apiUrl || '/api/flows',
      autoTrack: options.autoTrack !== false,
      sessionIdKey: options.sessionIdKey || 'radixinsight_session_id',
      userIdKey: options.userIdKey || 'radixinsight_user_id',
      flowIdKey: options.flowIdKey || 'radixinsight_flow_id',
      debug: options.debug || false,
      ...options
    };
    
    this.userId = null;
    this.sessionId = null;
    this.flowId = null;
    
    // Initialize client
    this._initialize();
  }
  
  /**
   * Initialize the client
   * @private
   */
  _initialize() {
    // Get or create session ID
    this.sessionId = this._getStorageItem(this.options.sessionIdKey);
    if (!this.sessionId) {
      this.sessionId = this._generateId();
      this._setStorageItem(this.options.sessionIdKey, this.sessionId);
    }
    
    // Get user ID if available
    this.userId = this._getStorageItem(this.options.userIdKey);
    
    // Get flow ID if available
    this.flowId = this._getStorageItem(this.options.flowIdKey);
    
    // Set up auto-tracking if enabled
    if (this.options.autoTrack && typeof window !== 'undefined') {
      this._setupAutoTracking();
    }
    
    this._log('UserFlowClient initialized');
  }
  
  /**
   * Set up automatic event tracking
   * @private
   */
  _setupAutoTracking() {
    // Track page loads
    window.addEventListener('load', () => {
      // Start a new flow if none exists
      if (!this.flowId && this.userId) {
        this.startFlow('page_load', 'Page Load', {
          url: window.location.href,
          title: document.title,
          referrer: document.referrer
        });
      } else if (this.flowId && this.userId) {
        // Add page load event to existing flow
        this.addEvent('page_load', 'Page Load', {
          url: window.location.href,
          title: document.title,
          referrer: document.referrer
        });
      }
    });
    
    // Track page navigation
    if (window.history) {
      const originalPushState = window.history.pushState;
      window.history.pushState = function() {
        originalPushState.apply(this, arguments);
        
        if (this.flowId && this.userId) {
          this.addEvent('navigation', 'Page Navigation', {
            url: window.location.href,
            title: document.title
          });
        }
      }.bind(this);
      
      window.addEventListener('popstate', () => {
        if (this.flowId && this.userId) {
          this.addEvent('navigation', 'Page Navigation', {
            url: window.location.href,
            title: document.title,
            backButton: true
          });
        }
      });
    }
    
    // Track clicks on important elements
    document.addEventListener('click', event => {
      if (!this.flowId || !this.userId) return;
      
      const element = event.target.closest('a, button, [role="button"], [type="button"], [type="submit"]');
      if (!element) return;
      
      const properties = {
        element_type: element.tagName.toLowerCase(),
        element_id: element.id || null,
        element_class: element.className || null,
        element_text: element.innerText || null,
        href: element.href || null
      };
      
      this.addEvent('click', 'Element Click', properties);
    });
    
    // Track form submissions
    document.addEventListener('submit', event => {
      if (!this.flowId || !this.userId) return;
      
      const form = event.target;
      
      const properties = {
        form_id: form.id || null,
        form_action: form.action || null,
        form_method: form.method || null
      };
      
      this.addEvent('form_submit', 'Form Submit', properties);
    });
    
    // Track user login
    document.addEventListener('radixinsight:login', event => {
      const { userId, userData } = event.detail;
      
      if (userId) {
        this.identify(userId, userData);
        
        // Start a new flow for the login
        this.startFlow('login', 'User Login', userData);
      }
    });
    
    // Track user logout
    document.addEventListener('radixinsight:logout', event => {
      if (this.flowId) {
        this.endFlow('logout', 'User Logout');
      }
      
      // Clear user ID
      this.userId = null;
      this._removeStorageItem(this.options.userIdKey);
      
      // Clear flow ID
      this.flowId = null;
      this._removeStorageItem(this.options.flowIdKey);
    });
  }
  
  /**
   * Identify a user
   * @param {string} userId - User ID
   * @param {Object} userData - User data
   */
  identify(userId, userData = {}) {
    this.userId = userId;
    this._setStorageItem(this.options.userIdKey, userId);
    
    this._log('User identified:', userId, userData);
    
    // Dispatch event for other components
    if (typeof window !== 'undefined' && window.document) {
      const event = new CustomEvent('radixinsight:identify', {
        detail: { userId, userData }
      });
      
      document.dispatchEvent(event);
    }
    
    return this;
  }
  
  /**
   * Start a new user flow
   * @param {string} eventType - Event type
   * @param {string} eventName - Event name
   * @param {Object} properties - Event properties
   * @returns {Promise<Object>} - Flow information
   */
  async startFlow(eventType, eventName, properties = {}) {
    if (!this.userId) {
      throw new Error('User must be identified before starting a flow');
    }
    
    try {
      const response = await this._apiRequest('POST', '/start', {
        userId: this.userId,
        sessionId: this.sessionId,
        eventType,
        eventName,
        properties
      });
      
      if (response.success) {
        this.flowId = response.flow.flowId;
        this._setStorageItem(this.options.flowIdKey, this.flowId);
        
        this._log('Flow started:', this.flowId, eventType);
        
        return response.flow;
      } else {
        throw new Error(response.message || 'Failed to start flow');
      }
    } catch (error) {
      this._log('Error starting flow:', error);
      throw error;
    }
  }
  
  /**
   * Add an event to the current flow
   * @param {string} eventType - Event type
   * @param {string} eventName - Event name
   * @param {Object} properties - Event properties
   * @returns {Promise<Object>} - Updated flow information
   */
  async addEvent(eventType, eventName, properties = {}) {
    if (!this.userId) {
      throw new Error('User must be identified before adding events');
    }
    
    if (!this.flowId) {
      throw new Error('Flow must be started before adding events');
    }
    
    try {
      const response = await this._apiRequest('POST', `/${this.flowId}/events`, {
        userId: this.userId,
        sessionId: this.sessionId,
        eventType,
        eventName,
        properties
      });
      
      if (response.success) {
        this._log('Event added:', eventType);
        return response.flow;
      } else {
        throw new Error(response.message || 'Failed to add event');
      }
    } catch (error) {
      this._log('Error adding event:', error);
      throw error;
    }
  }
  
  /**
   * End the current flow
   * @param {string} eventType - Event type
   * @param {string} eventName - Event name
   * @param {Object} properties - Event properties
   * @returns {Promise<Object>} - Completed flow information
   */
  async endFlow(eventType, eventName, properties = {}) {
    if (!this.flowId) {
      throw new Error('Flow must be started before ending');
    }
    
    try {
      const response = await this._apiRequest('POST', `/${this.flowId}/end`, {
        eventType,
        eventName,
        properties
      });
      
      if (response.success) {
        this._log('Flow ended:', this.flowId, eventType);
        
        // Clear flow ID
        this.flowId = null;
        this._removeStorageItem(this.options.flowIdKey);
        
        return response.flow;
      } else {
        throw new Error(response.message || 'Failed to end flow');
      }
    } catch (error) {
      this._log('Error ending flow:', error);
      throw error;
    }
  }
  
  /**
   * Get the current flow
   * @returns {Promise<Object>} - Flow information
   */
  async getFlow() {
    if (!this.flowId) {
      return null;
    }
    
    try {
      const response = await this._apiRequest('GET', `/${this.flowId}`);
      
      if (response.success) {
        return response.flow;
      } else {
        throw new Error(response.message || 'Failed to get flow');
      }
    } catch (error) {
      this._log('Error getting flow:', error);
      throw error;
    }
  }
  
  /**
   * Make an API request
   * @private
   * @param {string} method - HTTP method
   * @param {string} path - API path
   * @param {Object} data - Request data
   * @returns {Promise<Object>} - Response data
   */
  async _apiRequest(method, path, data = null) {
    const url = `${this.options.apiUrl}${path}`;
    
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (data) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    return await response.json();
  }
  
  /**
   * Get an item from storage
   * @private
   * @param {string} key - Storage key
   * @returns {string|null} - Stored value
   */
  _getStorageItem(key) {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return null;
  }
  
  /**
   * Set an item in storage
   * @private
   * @param {string} key - Storage key
   * @param {string} value - Value to store
   */
  _setStorageItem(key, value) {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  }
  
  /**
   * Remove an item from storage
   * @private
   * @param {string} key - Storage key
   */
  _removeStorageItem(key) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
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
   * Log debug messages
   * @private
   * @param {...any} args - Log arguments
   */
  _log(...args) {
    if (this.options.debug && console) {
      console.log('[UserFlowClient]', ...args);
    }
  }
}

// Export for CommonJS and browser
if (typeof module !== 'undefined' && module.exports) {
  module.exports = UserFlowClient;
} else if (typeof window !== 'undefined') {
  window.UserFlowClient = UserFlowClient;
}
