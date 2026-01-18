import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {RtcTokenBuilder, RtcRole} from "agora-access-token";

// Initialize Firebase Admin
admin.initializeApp();

/**
 * Generate Agora RTC Token for video calls
 *
 * Call this function when starting a video consultation
 *
 * Request: { channelName: string, uid: string }
 * Response: { token: string, appId: string }
 */
export const generateAgoraToken = functions.https.onCall(async (data, context) => {
  // Check authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated to generate Agora token"
    );
  }

  const {channelName, uid} = data;

  if (!channelName || !uid) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Missing required parameters: channelName and uid"
    );
  }

  try {
    // Get Agora credentials from environment
    const appId = functions.config().agora?.app_id;
    const appCertificate = functions.config().agora?.app_certificate;

    if (!appId || !appCertificate) {
      throw new Error("Agora credentials not configured");
    }

    // Token expires in 1 hour
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Generate token
    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      parseInt(uid),
      RtcRole.PUBLISHER,
      privilegeExpiredTs
    );

    console.log(`Generated Agora token for channel: ${channelName}, uid: ${uid}`);

    return {
      token,
      appId,
    };
  } catch (error) {
    console.error("Error generating Agora token:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to generate Agora token"
    );
  }
});

/**
 * Send FCM notification when consultation is booked
 *
 * Triggered when a new document is created in 'consultations' collection
 */
export const onConsultationBooked = functions.firestore
  .document("consultations/{consultationId}")
  .onCreate(async (snap, context) => {
    const consultation = snap.data();
    const {patientId, doctorName, scheduledTime} = consultation;

    try {
      // Get patient's FCM token
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(patientId)
        .get();

      const fcmToken = userDoc.data()?.fcmToken;

      if (!fcmToken) {
        console.log(`No FCM token for user ${patientId}`);
        return null;
      }

      // Send booking confirmation notification
      const message = {
        notification: {
          title: "Booking Confirmed",
          body: `Your consultation with Dr. ${doctorName} is confirmed for ${new Date(scheduledTime.toDate()).toLocaleString()}`,
        },
        data: {
          consultationId: context.params.consultationId,
          type: "booking-confirmed",
        },
        token: fcmToken,
      };

      await admin.messaging().send(message);
      console.log(`Sent booking confirmation to user ${patientId}`);

      return null;
    } catch (error) {
      console.error("Error sending booking notification:", error);
      return null;
    }
  });

/**
 * Schedule appointment reminder
 *
 * Triggered 1 hour before consultation
 * Uses Firebase Cloud Tasks or Pub/Sub for scheduling
 */
export const sendConsultationReminder = functions.pubsub
  .schedule("every 10 minutes")
  .onRun(async (context) => {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    try {
      // Find consultations starting in the next 10 minutes
      const consultationsSnapshot = await admin.firestore()
        .collection("consultations")
        .where("status", "==", "scheduled")
        .where("scheduledTime", ">=", now)
        .where("scheduledTime", "<=", oneHourLater)
        .get();

      const promises = consultationsSnapshot.docs.map(async (doc) => {
        const consultation = doc.data();
        const {patientId, doctorName} = consultation;

        // Check if reminder already sent
        const reminderSent = consultation.reminderSent || false;
        if (reminderSent) {
          return;
        }

        // Get patient's FCM token
        const userDoc = await admin.firestore()
          .collection("users")
          .doc(patientId)
          .get();

        const fcmToken = userDoc.data()?.fcmToken;

        if (!fcmToken) {
          console.log(`No FCM token for user ${patientId}`);
          return;
        }

        // Send reminder
        const message = {
          notification: {
            title: "Consultation Reminder",
            body: `Your consultation with Dr. ${doctorName} starts soon`,
          },
          data: {
            consultationId: doc.id,
            type: "reminder",
          },
          token: fcmToken,
        };

        await admin.messaging().send(message);

        // Mark reminder as sent
        await doc.ref.update({reminderSent: true});

        console.log(`Sent reminder for consultation ${doc.id}`);
      });

      await Promise.all(promises);
      return null;
    } catch (error) {
      console.error("Error sending reminders:", error);
      return null;
    }
  });

/**
 * Update doctor statistics when consultation is completed
 */
export const updateDoctorStats = functions.firestore
  .document("consultations/{consultationId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // Check if status changed to 'completed'
    if (before.status !== "completed" && after.status === "completed") {
      const {doctorId} = after;

      try {
        const doctorRef = admin.firestore()
          .collection("doctors")
          .doc(doctorId);

        // Increment total consultations
        await doctorRef.update({
          totalConsultations: admin.firestore.FieldValue.increment(1),
        });

        console.log(`Updated stats for doctor ${doctorId}`);
        return null;
      } catch (error) {
        console.error("Error updating doctor stats:", error);
        return null;
      }
    }

    return null;
  });

