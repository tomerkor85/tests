// Authentication System Implementation
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Pool } = require('pg');
const Redis = require('ioredis');
const nodemailer = require('nodemailer');

// Configuration
const config = {
  jwt: {
    secret: process.env.JWT_SECRET || 'radixinsight-secret-key',
    expiresIn: '24h'
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || ''
  },
  email: {
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER || 'noreply@radix-int.com',
    password: process.env.EMAIL_PASSWORD || 'password',
    from: process.env.EMAIL_FROM || 'RadixInsight <noreply@radix-int.com>'
  },
  allowedDomains: ['radix-int.com']
};

// Create Redis client
const redisClient = new Redis(config.redis);

// Create email transporter
const emailTransporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.secure,
  auth: {
    user: config.email.user,
    pass: config.email.password
  }
});

/**
 * Authentication System Class
 */
class AuthenticationSystem {
  constructor(db) {
    this.db = db;
  }

  /**
   * Register a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - User and verification token
   */
  async registerUser(userData) {
    const { email, password, firstName, lastName, role = 'user' } = userData;
    
    // Validate email domain
    const domain = email.split('@')[1];
    if (!config.allowedDomains.includes(domain)) {
      throw new Error(`Email domain not allowed. Allowed domains: ${config.allowedDomains.join(', ')}`);
    }
    
    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    
    // Create user in database
    const client = await this.db.connect();
    try {
      await client.query('BEGIN');
      
      const result = await client.query(`
        INSERT INTO users (
          email, password_hash, first_name, last_name, 
          role, verification_token
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, first_name, last_name, role, created_at
      `, [email, passwordHash, firstName, lastName, role, verificationToken]);
      
      await client.query('COMMIT');
      
      // Send verification email
      await this.sendVerificationEmail(email, verificationToken);
      
      return {
        user: result.rows[0],
        verificationToken
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Verify user email
   * @param {string} token - Verification token
   * @returns {Promise<Object>} - Verified user
   */
  async verifyEmail(token) {
    const client = await this.db.connect();
    try {
      const result = await client.query(`
        UPDATE users
        SET email_verified = true, verification_token = NULL
        WHERE verification_token = $1
        RETURNING id, email, first_name, last_name, role
      `, [token]);
      
      if (result.rowCount === 0) {
        throw new Error('Invalid verification token');
      }
      
      return result.rows[0];
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Authenticate user and generate token
   * @param {string} email - User email
   * @param {string} password - User password
   * @returns {Promise<Object>} - Authentication result with token
   */
  async authenticateUser(email, password) {
    const client = await this.db.connect();
    try {
      // Get user by email
      const result = await client.query(`
        SELECT id, email, password_hash, first_name, last_name, 
               role, is_active, email_verified
        FROM users
        WHERE email = $1
      `, [email]);
      
      if (result.rowCount === 0) {
        throw new Error('Invalid email or password');
      }
      
      const user = result.rows[0];
      
      // Check if user is active
      if (!user.is_active) {
        throw new Error('Account is disabled');
      }
      
      // Check if email is verified
      if (!user.email_verified) {
        throw new Error('Email not verified');
      }
      
      // Verify password
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        throw new Error('Invalid email or password');
      }
      
      // Generate JWT token
      const token = jwt.sign(
        { 
          userId: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        },
        config.jwt.secret,
        { expiresIn: config.jwt.expiresIn }
      );
      
      // Create session
      const sessionId = crypto.randomBytes(32).toString('hex');
      const sessionData = {
        userId: user.id,
        email: user.email,
        role: user.role,
        createdAt: new Date()
      };
      
      // Store session in Redis
      await redisClient.set(
        `session:${sessionId}`,
        JSON.stringify(sessionData),
        'EX',
        86400 // 24 hours
      );
      
      // Create session record in database
      await client.query(`
        INSERT INTO user_sessions (
          user_id, token, ip_address, user_agent, expires_at
        ) VALUES ($1, $2, $3, $4, NOW() + INTERVAL '24 hours')
      `, [user.id, sessionId, null, null]);
      
      return {
        token,
        sessionId,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role
        }
      };
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Logout user
   * @param {string} sessionId - Session ID
   * @returns {Promise<boolean>} - Success status
   */
  async logoutUser(sessionId) {
    try {
      // Remove session from Redis
      await redisClient.del(`session:${sessionId}`);
      
      // Update session in database
      const client = await this.db.connect();
      try {
        await client.query(`
          UPDATE user_sessions
          SET expires_at = NOW()
          WHERE token = $1
        `, [sessionId]);
        
        return true;
      } finally {
        client.release();
      }
    } catch (err) {
      throw err;
    }
  }

  /**
   * Verify JWT token and session
   * @param {string} token - JWT token
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} - Decoded token
   */
  async verifyToken(token, sessionId) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Check if session exists
      const sessionData = await redisClient.get(`session:${sessionId}`);
      if (!sessionData) {
        throw new Error('Session expired');
      }
      
      // Parse session data
      const session = JSON.parse(sessionData);
      
      // Check if user ID in token matches session
      if (decoded.userId !== session.userId) {
        throw new Error('Invalid session');
      }
      
      return decoded;
    } catch (err) {
      throw err;
    }
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<boolean>} - Success status
   */
  async requestPasswordReset(email) {
    const client = await this.db.connect();
    try {
      // Check if user exists
      const userResult = await client.query(`
        SELECT id, email, first_name
        FROM users
        WHERE email = $1 AND is_active = true
      `, [email]);
      
      if (userResult.rowCount === 0) {
        // Don't reveal if email exists or not
        return true;
      }
      
      const user = userResult.rows[0];
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date();
      resetTokenExpires.setHours(resetTokenExpires.getHours() + 1); // 1 hour expiry
      
      // Update user with reset token
      await client.query(`
        UPDATE users
        SET reset_token = $1, reset_token_expires = $2
        WHERE id = $3
      `, [resetToken, resetTokenExpires, user.id]);
      
      // Send password reset email
      await this.sendPasswordResetEmail(
        user.email,
        resetToken,
        user.first_name
      );
      
      return true;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Reset password
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<boolean>} - Success status
   */
  async resetPassword(token, newPassword) {
    const client = await this.db.connect();
    try {
      // Find user with valid reset token
      const userResult = await client.query(`
        SELECT id
        FROM users
        WHERE reset_token = $1 AND reset_token_expires > NOW()
      `, [token]);
      
      if (userResult.rowCount === 0) {
        throw new Error('Invalid or expired reset token');
      }
      
      const userId = userResult.rows[0].id;
      
      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);
      
      // Update user password and clear reset token
      await client.query(`
        UPDATE users
        SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL
        WHERE id = $2
      `, [passwordHash, userId]);
      
      return true;
    } catch (err) {
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Send verification email
   * @param {string} email - User email
   * @param {string} token - Verification token
   * @returns {Promise<boolean>} - Success status
   */
  async sendVerificationEmail(email, token) {
    try {
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://analytics.radix-int.com'}/verify/${token}`;
      
      // In development mode, just log the verification link
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Verification link: ${verificationUrl}`);
        return true;
      }
      
      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: 'Verify Your Email Address',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Welcome to RadixInsight!</h2>
            <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Verify Email</a>
            </div>
            <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>If you didn't create an account, you can safely ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="color: #6b7280; font-size: 12px;">This is an automated message from RadixInsight. Please do not reply to this email.</p>
          </div>
        `
      };
      
      await emailTransporter.sendMail(mailOptions);
      return true;
    } catch (err) {
      console.error('Error sending verification email:', err);
      throw err;
    }
  }

  /**
   * Send password reset email
   * @param {string} email - User email
   * @param {string} token - Reset token
   * @param {string} firstName - User first name
   * @returns {Promise<boolean>} - Success status
   */
  async sendPasswordResetEmail(email, token, firstName) {
    try {
      const resetUrl = `${process.env.FRONTEND_URL || 'https://analytics.radix-int.com'}/reset-password/${token}`;
      
      // In development mode, just log the reset link
      if (process.env.NODE_ENV !== 'production') {
        console.log(`Password reset link: ${resetUrl}`);
        return true;
      }
      
      const mailOptions = {
        from: config.email.from,
        to: email,
        subject: 'Reset Your Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Reset Your Password</h2>
            <p>Hello ${firstName},</p>
            <p>We received a request to reset your password. Click the button below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Reset Password</a>
            </div>
            <p>If the button doesn't work, you can also copy and paste the following link into your browser:</p>
            <p><a href="${resetUrl}">${resetUrl}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request a password reset, you can safely ignore this email.</p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
            <p style="color: #6b7280; font-size: 12px;">This is an automated message from RadixInsight. Please do not reply to this email.</p>
          </div>
        `
      };
      
      await emailTransporter.sendMail(mailOptions);
      return true;
    } catch (err) {
      console.error('Error sending password reset email:', err);
      throw err;
    }
  }
}

module.exports = AuthenticationSystem;
