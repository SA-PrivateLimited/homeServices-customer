import PushNotification, {Importance} from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import {Platform, PermissionsAndroid} from 'react-native';

class NotificationService {
  private fcmInitialized = false;
  private handlersSetup = false;

  constructor() {
    try {
      PushNotification.configure({
        onNotification: function (notification: any) {
          notification.finish();
        },
        permissions: {
          alert: true,
          badge: true,
          sound: true,
        },
        popInitialNotification: false, // Disable to prevent null reference errors
        requestPermissions: Platform.OS === 'ios',
      });
    } catch (error) {
      console.warn('PushNotification configure error:', error);
    }

    // Only create channels on Android
    if (Platform.OS === 'android') {
      // General Reminders Channel (for any reminders)

      // Service Requests Channel (with hooter sound for Uber/Ola-style alerts)
      PushNotification.createChannel(
        {
          channelId: 'service_requests',
          channelName: 'Service Requests',
          channelDescription: 'Service request updates and alerts',
          importance: Importance.HIGH, // High importance for service alerts
          vibrate: true,
          playSound: true,
          soundName: 'hooter.wav', // Hooter sound for service notifications
        },
        (created) => {
          if (created) {
            console.log('✅ Service requests notification channel created with hooter sound');
          }
        },
      );

    }

    // Request Android notification permission for Android 13+ (API 33+)
    if (Platform.OS === 'android') {
      this.requestAndroidNotificationPermission();
    }

    // Initialize FCM
    this.initializeFCM();
  }

  /**
   * Request POST_NOTIFICATIONS permission for Android 13+ (API 33+)
   * This is required for notifications to be displayed on Android 13+
   */
  async requestAndroidNotificationPermission(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }

    try {
      // Check Android version - POST_NOTIFICATIONS is required for API 33+
      const androidVersion = Platform.Version;
      if (androidVersion < 33) {
        // Android 12 and below don't require runtime permission for notifications
        console.log('ℹ️ Android version < 33, notification permission not required');
        return;
      }

      // Check if permission is already granted
      const hasPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );

      if (hasPermission) {
        console.log('✅ Android notification permission already granted');
        return;
      }

