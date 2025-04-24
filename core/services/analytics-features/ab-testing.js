/**
 * A/B Testing Module
 * 
 * This module provides A/B testing functionality for the RadixInsight platform.
 * It allows creating experiments, assigning users to variants, and tracking results.
 */

const { DatabaseFactory } = require('../../database/abstraction');

class ABTesting {
  /**
   * Create a new ABTesting instance
   * @param {Object} options - Configuration options
   */
  constructor(options = {}) {
    this.options = {
      dbType: options.dbType || 'clickhouse',
      dbConfig: options.dbConfig || {},
      experimentsTable: options.experimentsTable || 'ab_experiments',
      variantsTable: options.variantsTable || 'ab_variants',
      assignmentsTable: options.assignmentsTable || 'ab_assignments',
      resultsTable: options.resultsTable || 'ab_results',
      ...options
    };
    
    this.db = null;
    this.initialized = false;
  }
  
  /**
   * Initialize the A/B testing module
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
    // Create experiments table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.experimentsTable} (
        experiment_id String,
        name String,
        description String,
        status String,
        start_date DateTime,
        end_date DateTime,
        traffic_percentage UInt8,
        winning_variant String,
        date Date DEFAULT toDate(start_date)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, experiment_id)
    `);
    
    // Create variants table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.variantsTable} (
        experiment_id String,
        variant_id String,
        name String,
        description String,
        weight UInt8,
        date Date DEFAULT toDate(now())
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, experiment_id, variant_id)
    `);
    
    // Create assignments table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.assignmentsTable} (
        experiment_id String,
        variant_id String,
        user_id String,
        session_id String,
        assignment_date DateTime,
        date Date DEFAULT toDate(assignment_date)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, experiment_id, user_id)
    `);
    
    // Create results table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.resultsTable} (
        experiment_id String,
        variant_id String,
        metric_name String,
        metric_value Float64,
        participants UInt32,
        conversions UInt32,
        conversion_rate Float64,
        p_value Float64,
        is_significant UInt8,
        update_date DateTime,
        date Date DEFAULT toDate(update_date)
      ) ENGINE = MergeTree()
      PARTITION BY toYYYYMM(date)
      ORDER BY (date, experiment_id, variant_id, metric_name)
    `);
  }
  
  /**
   * Ensure PostgreSQL tables exist
   * @private
   * @returns {Promise<void>}
   */
  async _ensurePostgreSQLTables() {
    // Create experiments table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.experimentsTable} (
        experiment_id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'draft',
        start_date TIMESTAMP,
        end_date TIMESTAMP,
        traffic_percentage INTEGER DEFAULT 100,
        winning_variant VARCHAR(36),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create variants table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.variantsTable} (
        variant_id VARCHAR(36) PRIMARY KEY,
        experiment_id VARCHAR(36) NOT NULL,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        weight INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (experiment_id) REFERENCES ${this.options.experimentsTable}(experiment_id) ON DELETE CASCADE
      )
    `);
    
    // Create assignments table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.assignmentsTable} (
        id SERIAL PRIMARY KEY,
        experiment_id VARCHAR(36) NOT NULL,
        variant_id VARCHAR(36) NOT NULL,
        user_id VARCHAR(36),
        session_id VARCHAR(36) NOT NULL,
        assignment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (experiment_id) REFERENCES ${this.options.experimentsTable}(experiment_id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES ${this.options.variantsTable}(variant_id) ON DELETE CASCADE,
        UNIQUE (experiment_id, user_id)
      )
    `);
    
    // Create results table
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS ${this.options.resultsTable} (
        id SERIAL PRIMARY KEY,
        experiment_id VARCHAR(36) NOT NULL,
        variant_id VARCHAR(36) NOT NULL,
        metric_name VARCHAR(50) NOT NULL,
        metric_value FLOAT,
        participants INTEGER DEFAULT 0,
        conversions INTEGER DEFAULT 0,
        conversion_rate FLOAT DEFAULT 0,
        p_value FLOAT,
        is_significant BOOLEAN DEFAULT FALSE,
        update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (experiment_id) REFERENCES ${this.options.experimentsTable}(experiment_id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES ${this.options.variantsTable}(variant_id) ON DELETE CASCADE,
        UNIQUE (experiment_id, variant_id, metric_name)
      )
    `);
    
    // Create indexes
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.assignmentsTable}_experiment_id
      ON ${this.options.assignmentsTable} (experiment_id)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.assignmentsTable}_user_id
      ON ${this.options.assignmentsTable} (user_id)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.assignmentsTable}_session_id
      ON ${this.options.assignmentsTable} (session_id)
    `);
    
    await this.db.query(`
      CREATE INDEX IF NOT EXISTS idx_${this.options.resultsTable}_experiment_id
      ON ${this.options.resultsTable} (experiment_id)
    `);
  }
  
  /**
   * Create a new experiment
   * @param {Object} data - Experiment data
   * @returns {Promise<Object>} - Created experiment
   */
  async createExperiment(data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      name,
      description = '',
      variants = [],
      trafficPercentage = 100,
      status = 'draft'
    } = data;
    
    // Validate required fields
    if (!name) {
      throw new Error('Experiment name is required');
    }
    
    if (!variants || variants.length < 2) {
      throw new Error('At least two variants are required');
    }
    
    // Generate experiment ID
    const experimentId = this._generateId();
    
    // Get current timestamp
    const creationDate = new Date();
    
    // Create experiment record
    const experimentData = {
      experiment_id: experimentId,
      name,
      description,
      status,
      start_date: status === 'active' ? creationDate : null,
      end_date: null,
      traffic_percentage: trafficPercentage,
      winning_variant: null
    };
    
    // Insert experiment record
    await this.db.insert(this.options.experimentsTable, experimentData);
    
    // Create variants
    const createdVariants = [];
    for (const variant of variants) {
      const variantId = this._generateId();
      const variantData = {
        variant_id: variantId,
        experiment_id: experimentId,
        name: variant.name,
        description: variant.description || '',
        weight: variant.weight || 1
      };
      
      await this.db.insert(this.options.variantsTable, variantData);
      
      createdVariants.push({
        variantId,
        name: variant.name,
        description: variant.description || '',
        weight: variant.weight || 1
      });
    }
    
    return {
      experimentId,
      name,
      description,
      status,
      trafficPercentage,
      variants: createdVariants,
      creationDate
    };
  }
  
  /**
   * Update an experiment
   * @param {string} experimentId - Experiment ID
   * @param {Object} data - Updated experiment data
   * @returns {Promise<Object>} - Updated experiment
   */
  async updateExperiment(experimentId, data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Get current experiment
    const experiment = await this.getExperiment(experimentId);
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }
    
    // Check if experiment can be updated
    if (experiment.status === 'completed') {
      throw new Error('Completed experiments cannot be updated');
    }
    
    const {
      name,
      description,
      trafficPercentage,
      status
    } = data;
    
    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (trafficPercentage !== undefined) updateData.traffic_percentage = trafficPercentage;
    
    // Handle status changes
    if (status !== undefined && status !== experiment.status) {
      updateData.status = status;
      
      if (status === 'active' && experiment.status !== 'active') {
        updateData.start_date = new Date();
      } else if (status === 'completed' && experiment.status !== 'completed') {
        updateData.end_date = new Date();
      }
    }
    
    // Update experiment record
    if (Object.keys(updateData).length > 0) {
      if (this.options.dbType === 'mongodb') {
        await this.db.update(
          this.options.experimentsTable,
          { experiment_id: experimentId },
          updateData
        );
      } else {
        const setClauses = [];
        const params = [];
        
        for (const [key, value] of Object.entries(updateData)) {
          setClauses.push(`${key} = $${params.length + 1}`);
          params.push(value);
        }
        
        params.push(experimentId);
        
        await this.db.query(`
          UPDATE ${this.options.experimentsTable}
          SET ${setClauses.join(', ')}
          WHERE experiment_id = $${params.length}
        `, params);
      }
    }
    
    // Get updated experiment
    return await this.getExperiment(experimentId);
  }
  
  /**
   * Get an experiment by ID
   * @param {string} experimentId - Experiment ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Experiment data
   */
  async getExperiment(experimentId, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      includeVariants = true,
      includeResults = false
    } = options;
    
    // Get experiment record
    let experiment;
    if (this.options.dbType === 'mongodb') {
      experiment = await this.db.findOne(this.options.experimentsTable, { experiment_id: experimentId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.experimentsTable}
        WHERE experiment_id = $1
      `, [experimentId]);
      
      experiment = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    }
    
    if (!experiment) {
      return null;
    }
    
    // Include variants if requested
    if (includeVariants) {
      let variants;
      if (this.options.dbType === 'mongodb') {
        variants = await this.db.find(
          this.options.variantsTable,
          { experiment_id: experimentId }
        );
      } else {
        const result = await this.db.query(`
          SELECT * FROM ${this.options.variantsTable}
          WHERE experiment_id = $1
        `, [experimentId]);
        
        variants = result.rows || [];
      }
      
      experiment.variants = variants.map(variant => ({
        variantId: variant.variant_id,
        name: variant.name,
        description: variant.description,
        weight: variant.weight
      }));
    }
    
    // Include results if requested
    if (includeResults) {
      let results;
      if (this.options.dbType === 'mongodb') {
        results = await this.db.find(
          this.options.resultsTable,
          { experiment_id: experimentId }
        );
      } else {
        const result = await this.db.query(`
          SELECT * FROM ${this.options.resultsTable}
          WHERE experiment_id = $1
        `, [experimentId]);
        
        results = result.rows || [];
      }
      
      experiment.results = results;
    }
    
    return experiment;
  }
  
  /**
   * Get all experiments
   * @param {Object} options - Query options
   * @returns {Promise<Array>} - Experiments
   */
  async getExperiments(options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      status = null,
      limit = 100,
      offset = 0,
      sortBy = 'start_date',
      sortDirection = 'desc'
    } = options;
    
    // Build query
    let query = {};
    let params = [];
    let whereClause = '';
    
    if (status) {
      if (this.options.dbType === 'mongodb') {
        query.status = status;
      } else {
        whereClause = 'WHERE status = $1';
        params.push(status);
      }
    }
    
    // Get experiments
    let experiments;
    if (this.options.dbType === 'mongodb') {
      const sort = {};
      sort[sortBy] = sortDirection === 'desc' ? -1 : 1;
      
      experiments = await this.db.find(
        this.options.experimentsTable,
        query,
        { sort, limit, skip: offset }
      );
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.experimentsTable}
        ${whereClause}
        ORDER BY ${sortBy} ${sortDirection === 'desc' ? 'DESC' : 'ASC'}
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `, [...params, limit, offset]);
      
      experiments = result.rows || [];
    }
    
    return experiments;
  }
  
  /**
   * Assign a user to a variant
   * @param {string} experimentId - Experiment ID
   * @param {Object} data - Assignment data
   * @returns {Promise<Object>} - Assignment result
   */
  async assignVariant(experimentId, data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      userId = null,
      sessionId,
      forcedVariantId = null
    } = data;
    
    if (!sessionId) {
      throw new Error('Session ID is required');
    }
    
    // Get experiment
    const experiment = await this.getExperiment(experimentId, { includeVariants: true });
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }
    
    // Check if experiment is active
    if (experiment.status !== 'active') {
      throw new Error(`Experiment is not active: ${experimentId}`);
    }
    
    // Check if user is already assigned
    let existingAssignment = null;
    if (userId) {
      if (this.options.dbType === 'mongodb') {
        existingAssignment = await this.db.findOne(this.options.assignmentsTable, {
          experiment_id: experimentId,
          user_id: userId
        });
      } else {
        const result = await this.db.query(`
          SELECT * FROM ${this.options.assignmentsTable}
          WHERE experiment_id = $1 AND user_id = $2
        `, [experimentId, userId]);
        
        existingAssignment = result.rows && result.rows.length > 0 ? result.rows[0] : null;
      }
    }
    
    // Check if session is already assigned
    if (!existingAssignment) {
      if (this.options.dbType === 'mongodb') {
        existingAssignment = await this.db.findOne(this.options.assignmentsTable, {
          experiment_id: experimentId,
          session_id: sessionId
        });
      } else {
        const result = await this.db.query(`
          SELECT * FROM ${this.options.assignmentsTable}
          WHERE experiment_id = $1 AND session_id = $2
        `, [experimentId, sessionId]);
        
        existingAssignment = result.rows && result.rows.length > 0 ? result.rows[0] : null;
      }
    }
    
    // Return existing assignment if found
    if (existingAssignment) {
      const variant = experiment.variants.find(v => v.variantId === existingAssignment.variant_id);
      
      return {
        experimentId,
        variantId: existingAssignment.variant_id,
        variantName: variant ? variant.name : 'Unknown',
        userId: existingAssignment.user_id,
        sessionId: existingAssignment.session_id,
        isNewAssignment: false
      };
    }
    
    // Apply traffic allocation
    if (experiment.traffic_percentage < 100) {
      const random = Math.random() * 100;
      if (random >= experiment.traffic_percentage) {
        return {
          experimentId,
          variantId: null,
          variantName: null,
          userId,
          sessionId,
          isNewAssignment: false,
          isExcluded: true
        };
      }
    }
    
    // Determine variant
    let variantId;
    if (forcedVariantId) {
      // Use forced variant if specified
      const variant = experiment.variants.find(v => v.variantId === forcedVariantId);
      if (!variant) {
        throw new Error(`Variant not found: ${forcedVariantId}`);
      }
      variantId = forcedVariantId;
    } else {
      // Randomly assign variant based on weights
      const totalWeight = experiment.variants.reduce((sum, variant) => sum + variant.weight, 0);
      const random = Math.random() * totalWeight;
      
      let cumulativeWeight = 0;
      for (const variant of experiment.variants) {
        cumulativeWeight += variant.weight;
        if (random <= cumulativeWeight) {
          variantId = variant.variantId;
          break;
        }
      }
    }
    
    // Create assignment record
    const assignmentData = {
      experiment_id: experimentId,
      variant_id: variantId,
      user_id: userId,
      session_id: sessionId,
      assignment_date: new Date()
    };
    
    await this.db.insert(this.options.assignmentsTable, assignmentData);
    
    const variant = experiment.variants.find(v => v.variantId === variantId);
    
    return {
      experimentId,
      variantId,
      variantName: variant ? variant.name : 'Unknown',
      userId,
      sessionId,
      isNewAssignment: true
    };
  }
  
  /**
   * Track a conversion for an experiment
   * @param {string} experimentId - Experiment ID
   * @param {Object} data - Conversion data
   * @returns {Promise<Object>} - Tracking result
   */
  async trackConversion(experimentId, data) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    const {
      userId = null,
      sessionId,
      metricName = 'conversion',
      metricValue = 1
    } = data;
    
    if (!sessionId && !userId) {
      throw new Error('Either session ID or user ID is required');
    }
    
    // Get assignment
    let assignment;
    if (userId) {
      if (this.options.dbType === 'mongodb') {
        assignment = await this.db.findOne(this.options.assignmentsTable, {
          experiment_id: experimentId,
          user_id: userId
        });
      } else {
        const result = await this.db.query(`
          SELECT * FROM ${this.options.assignmentsTable}
          WHERE experiment_id = $1 AND user_id = $2
        `, [experimentId, userId]);
        
        assignment = result.rows && result.rows.length > 0 ? result.rows[0] : null;
      }
    }
    
    if (!assignment && sessionId) {
      if (this.options.dbType === 'mongodb') {
        assignment = await this.db.findOne(this.options.assignmentsTable, {
          experiment_id: experimentId,
          session_id: sessionId
        });
      } else {
        const result = await this.db.query(`
          SELECT * FROM ${this.options.assignmentsTable}
          WHERE experiment_id = $1 AND session_id = $2
        `, [experimentId, sessionId]);
        
        assignment = result.rows && result.rows.length > 0 ? result.rows[0] : null;
      }
    }
    
    if (!assignment) {
      return {
        success: false,
        message: 'No assignment found for this user/session'
      };
    }
    
    // Track conversion event
    // In a real implementation, this would update the results table
    // and potentially trigger statistical analysis
    
    return {
      success: true,
      experimentId,
      variantId: assignment.variant_id,
      metricName,
      metricValue
    };
  }
  
  /**
   * Calculate experiment results
   * @param {string} experimentId - Experiment ID
   * @returns {Promise<Object>} - Experiment results
   */
  async calculateResults(experimentId) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // Get experiment
    const experiment = await this.getExperiment(experimentId, { includeVariants: true });
    if (!experiment) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }
    
    // Get assignments
    let assignments;
    if (this.options.dbType === 'mongodb') {
      assignments = await this.db.find(this.options.assignmentsTable, { experiment_id: experimentId });
    } else {
      const result = await this.db.query(`
        SELECT * FROM ${this.options.assignmentsTable}
        WHERE experiment_id = $1
      `, [experimentId]);
      
      assignments = result.rows || [];
    }
    
    // Group assignments by variant
    const variantAssignments = {};
    for (const variant of experiment.variants) {
      variantAssignments[variant.variantId] = {
        variantId: variant.variantId,
        variantName: variant.name,
        participants: 0,
        conversions: 0
      };
    }
    
    for (const assignment of assignments) {
      if (variantAssignments[assignment.variant_id]) {
        variantAssignments[assignment.variant_id].participants++;
      }
    }
    
    // Get conversions (simplified implementation)
    // In a real implementation, this would query the events table
    // to count actual conversions for each variant
    
    // Calculate conversion rates and statistical significance
    const results = [];
    let bestVariantId = null;
    let bestConversionRate = 0;
    
    for (const variantId in variantAssignments) {
      const variant = variantAssignments[variantId];
      
      // Simulate conversions (in a real implementation, these would be actual counts)
      variant.conversions = Math.floor(variant.participants * (0.1 + Math.random() * 0.2));
      variant.conversionRate = variant.participants > 0 ? variant.conversions / variant.participants : 0;
      
      // Track best variant
      if (variant.conversionRate > bestConversionRate) {
        bestConversionRate = variant.conversionRate;
        bestVariantId = variantId;
      }
      
      // Calculate p-value (simplified)
      variant.pValue = 0.05 + Math.random() * 0.2;
      variant.isSignificant = variant.pValue < 0.05;
      
      // Store results
      const resultData = {
        experiment_id: experimentId,
        variant_id: variantId,
        metric_name: 'conversion',
        metric_value: variant.conversionRate,
        participants: variant.participants,
        conversions: variant.conversions,
        conversion_rate: variant.conversionRate,
        p_value: variant.pValue,
        is_significant: variant.isSignificant ? 1 : 0,
        update_date: new Date()
      };
      
      // Check if results already exist
      let existingResult;
      if (this.options.dbType === 'mongodb') {
        existingResult = await this.db.findOne(this.options.resultsTable, {
          experiment_id: experimentId,
          variant_id: variantId,
          metric_name: 'conversion'
        });
      } else {
        const result = await this.db.query(`
          SELECT * FROM ${this.options.resultsTable}
          WHERE experiment_id = $1 AND variant_id = $2 AND metric_name = $3
        `, [experimentId, variantId, 'conversion']);
        
        existingResult = result.rows && result.rows.length > 0 ? result.rows[0] : null;
      }
      
      if (existingResult) {
        // Update existing results
        if (this.options.dbType === 'mongodb') {
          await this.db.update(
            this.options.resultsTable,
            {
              experiment_id: experimentId,
              variant_id: variantId,
              metric_name: 'conversion'
            },
            resultData
          );
        } else {
          await this.db.query(`
            UPDATE ${this.options.resultsTable}
            SET metric_value = $1, participants = $2, conversions = $3, 
                conversion_rate = $4, p_value = $5, is_significant = $6, update_date = $7
            WHERE experiment_id = $8 AND variant_id = $9 AND metric_name = $10
          `, [
            variant.conversionRate,
            variant.participants,
            variant.conversions,
            variant.conversionRate,
            variant.pValue,
            variant.isSignificant ? 1 : 0,
            new Date(),
            experimentId,
            variantId,
            'conversion'
          ]);
        }
      } else {
        // Insert new results
        await this.db.insert(this.options.resultsTable, resultData);
      }
      
      results.push({
        variantId,
        variantName: variant.variantName,
        participants: variant.participants,
        conversions: variant.conversions,
        conversionRate: variant.conversionRate,
        pValue: variant.pValue,
        isSignificant: variant.isSignificant
      });
    }
    
    // Update experiment with winning variant if significant
    const significantVariants = results.filter(r => r.isSignificant);
    if (significantVariants.length > 0) {
      // Find variant with highest conversion rate among significant variants
      const winningVariant = significantVariants.reduce((best, current) => {
        return current.conversionRate > best.conversionRate ? current : best;
      }, significantVariants[0]);
      
      // Update experiment
      if (this.options.dbType === 'mongodb') {
        await this.db.update(
          this.options.experimentsTable,
          { experiment_id: experimentId },
          { winning_variant: winningVariant.variantId }
        );
      } else {
        await this.db.query(`
          UPDATE ${this.options.experimentsTable}
          SET winning_variant = $1
          WHERE experiment_id = $2
        `, [winningVariant.variantId, experimentId]);
      }
      
      experiment.winning_variant = winningVariant.variantId;
    }
    
    return {
      experimentId,
      name: experiment.name,
      status: experiment.status,
      startDate: experiment.start_date,
      endDate: experiment.end_date,
      winningVariant: experiment.winning_variant,
      results
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
   * Close the A/B testing module
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

module.exports = ABTesting;
