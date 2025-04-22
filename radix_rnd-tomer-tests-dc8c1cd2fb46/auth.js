// auth.js - Authentication and access control for RadixInsight

// DOM elements
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const logoutButton = document.getElementById('logout-button');
const protectedContent = document.getElementById('protected-content');
const publicContent = document.getElementById('public-content');
const userEmail = document.getElementById('user-email');

// Configuration
const ALLOWED_DOMAIN = 'radix-int.com';
const TOKEN_KEY = 'radixinsight_auth_token';
const USER_KEY = 'radixinsight_user';

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', checkAuth);

// Handle login form submission
if (loginForm) {
  loginForm.addEventListener('submit', handleLogin);
}

// Handle logout button click
if (logoutButton) {
  logoutButton.addEventListener('click', handleLogout);
}

/**
 * Check if user is authenticated and has valid domain
 */
function checkAuth() {
  const token = localStorage.getItem(TOKEN_KEY);
  const user = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
  
  if (token && user && user.email) {
    // Check if email domain is allowed
    if (isAllowedDomain(user.email)) {
      // User is authenticated with valid domain
      showAuthenticatedState(user);
    } else {
      // User is authenticated but with invalid domain
      handleLogout();
      showLoginError('Access Denied – Radix members only.');
    }
  } else {
    // User is not authenticated
    showUnauthenticatedState();
  }
}

/**
 * Handle login form submission
 * @param {Event} event - Form submit event
 */
function handleLogin(event) {
  event.preventDefault();
  
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  // Validate email domain
  if (!isAllowedDomain(email)) {
    showLoginError('Access Denied – Radix members only.');
    return;
  }
  
  // In a real implementation, this would make an API call to verify credentials
  // For demo purposes, we'll simulate a successful login
  const user = {
    id: 'user123',
    email: email,
    name: email.split('@')[0]
  };
  
  // Store auth token and user info
  const token = generateDemoToken(user);
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  
  // Update UI
  showAuthenticatedState(user);
  
  // Redirect to dashboard or home page
  window.location.href = '../index.html';
}

/**
 * Handle user logout
 */
function handleLogout() {
  // Clear auth data
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  
  // Update UI
  showUnauthenticatedState();
  
  // Redirect to login page
  window.location.href = 'login.html';
}

/**
 * Check if email domain is allowed
 * @param {string} email - User email
 * @returns {boolean} - True if domain is allowed
 */
function isAllowedDomain(email) {
  if (!email) return false;
  
  const domain = email.split('@')[1];
  return domain && domain.toLowerCase() === ALLOWED_DOMAIN;
}

/**
 * Show authenticated UI state
 * @param {Object} user - User object
 */
function showAuthenticatedState(user) {
  if (logoutButton) logoutButton.style.display = 'block';
  if (protectedContent) protectedContent.style.display = 'block';
  if (publicContent) publicContent.style.display = 'none';
  if (userEmail) userEmail.textContent = user.email;
  
  // Add authenticated class to body
  document.body.classList.add('authenticated');
  document.body.classList.remove('unauthenticated');
}

/**
 * Show unauthenticated UI state
 */
function showUnauthenticatedState() {
  if (logoutButton) logoutButton.style.display = 'none';
  if (protectedContent) protectedContent.style.display = 'none';
  if (publicContent) publicContent.style.display = 'block';
  if (userEmail) userEmail.textContent = '';
  
  // Add unauthenticated class to body
  document.body.classList.add('unauthenticated');
  document.body.classList.remove('authenticated');
}

/**
 * Show login error message
 * @param {string} message - Error message
 */
function showLoginError(message) {
  if (loginError) {
    loginError.textContent = message;
    loginError.style.display = 'block';
  }
}

/**
 * Generate a demo JWT token (for demonstration only)
 * @param {Object} user - User object
 * @returns {string} - JWT token
 */
function generateDemoToken(user) {
  // This is a simplified demo token, not a real JWT
  // In production, use a proper JWT library and secure secret
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({
    sub: user.id,
    email: user.email,
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  }));
  const signature = btoa('demo-signature');
  
  return `${header}.${payload}.${signature}`;
}

/**
 * Check if current page requires authentication
 * @returns {boolean} - True if page requires auth
 */
function isProtectedPage() {
  // List of paths that require authentication
  const protectedPaths = [
    '/dashboard/',
    '/admin/',
    '/settings/'
  ];
  
  const currentPath = window.location.pathname;
  return protectedPaths.some(path => currentPath.includes(path));
}

// Redirect to login if accessing protected page while unauthenticated
if (isProtectedPage() && !localStorage.getItem(TOKEN_KEY)) {
  window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
}
