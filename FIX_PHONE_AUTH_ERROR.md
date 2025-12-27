# Fix Firebase Phone Authentication Error

## Error: `auth/app-not-authorized`

This error occurs when your Android app's SHA-1 and SHA-256 fingerprints are not registered in Firebase Console. Firebase requires these fingerprints to verify that phone authentication requests are coming from your legitimate app.

## Quick Fix

### Step 1: Get SHA Fingerprints

Run the script to get your SHA fingerprints:

```bash
cd HomeServices
chmod +x get-sha-fingerprints.sh
./get-sha-fingerprints.sh
```

Or manually get them:

```bash
cd HomeServices/android
keytool -list -v -keystore app/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

Look for:
- **SHA1:** (copy the value)
- **SHA256:** (copy the value)

### Step 2: Add Fingerprints to Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **home-services-1ea69**
3. Click the gear icon ⚙️ next to "Project Overview"
4. Select **"Project settings"**
5. Scroll down to **"Your apps"** section
6. Find your Android app:
   - Package name: `com.homeservices.customer`
   - App ID: (should be listed)
7. Click **"Add fingerprint"** button
8. Add both fingerprints:
   - **SHA-1:** (paste your SHA-1 value)
   - **SHA-256:** (paste your SHA-256 value)
9. Click **"Save"**

### Step 3: Wait and Rebuild

- Wait **2-5 minutes** for Firebase to propagate the changes
- Rebuild your app:
  ```bash
  cd HomeServices
  npm run android
  ```

## Alternative: Using Gradle to Get SHA Fingerprints

You can also add this to your `android/app/build.gradle` to automatically print SHA fingerprints:

```gradle
android {
    // ... existing code ...
    
    signingConfigs {
        debug {
            // ... existing code ...
        }
    }
    
    // Add this task to print SHA fingerprints
    tasks.register('printShaFingerprints') {
        doLast {
            def keystoreFile = file('debug.keystore')
            if (keystoreFile.exists()) {
                exec {
                    commandLine 'keytool', '-list', '-v', '-keystore', keystoreFile.absolutePath,
                            '-alias', 'androiddebugkey', '-storepass', 'android', '-keypass', 'android'
                }
            } else {
                println "Debug keystore not found at: ${keystoreFile.absolutePath}"
            }
        }
    }
}
```

Then run:
```bash
cd HomeServices/android
./gradlew printShaFingerprints
```

## For Release Builds

When you create a release build, you'll need to add your **release keystore** fingerprints separately:

```bash
keytool -list -v -keystore /path/to/your/release.keystore -alias your-key-alias
```

Then add those fingerprints to Firebase Console as well.

## Verification

After adding fingerprints and rebuilding:

1. The error `auth/app-not-authorized` should disappear
2. Phone verification should work normally
3. You may see a reCAPTCHA challenge on first use (this is normal)

## Troubleshooting

### Still getting the error?

1. **Double-check fingerprints**: Make sure you copied the entire SHA-1 and SHA-256 values (they're long hex strings)
2. **Wait longer**: Sometimes Firebase takes up to 10 minutes to propagate changes
3. **Clear app data**: Uninstall and reinstall the app to clear cached authentication state
4. **Check package name**: Ensure your `applicationId` in `build.gradle` matches the package name in Firebase Console

### Error persists after 10 minutes?

1. Verify the package name matches exactly:
   - Firebase Console: Check the package name shown
   - `android/app/build.gradle`: Check `applicationId "com.homeservices.customer"`
2. Try adding fingerprints again (sometimes Firebase needs a refresh)
3. Check Firebase Console for any error messages about invalid fingerprints

## Related Files

- `HomeServices/android/app/build.gradle` - Contains package name and signing configs
- `HomeServices/android/app/debug.keystore` - Debug keystore file
- `HomeServices/src/services/authService.ts` - Phone authentication service

