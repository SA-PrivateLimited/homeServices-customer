import firestore from '@react-native-firebase/firestore';
import type {Consultation} from '../types/consultation';

export class GoogleMeetService {
  /**
   * Generate a unique meeting code for Google Meet
   * Format: xxx-xxxx-xxx (following Google Meet's pattern)
   */
  private static generateMeetingCode(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    const randomChar = () => chars[Math.floor(Math.random() * chars.length)];

    // Generate format: abc-defg-hij
    const part1 = Array(3).fill(0).map(() => randomChar()).join('');
    const part2 = Array(4).fill(0).map(() => randomChar()).join('');
    const part3 = Array(3).fill(0).map(() => randomChar()).join('');

    return `${part1}-${part2}-${part3}`;
  }

  /**
   * Create a Google Meet link for a consultation
   * @param consultationId - The consultation ID
   * @returns The Google Meet link
   */
  static async createMeetLinkForConsultation(consultationId: string): Promise<string> {
    try {
      // Generate unique meeting code
      const meetingCode = this.generateMeetingCode();
      const meetLink = `https://meet.google.com/${meetingCode}`;

      // Update consultation in Firestore
      await firestore()
        .collection('consultations')
        .doc(consultationId)
        .update({
          googleMeetLink: meetLink,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      return meetLink;
    } catch (error) {
      throw new Error('Failed to create Google Meet link');
    }
  }

  /**
   * Update Google Meet link for a consultation
   * @param consultationId - The consultation ID
   * @param meetLink - The Google Meet link
   */
  static async updateMeetLink(consultationId: string, meetLink: string): Promise<void> {
    try {
      await firestore()
        .collection('consultations')
        .doc(consultationId)
        .update({
          googleMeetLink: meetLink,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      throw new Error('Failed to update Google Meet link');
    }
  }

  /**
   * Remove Google Meet link from a consultation
   * @param consultationId - The consultation ID
   */
  static async removeMeetLink(consultationId: string): Promise<void> {
    try {
      await firestore()
        .collection('consultations')
        .doc(consultationId)
        .update({
          googleMeetLink: firestore.FieldValue.delete(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
    } catch (error) {
      throw new Error('Failed to remove Google Meet link');
    }
  }

  /**
   * Validate Google Meet link format
   * @param link - The link to validate
   * @returns Whether the link is valid
   */
  static isValidMeetLink(link: string): boolean {
    if (!link) return false;

    // Check if it's a meet.google.com link
    const meetRegex = /^https?:\/\/meet\.google\.com\/[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

    // Also accept custom meet links or calendar meeting links
    const customMeetRegex = /^https?:\/\/meet\.google\.com\/.+$/;

    return meetRegex.test(link) || customMeetRegex.test(link);
  }
}
