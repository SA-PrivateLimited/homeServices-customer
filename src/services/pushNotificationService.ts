import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type {ServiceRequest} from './api/serviceRequestsApi';
import type {UserRole} from '../types/common';

// Alias for backward compatibility
type Consultation = ServiceRequest;

const COLLECTIONS = {
  USERS: 'users',
  DOCTORS: 'doctors',
  PROVIDERS: 'providers',
};

export interface PushNotificationData {
  title: string;
  body: string;
  type: 'consultation' | 'prescription' | 'reminder' | 'admin' | 'chat' | 'service';
  consultationId?: string;
  prescriptionId?: string;
  status?: string;
  cancellationReason?: string;
  [key: string]: any;
}

/**
 * Push Notification Service
 * Sends push notifications via Firebase Cloud Messaging (FCM)
 * Supports role-based notifications for patients, doctors, and admins
 */
class PushNotificationService {
  /**
   * Send push notification to a specific user by user ID
   */
  async sendToUser(
    userId: string,
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      // Validate userId
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        return;
      }

      // Get user's FCM token from Firestore
      const userDoc = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(userId)
        .get();

      if (!userDoc.exists) {
        return;
      }

      const fcmToken = userDoc.data()?.fcmToken;
      if (!fcmToken) {
        return;
      }

