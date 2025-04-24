/**
 * Heatmaps Integration Module
 * 
 * This module provides heatmap functionality for the RadixInsight platform.
 * It visualizes user interactions on web pages to identify popular areas and behavior patterns.
 */

const { DatabaseFactory } = require('../../database/abstraction');

class HeatmapsIntegration {
  /**
   * Create a new HeatmapsIntegration instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      dbType: options.dbType || 'clickhouse',
      dbConfig: options.dbConfig || {},
      heatmapsTable: options.heatmapsTable || 'heatmaps',
      interactionsTable: options.interactionsTable || 'heatmap_interactions',
      screenshotsTable: options.screenshotsTable || 'heatmap_screenshots',
      samplingRate: options.samplingRate || 100, // Percentage of interactions to record
      maxPointsPerHeatmap: options.maxPointsPerHeatmap || 10000,
      heatmapTypes: options.heatmapTypes || ['click', 'move', 'scroll', 'attention'],
      ...options
    };
    
    this.db = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the heatmaps integration module
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
    // Create heatmaps table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.heatmapsTable} (
        heatmap_id String,
        url String,
        page_title String,
        type String,
        device_type String,
        viewport_width UInt16,
        viewport_height UInt16,
        creation_date DateTime,
        last_updated DateTime,
        interaction_count UInt32,
        date Date DEFAULT toDate(creation_date)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, heatmap_id)
    `);
    
    // Create interactions table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.interactionsTable} (
        interaction_id String,
        heatmap_id String,
        session_id String,
        user_id String,
        type String,
        x UInt16,
        y UInt16,
        value Float32,
        timestamp DateTime64(3),
        metadata String,
        date Date DEFAULT toDate(timestamp)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, heatmap_id, timestamp)
    `);
    
    // Create screenshots table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.screenshotsTable} (
        screenshot_id String,
        heatmap_id String,
        timestamp DateTime,
        file_path String,
        width UInt16,
        height UInt16,
        file_size UInt32,
        date Date DEFAULT toDate(timestamp)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, heatmap_id)
    `);
  }
  
  /**
   * Ensure PostgreSQL tables exist
   * @private
   * @returns {Promise<void>}
   */
  async _ensurePostgreSQLTables() {
    // Create heatmaps table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.heatmapsTable} (
        heatmap_id VARCHAR(36) PRIMARY KEY,
        url TEXT NOT NULL,
        page_title VARCHAR(255),
        type VARCHAR(20) NOT NULL,
        device_type VARCHAR(20) NOT NULL,
        viewport_width INTEGER NOT NULL,
        viewport_height INTEGER NOT NULL,
        creation_date TIMESTAMP NOT NULL,
        last_updated TIMESTAMP NOT NULL,
        interaction_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create interactions table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.interactionsTable} (
        interaction_id VARCHAR(36) PRIMARY KEY,
        heatmap_id VARCHAR(36) NOT NULL,
        session_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        type VARCHAR(20) NOT NULL,
        x INTEGER NOT NULL,
        y INTEGER NOT NULL,
        value FLOAT,
        timestamp TIMESTAMP(3) NOT NULL,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (heatmap_id) REFERENCES ${this.options.heatmapsTable}(heatmap_id) ON DELETE CASCADE
      )
    `);
    
    // Create screenshots table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.screenshotsTable} (
        screenshot_id VARCHAR(36) PRIMARY KEY,
        heatmap_id VARCHAR(36) NOT NULL,
        timestamp TIMESTAMP NOT NULL,
        file_path TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        file_size INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (heatmap_id) REFERENCES ${this.options.heatmapsTable}(heatmap_id) ON DELETE CASCADE
      )
    `);
    
    // Create indexes
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.heatmapsTable}_url
      ON ${this.options.heatmapsTable} (url)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.interactionsTable}_heatmap_id
      ON ${this.options.interactionsTable} (heatmap_id)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.interactionsTable}_session_id
      ON ${this.options.interactionsTable} (session_id)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.interactionsTable}_user_id
      ON ${this.options.interactionsTable} (user_id)
    `);
  }
  
  /**
   * Create a new heatmap
   * @param {Object} data - Heatmap data
   * @returns {Promise<Object>} - Created heatmap
   */
  async createHeatmap(data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      url,
      pageTitle = '',
      type = 'click',
      deviceType = 'desktop',
      viewportWidth,
      viewportHeight
    } = data;
    
    // Validate required fields
    if (!url || !viewportWidth || !viewportHeight) {
      throw new Error('URL, viewport width, and viewport height are required');
    }
    
    // Validate heatmap type
    if (!this.options.heatmapTypes.includes(type)) {
      throw new Error(`Invalid heatmap type. Must be one of: ${this.options.heatmapTypes.join(', ')}`);
    }
    
    // Check if heatmap already exists
    let existingHeatmap;
    if (this.options.dbType === 'mongodb') {
      existingHeatmap = await this.db.findOne(this.options.heatmapsTable, {
        url,
        type,
        device_type: deviceType
      });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.heatmapsTable}
        WHERE url = $1 AND type = $2 AND device_type = $3
      `, [url, type, deviceType]);
      
      existingHeatmap = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (existingHeatmap) {
      return {
        heatmapId: existingHeatmap.heatmap_id,
        url,
        pageTitle: existingHeatmap.page_title,
        type,
        deviceType,
        viewportWidth: existingHeatmap.viewport_width,
        viewportHeight: existingHeatmap.viewport_height,
        creationDate: existingHeatmap.creation_date,
        lastUpdated: existingHeatmap.last_updated,
        interactionCount: existingHeatmap.interaction_count,
        alreadyExists: true
      };
    }
    
    // Generate heatmap ID
    const heatmapId = this._generateId();
    
    // Get current timestamp
    const timestamp = new Date();
    
    // Create heatmap record
    const heatmapData = {
      heatmap_id: heatmapId,
      url,
      page_title: pageTitle,
      type,
      device_type: deviceType,
      viewport_width: viewportWidth,
      viewport_height: viewportHeight,
      creation_date: timestamp,
      last_updated: timestamp,
      interaction_count: 0
    };
    
    // Insert heatmap record
    await this.db.insert(this.options.heatmapsTable, heatmapData);
    
    return {
      heatmapId,
      url,
      pageTitle,
      type,
      deviceType,
      viewportWidth,
      viewportHeight,
      creationDate: timestamp,
      lastUpdated: timestamp,
      interactionCount: 0
    };
  }
  
  /**
   * Track an interaction for a heatmap
   * @param {string} heatmapId - Heatmap ID
   * @param {Object} data - Interaction data
   * @returns {Promise<Object>} - Tracking result
   */
  async trackInteraction(heatmapId, data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      sessionId,
      userId = null,
      type,
      x,
      y,
      value = 1,
      timestamp = new Date(),
      metadata = {}
    } = data;
    
    // Validate required fields
    if (!sessionId || !type || x === undefined || y === undefined) {
      throw new Error('Session ID, type, x, and y coordinates are required');
    }
    
    // Check if heatmap exists
    let heatmap;
    if (this.options.dbType === 'mongodb') {
      heatmap = await this.db.findOne(this.options.heatmapsTable, { heatmap_id: heatmapId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.heatmapsTable}
        WHERE heatmap_id = $1
      `, [heatmapId]);
      
      heatmap = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (!heatmap) {
      throw new Error(`Heatmap not found: ${heatmapId}`);
    }
    
    // Apply sampling rate
    if (this.options.samplingRate < 100) {
      const random = Math.random() * 100;
      if (random >= this.options.samplingRate) {
        return {
          heatmapId,
          sampled: true,
          message: 'Interaction sampled out based on sampling rate'
        };
      }
    }
    
    // Check if we've reached the maximum number of points
    if (heatmap.interaction_count >= this.options.maxPointsPerHeatmap) {
      // In a real implementation, we might downsample existing points
      // For simplicity, we'll just skip new points
      return {
        heatmapId,
        maxReached: true,
        message: 'Maximum number of points reached for this heatmap'
      };
    }
    
    // Generate interaction ID
    const interactionId = this._generateId();
    
    // Create interaction record
    const interactionData = {
      interaction_id: interactionId,
      heatmap_id: heatmapId,
      session_id: sessionId,
      user_id: userId,
      type,
      x,
      y,
      value,
      timestamp,
      metadata: JSON.stringify(metadata)
    };
    
    // Insert interaction record
    await this.db.insert(this.options.interactionsTable, interactionData);
    
    // Update heatmap record
    if (this.options.dbType === 'mongodb') {
      await this.db.update(
        this.options.heatmapsTable,
        { heatmap_id: heatmapId },
        {
          last_updated: new Date(),
          $inc: { interaction_count: 1 }
        }
      );
    } else {
      await this.db.query(`
        UPDATE ${this.options.heatmapsTable}
        SET last_updated = $1, interaction_count = interaction_count + 1
        WHERE heatmap_id = $2
      `, [new Date(), heatmapId]);
    }
    
    return {
      interactionId,
      heatmapId,
      sessionId,
      type,
      x,
      y,
      timestamp
    };
  }
  
  /**
   * Add a screenshot for a heatmap
   * @param {string} heatmapId - Heatmap ID
   * @param {Object} data - Screenshot data
   * @returns {Promise<Object>} - Added screenshot
   */
  async addScreenshot(heatmapId, data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      filePath,
      width,
      height,
      fileSize,
      timestamp = new Date()
    } = data;
    
    // Validate required fields
    if (!filePath || !width || !height || !fileSize) {
      throw new Error('File path, width, height, and file size are required');
    }
    
    // Check if heatmap exists
    let heatmap;
    if (this.options.dbType === 'mongodb') {
      heatmap = await this.db.findOne(this.options.heatmapsTable, { heatmap_id: heatmapId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.heatmapsTable}
        WHERE heatmap_id = $1
      `, [heatmapId]);
      
      heatmap = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (!heatmap) {
      throw new Error(`Heatmap not found: ${heatmapId}`);
    }
    
    // Generate screenshot ID
    const screenshotId = this._generateId();
    
    // Create screenshot record
    const screenshotData = {
      screenshot_id: screenshotId,
      heatmap_id: heatmapId,
      timestamp,
      file_path: filePath,
      width,
      height,
      file_size: fileSize
    };
    
    // Insert screenshot record
    await this.db.insert(this.options.screenshotsTable, screenshotData);
    
    return {
      screenshotId,
      heatmapId,
      filePath,
      width,
      height,
      fileSize,
      timestamp
    };
  }
  
  /**
   * Get a heatmap by ID
   * @param {string} heatmapId - Heatmap ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Heatmap with interactions
   */
  async getHeatmap(heatmapId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      includeInteractions = false,
      includeScreenshots = true,
      limit = 1000,
      offset = 0
    } = options;
    
    // Get heatmap record
    let heatmap;
    if (this.options.dbType === 'mongodb') {
      heatmap = await this.db.findOne(this.options.heatmapsTable, { heatmap_id: heatmapId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.heatmapsTable}
        WHERE heatmap_id = $1
      `, [heatmapId]);
      
      heatmap = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (!heatmap) {
      return null;
    }
    
    // Include interactions if requested
    if (includeInteractions) {
      let interactions;
      if (this.options.dbType === 'mongodb') {
        interactions = await this.db.find(
          this.options.interactionsTable,
          { heatmap_id: heatmapId },
          { 
            sort: { timestamp: 1 },
            skip: offset,
            limit: limit
          }
        );
      } else {
        const result = await this.db.query(`
          SELECT * FROM ${this.options.interactionsTable}
          WHERE heatmap_id = $1
          ORDER BY timestamp ASC
          LIMIT $2 OFFSET $3
        `, [heatmapId, limit, offset]);
        
        interactions = result.rows || [];
      }
      
      // Parse metadata
      interactions = interactions.map(interaction => ({
        ...interaction,
        metadata: typeof interaction.metadata === 'string' 
          ? JSON.parse(interaction.metadata) 
          : interaction.metadata
      }));
      
      heatmap.interactions = interactions;
      heatmap.interactionsPagination = {
        offset,
        limit,
        hasMore: interactions.length === limit
      };
    }
    
    // Include screenshots if requested
    if (includeScreenshots) {
      let screenshots;
      if (this.options.dbType === 'mongodb') {
        screenshots = await this.db.find(
          this.options.screenshotsTable,
          { heatmap_id: heatmapId },
          { sort: { timestamp: -1 } }
        );
      } else {
        const result = await this.db.query(`
          SELECT * FROM ${this.options.screenshotsTable}
          WHERE heatmap_id = $1
          ORDER BY timestamp DESC
        `, [heatmapId]);
        
        screenshots = result.rows || [];
      }
      
      heatmap.screenshots = screenshots;
    }
    
    return heatmap;
  }
  
  /**
   * Get heatmaps by URL
   * @param {string} url - URL
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Heatmaps
   */
  async getHeatmapsByUrl(url, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      type = null,
      deviceType = null,
      limit = 10,
      offset = 0
    } = options;
    
    // Build query
    let query = {};
    let params = [];
    let whereClause = 'WHERE url = $1';
    params.push(url);
    
    if (type) {
      if (this.options.dbType === 'mongodb') {
        query.type = type;
      } else {
        whereClause += ' AND type = $' + (params.length + 1);
        params.push(type);
      }
    }
    
    if (deviceType) {
      if (this.options.dbType === 'mongodb') {
        query.device_type = deviceType;
      } else {
        whereClause += ' AND device_type = $' + (params.length + 1);
        params.push(deviceType);
      }
    }
    
    // Get heatmaps
    let heatmaps;
    if (this.options.dbType === 'mongodb') {
      query.url = url;
      
      heatmaps = await this.db.find(
        this.options.heatmapsTable,
        query,
        { 
          sort: { creation_date: -1 },
          skip: offset,
          limit: limit
        }
      );
    } else {
      const sql = `
        SELECT * FROM ${this.options.heatmapsTable}
        ${whereClause}
        ORDER BY creation_date DESC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await this.db.query(sql, params);
      heatmaps = result.rows || [];
    }
    
    return heatmaps;
  }
  
  /**
   * Get all heatmaps
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Heatmaps
   */
  async getHeatmaps(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      type = null,
      deviceType = null,
      limit = 10,
      offset = 0,
      sortBy = 'creation_date',
      sortDirection = 'desc'
    } = options;
    
    // Build query
    let query = {};
    let params = [];
    let whereClause = '';
    
    if (type) {
      if (this.options.dbType === 'mongodb') {
        query.type = type;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'type = $' + (params.length + 1);
        params.push(type);
      }
    }
    
    if (deviceType) {
      if (this.options.dbType === 'mongodb') {
        query.device_type = deviceType;
      } else {
        whereClause += whereClause ? ' AND ' : ' WHERE ';
        whereClause += 'device_type = $' + (params.length + 1);
        params.push(deviceType);
      }
    }
    
    // Get heatmaps
    let heatmaps;
    if (this.options.dbType === 'mongodb') {
      const sort = {};
      sort[sortBy] = sortDirection === 'desc' ? -1 : 1;
      
      heatmaps = await this.db.find(
        this.options.heatmapsTable,
        query,
        { 
          sort,
          skip: offset,
          limit: limit
        }
      );
    } else {
      const sql = `
        SELECT * FROM ${this.options.heatmapsTable}
        ${whereClause}
        ORDER BY ${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `;
      
      params.push(limit, offset);
      
      const result = await this.db.query(sql, params);
      heatmaps = result.rows || [];
    }
    
    return heatmaps;
  }
  
  /**
   * Generate heatmap data for visualization
   * @param {string} heatmapId - Heatmap ID
   * @param {Object} options - Generation options
   * @returns {Promise<Object>} - Heatmap visualization data
   */
  async generateHeatmapData(heatmapId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      resolution = 10, // Grid cell size in pixels
      blur = 15, // Blur radius
      maxOpacity = 0.8, // Maximum opacity
      minOpacity = 0.05, // Minimum opacity
      radius = 25, // Point radius
      gradient = {
        0.4: 'blue',
        0.6: 'cyan',
        0.7: 'lime',
        0.8: 'yellow',
        1.0: 'red'
      }
    } = options;
    
    // Get heatmap
    const heatmap = await this.getHeatmap(heatmapId, { includeInteractions: true });
    if (!heatmap) {
      throw new Error(`Heatmap not found: ${heatmapId}`);
    }
    
    // Get interactions
    const interactions = heatmap.interactions || [];
    
    // Prepare data points
    const points = interactions.map(interaction => ({
      x: interaction.x,
      y: interaction.y,
      value: interaction.value || 1
    }));
    
    // Calculate max value for normalization
    const maxValue = points.reduce((max, point) => Math.max(max, point.value), 0);
    
    // Normalize values
    const normalizedPoints = points.map(point => ({
      ...point,
      value: maxValue > 0 ? point.value / maxValue : point.value
    }));
    
    // Create grid
    const width = heatmap.viewport_width;
    const height = heatmap.viewport_height;
    const gridWidth = Math.ceil(width / resolution);
    const gridHeight = Math.ceil(height / resolution);
    const grid = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
    
    // Populate grid
    for (const point of normalizedPoints) {
      const gridX = Math.floor(point.x / resolution);
      const gridY = Math.floor(point.y / resolution);
      
      if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
        grid[gridY][gridX] += point.value;
      }
    }
    
    // Find max grid value
    let maxGridValue = 0;
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        maxGridValue = Math.max(maxGridValue, grid[y][x]);
      }
    }
    
    // Normalize grid
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        grid[y][x] = maxGridValue > 0 ? grid[y][x] / maxGridValue : grid[y][x];
      }
    }
    
    return {
      heatmapId,
      url: heatmap.url,
      type: heatmap.type,
      width,
      height,
      resolution,
      blur,
      maxOpacity,
      minOpacity,
      radius,
      gradient,
      points: normalizedPoints,
      grid,
      maxValue,
      interactionCount: heatmap.interaction_count
    };
  }
  
  /**
   * Delete a heatmap
   * @param {string} heatmapId - Heatmap ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteHeatmap(heatmapId) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Check if heatmap exists
    let heatmap;
    if (this.options.dbType === 'mongodb') {
      heatmap = await this.db.findOne(this.options.heatmapsTable, { heatmap_id: heatmapId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.heatmapsTable}
        WHERE heatmap_id = $1
      `, [heatmapId]);
      
      heatmap = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (!heatmap) {
      return {
        success: false,
        message: `Heatmap not found: ${heatmapId}`
      };
    }
    
    // Delete screenshots
    if (this.options.dbType === 'mongodb') {
      await this.db.delete(this.options.screenshotsTable, { heatmap_id: heatmapId });
    } else {
      await this.db.query(`
        DELETE FROM ${this.options.screenshotsTable}
        WHERE heatmap_id = $1
      `, [heatmapId]);
    }
    
    // Delete interactions
    if (this.options.dbType === 'mongodb') {
      await this.db.delete(this.options.interactionsTable, { heatmap_id: heatmapId });
    } else {
      await this.db.query(`
        DELETE FROM ${this.options.interactionsTable}
        WHERE heatmap_id = $1
      `, [heatmapId]);
    }
    
    // Delete heatmap
    if (this.options.dbType === 'mongodb') {
      await this.db.delete(this.options.heatmapsTable, { heatmap_id: heatmapId });
    } else {
      await this.db.query(`
        DELETE FROM ${this.options.heatmapsTable}
        WHERE heatmap_id = $1
      `, [heatmapId]);
    }
    
    return {
      success: true,
      heatmapId,
      url: heatmap.url,
      type: heatmap.type
    };
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
   * Close the heatmaps integration module
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

module.exports = HeatmapsIntegration;
