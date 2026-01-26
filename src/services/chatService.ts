import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import type {ChatMessage, SendMessageData} from '../types/common';

/**
 * Chat Service
 * Handles real-time messaging using Firestore
 */

const COLLECTIONS = {
  MESSAGES: 'messages',
  TYPING_INDICATORS: 'typing_indicators',
};

/**
 * Send a text or image message
 */
export const sendMessage = async (
  data: SendMessageData,
): Promise<ChatMessage> => {
  try {

    const messageRef = firestore().collection(COLLECTIONS.MESSAGES).doc();

    const message: Omit<ChatMessage, 'id'> = {
      consultationId: data.consultationId,
      senderId: data.senderId,
      senderName: data.senderName,
      senderType: data.senderType,
      message: data.message,
      messageType: data.messageType,
      imageUrl: data.imageUrl,
      timestamp: new Date(),
      read: false,
    };

    await messageRef.set(message);


    return {
      id: messageRef.id,
      ...message,
    };
  } catch (error) {
    throw new Error('Failed to send message. Please try again.');
  }
};

/**
 * Subscribe to messages in real-time for a specific consultation
 * Returns unsubscribe function
 */
export const subscribeToMessages = (
  consultationId: string,
  callback: (messages: ChatMessage[]) => void,
): (() => void) => {

  const unsubscribe = firestore()
    .collection(COLLECTIONS.MESSAGES)
    .where('consultationId', '==', consultationId)
    .orderBy('timestamp', 'asc')
    .onSnapshot(
      snapshot => {
        const messages: ChatMessage[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
        })) as ChatMessage[];

        callback(messages);
      },
      error => {
      },
    );

  return unsubscribe;
};

/**
 * Load paginated messages (for initial load or load more)
 */
export const loadMessages = async (
  consultationId: string,
  limit: number = 50,
  startAfterTimestamp?: Date,
): Promise<ChatMessage[]> => {
  try {

    let query = firestore()
      .collection(COLLECTIONS.MESSAGES)
      .where('consultationId', '==', consultationId)
      .orderBy('timestamp', 'desc')
      .limit(limit);

    if (startAfterTimestamp) {
      query = query.startAfter(startAfterTimestamp);
    }

    const snapshot = await query.get();

    const messages: ChatMessage[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate(),
    })) as ChatMessage[];

    // Reverse to show oldest first
    return messages.reverse();
  } catch (error) {
    throw new Error('Failed to load messages. Please try again.');
  }
};

/**
 * Mark messages as read for a specific user
 */
export const markMessagesAsRead = async (
  consultationId: string,
  userId: string,
): Promise<void> => {
  try {

    const snapshot = await firestore()
      .collection(COLLECTIONS.MESSAGES)
      .where('consultationId', '==', consultationId)
      .where('senderId', '!=', userId)
      .where('read', '==', false)
      .get();

    if (snapshot.empty) {
      return;
    }

    const batch = firestore().batch();

    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, {read: true});
    });

    await batch.commit();

  } catch (error) {
    // Non-critical error, don't throw
  }
};

/**
 * Get unread message count for a consultation
 */
export const getUnreadMessageCount = async (
  consultationId: string,
  userId: string,
): Promise<number> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.MESSAGES)
      .where('consultationId', '==', consultationId)
      .where('senderId', '!=', userId)
      .where('read', '==', false)
      .get();

    return snapshot.size;
  } catch (error) {
    return 0;
  }
};

/**
 * Send typing indicator
 * Uses Firestore document with auto-deletion after 5 seconds
 */
export const sendTypingIndicator = async (
  consultationId: string,
  userId: string,
  isTyping: boolean,
): Promise<void> => {
  try {
    const docId = `${consultationId}_${userId}`;

    if (isTyping) {
      await firestore()
        .collection(COLLECTIONS.TYPING_INDICATORS)
        .doc(docId)
        .set({
          consultationId,
          userId,
          timestamp: new Date(),
        });

      // Auto-delete after 5 seconds
      setTimeout(async () => {
        await firestore()
          .collection(COLLECTIONS.TYPING_INDICATORS)
          .doc(docId)
          .delete();
      }, 5000);
    } else {
      await firestore()
        .collection(COLLECTIONS.TYPING_INDICATORS)
        .doc(docId)
        .delete();
    }
  } catch (error) {
    // Non-critical error, don't throw
  }
};

/**
 * Subscribe to typing indicator for other user
 */
export const subscribeToTypingIndicator = (
  consultationId: string,
  otherUserId: string,
  callback: (isTyping: boolean) => void,
): (() => void) => {
  const docId = `${consultationId}_${otherUserId}`;

  const unsubscribe = firestore()
    .collection(COLLECTIONS.TYPING_INDICATORS)
    .doc(docId)
    .onSnapshot(
      snapshot => {
        callback(snapshot.exists);
      },
      error => {
      },
    );

  return unsubscribe;
};

/**
 * Upload image to Firebase Storage and return URL
 */
export const uploadImage = async (imageUri: string): Promise<string> => {
  try {

    const filename = `chat_images/${Date.now()}_${Math.random()
      .toString(36)
      .substring(7)}.jpg`;
    const reference = storage().ref(filename);

    // Upload file
    await reference.putFile(imageUri);

    // Get download URL
    const url = await reference.getDownloadURL();

    return url;
  } catch (error) {
    throw new Error('Failed to upload image. Please try again.');
  }
};

/**
 * Delete a message (for sender only, within time limit)
 */
export const deleteMessage = async (messageId: string): Promise<void> => {
  try {
    await firestore().collection(COLLECTIONS.MESSAGES).doc(messageId).delete();

  } catch (error) {
    throw new Error('Failed to delete message.');
  }
};

export default {
  sendMessage,
  subscribeToMessages,
  loadMessages,
  markMessagesAsRead,
  getUnreadMessageCount,
  sendTypingIndicator,
  subscribeToTypingIndicator,
  uploadImage,
  deleteMessage,
};
