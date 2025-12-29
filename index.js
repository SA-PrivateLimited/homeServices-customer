// Import polyfills FIRST - before any other imports
import './polyfills';

import {AppRegistry} from 'react-native';
import messaging from '@react-native-firebase/messaging';
import PushNotification from 'react-native-push-notification';
import App from './App';
import {name as appName} from './app.json';

// Register background message handler
// This MUST be registered BEFORE AppRegistry.registerComponent
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📱 FCM: Background message received:', {
    title: remoteMessage.notification?.title,
    body: remoteMessage.notification?.body,
    data: remoteMessage.data,
  });

  const {notification, data} = remoteMessage;

  if (notification) {
    // Determine channel based on notification type
    let channelId = 'consultation-updates';
    if (data?.type === 'chat') {
      channelId = 'chat-messages';
    } else if (data?.type === 'reminder') {
      channelId = 'consultation-reminders';
    } else if (data?.type === 'service') {
      channelId = 'consultation-updates';
    }

    // Show local notification when app is in background
    PushNotification.localNotification({
      channelId,
      title: notification.title || 'HomeServices',
      message: notification.body || '',
      playSound: true,
      soundName: 'default',
      userInfo: data || {},
    });
  }
});

AppRegistry.registerComponent(appName, () => App);
