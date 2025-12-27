#!/bin/bash

# Script to get SHA-1 and SHA-256 fingerprints from release keystore
# This is needed to fix DEVELOPER_ERROR in Google Sign-In for release builds

echo "🔐 Getting SHA fingerprints from release keystore..."
echo "=================================================="
echo ""

KEYSTORE_PATH="android/app/homeservices-release-key.keystore"
KEY_ALIAS="homeservices-key-alias"

if [ ! -f "$KEYSTORE_PATH" ]; then
    echo "❌ Error: Release keystore not found at: $KEYSTORE_PATH"
    echo ""
    echo "Please make sure the keystore file exists."
    exit 1
fi

# Try to get password from gradle.properties
GRADLE_PROPERTIES="android/gradle.properties"
if [ -f "$GRADLE_PROPERTIES" ]; then
    STORE_PASSWORD=$(grep "MYAPP_RELEASE_STORE_PASSWORD" "$GRADLE_PROPERTIES" | cut -d'=' -f2 | tr -d ' ')
    if [ -n "$STORE_PASSWORD" ]; then
        KEYSTORE_PASSWORD="$STORE_PASSWORD"
        echo "✅ Found keystore password in gradle.properties"
    fi
fi

echo "📝 Keystore: $KEYSTORE_PATH"
echo "📝 Alias: $KEY_ALIAS"
echo ""

# Get SHA-1 and SHA-256 fingerprints
if [ -n "$KEYSTORE_PASSWORD" ]; then
    echo "Getting fingerprints..."
    echo ""
    OUTPUT=$(keytool -list -v -keystore "$KEYSTORE_PATH" -alias "$KEY_ALIAS" -storepass "$KEYSTORE_PASSWORD" 2>/dev/null)
    
    SHA1=$(echo "$OUTPUT" | grep "SHA1:" | awk -F': ' '{print $2}')
    SHA256=$(echo "$OUTPUT" | grep "SHA256:" | awk -F': ' '{print $2}' | head -1)
    
    if [ -n "$SHA1" ]; then
        echo "✅ SHA-1: $SHA1"
    fi
    if [ -n "$SHA256" ]; then
        echo "✅ SHA-256: $SHA256"
    fi
else
    echo "⚠️  Password not found in gradle.properties"
    echo "Please enter the keystore password when prompted:"
    echo ""
    OUTPUT=$(keytool -list -v -keystore "$KEYSTORE_PATH" -alias "$KEY_ALIAS" 2>/dev/null)
    
    SHA1=$(echo "$OUTPUT" | grep "SHA1:" | awk -F': ' '{print $2}')
    SHA256=$(echo "$OUTPUT" | grep "SHA256:" | awk -F': ' '{print $2}' | head -1)
    
    if [ -n "$SHA1" ]; then
        echo "✅ SHA-1: $SHA1"
    fi
    if [ -n "$SHA256" ]; then
        echo "✅ SHA-256: $SHA256"
    fi
fi

echo ""
echo "📋 Next Steps:"
echo "1. Copy the SHA-1 and SHA-256 fingerprints above"
echo "2. Go to Firebase Console: https://console.firebase.google.com/project/home-services-1ea69/settings/general"
echo "3. Scroll to 'Your apps' → Select your Android app"
echo "4. Click 'Add fingerprint' for both SHA-1 and SHA-256"
echo "5. Paste the fingerprints and save"
echo "6. Wait 5-10 minutes for changes to propagate"
echo "7. Rebuild and test your release APK"
echo ""
echo "📖 Full instructions: See RELEASE_GOOGLE_SIGNIN_FIX.md"
echo ""

