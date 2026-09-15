/**
 * Job Card Service (Customer App) — MongoDB + JWT only.
 */

import {getStoredJwt} from './session';
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
  cancellationReason?: string;
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

function mapJobCard(jobCard: JobCardApi): JobCard {
  return {
    id: jobCard._id || jobCard.id,
    ...jobCard,
    createdAt:
      jobCard.createdAt instanceof Date
        ? jobCard.createdAt
        : new Date(jobCard.createdAt),
    updatedAt:
      jobCard.updatedAt instanceof Date
        ? jobCard.updatedAt
        : new Date(jobCard.updatedAt),
    scheduledTime: jobCard.scheduledTime
      ? jobCard.scheduledTime instanceof Date
        ? jobCard.scheduledTime
        : new Date(jobCard.scheduledTime)
      : undefined,
    pinGeneratedAt: jobCard.pinGeneratedAt
      ? jobCard.pinGeneratedAt instanceof Date
        ? jobCard.pinGeneratedAt
        : new Date(jobCard.pinGeneratedAt)
      : undefined,
  } as JobCard;
}

export const getJobCardById = async (
  jobCardId: string,
): Promise<JobCard | null> => {
  try {
    const jobCard = await jobCardsApi.getById(jobCardId);
    if (!jobCard) return null;
    return mapJobCard(jobCard);
  } catch (error) {
    console.error('Error fetching job card:', error);
    return null;
  }
};

export const getCustomerJobCards = async (
  customerId: string,
): Promise<JobCard[]> => {
  try {
    const jobCards = await jobCardsApi.getCustomerJobCards(customerId);
    return jobCards.map(mapJobCard);
  } catch (error: any) {
    console.error('Error fetching customer job cards:', error);
    throw new Error(
      `Failed to fetch job cards: ${error.message || 'Unknown error'}`,
    );
  }
};

export const cancelTaskWithReason = async (
  jobCardId: string,
  cancellationReason: string,
): Promise<void> => {
  try {
    const jwt = await getStoredJwt();
    if (!jwt) {
      throw new Error('User not authenticated');
    }

    await jobCardsApi.cancel(jobCardId, cancellationReason);
  } catch (error: any) {
    const msg = String(error?.message || error || '');
    // Pending / never-accepted requests often have no job card — callers fall
    // back to cancelling the service request. Don't LogBox this as a hard error.
    if (/not found|404/i.test(msg)) {
      const soft = new Error(msg || 'Job card not found');
      (soft as Error & {code?: string}).code = 'JOB_CARD_NOT_FOUND';
      throw soft;
    }
    console.warn('Error cancelling task:', msg);
    throw new Error(msg || 'Failed to cancel task');
  }
};

/**
 * Poll-based status subscription (replaces Firebase RTDB).
 */
export const subscribeToJobCardStatus = (
  jobCardId: string,
  callback: (status: JobCard['status'], updatedAt: number) => void,
): (() => void) => {
  let cancelled = false;
  let lastStatus: string | null = null;

  const poll = async () => {
    if (cancelled) return;
    try {
      const jobCard = await jobCardsApi.getById(jobCardId);
      if (!jobCard || cancelled) return;
      const status = (jobCard.status || 'pending') as JobCard['status'];
      const updatedAt = jobCard.updatedAt
        ? new Date(jobCard.updatedAt).getTime()
        : Date.now();
      if (status !== lastStatus) {
        lastStatus = status;
        callback(status, updatedAt);
      }
    } catch (e) {
      console.warn('Job card status poll failed:', e);
    }
  };

  void poll();
  const interval = setInterval(poll, 5000);

  return () => {
    cancelled = true;
    clearInterval(interval);
  };
};

export const verifyTaskCompletion = async (
  jobCardId: string,
): Promise<void> => {
  try {
    const jobCard = await jobCardsApi.getById(jobCardId);
    if (!jobCard) {
      throw new Error('Job card not found');
    }
    if (jobCard.status !== 'completed') {
      throw new Error('Job card is not completed yet');
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to verify task completion');
  }
};
