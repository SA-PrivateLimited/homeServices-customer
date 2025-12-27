# Upload Sample Data to Firebase

This guide will help you upload sample doctors and availability data to your Firebase Firestore database.

## Prerequisites

1. Firebase project created
2. Node.js installed (v14 or higher)
3. Service account key downloaded from Firebase Console

## Step 1: Download Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your HomeServices project
3. Click the gear icon → **Project Settings**
4. Go to **Service Accounts** tab
5. Click **Generate New Private Key**
6. Save the downloaded JSON file as `serviceAccountKey.json` in the `firebase/` folder

**Important**: Never commit `serviceAccountKey.json` to version control!

## Step 2: Install Dependencies

```bash
cd firebase
npm init -y
npm install firebase-admin
```

## Step 3: Run Upload Script

```bash
node uploadSampleData.js
```

You should see output like:

```
Starting data upload...

Uploading doctors...
✓ Added doctor: Sarah Johnson (General Physician)
✓ Added doctor: Michael Chen (Cardiologist)
✓ Added doctor: Priya Sharma (Dermatologist)
✓ Added doctor: David Williams (Pediatrician)
✓ Added doctor: Anjali Patel (Gynecologist)
✓ Added doctor: Robert Taylor (Orthopedist)
✓ Added doctor: Lisa Anderson (Psychiatrist)
✓ Added doctor: Rajesh Kumar (ENT Specialist)

✓ All doctors uploaded successfully!

Uploading availability slots...
✓ Added 7 days of availability for Sarah Johnson
✓ Added 7 days of availability for Michael Chen
✓ Added 7 days of availability for Priya Sharma
✓ Added 7 days of availability for David Williams
✓ Added 7 days of availability for Anjali Patel
✓ Added 7 days of availability for Robert Taylor
✓ Added 7 days of availability for Lisa Anderson
✓ Added 7 days of availability for Rajesh Kumar

✓ All availability slots uploaded successfully!

Data upload completed!

Summary:
- 8 doctors uploaded
- 56 availability records created
- Ready for testing!
```

## Step 4: Verify Data in Firebase Console

1. Go to Firebase Console → Firestore Database
2. You should see two collections:
   - **doctors** (8 documents)
   - **availability** (56 documents)

## Sample Data Overview

### Doctors (8 total)

1. **Sarah Johnson** - General Physician (₹500)
2. **Michael Chen** - Cardiologist (₹800)
3. **Priya Sharma** - Dermatologist (₹600)
4. **David Williams** - Pediatrician (₹700)
5. **Anjali Patel** - Gynecologist (₹750)
6. **Robert Taylor** - Orthopedist (₹900)
7. **Lisa Anderson** - Psychiatrist (₹650)
8. **Rajesh Kumar** - ENT Specialist (₹700)

### Availability

Each doctor has 7 days of availability with:
- **Morning slots**: 9:00 AM - 12:30 PM (7 slots per day)
- **Evening slots**: 4:00 PM - 8:00 PM (8 slots per day)
- **Total**: 15 time slots per day × 7 days = 105 slots per doctor

## Firestore Structure

### doctors/{doctorId}
```json
{
  "id": "doctor_001",
  "name": "Sarah Johnson",
  "email": "sarah.johnson@homeservices.com",
  "phone": "+1234567890",
  "specialization": "General Physician",
  "experience": 8,
  "profileImage": "https://randomuser.me/api/portraits/women/1.jpg",
  "qualifications": ["MBBS", "MD - General Medicine"],
  "rating": 4.8,
  "totalConsultations": 342,
  "consultationFee": 500,
  "languages": ["English", "Hindi"],
  "verified": true
}
```

### availability/{doctorId}_{date}
```json
{
  "id": "doctor_001_2025-11-29",
  "doctorId": "doctor_001",
  "date": "2025-11-29",
  "slots": [
    {
      "id": "doctor_001_2025-11-29_0900",
      "startTime": "09:00",
      "endTime": "09:30",
      "isBooked": false
    },
    // ... more slots
  ]
}
```

## Testing

After uploading data, you can test:

1. **Doctor List**: Open the app → Consultations tab → Should show 8 doctors
2. **Search**: Search for "Cardio" → Should show Michael Chen
3. **Filter**: Filter by "Dermatologist" → Should show Priya Sharma
4. **Booking**: Select a doctor → Pick a date → See available slots
5. **Video Call**: Book a consultation → Join the call (requires Agora setup)

## Troubleshooting

### "Cannot find module 'firebase-admin'"
Run: `npm install firebase-admin`

### "ENOENT: no such file or directory, open 'serviceAccountKey.json'"
Make sure you downloaded the service account key and saved it in the `firebase/` folder.

### "Permission denied"
Verify your service account key has the correct permissions in Firebase Console.

### "Firestore has not been initialized"
Check that your Firebase project is properly configured and the service account key is valid.

## Clean Up

To delete all sample data:

```bash
# Go to Firebase Console → Firestore Database
# Delete collections: doctors, availability
```

## Next Steps

1. ✅ Upload sample data
2. 🔜 Test doctor listing and search
3. 🔜 Test booking flow
4. 🔜 Implement video calling (Phase 5)
5. 🔜 Deploy Cloud Functions for notifications
