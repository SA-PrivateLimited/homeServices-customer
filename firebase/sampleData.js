/**
 * Sample Firestore Data Script
 *
 * This script contains sample data for testing the HomeServices doctor consultation feature.
 *
 * INSTRUCTIONS:
 * 1. Go to Firebase Console > Firestore Database
 * 2. Manually create collections and add this data
 * OR
 * 3. Use Firebase Admin SDK to run this script (see below)
 */

// ========================================
// SAMPLE DOCTORS DATA
// ========================================

const sampleDoctors = [
  {
    // Document ID will be auto-generated
    name: "Sarah Johnson",
    email: "sarah.johnson@homeservices.com",
    phone: "+1234567890",
    specialization: "General Physician",
    experience: 8,
    profileImage: "https://i.pravatar.cc/150?img=1",
    qualifications: ["MBBS", "MD"],
    rating: 4.8,
    totalConsultations: 450,
    consultationFee: 500,
    languages: ["English", "Hindi"],
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Rajesh Kumar",
    email: "rajesh.kumar@homeservices.com",
    phone: "+9876543210",
    specialization: "Cardiologist",
    experience: 12,
    profileImage: "https://i.pravatar.cc/150?img=2",
    qualifications: ["MBBS", "MD", "DM Cardiology"],
    rating: 4.9,
    totalConsultations: 680,
    consultationFee: 800,
    languages: ["English", "Hindi", "Tamil"],
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Priya Sharma",
    email: "priya.sharma@homeservices.com",
    phone: "+1122334455",
    specialization: "Dermatologist",
    experience: 6,
    profileImage: "https://i.pravatar.cc/150?img=3",
    qualifications: ["MBBS", "MD Dermatology"],
    rating: 4.7,
    totalConsultations: 320,
    consultationFee: 600,
    languages: ["English", "Hindi"],
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Amit Patel",
    email: "amit.patel@homeservices.com",
    phone: "+9988776655",
    specialization: "Pediatrician",
    experience: 10,
    profileImage: "https://i.pravatar.cc/150?img=4",
    qualifications: ["MBBS", "MD Pediatrics"],
    rating: 4.9,
    totalConsultations: 540,
    consultationFee: 550,
    languages: ["English", "Hindi", "Gujarati"],
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Neha Gupta",
    email: "neha.gupta@homeservices.com",
    phone: "+5544332211",
    specialization: "Gynecologist",
    experience: 9,
    profileImage: "https://i.pravatar.cc/150?img=5",
    qualifications: ["MBBS", "MD Gynecology"],
    rating: 4.8,
    totalConsultations: 410,
    consultationFee: 700,
    languages: ["English", "Hindi"],
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Vikram Singh",
    email: "vikram.singh@homeservices.com",
    phone: "+6677889900",
    specialization: "Orthopedic",
    experience: 15,
    profileImage: "https://i.pravatar.cc/150?img=6",
    qualifications: ["MBBS", "MS Orthopedics"],
    rating: 4.9,
    totalConsultations: 720,
    consultationFee: 900,
    languages: ["English", "Hindi", "Punjabi"],
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Anita Reddy",
    email: "anita.reddy@homeservices.com",
    phone: "+7788990011",
    specialization: "Psychiatrist",
    experience: 7,
    profileImage: "https://i.pravatar.cc/150?img=7",
    qualifications: ["MBBS", "MD Psychiatry"],
    rating: 4.6,
    totalConsultations: 280,
    consultationFee: 750,
    languages: ["English", "Hindi", "Telugu"],
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    name: "Suresh Nair",
    email: "suresh.nair@homeservices.com",
    phone: "+8899001122",
    specialization: "Neurologist",
    experience: 11,
    profileImage: "https://i.pravatar.cc/150?img=8",
    qualifications: ["MBBS", "MD", "DM Neurology"],
    rating: 4.8,
    totalConsultations: 490,
    consultationFee: 850,
    languages: ["English", "Hindi", "Malayalam"],
    verified: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

// ========================================
// GENERATE AVAILABILITY FOR NEXT 7 DAYS
// ========================================

/**
 * Generate time slots for a doctor
 * Morning: 9:00 AM - 12:30 PM (30-min slots)
 * Evening: 4:00 PM - 8:00 PM (30-min slots)
 */
function generateTimeSlots() {
  const slots = [];

  // Morning slots (9:00 - 12:30)
  for (let hour = 9; hour <= 12; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 12 && minute === 30) break;
      const startHour = hour.toString().padStart(2, '0');
      const startMin = minute.toString().padStart(2, '0');
      const endMinute = minute + 30;
      const endHour = endMinute >= 60 ? hour + 1 : hour;
      const endMin = (endMinute % 60).toString().padStart(2, '0');

      slots.push({
        startTime: `${startHour}:${startMin}`,
        endTime: `${endHour.toString().padStart(2, '0')}:${endMin}`,
        isBooked: false
      });
    }
  }

  // Evening slots (16:00 - 20:00)
  for (let hour = 16; hour < 20; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const startHour = hour.toString().padStart(2, '0');
      const startMin = minute.toString().padStart(2, '0');
      const endMinute = minute + 30;
      const endHour = endMinute >= 60 ? hour + 1 : hour;
      const endMin = (endMinute % 60).toString().padStart(2, '0');

      slots.push({
        startTime: `${startHour}:${startMin}`,
        endTime: `${endHour.toString().padStart(2, '0')}:${endMin}`,
        isBooked: false
      });
    }
  }

  return slots;
}

