/**
 * Polyfills for React Native
 * This file should be imported at the very beginning of index.js
 */

// TextEncoder/TextDecoder polyfill for react-native-qrcode-svg
import 'fast-text-encoding';

// Ensure TextEncoder/TextDecoder are available globally
if (typeof global.TextEncoder === 'undefined') {
  const {TextEncoder} = require('fast-text-encoding');
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  const {TextDecoder} = require('fast-text-encoding');
  global.TextDecoder = TextDecoder;
}

// Also set on window for browser-like environments
if (typeof window !== 'undefined') {
  if (typeof window.TextEncoder === 'undefined') {
    window.TextEncoder = global.TextEncoder;
  }
  if (typeof window.TextDecoder === 'undefined') {
    window.TextDecoder = global.TextDecoder;
  }
}

