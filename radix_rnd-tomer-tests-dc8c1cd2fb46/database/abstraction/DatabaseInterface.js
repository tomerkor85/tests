/**
 * DatabaseInterface - Abstract interface for database operations
 * 
 * This interface defines the standard methods that all database adapters must implement.
 * It serves as a contract for database operations across different database systems.
 */
class DatabaseInterface {
  /**
   * Initialize the database connection
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('Method not implemented: initialize()');
  }

  /**
   * Close the database connection
   * @returns {Promise<void>}
   */
  async close() {
    throw new Error('Method not implemented: close()');
  }

  /**
   * Execute a query on the database
   * @param {string} query - The query to execute
   * @param {Array} params - The parameters for the query
   * @returns {Promise<any>} - The query result
   */
  async query(query, params) {
    throw new Error('Method not implemented: query()');
  }

  /**
   * Insert a document/record into the database
   * @param {string} collection - The collection/table name
   * @param {Object|Array} data - The data to insert
   * @returns {Promise<any>} - The insert result
   */
  async insert(collection, data) {
    throw new Error('Method not implemented: insert()');
  }

  /**
   * Find documents/records in the database
   * @param {string} collection - The collection/table name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options (projection, sort, limit, etc.)
   * @returns {Promise<Array>} - The found documents/records
   */
  async find(collection, filter, options = {}) {
    throw new Error('Method not implemented: find()');
  }

  /**
   * Find a single document/record in the database
   * @param {string} collection - The collection/table name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options (projection, sort, etc.)
   * @returns {Promise<Object|null>} - The found document/record or null
   */
  async findOne(collection, filter, options = {}) {
    throw new Error('Method not implemented: findOne()');
  }

  /**
   * Update documents/records in the database
   * @param {string} collection - The collection/table name
   * @param {Object} filter - The filter criteria
   * @param {Object} update - The update operations
   * @param {Object} options - Additional options (upsert, multi, etc.)
   * @returns {Promise<any>} - The update result
   */
  async update(collection, filter, update, options = {}) {
    throw new Error('Method not implemented: update()');
  }

  /**
   * Delete documents/records from the database
   * @param {string} collection - The collection/table name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - The delete result
   */
  async delete(collection, filter, options = {}) {
    throw new Error('Method not implemented: delete()');
  }

  /**
   * Count documents/records in the database
   * @param {string} collection - The collection/table name
   * @param {Object} filter - The filter criteria
   * @returns {Promise<number>} - The count result
   */
  async count(collection, filter = {}) {
    throw new Error('Method not implemented: count()');
  }

  /**
   * Perform aggregation operations
   * @param {string} collection - The collection/table name
   * @param {Array|Object} pipeline - The aggregation pipeline or options
   * @returns {Promise<Array>} - The aggregation result
   */
  async aggregate(collection, pipeline) {
    throw new Error('Method not implemented: aggregate()');
  }

  /**
   * Begin a transaction
   * @returns {Promise<any>} - The transaction object
   */
  async beginTransaction() {
    throw new Error('Method not implemented: beginTransaction()');
  }

  /**
   * Commit a transaction
   * @param {any} transaction - The transaction to commit
   * @returns {Promise<void>}
   */
  async commitTransaction(transaction) {
    throw new Error('Method not implemented: commitTransaction()');
  }

  /**
   * Rollback a transaction
   * @param {any} transaction - The transaction to rollback
   * @returns {Promise<void>}
   */
  async rollbackTransaction(transaction) {
    throw new Error('Method not implemented: rollbackTransaction()');
  }
}

module.exports = DatabaseInterface;
