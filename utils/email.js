const nodemailer = require('nodemailer');

/**
 * Email utility functions for sending verification emails, password reset emails, etc.
 */

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.example.com',
  port: process.env.EMAIL_PORT || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER || 'noreply@radix-int.com',
    pass: process.env.EMAIL_PASSWORD || 'password'
  }
});

/**
 * Sends verification email to user
 * @param {string} email - User's email address
 * @param {string} token - Verification token
 * @returns {Promise} - Resolves when email is sent
 */
async function sendVerificationEmail(email, token) {
  // In development mode, just log the verification link
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Verification link: http://localhost:3000/verify/${token}`);
    return Promise.resolve();
  }
  
  const verificationUrl = `${process.env.FRONTEND_URL || 'https://analytics.radix-int.com'}/verify/${token}`;
  
  const mailOptions = {
    from: `"RadixInsight" <${process.env.EMAIL_USER || 'noreply@radix-int.com'}>`,
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
  
  return transporter.sendMail(mailOptions);
}

/**
 * Sends password reset email to user
 * @param {string} email - User's email address
 * @param {string} token - Password reset token
 * @returns {Promise} - Resolves when email is sent
 */
async function sendPasswordResetEmail(email, token) {
  // In development mode, just log the reset link
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Password reset link: http://localhost:3000/reset-password/${token}`);
    return Promise.resolve();
  }
  
  const resetUrl = `${process.env.FRONTEND_URL || 'https://analytics.radix-int.com'}/reset-password/${token}`;
  
  const mailOptions = {
    from: `"RadixInsight" <${process.env.EMAIL_USER || 'noreply@radix-int.com'}>`,
    to: email,
    subject: 'Reset Your Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Reset Your Password</h2>
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
  
  return transporter.sendMail(mailOptions);
}

/**
 * Sends project invitation email to user
 * @param {string} email - User's email address
 * @param {string} projectName - Name of the project
 * @param {string} inviterName - Name of the person who sent the invitation
 * @returns {Promise} - Resolves when email is sent
 */
async function sendProjectInvitationEmail(email, projectName, inviterName) {
  // In development mode, just log the invitation
  if (process.env.NODE_ENV !== 'production') {
    console.log(`Project invitation: ${inviterName} invited ${email} to ${projectName}`);
    return Promise.resolve();
  }
  
  const loginUrl = `${process.env.FRONTEND_URL || 'https://analytics.radix-int.com'}/login`;
  
  const mailOptions = {
    from: `"RadixInsight" <${process.env.EMAIL_USER || 'noreply@radix-int.com'}>`,
    to: email,
    subject: `You've Been Invited to ${projectName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Project Invitation</h2>
        <p>${inviterName} has invited you to collaborate on the project "${projectName}" in RadixInsight.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">Log In to View Project</a>
        </div>
        <p>If you don't have an account yet, you'll need to register with this email address.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;" />
        <p style="color: #6b7280; font-size: 12px;">This is an automated message from RadixInsight. Please do not reply to this email.</p>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
}

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendProjectInvitationEmail
};
