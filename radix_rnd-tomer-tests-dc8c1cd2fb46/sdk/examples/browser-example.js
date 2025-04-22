/**
 * Example browser usage of RadixInsight SDK
 */

// Import the SDK
import { initRadix } from 'radix-insight-sdk';

// Initialize the SDK
const analytics = initRadix({
  apiKey: 'YOUR_API_KEY',
  debug: true,
  autoTrack: true
});

// Track a custom event
document.getElementById('signup-button').addEventListener('click', () => {
  analytics.track('signup_button_clicked', {
    location: 'header',
    page: window.location.pathname
  });
  
  // Continue with signup process...
});

// Identify a user after login
function onUserLogin(userData) {
  analytics.identify(userData.id, {
    email: userData.email,
    name: userData.name,
    plan: userData.plan,
    signupDate: userData.signupDate
  });
  
  // Track the login event
  analytics.track('user_logged_in', {
    loginMethod: 'email'
  });
}

// Track a page view with custom properties
analytics.page('Product Page', {
  productId: getProductId(),
  category: getProductCategory(),
  price: getProductPrice()
});

// Track a multi-step flow
function startCheckout() {
  analytics.track('checkout_started', {
    cartValue: getCartTotal(),
    itemCount: getCartItemCount(),
    currency: 'USD'
  });
}

function completeCheckout() {
  analytics.track('checkout_completed', {
    orderId: getOrderId(),
    total: getOrderTotal(),
    paymentMethod: getPaymentMethod()
  });
  
  // Flush events immediately to ensure they're sent
  analytics.flush();
}
