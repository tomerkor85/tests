/**
 * RadixInsight SDK - Utilities module
 * 
 * This module provides utility functions for the RadixInsight SDK.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Get or create a user ID
 * @returns {string} - User ID
 */
export function getUserId() {
  if (typeof localStorage !== 'undefined') {
    let userId = localStorage.getItem('radixinsight_user_id');
    if (!userId) {
      userId = uuidv4();
      localStorage.setItem('radixinsight_user_id', userId);
    }
    return userId;
  }
  
  // For non-browser environments
  return uuidv4();
}

/**
 * Get or create a session ID
 * @returns {string} - Session ID
 */
export function getSessionId() {
  if (typeof localStorage !== 'undefined') {
    let sessionId = localStorage.getItem('radixinsight_session_id');
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem('radixinsight_session_id', sessionId);
    }
    return sessionId;
  }
  
  // For non-browser environments
  return uuidv4();
}

/**
 * Get browser and device information
 * @returns {Object} - Browser and device info
 */
export function getBrowserInfo() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      browser: 'node',
      browser_version: process.version,
      os: process.platform,
      device_type: 'server'
    };
  }
  
  const userAgent = navigator.userAgent;
  let browser = 'unknown';
  let browserVersion = 'unknown';
  let os = 'unknown';
  let deviceType = 'desktop';
  
  // Detect browser
  if (userAgent.indexOf('Firefox') > -1) {
    browser = 'Firefox';
    browserVersion = userAgent.match(/Firefox\/([0-9.]+)/)[1];
  } else if (userAgent.indexOf('Chrome') > -1) {
    browser = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/([0-9.]+)/)[1];
  } else if (userAgent.indexOf('Safari') > -1) {
    browser = 'Safari';
    browserVersion = userAgent.match(/Version\/([0-9.]+)/)[1];
  } else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) {
    browser = 'Internet Explorer';
    browserVersion = userAgent.match(/(?:MSIE |rv:)([0-9.]+)/)[1];
  } else if (userAgent.indexOf('Edge') > -1) {
    browser = 'Edge';
    browserVersion = userAgent.match(/Edge\/([0-9.]+)/)[1];
  }
  
  // Detect OS
  if (userAgent.indexOf('Windows') > -1) {
    os = 'Windows';
  } else if (userAgent.indexOf('Mac') > -1) {
    os = 'MacOS';
  } else if (userAgent.indexOf('Linux') > -1) {
    os = 'Linux';
  } else if (userAgent.indexOf('Android') > -1) {
    os = 'Android';
    deviceType = 'mobile';
  } else if (userAgent.indexOf('iPhone') > -1 || userAgent.indexOf('iPad') > -1) {
    os = 'iOS';
    deviceType = userAgent.indexOf('iPad') > -1 ? 'tablet' : 'mobile';
  }
  
  return {
    browser,
    browser_version: browserVersion,
    os,
    device_type: deviceType,
    screen_width: window.screen ? window.screen.width : null,
    screen_height: window.screen ? window.screen.height : null,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    pixel_ratio: window.devicePixelRatio || 1
  };
}

/**
 * Get current page information
 * @returns {Object} - Page info
 */
export function getPageInfo() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      url: null,
      path: null,
      title: null,
      referrer: null
    };
  }
  
  const url = window.location.href;
  const path = window.location.pathname;
  const title = document.title;
  const referrer = document.referrer;
  
  // Parse UTM parameters
  const urlParams = new URLSearchParams(window.location.search);
  const utmSource = urlParams.get('utm_source');
  const utmMedium = urlParams.get('utm_medium');
  const utmCampaign = urlParams.get('utm_campaign');
  const utmTerm = urlParams.get('utm_term');
  const utmContent = urlParams.get('utm_content');
  
  return {
    url,
    path,
    title,
    referrer,
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_term: utmTerm,
    utm_content: utmContent
  };
}

export default {
  getUserId,
  getSessionId,
  getBrowserInfo,
  getPageInfo
};
