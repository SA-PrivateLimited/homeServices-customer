/**
 * Presentation helpers for service request status — parity with Customer Web.
 * Does not change API / lifecycle behavior.
 */

export const STATUS_COLORS = {
  pending: '#8E8E93',
  accepted: '#FF9500',
  'in-progress': '#FF6B35',
  completed: '#34C759',
  cancelled: '#FF3B30',
  rejected: '#FF3B30',
  default: '#8E8E93',
} as const;

/** Active-service indicator colors (slightly warmer pending for live tracking). */
export const ACTIVE_STATUS_COLORS = {
  pending: '#FF9500',
  accepted: '#007AFF',
  'in-progress': '#34C759',
  completed: '#34C759',
  cancelled: '#FF3B30',
  rejected: '#FF3B30',
  default: '#8E8E93',
} as const;

export type ServiceStatusKey =
  | 'pending'
  | 'accepted'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'rejected';

export function normalizeServiceStatus(status?: string | null): ServiceStatusKey {
  const s = (status || '').toLowerCase().trim().replace(/[\s_]+/g, '-');
  if (s === 'completed' || s === 'done' || s === 'finished') return 'completed';
  if (s === 'cancelled' || s === 'canceled') return 'cancelled';
  if (s === 'rejected' || s === 'declined') return 'rejected';
  if (
    s === 'in-progress' ||
    s === 'inprogress' ||
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

export function getServiceStatusColor(
  status?: string | null,
  variant: 'list' | 'active' = 'list',
): string {
  const key = normalizeServiceStatus(status);
  const map = variant === 'active' ? ACTIVE_STATUS_COLORS : STATUS_COLORS;
  return map[key] || map.default;
}

export function formatServiceDate(
  date?: Date | string | number | null | any,
  fallback = 'Date not available',
): string {
  if (!date) return fallback;
  try {
    let d: Date;
    if (date instanceof Date) d = date;
    else if (date && typeof date.toDate === 'function') d = date.toDate();
    else d = new Date(date);
    if (Number.isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return fallback;
  }
}

export function formatServiceStatusDate(
  status?: string | null,
  date?: Date | string | number | null | any,
  fallback = 'Date not available',
): string {
  const formatted = formatServiceDate(date, '');
  if (!formatted) return fallback;
  switch (normalizeServiceStatus(status)) {
    case 'completed':
      return `Completed on ${formatted}`;
    case 'cancelled':
      return `Cancelled on ${formatted}`;
    case 'rejected':
      return `Declined on ${formatted}`;
    case 'accepted':
      return `Accepted on ${formatted}`;
    case 'in-progress':
      return `Updated ${formatted}`;
    default:
      return `Requested ${formatted}`;
  }
}