      // Request permission
      console.log('📱 Requesting Android notification permission...');
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        {
          title: 'Notification Permission',
          message: 'HomeServices needs permission to send you notifications about your services and appointments.',
          buttonNeutral: 'Ask Me Later',
          buttonNegative: 'Cancel',
          buttonPositive: 'Allow',
        },
      );

      if (result === PermissionsAndroid.RESULTS.GRANTED) {
        console.log('✅ Android notification permission granted');
      } else if (result === PermissionsAndroid.RESULTS.DENIED) {
        console.warn('⚠️ Android notification permission denied');
      } else if (result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
        console.warn('⚠️ Android notification permission denied and set to never ask again');
      }
    } catch (error: any) {
      console.error('❌ Error requesting Android notification permission:', error?.message);
    }
  }

  async initializeFCM(force: boolean = false) {
    // Prevent duplicate initialization unless forced
    if (this.fcmInitialized && !force) {
      if (__DEV__) {
        console.log('ℹ️ FCM: Already initialized, but still checking token...');
      }
      // Always try to get and save token even if already initialized
      // This ensures token is refreshed and saved after login
      try {
        const token = await messaging().getToken();
        if (token) {
          console.log('🔄 FCM: Token refresh check - saving token');
          await this.updateFCMTokenInFirestore(token);
        } else {
          console.warn('⚠️ FCM: No token available during refresh check');
        }
      } catch (error: any) {
        console.warn('⚠️ FCM: Error getting token during refresh check:', error?.message);
      }
      // Still ensure handlers are set up even if already initialized
      if (!this.handlersSetup) {
        this.setupMessageHandlers();
      }
      return;
    }

    try {
      // Request permission
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        console.log('✅ FCM: Notification permission granted');

        // Get FCM token
        const token = await messaging().getToken();
        if (token) {
          console.log('✅ FCM: Token retrieved:', token.substring(0, 20) + '...');
          // Save token if user is logged in
          await this.updateFCMTokenInFirestore(token);
        } else {
          console.warn('⚠️ FCM: No token available');
        }

        // Set up message handlers (only once)
        if (!this.handlersSetup) {
          this.setupMessageHandlers();
        }

        // Mark as initialized
        this.fcmInitialized = true;

        // Handle background messages (must be registered in index.js)
        // This is handled separately in index.js for proper registration
      } else {
        console.warn('⚠️ FCM: Notification permission not granted. Status:', authStatus);
        // Don't mark as initialized if permission denied - allow retry later
        if (force) {
          this.fcmInitialized = false;
          this.handlersSetup = false; // Reset handlers flag to allow retry
        }
      }
    } catch (error: any) {
      console.error('❌ FCM: Error initializing FCM:', error);
      // Don't mark as initialized if there was an error - allow retry
      if (force) {
        this.fcmInitialized = false;
        this.handlersSetup = false; // Reset handlers flag to allow retry
      }
      // Still try to get and save token even if initialization failed
      try {
        const token = await messaging().getToken();
        if (token) {
          console.log('✅ FCM: Token retrieved after error:', token.substring(0, 20) + '...');
          await this.updateFCMTokenInFirestore(token);
        }
      } catch (tokenError) {
        console.warn('⚠️ FCM: Could not get token after error:', tokenError);
      }
      // Don't throw - allow app to continue without notifications
    }
  }

  /**
   * Set up FCM message handlers (token refresh and foreground messages)
   * This is called once during initialization
   */
  private setupMessageHandlers(): void {
    try {
      // Listen for token refresh
      messaging().onTokenRefresh(async refreshedToken => {
        console.log('🔄 FCM: Token refreshed:', refreshedToken.substring(0, 20) + '...');
        // Update token in Firestore user document
        await this.updateFCMTokenInFirestore(refreshedToken);
        });

        // Handle foreground messages
        messaging().onMessage(async remoteMessage => {
          console.log('📱 FCM: Foreground message received:', {
            title: remoteMessage.notification?.title,
            body: remoteMessage.notification?.body,
            data: remoteMessage.data,
          });
          this.handleFCMMessage(remoteMessage);
        });

      // Mark handlers as set up
      this.handlersSetup = true;
      console.log('✅ FCM: Message handlers set up');
    } catch (error: any) {
      console.error('❌ FCM: Error setting up message handlers:', error?.message);
      this.handlersSetup = false; // Allow retry
    }
  }

  handleFCMMessage(remoteMessage: any) {
    const {notification, data} = remoteMessage;

    console.log('📱 FCM: Handling foreground message:', {
      hasNotification: !!notification,
      hasData: !!data,
      type: data?.type,
    });

    if (notification) {
      // Determine channel based on notification type
      let channelId = 'service_requests'; // Default to service requests
      if (data?.type === 'chat') {
        channelId = 'chat-messages';
      } else if (data?.type === 'reminder') {
        channelId = 'general-reminders';
      } else if (data?.type === 'service') {
        channelId = 'service_requests';
      }

      console.log('📱 FCM: Showing local notification:', {
        channelId,
        title: notification.title,
        body: notification.body,
      });

      PushNotification.localNotification({
        channelId,
        title: notification.title || 'HomeServices',
        message: notification.body || '',
        playSound: true,
        soundName: channelId === 'service_requests' ? 'hooter.wav' : 'default',
        userInfo: data || {},
        priority: 'high',
        importance: 'high',
        // Ensure notification is shown even when app is in foreground
        ongoing: false,
        autoCancel: true,
        largeIcon: 'ic_launcher',
        smallIcon: 'ic_notification',
      });
    } else {
      console.warn('⚠️ FCM: Message received but no notification payload');
    }
  }

  async getFCMToken(): Promise<string | null> {
    try {
      const token = await messaging().getToken();
      return token;
    } catch (error) {
      return null;
    }
  }

  scheduleNotification(
    id: string,
    title: string,
    message: string,
    date: Date,
    repeatType?: 'day' | 'week' | 'time',
  ) {
    PushNotification.localNotificationSchedule({
      channelId: 'general-reminders',
      id: id,
      title: title,
      message: message,
      date: date,
      allowWhileIdle: true,
      repeatType: repeatType,
      playSound: true,
      soundName: 'default',
    });
  }

  cancelNotification(id: string) {
    PushNotification.cancelLocalNotification(id);
  }

  cancelAllNotifications() {
    PushNotification.cancelAllLocalNotifications();
  }

  checkPermissions(callback: (permissions: any) => void) {
    PushNotification.checkPermissions(callback);
  }

  requestPermissions() {
    return PushNotification.requestPermissions();
  }

  /**
   * Update FCM token in Firestore for current user
   */
  async updateFCMTokenInFirestore(token: string): Promise<void> {
    try {
      const auth = require('@react-native-firebase/auth').default;
      const firestore = require('@react-native-firebase/firestore').default;
      
      const currentUser = auth().currentUser;
      if (!currentUser) {
        console.log('ℹ️ FCM: No user logged in, skipping token save');
        return;
      }

      console.log('💾 FCM: Saving token for user:', currentUser.uid);
      console.log('📱 FCM Token (first 30 chars):', token.substring(0, 30) + '...');
      console.log('📱 FCM Token (full length):', token.length);

      // Use set with merge: true to create document if it doesn't exist
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .set({
          fcmToken: token,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, {merge: true});

      // Verify token was saved
      const verifyDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();
      
      const savedToken = verifyDoc.data()?.fcmToken;
      if (savedToken === token) {
        console.log('✅ FCM: Token verified and saved to Firestore for user:', currentUser.uid);
      } else {
        console.warn('⚠️ FCM: Token save verification failed. Expected:', token.substring(0, 20), 'Got:', savedToken?.substring(0, 20));
      }

      // Also check if user is a provider and update providers collection
      try {
        const userDoc = await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.role === 'provider') {
            // Also update in providers collection if provider profile exists
            const providerQuery = await firestore()
              .collection('providers')
              .where('email', '==', currentUser.email)
              .limit(1)
              .get();
            
            if (!providerQuery.empty) {
              const providerDoc = providerQuery.docs[0];
              await firestore()
                .collection('providers')
                .doc(providerDoc.id)
                .set({
                  fcmToken: token,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                }, {merge: true});
            }
          }
        }
      } catch (roleError: any) {
        // Silently ignore role check errors - not critical
        console.warn('⚠️ FCM: Error updating provider token:', roleError?.message);
      }
    } catch (error: any) {
      // Log all errors - this is critical for notifications
      const errorCode = error?.code || '';
      const auth = require('@react-native-firebase/auth').default;
      const currentUser = auth().currentUser;
      console.error('❌ FCM: Error saving token to Firestore:', {
        code: errorCode,
        message: error?.message || error,
        userId: currentUser?.uid,
      });
      
      // Retry once after a short delay
      if (errorCode !== 'permission-denied') {
        const retryAuth = require('@react-native-firebase/auth').default;
        const retryCurrentUser = retryAuth().currentUser;
        const retryFirestore = require('@react-native-firebase/firestore').default;
        if (retryCurrentUser) {
          setTimeout(async () => {
            try {
              console.log('🔄 FCM: Retrying token save...');
              await retryFirestore()
                .collection('users')
                .doc(retryCurrentUser.uid)
                .set({
                  fcmToken: token,
                  updatedAt: retryFirestore.FieldValue.serverTimestamp(),
                }, {merge: true});
              console.log('✅ FCM: Token saved on retry');
            } catch (retryError: any) {
              console.error('❌ FCM: Retry also failed:', retryError?.message);
            }
          }, 2000);
        }
      }
    }
  }

  /**
   * Update FCM token in Firestore for provider
   */
  async updateProviderFCMTokenInFirestore(providerId: string, token: string): Promise<void> {
    try {
      const firestore = require('@react-native-firebase/firestore').default;
      
      // Use set with merge: true to create document if it doesn't exist
      await firestore()
        .collection('providers')
        .doc(providerId)
        .set({
          fcmToken: token,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, {merge: true});

      if (__DEV__) {
        console.log('✅ FCM: Provider token saved');
      }
    } catch (error: any) {
      // Only log error, don't crash the app
      const errorCode = error?.code || '';
      if (errorCode !== 'firestore/not-found') {
        console.error('❌ FCM: Error saving provider token:', error?.message);
      } else if (__DEV__) {
        console.warn('⚠️ FCM: Provider document not found');
      }
    }
  }

  /**
   * Initialize and save FCM token for current user
   * Ensures FCM is initialized and token is saved to Firestore
   */
  async initializeAndSaveToken(forceReinit: boolean = false): Promise<string | null> {
    try {
      console.log('🔄 FCM: Starting initializeAndSaveToken, forceReinit:', forceReinit);
      
      // If forcing reinit, reset flags first
      if (forceReinit) {
        console.log('🔄 FCM: Force reinit requested - resetting flags');
        this.fcmInitialized = false;
        this.handlersSetup = false;
      }
      
      // Initialize FCM handlers (force reinit if requested, e.g., after login)
      await this.initializeFCM(forceReinit);
      
      // Get and save token (always try to get fresh token)
      const token = await this.getFCMToken();
      if (token) {
        console.log('✅ FCM: Token retrieved, saving to Firestore...');
        await this.updateFCMTokenInFirestore(token);
        console.log('✅ FCM: Token initialized and saved');
      } else {
        console.warn('⚠️ FCM: No token available to save');
        // Retry after a short delay
        setTimeout(async () => {
          try {
            const retryToken = await this.getFCMToken();
            if (retryToken) {
              console.log('✅ FCM: Token retrieved on retry, saving...');
              await this.updateFCMTokenInFirestore(retryToken);
            }
          } catch (retryError) {
            console.error('❌ FCM: Retry failed:', retryError);
          }
        }, 3000);
      }
      return token;
    } catch (error: any) {
      console.error('❌ FCM: Error in initializeAndSaveToken:', error?.message || error);
      return null;
    }
  }
}

export default new NotificationService();
