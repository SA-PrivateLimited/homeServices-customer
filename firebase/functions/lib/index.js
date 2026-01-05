"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPushNotification = exports.onJobCardUpdated = exports.onJobCardCreated = exports.onPrescriptionCreated = exports.notifyDoctorJoined = exports.updateDoctorStats = exports.sendConsultationReminder = exports.onConsultationBooked = exports.generateAgoraToken = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const agora_access_token_1 = require("agora-access-token");
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
exports.generateAgoraToken = functions.https.onCall(async (data, context) => {
    var _a, _b;
    // Check authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated to generate Agora token");
    }
    const { channelName, uid } = data;
    if (!channelName || !uid) {
        throw new functions.https.HttpsError("invalid-argument", "Missing required parameters: channelName and uid");
    }
    try {
        // Get Agora credentials from environment
        const appId = (_a = functions.config().agora) === null || _a === void 0 ? void 0 : _a.app_id;
        const appCertificate = (_b = functions.config().agora) === null || _b === void 0 ? void 0 : _b.app_certificate;
        if (!appId || !appCertificate) {
            throw new Error("Agora credentials not configured");
        }
        // Token expires in 1 hour
        const expirationTimeInSeconds = 3600;
        const currentTimestamp = Math.floor(Date.now() / 1000);
        const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
        // Generate token
        const token = agora_access_token_1.RtcTokenBuilder.buildTokenWithUid(appId, appCertificate, channelName, parseInt(uid), agora_access_token_1.RtcRole.PUBLISHER, privilegeExpiredTs);
        console.log(`Generated Agora token for channel: ${channelName}, uid: ${uid}`);
        return {
            token,
            appId,
        };
    }
    catch (error) {
        console.error("Error generating Agora token:", error);
        throw new functions.https.HttpsError("internal", "Failed to generate Agora token");
    }
});
/**
 * Send FCM notification when consultation is booked
 *
 * Triggered when a new document is created in 'consultations' collection
 */
exports.onConsultationBooked = functions.firestore
    .document("consultations/{consultationId}")
    .onCreate(async (snap, context) => {
    var _a;
    const consultation = snap.data();
    const { patientId, doctorName, scheduledTime } = consultation;
    try {
        // Get patient's FCM token
        const userDoc = await admin.firestore()
            .collection("users")
            .doc(patientId)
            .get();
        const fcmToken = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
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
    }
    catch (error) {
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
exports.sendConsultationReminder = functions.pubsub
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
            var _a;
            const consultation = doc.data();
            const { patientId, doctorName } = consultation;
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
            const fcmToken = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
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
            await doc.ref.update({ reminderSent: true });
            console.log(`Sent reminder for consultation ${doc.id}`);
        });
        await Promise.all(promises);
        return null;
    }
    catch (error) {
        console.error("Error sending reminders:", error);
        return null;
    }
});
/**
 * Update doctor statistics when consultation is completed
 */
exports.updateDoctorStats = functions.firestore
    .document("consultations/{consultationId}")
    .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    // Check if status changed to 'completed'
    if (before.status !== "completed" && after.status === "completed") {
        const { doctorId } = after;
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
        }
        catch (error) {
            console.error("Error updating doctor stats:", error);
            return null;
        }
    }
    return null;
});
/**
 * Send notification when doctor joins the call
 */
exports.notifyDoctorJoined = functions.https.onCall(async (data, context) => {
    var _a;
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
    }
    const { consultationId } = data;
    try {
        // Get consultation
        const consultationDoc = await admin.firestore()
            .collection("consultations")
            .doc(consultationId)
            .get();
        if (!consultationDoc.exists) {
            throw new functions.https.HttpsError("not-found", "Consultation not found");
        }
        const consultation = consultationDoc.data();
        const { patientId, doctorName } = consultation;
        // Get patient's FCM token
        const userDoc = await admin.firestore()
            .collection("users")
            .doc(patientId)
            .get();
        const fcmToken = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
        if (!fcmToken) {
            console.log(`No FCM token for user ${patientId}`);
            return { success: false };
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
        return { success: true };
    }
    catch (error) {
        console.error("Error sending doctor joined notification:", error);
        throw new functions.https.HttpsError("internal", "Failed to send notification");
    }
});
/**
 * Send notification when prescription is added
 */
