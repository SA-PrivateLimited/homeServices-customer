const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Sample doctors data
const sampleDoctors = [
  {
    id: 'doctor_001',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@homeservices.com',
    phone: '+1234567890',
    specialization: 'General Physician',
    experience: 8,
    profileImage: 'https://randomuser.me/api/portraits/women/1.jpg',
    qualifications: ['MBBS', 'MD - General Medicine'],
    rating: 4.8,
    totalConsultations: 342,
    consultationFee: 500,
    languages: ['English', 'Hindi'],
    verified: true,
  },
  {
    id: 'doctor_002',
    name: 'Michael Chen',
    email: 'michael.chen@homeservices.com',
    phone: '+1234567891',
    specialization: 'Cardiologist',
    experience: 12,
    profileImage: 'https://randomuser.me/api/portraits/men/2.jpg',
    qualifications: ['MBBS', 'MD - Cardiology', 'DM - Interventional Cardiology'],
    rating: 4.9,
    totalConsultations: 567,
    consultationFee: 800,
    languages: ['English', 'Mandarin'],
    verified: true,
  },
  {
    id: 'doctor_003',
    name: 'Priya Sharma',
    email: 'priya.sharma@homeservices.com',
    phone: '+1234567892',
    specialization: 'Dermatologist',
    experience: 6,
    profileImage: 'https://randomuser.me/api/portraits/women/3.jpg',
    qualifications: ['MBBS', 'MD - Dermatology'],
    rating: 4.7,
    totalConsultations: 289,
    consultationFee: 600,
    languages: ['English', 'Hindi', 'Tamil'],
    verified: true,
  },
  {
    id: 'doctor_004',
    name: 'David Williams',
    email: 'david.williams@homeservices.com',
    phone: '+1234567893',
    specialization: 'Pediatrician',
    experience: 10,
    profileImage: 'https://randomuser.me/api/portraits/men/4.jpg',
    qualifications: ['MBBS', 'MD - Pediatrics', 'Fellowship in Neonatology'],
    rating: 4.9,
    totalConsultations: 456,
    consultationFee: 700,
    languages: ['English', 'Spanish'],
    verified: true,
  },
  {
    id: 'doctor_005',
    name: 'Anjali Patel',
    email: 'anjali.patel@homeservices.com',
    phone: '+1234567894',
    specialization: 'Gynecologist',
    experience: 9,
    profileImage: 'https://randomuser.me/api/portraits/women/5.jpg',
    qualifications: ['MBBS', 'MS - Obstetrics & Gynecology'],
    rating: 4.8,
    totalConsultations: 398,
    consultationFee: 750,
    languages: ['English', 'Hindi', 'Gujarati'],
    verified: true,
  },
  {
    id: 'doctor_006',
    name: 'Robert Taylor',
    email: 'robert.taylor@homeservices.com',
    phone: '+1234567895',
    specialization: 'Orthopedist',
    experience: 15,
    profileImage: 'https://randomuser.me/api/portraits/men/6.jpg',
    qualifications: ['MBBS', 'MS - Orthopedics', 'MCh - Joint Replacement'],
    rating: 4.9,
    totalConsultations: 634,
    consultationFee: 900,
    languages: ['English'],
    verified: true,
  },
  {
    id: 'doctor_007',
    name: 'Lisa Anderson',
    email: 'lisa.anderson@homeservices.com',
    phone: '+1234567896',
    specialization: 'Psychiatrist',
    experience: 7,
    profileImage: 'https://randomuser.me/api/portraits/women/7.jpg',
    qualifications: ['MBBS', 'MD - Psychiatry', 'Diploma in Clinical Psychology'],
    rating: 4.7,
    totalConsultations: 312,
    consultationFee: 650,
    languages: ['English', 'French'],
    verified: true,
  },
  {
    id: 'doctor_008',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@homeservices.com',
    phone: '+1234567897',
    specialization: 'ENT Specialist',
    experience: 11,
    profileImage: 'https://randomuser.me/api/portraits/men/8.jpg',
    qualifications: ['MBBS', 'MS - ENT', 'Fellowship in Rhinology'],
    rating: 4.8,
    totalConsultations: 423,
    consultationFee: 700,
    languages: ['English', 'Hindi', 'Telugu'],
    verified: true,
  },
];

// Generate availability for next 7 days
function generateAvailability(doctorId) {
  const availability = [];
  const today = new Date();

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    const dateString = date.toISOString().split('T')[0];

    // Morning slots: 9:00 AM - 12:30 PM (30-minute slots)
    const morningSlots = [];
    for (let hour = 9; hour < 13; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        if (hour === 12 && minute === 30) break;
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endHour = minute === 30 ? hour + 1 : hour;
        const endMinute = minute === 30 ? 0 : minute + 30;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        morningSlots.push({
          id: `${doctorId}_${dateString}_${startTime.replace(':', '')}`,
          startTime,
          endTime,
          isBooked: false,
        });
      }
    }

    // Evening slots: 4:00 PM - 8:00 PM (30-minute slots)
    const eveningSlots = [];
    for (let hour = 16; hour < 20; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const startTime = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const endHour = minute === 30 ? hour + 1 : hour;
        const endMinute = minute === 30 ? 0 : minute + 30;
        const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;

        eveningSlots.push({
          id: `${doctorId}_${dateString}_${startTime.replace(':', '')}`,
          startTime,
          endTime,
          isBooked: false,
        });
      }
    }

    availability.push({
      id: `${doctorId}_${dateString}`,
      doctorId,
      date: dateString,
      slots: [...morningSlots, ...eveningSlots],
    });
  }

  return availability;
}

async function uploadData() {
  console.log('Starting data upload...\n');

  try {
    // Upload doctors
    console.log('Uploading doctors...');
    const batch = db.batch();

    for (const doctor of sampleDoctors) {
      const docRef = db.collection('doctors').doc(doctor.id);
      batch.set(docRef, doctor);
      console.log(`✓ Added doctor: ${doctor.name} (${doctor.specialization})`);
    }

    await batch.commit();
    console.log('\n✓ All doctors uploaded successfully!\n');

    // Upload availability
    console.log('Uploading availability slots...');

    for (const doctor of sampleDoctors) {
      const availability = generateAvailability(doctor.id);
      const availabilityBatch = db.batch();

      for (const avail of availability) {
        const availRef = db.collection('availability').doc(avail.id);
        availabilityBatch.set(availRef, avail);
      }

      await availabilityBatch.commit();
      console.log(`✓ Added ${availability.length} days of availability for ${doctor.name}`);
    }

    console.log('\n✓ All availability slots uploaded successfully!\n');
    console.log('Data upload completed!');
    console.log(`\nSummary:`);
    console.log(`- ${sampleDoctors.length} doctors uploaded`);
    console.log(`- ${sampleDoctors.length * 7} availability records created`);
    console.log(`- Ready for testing!\n`);

  } catch (error) {
    console.error('Error uploading data:', error);
  } finally {
    process.exit(0);
  }
}

// Run the upload
uploadData();
