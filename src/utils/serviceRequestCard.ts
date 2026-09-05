/**
 * Domain helpers: ServiceRequest status + time labels for cards/screens.
 */

import i18n from '../i18n';
import {formatJobCalendarDate, parseDisplayDate} from './dateDisplay';

export type ServiceRequestStatus =
  | 'pending'
  | 'accepted'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export function normalizeServiceStatus(status: string): ServiceRequestStatus {
  const s = (status || '').toLowerCase().trim();
  if (s === 'completed' || s === 'done' || s === 'finished') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'rejected' || s === 'declined') return 'rejected';
  if (
    s === 'in-progress' ||
    s === 'in progress' ||
    s === 'inprogress' ||
    s === 'in_progress' ||
    s === 'active' ||
    s === 'ongoing' ||
    s === 'started'
  ) {
    return 'in-progress';
  }
  if (
    s === 'accepted' ||
    s === 'confirmed' ||
    s === 'assigned' ||
    s === 'provider-accepted'
  ) {
    return 'accepted';
  }
  return 'pending';
}

export function formatServiceDate(
  date?: string | Date | null,
  fallback = i18n.t('date.notAvailable'),
): string {
  const formatted = formatJobCalendarDate(date, i18n.language, '');
  return formatted || fallback;
}

/** Relative time for active requests; absolute for older / terminal. */
export function formatRequestTimeLabel(
  status: string,
  date?: string | Date | null,
): string {
  if (!date) return i18n.t('date.notAvailable');
  const d = parseDisplayDate(date);
  if (Number.isNaN(d.getTime())) return i18n.t('date.notAvailable');

  const ns = normalizeServiceStatus(status);
  const isActive =
    ns === 'pending' || ns === 'accepted' || ns === 'in-progress';
  const diffMs = Date.now() - d.getTime();

  if (isActive && diffMs >= 0 && diffMs < 7 * 24 * 60 * 60 * 1000) {
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return i18n.t('history.requestedJustNow');
    if (mins < 60) {
      return i18n.t('history.requestedMinsAgo', {count: mins});
    }
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
      return i18n.t('history.requestedHoursAgo', {count: hours});
    }
    const days = Math.floor(hours / 24);
    return i18n.t('history.requestedDaysAgo', {count: days});
  }

  const formatted = formatServiceDate(d, '');
  if (!formatted) return i18n.t('date.notAvailable');
  switch (ns) {
    case 'completed':
      return i18n.t('date.completedOn', {date: formatted});
    case 'cancelled':
    case 'rejected':
      return i18n.t('date.cancelledOn', {date: formatted});
    default:
      return i18n.t('date.requestedOn', {date: formatted});
  }
}