exports.onPrescriptionCreated = functions.firestore
    .document("prescriptions/{prescriptionId}")
    .onCreate(async (snap, context) => {
    var _a;
    const prescription = snap.data();
    const { patientId, doctorName, consultationId } = prescription;
    try {
        // Get patient's FCM token
        const userDoc = await admin.firestore()
            .collection("users")
            .doc(patientId)
            .get();
        const fcmToken = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
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
    }
    catch (error) {
        console.error("Error sending prescription notification:", error);
        return null;
    }
});
/**
 * Send notification to customer when job card is created (provider accepts service)
 */
exports.onJobCardCreated = functions.firestore
    .document("jobCards/{jobCardId}")
    .onCreate(async (snap, context) => {
    var _a;
    const jobCard = snap.data();
    const { customerId, providerName, serviceType, consultationId } = jobCard;
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
        const fcmToken = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
        if (!fcmToken) {
            console.log(`No FCM token for customer ${customerId}`);
            return null;
        }
        // Send acceptance notification
        const message = {
            notification: {
                title: "Service Request Accepted",
                body: `${providerName} has accepted your ${serviceType || "service"} request`,
            },
            data: {
                jobCardId: context.params.jobCardId,
                consultationId: consultationId || "",
                type: "service",
                status: "accepted",
            },
            token: fcmToken,
            android: {
                priority: "high",
                notification: {
                    channelId: "service_requests",
                    sound: "default",
                    priority: "high",
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
    }
    catch (error) {
        console.error("Error sending job card acceptance notification:", error);
        return null;
    }
});
/**
 * Send notification to customer when job card status changes
 */
exports.onJobCardUpdated = functions.firestore
    .document("jobCards/{jobCardId}")
    .onUpdate(async (change, context) => {
    var _a;
    const before = change.before.data();
    const after = change.after.data();
    const { customerId, providerName, serviceType, consultationId } = after;
    // Only send notification if status changed
    if (before.status === after.status) {
        return null;
    }
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
        const fcmToken = (_a = userDoc.data()) === null || _a === void 0 ? void 0 : _a.fcmToken;
        if (!fcmToken) {
            console.log(`No FCM token for customer ${customerId}`);
            return null;
        }
        // Determine notification message based on status
        let title = "Service Update";
        let body = "";
        switch (after.status) {
            case "in-progress":
                title = "Service Started";
                body = `${providerName} has started your ${serviceType || "service"}`;
                break;
            case "completed":
                title = "Service Completed";
                body = `${providerName} has completed your ${serviceType || "service"}`;
                break;
            case "cancelled":
                title = "Service Cancelled";
                const reason = after.cancellationReason || "No reason provided";
                body = `${providerName} has cancelled your ${serviceType || "service"}. Reason: ${reason}`;
                break;
            default:
                // Don't send notification for other status changes
                return null;
        }
        // Send status update notification
        const message = {
            notification: {
                title,
                body,
            },
            data: {
                jobCardId: context.params.jobCardId,
                consultationId: consultationId || "",
                type: "service",
                status: after.status,
            },
            token: fcmToken,
            android: {
                priority: "high",
                notification: {
                    channelId: "service_requests",
                    sound: "default",
                    priority: "high",
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
        console.log(`Sent job card status update notification to customer ${customerId}: ${after.status}`);
        return null;
    }
    catch (error) {
        console.error("Error sending job card status update notification:", error);
        return null;
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
exports.sendPushNotification = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "The function must be called while authenticated.");
    }
    const { token, notification, data: notificationData } = data;
    if (!token || !notification) {
        throw new functions.https.HttpsError("invalid-argument", "Token and notification are required.");
    }
    try {
        const message = {
            token: token,
            notification: {
                title: notification.title || "HomeServices",
                body: notification.body || "",
            },
            data: Object.assign(Object.assign({}, notificationData), Object.keys(notificationData || {}).reduce((acc, key) => {
                acc[key] = String(notificationData[key] || "");
                return acc;
            }, {})),
            android: {
                priority: "high",
                notification: {
                    channelId: "consultation-updates",
                    sound: "default",
                    priority: "high",
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
        return { success: true, messageId: response };
    }
    catch (error) {
        console.error("Error sending message:", error);
        throw new functions.https.HttpsError("internal", "Failed to send notification.", error);
    }
});
//# sourceMappingURL=index.js.map