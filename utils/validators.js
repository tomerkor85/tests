/**
 * Email validation and password strength validation utilities
 */

/**
 * Validates email format and domain
 * @param {string} email - Email to validate
 * @returns {boolean} - True if email is valid
 */
function validateEmail(email) {
  if (!email) return false;
  
  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return false;
  
  // Domain validation - must be radix-int.com
  const domain = email.split('@')[1];
  return domain === 'radix-int.com';
}

/**
 * Validates password strength
 * @param {string} password - Password to validate
 * @returns {boolean} - True if password meets strength requirements
 */
function validatePassword(password) {
  if (!password) return false;
  
  // Password must be at least 8 characters
  if (password.length < 8) return false;
  
  // Password must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;
  
  // Password must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) return false;
  
  // Password must contain at least one number
  if (!/[0-9]/.test(password)) return false;
  
  // Password must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return false;
  
  return true;
}

/**
 * Generates a random string of specified length
 * @param {number} length - Length of the string to generate
 * @returns {string} - Random string
 */
function generateRandomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}

/**
 * Sanitizes user input to prevent XSS attacks
 * @param {string} input - Input to sanitize
 * @returns {string} - Sanitized input
 */
function sanitizeInput(input) {
  if (!input) return '';
  
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = {
  validateEmail,
  validatePassword,
  generateRandomString,
  sanitizeInput
};
