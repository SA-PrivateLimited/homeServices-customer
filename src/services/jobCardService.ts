/**
 * Job Card Service (Customer App)
 * Simplified version for customers to view their job cards
 */

import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';

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
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
      scheduledTime: doc.data()?.scheduledTime?.toDate(),
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
    const snapshot = await firestore()
      .collection('jobCards')
      .where('customerId', '==', customerId)
      .orderBy('createdAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate() || new Date(),
      updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
      scheduledTime: doc.data()?.scheduledTime?.toDate(),
    })) as JobCard[];
  } catch (error: any) {
    console.error('Error fetching customer job cards:', error);
    
    // Check for missing index error
    if (error.code === 'failed-precondition' || error.message?.includes('index')) {
      console.error('Missing Firestore index. Please create index for jobCards: customerId + createdAt');
      throw new Error('Missing database index. Please contact support or wait a few minutes for the index to be created.');
    }
    
    // Check for permission error
    if (error.code === 'permission-denied') {
      console.error('Permission denied when fetching job cards');
      throw new Error('Permission denied. Please ensure you are logged in.');
    }
    
    throw new Error(error.message || 'Failed to fetch job cards');
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
 * Subscribe to all job card status updates for a customer
 * Returns unsubscribe function
 */
export const subscribeToCustomerJobCardStatuses = (
  customerId: string,
  callback: (jobCardId: string, status: JobCard['status'], updatedAt: number) => void,
): (() => void) => {
  const customerJobCardsRef = database().ref('jobCards');

  const onStatusChange = customerJobCardsRef.on('child_changed', (snapshot) => {
    const jobCardId = snapshot.key;
    const statusData = snapshot.child('status').val();
    
    if (statusData && statusData.customerId === customerId) {
      callback(jobCardId || '', statusData.status, statusData.updatedAt);
    }
  });

  // Also listen for new job cards
  const onJobCardAdded = customerJobCardsRef.on('child_added', (snapshot) => {
    const jobCardId = snapshot.key;
    const statusData = snapshot.child('status').val();
    
    if (statusData && statusData.customerId === customerId) {
      callback(jobCardId || '', statusData.status, statusData.updatedAt);
    }
  });

  // Return unsubscribe function
  return () => {
    customerJobCardsRef.off('child_changed', onStatusChange);
    customerJobCardsRef.off('child_added', onJobCardAdded);
  };
};

/**
 * Customer verifies task completion
 * Updates job card status to 'completed'
 */
export const verifyTaskCompletion = async (jobCardId: string): Promise<void> => {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    // Verify the job card belongs to the customer
    const jobCardDoc = await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .get();

    if (!jobCardDoc.exists) {
      throw new Error('Job card not found');
    }

    const jobCardData = jobCardDoc.data();
    if (jobCardData?.customerId !== currentUser.uid) {
      throw new Error('You do not have permission to verify this job card');
    }

    // Update in Firestore
    await firestore()
      .collection('jobCards')
      .doc(jobCardId)
      .update({
        status: 'completed',
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    // Update in Realtime Database (for real-time synchronization)
    await database()
      .ref(`jobCards/${jobCardId}`)
      .update({
        status: 'completed',
        updatedAt: Date.now(),
      });

    console.log('Task verified as completed by customer');
  } catch (error: any) {
    console.error('Error verifying task completion:', error);
    
    // Check for permission error
    if (error.code === 'permission-denied' || error.message?.includes('permission')) {
      throw new Error('Permission denied. Please ensure you are logged in and this is your job card.');
    }
    
    throw new Error(error.message || 'Failed to verify task completion');
  }
};

