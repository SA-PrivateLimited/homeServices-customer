import i18n from '../i18n';
import {localizedServiceName} from './serviceDisplay';
import type {ActiveServiceRequestSummary} from '../services/api/serviceRequestsApi';

const LIVE_ACTIVE_STATUSES = new Set([
  'pending',
  'accepted',
  'in-progress',
  'inprogress',
]);

export function isLiveActiveRequest(
  active: Pick<ActiveServiceRequestSummary, 'status' | 'serviceRequestId'> | null,
): boolean {
  if (!active?.serviceRequestId) return false;
  const status = String(active.status || '')
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, '-');
  return LIVE_ACTIVE_STATUSES.has(status);
}

export function activeRequestViewAction(
  active: Pick<ActiveServiceRequestSummary, 'serviceRequestId'>,
): {labelKey: string; screen: 'ActiveService' | 'ServiceHistory'; params?: object} {
  const id = String(active.serviceRequestId || '').trim();
  if (id) {
    return {
      labelKey: 'activeRequest.view',
      screen: 'ActiveService',
      params: {serviceRequestId: id, jobCardId: id},
    };
  }
  return {labelKey: 'activeRequest.viewHistory', screen: 'ServiceHistory'};
}

export function activeRequestDescription(
  active: Pick<ActiveServiceRequestSummary, 'serviceType' | 'status'>,
): string {
  const service =
    localizedServiceName(active.serviceType) || String(i18n.t('common.service'));
  const status = String(active.status || '').toLowerCase();
  if (status === 'in-progress') {
    return String(i18n.t('activeRequest.inProgress', {service}));
  }
  if (status === 'accepted') {
    return String(i18n.t('activeRequest.accepted', {service}));
  }
  if (status === 'pending') {
    return String(i18n.t('activeRequest.waiting', {service}));
  }
  return String(i18n.t('activeRequest.message', {service}));
}
