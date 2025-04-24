/**
 * MongoAdapter - MongoDB implementation of DatabaseInterface
 * 
 * This adapter implements the DatabaseInterface for MongoDB databases.
 */
const { MongoClient, ObjectId } = require('mongodb');
const DatabaseInterface = require('./DatabaseInterface');

class MongoAdapter extends DatabaseInterface {
  /**
   * Create a new MongoAdapter instance
   * @param {Object} config - MongoDB configuration
   */
  constructor(config) {
    super();
    this.config = config;
    this.client = null;
    this.db = null;
  }

  /**
   * Initialize the MongoDB connection
   * @returns {Promise<void>}
   */
  async initialize() {
    const { uri, dbName, options = {} } = this.config;
    
    if (!uri) {
      throw new Error('MongoDB URI is required');
    }
    
    if (!dbName) {
      throw new Error('MongoDB database name is required');
    }
    
    try {
      this.client = new MongoClient(uri, options);
      await this.client.connect();
      this.db = this.client.db(dbName);
      console.log('MongoDB connection established successfully');
    } catch (error) {
      console.error('MongoDB connection failed:', error);
      throw error;
    }
  }

  /**
   * Close the MongoDB connection
   * @returns {Promise<void>}
   */
  async close() {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }

  /**
   * Execute a query on the MongoDB database
   * @param {string} collection - The collection name
   * @param {Object} query - The query to execute
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - The query result
   */
  async query(collection, query, options = {}) {
    if (!this.db) {
      throw new Error('MongoDB connection not initialized');
    }
    
    const coll = this.db.collection(collection);
    
    // Handle different query types
    if (query.find) {
      return await coll.find(query.find, options).toArray();
    } else if (query.findOne) {
      return await coll.findOne(query.findOne, options);
    } else if (query.aggregate) {
      return await coll.aggregate(query.aggregate, options).toArray();
    } else if (query.count) {
      return await coll.countDocuments(query.count, options);
    } else if (query.distinct) {
      return await coll.distinct(query.distinct.field, query.distinct.filter, options);
    } else {
      throw new Error('Unsupported query type');
    }
  }

  /**
   * Insert a document/record into the MongoDB database
   * @param {string} collection - The collection name
   * @param {Object|Array} data - The data to insert
   * @returns {Promise<any>} - The insert result
   */
  async insert(collection, data) {
    if (!this.db) {
      throw new Error('MongoDB connection not initialized');
    }
    
    const coll = this.db.collection(collection);
    
    // Handle single object or array of objects
    if (Array.isArray(data)) {
      if (data.length === 0) {
        return { insertedCount: 0, insertedIds: [] };
      }
      
      const result = await coll.insertMany(data);
      return {
        insertedCount: result.insertedCount,
        insertedIds: result.insertedIds
      };
    } else {
      const result = await coll.insertOne(data);
      return {
        insertedCount: 1,
        insertedId: result.insertedId
      };
    }
  }

  /**
   * Find documents/records in the MongoDB database
   * @param {string} collection - The collection name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options (projection, sort, limit, etc.)
   * @returns {Promise<Array>} - The found documents/records
   */
  async find(collection, filter = {}, options = {}) {
    if (!this.db) {
      throw new Error('MongoDB connection not initialized');
    }
    
    const coll = this.db.collection(collection);
    
    // Process options
    const findOptions = {};
    
    if (options.projection) {
      findOptions.projection = options.projection;
    }
    
    if (options.sort) {
      findOptions.sort = options.sort;
    }
    
    if (options.limit) {
      findOptions.limit = options.limit;
    }
    
    if (options.skip || options.offset) {
      findOptions.skip = options.skip || options.offset;
    }
    
    // Convert string IDs to ObjectId if needed
    const processedFilter = this._processFilter(filter);
    
    const cursor = coll.find(processedFilter, findOptions);
    return await cursor.toArray();
  }

  /**
   * Find a single document/record in the MongoDB database
   * @param {string} collection - The collection name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options (projection, sort, etc.)
   * @returns {Promise<Object|null>} - The found document/record or null
   */
  async findOne(collection, filter = {}, options = {}) {
    if (!this.db) {
      throw new Error('MongoDB connection not initialized');
    }
    
    const coll = this.db.collection(collection);
    
    // Process options
    const findOptions = {};
    
    if (options.projection) {
      findOptions.projection = options.projection;
    }
    
    if (options.sort) {
      findOptions.sort = options.sort;
    }
    
    // Convert string IDs to ObjectId if needed
    const processedFilter = this._processFilter(filter);
    
    return await coll.findOne(processedFilter, findOptions);
  }

