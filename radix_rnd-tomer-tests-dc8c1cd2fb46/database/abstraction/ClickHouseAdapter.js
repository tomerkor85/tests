/**
 * ClickHouseAdapter - ClickHouse implementation of DatabaseInterface
 * 
 * This adapter implements the DatabaseInterface for ClickHouse databases.
 */
const { ClickHouse } = require('clickhouse');
const DatabaseInterface = require('./DatabaseInterface');

class ClickHouseAdapter extends DatabaseInterface {
  /**
   * Create a new ClickHouseAdapter instance
   * @param {Object} config - ClickHouse configuration
   */
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
  }

  /**
   * Initialize the ClickHouse connection
   * @returns {Promise<void>}
   */
  async initialize() {
    this.client = new ClickHouse(this.config);
    
    // Test connection
    try {
      await this.client.query('SELECT 1').toPromise();
      console.log('ClickHouse connection established successfully');
    } catch (error) {
      console.error('ClickHouse connection failed:', error);
      throw error;
    }
  }

  /**
   * Close the ClickHouse connection
   * @returns {Promise<void>}
   */
  async close() {
    // ClickHouse client doesn't have a close method
    this.client = null;
  }

  /**
   * Execute a query on the ClickHouse database
   * @param {string} query - The SQL query to execute
   * @param {Array|Object} params - The parameters for the query
   * @returns {Promise<any>} - The query result
   */
  async query(query, params = {}) {
    if (!this.client) {
      throw new Error('ClickHouse connection not initialized');
    }
    
    // Handle parameter substitution if needed
    let processedQuery = query;
    if (params && typeof params === 'object' && !Array.isArray(params)) {
      for (const [key, value] of Object.entries(params)) {
        const placeholder = `:${key}`;
        let replacementValue;
        
        if (typeof value === 'string') {
          replacementValue = `'${value.replace(/'/g, "''")}'`;
        } else if (value === null) {
          replacementValue = 'NULL';
        } else if (Array.isArray(value)) {
          replacementValue = `[${value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ')}]`;
        } else if (typeof value === 'object' && value !== null) {
          replacementValue = `'${JSON.stringify(value).replace(/'/g, "''")}'`;
        } else {
          replacementValue = value;
        }
        
        processedQuery = processedQuery.replace(new RegExp(placeholder, 'g'), replacementValue);
      }
    }
    
    const result = await this.client.query(processedQuery).toPromise();
    return result;
  }

  /**
   * Insert a document/record into the ClickHouse database
   * @param {string} table - The table name
   * @param {Object|Array} data - The data to insert
   * @returns {Promise<any>} - The insert result
   */
  async insert(table, data) {
    if (!this.client) {
      throw new Error('ClickHouse connection not initialized');
    }
    
    // Handle single object or array of objects
    const dataArray = Array.isArray(data) ? data : [data];
    if (dataArray.length === 0) {
      return { rows: [] };
    }
    
    try {
      await this.client.insert(table, dataArray).toPromise();
      return { 
        success: true, 
        count: dataArray.length 
      };
    } catch (error) {
      console.error(`Error inserting into ${table}:`, error);
      throw error;
    }
  }

  /**
   * Find documents/records in the ClickHouse database
   * @param {string} table - The table name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options (projection, sort, limit, etc.)
   * @returns {Promise<Array>} - The found documents/records
   */
  async find(table, filter = {}, options = {}) {
    if (!this.client) {
      throw new Error('ClickHouse connection not initialized');
    }
    
    // Build SELECT clause
    let selectClause = '*';
    if (options.select) {
      selectClause = Array.isArray(options.select) ? options.select.join(', ') : options.select;
    }
    
    // Build WHERE clause
    const conditions = [];
    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        const values = value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
        conditions.push(`${key} IN (${values})`);
      } else if (typeof value === 'object') {
        // Handle operators like $gt, $lt, etc.
        for (const [op, val] of Object.entries(value)) {
          switch (op) {
            case '$gt':
              conditions.push(`${key} > ${typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val}`);
              break;
            case '$gte':
              conditions.push(`${key} >= ${typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val}`);
              break;
            case '$lt':
              conditions.push(`${key} < ${typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val}`);
              break;
            case '$lte':
              conditions.push(`${key} <= ${typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val}`);
              break;
            case '$ne':
              conditions.push(`${key} != ${typeof val === 'string' ? `'${val.replace(/'/g, "''")}'` : val}`);
              break;
            case '$like':
              conditions.push(`${key} LIKE '${val.replace(/'/g, "''")}'`);
              break;
            default:
              // Ignore unknown operators
              break;
          }
        }
      } else {
        conditions.push(`${key} = ${typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value}`);
      }
    }
    
    // Build query
    let query = `SELECT ${selectClause} FROM ${table}`;
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
    
    const result = await this.client.query(query).toPromise();
    return result;
  }

  /**
   * Find a single document/record in the ClickHouse database
   * @param {string} table - The table name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options (projection, sort, etc.)
   * @returns {Promise<Object|null>} - The found document/record or null
   */
  async findOne(table, filter = {}, options = {}) {
    // Use find with limit 1
    options.limit = 1;
    const results = await this.find(table, filter, options);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Update documents/records in the ClickHouse database
   * @param {string} table - The table name
   * @param {Object} filter - The filter criteria
   * @param {Object} update - The update operations
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - The update result
   */
  async update(table, filter = {}, update = {}, options = {}) {
    if (!this.client) {
      throw new Error('ClickHouse connection not initialized');
    }
    
    // ClickHouse doesn't support UPDATE directly, need to use ALTER TABLE
    // This is a simplified implementation and may not work for all cases
    
    // Build SET clause
    const setValues = [];
    for (const [key, value] of Object.entries(update)) {
      setValues.push(`${key} = ${typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value}`);
    }
    
    if (setValues.length === 0) {
      throw new Error('No update values specified');
    }
    
    // Build WHERE clause
    const conditions = [];
    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        const values = value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
        conditions.push(`${key} IN (${values})`);
      } else {
        conditions.push(`${key} = ${typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value}`);
      }
    }
    
    // ClickHouse doesn't support traditional UPDATE
    // For MergeTree tables, you typically need to insert new data and then potentially delete old data
    // This is a simplified approach that may not work for all cases
    
    // First, get the records that match the filter
    let query = `SELECT * FROM ${table}`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const records = await this.client.query(query).toPromise();
    
    // If no records found, return
    if (records.length === 0) {
      return { rowCount: 0, rows: [] };
    }
    
    // Update the records in memory
    const updatedRecords = records.map(record => {
      const updatedRecord = { ...record };
      for (const [key, value] of Object.entries(update)) {
        updatedRecord[key] = value;
      }
      return updatedRecord;
    });
    
    // For tables that support it, we could use ALTER TABLE ... UPDATE
    // But this is engine-dependent and not universally supported
    // For simplicity, we'll throw an error and recommend using the appropriate approach
    
    throw new Error('Direct updates are not supported in ClickHouse. Consider using INSERT for new data and potentially DELETE for old data, or use a table engine that supports ALTER TABLE ... UPDATE.');
  }

  /**
   * Delete documents/records from the ClickHouse database
   * @param {string} table - The table name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - The delete result
   */
  async delete(table, filter = {}, options = {}) {
    if (!this.client) {
      throw new Error('ClickHouse connection not initialized');
    }
    
    // Build WHERE clause
    const conditions = [];
    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        const values = value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
        conditions.push(`${key} IN (${values})`);
      } else {
        conditions.push(`${key} = ${typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value}`);
      }
    }
    
    // ClickHouse DELETE requires a where clause
    if (conditions.length === 0) {
      throw new Error('DELETE operation requires filter criteria in ClickHouse');
    }
    
    // Build query
    const query = `ALTER TABLE ${table} DELETE WHERE ${conditions.join(' AND ')}`;
    
    try {
      await this.client.query(query).toPromise();
      return { success: true };
    } catch (error) {
      console.error(`Error deleting from ${table}:`, error);
      throw error;
    }
  }

  /**
   * Count documents/records in the ClickHouse database
   * @param {string} table - The table name
   * @param {Object} filter - The filter criteria
   * @returns {Promise<number>} - The count result
   */
  async count(table, filter = {}) {
    if (!this.client) {
      throw new Error('ClickHouse connection not initialized');
    }
    
    // Build WHERE clause
    const conditions = [];
    for (const [key, value] of Object.entries(filter)) {
      if (value === null) {
        conditions.push(`${key} IS NULL`);
      } else if (Array.isArray(value)) {
        const values = value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
        conditions.push(`${key} IN (${values})`);
      } else {
        conditions.push(`${key} = ${typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value}`);
      }
    }
    
    // Build query
    let query = `SELECT COUNT(*) as count FROM ${table}`;
    if (conditions.length > 0) {
      query += ` WHERE ${conditions.join(' AND ')}`;
    }
    
    const result = await this.client.query(query).toPromise();
    return parseInt(result[0].count, 10);
  }

  /**
   * Perform aggregation operations in ClickHouse
   * @param {string} table - The table name
   * @param {Object} options - The aggregation options
   * @returns {Promise<Array>} - The aggregation result
   */
  async aggregate(table, options = {}) {
    if (!this.client) {
      throw new Error('ClickHouse connection not initialized');
    }
    
    // Build SELECT clause
    let selectClause = '*';
    if (options.select) {
      selectClause = Array.isArray(options.select) ? options.select.join(', ') : options.select;
    }
    
    // Build GROUP BY clause
    let groupByClause = '';
    if (options.groupBy) {
      groupByClause = `GROUP BY ${Array.isArray(options.groupBy) ? options.groupBy.join(', ') : options.groupBy}`;
    }
    
    // Build WHERE clause
    const conditions = [];
    if (options.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        if (value === null) {
          conditions.push(`${key} IS NULL`);
        } else if (Array.isArray(value)) {
          const values = value.map(v => typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v).join(', ');
          conditions.push(`${key} IN (${values})`);
        } else {
          conditions.push(`${key} = ${typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value}`);
        }
      }
    }
    
    // Build HAVING clause
    let havingClause = '';
    if (options.having) {
      const havingConditions = [];
      for (const [key, value] of Object.entries(options.having)) {
        havingConditions.push(`${key} = ${typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value}`);
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
    
    const result = await this.client.query(query).toPromise();
    return result;
  }

  /**
   * Begin a transaction in ClickHouse
   * @returns {Promise<any>} - The transaction object
   */
  async beginTransaction() {
    throw new Error('Transactions are not supported in ClickHouse');
  }

  /**
   * Commit a transaction in ClickHouse
   * @param {any} transaction - The transaction to commit
   * @returns {Promise<void>}
   */
  async commitTransaction(transaction) {
    throw new Error('Transactions are not supported in ClickHouse');
  }

  /**
   * Rollback a transaction in ClickHouse
   * @param {any} transaction - The transaction to rollback
   * @returns {Promise<void>}
   */
  async rollbackTransaction(transaction) {
    throw new Error('Transactions are not supported in ClickHouse');
  }
}

module.exports = ClickHouseAdapter;
