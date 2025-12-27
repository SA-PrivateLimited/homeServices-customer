import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import type {
  Doctor,
  DoctorAvailability,
  Consultation,
  BookingData,
  Prescription,
  TimeSlot,
  User,
} from '../types/consultation';
// Using in-app notifications only (NotificationService)
import NotificationService from './notificationService';
import WebSocketService from './websocketService';
// Google Meet link generation removed - doctors will add links manually
// import {generateGoogleMeetLink, sendConsultationEmails} from './emailService';

/**
 * Consultation Service
 * Handles all Firebase Firestore operations for doctor consultations
 */

const COLLECTIONS = {
  DOCTORS: 'doctors',
  USERS: 'users',
  AVAILABILITY: 'availability',
  CONSULTATIONS: 'consultations',
  PRESCRIPTIONS: 'prescriptions',
};

/**
 * Fetch all doctors from Firestore
 */
export const fetchDoctors = async (): Promise<Doctor[]> => {
  try {
    
    // Try to fetch approved doctors using a query if possible
    // Note: This requires an index, but we'll fallback to get() if it fails
    let snapshot;
    try {
      // Try querying for approved doctors first
      snapshot = await firestore()
        .collection(COLLECTIONS.PROVIDERS)
        .where('approvalStatus', '==', 'approved')
        .get();
    } catch (queryError: any) {
      // If query fails (e.g., no index), fallback to get() all and filter
      snapshot = await firestore()
      .collection(COLLECTIONS.PROVIDERS)
      .get();
    }

    let doctors: Doctor[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Doctor[];

    // Filter only approved doctors and sort by rating in-memory
    doctors = doctors
      .filter(doc => {
        // Only show approved doctors to patients
        // Check approvalStatus first, then fallback to verified
        if (doc.approvalStatus === 'approved') {
          return true;
        }
        // Legacy: if no approvalStatus field, check verified
        if (!doc.approvalStatus && doc.verified === true) {
          return true;
        }
        return false;
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return doctors;
  } catch (error: any) {
    // Provide more specific error message
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied. Please check Firestore rules or contact support.');
    }
    throw new Error('Failed to fetch doctors. Please try again.');
  }
};

/**
 * Fetch a single doctor by ID
 */
export const fetchDoctorById = async (doctorId: string): Promise<Doctor> => {
  try {
    const doc = await firestore()
      .collection(COLLECTIONS.PROVIDERS)
      .doc(doctorId)
      .get();

    if (!doc.exists) {
      throw new Error('Doctor not found');
    }

    const doctor: Doctor = {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    } as Doctor;

    return doctor;
  } catch (error) {
    throw new Error('Failed to fetch doctor details. Please try again.');
  }
};

/**
 * Search doctors by specialization
 */
export const searchDoctorsBySpecialization = async (
  specialization: string,
): Promise<Doctor[]> => {
  try {
    // Fetch all doctors (rules will only allow reading approved ones)
    // Then filter by specialization in memory
    const snapshot = await firestore()
      .collection(COLLECTIONS.PROVIDERS)
      .get();

    let doctors: Doctor[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate(),
    })) as Doctor[];

    // Filter by specialization and approval status, then sort in memory
    doctors = doctors
      .filter(doc => {
        // Match specialization
        const matchesSpecialization = doc.specialization?.toLowerCase() === specialization.toLowerCase();
        // Only show approved doctors to patients
        const approvalStatus = doc.approvalStatus || (doc.verified ? 'approved' : 'pending');
        return matchesSpecialization && approvalStatus === 'approved';
      })
      .sort((a, b) => (b.rating || 0) - (a.rating || 0));

    return doctors;
  } catch (error) {
    throw new Error('Failed to search doctors. Please try again.');
  }
};

/**
 * Fetch doctor availability for a specific date
 */
export const fetchDoctorAvailability = async (
  doctorId: string,
  date: string, // Format: "2025-11-29"
): Promise<TimeSlot[]> => {
  try {
    const docId = `${doctorId}_${date}`;
    const doc = await firestore()
      .collection(COLLECTIONS.AVAILABILITY)
      .doc(docId)
      .get();

    if (!doc.exists) {
      return [];
    }

    const availability = doc.data() as DoctorAvailability;
    return availability.slots || [];
  } catch (error) {
    throw new Error('Failed to fetch availability. Please try again.');
  }
};

/**
 * Book a consultation with a doctor
 * Uses Firestore transaction to prevent double-booking
 */
