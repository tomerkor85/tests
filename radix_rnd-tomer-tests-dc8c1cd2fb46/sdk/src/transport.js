/**
 * RadixInsight SDK - Transport module
 * 
 * This module handles the communication with the RadixInsight API.
 */

// Use a simple fetch implementation that works in both browser and Node.js
const fetch = typeof window !== 'undefined' ? window.fetch.bind(window) : 
  require('node-fetch');

/**
 * Send a single event to the RadixInsight API
 * @param {Object} event - The event to send
 * @param {Object} options - API options
 * @returns {Promise<Object>} - API response
 */
export async function sendEvent(event, options) {
  const { apiKey, endpoint } = options;
  
  const response = await fetch(`${endpoint}/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(event)
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send event: ${error}`);
  }
  
  return response.json();
}

/**
 * Send multiple events to the RadixInsight API
 * @param {Array<Object>} events - The events to send
 * @param {Object} options - API options
 * @returns {Promise<Object>} - API response
 */
export async function sendBatchEvents(events, options) {
  const { apiKey, endpoint } = options;
  
  const response = await fetch(`${endpoint}/events/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify({ events })
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send batch events: ${error}`);
  }
  
  return response.json();
}

export default {
  sendEvent,
  sendBatchEvents
};
