// Polyfill for TextEncoder/TextDecoder (required for react-native-qrcode-svg)
// This MUST be at the very top, before any other imports
import 'fast-text-encoding';

// Ensure TextEncoder/TextDecoder are available globally
if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
  const {TextEncoder, TextDecoder} = require('fast-text-encoding');
  global.TextEncoder = global.TextEncoder || TextEncoder;
  global.TextDecoder = global.TextDecoder || TextDecoder;
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

import React, {useEffect} from 'react';
import {StatusBar, Platform, PermissionsAndroid} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import {useStore} from './src/store';
import NotificationService from './src/services/notificationService';
import GeolocationService from './src/services/geolocationService';

const App = () => {
  const {isDarkMode, hydrate, currentUser} = useStore();

  useEffect(() => {
    // Handle unhandled promise rejections for geolocation errors
    const rejectionHandler = (event: any) => {
      const error = event?.reason || event;
      const errorMessage = error?.message || String(error) || '';
      
      if (errorMessage.includes('RNFusedLocation') || 
          errorMessage.includes('FusedLocationProviderClient') ||
          errorMessage.includes('Could not invoke') ||
          (errorMessage.includes('interface') && errorMessage.includes('class was expected'))) {
        event.preventDefault?.();
        return;
      }
    };

    // Add unhandled rejection listener (if available)
    if (typeof global.addEventListener === 'function') {
      global.addEventListener('unhandledrejection', rejectionHandler);
    }

    // OneSignal removed - using in-app notifications only

    // Request location permission (similar to notification permission)
    const requestLocationPermission = async () => {
      try {
        if (Platform.OS === 'android') {
          // Check current permission status first
          const currentStatus = await GeolocationService.checkLocationPermission();

          if (currentStatus !== 'granted') {
            // Request permission using GeolocationService
            const requestResult = await GeolocationService.requestLocationPermission();

            if (requestResult === 'granted') {
            } else if (requestResult === 'never_ask_again') {
            } else {
            }
          } else {
          }
        } else {
          // iOS - permissions are requested automatically when needed
        }
      } catch (error) {
        console.error('Error requesting location permission:', error);
      }
    };

    // Request location permission
    requestLocationPermission();

    // Hydrate store from AsyncStorage on app start
    hydrate();
    
    // Initialize notification service and save FCM token (for local notifications)
    NotificationService.initializeAndSaveToken().catch(error => {
      console.error('Error initializing notifications:', error);
    });

    // Cleanup
    return () => {
      if (typeof global.removeEventListener === 'function') {
        global.removeEventListener('unhandledrejection', rejectionHandler);
      }
    };
  }, [hydrate]);

  // OneSignal removed - using in-app notifications only

  return (
    <SafeAreaProvider>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={isDarkMode ? '#1A202C' : '#F5F7FA'}
      />
      <AppNavigator />
    </SafeAreaProvider>
  );
};

export default App;
