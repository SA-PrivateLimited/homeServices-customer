/**
 * Script to send a test notification to a specific user
 * 
 * Usage:
 * node scripts/sendTestNotification.js <userId> [message]
 * 
 * Example:
 * node scripts/sendTestNotification.js abc123 "Hello, this is a test!"
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../firebase/serviceAccountKey.json');

try {
  // Try to initialize with service account key if it exists
  if (require('fs').existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } else {
    // Use default credentials (if running on Firebase server or with gcloud auth)
    admin.initializeApp();
  }
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
  console.log('Make sure you have Firebase Admin SDK set up or serviceAccountKey.json in firebase/ directory');
  process.exit(1);
}

const userId = process.argv[2];
const testMessage = process.argv[3] || 'This is a test notification from HomeServices!';

if (!userId) {
  console.error('❌ Error: User ID is required');
  console.log('Usage: node scripts/sendTestNotification.js <userId> [message]');
  process.exit(1);
}

async function sendTestNotification() {
  try {
    console.log(`📤 Sending test notification to user: ${userId}`);
    console.log(`📝 Message: ${testMessage}`);

    // Get user's FCM token
    const userDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      console.error(`❌ User document not found: ${userId}`);
      process.exit(1);
    }

    const userData = userDoc.data();
    const fcmToken = userData?.fcmToken;

    if (!fcmToken) {
      console.error(`❌ No FCM token found for user ${userId}`);
      console.log('💡 User needs to log in to the HomeServices app to receive notifications');
      process.exit(1);
    }

    console.log(`✅ Found FCM token: ${fcmToken.substring(0, 30)}...`);

    // Send test notification
    const message = {
      notification: {
        title: 'Test Notification',
        body: testMessage,
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      token: fcmToken,
      android: {
        priority: 'high',
        notification: {
          channelId: 'service_requests',
          sound: 'hooter.wav',
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
    console.log(`✅ Test notification sent successfully!`);
    console.log(`📱 FCM Message ID: ${response}`);
    console.log(`👤 User: ${userId}`);
    console.log(`📝 Message: ${testMessage}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error sending test notification:', error);
    if (error.code === 'messaging/invalid-registration-token') {
      console.log('💡 The FCM token is invalid. User may need to log in again.');
    }
    process.exit(1);
  }
}

sendTestNotification();

