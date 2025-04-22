/**
 * Session Recording Module
 * 
 * This module provides session recording functionality for the RadixInsight platform.
 * It captures user interactions and allows playback for analysis.
 */

const { DatabaseFactory } = require('../../database/abstraction');

class SessionRecording {
  /**
   * Create a new SessionRecording instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      dbType: options.dbType || 'clickhouse',
      dbConfig: options.dbConfig || {},
      recordingsTable: options.recordingsTable || 'session_recordings',
      eventsTable: options.eventsTable || 'session_recording_events',
      maxDuration: options.maxDuration || 3600, // 1 hour in seconds
      sampleRate: options.sampleRate || 50, // Events per second
      compressionEnabled: options.compressionEnabled !== false,
      maskSensitiveData: options.maskSensitiveData !== false,
      ...options
    };
    
    this.db = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the session recording module
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
    // Create recordings table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.recordingsTable} (
        recording_id String,
        session_id String,
        user_id String,
        start_time DateTime,
        end_time DateTime,
        duration UInt32,
        url String,
        user_agent String,
        device_type String,
        browser String,
        os String,
        country String,
        region String,
        city String,
        event_count UInt32,
        date Date DEFAULT toDate(start_time)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, recording_id, session_id)
    `);
    
    // Create events table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.eventsTable} (
        recording_id String,
        event_id String,
        session_id String,
        timestamp DateTime64(3),
        event_type String,
        data String,
        sequence_index UInt32,
        date Date DEFAULT toDate(timestamp)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, recording_id, sequence_index)
    `);
  }
  
  /**
   * Ensure PostgreSQL tables exist
   * @private
   * @returns {Promise<void>}
   */
  async _ensurePostgreSQLTables() {
    // Create recordings table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.recordingsTable} (
        recording_id VARCHAR(36) PRIMARY KEY,
        session_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        start_time TIMESTAMP NOT NULL,
        end_time TIMESTAMP,
        duration INTEGER,
        url TEXT,
        user_agent TEXT,
        device_type VARCHAR(50),
        browser VARCHAR(50),
        os VARCHAR(50),
        country VARCHAR(50),
        region VARCHAR(50),
        city VARCHAR(50),
        event_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create events table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.eventsTable} (
        id SERIAL PRIMARY KEY,
        recording_id VARCHAR(36) NOT NULL,
        event_id VARCHAR(36) NOT NULL,
        session_id VARCHAR(36) NOT NULL,
        timestamp TIMESTAMP(3) NOT NULL,
        event_type VARCHAR(50) NOT NULL,
        data JSONB NOT NULL,
        sequence_index INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (recording_id) REFERENCES ${this.options.recordingsTable}(recording_id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.eventsTable}_recording_id
      ON ${this.options.eventsTable} (recording_id)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.eventsTable}_sequence_index
      ON ${this.options.eventsTable} (recording_id, sequence_index)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.recordingsTable}_session_id
      ON ${this.options.recordingsTable} (session_id)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.recordingsTable}_user_id
      ON ${this.options.recordingsTable} (user_id)
    `);
  }
  
  /**
   * Start a new recording session
   * @param {Object} data - Recording data
   * @returns {Promise<Object>} - Recording information
   */
  async startRecording(data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      sessionId,
      userId = null,
      url,
      userAgent,
      deviceInfo = {}
    } = data;
    
    // Validate required fields
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    // Generate recording ID
    const recordingId = this._generateId();
    
    // Get current timestamp
    const startTime = new Date();
    
    // Parse device info
    const deviceType = deviceInfo.deviceType || this._detectDeviceType(userAgent);
    const browser = deviceInfo.browser || this._detectBrowser(userAgent);
    const os = deviceInfo.os || this._detectOS(userAgent);
    
    // Create recording record
    const recordingData = {
      recording_id: recordingId,
      session_id: sessionId,
      user_id: userId,
      start_time: startTime,
      end_time: null,
      duration: null,
      url: url || '',
      user_agent: userAgent || '',
      device_type: deviceType,
      browser,
      os,
      country: deviceInfo.country || null,
      region: deviceInfo.region || null,
      city: deviceInfo.city || null,
      event_count: 0
    };
    
    // Insert recording record
    await this.db.insert(this.options.recordingsTable, recordingData);
    
    return {
      recordingId,
      sessionId,
      userId,
      startTime,
      url,
      deviceType,
      browser,
      os
    };
  }
  
  /**
   * Add an event to a recording
   * @param {string} recordingId - Recording ID
   * @param {Object} data - Event data
   * @returns {Promise<Object>} - Event information
   */
  async addEvent(recordingId, data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      sessionId,
      eventType,
      eventData,
      timestamp = new Date()
    } = data;
    
    // Validate required fields
    if (!sessionId || !eventType || !eventData) {
      throw new Error('Session ID, event type, and event data are required');
    }
    
    // Get recording
    let recording;
    if (this.options.dbType === 'mongodb') {
      recording = await this.db.findOne(this.options.recordingsTable, { recording_id: recordingId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.recordingsTable}
        WHERE recording_id = $1
      `, [recordingId]);
      
      recording = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (!recording) {
      throw new Error(`Recording not found: ${recordingId}`);
    }
    
    // Check if recording is still active
    if (recording.end_time) {
      throw new Error(`Recording has already ended: ${recordingId}`);
    }
    
    // Process event data
    const processedData = this._processEventData(eventType, eventData);
    
    // Get current event count
    let eventCount;
    if (this.options.dbType === 'mongodb') {
      const count = await this.db.count(this.options.eventsTable, { recording_id: recordingId });
      eventCount = count;
    } else {
      const result = await this.db.query(`
        SELECT COUNT(*) as count
        FROM ${this.options.eventsTable}
        WHERE recording_id = $1
      `, [recordingId]);
      
      eventCount = parseInt(result.rows[0].count, 10);
    }
    
    // Generate event ID
    const eventId = this._generateId();
    
    // Create event record
    const eventRecord = {
      recording_id: recordingId,
      event_id: eventId,
      session_id: sessionId,
      timestamp,
      event_type: eventType,
      data: JSON.stringify(processedData),
      sequence_index: eventCount
    };
    
    // Insert event record
    await this.db.insert(this.options.eventsTable, eventRecord);
    
    // Update recording event count
    if (this.options.dbType === 'mongodb') {
      await this.db.update(
        this.options.recordingsTable,
        { recording_id: recordingId },
        { $inc: { event_count: 1 } }
      );
    } else {
      await this.db.query(`
        UPDATE ${this.options.recordingsTable}
        SET event_count = event_count + 1
        WHERE recording_id = $1
      `, [recordingId]);
    }
    
    return {
      eventId,
      recordingId,
      sessionId,
      eventType,
      timestamp,
      sequenceIndex: eventCount
    };
  }
  
  /**
   * Process event data based on event type
   * @private
   * @param {string} eventType - Event type
   * @param {Object} eventData - Event data
   * @returns {Object} - Processed event data
   */
  _processEventData(eventType, eventData) {
    // Clone data to avoid modifying the original
    const data = JSON.parse(JSON.stringify(eventData));
    
    // Apply data masking if enabled
    if (this.options.maskSensitiveData) {
      if (eventType === 'input' && data.value) {
        // Mask input values for sensitive fields
        if (
          data.element && (
            data.element.type === 'password' ||
            data.element.name && (
              data.element.name.includes('password') ||
              data.element.name.includes('credit') ||
              data.element.name.includes('card') ||
              data.element.name.includes('cvv') ||
              data.element.name.includes('ssn')
            )
          )
        ) {
          data.value = '********';
        }
      }
    }
    
    return data;
  }
  
  /**
   * End a recording
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} - Recording information
   */
  async endRecording(recordingId) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Get recording
    let recording;
    if (this.options.dbType === 'mongodb') {
      recording = await this.db.findOne(this.options.recordingsTable, { recording_id: recordingId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.recordingsTable}
        WHERE recording_id = $1
      `, [recordingId]);
      
      recording = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (!recording) {
      throw new Error(`Recording not found: ${recordingId}`);
    }
    
    // Check if recording is already ended
    if (recording.end_time) {
      return {
        recordingId,
        sessionId: recording.session_id,
        userId: recording.user_id,
        startTime: recording.start_time,
        endTime: recording.end_time,
        duration: recording.duration,
        eventCount: recording.event_count,
        alreadyEnded: true
      };
    }
    
    // Get current timestamp
    const endTime = new Date();
    
    // Calculate duration
    const startTime = new Date(recording.start_time);
    const duration = Math.floor((endTime - startTime) / 1000); // Duration in seconds
    
    // Update recording record
    if (this.options.dbType === 'mongodb') {
      await this.db.update(
        this.options.recordingsTable,
        { recording_id: recordingId },
        {
          end_time: endTime,
          duration: duration
        }
      );
    } else {
      await this.db.query(`
        UPDATE ${this.options.recordingsTable}
        SET end_time = $1, duration = $2
        WHERE recording_id = $3
      `, [endTime, duration, recordingId]);
    }
    
    return {
      recordingId,
      sessionId: recording.session_id,
      userId: recording.user_id,
      startTime: startTime,
      endTime: endTime,
      duration: duration,
      eventCount: recording.event_count
    };
  }
  
  /**
   * Get a recording by ID
   * @param {string} recordingId - Recording ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Recording with events
   */
  async getRecording(recordingId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      includeEvents = true,
      startIndex = 0,
      limit = 1000
    } = options;
    
    // Get recording record
    let recording;
    if (this.options.dbType === 'mongodb') {
      recording = await this.db.findOne(this.options.recordingsTable, { recording_id: recordingId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.recordingsTable}
        WHERE recording_id = $1
      `, [recordingId]);
      
      recording = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (!recording) {
      return null;
    }
    
    // Include events if requested
    if (includeEvents) {
      let events;
      if (this.options.dbType === 'mongodb') {
        events = await this.db.find(
          this.options.eventsTable,
          { recording_id: recordingId },
          { 
            sort: { sequence_index: 1 },
            skip: startIndex,
            limit: limit
          }
        );
      } else {
        const result = await this.db.query(`
          SELECT * FROM ${this.options.eventsTable}
          WHERE recording_id = $1
          ORDER BY sequence_index ASC
          LIMIT $2 OFFSET $3
        `, [recordingId, limit, startIndex]);
        
        events = result.rows || [];
      }
      
      // Parse event data
      events = events.map(event => ({
        ...event,
        data: typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      }));
      
      recording.events = events;
      recording.eventsPagination = {
        startIndex,
        limit,
        hasMore: events.length === limit
      };
    }
    
    return recording;
  }
  
  /**
   * Get recordings by session ID
   * @param {string} sessionId - Session ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Recordings
   */
  async getRecordingsBySession(sessionId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      limit = 10,
      offset = 0
    } = options;
    
    // Get recordings
    let recordings;
    if (this.options.dbType === 'mongodb') {
      recordings = await this.db.find(
        this.options.recordingsTable,
        { session_id: sessionId },
        { 
          sort: { start_time: -1 },
          skip: offset,
          limit: limit
        }
      );
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.recordingsTable}
        WHERE session_id = $1
        ORDER BY start_time DESC
        LIMIT $2 OFFSET $3
      `, [sessionId, limit, offset]);
      
      recordings = result.rows || [];
    }
    
    return recordings;
  }
  
  /**
   * Get recordings by user ID
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Recordings
   */
  async getRecordingsByUser(userId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      limit = 10,
      offset = 0
    } = options;
    
    // Get recordings
    let recordings;
    if (this.options.dbType === 'mongodb') {
      recordings = await this.db.find(
        this.options.recordingsTable,
        { user_id: userId },
        { 
          sort: { start_time: -1 },
          skip: offset,
          limit: limit
        }
      );
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.recordingsTable}
        WHERE user_id = $1
        ORDER BY start_time DESC
        LIMIT $2 OFFSET $3
      `, [userId, limit, offset]);
      
      recordings = result.rows || [];
    }
    
    return recordings;
  }
  
  /**
   * Search recordings by criteria
   * @param {Object} criteria - Search criteria
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Matching recordings
   */
  async searchRecordings(criteria = {}, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      limit = 10,
      offset = 0,
      sortBy = 'start_time',
      sortDirection = 'desc'
    } = options;
    
    // Build query based on criteria
    let query = {};
    let params = [];
    let whereClause = '';
    
    if (criteria.userId) {
      if (this.options.dbType === 'mongodb') {
        query.user_id = criteria.userId;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'user_id = $' + (params.length + 1);
        params.push(criteria.userId);
      }
    }
    
    if (criteria.sessionId) {
      if (this.options.dbType === 'mongodb') {
        query.session_id = criteria.sessionId;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'session_id = $' + (params.length + 1);
        params.push(criteria.sessionId);
      }
    }
    
    if (criteria.url) {
      if (this.options.dbType === 'mongodb') {
        query.url = { $regex: criteria.url, $options: 'i' };
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'url LIKE $' + (params.length + 1);
        params.push(`%${criteria.url}%`);
      }
    }
    
    if (criteria.browser) {
      if (this.options.dbType === 'mongodb') {
        query.browser = { $regex: criteria.browser, $options: 'i' };
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'browser LIKE $' + (params.length + 1);
        params.push(`%${criteria.browser}%`);
      }
    }
    
    if (criteria.deviceType) {
      if (this.options.dbType === 'mongodb') {
        query.device_type = criteria.deviceType;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'device_type = $' + (params.length + 1);
        params.push(criteria.deviceType);
      }
    }
    
    if (criteria.startTimeFrom) {
      const startTimeFrom = new Date(criteria.startTimeFrom);
      if (this.options.dbType === 'mongodb') {
        query.start_time = query.start_time || {};
        query.start_time.$gte = startTimeFrom;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'start_time >= $' + (params.length + 1);
        params.push(startTimeFrom);
      }
    }
    
    if (criteria.startTimeTo) {
      const startTimeTo = new Date(criteria.startTimeTo);
      if (this.options.dbType === 'mongodb') {
        query.start_time = query.start_time || {};
        query.start_time.$lte = startTimeTo;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'start_time <= $' + (params.length + 1);
        params.push(startTimeTo);
      }
    }
    
    if (criteria.minDuration) {
      if (this.options.dbType === 'mongodb') {
        query.duration = query.duration || {};
        query.duration.$gte = criteria.minDuration;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'duration >= $' + (params.length + 1);
        params.push(criteria.minDuration);
      }
    }
    
    if (criteria.maxDuration) {
      if (this.options.dbType === 'mongodb') {
        query.duration = query.duration || {};
        query.duration.$lte = criteria.maxDuration;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'duration <= $' + (params.length + 1);
        params.push(criteria.maxDuration);
      }
    }
    
    if (criteria.minEventCount) {
      if (this.options.dbType === 'mongodb') {
        query.event_count = query.event_count || {};
        query.event_count.$gte = criteria.minEventCount;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'event_count >= $' + (params.length + 1);
        params.push(criteria.minEventCount);
      }
    }
    
    // Get recordings
    let recordings;
    if (this.options.dbType === 'mongodb') {
      const sort = {};
      sort[sortBy] = sortDirection === 'desc' ? -1 : 1;
      
      recordings = await this.db.find(
        this.options.recordingsTable,
        query,
        { 
          sort,
          skip: offset,
          limit: limit
        }
      );
    } else {
      const sql = `
        SELECT * FROM ${this.options.recordingsTable}
        ${whereClause}
        ORDER BY ${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await this.db.query(sql, params);
      recordings = result.rows || [];
    }
    
    return recordings;
  }
  
  /**
   * Delete a recording
   * @param {string} recordingId - Recording ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteRecording(recordingId) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Check if recording exists
    let recording;
    if (this.options.dbType === 'mongodb') {
      recording = await this.db.findOne(this.options.recordingsTable, { recording_id: recordingId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.recordingsTable}
        WHERE recording_id = $1
      `, [recordingId]);
      
      recording = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (!recording) {
      return {
        success: false,
        message: `Recording not found: ${recordingId}`
      };
    }
    
    // Delete events first
    if (this.options.dbType === 'mongodb') {
      await this.db.delete(this.options.eventsTable, { recording_id: recordingId });
    } else {
      await this.db.query(`
        DELETE FROM ${this.options.eventsTable}
        WHERE recording_id = $1
      `, [recordingId]);
    }
    
    // Delete recording
    if (this.options.dbType === 'mongodb') {
      await this.db.delete(this.options.recordingsTable, { recording_id: recordingId });
    } else {
      await this.db.query(`
        DELETE FROM ${this.options.recordingsTable}
        WHERE recording_id = $1
      `, [recordingId]);
    }
    
    return {
      success: true,
      recordingId,
      sessionId: recording.session_id,
      userId: recording.user_id
    };
  }
  
  /**
   * Detect device type from user agent
   * @private
   * @param {string} userAgent - User agent string
   * @returns {string} - Device type
   */
  _detectDeviceType(userAgent) {
    if (!userAgent) return 'unknown';
    
    userAgent = userAgent.toLowerCase();
    
    if (
      /android.+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(userAgent) ||
      /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|e\-|e\/|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|xda(\-|2|g)|yas\-|your|zeto|zte\-/i.test(userAgent.substr(0, 4))
    ) {
      return 'mobile';
    }
    
    if (
      /ipad|android(?!.*mobile)|silk.*tablet|tablet|playbook|(?=.*tablet)(?=.*android)|nexus 7|kindle(?!.*mobile)|^.*opera.*tablet|^.*opera.*mini|^.*opera.*mobi|tablet.*firefox|tablet.*chrome/i.test(userAgent)
    ) {
      return 'tablet';
    }
    
    return 'desktop';
  }
  
  /**
   * Detect browser from user agent
   * @private
   * @param {string} userAgent - User agent string
   * @returns {string} - Browser name
   */
  _detectBrowser(userAgent) {
    if (!userAgent) return 'unknown';
    
    userAgent = userAgent.toLowerCase();
    
    if (userAgent.indexOf('firefox') > -1) {
      return 'Firefox';
    } else if (userAgent.indexOf('edg') > -1) {
      return 'Edge';
    } else if (userAgent.indexOf('chrome') > -1) {
      return 'Chrome';
    } else if (userAgent.indexOf('safari') > -1) {
      return 'Safari';
    } else if (userAgent.indexOf('opera') > -1 || userAgent.indexOf('opr') > -1) {
      return 'Opera';
    } else if (userAgent.indexOf('msie') > -1 || userAgent.indexOf('trident') > -1) {
      return 'Internet Explorer';
    }
    
    return 'unknown';
  }
  
  /**
   * Detect OS from user agent
   * @private
   * @param {string} userAgent - User agent string
   * @returns {string} - OS name
   */
  _detectOS(userAgent) {
    if (!userAgent) return 'unknown';
    
    userAgent = userAgent.toLowerCase();
    
    if (userAgent.indexOf('windows') > -1) {
      return 'Windows';
    } else if (userAgent.indexOf('mac') > -1) {
      return 'macOS';
    } else if (userAgent.indexOf('linux') > -1) {
      return 'Linux';
    } else if (userAgent.indexOf('android') > -1) {
      return 'Android';
    } else if (userAgent.indexOf('ios') > -1 || userAgent.indexOf('iphone') > -1 || userAgent.indexOf('ipad') > -1) {
      return 'iOS';
    }
    
    return 'unknown';
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
   * Close the session recording module
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

module.exports = SessionRecording;
