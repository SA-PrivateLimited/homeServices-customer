# Fix: Re-download google-services.json

## Problem
The `google-services.json` file contains old certificate hashes that don't match your current keystore fingerprints. This file needs to be updated after adding SHA fingerprints to Firebase Console.

## Solution

### Step 1: Re-download google-services.json from Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **home-services-1ea69**
3. Click the gear icon ⚙️ → **Project settings**
4. Scroll down to **"Your apps"** section
5. Find **`homeServiceCustomer`** app (`com.homeservices.customer`)
6. Click **"Download google-services.json"** button
7. **Replace** the existing file at:
   ```
   HomeServices/android/app/google-services.json
   ```

### Step 2: Verify the New File Contains Your Fingerprints

After downloading, check that the new `google-services.json` contains OAuth client entries with certificate hashes matching your SHA-1 fingerprints:

**Debug SHA-1 (without colons, lowercase):**
- `3fb539ad690adca1e59c07785778ddb770e9344e`

**Release SHA-1 (without colons, lowercase):**
- `f1512e11065ff826b4eed6b1a29b73e94d6c68ae`

These should appear in the `certificate_hash` fields within the `oauth_client` entries.

### Step 3: Clean and Rebuild

After replacing the file:

```bash
cd HomeServices
cd android
./gradlew clean
cd ..
npm run android
```

### Step 4: Test Phone Authentication

1. Open the app
2. Try phone login
3. The error should be resolved

## Why This Happens

When you add SHA fingerprints to Firebase Console, Firebase generates new OAuth client configurations. The `google-services.json` file needs to be re-downloaded to include these new configurations. The old file still has the previous certificate hashes, which is why authentication fails.

## Important Notes

- Always re-download `google-services.json` after adding/removing SHA fingerprints
- The certificate_hash in google-services.json should match your SHA-1 fingerprint (without colons, lowercase)
- Wait 2-5 minutes after downloading before testing to ensure Firebase has propagated the changes

