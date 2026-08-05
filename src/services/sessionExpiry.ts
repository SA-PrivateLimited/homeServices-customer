/**
 * Session-expiry fan-out: API client / getStoredJwt notify UI to reset to Login.
 */

type Listener = () => void;

const listeners = new Set<Listener>();
let notifyScheduled = false;

export function onSessionExpired(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Debounced so parallel 401s / exp checks don't spam navigation resets. */
export function notifySessionExpired(): void {
  if (notifyScheduled) return;
  notifyScheduled = true;
  setTimeout(() => {
    notifyScheduled = false;
    listeners.forEach(cb => {
      try {
        cb();
      } catch (e) {
        console.warn('[sessionExpiry] listener error', e);
      }
    });
  }, 0);
}