/**
 * Send notification when doctor joins the call
 */
export const notifyDoctorJoined = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "User must be authenticated"
    );
  }

  const {consultationId} = data;

  try {
    // Get consultation
    const consultationDoc = await admin.firestore()
      .collection("consultations")
      .doc(consultationId)
      .get();

    if (!consultationDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "Consultation not found"
      );
    }

    const consultation = consultationDoc.data();
    const {patientId, doctorName} = consultation!;

    // Get patient's FCM token
    const userDoc = await admin.firestore()
      .collection("users")
      .doc(patientId)
      .get();

    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      console.log(`No FCM token for user ${patientId}`);
      return {success: false};
    }

    // Send notification
    const message = {
      notification: {
        title: "Doctor Joined",
        body: `Dr. ${doctorName} has joined the consultation`,
      },
      data: {
        consultationId,
        type: "doctor-joined",
      },
      token: fcmToken,
    };

    await admin.messaging().send(message);
    console.log(`Sent doctor joined notification for consultation ${consultationId}`);

    return {success: true};
  } catch (error) {
    console.error("Error sending doctor joined notification:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send notification"
    );
  }
});

/**
 * Send notification when prescription is added
 */
export const onPrescriptionCreated = functions.firestore
  .document("prescriptions/{prescriptionId}")
  .onCreate(async (snap, context) => {
    const prescription = snap.data();
    const {patientId, doctorName, consultationId} = prescription;

    try {
      // Get patient's FCM token
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(patientId)
        .get();

      const fcmToken = userDoc.data()?.fcmToken;

      if (!fcmToken) {
        console.log(`No FCM token for user ${patientId}`);
        return null;
      }

      // Send prescription notification
      const message = {
        notification: {
          title: "Prescription Received",
          body: `You have received a new prescription from Dr. ${doctorName}`,
        },
        data: {
          consultationId,
          prescriptionId: context.params.prescriptionId,
          type: "prescription-received",
        },
        token: fcmToken,
      };

      await admin.messaging().send(message);
      console.log(`Sent prescription notification to user ${patientId}`);

      return null;
    } catch (error) {
      console.error("Error sending prescription notification:", error);
      return null;
    }
  });

/**
 * Send notification to customer when job card is created (provider accepts service)
 */
export const onJobCardCreated = functions.firestore
  .document("jobCards/{jobCardId}")
  .onCreate(async (snap, context) => {
    const jobCard = snap.data();
    const {customerId, providerName, serviceType, consultationId, customerPhone, problem} = jobCard;

    if (!customerId) {
      console.log("No customerId in job card");
      return null;
    }

    try {
      // Get customer's FCM token
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(customerId)
        .get();

      const fcmToken = userDoc.data()?.fcmToken;

      if (!fcmToken) {
        console.log(`No FCM token for customer ${customerId}`);
        return null;
      }

      // Build descriptive notification body with phone and problem
      let body = `${providerName} has accepted your ${serviceType || "service"} request`;
      if (customerPhone) {
        body += `. Customer Phone: ${customerPhone}`;
      }
      if (problem) {
        const problemText = problem.length > 100 ? problem.substring(0, 100) + '...' : problem;
        body += `. Problem: ${problemText}`;
      }

      // Send acceptance notification
      const message = {
        notification: {
          title: "Service Request Accepted",
          body: body,
        },
        data: {
          jobCardId: context.params.jobCardId,
          consultationId: consultationId || "",
          type: "service",
          status: "accepted",
        },
        token: fcmToken,
        android: {
          priority: "high" as const,
          notification: {
            channelId: "service_requests",
            sound: "hooter.wav",
            priority: "high" as const,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
            },
          },
        },
      };

      await admin.messaging().send(message);
      console.log(`Sent job card acceptance notification to customer ${customerId}`);

      return null;
    } catch (error) {
      console.error("Error sending job card acceptance notification:", error);
      return null;
    }
  });

/**
 * Send notification to customer when job card status changes
 */
