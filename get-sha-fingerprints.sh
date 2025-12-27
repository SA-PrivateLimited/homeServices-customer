#!/bin/bash

# Script to get SHA-1 and SHA-256 fingerprints for Firebase Phone Authentication
# This is required for Android apps to use Firebase Phone Authentication

echo "=========================================="
echo "Getting SHA Fingerprints for HomeServices"
echo "=========================================="
echo ""

# Navigate to android directory
cd "$(dirname "$0")/android"

echo "Getting SHA-1 fingerprint (Debug keystore)..."
SHA1_DEBUG=$(keytool -list -v -keystore app/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep -E "SHA1:" | awk '{print $2}')

if [ -z "$SHA1_DEBUG" ]; then
    echo "⚠️  Could not find SHA-1 for debug keystore"
    echo "   Trying alternative method..."
    SHA1_DEBUG=$(keytool -list -v -keystore app/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep -A 1 "Certificate fingerprints" | grep SHA1 | awk '{print $3}')
fi

echo "SHA-1 (Debug): $SHA1_DEBUG"
echo ""

echo "Getting SHA-256 fingerprint (Debug keystore)..."
SHA256_DEBUG=$(keytool -list -v -keystore app/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep -E "SHA256:" | awk '{print $2}')

if [ -z "$SHA256_DEBUG" ]; then
    echo "⚠️  Could not find SHA-256 for debug keystore"
    echo "   Trying alternative method..."
    SHA256_DEBUG=$(keytool -list -v -keystore app/debug.keystore -alias androiddebugkey -storepass android -keypass android 2>/dev/null | grep -A 1 "Certificate fingerprints" | grep SHA256 | awk '{print $3}')
fi

echo "SHA-256 (Debug): $SHA256_DEBUG"
echo ""

echo "=========================================="
echo "Instructions:"
echo "=========================================="
echo "1. Go to Firebase Console: https://console.firebase.google.com/"
echo "2. Select your project: home-services-1ea69"
echo "3. Click on the gear icon ⚙️ next to 'Project Overview'"
echo "4. Select 'Project settings'"
echo "5. Scroll down to 'Your apps' section"
echo "6. Find your Android app (package: com.homeservices.customer)"
echo "7. Click 'Add fingerprint'"
echo "8. Add these fingerprints:"
echo ""
echo "   SHA-1:   $SHA1_DEBUG"
echo "   SHA-256: $SHA256_DEBUG"
echo ""
echo "9. Save and wait a few minutes for changes to propagate"
echo "10. Rebuild your app: npm run android"
echo ""
echo "=========================================="
echo "Note: For release builds, you'll need to"
echo "      add your release keystore fingerprints"
echo "      separately when you create a release build."
echo "=========================================="

