/**
 * Common Types
 * Shared types used across the application
 */

// UserLocation interface (for address/location data)
export interface UserLocation {
  latitude?: number;
  longitude?: number;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
}

// Service Request Status type
export type ServiceRequestStatus = 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';

// User Role type
export type UserRole = 'customer' | 'provider' | 'admin';

// Chat message interface
export interface ChatMessage {
  id: string;
  consultationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'customer' | 'provider';
  message: string;
  timestamp: Date;
  read: boolean;
  type?: 'text' | 'image' | 'file';
  attachmentUrl?: string;
}

// Send message data interface
export interface SendMessageData {
  consultationId: string;
  senderId: string;
  senderName: string;
  senderType: 'patient' | 'doctor' | 'provider';
  message: string;
  imageUrl?: string;
}

// Legacy ConsultationStatus (for backward compatibility)
export type ConsultationStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
