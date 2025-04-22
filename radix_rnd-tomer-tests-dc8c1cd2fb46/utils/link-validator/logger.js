/**
 * Link Validator - Logger module
 * 
 * This module provides logging functionality for the link validator.
 */

const fs = require('fs');
const path = require('path');
const util = require('util');

/**
 * Create a logger instance
 * @param {string} logFile - Path to log file
 * @returns {Object} - Logger instance
 */
function createLogger(logFile) {
  // Ensure log directory exists
  const logDir = path.dirname(logFile);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  // Create write stream
  const logStream = fs.createWriteStream(logFile, { flags: 'a' });
  
  /**
   * Log a message with level
   * @param {string} level - Log level
   * @param {string} message - Log message
   */
  function log(level, message) {
    const timestamp = new Date().toISOString();
    const formattedMessage = `[${timestamp}] [${level}] ${message}`;
    
    // Write to console
    console.log(formattedMessage);
    
    // Write to log file
    logStream.write(formattedMessage + '\n');
  }
  
  return {
    /**
     * Log an info message
     * @param {...any} args - Message arguments
     */
    info(...args) {
      const message = util.format(...args);
      log('INFO', message);
    },
    
    /**
     * Log a warning message
     * @param {...any} args - Message arguments
     */
    warn(...args) {
      const message = util.format(...args);
      log('WARN', message);
    },
    
    /**
     * Log an error message
     * @param {...any} args - Message arguments
     */
    error(...args) {
      const message = util.format(...args);
      log('ERROR', message);
    },
    
    /**
     * Close the logger
     */
    close() {
      logStream.end();
    }
  };
}

module.exports = {
  createLogger
};