export const bookConsultation = async (
  bookingData: BookingData,
  selectedSlot: TimeSlot,
  selectedDate: string,
): Promise<Consultation> => {
  try {

    // Generate consultation ID and channel name
    const consultationRef = firestore()
      .collection(COLLECTIONS.CONSULTATIONS)
      .doc();

    const consultationId = consultationRef.id;
    const agoraChannelName = `consultation_${consultationId}`;

    // Don't generate Google Meet link automatically - doctor will add it manually
    // This prevents showing invalid auto-generated links to patients

    // Create consultation object - only include defined fields (Firestore doesn't accept undefined)
    const consultation: any = {
      patientId: bookingData.patientId,
      patientName: bookingData.patientName,
      doctorId: bookingData.doctorId,
      doctorName: bookingData.doctorName,
      doctorSpecialization: bookingData.doctorSpecialization,
      scheduledTime: firestore.Timestamp.fromDate(bookingData.scheduledTime),
      duration: 30, // Default 30 minutes
      status: 'scheduled',
      paymentStatus: 'pending', // Payment status: pending, paid, failed
      consultationFee: bookingData.consultationFee,
      agoraChannelName,
      createdAt: firestore.Timestamp.now(),
      updatedAt: firestore.Timestamp.now(),
    };

    // Only add optional fields if they have values (Firestore doesn't accept undefined)
    if (bookingData.patientAge !== undefined && bookingData.patientAge !== null) {
      consultation.patientAge = bookingData.patientAge;
    }
    if (bookingData.patientPhone !== undefined && bookingData.patientPhone !== null && typeof bookingData.patientPhone === 'string' && bookingData.patientPhone.trim() !== '') {
      consultation.patientPhone = bookingData.patientPhone.trim();
    }
    if (bookingData.symptoms !== undefined && bookingData.symptoms !== null && typeof bookingData.symptoms === 'string' && bookingData.symptoms.trim() !== '') {
      consultation.symptoms = bookingData.symptoms.trim();
    }
    if (bookingData.notes !== undefined && bookingData.notes !== null && typeof bookingData.notes === 'string' && bookingData.notes.trim() !== '') {
      consultation.notes = bookingData.notes.trim();
    }

    // Run transaction to book slot and create consultation
    await firestore().runTransaction(async transaction => {
      const availabilityDocId = `${bookingData.doctorId}_${selectedDate}`;
      const availabilityRef = firestore()
        .collection(COLLECTIONS.AVAILABILITY)
        .doc(availabilityDocId);

      const availabilityDoc = await transaction.get(availabilityRef);

      if (!availabilityDoc.exists) {
        throw new Error('Availability not found');
      }

      const slots = availabilityDoc.data()?.slots || [];
      const slotIndex = slots.findIndex(
        (s: TimeSlot) => s.startTime === selectedSlot.startTime,
      );

      if (slotIndex === -1) {
        throw new Error('Time slot not found');
      }

      if (slots[slotIndex].isBooked) {
        throw new Error('This slot has already been booked');
      }

      // Mark slot as booked
      slots[slotIndex].isBooked = true;
      slots[slotIndex].consultationId = consultationId;

      // Update availability
      transaction.update(availabilityRef, {
        slots,
        updatedAt: firestore.Timestamp.now(),
      });

      // Create consultation
      transaction.set(consultationRef, consultation);
    });


    // Convert Firestore Timestamps back to Date objects for the return type
    const returnConsultation: Consultation = {
      id: consultationId,
      patientId: consultation.patientId,
      patientName: consultation.patientName,
      doctorId: consultation.doctorId,
      doctorName: consultation.doctorName,
      doctorSpecialization: consultation.doctorSpecialization,
      scheduledTime: bookingData.scheduledTime, // Use original Date object
      duration: consultation.duration,
      status: consultation.status,
      consultationFee: consultation.consultationFee,
      agoraChannelName: consultation.agoraChannelName,
      createdAt: consultation.createdAt.toDate(),
      updatedAt: consultation.updatedAt.toDate(),
    };

    // Add optional fields if they exist
    if (consultation.patientAge !== undefined) {
      returnConsultation.patientAge = consultation.patientAge;
    }
    if (consultation.patientPhone !== undefined) {
      returnConsultation.patientPhone = consultation.patientPhone;
    }
    if (consultation.symptoms !== undefined) {
      returnConsultation.symptoms = consultation.symptoms;
    }
    if (consultation.notes !== undefined) {
      returnConsultation.notes = consultation.notes;
    }

    // Send in-app notifications only
    try {
      // Validate required fields before sending notifications
      if (returnConsultation.patientId && returnConsultation.doctorId) {
        // Schedule local reminder
        NotificationService.scheduleConsultationReminder(returnConsultation);
        
        // Send local notification
        NotificationService.sendBookingConfirmation(returnConsultation);

        // Create in-app notifications
        const {useStore} = require('../store');
        const {addNotification} = useStore.getState();
        const formattedTime = returnConsultation.scheduledTime instanceof Date 
          ? returnConsultation.scheduledTime.toLocaleString()
          : new Date(returnConsultation.scheduledTime).toLocaleString();

        // Notification for patient
        addNotification({
          id: `consultation-${returnConsultation.id}-patient-${returnConsultation.patientId}`,
          title: 'Consultation Booking Initiated',
          message: `Your consultation with Dr. ${returnConsultation.doctorName} is scheduled for ${formattedTime}. Please complete the payment to confirm your booking.`,
          type: 'consultation',
          consultationId: returnConsultation.id,
          userId: returnConsultation.patientId,
          read: false,
          createdAt: new Date(),
        });

        // Notification for doctor (include patient contact details)
        let doctorMessage = `${returnConsultation.patientName} has booked a consultation with you on ${formattedTime}`;
        if (returnConsultation.patientPhone) {
          doctorMessage += `\nContact: ${returnConsultation.patientPhone}`;
        }
        if (returnConsultation.patientAge) {
          doctorMessage += `\nAge: ${returnConsultation.patientAge} years`;
        }

        addNotification({
          id: `consultation-${returnConsultation.id}-doctor-${returnConsultation.doctorId}`,
          title: 'New Consultation Booking',
          message: doctorMessage,
          type: 'consultation',
          consultationId: returnConsultation.id,
          userId: returnConsultation.doctorId,
          read: false,
          createdAt: new Date(),
        });

        // Emit WebSocket event for real-time notification
        WebSocketService.emitNewBooking(returnConsultation.doctorId, {
          consultationId: returnConsultation.id,
          patientName: returnConsultation.patientName,
          patientPhone: returnConsultation.patientPhone,
          patientAge: returnConsultation.patientAge,
          scheduledTime: returnConsultation.scheduledTime,
          symptoms: returnConsultation.symptoms,
          consultationFee: returnConsultation.consultationFee,
        }).catch(error => {
          console.error('Failed to emit WebSocket booking notification:', error);
          // Don't fail the booking if WebSocket fails
        });
      }
    } catch (notificationError) {
      // Don't fail the booking if notifications fail
    }

    // Fetch patient and doctor emails to send confirmation emails
    try {
      const [patientDoc, doctorDoc] = await Promise.all([
        firestore().collection(COLLECTIONS.USERS).doc(bookingData.patientId).get(),
        firestore().collection(COLLECTIONS.PROVIDERS).doc(bookingData.doctorId).get(),
      ]);

      const patientEmail = patientDoc.data()?.email || '';
      const doctorEmail = doctorDoc.data()?.email || '';

      // Send emails to both patient and doctor (non-blocking)
      // Only send email if Google Meet link is manually added by doctor
      // For now, skip email sending during booking - doctor will add link later
      // if (patientEmail && doctorEmail && googleMeetLink) {
      //   sendConsultationEmails({
      //     consultationId,
      //     patientName: bookingData.patientName,
      //     patientEmail,
      //     doctorName: bookingData.doctorName,
      //     doctorEmail,
      //     scheduledTime: bookingData.scheduledTime,
      //     googleMeetLink,
      //     consultationFee: bookingData.consultationFee,
      //     doctorSpecialization: bookingData.doctorSpecialization,
      //   }).catch(error => {
      //     console.error('Failed to send consultation emails:', error);
      //     // Don't fail the booking if email fails
      //   });
      // }
    } catch (emailError) {
      // Don't fail the booking if email fails
    }

    return returnConsultation;
  } catch (error: any) {
    if (error.message === 'This slot has already been booked') {
      throw error;
    }
    throw new Error('Failed to book consultation. Please try again.');
  }
};

