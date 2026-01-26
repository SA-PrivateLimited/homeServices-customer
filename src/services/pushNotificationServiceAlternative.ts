/**
 * Alternative Push Notification Service
 * Uses a simple Express server instead of Firebase Cloud Functions
 * 
 * This avoids the need for Firebase Blaze plan!
 * 
 * Setup:
 * 1. Deploy the server from /server directory to Railway/Render/Fly.io (free)
 * 2. Set SERVER_URL environment variable or update the constant below
 * 3. Replace pushNotificationService imports with this file
 */

import type {ServiceRequest} from './api/serviceRequestsApi';
import type {UserRole} from '../types/common';

// Alias for backward compatibility
type Consultation = ServiceRequest;

const COLLECTIONS = {
  USERS: 'users',
  DOCTORS: 'doctors',
};

// Update this with your deployed server URL
// Example: 'https://homeservices-push.railway.app'
const SERVER_URL = process.env.PUSH_NOTIFICATION_SERVER_URL || 'https://your-server.railway.app';

export interface PushNotificationData {
  title: string;
  body: string;
  type: 'consultation' | 'prescription' | 'reminder' | 'admin' | 'chat';
  consultationId?: string;
  prescriptionId?: string;
  [key: string]: any;
}

/**
 * Alternative Push Notification Service
 * Sends push notifications via a simple Express server (free hosting)
 */
class PushNotificationServiceAlternative {
  /**
   * Send notification to server endpoint
   */
  private async sendToServer(
    token: string,
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      const response = await fetch(`${SERVER_URL}/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          notification: {
            title: notification.title,
            body: notification.body,
          },
          data: notification,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send notification');
      }

      const result = await response.json();
    } catch (error: any) {
      // Don't throw - notifications are non-critical
    }
  }

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
      const firestore = require('@react-native-firebase/firestore').default;
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

      // Send via server
      await this.sendToServer(fcmToken, notification);
    } catch (error) {
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

      const firestore = require('@react-native-firebase/firestore').default;
      let fcmToken: string | undefined;

      // Try doctors collection first
      try {
        const doctorDoc = await firestore()
          .collection(COLLECTIONS.PROVIDERS)
          .doc(doctorId)
          .get();

        if (doctorDoc.exists) {
          fcmToken = doctorDoc.data()?.fcmToken;
        }
      } catch (doctorError: any) {
        // Fallback to users collection
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
        }
      }

      if (!fcmToken) {
        return;
      }

      // Send via server
      await this.sendToServer(fcmToken, notification);
    } catch (error) {
    }
  }

  /**
   * Send push notification to all admins
   */
  async sendToAdmins(notification: PushNotificationData): Promise<void> {
    try {
      const firestore = require('@react-native-firebase/firestore').default;
      const snapshot = await firestore()
        .collection(COLLECTIONS.USERS)
        .where('role', '==', 'admin')
        .get();

      const adminPromises = snapshot.docs.map(async doc => {
        const fcmToken = doc.data()?.fcmToken;
        if (fcmToken) {
          return this.sendToServer(fcmToken, notification);
        }
        return Promise.resolve();
      });

      await Promise.all(adminPromises);
    } catch (error) {
    }
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
    await this.sendToDoctor(consultation.doctorId, {
      title: 'New Consultation Booking',
      body: `${consultation.patientName} has booked a consultation with you on ${formattedTime}`,
      type: 'consultation',
      consultationId: consultation.id,
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

export default new PushNotificationServiceAlternative();