export const onJobCardUpdated = functions.firestore
  .document("jobCards/{jobCardId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const {customerId, providerName, serviceType, consultationId, customerPhone, problem} = after;

    console.log(`🔄 onJobCardUpdated triggered for jobCard ${context.params.jobCardId}:`, {
      beforeStatus: before.status,
      afterStatus: after.status,
      customerId,
      providerName,
      serviceType,
    });

    // Only send notification if status changed
    if (before.status === after.status) {
      console.log(`ℹ️ Status unchanged (${after.status}), skipping notification`);
      return null;
    }

    if (!customerId) {
      console.log(`❌ No customerId in job card ${context.params.jobCardId}`);
      return null;
    }

    try {
      // Get customer's FCM token
      const userDoc = await admin.firestore()
        .collection("users")
        .doc(customerId)
        .get();

      if (!userDoc.exists) {
        console.log(`❌ User document not found for customer ${customerId}`);
        return null;
      }

      const userData = userDoc.data();
      const fcmToken = userData?.fcmToken;

      if (!fcmToken) {
        console.log(`❌ No FCM token for customer ${customerId}`);
        console.log(`User data keys: ${Object.keys(userData || {}).join(', ')}`);
        console.log(`User document exists: ${userDoc.exists}`);
        console.log(`User data: ${JSON.stringify(userData, null, 2)}`);
        console.log(`💡 Customer needs to log in to HomeServices app to receive notifications`);
        console.log(`💡 Customer should ensure notifications are enabled in app settings`);
        return null;
      }

      // Validate token format (FCM tokens are typically long strings)
      if (typeof fcmToken !== 'string' || fcmToken.length < 50) {
        console.log(`⚠️ Invalid FCM token format for customer ${customerId}`);
        console.log(`Token length: ${fcmToken?.length || 0}, Type: ${typeof fcmToken}`);
        console.log(`Token preview: ${fcmToken?.substring(0, 50) || 'N/A'}...`);
        return null;
      }

      console.log(`✅ Found FCM token for customer ${customerId}`);
      console.log(`Token length: ${fcmToken.length}, Token preview: ${fcmToken.substring(0, 30)}...`);

      // Helper function to append customer phone and problem to notification body
      const appendDetails = (baseBody: string): string => {
        let enhancedBody = baseBody;
        if (customerPhone) {
          enhancedBody += `. Phone: ${customerPhone}`;
        }
        if (problem) {
          const problemText = problem.length > 80 ? problem.substring(0, 80) + '...' : problem;
          enhancedBody += `. Problem: ${problemText}`;
        }
        return enhancedBody;
      };

      // Determine notification message based on status
      let title = "Service Update";
      let body = "";
      const notificationData: any = {
        jobCardId: context.params.jobCardId,
        consultationId: consultationId || "",
        type: "service",
        status: after.status,
      };
      
      switch (after.status) {
        case "in-progress":
          title = "Service Started";
          body = `${providerName} has started your ${serviceType || "service"}`;
          // Include PIN if available
          if (after.taskPIN) {
            notificationData.pin = after.taskPIN;
            body += `. Your verification PIN: ${after.taskPIN}`;
          }
          body = appendDetails(body);
          break;
        case "completed":
          title = "Service Completed";
          body = `${providerName} has completed your ${serviceType || "service"}`;
          body = appendDetails(body);
          break;
        case "cancelled":
          title = "Service Cancelled";
          const reason = after.cancellationReason || "No reason provided";
          body = `${providerName} has cancelled your ${serviceType || "service"}. Reason: ${reason}`;
          body = appendDetails(body);
          break;
        default:
          // Don't send notification for other status changes
          return null;
      }

      // Convert all data values to strings (FCM requirement)
      const stringifiedData: {[key: string]: string} = {};
      for (const [key, value] of Object.entries(notificationData)) {
        stringifiedData[key] = String(value || '');
      }

      // Send status update notification
      // Note: For Android, we need both notification and data payloads
      // The notification payload shows the notification, data payload is for app handling
      const message = {
        notification: {
          title,
          body,
        },
        data: stringifiedData,
        token: fcmToken,
        android: {
          priority: "high" as const,
          notification: {
            channelId: "service_requests",
            sound: "hooter.wav",
            priority: "high" as const,
            // Ensure notification is shown even when app is in foreground
            defaultSound: true,
            defaultVibrateTimings: true,
            defaultLightSettings: true,
          },
        },
        apns: {
          payload: {
            aps: {
              sound: "default",
              badge: 1,
              contentAvailable: true, // Enable background notification handling
            },
          },
        },
        // Web push configuration (if needed)
        webpush: {
          notification: {
            title,
            body,
            icon: "/icon.png",
          },
        },
      };

      console.log(`📤 Sending notification:`, {
        customerId,
        status: after.status,
        title,
        body,
        hasPIN: !!after.taskPIN,
        token: fcmToken.substring(0, 30) + '...',
      });

      const response = await admin.messaging().send(message);
      console.log(`✅ Successfully sent job card status update notification to customer ${customerId}: ${after.status}`);
      console.log(`📱 FCM Message ID: ${response}`);
      console.log(`📋 Notification details:`, {
        customerId,
        jobCardId: context.params.jobCardId,
        status: after.status,
        title,
        body,
        hasPIN: !!after.taskPIN,
        tokenLength: fcmToken.length,
        messageId: response,
      });

      return null;
    } catch (error: any) {
      console.error("❌ Error sending job card status update notification:", {
        error: error.message || error,
        code: error.code,
        customerId,
        status: after.status,
        jobCardId: context.params.jobCardId,
        stack: error.stack,
      });
      
      // If it's an invalid token error, log it and optionally remove invalid token
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        console.log(`⚠️ Invalid or unregistered FCM token for customer ${customerId}. Token may need to be refreshed.`);
        console.log(`💡 Customer should: 1) Log out and log back in, 2) Ensure notifications are enabled, 3) Check app permissions`);
        // Optionally: Remove invalid token from Firestore
        try {
          await admin.firestore()
            .collection("users")
            .doc(customerId)
            .update({
              fcmToken: admin.firestore.FieldValue.delete(),
            });
          console.log(`🗑️ Removed invalid FCM token from user ${customerId}`);
        } catch (deleteError) {
          console.error(`Failed to remove invalid token:`, deleteError);
        }
      } else if (error.code === 'messaging/invalid-argument') {
        console.error(`⚠️ Invalid notification payload. Check message structure.`);
        console.error(`Message structure:`, JSON.stringify(message, null, 2));
      } else if (error.code === 'messaging/authentication-error') {
        console.error(`⚠️ FCM authentication error. Check Firebase project configuration.`);
      }
      
      return null;
    }
  });

