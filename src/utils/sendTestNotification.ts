/**
 * Utility function to send a test notification from the app
 * Uses the existing sendPushNotification function as a workaround
 * until sendTestNotification is deployed
 */

import functions from '@react-native-firebase/functions';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';

export const sendTestNotification = async (message?: string): Promise<void> => {
  try {
    console.log('📤 Sending test notification...');
    
    // Wait for auth to be ready and verify user is logged in
    const currentUser = auth().currentUser;
    if (!currentUser) {
      // Wait a bit for auth state to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      const retryUser = auth().currentUser;
      if (!retryUser) {
        throw new Error('User must be logged in to send test notification. Please log in and try again.');
      }
    }
    
    console.log('✅ User authenticated:', currentUser?.uid);
    
    // Get FCM token
    const fcmToken = await messaging().getToken();
    if (!fcmToken) {
      throw new Error('FCM token not available. Please ensure notifications are enabled in app settings.');
    }
    
    console.log('✅ FCM token retrieved:', fcmToken.substring(0, 30) + '...');
    
    // Use the existing sendPushNotification function
    // Firebase Functions automatically includes auth token when user is logged in
    const sendNotification = functions().httpsCallable('sendPushNotification');
    
    console.log('📞 Calling Cloud Function: sendPushNotification');
    const result = await sendNotification({
      token: fcmToken,
      notification: {
        title: 'Test Notification',
        body: message || 'Test notification from HomeServices app',
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
    });
    
    console.log('✅ Test notification sent:', result.data);
    return result.data;
  } catch (error: any) {
    console.error('❌ Error sending test notification:', {
      code: error?.code,
      message: error?.message,
      details: error?.details,
      fullError: error,
    });
    
    // Provide user-friendly error messages
    if (error?.code === 'unauthenticated' || error?.message?.includes('UNAUTHENTICATED')) {
      throw new Error('Authentication failed. Please log out and log back in, then try again.');
    } else if (error?.code === 'functions/not-found' || error?.message?.includes('NOT_FOUND')) {
      throw new Error('Notification service not available. Please try again later.');
    } else if (error?.message) {
      throw new Error(error.message);
    }
    
    throw error;
  }
};

export default sendTestNotification;