      // Call Cloud Function to send notification
      try {
        const sendNotification = functions().httpsCallable('sendPushNotification');
        await sendNotification({
          token: fcmToken,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: {
            type: notification.type,
            consultationId: notification.consultationId || '',
            prescriptionId: notification.prescriptionId || '',
            ...notification,
          },
        });

      } catch (functionError: any) {
        // If Cloud Function is not available, log warning but don't throw
        // The app will still work, just without push notifications
        // Local notifications will still work
        if (functionError.code === 'functions/not-found' || 
            functionError.message?.includes('NOT_FOUND') ||
            functionError.message?.includes('not found')) {
        } else {
        }
      }
    } catch (error) {
      // Don't throw - notifications are non-critical
    }
  }

  /**
   * Send push notification to a doctor by doctor ID
   */
  async sendToDoctor(
    doctorId: string,
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      // Validate doctorId
      if (!doctorId || typeof doctorId !== 'string' || doctorId.trim() === '') {
        return;
      }

      // Try to get doctor's FCM token from Firestore
      // First try doctors collection, then fallback to users collection
      let fcmToken: string | undefined;
      
      try {
        const doctorDoc = await firestore()
          .collection(COLLECTIONS.PROVIDERS)
          .doc(doctorId)
          .get();

        if (doctorDoc.exists) {
          fcmToken = doctorDoc.data()?.fcmToken;
        }
      } catch (doctorError: any) {
        // If permission denied or doctor not found, try users collection
        if (doctorError.code === 'permission-denied' || !fcmToken) {
          try {
            const userDoc = await firestore()
              .collection(COLLECTIONS.USERS)
              .doc(doctorId)
              .get();

            if (userDoc.exists) {
              fcmToken = userDoc.data()?.fcmToken;
            }
          } catch (userError) {
          }
        } else {
        }
      }

      if (!fcmToken) {
        return;
      }

      // Call Cloud Function to send notification
      try {
        const sendNotification = functions().httpsCallable('sendPushNotification');
        await sendNotification({
          token: fcmToken,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: {
            type: notification.type,
            consultationId: notification.consultationId || '',
            prescriptionId: notification.prescriptionId || '',
            ...notification,
          },
        });

      } catch (functionError: any) {
        // If Cloud Function is not available, log warning but don't throw
        // Local notifications will still work
        if (functionError.code === 'functions/not-found' || 
            functionError.message?.includes('NOT_FOUND') ||
            functionError.message?.includes('not found')) {
        } else {
        }
      }
    } catch (error) {
    }
  }

  /**
   * Send push notification to a provider by provider ID
   */
  async sendToProvider(
    providerId: string,
    notification: PushNotificationData,
  ): Promise<void> {
    // Use sendToDoctor as it already handles providers collection
    await this.sendToDoctor(providerId, notification);
  }

  /**
   * Send push notification to all admins
   */
  async sendToAdmins(notification: PushNotificationData): Promise<void> {
    try {
      // Get all admin users
      const snapshot = await firestore()
        .collection(COLLECTIONS.USERS)
        .where('role', '==', 'admin')
        .get();

      const adminPromises = snapshot.docs.map(async doc => {
        const fcmToken = doc.data()?.fcmToken;
        if (fcmToken) {
          try {
            const sendNotification = functions().httpsCallable('sendPushNotification');
            return sendNotification({
              token: fcmToken,
              notification: {
                title: notification.title,
                body: notification.body,
              },
              data: {
                type: notification.type,
                ...notification,
              },
            });
          } catch (functionError: any) {
            if (functionError.code === 'functions/not-found' || 
                functionError.message?.includes('NOT_FOUND') ||
                functionError.message?.includes('not found')) {
            } else {
            }
            return Promise.resolve();
          }
        }
        return Promise.resolve();
      });

      await Promise.all(adminPromises);
    } catch (error) {
    }
  }

  /**
   * Send push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    notification: PushNotificationData,
  ): Promise<void> {
    const promises = userIds.map(userId => this.sendToUser(userId, notification));
    await Promise.all(promises);
  }

  /**
   * Helper to format scheduled time safely
   */
  private formatScheduledTime(scheduledTime: Date | any): string {
    try {
      if (!scheduledTime) {
        return 'the scheduled time';
      }
      
      let date: Date;
      if (scheduledTime instanceof Date) {
        date = scheduledTime;
      } else if (scheduledTime && typeof scheduledTime === 'object' && 'toDate' in scheduledTime) {
        // Firestore Timestamp
        date = (scheduledTime as any).toDate();
      } else if (typeof scheduledTime === 'string' || typeof scheduledTime === 'number') {
        date = new Date(scheduledTime);
      } else {
        return 'the scheduled time';
      }

      if (isNaN(date.getTime())) {
        return 'the scheduled time';
      }

      return date.toLocaleString();
    } catch (error) {
      return 'the scheduled time';
    }
  }

  /**
   * Notify patient about new consultation booking
   */
  async notifyPatientBooking(consultation: Consultation): Promise<void> {
    if (!consultation.patientId) {
      return;
    }
    
    const formattedTime = this.formatScheduledTime(consultation.scheduledTime);
    await this.sendToUser(consultation.patientId, {
      title: 'Consultation Booked',
      body: `Your consultation with Dr. ${consultation.doctorName} is scheduled for ${formattedTime}`,
      type: 'consultation',
      consultationId: consultation.id,
    });
  }

  /**
   * Notify doctor about new consultation booking
   */
  async notifyDoctorBooking(consultation: Consultation): Promise<void> {
    if (!consultation.doctorId) {
      return;
    }

    const formattedTime = this.formatScheduledTime(consultation.scheduledTime);

    // Build notification message with patient details
    let notificationBody = `${consultation.patientName} has booked a consultation with you on ${formattedTime}`;

    // Add patient phone number if available
    if (consultation.patientPhone) {
      notificationBody += `\nContact: ${consultation.patientPhone}`;
    }

    // Add patient age if available
    if (consultation.patientAge) {
      notificationBody += `\nAge: ${consultation.patientAge} years`;
    }

    await this.sendToDoctor(consultation.doctorId, {
      title: 'New Consultation Booking',
      body: notificationBody,
      type: 'consultation',
      consultationId: consultation.id,
      patientPhone: consultation.patientPhone, // Include in data for easy access
      patientName: consultation.patientName,
      patientAge: consultation.patientAge,
    });
  }

  /**
   * Notify both patient and doctor about consultation status change
   */
  async notifyConsultationStatusChange(
    consultation: Consultation,
    newStatus: string,
  ): Promise<void> {
    const statusMessages: {[key: string]: {title: string; body: string}} = {
      'in-progress': {
        title: 'Consultation Started',
        body: `Your consultation with ${consultation.doctorName} has started`,
      },
      completed: {
        title: 'Consultation Completed',
        body: `Your consultation with ${consultation.doctorName} has been completed`,
      },
      cancelled: {
        title: 'Consultation Cancelled',
        body: `Your consultation with ${consultation.doctorName} has been cancelled`,
      },
    };

    const message = statusMessages[newStatus];
    if (!message) return;

    // Notify patient
    await this.sendToUser(consultation.patientId, {
      title: message.title,
      body: message.body,
      type: 'consultation',
      consultationId: consultation.id,
    });

    // Notify doctor
    await this.sendToDoctor(consultation.doctorId, {
      title: message.title,
      body: `Consultation with ${consultation.patientName} is now ${newStatus}`,
      type: 'consultation',
      consultationId: consultation.id,
    });
  }

  /**
   * Notify patient about new prescription
   */
  async notifyPrescriptionCreated(
    consultation: Consultation,
    prescriptionId: string,
  ): Promise<void> {
    await this.sendToUser(consultation.patientId, {
      title: 'New Prescription',
      body: `Dr. ${consultation.doctorName} has created a prescription for you`,
      type: 'prescription',
      consultationId: consultation.id,
      prescriptionId,
    });
  }

  /**
   * Notify admins about new doctor registration
   */
  async notifyAdminDoctorRegistration(doctorName: string, doctorId: string): Promise<void> {
    await this.sendToAdmins({
      title: 'New Doctor Registration',
      body: `${doctorName} has registered and is pending approval`,
      type: 'admin',
      doctorId,
    });
  }

  /**
   * Notify doctor about approval status
   */
  async notifyDoctorApproval(
    doctorId: string,
    approved: boolean,
  ): Promise<void> {
    const notification: PushNotificationData = {
      title: approved ? 'Account Approved' : 'Account Rejected',
      body: approved
        ? 'Your doctor account has been approved. You can now accept consultations.'
        : 'Your doctor account registration was rejected. Please contact support for more information.',
      type: 'admin',
    };

    await this.sendToDoctor(doctorId, notification);
  }

  /**
   * Notify about consultation reminder
   */
  async notifyConsultationReminder(consultation: Consultation): Promise<void> {
    // Notify patient
    await this.sendToUser(consultation.patientId, {
      title: 'Consultation Reminder',
      body: `Your consultation with Dr. ${consultation.doctorName} starts in 1 hour`,
      type: 'reminder',
      consultationId: consultation.id,
    });

    // Notify doctor
    await this.sendToDoctor(consultation.doctorId, {
      title: 'Consultation Reminder',
      body: `Your consultation with ${consultation.patientName} starts in 1 hour`,
      type: 'reminder',
      consultationId: consultation.id,
    });
  }
}

export default new PushNotificationService();

