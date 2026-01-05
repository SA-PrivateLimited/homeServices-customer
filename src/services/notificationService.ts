import PushNotification, {Importance} from 'react-native-push-notification';
import messaging from '@react-native-firebase/messaging';
import {Platform} from 'react-native';
import type {Consultation} from '../types/consultation';

class NotificationService {
  private fcmInitialized = false;
  private handlersSetup = false;

  constructor() {
    try {
      PushNotification.configure({
        onNotification: function (notification) {
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
      // Medicine Reminders Channel
      PushNotification.createChannel(
        {
          channelId: 'medicine-reminders',
          channelName: 'Medicine Reminders',
          channelDescription: 'Reminders to take your medicine',
          importance: Importance.HIGH,
          vibrate: true,
        },
        () => {},
      );

      // Consultation Reminders Channel
      PushNotification.createChannel(
        {
          channelId: 'consultation-reminders',
          channelName: 'Consultation Reminders',
          channelDescription: 'Reminders for upcoming consultations',
          importance: Importance.HIGH,
          vibrate: true,
          playSound: true,
          soundName: 'default',
        },
        () => {},
      );

      // Consultation Updates Channel
      PushNotification.createChannel(
        {
          channelId: 'consultation-updates',
          channelName: 'Consultation Updates',
          channelDescription: 'Updates about your consultations',
          importance: Importance.HIGH,
          vibrate: true,
          playSound: true,
          soundName: 'default',
        },
        () => {},
      );

      // Chat Messages Channel
      PushNotification.createChannel(
        {
          channelId: 'chat-messages',
          channelName: 'Chat Messages',
          channelDescription: 'New messages from doctors',
          importance: Importance.DEFAULT,
          vibrate: true,
        },
        () => {},
      );

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

    // Initialize FCM
    this.initializeFCM();
  }

  async initializeFCM(force: boolean = false) {
    // Prevent duplicate initialization unless forced
    if (this.fcmInitialized && !force) {
      if (__DEV__) {
        console.log('ℹ️ FCM: Already initialized, skipping');
      }
      // Still try to get and save token even if already initialized
      try {
        const token = await messaging().getToken();
        if (token) {
          await this.updateFCMTokenInFirestore(token);
        }
      } catch (error) {
        // Silent fail - token might not be available
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

        // Listen for token refresh (only set up once)
        // Note: React Native Firebase handlers replace previous ones, but we only want to set up once
        if (!this.handlersSetup) {
          messaging().onTokenRefresh(async refreshedToken => {
            console.log('🔄 FCM: Token refreshed:', refreshedToken.substring(0, 20) + '...');
            // Update token in Firestore user document
            await this.updateFCMTokenInFirestore(refreshedToken);
          });

          // Handle foreground messages (only set up once)
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
      // Don't throw - allow app to continue without notifications
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
      let channelId = 'consultation-updates';
      if (data?.type === 'chat') {
        channelId = 'chat-messages';
      } else if (data?.type === 'reminder') {
        channelId = 'consultation-reminders';
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
        soundName: 'default',
        userInfo: data || {},
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
      channelId: 'medicine-reminders',
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

  // Consultation-specific notifications
  scheduleConsultationReminder(consultation: Consultation) {
    try {
      if (!consultation.scheduledTime) {
        return;
      }

      // Safely convert scheduledTime to Date
      let scheduledDate: Date;
      if (consultation.scheduledTime instanceof Date) {
        scheduledDate = consultation.scheduledTime;
      } else if (typeof consultation.scheduledTime === 'object' && 'toDate' in consultation.scheduledTime) {
        // Firestore Timestamp
        scheduledDate = (consultation.scheduledTime as any).toDate();
      } else {
        scheduledDate = new Date(consultation.scheduledTime);
      }

      if (isNaN(scheduledDate.getTime())) {
        return;
      }

      const reminderTime = new Date(scheduledDate);
      reminderTime.setHours(reminderTime.getHours() - 1); // 1 hour before

      // Only schedule if reminder time is in the future
      if (reminderTime > new Date()) {
        PushNotification.localNotificationSchedule({
          channelId: 'consultation-reminders',
          id: `consultation-reminder-${consultation.id}`,
          title: 'Consultation Reminder',
          message: `Your consultation with Dr. ${consultation.doctorName} starts in 1 hour`,
          date: reminderTime,
          allowWhileIdle: true,
          playSound: true,
          soundName: 'default',
          userInfo: {
            consultationId: consultation.id,
            type: 'reminder',
          },
        });

      } else {
      }
    } catch (error) {
    }
  }

  sendBookingConfirmation(consultation: Consultation) {
    // Format scheduled time safely
    let formattedTime = 'the scheduled time';
    try {
      if (consultation.scheduledTime) {
        let date: Date;
        if (consultation.scheduledTime instanceof Date) {
          date = consultation.scheduledTime;
        } else if (typeof consultation.scheduledTime === 'object' && 'toDate' in consultation.scheduledTime) {
          date = (consultation.scheduledTime as any).toDate();
        } else {
          date = new Date(consultation.scheduledTime);
        }
        if (!isNaN(date.getTime())) {
          formattedTime = date.toLocaleString();
        }
      }
    } catch (error) {
    }

    // Check payment status to determine notification message
    const paymentStatus = consultation.paymentStatus || 'pending';
    const isPaid = paymentStatus === 'paid' || paymentStatus === 'success';
    
    const title = isPaid ? 'Booking Confirmed' : 'Booking Initiated';
    const message = isPaid
      ? `Your consultation with Dr. ${consultation.doctorName} is confirmed for ${formattedTime}`
      : `Your consultation with Dr. ${consultation.doctorName} is scheduled for ${formattedTime}. Please complete the payment to confirm your booking.`;

    PushNotification.localNotification({
      channelId: 'consultation-updates',
      title,
      message,
      playSound: true,
      soundName: 'default',
      userInfo: {
        consultationId: consultation.id,
        type: isPaid ? 'booking-confirmed' : 'booking-initiated',
      },
    });
  }

  sendDoctorJoinedNotification(consultation: Consultation) {
    PushNotification.localNotification({
      channelId: 'consultation-updates',
      title: 'Doctor Joined',
      message: `Dr. ${consultation.doctorName} has joined the consultation`,
      playSound: true,
      soundName: 'default',
      userInfo: {
        consultationId: consultation.id,
        type: 'doctor-joined',
      },
    });
  }

  sendPrescriptionNotification(consultationId: string, doctorName: string) {
    PushNotification.localNotification({
      channelId: 'consultation-updates',
      title: 'Prescription Received',
      message: `You have received a new prescription from Dr. ${doctorName}`,
      playSound: true,
      soundName: 'default',
      userInfo: {
        consultationId,
        type: 'prescription-received',
      },
    });
  }

  sendChatMessageNotification(
    consultationId: string,
    senderName: string,
    message: string,
  ) {
    PushNotification.localNotification({
      channelId: 'chat-messages',
      title: senderName,
      message: message.length > 100 ? `${message.substring(0, 100)}...` : message,
      playSound: true,
      soundName: 'default',
      userInfo: {
        consultationId,
        type: 'chat',
      },
    });
  }

  cancelConsultationReminder(consultationId: string) {
    PushNotification.cancelLocalNotification(`consultation-reminder-${consultationId}`);
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
        if (__DEV__) {
          console.log('ℹ️ FCM: No user logged in, skipping token save');
        }
        return;
      }

      if (__DEV__) {
        console.log('💾 FCM: Saving token for user:', currentUser.uid);
      }

      // Use set with merge: true to create document if it doesn't exist
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .set({
          fcmToken: token,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, {merge: true});

      if (__DEV__) {
        console.log('✅ FCM: Token saved to Firestore for user:', currentUser.uid);
      }

      // Also check if user is a doctor and update doctors collection
      try {
        const userDoc = await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();
        
        if (userDoc.exists) {
          const userData = userDoc.data();
          if (userData?.role === 'provider') {
            // Also update in providers collection if provider profile exists
            const doctorQuery = await firestore()
              .collection('providers')
              .where('email', '==', currentUser.email)
              .limit(1)
              .get();
            
            if (!doctorQuery.empty) {
              const doctorDoc = doctorQuery.docs[0];
              await firestore()
                .collection('providers')
                .doc(doctorDoc.id)
                .set({
                  fcmToken: token,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                }, {merge: true});
            }
          }
        }
      } catch (roleError: any) {
        // Silently ignore role check errors - not critical
        if (__DEV__) {
          console.warn('⚠️ FCM: Error updating provider token:', roleError?.message);
        }
      }

      if (__DEV__) {
        console.log('✅ FCM: Token also saved to providers collection');
      }
    } catch (error: any) {
      // Only log error, don't crash the app
      const errorCode = error?.code || '';
      if (errorCode !== 'firestore/not-found') {
        console.error('❌ FCM: Error saving token to Firestore:', error?.message || error);
      } else if (__DEV__) {
        console.log('ℹ️ FCM: User document not found (will be created on next save)');
      }
    }
  }

  /**
   * Update FCM token in Firestore for doctor
   */
  async updateDoctorFCMTokenInFirestore(doctorId: string, token: string): Promise<void> {
    try {
      const firestore = require('@react-native-firebase/firestore').default;
      
      // Use set with merge: true to create document if it doesn't exist
      await firestore()
        .collection('providers')
        .doc(doctorId)
        .set({
          fcmToken: token,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        }, {merge: true});

      if (__DEV__) {
      }
    } catch (error: any) {
      // Only log error, don't crash the app
      const errorCode = error?.code || '';
      if (errorCode !== 'firestore/not-found') {
      } else if (__DEV__) {
      }
    }
  }

  /**
   * Initialize and save FCM token for current user
   * Ensures FCM is initialized and token is saved to Firestore
   */
  async initializeAndSaveToken(forceReinit: boolean = false): Promise<string | null> {
    try {
      // Initialize FCM handlers (force reinit if requested, e.g., after login)
      await this.initializeFCM(forceReinit);
      
      // Get and save token (always try to get fresh token)
      const token = await this.getFCMToken();
      if (token) {
        await this.updateFCMTokenInFirestore(token);
        if (__DEV__) {
          console.log('✅ FCM: Token initialized and saved');
        }
      } else {
        if (__DEV__) {
          console.warn('⚠️ FCM: No token available to save');
        }
      }
      return token;
    } catch (error: any) {
      console.error('❌ FCM: Error in initializeAndSaveToken:', error?.message || error);
      return null;
    }
  }
}

export default new NotificationService();