/**
 * Generate availability documents for a doctor for the next 7 days
 */
function generateDoctorAvailability(doctorId) {
  const availability = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateString = date.toISOString().split('T')[0]; // YYYY-MM-DD

    availability.push({
      // Document ID format: doctorId_YYYY-MM-DD
      id: `${doctorId}_${dateString}`,
      doctorId: doctorId,
      date: dateString,
      slots: generateTimeSlots(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  return availability;
}

// ========================================
// FIREBASE ADMIN SDK SCRIPT (OPTIONAL)
// ========================================

/**
 * To use this script with Firebase Admin SDK:
 *
 * 1. Install Firebase Admin SDK:
 *    npm install firebase-admin
 *
 * 2. Download service account key from Firebase Console:
 *    Project Settings > Service Accounts > Generate New Private Key
 *
 * 3. Save as serviceAccountKey.json in firebase/ folder
 *
 * 4. Create uploadData.js with the following code:
 */

/*
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const { sampleDoctors, generateDoctorAvailability } = require('./sampleData');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function uploadSampleData() {
  console.log('Starting data upload...');

  try {
    // Upload doctors
    console.log('Uploading doctors...');
    const doctorIds = [];

    for (const doctor of sampleDoctors) {
      const docRef = await db.collection('doctors').add(doctor);
      doctorIds.push(docRef.id);
      console.log(`Added doctor: ${doctor.name} (${docRef.id})`);
    }

    // Upload availability for each doctor
    console.log('\nUploading availability...');

    for (const doctorId of doctorIds) {
      const availabilityDocs = generateDoctorAvailability(doctorId);

      for (const availability of availabilityDocs) {
        await db.collection('availability').doc(availability.id).set(availability);
        console.log(`Added availability for ${doctorId} on ${availability.date}`);
      }
    }

    console.log('\n✓ All sample data uploaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error uploading data:', error);
    process.exit(1);
  }
}

uploadSampleData();
*/

// ========================================
// MANUAL UPLOAD INSTRUCTIONS
// ========================================

/**
 * MANUAL UPLOAD TO FIRESTORE:
 *
 * 1. Go to Firebase Console: https://console.firebase.google.com
 * 2. Select your project
 * 3. Go to Firestore Database
 * 4. Create collections manually:
 *
 * For 'doctors' collection:
 * - Click "Start collection"
 * - Collection ID: doctors
 * - Add each doctor from sampleDoctors array above
 * - Copy the auto-generated Document ID for each doctor
 *
 * For 'availability' collection:
 * - Click "Start collection"
 * - Collection ID: availability
 * - For each doctor ID you copied:
 *   - Run generateDoctorAvailability(doctorId) in browser console
 *   - Add each availability document manually
 *   - Use the format: doctorId_YYYY-MM-DD as Document ID
 *
 * NOTE: This is tedious! We recommend using the Firebase Admin SDK script above.
 */

// ========================================
// EXPORT DATA
// ========================================

module.exports = {
  sampleDoctors,
  generateTimeSlots,
  generateDoctorAvailability
};

// For browser console testing:
if (typeof window !== 'undefined') {
  window.HomeServicesSampleData = {
    sampleDoctors,
    generateTimeSlots,
    generateDoctorAvailability
  };
}
