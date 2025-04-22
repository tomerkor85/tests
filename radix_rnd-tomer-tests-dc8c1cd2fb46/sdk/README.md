# RadixInsight SDK

A lightweight JavaScript SDK for the RadixInsight Analytics Platform that makes it easy to track user behavior and events in both browser and Node.js environments.

## Installation

```bash
npm install radix-insight-sdk --save
```

Or using yarn:

```bash
yarn add radix-insight-sdk
```

## Quick Start

### Browser Usage

```html
<script src="https://cdn.jsdelivr.net/npm/radix-insight-sdk/dist/radix-insight.min.js"></script>
<script>
  const analytics = RadixInsight.initRadix({
    apiKey: 'YOUR_API_KEY',
    debug: true
  });
  
  // Track an event
  analytics.track('button_clicked', {
    buttonId: 'signup-button',
    page: 'homepage'
  });
</script>
```

### ES Module Usage (React, Vue, Angular, etc.)

```javascript
import { initRadix } from 'radix-insight-sdk';

const analytics = initRadix({
  apiKey: 'YOUR_API_KEY',
  debug: true
});

// Track an event
analytics.track('button_clicked', {
  buttonId: 'signup-button',
  page: 'homepage'
});
```

### Node.js Usage

```javascript
const { initRadix } = require('radix-insight-sdk');

const analytics = initRadix({
  apiKey: 'YOUR_API_KEY',
  debug: true
});

// Track an event
analytics.track('api_called', {
  endpoint: '/api/users',
  method: 'GET',
  responseTime: 120
});
```

## Configuration Options

The SDK can be configured with the following options:

```javascript
const analytics = initRadix({
  // Required
  apiKey: 'YOUR_API_KEY',
  
  // Optional
  endpoint: 'https://api.radixinsight.com/v1', // Custom API endpoint
  debug: false,                                // Enable debug logging
  autoTrack: true,                             // Automatically track page views and clicks
  batchSize: 10,                               // Number of events to batch before sending
  batchInterval: 2000                          // Batch sending interval in milliseconds
});
```

## Core Methods

### Track Events

```javascript
// Basic event tracking
analytics.track('signup_completed');

// With properties
analytics.track('product_purchased', {
  productId: '12345',
  price: 49.99,
  currency: 'USD',
  quantity: 1
});
```

### Identify Users

```javascript
// Identify a user with traits
analytics.identify('user-123', {
  email: 'user@example.com',
  name: 'John Doe',
  plan: 'premium',
  signupDate: '2023-01-15'
});
```

### Track Page Views

```javascript
// Automatically captures current page info
analytics.page();

// With custom page name
analytics.page('Homepage');

// With additional properties
analytics.page('Product Page', {
  productId: '12345',
  category: 'Electronics'
});
```

### Reset Session

```javascript
// Reset the current session (e.g., after logout)
analytics.resetSession();
```

### Flush Events Queue

```javascript
// Manually flush the events queue
analytics.flush()
  .then(result => console.log('Events sent:', result))
  .catch(error => console.error('Failed to send events:', error));
```

## Automatic Tracking

When `autoTrack` is enabled (default), the SDK automatically tracks:

1. Page views when the page loads
2. Page navigation when using history API
3. Clicks on links and buttons

## Browser Support

The SDK supports all modern browsers:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- IE 11 (with polyfills)

## Node.js Support

The SDK supports Node.js 12.x and later.

## Advanced Usage

### Custom Event Batching

```javascript
// Configure custom batching
const analytics = initRadix({
  apiKey: 'YOUR_API_KEY',
  batchSize: 20,        // Send in batches of 20 events
  batchInterval: 5000   // Or every 5 seconds, whichever comes first
});
```

### Tracking User Flows

```javascript
// Track a multi-step flow
analytics.track('flow_started', { flowName: 'checkout' });

// ... user performs actions ...

analytics.track('flow_step_completed', { 
  flowName: 'checkout',
  stepName: 'shipping_info',
  stepNumber: 1
});

// ... more steps ...

analytics.track('flow_completed', { 
  flowName: 'checkout',
  totalSteps: 4,
  totalTime: 180 // seconds
});
```

## TypeScript Support

The SDK includes TypeScript definitions:

```typescript
import { initRadix, RadixInsight } from 'radix-insight-sdk';

interface ProductProperties {
  productId: string;
  price: number;
  name: string;
}

const analytics: RadixInsight = initRadix({
  apiKey: 'YOUR_API_KEY'
});

analytics.track<ProductProperties>('product_viewed', {
  productId: '12345',
  price: 49.99,
  name: 'Wireless Headphones'
});
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
