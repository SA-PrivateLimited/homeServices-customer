/**
 * Navigate from FCM / local notification taps to the relevant request screen.
 * Uses a pending queue until NavigationContainer is ready.
 */

import type {NavigationContainerRef} from '@react-navigation/native';

type NavRef = NavigationContainerRef<any> | null;

let navigationRef: NavRef = null;
let pendingData: Record<string, string> | null = null;

export function setNotificationNavigationRef(ref: NavRef) {
  navigationRef = ref;
  if (ref?.isReady() && pendingData) {
    const data = pendingData;
    pendingData = null;
    navigateFromNotificationData(data);
  }
}

export function flushPendingNotificationNavigation() {
  if (navigationRef?.isReady() && pendingData) {
    const data = pendingData;
    pendingData = null;
    navigateFromNotificationData(data);
  }
}

function asDataMap(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (v == null) continue;
    out[k] = String(v);
  }
  return out;
}

export function navigateFromNotificationData(raw: unknown) {
  const data = asDataMap(raw);
  const serviceRequestId =
    data.serviceRequestId || data.consultationId || data.requestId || '';
  const jobCardId = data.jobCardId || '';
  const status = String(data.status || '').toLowerCase();

  if (!serviceRequestId && !jobCardId) return;

  if (!navigationRef?.isReady()) {
    pendingData = data;
    return;
  }

  const terminal =
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'canceled' ||
    status === 'rejected';

  try {
    if (terminal) {
      navigationRef.navigate('ServiceHistory' as never, {
        serviceRequestId,
      } as never);
      return;
    }
    navigationRef.navigate('ActiveService' as never, {
      serviceRequestId,
      jobCardId: jobCardId || undefined,
    } as never);
  } catch (e) {
    console.warn('Notification navigation failed:', e);
  }
}
