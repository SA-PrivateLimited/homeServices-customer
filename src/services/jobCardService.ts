/**
 * Job Card Service (Customer App)
 * Uses HomeServicesBackend API for all database operations
 * Firebase is only used for real-time subscriptions and push notifications
 */

import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import pushNotificationService from './pushNotificationService';
import {jobCardsApi, type JobCard as JobCardApi} from './api/jobCardsApi';

export interface JobCard {
  id?: string;
  providerId: string;
  providerName: string;
  providerAddress: {
    type: 'home' | 'office';
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: {
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  serviceType: string;
  problem?: string;
  consultationId?: string;
  bookingId?: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  taskPIN?: string;
  pinGeneratedAt?: Date;
  scheduledTime?: Date;
  jobCardPdfUrl?: string;
  serviceAmount?: number;
  materialsUsed?: Array<{
    description: string;
    quantity?: number;
    unitPrice?: number;
    total?: number;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get job card by ID
 * Uses backend API
 */
export const getJobCardById = async (jobCardId: string): Promise<JobCard | null> => {
  try {
    const jobCard = await jobCardsApi.getById(jobCardId);
    if (!jobCard) {
      return null;
    }

    // Convert API response to app format
    return {
      id: jobCard._id || jobCard.id,
      ...jobCard,
      createdAt: jobCard.createdAt instanceof Date ? jobCard.createdAt : new Date(jobCard.createdAt),
      updatedAt: jobCard.updatedAt instanceof Date ? jobCard.updatedAt : new Date(jobCard.updatedAt),
      scheduledTime: jobCard.scheduledTime ? (jobCard.scheduledTime instanceof Date ? jobCard.scheduledTime : new Date(jobCard.scheduledTime)) : undefined,
      pinGeneratedAt: jobCard.pinGeneratedAt ? (jobCard.pinGeneratedAt instanceof Date ? jobCard.pinGeneratedAt : new Date(jobCard.pinGeneratedAt)) : undefined,
    } as JobCard;
  } catch (error) {
    console.error('Error fetching job card:', error);
    return null;
  }
};

/**
 * Get all job cards for a customer
 * Uses backend API
 */
export const getCustomerJobCards = async (customerId: string): Promise<JobCard[]> => {
  try {
    const jobCards = await jobCardsApi.getCustomerJobCards(customerId);

    // Convert API response to app format - include all statuses (including completed)
    return jobCards.map((jobCard: JobCardApi) => ({
      id: jobCard._id || jobCard.id,
      ...jobCard,
      createdAt: jobCard.createdAt instanceof Date ? jobCard.createdAt : new Date(jobCard.createdAt),
      updatedAt: jobCard.updatedAt instanceof Date ? jobCard.updatedAt : new Date(jobCard.updatedAt),
      scheduledTime: jobCard.scheduledTime ? (jobCard.scheduledTime instanceof Date ? jobCard.scheduledTime : new Date(jobCard.scheduledTime)) : undefined,
      pinGeneratedAt: jobCard.pinGeneratedAt ? (jobCard.pinGeneratedAt instanceof Date ? jobCard.pinGeneratedAt : new Date(jobCard.pinGeneratedAt)) : undefined,
    })) as JobCard[];
  } catch (error: any) {
    console.error('Error fetching customer job cards:', error);
    throw new Error(`Failed to fetch job cards: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Cancel task with reason (Customer cancels)
 * Uses backend API for database update
 * Firebase used only for notifications
 */
export const cancelTaskWithReason = async (
  jobCardId: string,
  cancellationReason: string,
): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Get job card data from API to get provider info
    const jobCard = await jobCardsApi.getById(jobCardId);
    if (!jobCard) {
      throw new Error('Job card not found');
    }

    const providerId = jobCard.providerId;
    const bookingId = jobCard.bookingId;
    const customerName = jobCard.customerName || 'Customer';
    const serviceType = jobCard.serviceType || 'service';

    // Update job card via backend API
    await jobCardsApi.cancel(jobCardId, cancellationReason);

    // Update Realtime Database for real-time status (Firebase - keep for real-time)
    try {
      await database()
        .ref(`jobCards/${jobCardId}`)
        .update({
          status: 'cancelled',
          updatedAt: Date.now(),
        });
    } catch (rtdbError) {
      console.warn('⚠️ Could not update Realtime DB:', rtdbError);
    }

    // Send notification to provider (Firebase FCM - keep for push notifications)
    if (providerId) {
      try {
        await pushNotificationService.sendToProvider(providerId, {
          title: 'Service Cancelled',
          body: `${customerName} has cancelled the ${serviceType} service. Reason: ${cancellationReason.trim()}`,
          type: 'service',
          consultationId: bookingId || '',
          status: 'cancelled',
          cancellationReason: cancellationReason.trim(),
        });
        console.log('✅ Notification sent to provider:', providerId);
      } catch (notificationError) {
        console.error('Error sending cancellation notification to provider:', notificationError);
        // Don't throw - notification failure shouldn't block cancellation
      }
    }
  } catch (error: any) {
    console.error('Error cancelling task:', error);
    throw new Error(error.message || 'Failed to cancel task');
  }
};

/**
 * Subscribe to real-time job card status updates
 * Uses Firebase Realtime Database for real-time updates (keep Firebase for real-time)
 * Returns unsubscribe function
 */
export const subscribeToJobCardStatus = (
  jobCardId: string,
  callback: (status: JobCard['status'], updatedAt: number) => void,
): (() => void) => {
  const statusRef = database().ref(`jobCards/${jobCardId}/status`);

  const onStatusChange = statusRef.on('value', (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val();
      callback(data.status, data.updatedAt);
    }
  });

  // Return unsubscribe function
  return () => {
    statusRef.off('value', onStatusChange);
  };
};

/**
 * Verify task completion (customer side)
 * Uses backend API
 * Note: The backend should handle customer verification when status is set to 'completed'
 */
export const verifyTaskCompletion = async (jobCardId: string): Promise<void> => {
  try {
    // For now, we just verify by confirming the job card is completed
    // Backend can track customer verification separately if needed
    const jobCard = await jobCardsApi.getById(jobCardId);
    if (!jobCard || jobCard.status !== 'completed') {
      throw new Error('Job card is not completed');
    }
    // Backend will handle customer verification logic
  } catch (error) {
    console.error('Error verifying task completion:', error);
    throw new Error('Failed to verify task completion');
  }
};
