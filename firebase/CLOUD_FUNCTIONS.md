# Cloud Functions Setup Guide

This guide explains how to set up and deploy Firebase Cloud Functions for HomeServices.

## 📋 Prerequisites

1. Firebase project created
2. Firebase CLI installed: `npm install -g firebase-tools`
3. Billing enabled (Blaze plan required for Cloud Functions)

## 🚀 Setup Instructions

### Step 1: Login to Firebase

```bash
firebase login
```

### Step 2: Initialize Firebase in Project

```bash
cd firebase
firebase init
```

Select:
- ✅ Functions
- ✅ Firestore
- Choose existing project: HomeServices
- Language: TypeScript
- ESLint: Yes
- Install dependencies: Yes

### Step 3: Configure Agora Credentials

Set Agora credentials as environment variables:

```bash
firebase functions:config:set agora.app_id="YOUR_AGORA_APP_ID"
firebase functions:config:set agora.app_certificate="YOUR_AGORA_APP_CERTIFICATE"
```

Get App Certificate from Agora Console:
- Go to https://console.agora.io
- Select your project
- Go to Project Management
- Copy App ID and Primary Certificate

### Step 4: Install Dependencies

```bash
cd functions
npm install
```

### Step 5: Build Functions

```bash
npm run build
```

### Step 6: Deploy Functions

```bash
firebase deploy --only functions
```

Or deploy individual functions:
```bash
firebase deploy --only functions:generateAgoraToken
firebase deploy --only functions:onConsultationBooked
```

## 📝 Available Cloud Functions

### 1. `generateAgoraToken` (Callable)
Generates Agora RTC token for video calls.

**Usage in app:**
```typescript
import functions from '@react-native-firebase/functions';

const generateToken = functions().httpsCallable('generateAgoraToken');
const result = await generateToken({
  channelName: 'consultation_123',
  uid: 'user_id'
});
const token = result.data.token;
```

**Security:**
- ✅ Requires authentication
- ✅ Token expires in 1 hour
- ✅ Server-side generation (secure)

### 2. `onConsultationBooked` (Firestore Trigger)
Automatically sends FCM notification when a consultation is booked.

**Trigger:** New document in `consultations` collection

**Action:**
- Fetches patient's FCM token
- Sends booking confirmation notification

### 3. `sendConsultationReminder` (Scheduled)
Sends appointment reminders 1 hour before consultation.

**Schedule:** Runs every 10 minutes

**Action:**
- Finds consultations starting in next hour
- Sends reminder to patient
- Marks reminder as sent

### 4. `updateDoctorStats` (Firestore Trigger)
Updates doctor statistics when consultation is completed.

**Trigger:** Consultation status changed to 'completed'

**Action:**
- Increments doctor's totalConsultations count

### 5. `notifyDoctorJoined` (Callable)
Notifies patient when doctor joins the video call.

**Usage:**
```typescript
const notifyDoctorJoined = functions().httpsCallable('notifyDoctorJoined');
await notifyDoctorJoined({ consultationId: '123' });
```

### 6. `onPrescriptionCreated` (Firestore Trigger)
Sends notification when a prescription is added.

**Trigger:** New document in `prescriptions` collection

**Action:**
- Sends "Prescription Received" notification to patient

## 🧪 Testing Functions Locally

### Start Emulators

```bash
firebase emulators:start
```

This starts:
- Functions emulator (port 5001)
- Firestore emulator (port 8080)
- Auth emulator (port 9099)

### Test in App

Update Firebase config to use emulators (development only):

```typescript
import functions from '@react-native-firebase/functions';
import firestore from '@react-native-firebase/firestore';

if (__DEV__) {
  // Use emulators
  functions().useEmulator('localhost', 5001);
  firestore().useEmulator('localhost', 8080);
}
```

## 📊 Monitoring

### View Logs

```bash
firebase functions:log
```

Or in Firebase Console:
- Functions → Logs tab

### View Usage

Firebase Console → Functions → Usage tab

Shows:
- Invocations
- Execution time
- Memory usage
- Errors

## 💰 Cost Optimization

### Free Tier (Spark Plan)
- ❌ Cloud Functions not available

### Blaze Plan (Pay as you go)
- ✅ 2M invocations/month free
- ✅ 400K GB-seconds free
- ✅ 200K CPU-seconds free

**Typical costs for 1000 consultations/month:**
- ~$1-2 for Functions
- ~$5-10 for Firestore
- Total: ~$6-12/month

### Optimization Tips

1. **Use scheduled functions wisely**
   - Current: every 10 minutes = 4,320 invocations/month
   - Optimize: Check only during business hours

2. **Cache results**
   - Don't regenerate Agora tokens unnecessarily
   - Cache doctor stats

3. **Batch operations**
   - Send multiple notifications in one function call

## 🔒 Security Rules

### Function Security

All callable functions check authentication:
```typescript
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', ...);
}
```

### Firestore Rules

Ensure security rules allow function writes:
```
service cloud.firestore {
  match /databases/{database}/documents {
    match /doctors/{doctorId} {
      allow write: if false; // Only via Cloud Functions
    }
  }
}
```

## 🐛 Troubleshooting

### "Billing account not configured"
- Upgrade to Blaze plan in Firebase Console
- Add payment method

### "Function not found"
- Wait 1-2 minutes after deployment
- Check function name matches exactly
- Verify deployment succeeded

### "Permission denied"
- Check user is authenticated
- Verify security rules
- Check function execution logs

### "CORS error"
- Callable functions handle CORS automatically
- For HTTP functions, add CORS headers

## 🔄 Continuous Deployment

### Using GitHub Actions

Create `.github/workflows/deploy-functions.yml`:

```yaml
name: Deploy Functions
on:
  push:
    branches:
      - main
    paths:
      - 'firebase/functions/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
        working-directory: ./firebase/functions
      - uses: w9jds/firebase-action@master
        with:
          args: deploy --only functions
        env:
          FIREBASE_TOKEN: ${{ secrets.FIREBASE_TOKEN }}
```

### Get Firebase Token

```bash
firebase login:ci
```

Add token to GitHub Secrets as `FIREBASE_TOKEN`.

## 📚 Next Steps

1. ✅ Deploy functions: `firebase deploy --only functions`
2. ✅ Test Agora token generation
3. ✅ Test notifications flow
4. ✅ Monitor logs for errors
5. 🔜 Implement video calling (Phase 5)
6. 🔜 Implement chat (Phase 6)
7. 🔜 Implement prescriptions (Phase 7)

## 🆘 Support

- [Firebase Functions Documentation](https://firebase.google.com/docs/functions)
- [Agora Token Documentation](https://docs.agora.io/en/video-calling/develop/authentication-workflow)
- [Firebase CLI Reference](https://firebase.google.com/docs/cli)

## ⚠️ Important Notes

1. **Never commit App Certificate** to version control
2. **Use environment variables** for secrets
3. **Test locally** before deploying to production
4. **Monitor costs** regularly
5. **Set up alerts** for function errors
