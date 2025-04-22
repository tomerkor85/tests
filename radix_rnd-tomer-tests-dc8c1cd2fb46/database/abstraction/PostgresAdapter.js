/**
 * PostgresAdapter - PostgreSQL implementation of DatabaseInterface
 * 
 * This adapter implements the DatabaseInterface for PostgreSQL databases.
 */
const { Pool } = require('pg');
const DatabaseInterface = require('./DatabaseInterface');

class PostgresAdapter extends DatabaseInterface {
  /**
   * Create a new PostgresAdapter instance
   * @param {Object} config - PostgreSQL configuration
   */
  constructor(config) {
    super();
    this.config = config;
    this.pool = null;
  }

  /**
   * Initialize the PostgreSQL connection pool
   * @returns {Promise<void>}
   */
  async initialize() {
    this.pool = new Pool(this.config);
    
    // Test connection
    const client = await this.pool.connect();
    try {
      await client.query('SELECT NOW()');
      console.log('PostgreSQL connection established successfully');
    } finally {
      client.release();
    }
  }

  /**
   * Close the PostgreSQL connection pool
   * @returns {Promise<void>}
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Execute a query on the PostgreSQL database
   * @param {string} query - The SQL query to execute
   * @param {Array} params - The parameters for the query
   * @returns {Promise<any>} - The query result
   */
  async query(query, params = []) {
    if (!this.pool) {
      throw new Error('PostgreSQL connection not initialized');
    }
    
    const result = await this.pool.query(query, params);
    return result;
  }

