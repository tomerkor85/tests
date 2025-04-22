/**
 * Database abstraction layer index file
 * 
 * This file exports all components of the database abstraction layer.
 */

const DatabaseInterface = require('./DatabaseInterface');
const DatabaseFactory = require('./DatabaseFactory');
const PostgresAdapter = require('./PostgresAdapter');
const ClickHouseAdapter = require('./ClickHouseAdapter');
const MongoAdapter = require('./MongoAdapter');

module.exports = {
  DatabaseInterface,
  DatabaseFactory,
  PostgresAdapter,
  ClickHouseAdapter,
  MongoAdapter
};
