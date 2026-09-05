import type {ServiceRequest} from '../services/api/serviceRequestsApi';

export const NOW_CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

function statusKey(status: string): string {
  const s = (status || '').toLowerCase().trim();
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
  if (s === 'accepted' || s === 'assigned') return 'accepted';
  if (s === 'completed' || s === 'done' || s === 'finished') return 'completed';
  return 'pending';
}

function timeMs(value?: string | Date | null): number {
  if (!value) return 0;
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : 0;
}

export function requestUpdatedAtMs(row: ServiceRequest): number {
  return timeMs(row.updatedAt) || timeMs(row.createdAt);
}

export function endedAtMs(row: ServiceRequest): number {
  return timeMs(row.cancelledAt) || timeMs(row.updatedAt) || timeMs(row.createdAt);
}

export function isEndedStatus(row: ServiceRequest): boolean {
  return statusKey(String(row.status || '')) === 'cancelled' ||
    statusKey(String(row.status || '')) === 'rejected';
}

export function isLiveStatus(row: ServiceRequest): boolean {
  const ns = statusKey(String(row.status || ''));
  return ns === 'pending' || ns === 'accepted' || ns === 'in-progress';
}

export function isRecentEnded(row: ServiceRequest, now = Date.now()): boolean {
  if (!isEndedStatus(row)) return false;
  const at = endedAtMs(row);
  return at > 0 && now - at <= NOW_CANCEL_WINDOW_MS;
}

export function isNowRow(row: ServiceRequest): boolean {
  return isLiveStatus(row);
}

function nowRank(row: ServiceRequest): number {
  const ns = statusKey(String(row.status || ''));
  if (ns === 'in-progress') return 1;
  if (ns === 'accepted') return 2;
  if (ns === 'pending') return 3;
  return 9;
}

export function sortHistoryRows(
  rows: ServiceRequest[],
  mode: 'now' | 'default',
): ServiceRequest[] {
  const copy = [...rows];
  copy.sort((a, b) => {
    if (mode === 'now') {
      const rankDiff = nowRank(a) - nowRank(b);
      if (rankDiff !== 0) return rankDiff;
    }
    return (
      (mode === 'now' && isEndedStatus(a) ? endedAtMs(b) - endedAtMs(a) : 0) ||
      requestUpdatedAtMs(b) - requestUpdatedAtMs(a)
    );
  });
  return copy;
}

export function requestId(row: ServiceRequest): string {
  return String(row._id || row.id || '');
}

export function mergeUniqueRequests(
  ...lists: ServiceRequest[][]
): ServiceRequest[] {
  const seen = new Set<string>();
  const out: ServiceRequest[] = [];
  for (const list of lists) {
    for (const row of list) {
      const id = requestId(row);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      out.push(row);
    }
  }
  return out;
}

export type HistoryStatusFilter =
  | 'now'
  | 'all'
  | 'pending'
  | 'accepted'
  | 'in-progress'
  | 'completed'
  | 'cancelled';

export function isLiveHistoryFilter(filter: HistoryStatusFilter): boolean {
  return (
    filter === 'now' ||
    filter === 'pending' ||
    filter === 'accepted' ||
    filter === 'in-progress'
  );
}

export function historyListApiStatus(filter: HistoryStatusFilter): string {
  if (isLiveHistoryFilter(filter)) return 'now';
  if (filter === 'cancelled') return 'cancelled';
  if (filter === 'completed') return 'completed';
  return 'all';
}
