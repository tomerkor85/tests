/**
 * DatabaseFactory - Factory for creating database instances
 * 
 * This factory creates and returns database adapter instances based on configuration.
 * It serves as the central point for database adapter instantiation.
 */
class DatabaseFactory {
  /**
   * Create a database adapter instance
   * @param {string} type - The type of database ('postgres', 'clickhouse', 'mongodb')
   * @param {Object} config - The database configuration
   * @returns {Object} - The database adapter instance
   */
  static createDatabase(type, config) {
    switch (type.toLowerCase()) {
      case 'postgres':
      case 'postgresql':
        const PostgresAdapter = require('./PostgresAdapter');
        return new PostgresAdapter(config);
      
      case 'clickhouse':
        const ClickHouseAdapter = require('./ClickHouseAdapter');
        return new ClickHouseAdapter(config);
      
      case 'mongodb':
      case 'mongo':
        const MongoAdapter = require('./MongoAdapter');
        return new MongoAdapter(config);
      
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }
}

module.exports = DatabaseFactory;
