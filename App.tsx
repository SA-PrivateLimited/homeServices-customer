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
import oneSignalService from './src/services/oneSignalService';

const ONESIGNAL_APP_ID = 'b0020b77-3e0c-43c5-b92e-912b1cec1623';

const App = () => {
  const {isDarkMode, hydrate, currentUser} = useStore();
  const oneSignalInitialized = React.useRef(false);

  // Initialize OneSignal once on app start
  useEffect(() => {
    if (oneSignalInitialized.current) {
      return; // Already initialized
    }

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

    // Initialize OneSignal with error handling (only once)
    const initializeOneSignal = async () => {
      if (oneSignalInitialized.current) {
        return; // Already initialized
      }

      try {
        // Import OneSignal dynamically
        const OneSignalModule = require('react-native-onesignal');
        // For v5.x, OneSignal is nested inside the module
        const OneSignal = OneSignalModule.OneSignal || OneSignalModule.default || OneSignalModule;
        
        if (!OneSignal) {
          return;
        }

        // For react-native-onesignal v5.x, use setAppId on the OneSignal object
        if (OneSignal.setAppId && typeof OneSignal.setAppId === 'function') {
          OneSignal.setAppId(ONESIGNAL_APP_ID);
        } else if (OneSignal.initialize && typeof OneSignal.initialize === 'function') {
          OneSignal.initialize(ONESIGNAL_APP_ID);
        } else {
          return;
        }
        
        // Request notification permission (OneSignal v5.x) - only check once
        if (OneSignal.Notifications && OneSignal.Notifications.getPermissionAsync) {
          const hasPermission = await OneSignal.Notifications.getPermissionAsync();

          if (!hasPermission) {
            // Request permission using v5.x API
            if (OneSignal.Notifications.requestPermission) {
              const granted = await OneSignal.Notifications.requestPermission(true);

              if (granted) {
                console.log('OneSignal notification permission granted');
              } else {
                console.log('OneSignal notification permission denied');
              }
            }
          } else {
            console.log('OneSignal notification permission already granted');
          }
        } else if (OneSignal.promptForPushNotificationsWithUserResponse && typeof OneSignal.promptForPushNotificationsWithUserResponse === 'function') {
          // Fallback for older versions
          OneSignal.promptForPushNotificationsWithUserResponse(response => {
            console.log('OneSignal permission response:', response);
          });
        }

        // For Android, also check system notification settings - only once
        if (Platform.OS === 'android') {
          if (Platform.Version >= 33) {
            // Android 13+ requires POST_NOTIFICATIONS permission
            const permissionStatus = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );

            if (permissionStatus === PermissionsAndroid.RESULTS.GRANTED) {
              console.log('Android POST_NOTIFICATIONS permission granted');
            } else {
              console.log('Android POST_NOTIFICATIONS permission denied');
            }
          }
        }

        // Set up notification handlers (only once)
        if (OneSignal.setNotificationWillShowInForegroundHandler && typeof OneSignal.setNotificationWillShowInForegroundHandler === 'function') {
          OneSignal.setNotificationWillShowInForegroundHandler(notifReceivedEvent => {
            const notification = notifReceivedEvent.getNotification();
            console.log('OneSignal notification received in foreground:', notification);
            notifReceivedEvent.complete(notification);
          });
        }

        if (OneSignal.setNotificationOpenedHandler && typeof OneSignal.setNotificationOpenedHandler === 'function') {
          OneSignal.setNotificationOpenedHandler(notification => {
            console.log('OneSignal notification opened:', notification);
            // Handle navigation if needed
          });
        }

        oneSignalInitialized.current = true;
        console.log('✅ OneSignal initialized successfully');
      } catch (error) {
        console.error('Error initializing OneSignal:', error);
      }
    };

    // Initialize OneSignal (only once)
    initializeOneSignal();

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
  }, [hydrate]); // Removed currentUser from dependencies

  // Set OneSignal external user ID when user changes (separate effect)
  useEffect(() => {
    if (currentUser?.id && oneSignalInitialized.current) {
      oneSignalService.setUserExternalId(currentUser.id).catch(error => {
        console.error('Error setting OneSignal external user ID:', error);
      });
    }
  }, [currentUser?.id]); // Only runs when user ID changes

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