  /**
   * Update documents/records in the MongoDB database
   * @param {string} collection - The collection name
   * @param {Object} filter - The filter criteria
   * @param {Object} update - The update operations
   * @param {Object} options - Additional options (upsert, multi, etc.)
   * @returns {Promise<any>} - The update result
   */
  async update(collection, filter = {}, update = {}, options = {}) {
    if (!this.db) {
      throw new Error('MongoDB connection not initialized');
    }
    
    const coll = this.db.collection(collection);
    
    // Process options
    const updateOptions = {
      upsert: options.upsert || false
    };
    
    // Convert string IDs to ObjectId if needed
    const processedFilter = this._processFilter(filter);
    
    // Ensure update has proper operators
    let processedUpdate = update;
    if (!update.$set && !update.$unset && !update.$inc && !update.$push && !update.$pull) {
      processedUpdate = { $set: update };
    }
    
    // Perform update
    if (options.multi === true) {
      const result = await coll.updateMany(processedFilter, processedUpdate, updateOptions);
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        upsertedId: result.upsertedId
      };
    } else {
      const result = await coll.updateOne(processedFilter, processedUpdate, updateOptions);
      return {
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        upsertedCount: result.upsertedCount,
        upsertedId: result.upsertedId
      };
    }
  }

  /**
   * Delete documents/records from the MongoDB database
   * @param {string} collection - The collection name
   * @param {Object} filter - The filter criteria
   * @param {Object} options - Additional options
   * @returns {Promise<any>} - The delete result
   */
  async delete(collection, filter = {}, options = {}) {
    if (!this.db) {
      throw new Error('MongoDB connection not initialized');
    }
    
    const coll = this.db.collection(collection);
    
    // Convert string IDs to ObjectId if needed
    const processedFilter = this._processFilter(filter);
    
    // Perform delete
    if (options.multi === true) {
      const result = await coll.deleteMany(processedFilter);
      return {
        deletedCount: result.deletedCount
      };
    } else {
      const result = await coll.deleteOne(processedFilter);
      return {
        deletedCount: result.deletedCount
      };
    }
  }

  /**
   * Count documents/records in the MongoDB database
   * @param {string} collection - The collection name
   * @param {Object} filter - The filter criteria
   * @returns {Promise<number>} - The count result
   */
  async count(collection, filter = {}) {
    if (!this.db) {
      throw new Error('MongoDB connection not initialized');
    }
    
    const coll = this.db.collection(collection);
    
    // Convert string IDs to ObjectId if needed
    const processedFilter = this._processFilter(filter);
    
    return await coll.countDocuments(processedFilter);
  }

  /**
   * Perform aggregation operations in MongoDB
   * @param {string} collection - The collection name
   * @param {Array} pipeline - The aggregation pipeline
   * @returns {Promise<Array>} - The aggregation result
   */
  async aggregate(collection, pipeline) {
    if (!this.db) {
      throw new Error('MongoDB connection not initialized');
    }
    
    const coll = this.db.collection(collection);
    
    // Process pipeline stages to handle ObjectId conversions
    const processedPipeline = pipeline.map(stage => {
      if (stage.$match) {
        return { $match: this._processFilter(stage.$match) };
      }
      return stage;
    });
    
    const cursor = coll.aggregate(processedPipeline);
    return await cursor.toArray();
  }

  /**
   * Begin a transaction in MongoDB
   * @returns {Promise<any>} - The session object
   */
  async beginTransaction() {
    if (!this.client) {
      throw new Error('MongoDB connection not initialized');
    }
    
    const session = this.client.startSession();
    session.startTransaction();
    return session;
  }

  /**
   * Commit a transaction in MongoDB
   * @param {any} session - The session object
   * @returns {Promise<void>}
   */
  async commitTransaction(session) {
    if (!session) {
      throw new Error('Session is required');
    }
    
    await session.commitTransaction();
    session.endSession();
  }

  /**
   * Rollback a transaction in MongoDB
   * @param {any} session - The session object
   * @returns {Promise<void>}
   */
  async rollbackTransaction(session) {
    if (!session) {
      throw new Error('Session is required');
    }
    
    await session.abortTransaction();
    session.endSession();
  }

  /**
   * Process filter to convert string IDs to ObjectId
   * @param {Object} filter - The filter to process
   * @returns {Object} - The processed filter
   * @private
   */
  _processFilter(filter) {
    if (!filter || typeof filter !== 'object') {
      return filter;
    }
    
    const result = {};
    
    for (const [key, value] of Object.entries(filter)) {
      // Handle _id specifically
      if (key === '_id' && typeof value === 'string' && ObjectId.isValid(value)) {
        result[key] = new ObjectId(value);
      } else if (key === '_id' && typeof value === 'object' && !Array.isArray(value)) {
        // Handle operators on _id
        const processedOps = {};
        for (const [op, val] of Object.entries(value)) {
          if (typeof val === 'string' && ObjectId.isValid(val)) {
            processedOps[op] = new ObjectId(val);
          } else if (Array.isArray(val)) {
            processedOps[op] = val.map(v => 
              typeof v === 'string' && ObjectId.isValid(v) ? new ObjectId(v) : v
            );
          } else {
            processedOps[op] = val;
          }
        }
        result[key] = processedOps;
      } else if (Array.isArray(value)) {
        result[key] = value;
      } else if (value !== null && typeof value === 'object') {
        result[key] = this._processFilter(value);
      } else {
        result[key] = value;
      }
    }
    
    return result;
  }
}

module.exports = MongoAdapter;
