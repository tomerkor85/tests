const jwt = require('jsonwebtoken');
const { redisClient } = require('../../database/db');

/**
 * Authentication middleware
 * Verifies JWT token and checks if session is valid
 * Only allows users with @radix-int.com email addresses
 */
module.exports = async function(req, res, next) {
  try {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'No authentication token, access denied' 
      });
    }
    
    // Verify token
    const decoded = jwt.verify(
      token, 
      process.env.JWT_SECRET || 'radixinsight-secret-key'
    );
    
    // Check if email domain is allowed
    const emailDomain = decoded.email.split('@')[1];
    if (emailDomain !== 'radix-int.com') {
      return res.status(403).json({ 
        success: false, 
        message: 'Access restricted to radix-int.com email addresses only' 
      });
    }
    
    // Get session ID from cookie
    const sessionId = req.cookies.session_id;
    
    // Check if session exists
    if (!sessionId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Session expired, please login again' 
      });
    }
    
    // Check if session is valid in Redis
    const sessionData = await redisClient.get(`session:${sessionId}`);
    
    if (!sessionData) {
      return res.status(401).json({ 
        success: false, 
        message: 'Session expired, please login again' 
      });
    }
    
    // Parse session data
    const session = JSON.parse(sessionData);
    
    // Check if user ID in token matches session
    if (decoded.userId !== session.userId) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authentication token' 
      });
    }
    
    // Add user data to request
    req.user = decoded;
    req.sessionId = sessionId;
    
    // Continue to next middleware/route handler
    next();
  } catch (err) {
    console.error('Authentication error:', err);
    
    // Handle specific JWT errors
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid authentication token' 
      });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication token expired' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during authentication' 
    });
  }
};
