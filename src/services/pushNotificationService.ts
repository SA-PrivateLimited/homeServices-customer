/**
 * Stub push notification service — Firebase FCM removed.
 * Booking alerts use WebSocket.
 */

export const sendToProvider = async (
  _providerId: string,
  _payload: any,
): Promise<void> => {
  // no-op
};

export const sendToCustomer = async (
  _customerId: string,
  _payload: any,
): Promise<void> => {
  // no-op
};

export const sendToAdmins = async (_payload: any): Promise<void> => {
  // no-op
};

const pushNotificationService = {
  sendToProvider,
  sendToCustomer,
  sendToAdmins,
};

export default pushNotificationService;
