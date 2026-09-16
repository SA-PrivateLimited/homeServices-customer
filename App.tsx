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

import React, {useEffect, useState, useMemo} from 'react';
import {StatusBar, Platform, InteractionManager} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import {AppThemeProvider} from 'sapvt-ltd-app-packages';
import {HelpRequestProvider} from './src/components/help/helpRequestContext';
import {GreetingOverlay} from './src/components/GreetingOverlay';
import {LocationPermissionExplanationHost} from './src/components/LocationPermissionExplanationHost';
import {BootSplash} from './src/components/BootSplash';
import AppNavigator from './src/navigation/AppNavigator';
import {useStore} from './src/store';
import NotificationService from './src/services/notificationService';
import GeolocationService from './src/services/geolocationService';
import {loadAndApplyBranding} from './src/services/brandingService';
import {lightTheme, darkTheme} from './src/utils/theme';
import './src/i18n'; // Initialize i18n

const App = () => {
  const {isDarkMode, hydrate, currentUser} = useStore();
  const [bootReady, setBootReady] = useState(false);
  const theme = isDarkMode ? darkTheme : lightTheme;
  const appThemeColors = useMemo(
    () => ({
      primary: theme.primary,
      background: theme.background,
      card: theme.card,
      text: theme.text,
      textSecondary: theme.textSecondary,
      border: theme.border,
      danger: theme.error,
      success: theme.success,
      warning: theme.warning,
      controlH: 40,
      controlHLg: 48,
      controlPx: 14,
      radiusSm: 12,
      radius: 16,
      radiusCard: 22,
    }),
    [
      theme.primary,
      theme.background,
      theme.card,
      theme.text,
      theme.textSecondary,
      theme.border,
      theme.error,
      theme.success,
      theme.warning,
    ],
  );

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

    // Hydrate store + remote themeColors as colorPalette before first UI paint
    (async () => {
      try {
        await hydrate();
        await loadAndApplyBranding();
      } finally {
        setBootReady(true);
      }
    })();
    
    // Cleanup
    return () => {
      if (typeof global.removeEventListener === 'function') {
        global.removeEventListener('unhandledrejection', rejectionHandler);
      }
    };
  }, [hydrate]);

  useEffect(() => {
    if (!currentUser) return;
    NotificationService.initializeAndSaveToken()
      .then(token => NotificationService.saveTokenToBackend(token))
      .catch(error => {
        console.error('Error initializing notifications:', error);
      });
  }, [currentUser]);

  // One-time location permission when the app opens (Android).
  // Ask only if not already granted — do not spam after deny / never_ask_again.
  useEffect(() => {
    if (!bootReady || Platform.OS !== 'android') {
      return;
    }
    let cancelled = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        try {
          const status = await GeolocationService.checkLocationPermission();
          if (cancelled || status === 'granted') {
            return;
          }
          // Slight delay so the first screen is mounted before the system dialog.
          await new Promise(resolve => setTimeout(resolve, 600));
          if (cancelled) {
            return;
          }
          await GeolocationService.requestLocationPermission();
        } catch (error) {
          if (__DEV__) {
            console.error('Boot location permission request failed:', error);
          }
        }
      })();
    });
    return () => {
      cancelled = true;
      task.cancel?.();
    };
  }, [bootReady]);

  if (!bootReady) {
    return <BootSplash />;
  }

  return (
    <SafeAreaProvider>
      <AppThemeProvider colors={appThemeColors}>
        <StatusBar
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
          backgroundColor={theme.background}
        />
        <HelpRequestProvider>
          <AppNavigator />
          <GreetingOverlay />
          <LocationPermissionExplanationHost />
        </HelpRequestProvider>
      </AppThemeProvider>
    </SafeAreaProvider>
  );
};

export default App;

