/**
 * Service for sending emails using EmailJS (Free tier - 200 emails/month)
 * 
 * Setup Instructions:
 * 1. Sign up at https://www.emailjs.com/ (free account)
 * 2. Create an email service (Gmail, Outlook, etc.)
 * 3. Create email templates for patient and doctor
 * 4. Get your Public Key, Service ID, and Template IDs
 * 5. Add them to your .env file or replace the constants below
 */

// EmailJS Configuration - Replace these with your actual values
// Get these from https://dashboard.emailjs.com/admin
const EMAILJS_PUBLIC_KEY = '9E-U7G-rHyr4N-bxH'; // Replace with your EmailJS Public Key
const EMAILJS_SERVICE_ID = 'service_m1201yx'; // Replace with your EmailJS Service ID
const EMAILJS_PATIENT_TEMPLATE_ID = 'template_lj9m9qn'; // Replace with Patient Template ID
const EMAILJS_DOCTOR_TEMPLATE_ID = 'template_8t5gn8o'; // Replace with Doctor Template ID

interface SendConsultationEmailData {
  consultationId: string;
  patientName: string;
  patientEmail: string;
  doctorName: string;
  doctorEmail: string;
  scheduledTime: Date;
  googleMeetLink: string;
  consultationFee: number;
  doctorSpecialization: string;
}

/**
 * Format date for email display
 */
const formatDateForEmail = (date: Date): string => {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Send consultation confirmation email with Google Meet link to both patient and doctor
 * Uses EmailJS (free tier) - works directly from the app, no backend needed
 */
export const sendConsultationEmails = async (
  data: SendConsultationEmailData,
): Promise<void> => {
  try {

    // Check if EmailJS is configured
    if (!EMAILJS_PUBLIC_KEY || !EMAILJS_SERVICE_ID) {
      return;
    }

    const formattedDate = formatDateForEmail(data.scheduledTime);

    // Prepare email data for patient
    const patientEmailData = {
      to_email: data.patientEmail,
      to_name: data.patientName,
      doctor_name: data.doctorName,
      specialization: data.doctorSpecialization,
      date_time: formattedDate,
      consultation_fee: `₹${data.consultationFee}`,
      meet_link: data.googleMeetLink,
      consultation_id: data.consultationId,
    };

    // Prepare email data for doctor
    const doctorEmailData = {
      to_email: data.doctorEmail,
      to_name: `Dr. ${data.doctorName}`,
      patient_name: data.patientName,
      date_time: formattedDate,
      consultation_fee: `₹${data.consultationFee}`,
      meet_link: data.googleMeetLink,
      consultation_id: data.consultationId,
    };

    // Send emails using EmailJS API (direct HTTP call)
    const emailJSUrl = 'https://api.emailjs.com/api/v1.0/email/send';

    // Send patient email
    const patientResponse = await fetch(emailJSUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_PATIENT_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: patientEmailData,
      }),
    });

    // Send doctor email
    const doctorResponse = await fetch(emailJSUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        service_id: EMAILJS_SERVICE_ID,
        template_id: EMAILJS_DOCTOR_TEMPLATE_ID,
        user_id: EMAILJS_PUBLIC_KEY,
        template_params: doctorEmailData,
      }),
    });

    if (!patientResponse.ok) {
      console.error('Failed to send patient email:', await patientResponse.text());
    }
    if (!doctorResponse.ok) {
      console.error('Failed to send doctor email:', await doctorResponse.text());
    }

    if (patientResponse.ok && doctorResponse.ok) {
    }
  } catch (error: any) {
    // Don't throw error - email sending failure shouldn't block consultation creation
    // Just log it for now
  }
};

/**
 * Generate a valid Google Meet link code in the format xxx-yyyy-zzz
 * Note: This generates a random meeting code. For production, you might want to use Google Calendar API
 * to create actual calendar events with Meet links.
 */
export const generateGoogleMeetLink = (consultationId: string): string => {
  // Generate a deterministic but valid-looking meeting code based on consultation ID
  // Google Meet format: xxx-yyyy-zzz (3-4-3 characters with hyphens)
  
  // Create a hash-like string from consultation ID
  let hash = 0;
  for (let i = 0; i < consultationId.length; i++) {
    const char = consultationId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  // Generate 10 alphanumeric characters (using only uppercase letters and numbers)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  let seed = Math.abs(hash);
  
  for (let i = 0; i < 10; i++) {
    seed = (seed * 9301 + 49297) % 233280; // Simple PRNG
    code += chars[seed % chars.length];
  }
  
  // Format as xxx-yyyy-zzz
  const formattedCode = `${code.substring(0, 3)}-${code.substring(3, 7)}-${code.substring(7, 10)}`;
  
  return `https://meet.google.com/${formattedCode}`;
  
  // Alternative: Use Google Calendar API to create event and get Meet link
  // This would require setting up Google Calendar API credentials
};

