/**
 * OneSignal Push Notification Service
 * 
 * Free alternative to Firebase Cloud Functions
 * - Free tier: 10,000 subscribers, unlimited notifications
 * - No server needed
 * - No Firebase Blaze plan required
 * 
 * Setup:
 * 1. Install: npm install react-native-onesignal
 * 2. Get OneSignal App ID from dashboard
 * 3. Initialize in App.tsx
 * 4. Use this service instead of pushNotificationService
 */

import OneSignal from 'react-native-onesignal';
import firestore from '@react-native-firebase/firestore';
import {ONESIGNAL_REST_API_KEY} from '@env';
import type {Consultation} from '../types/consultation';

const COLLECTIONS = {
  USERS: 'users',
  DOCTORS: 'doctors',
};

export interface PushNotificationData {
  title: string;
  body: string;
  type: 'consultation' | 'prescription' | 'reminder' | 'admin' | 'chat';
  consultationId?: string;
  prescriptionId?: string;
  [key: string]: any;
}

/**
 * OneSignal Push Notification Service
 * Sends push notifications via OneSignal (free tier available)
 */
class OneSignalService {
  /**
   * Get user's OneSignal player ID (external user ID)
   * This should be set when user logs in
   */
  async setUserExternalId(userId: string): Promise<void> {
    try {
      OneSignal.setExternalUserId(userId);
    } catch (error) {
    }
  }

  /**
   * Send push notification to a specific user by user ID
   * OneSignal uses external user IDs to target specific users
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

      // Send notification using OneSignal REST API
      // Note: This requires OneSignal REST API key (free)
      // For now, we'll use tags/segments or external user IDs
      
      // Option 1: Use external user ID (recommended)
      // This requires setting external user ID when user logs in
      await this.sendToExternalUserId(userId, notification);
      
    } catch (error) {
    }
  }

  /**
   * Send notification to external user ID
   * This is the recommended way to send to specific users
   */
  private async sendToExternalUserId(
    externalUserId: string,
    notification: PushNotificationData,
  ): Promise<void> {
    try {
      // OneSignal REST API call
      // OneSignal App ID
      const ONESIGNAL_APP_ID = 'b0020b77-3e0c-43c5-b92e-912b1cec1623';
      
      // Validate API key
      if (!ONESIGNAL_REST_API_KEY || ONESIGNAL_REST_API_KEY.trim() === '') {
        // Silently return - notifications are optional and shouldn't block booking
        return;
      }

      // Log notification attempt only in development
      if (__DEV__) {
      }

      // OneSignal REST API v2 uses Bearer token auth
      // API Key format: os_v2_app_... (User Auth Key from OneSignal Dashboard)
      const response = await fetch('https://api.onesignal.com/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ONESIGNAL_REST_API_KEY}`, // OneSignal User Auth Key (v2 format)
        },
        body: JSON.stringify({
          app_id: ONESIGNAL_APP_ID,
          include_aliases: {
            external_id: [externalUserId], // v2 API uses aliases instead of external_user_ids
          },
          headings: {en: notification.title},
          contents: {en: notification.body},
          data: notification,
          // Note: android_channel_id removed - OneSignal will use default channel
          // To use custom channels, configure them in OneSignal Dashboard → Settings → Platforms → Android
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        // Log error silently - notifications are non-critical and shouldn't break booking flow
        // Only log in development mode for debugging
        const errorMessage = result.errors?.[0] || result.message || 'Failed to send notification';
        
        // Suppress warnings for invalid API keys - they're not critical for app functionality
        // The booking should proceed even if notifications fail
        if (__DEV__) {
        }
        
        // Don't throw - notifications are non-critical and shouldn't break booking flow
        return;
      }

      // Log success only in development
      if (__DEV__) {
      if (!result.recipients || result.recipients === 0) {
        }
      }
    } catch (error: any) {
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
    // Same as sendToUser - OneSignal uses external user IDs
    await this.sendToUser(doctorId, notification);
  }

  /**
   * Send push notification to all admins
   */
  async sendToAdmins(notification: PushNotificationData): Promise<void> {
    try {
      // Get all admin user IDs
      const snapshot = await firestore()
        .collection(COLLECTIONS.USERS)
        .where('role', '==', 'admin')
        .get();

      const adminIds = snapshot.docs.map(doc => doc.id);
      
      // Send to all admins
      const promises = adminIds.map(adminId => 
        this.sendToUser(adminId, notification)
      );
      
      await Promise.all(promises);
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
      title: 'Consultation Booking Initiated',
      body: `Your consultation with Dr. ${consultation.doctorName} is scheduled for ${formattedTime}. Please complete the payment to confirm your booking.`,
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

export default new OneSignalService();