  /**
   * Insert a record into the PostgreSQL database
   * @param {string} table - The table name
   * @param {Object|Array} data - The data to insert
   * @returns {Promise<any>} - The insert result
   */
  async insert(table, data) {
    if (!this.pool) {
      throw new Error('PostgreSQL connection not initialized');
    }
    
    // Handle single object or array of objects
    const dataArray = Array.isArray(data) ? data : [data];
    if (dataArray.length === 0) {
      return { rows: [] };
    }
    
    // Get column names from the first object
    const columns = Object.keys(dataArray[0]);
    if (columns.length === 0) {
      throw new Error('No columns specified for insert');
    }
    
    // For a single record
    if (dataArray.length === 1) {
      const values = columns.map(col => dataArray[0][col]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      
      const query = `
        INSERT INTO ${table} (${columns.join(', ')})
        VALUES (${placeholders})
        RETURNING *
      `;
      
      return await this.pool.query(query, values);
    }
    
    // For multiple records, use a transaction
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      
      const results = [];
      for (const record of dataArray) {
        const values = columns.map(col => record[col]);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        const query = `
          INSERT INTO ${table} (${columns.join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
        
        const result = await client.query(query, values);
        results.push(...result.rows);
      }
      
      await client.query('COMMIT');
      return { rows: results };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find records in the PostgreSQL database
   * @param {string} table - The table name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options (projection, sort, limit, etc.)
   * @returns {Promise<Array>} - The found records
   */
  async find(table, filter = {}, options = {}) {
    if (!this.pool) {
      throw new Error('PostgreSQL connection not initialized');
    }
    
    // Build WHERE clause
    const conditions = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(filter)) {
      conditions.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    // Build query
    let query = `SELECT * FROM ${table}`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    // Add ORDER BY if specified
    if (options.sort) {
      const sortFields = [];
      for (const [field, order] of Object.entries(options.sort)) {
        sortFields.push(`${field} ${order === 1 ? 'ASC' : 'DESC'}`);
      }
      if (sortFields.length > 0) {
        query += ` ORDER BY ${sortFields.join(', ')}`;
      }
    }
    
    // Add LIMIT if specified
    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }
    
    // Add OFFSET if specified
    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }
    
    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Find a single record in the PostgreSQL database
   * @param {string} table - The table name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options (projection, sort, etc.)
   * @returns {Promise<Object|null>} - The found record or null
   */
  async findOne(table, filter = {}, options = {}) {
    // Use find with limit 1
    options.limit = 1;
    const results = await this.find(table, filter, options);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Update records in the PostgreSQL database
   * @param {string} table - The table name
   * @param {Object} filter - The filter criteria
   * @param {Object} update - The update operations
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - The update result
   */
  async update(table, filter = {}, update = {}, options = {}) {
    if (!this.pool) {
      throw new Error('PostgreSQL connection not initialized');
    }
    
    // Build SET clause
    const setValues = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(update)) {
      setValues.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    if (setValues.length === 0) {
      throw new Error('No update values specified');
    }
    
    // Build WHERE clause
    const conditions = [];
    for (const [key, value] of Object.entries(filter)) {
      conditions.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    // Build query
    let query = `UPDATE ${table} SET ${setValues.join(', ')}`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' RETURNING *';
    
    const result = await this.pool.query(query, values);
    return {
      rowCount: result.rowCount,
      rows: result.rows
    };
  }

  /**
   * Delete records from the PostgreSQL database
   * @param {string} table - The table name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - The delete result
   */
  async delete(table, filter = {}, options = {}) {
    if (!this.pool) {
      throw new Error('PostgreSQL connection not initialized');
    }
    
    // Build WHERE clause
    const conditions = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(filter)) {
      conditions.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    // Build query
    let query = `DELETE FROM ${table}`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ' RETURNING *';
    
    const result = await this.pool.query(query, values);
    return {
      rowCount: result.rowCount,
      rows: result.rows
    };
  }

  /**
   * Count records in the PostgreSQL database
   * @param {string} table - The table name
   * @param {Object} filter - The filter criteria
   * @returns {Promise<number>} - The count result
   */
  async count(table, filter = {}) {
    if (!this.pool) {
      throw new Error('PostgreSQL connection not initialized');
    }
    
    // Build WHERE clause
    const conditions = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(filter)) {
      conditions.push(`${key} = $${paramIndex}`);
      values.push(value);
      paramIndex++;
    }
    
    // Build query
    let query = `SELECT COUNT(*) FROM ${table}`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const result = await this.pool.query(query, values);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Perform aggregation operations in PostgreSQL
   * @param {string} table - The table name
   * @param {Object} options - The aggregation options
   * @returns {Promise<Array>} - The aggregation result
   */
  async aggregate(table, options = {}) {
    if (!this.pool) {
      throw new Error('PostgreSQL connection not initialized');
    }
    
    // Build SELECT clause
    let selectClause = '*';
    if (options.select) {
      selectClause = options.select.join(', ');
    }
    
    // Build GROUP BY clause
    let groupByClause = '';
    if (options.groupBy) {
      groupByClause = `GROUP BY ${options.groupBy.join(', ')}`;
    }
    
    // Build WHERE clause
    const conditions = [];
    const values = [];
    let paramIndex = 1;
    
    if (options.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        conditions.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    // Build HAVING clause
    let havingClause = '';
    if (options.having) {
      const havingConditions = [];
      for (const [key, value] of Object.entries(options.having)) {
        havingConditions.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
      if (havingConditions.length > 0) {
        havingClause = `HAVING ${havingConditions.join(' AND ')}`;
      }
    }
    
    // Build ORDER BY clause
    let orderByClause = '';
    if (options.sort) {
      const sortFields = [];
      for (const [field, order] of Object.entries(options.sort)) {
        sortFields.push(`${field} ${order === 1 ? 'ASC' : 'DESC'}`);
      }
      if (sortFields.length > 0) {
        orderByClause = `ORDER BY ${sortFields.join(', ')}`;
      }
    }
    
    // Build LIMIT and OFFSET clauses
    let limitClause = '';
    if (options.limit) {
      limitClause = `LIMIT ${options.limit}`;
    }
    
    let offsetClause = '';
    if (options.offset) {
      offsetClause = `OFFSET ${options.offset}`;
    }
    
    // Build query
    let query = `SELECT ${selectClause} FROM ${table}`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    query += ` ${groupByClause} ${havingClause} ${orderByClause} ${limitClause} ${offsetClause}`.trim();
    
    const result = await this.pool.query(query, values);
    return result.rows;
  }

  /**
   * Begin a transaction in PostgreSQL
   * @returns {Promise<any>} - The transaction client
   */
  async beginTransaction() {
    if (!this.pool) {
      throw new Error('PostgreSQL connection not initialized');
    }
    
    const client = await this.pool.connect();
    await client.query('BEGIN');
    return client;
  }

  /**
   * Commit a transaction in PostgreSQL
   * @param {any} client - The transaction client
   * @returns {Promise<void>}
   */
  async commitTransaction(client) {
    if (!client) {
      throw new Error('Transaction client is required');
    }
    
    try {
      await client.query('COMMIT');
    } finally {
      client.release();
    }
  }

  /**
   * Rollback a transaction in PostgreSQL
   * @param {any} client - The transaction client
   * @returns {Promise<void>}
   */
  async rollbackTransaction(client) {
    if (!client) {
      throw new Error('Transaction client is required');
    }
    
    try {
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
}

module.exports = PostgresAdapter;
