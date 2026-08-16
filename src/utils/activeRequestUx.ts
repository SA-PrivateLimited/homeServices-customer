/**
 * Helpers for duplicate-active-request UX (pre-create check + 409).
 */

import {ApiError} from '../services/api/apiClient';
import type {ActiveServiceRequestSummary} from '../services/api/serviceRequestsApi';

export const ACTIVE_SERVICE_REQUEST_EXISTS = 'ACTIVE_SERVICE_REQUEST_EXISTS';

type Translate = (key: string, options?: Record<string, unknown>) => unknown;

export function isActiveServiceRequestConflict(
  error: unknown,
): error is ApiError {
  if (!(error instanceof ApiError)) return false;
  return (
    error.status === 409 ||
    error.code === ACTIVE_SERVICE_REQUEST_EXISTS
  );
}

export function activeConflictFromError(
  error: unknown,
): ActiveServiceRequestSummary | null {
  if (!isActiveServiceRequestConflict(error)) return null;
  const data = error.data;
  if (!data || typeof data !== 'object') return null;
  const row = data as Record<string, unknown>;
  const serviceRequestId = String(row.serviceRequestId || '');
  if (!serviceRequestId) return null;
  return {
    serviceRequestId,
    serviceType: String(row.serviceType || ''),
    status: String(row.status || ''),
    providerId: (row.providerId as string | null | undefined) ?? null,
    providerName: (row.providerName as string | null | undefined) ?? null,
    createdAt: (row.createdAt as string | Date | null | undefined) ?? null,
  };
}

export function activeRequestCopy(
  t: Translate,
  active: Pick<ActiveServiceRequestSummary, 'serviceType' | 'status'>,
): {title: string; message: string; viewLabel: string} {
  const title = String(
    t('serviceRequest.activeRequestTitle') || 'Active request',
  );
  const viewLabel = String(
    t('serviceRequest.activeRequestView') || 'View Request',
  );
  const status = String(active.status || '').toLowerCase();
  let message: string;
  if (status === 'in-progress') {
    message = String(
      t('serviceRequest.activeRequestInProgress') ||
        'Your service is currently in progress.',
    );
  } else if (status === 'accepted') {
    message = String(
      t('serviceRequest.activeRequestAccepted') ||
        'You already have an accepted request for this service.',
    );
  } else if (status === 'pending') {
    message = String(
      t('serviceRequest.activeRequestWaiting') || 'Waiting for provider',
    );
  } else {
    message = String(
      t('serviceRequest.activeRequestMessage', {
        service: active.serviceType || 'Service',
      }) ||
        `You already have an active request for ${
          active.serviceType || 'this service'
        }. Please wait for it to complete or cancel it before creating another.`,
    );
  }
  return {title, message, viewLabel};
}
