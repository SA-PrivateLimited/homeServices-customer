# Firebase Setup for HomeServices

This directory contains Firebase configuration and sample data for the HomeServices app.

## 📋 Prerequisites

1. **Firebase Project** - Create one at [Firebase Console](https://console.firebase.google.com)
2. **Firebase CLI** (optional) - `npm install -g firebase-tools`

## 🚀 Quick Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Add project"
3. Enter project name: "HomeServices"
4. Enable Google Analytics (optional)
5. Click "Create Project"

### Step 2: Add Android App

1. In Firebase Console, click "Add app" → Android icon
2. Android package name: Check your app's package name in `android/app/build.gradle`
3. Download `google-services.json`
4. **Important**: Place it at `/android/app/google-services.json`

### Step 3: Enable Firebase Services

#### Authentication
1. Go to **Authentication** → Get Started
2. Enable **Email/Password** sign-in method
3. Enable **Phone** sign-in method

#### Firestore Database
1. Go to **Firestore Database** → Create database
2. Start in **Test Mode** (for development)
3. Select region closest to you
4. Click "Enable"

#### Cloud Storage
1. Go to **Storage** → Get Started
2. Start in **Test Mode**
3. Click "Done"

#### Cloud Messaging (FCM)
- Already enabled by default

#### Cloud Functions (Optional - for video calls)
1. Go to **Functions**
2. Upgrade to **Blaze Plan** (pay-as-you-go)
3. Required for Agora token generation

### Step 4: Configure Security Rules

#### Firestore Security Rules

Go to Firestore → Rules tab and paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return request.auth.uid == userId;
    }

    // Users collection
    match /users/{userId} {
      allow read: if isAuthenticated();
      allow write: if isOwner(userId);
    }

    // Doctors collection (public read)
    match /doctors/{doctorId} {
      allow read: if true;
      allow write: if false; // Only via admin SDK
    }

    // Availability (public read, admin write)
    match /availability/{availabilityId} {
      allow read: if true;
      allow write: if false;
    }

    // Consultations
    match /consultations/{consultationId} {
      allow read: if isAuthenticated() &&
        (resource.data.patientId == request.auth.uid ||
         resource.data.doctorId == request.auth.uid);
      allow create: if isAuthenticated();
      allow update: if isAuthenticated() &&
        (resource.data.patientId == request.auth.uid ||
         resource.data.doctorId == request.auth.uid);
    }

    // Messages
    match /messages/{messageId} {
      allow read: if isAuthenticated();
      allow create: if isAuthenticated();
    }

    // Prescriptions
    match /prescriptions/{prescriptionId} {
      allow read: if isAuthenticated() &&
        (resource.data.patientId == request.auth.uid ||
         resource.data.doctorId == request.auth.uid);
      allow create: if isAuthenticated();
    }
  }
}
```

#### Storage Security Rules

Go to Storage → Rules tab and paste:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Chat images
    match /chat_images/{imageId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 5 * 1024 * 1024; // 5MB max
    }

    // Prescriptions
    match /prescriptions/{consultationId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && request.resource.size < 10 * 1024 * 1024; // 10MB max
    }
  }
}
```

## 📊 Upload Sample Data

### Option 1: Automated Upload (Recommended)

1. Install Firebase Admin SDK:
```bash
cd firebase
npm install firebase-admin
```

2. Download service account key:
   - Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Save as `serviceAccountKey.json` in `firebase/` folder

3. Create `uploadData.js`:
```javascript
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
    const doctorIds = [];
    for (const doctor of sampleDoctors) {
      const docRef = await db.collection('doctors').add(doctor);
      doctorIds.push(docRef.id);
      console.log(`✓ Added doctor: ${doctor.name}`);
    }

    // Upload availability
    for (const doctorId of doctorIds) {
      const availabilityDocs = generateDoctorAvailability(doctorId);
      for (const availability of availabilityDocs) {
        await db.collection('availability').doc(availability.id).set(availability);
      }
      console.log(`✓ Added availability for doctor ${doctorId}`);
    }

    console.log('\n✅ All sample data uploaded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

uploadSampleData();
```

4. Run the script:
```bash
node uploadData.js
```

### Option 2: Manual Upload

1. Go to Firestore Database in Firebase Console
2. Create `doctors` collection
3. Add each doctor from `sampleData.js`
4. Note the auto-generated Document IDs
5. Create `availability` collection
6. For each doctor, add 7 days of availability

## 🔑 Environment Variables

Update `.env` file in project root:

```env
# Agora (already configured)
AGORA_APP_ID=7213cb0f19ac4fe4b1fbf5d45827dddd

# Firebase (add these from Firebase Console)
FIREBASE_API_KEY=your_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=your_sender_id
FIREBASE_APP_ID=your_app_id
```

Get these values from:
Firebase Console → Project Settings → General → Your apps → Config

## 🧪 Testing

### Test Authentication

1. Run the app: `npx react-native run-android`
2. Navigate to Profile tab
3. Click "Login"
4. Try signing up with email

### Test Doctor Listings

1. Navigate to Consultations tab
2. You should see the sample doctors
3. Try filtering by specialization
4. Search for doctor names

### Test Booking

1. Click on a doctor
2. Click "Book Consultation"
3. Select a date and time slot
4. Complete booking

## 📝 Sample Data Included

- **8 Doctors** across different specializations:
  - General Physician
  - Cardiologist
  - Dermatologist
  - Pediatrician
  - Gynecologist
  - Orthopedic
  - Psychiatrist
  - Neurologist

- **7 Days of Availability** for each doctor:
  - Morning: 9:00 AM - 12:30 PM
  - Evening: 4:00 PM - 8:00 PM
  - 30-minute slots

## 🔧 Troubleshooting

### "Default FirebaseApp is not initialized"
- Ensure `google-services.json` is at `/android/app/google-services.json`
- Rebuild the app: `npx react-native run-android`

### "Permission Denied" in Firestore
- Check security rules are configured correctly
- Ensure user is authenticated before accessing data

### No doctors showing up
- Verify sample data is uploaded to Firestore
- Check Firestore console to see if collections exist
- Check app logs for errors

## 📚 Next Steps

1. ✅ Complete Firebase setup above
2. ✅ Upload sample data
3. ✅ Test authentication
4. ✅ Test booking flow
5. 🔜 Implement Phase 4: Notifications
6. 🔜 Implement Phase 5: Video Calling
7. 🔜 Implement Phase 6: Chat
8. 🔜 Implement Phase 7: Prescriptions

## 💡 Tips

- Use **Test Mode** rules during development
- Switch to **Production Mode** before deploying
- Set up **Firebase App Check** for production security
- Monitor usage in Firebase Console → Usage tab
- Set up billing alerts to avoid unexpected charges

## 🆘 Need Help?

- [Firebase Documentation](https://firebase.google.com/docs)
- [React Native Firebase](https://rnfirebase.io/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
