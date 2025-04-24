const express = require('express');
const router = express.Router();
const { Pool } = require('pg');
const AuthenticationSystem = require('../auth/AuthenticationSystem');
const paths = require('../../paths');
const { validateEmail, validatePassword } = require(paths.utils + '/validators');

// Create database connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'radixinsight',
  password: process.env.DB_PASSWORD || 'postgres',
  port: process.env.DB_PORT || 5432,
});

// Create authentication system instance
const authSystem = new AuthenticationSystem(pool);

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

    // Register user
    const result = await authSystem.registerUser({
      email,
      password,
      firstName,
      lastName
    });

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

    // Handle specific errors
    if (err.message.includes('Email domain not allowed')) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

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
    const user = await authSystem.verifyEmail(token);

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

    // Validate email domain
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format. Only radix-int.com email addresses are allowed'
      });
    }

    // Authenticate user
    const authResult = await authSystem.authenticateUser(email, password);

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
router.post('/logout', async (req, res) => {
  try {
    const sessionId = req.cookies.session_id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'No active session'
      });
    }

    // Logout user
    await authSystem.logoutUser(sessionId);

    // Clear session cookie
    res.clearCookie('session_id');

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
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    // Validate input
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // Validate email domain
    if (!validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email format. Only radix-int.com email addresses are allowed'
      });
    }

    // Request password reset
    await authSystem.requestPasswordReset(email);

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive password reset instructions'
    });
  } catch (err) {
    console.error('Password reset request error:', err);

    // Always return success to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If your email is registered, you will receive password reset instructions'
    });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    // Validate input
    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required'
      });
    }

    // Validate password strength
    if (!validatePassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character'
      });
    }

    // Reset password
    await authSystem.resetPassword(token, newPassword);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now log in with your new password.'
    });
  } catch (err) {
    console.error('Password reset error:', err);

    // Handle specific errors
    if (err.message === 'Invalid or expired reset token') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error resetting password'
    });
  }
});

module.exports = router;
