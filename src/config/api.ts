/**
 * API Configuration
 * Centralized configuration for backend API base URL
 */

// Determine API base URL based on environment
const getApiBaseUrl = (): string => {
  if (__DEV__) {
    // Development - local backend server
    // For Android emulator: use 10.0.2.2 instead of localhost
    // For iOS simulator: use localhost
    // For real device: use your computer's IP address
    const platform = require('react-native').Platform.OS;
    
    if (platform === 'android') {
      return 'http://10.0.2.2:3000/api'; // Android emulator
    }

    return 'http://localhost:3000/api'; // iOS simulator or web
  }
  
  // Production - replace with your production backend URL
  return 'https://homeservices-backend-htasuiwr2.vercel.app/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Default timeout for API requests (in milliseconds)
export const API_TIMEOUT = 30000; // 30 seconds
