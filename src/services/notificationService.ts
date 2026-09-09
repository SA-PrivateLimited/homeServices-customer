/**
 * Customer push: FCM token → PUT /users/:id/fcmToken (Mongo).
 * Foreground: show a local notification. Killed/background: index.js handler.
 * Drop in google-services.json / server keys when you have them — this path is wired.
 */

import PushNotification, {Importance} from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';
import {getUserId, readStoredUser} from './session';
import {usersApi} from './api/usersApi';

export const CUSTOMER_FCM_CHANNEL = 'service_requests';

class NotificationService {
  private listenersBound = false;

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
          channelId: CUSTOMER_FCM_CHANNEL,
          channelName: 'Service Requests',
          channelDescription: 'Service request updates and alerts',
          importance: Importance.HIGH,
          vibrate: true,
          playSound: true,
          soundName: 'default',
        },
        () => {},
      );
      void this.requestAndroidNotificationPermission();
    }
  }

  async requestAndroidNotificationPermission(): Promise<void> {
    if (Platform.OS !== 'android') return;
    if (Number(Platform.Version) < 33) return;
    try {
      const has = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (has) return;
      await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notifications',
          message:
            'Akansho can notify you when a partner accepts or updates your request.',
          buttonPositive: 'Allow',
          buttonNegative: 'Not now',
        },
      );
    } catch (error: any) {
      console.warn('Notification permission:', error?.message);
    }
  }

  async saveTokenToBackend(token?: string | null): Promise<void> {
    const fcmToken = token || (await this.getFCMToken());
    if (!fcmToken) return;
    const user = await readStoredUser();
    const userId = getUserId(user);
    if (!userId) return;
    await usersApi.updateFcmToken(userId, fcmToken);
  }

  async initializeFCM(): Promise<void> {
    try {
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;
      if (!enabled) return;

      const token = await messaging().getToken();
      await this.saveTokenToBackend(token);

      if (this.listenersBound) return;
      this.listenersBound = true;

      messaging().onTokenRefresh(next => {
        void this.saveTokenToBackend(next);
      });

      messaging().onMessage(async remoteMessage => {
        this.handleFCMMessage(remoteMessage);
      });
    } catch (error: any) {
      console.warn('FCM init:', error?.message || error);
    }
  }

  handleFCMMessage(remoteMessage: any) {
    const {notification, data} = remoteMessage || {};
    const title =
      notification?.title || data?.title || 'Akansho';
    const message =
      notification?.body || data?.body || data?.message || '';
    if (!message && !title) return;
    this.showLocalNotification(title, message);
  }

  async getFCMToken(): Promise<string | null> {
    try {
      return await messaging().getToken();
    } catch {
      return null;
    }
  }

  async initializeAndSaveToken(): Promise<string | null> {
    await this.initializeFCM();
    return this.getFCMToken();
  }

  showLocalNotification(title: string, message: string): void {
    try {
      PushNotification.localNotification({
        channelId: CUSTOMER_FCM_CHANNEL,
        title,
        message,
        playSound: true,
        soundName: 'default',
        importance: 'high',
        vibrate: true,
      });
    } catch (e) {
      console.warn('Local notification failed:', e);
    }
  }
}

export default new NotificationService();