/**
 * Fetch all consultations for a user
 */
export const fetchUserConsultations = async (
  userId: string,
): Promise<Consultation[]> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.CONSULTATIONS)
      .where('patientId', '==', userId)
      .get();

    let consultations: Consultation[] = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
      id: doc.id,
        patientId: data.patientId || '',
        patientName: data.patientName || '',
        patientAge: data.patientAge,
        patientPhone: data.patientPhone,
        doctorId: data.doctorId || '',
        doctorName: data.doctorName || '',
        doctorSpecialization: data.doctorSpecialization || '',
        scheduledTime: data.scheduledTime?.toDate(),
        duration: data.duration || 30,
        status: data.status || 'scheduled',
        consultationFee: data.consultationFee || 0,
        agoraChannelName: data.agoraChannelName || '',
        agoraToken: data.agoraToken,
        googleMeetLink: data.googleMeetLink,
        symptoms: data.symptoms || '',
        notes: data.notes || '',
        diagnosis: data.diagnosis || '',
        prescription: data.prescription || '',
        doctorNotes: data.doctorNotes || '',
        cancellationReason: data.cancellationReason || '',
        prescriptionId: data.prescriptionId,
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as Consultation;
    });

    // Sort in memory to avoid needing composite index
    consultations.sort((a, b) => {
      const dateA = a.createdAt?.getTime() || 0;
      const dateB = b.createdAt?.getTime() || 0;
      return dateB - dateA; // Descending order
    });

    return consultations;
  } catch (error) {
    throw new Error('Failed to fetch consultations. Please try again.');
  }
};