/**
 * Send test notification to current user (Callable Function)
 * Useful for testing FCM setup
 * 
 * Call this function from your React Native app:
 * const sendTest = functions().httpsCallable('sendTestNotification');
 * await sendTest({ message: 'Test notification message' });
 */
export const sendTestNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const userId = context.auth.uid;
  const testMessage = data?.message || "This is a test notification from HomeServices";

  try {
    // Get user's FCM token
    const userDoc = await admin.firestore()
      .collection("users")
      .doc(userId)
      .get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError(
        "not-found",
        "User document not found"
      );
    }

    const fcmToken = userDoc.data()?.fcmToken;

    if (!fcmToken) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "No FCM token found. Please ensure notifications are enabled in the app."
      );
    }

    // Send test notification
    const message = {
      notification: {
        title: "Test Notification",
        body: testMessage,
      },
      data: {
        type: "test",
        timestamp: new Date().toISOString(),
      },
      token: fcmToken,
      android: {
        priority: "high" as const,
        notification: {
          channelId: "service_requests",
          sound: "hooter.wav",
          priority: "high" as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`✅ Test notification sent to user ${userId}, message ID: ${response}`);

    return {
      success: true,
      messageId: response,
      message: "Test notification sent successfully",
    };
  } catch (error: any) {
    console.error("Error sending test notification:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send test notification",
      error
    );
  }
});

/**
 * Send push notification via FCM (Callable Function)
 * 
 * Call this function from your React Native app:
 * const sendNotification = functions().httpsCallable('sendPushNotification');
 * await sendNotification({
 *   token: 'FCM_TOKEN',
 *   notification: { title: 'Title', body: 'Body' },
 *   data: { type: 'consultation', consultationId: '123' }
 * });
 */
export const sendPushNotification = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "The function must be called while authenticated."
    );
  }

  const {token, notification, data: notificationData} = data;

  if (!token || !notification) {
    throw new functions.https.HttpsError(
      "invalid-argument",
      "Token and notification are required."
    );
  }

  try {
    const message = {
      token: token,
      notification: {
        title: notification.title || "HomeServices",
        body: notification.body || "",
      },
      data: {
        ...notificationData,
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(notificationData || {}).reduce((acc: any, key) => {
          acc[key] = String(notificationData[key] || "");
          return acc;
        }, {}),
      },
      android: {
        priority: "high" as const,
        notification: {
          channelId: "consultation-updates",
          sound: "default",
          priority: "high" as const,
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log("Successfully sent message:", response);
    return {success: true, messageId: response};
  } catch (error) {
    console.error("Error sending message:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to send notification.",
      error
    );
  }
});
