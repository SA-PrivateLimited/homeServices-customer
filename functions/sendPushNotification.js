/**
 * Firebase Cloud Function: sendPushNotification
 * 
 * This function sends push notifications via Firebase Cloud Messaging (FCM)
 * 
 * To deploy this function:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Initialize: firebase init functions (select JavaScript)
 * 4. Deploy: firebase deploy --only functions
 * 
 * Note: This is an example. You need to set up Firebase Functions in your project.
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Cloud Function to send push notification
 * 
 * Call this function from your React Native app:
 * const sendNotification = functions().httpsCallable('sendPushNotification');
 * await sendNotification({
 *   token: 'FCM_TOKEN',
 *   notification: { title: 'Title', body: 'Body' },
 *   data: { type: 'consultation', consultationId: '123' }
 * });
 */
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication (optional - remove if you want to allow unauthenticated calls)
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.',
    );
  }

  const {token, notification, data: notificationData} = data;

  if (!token || !notification) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Token and notification are required.',
    );
  }

  try {
    const message = {
      token: token,
      notification: {
        title: notification.title || 'HomeServices',
        body: notification.body || '',
      },
      data: {
        ...notificationData,
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(notificationData || {}).reduce((acc, key) => {
          acc[key] = String(notificationData[key] || '');
          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'consultation-updates',
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log('Successfully sent message:', response);
    return {success: true, messageId: response};
  } catch (error) {
    console.error('Error sending message:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to send notification.',
      error,
    );
  }
});

/**
 * Alternative: Send notification to multiple tokens
 */
exports.sendPushNotificationToMultiple = functions.https.onCall(
  async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'The function must be called while authenticated.',
      );
    }

    const {tokens, notification, data: notificationData} = data;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Tokens array is required.',
      );
    }

    try {
      const message = {
        notification: {
          title: notification.title || 'HomeServices',
          body: notification.body || '',
        },
        data: {
          ...notificationData,
          ...Object.keys(notificationData || {}).reduce((acc, key) => {
            acc[key] = String(notificationData[key] || '');
            return acc;
          }, {}),
        },
        android: {
          priority: 'high',
          notification: {
            channelId: 'consultation-updates',
            sound: 'default',
            priority: 'high',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
            },
          },
        },
        tokens: tokens,
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      console.log('Successfully sent messages:', response);
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
      };
    } catch (error) {
      console.error('Error sending messages:', error);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to send notifications.',
        error,
      );
    }
  },
);

