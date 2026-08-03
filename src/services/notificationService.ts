/**
 * Local notification helpers — FCM/Firebase removed.
 * Uses react-native-push-notification channels only.
 */

import PushNotification, {Importance} from 'react-native-push-notification';
import {Platform} from 'react-native';

class NotificationService {
  constructor() {
    try {
      PushNotification.configure({
        onNotification: function (notification: any) {
          notification.finish?.();
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: false,
        requestPermissions: Platform.OS === 'ios',
      });
    } catch (error) {
      console.warn('PushNotification configure error:', error);
    }

    if (Platform.OS === 'android') {
      PushNotification.createChannel(
        {
          channelId: 'service_requests',
          channelName: 'Service Requests',
          channelDescription: 'Service request updates and alerts',
          importance: Importance.HIGH,
          vibrate: true,
          playSound: true,
          soundName: 'hooter.wav',
        },
        () => {},
      );
    }
  }

  async initializeAndSaveToken(): Promise<void> {
    // No FCM token — booking alerts use WebSocket.
    return;
  }

  showLocalNotification(title: string, message: string): void {
    try {
      PushNotification.localNotification({
        channelId: 'service_requests',
        title,
        message,
        playSound: true,
        soundName: 'hooter.wav',
        importance: 'high',
        vibrate: true,
      });
    } catch (e) {
      console.warn('Local notification failed:', e);
    }
  }
}

export default new NotificationService();
