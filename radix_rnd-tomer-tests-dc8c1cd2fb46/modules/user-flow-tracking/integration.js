/**
 * User Flow Tracking Integration
 * 
 * This module integrates the user flow tracking functionality into the RadixInsight platform.
 */

const express = require('express');
const path = require('path');
const UserFlowTracker = require('./index');
const userFlowApi = require('./api');

/**
 * Initialize user flow tracking in the RadixInsight platform
 * @param {Object} app - Express application
 * @param {Object} options - Configuration options
 */
function initializeUserFlowTracking(app, options = {}) {
  // Register API routes
  app.use('/api/flows', userFlowApi);
  
  // Serve client library
  app.get('/js/user-flow-client.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'client.js'));
  });
  
  // Serve minified client library
  app.get('/js/user-flow-client.min.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'client.min.js'));
  });
  
  console.log('User flow tracking initialized');
}

module.exports = {
  initializeUserFlowTracking
};
