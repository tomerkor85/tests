const express = require('express');
const router = express.Router();
const { userDb } = require('../database/db');
const { validateEmail, validatePassword } = require('../utils/validators');
const { sendVerificationEmail } = require('../utils/email');
const auth = require('../middleware/auth');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName } = req.body;
    
    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        success: false, 
        message: 'All fields are required' 
      });
    }
    
    // Validate email format and domain
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid email format. Email must be from the radix-int.com domain' 
      });
    }
    
    // Validate password strength
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character' 
      });
    }
    
    // Create user
    const result = await userDb.createUser({
      email,
      password,
      firstName,
      lastName
    });
    
    // Send verification email
    await sendVerificationEmail(email, result.verificationToken);
    
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Please check your email to verify your account.',
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.first_name,
        lastName: result.user.last_name,
        createdAt: result.user.created_at
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    
    // Handle duplicate email
    if (err.code === '23505') { // PostgreSQL unique constraint violation
      return res.status(409).json({ 
        success: false, 
        message: 'Email already registered' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during registration' 
    });
  }
});

/**
 * @route   GET /api/auth/verify/:token
 * @desc    Verify user email
 * @access  Public
 */
router.get('/verify/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification token is required' 
      });
    }
    
    // Verify email
    const user = await userDb.verifyEmail(token);
    
    res.status(200).json({
      success: true,
      message: 'Email verified successfully. You can now log in.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (err) {
    console.error('Email verification error:', err);
    
    res.status(400).json({ 
      success: false, 
      message: 'Invalid or expired verification token' 
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user & get token
 * @access  Public
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validate input
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email and password are required' 
      });
    }
    
    // Authenticate user
    const authResult = await userDb.authenticateUser(email, password);
    
    // Set session cookie
    res.cookie('session_id', authResult.sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });
    
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token: authResult.token,
      user: authResult.user
    });
  } catch (err) {
    console.error('Login error:', err);
    
    // Handle specific errors
    if (err.message === 'Invalid email or password') {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid email or password' 
      });
    } else if (err.message === 'Email not verified') {
      return res.status(403).json({ 
        success: false, 
        message: 'Please verify your email before logging in' 
      });
    } else if (err.message === 'Account is disabled') {
      return res.status(403).json({ 
        success: false, 
        message: 'Your account has been disabled. Please contact an administrator.' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login' 
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate session
 * @access  Private
 */
router.post('/logout', auth, async (req, res) => {
  try {
    // Clear session cookie
    res.clearCookie('session_id');
    
    // Invalidate session in Redis (handled by auth middleware)
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (err) {
    console.error('Logout error:', err);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error during logout' 
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Get current user
 * @access  Private
 */
router.get('/me', auth, async (req, res) => {
  try {
    // Get user from database
    const user = await userDb.getUserById(req.user.userId);
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        isActive: user.is_active,
        emailVerified: user.email_verified,
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    });
  } catch (err) {
    console.error('Get current user error:', err);
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error retrieving user data' 
    });
  }
});

/**
 * @route   PUT /api/auth/password
 * @desc    Change user password
 * @access  Private
 */
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password and new password are required' 
      });
    }
    
    // Validate new password strength
    if (!validatePassword(newPassword)) {
      return res.status(400).json({ 
        success: false, 
        message: 'New password must be at least 8 characters long and include uppercase, lowercase, number, and special character' 
      });
    }
    
    // Change password
    await userDb.changePassword(req.user.userId, currentPassword, newPassword);
    
    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (err) {
    console.error('Password change error:', err);
    
    // Handle specific errors
    if (err.message === 'Current password is incorrect') {
      return res.status(400).json({ 
        success: false, 
        message: 'Current password is incorrect' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error changing password' 
    });
  }
});

module.exports = router;
