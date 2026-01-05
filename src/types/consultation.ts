// Consultation feature type definitions

export type DoctorApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface Doctor {
  id: string;
  name: string;
  email: string;
  phone: string;
  specialization: string;
  experience: number; // Years of experience
  profileImage: string; // Firebase Storage URL
  qualifications: string[]; // ["MBBS", "MD"]
  rating: number; // Average rating (0-5)
  totalConsultations: number;
  consultationFee: number;
  languages: string[]; // ["English", "Hindi"]
  verified: boolean;
  approvalStatus?: DoctorApprovalStatus; // 'pending' | 'approved' | 'rejected'
  rejectionReason?: string; // Reason if rejected
  approvedBy?: string; // Admin user ID who approved
  approvedAt?: Date; // When approved
  fcmToken?: string; // For push notifications
  createdAt?: Date;
  updatedAt?: Date;
}

export type UserRole = 'customer' | 'provider' | 'admin';

export interface UserLocation {
  latitude: number;
  longitude: number;
  pincode?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  updatedAt?: Date;
}

export interface User {
  id: string; // Firebase Auth UID
  name: string;
  email: string;
  emailVerified?: boolean; // Email verification status
  phone: string; // Primary phone number (REQUIRED)
  phoneVerified?: boolean; // Primary phone number verification status (REQUIRED)
  secondaryPhone?: string; // Secondary phone number (OPTIONAL)
  secondaryPhoneVerified?: boolean; // Secondary phone number verification status
  role?: UserRole; // User role: customer, provider, or admin
  profileImage?: string;
  dateOfBirth?: Date;
  gender?: string;
  bloodGroup?: string;
  allergies?: string[];
  medicalHistory?: string[];
  location?: UserLocation; // User's location for medicine delivery
  homeAddress?: {
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  officeAddress?: {
    address: string;
    city?: string;
    state?: string;
    pincode: string;
    latitude?: number;
    longitude?: number;
  };
  createdAt?: Date;
  fcmToken?: string; // For push notifications
}

export interface TimeSlot {
  startTime: string; // "09:00"
  endTime: string; // "09:30"
  isBooked: boolean;
  consultationId?: string; // If booked
}

export interface DoctorAvailability {
  id: string;
  doctorId: string; // Reference to doctors collection
  date: string; // "2025-11-29" format
  slots: TimeSlot[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type ConsultationStatus = 'scheduled' | 'in-progress' | 'ongoing' | 'completed' | 'cancelled';

export interface Consultation {
  id: string;
  patientId: string; // User ID
  patientName: string;
  patientAge?: number; // Patient's age in years
  patientPhone?: string; // Patient's phone number
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  scheduledTime: Date;
  duration: number; // Minutes (default 30)
  status: ConsultationStatus;
  consultationFee: number;
  agoraChannelName: string; // For video call (legacy)
  agoraToken?: string; // Generated when call starts (legacy)
  googleMeetLink?: string; // Google Meet link for video consultation
  symptoms?: string;
  notes?: string; // Patient notes before consultation
  diagnosis?: string; // Doctor's diagnosis
  prescription?: string; // Doctor's prescription details
  doctorNotes?: string; // Doctor's notes after consultation
  cancellationReason?: string; // Reason for cancellation (required when status is cancelled)
  prescriptionId?: string; // Reference to prescription
  paymentStatus?: 'pending' | 'paid' | 'cod' | 'failed'; // Payment status
  paymentMethod?: 'cod' | 'razorpay' | 'upi' | 'upi_qr' | 'razorpay_checkout'; // Payment method
  createdAt?: Date;
  updatedAt?: Date;
}

export type MessageType = 'text' | 'image' | 'prescription';
export type SenderType = 'patient' | 'doctor';

export interface ChatMessage {
  id: string;
  consultationId: string; // Reference to consultation
  senderId: string; // User or Doctor ID
  senderName: string;
  senderType: SenderType;
  message: string;
  messageType: MessageType;
  imageUrl?: string; // For image messages
  timestamp: Date;
  read: boolean;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

export interface Prescription {
  id: string;
  consultationId: string;
  patientId: string;
  doctorId: string;
  doctorName: string;
  medications: Medication[];
  diagnosis: string;
  advice: string;
  followUpDate?: Date;
  prescriptionImageUrl?: string; // Uploaded or generated PDF
  createdAt?: Date;
}

// Request/Response types for service methods
export interface BookingData {
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  patientId: string;
  patientName: string;
  patientAge?: number; // Patient's age in years
  patientPhone?: string; // Patient's phone number
  scheduledTime: Date;
  consultationFee: number;
  symptoms?: string;
  notes?: string;
}

export interface SendMessageData {
  consultationId: string;
  senderId: string;
  senderName: string;
  senderType: SenderType;
  message: string;
  messageType: MessageType;
  imageUrl?: string;
}
