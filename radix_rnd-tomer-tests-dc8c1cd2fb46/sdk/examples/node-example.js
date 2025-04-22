/**
 * Example Node.js usage of RadixInsight SDK
 */

// Import the SDK
const { initRadix } = require('radix-insight-sdk');

// Initialize the SDK
const analytics = initRadix({
  apiKey: 'YOUR_API_KEY',
  debug: true
});

// Track API usage
function trackApiCall(req, res, startTime) {
  const duration = Date.now() - startTime;
  
  analytics.track('api_request', {
    endpoint: req.path,
    method: req.method,
    statusCode: res.statusCode,
    duration: duration,
    userAgent: req.headers['user-agent'],
    ipAddress: req.ip
  });
}

// Express middleware example
function analyticsMiddleware(req, res, next) {
  const startTime = Date.now();
  
  // Track request start
  analytics.track('api_request_started', {
    endpoint: req.path,
    method: req.method
  });
  
  // Track when request completes
  res.on('finish', () => {
    trackApiCall(req, res, startTime);
  });
  
  next();
}

// Identify a user
function identifyUser(userId, userData) {
  analytics.identify(userId, {
    email: userData.email,
    name: userData.name,
    role: userData.role,
    company: userData.company
  });
}

// Track a business event
function trackPurchase(order) {
  analytics.track('order_completed', {
    orderId: order.id,
    total: order.total,
    currency: order.currency,
    products: order.products.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price,
      quantity: product.quantity
    }))
  });
}

// Flush events before process exit
process.on('SIGTERM', () => {
  console.log('Process terminating, flushing analytics events...');
  
  analytics.flush()
    .then(() => {
      console.log('Analytics events flushed successfully');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to flush analytics events:', err);
      process.exit(1);
    });
});

module.exports = {
  analytics,
  analyticsMiddleware,
  identifyUser,
  trackPurchase
};
