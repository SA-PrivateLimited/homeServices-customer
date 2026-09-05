// Import polyfills FIRST - before any other imports
import './polyfills';

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import App from './App';
import {name as appName} from './app.json';
import NotificationService from './src/services/notificationService';

// Data-only FCM (PWA-safe). If Android has no tray notification, show one here.
messaging().setBackgroundMessageHandler(async remoteMessage => {
  if (remoteMessage?.notification) return;
  NotificationService.handleFCMMessage(remoteMessage);
});

AppRegistry.registerComponent(appName, () => App);
