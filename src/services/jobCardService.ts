/**
 * Job Card Service (Customer App)
 * Simplified version for customers to view their job cards
 */

import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import pushNotificationService from './pushNotificationService';

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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Get job card by ID
 */
export const getJobCardById = async (jobCardId: string): Promise<JobCard | null> => {
  try {
    const doc = await firestore().collection('jobCards').doc(jobCardId).get();
    if (!doc.exists) {
      return null;
    }
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate() || new Date(),
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      scheduledTime: data?.scheduledTime?.toDate(),
      pinGeneratedAt: data?.pinGeneratedAt?.toDate(),
      taskPIN: data?.taskPIN,
    } as JobCard;
  } catch (error) {
    console.error('Error fetching job card:', error);
    return null;
  }
};

/**
 * Get all job cards for a customer
 */
export const getCustomerJobCards = async (customerId: string): Promise<JobCard[]> => {
  try {
    // Try with orderBy first
    let snapshot;
    try {
      snapshot = await firestore()
      .collection('jobCards')
      .where('customerId', '==', customerId)
      .orderBy('createdAt', 'desc')
      .get();
    } catch (error: any) {
      // If orderBy fails (missing index), try without orderBy
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.warn('OrderBy index missing, fetching without orderBy');
        snapshot = await firestore()
          .collection('jobCards')
          .where('customerId', '==', customerId)
          .get();
        
        // Sort manually
        const cards = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data?.createdAt?.toDate ? data.createdAt.toDate() : (data?.createdAt instanceof Date ? data.createdAt : new Date(data?.createdAt || Date.now())),
            updatedAt: data?.updatedAt?.toDate ? data.updatedAt.toDate() : (data?.updatedAt instanceof Date ? data.updatedAt : new Date(data?.updatedAt || Date.now())),
            scheduledTime: data?.scheduledTime?.toDate ? data.scheduledTime.toDate() : (data?.scheduledTime instanceof Date ? data.scheduledTime : (data?.scheduledTime ? new Date(data.scheduledTime) : undefined)),
          };
        })
          .filter((c: any) => ['pending', 'accepted', 'in-progress'].includes(c.status));
      } else {
        throw error;
      }
    }

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate() || new Date(),
        updatedAt: data?.updatedAt?.toDate() || new Date(),
        scheduledTime: data?.scheduledTime?.toDate(),
        pinGeneratedAt: data?.pinGeneratedAt?.toDate(),
        taskPIN: data?.taskPIN,
      };
    }) as JobCard[];
  } catch (error: any) {
    console.error('Error fetching customer job cards:', error);
    throw new Error(`Failed to fetch job cards: ${error.message || error.code || 'Unknown error'}`);
  }
};

/**
 * Cancel task with reason (Customer cancels)
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

    // Get job card data
    const jobCardDoc = await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .get();
    
    if (!jobCardDoc.exists) {
      throw new Error('Job card not found');
    }
    
    const jobCardData = jobCardDoc.data();
    const providerId = jobCardData?.providerId;
    const consultationId = jobCardData?.consultationId || jobCardData?.bookingId;
    const customerName = jobCardData?.customerName || 'Customer';
    const serviceType = jobCardData?.serviceType || 'service';

    // Update job card status to cancelled with reason
    await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .update({
        status: 'cancelled',
        cancellationReason: cancellationReason.trim(),
        cancelledAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    // Update consultation status if exists
    if (consultationId) {
      try {
        await firestore()
          .collection('consultations')
          .doc(consultationId)
          .update({
            status: 'cancelled',
            cancellationReason: cancellationReason.trim(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
      } catch (consultationError) {
        console.warn('Error updating consultation status:', consultationError);
      }
    }

    // Update in Realtime Database
    await database()
      .ref(`jobCards/${jobCardId}`)
      .update({
        status: 'cancelled',
        updatedAt: Date.now(),
      });

    // Send notification to provider
    if (providerId && consultationId) {
      try {
        await pushNotificationService.sendToProvider(providerId, {
          title: 'Service Cancelled',
          body: `${customerName} has cancelled the ${serviceType} service. Reason: ${cancellationReason.trim()}`,
          type: 'service',
          consultationId,
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
 */
export const verifyTaskCompletion = async (jobCardId: string): Promise<void> => {
  try {
    await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .update({
        customerVerified: true,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    console.error('Error verifying task completion:', error);
    throw new Error('Failed to verify task completion');
  }
};
