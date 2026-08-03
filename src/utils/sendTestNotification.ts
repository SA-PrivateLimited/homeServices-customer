/**
 * Test notification helper — Firebase Cloud Functions removed.
 */

export const sendTestNotification = async (): Promise<void> => {
  throw new Error(
    'Push test notifications are disabled. Booking alerts use WebSocket.',
  );
};

export default sendTestNotification;
