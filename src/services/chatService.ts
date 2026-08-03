/**
 * Chat service stub — Firestore chat removed. Use WebSocket/backend later.
 */

export const sendMessage = async (): Promise<never> => {
  throw new Error('In-app chat is unavailable. Please contact support.');
};

export const subscribeToMessages = (
  _id: string,
  callback: (msgs: any[]) => void,
): (() => void) => {
  callback([]);
  return () => {};
};

export default {
  sendMessage,
  subscribeToMessages,
};
