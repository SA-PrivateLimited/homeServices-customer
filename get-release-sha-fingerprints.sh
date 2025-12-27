#!/bin/bash

# Script to get SHA-1 and SHA-256 fingerprints for Release keystore
# This is required for Firebase Phone Authentication in release builds

echo "=========================================="
echo "Getting Release SHA Fingerprints"
echo "=========================================="
echo ""

# Navigate to android/app directory
cd "$(dirname "$0")/android/app"

# Release keystore details
KEYSTORE_FILE="medifind-release-key.keystore"
KEY_ALIAS="medifind-key-alias"
STORE_PASSWORD="medifind2024"
KEY_PASSWORD="medifind2024"

if [ ! -f "$KEYSTORE_FILE" ]; then
    echo "❌ Error: Release keystore not found at: $KEYSTORE_FILE"
    exit 1
fi

echo "Getting SHA-1 fingerprint (Release keystore)..."
SHA1_RELEASE=$(keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -storepass "$STORE_PASSWORD" -keypass "$KEY_PASSWORD" 2>/dev/null | grep -E "SHA1:" | awk '{print $2}')

if [ -z "$SHA1_RELEASE" ]; then
    echo "⚠️  Could not find SHA-1 for release keystore"
    echo "   Trying alternative method..."
    SHA1_RELEASE=$(keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -storepass "$STORE_PASSWORD" -keypass "$KEY_PASSWORD" 2>/dev/null | grep -A 1 "Certificate fingerprints" | grep SHA1 | awk '{print $3}')
fi

echo "SHA-1 (Release): $SHA1_RELEASE"
echo ""

echo "Getting SHA-256 fingerprint (Release keystore)..."
SHA256_RELEASE=$(keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -storepass "$STORE_PASSWORD" -keypass "$KEY_PASSWORD" 2>/dev/null | grep -E "SHA256:" | awk '{print $2}')

if [ -z "$SHA256_RELEASE" ]; then
    echo "⚠️  Could not find SHA-256 for release keystore"
    echo "   Trying alternative method..."
    SHA256_RELEASE=$(keytool -list -v -keystore "$KEYSTORE_FILE" -alias "$KEY_ALIAS" -storepass "$STORE_PASSWORD" -keypass "$KEY_PASSWORD" 2>/dev/null | grep -A 1 "Certificate fingerprints" | grep SHA256 | awk '{print $3}')
fi

echo "SHA-256 (Release): $SHA256_RELEASE"
echo ""

echo "=========================================="
echo "Release Keystore Fingerprints:"
echo "=========================================="
echo ""
echo "SHA-1:   $SHA1_RELEASE"
echo "SHA-256: $SHA256_RELEASE"
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
echo "8. Add these RELEASE fingerprints:"
echo ""
echo "   SHA-1:   $SHA1_RELEASE"
echo "   SHA-256: $SHA256_RELEASE"
echo ""
echo "9. Save and wait a few minutes for changes to propagate"
echo ""
echo "=========================================="
echo "Note: These are for RELEASE builds."
echo "      Debug fingerprints are different."
echo "=========================================="

