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
    let currentUser = auth().currentUser;
    if (!currentUser) {
      // Wait for auth state to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      currentUser = auth().currentUser;
      if (!currentUser) {
        throw new Error('User must be logged in to send test notification. Please log in and try again.');
      }
    }
    
    // Ensure auth token is fresh - get the ID token to force token refresh
    try {
      const idToken = await currentUser.getIdToken(true); // Force refresh
      console.log('✅ Auth token refreshed, user authenticated:', currentUser.uid);
    } catch (tokenError) {
      console.warn('⚠️ Could not refresh auth token:', tokenError);
      // Continue anyway - Firebase Functions SDK should handle auth
    }
    
    // Get FCM token
    const fcmToken = await messaging().getToken();
    if (!fcmToken) {
      throw new Error('FCM token not available. Please ensure notifications are enabled in app settings.');
    }
    
    console.log('✅ FCM token retrieved:', fcmToken.substring(0, 30) + '...');
    
    // Get a fresh Functions instance to ensure it has the latest auth context
    // Firebase Functions SDK automatically includes auth token when user is logged in
    const functionsInstance = functions();
    
    // Use the dedicated sendTestNotification function if available, otherwise fallback to sendPushNotification
    let sendNotification;
    try {
      sendNotification = functionsInstance.httpsCallable('sendTestNotification');
      console.log('📞 Calling Cloud Function: sendTestNotification');
      const result = await sendNotification({
        message: message || 'Test notification from HomeServices app',
      });
      console.log('✅ Test notification sent:', result.data);
      return result.data;
    } catch (testError: any) {
      // If sendTestNotification doesn't exist, fallback to sendPushNotification
      if (testError?.code === 'functions/not-found' || testError?.message?.includes('NOT_FOUND')) {
        console.log('📞 sendTestNotification not found, using sendPushNotification');
        sendNotification = functionsInstance.httpsCallable('sendPushNotification');
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
      }
      throw testError;
    }
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