/**
 * Fetch a single consultation by ID
 */
export const fetchConsultationById = async (
  consultationId: string,
): Promise<Consultation> => {
  try {
    const doc = await firestore()
      .collection(COLLECTIONS.CONSULTATIONS)
      .doc(consultationId)
      .get();

    if (!doc.exists) {
      throw new Error('Consultation not found');
    }

    const consultation: Consultation = {
      id: doc.id,
      ...doc.data(),
      scheduledTime: doc.data()?.scheduledTime?.toDate(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    } as Consultation;

    return consultation;
  } catch (error) {
    throw new Error('Failed to fetch consultation. Please try again.');
  }
};

/**
 * Update consultation status
 */
export const updateConsultationStatus = async (
  consultationId: string,
  status: Consultation['status'],
): Promise<void> => {
  try {
    
    // Get consultation data before updating
    const consultationDoc = await firestore()
      .collection(COLLECTIONS.CONSULTATIONS)
      .doc(consultationId)
      .get();

    if (!consultationDoc.exists) {
      throw new Error('Consultation not found');
    }

    const consultationData = consultationDoc.data();
    const consultation: Consultation = {
      id: consultationDoc.id,
      ...consultationData,
      scheduledTime: consultationData?.scheduledTime?.toDate(),
      createdAt: consultationData?.createdAt?.toDate(),
      updatedAt: consultationData?.updatedAt?.toDate(),
    } as Consultation;

    // Update status
    await firestore()
      .collection(COLLECTIONS.CONSULTATIONS)
      .doc(consultationId)
      .update({
        status,
        updatedAt: firestore.Timestamp.now(),
      });


    // Notifications are only sent when consultation is booked
    // Status change notifications disabled as per requirements
  } catch (error) {
    throw new Error('Failed to update consultation status.');
  }
};

/**
 * Cancel a consultation
 */
export const cancelConsultation = async (
  consultationId: string,
): Promise<void> => {
  try {
    await updateConsultationStatus(consultationId, 'cancelled');
  } catch (error) {
    throw new Error('Failed to cancel consultation.');
  }
};

/**
 * Fetch prescriptions for a user
 */
export const fetchPrescriptions = async (
  userId: string,
): Promise<Prescription[]> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.PRESCRIPTIONS)
      .where('patientId', '==', userId)
      .get();

    let prescriptions: Prescription[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      followUpDate: doc.data().followUpDate?.toDate(),
      createdAt: doc.data().createdAt?.toDate(),
    })) as Prescription[];

    // Sort in memory to avoid needing composite index
    prescriptions.sort((a, b) => {
      const dateA = a.createdAt?.getTime() || 0;
      const dateB = b.createdAt?.getTime() || 0;
      return dateB - dateA; // Descending order
    });

    return prescriptions;
  } catch (error) {
    throw new Error('Failed to fetch prescriptions. Please try again.');
  }
};

/**
 * Fetch a single prescription by ID
 */
export const fetchPrescriptionById = async (
  prescriptionId: string,
): Promise<Prescription> => {
  try {
    const doc = await firestore()
      .collection(COLLECTIONS.PRESCRIPTIONS)
      .doc(prescriptionId)
      .get();

    if (!doc.exists) {
      throw new Error('Prescription not found');
    }

    const prescription: Prescription = {
      id: doc.id,
      ...doc.data(),
      followUpDate: doc.data()?.followUpDate?.toDate(),
      createdAt: doc.data()?.createdAt?.toDate(),
    } as Prescription;

    return prescription;
  } catch (error) {
    throw new Error('Failed to fetch prescription. Please try again.');
  }
};

/**
 * Generate Agora token for video call (via Cloud Function)
 */
export const generateAgoraToken = async (
  channelName: string,
  userId: string,
): Promise<string> => {
  try {
    const generateToken = functions().httpsCallable('generateAgoraToken');
    const result = await generateToken({channelName, uid: userId});

    if (!result.data || !result.data.token) {
      throw new Error('Invalid token response');
    }

    return result.data.token;
  } catch (error) {
    throw new Error('Failed to generate video call token. Please try again.');
  }
};

export default {
  fetchDoctors,
  fetchDoctorById,
  searchDoctorsBySpecialization,
  fetchDoctorAvailability,
  bookConsultation,
  fetchUserConsultations,
  fetchConsultationById,
  updateConsultationStatus,
  cancelConsultation,
  fetchPrescriptions,
  fetchPrescriptionById,
  generateAgoraToken,
};
