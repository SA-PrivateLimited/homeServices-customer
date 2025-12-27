#!/bin/bash

# HomeServices - Play Store Release Build Script
# This script builds a signed AAB file for Google Play Store

set -e  # Exit on error

echo "🚀 HomeServices - Building Release AAB for Play Store"
echo "=================================================="

# Set up environment
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin

# Navigate to project root
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

echo ""
echo "📋 Pre-build Checklist:"
echo "----------------------"

# Check if keystore exists
KEYSTORE_PATH="$PROJECT_ROOT/android/app/homeservices-release-key.keystore"
if [ ! -f "$KEYSTORE_PATH" ]; then
    echo "⚠️  Release keystore not found!"
    echo ""
    echo "Generating release signing key..."
    echo "You will be prompted for:"
    echo "  - Keystore password (save this!)"
    echo "  - Key password (save this!)"
    echo "  - Your name, organization, etc."
    echo ""
    read -p "Press Enter to continue..."
    
    cd "$PROJECT_ROOT/android/app"
    keytool -genkeypair -v -storetype PKCS12 \
        -keystore homeservices-release-key.keystore \
        -alias homeservices-key-alias \
        -keyalg RSA \
        -keysize 2048 \
        -validity 10000
    
    echo ""
    echo "✅ Keystore created!"
    echo "⚠️  IMPORTANT: Save the keystore file and passwords securely!"
    echo "   Location: $KEYSTORE_PATH"
else
    echo "✅ Release keystore found"
fi

# Check gradle.properties
GRADLE_PROPERTIES="$PROJECT_ROOT/android/gradle.properties"
if ! grep -q "MYAPP_RELEASE_STORE_FILE" "$GRADLE_PROPERTIES" 2>/dev/null; then
    echo "⚠️  gradle.properties not configured for release signing!"
    echo ""
    echo "Please add these lines to android/gradle.properties:"
    echo ""
    echo "MYAPP_RELEASE_STORE_FILE=homeservices-release-key.keystore"
    echo "MYAPP_RELEASE_KEY_ALIAS=homeservices-key-alias"
    echo "MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password"
    echo "MYAPP_RELEASE_KEY_PASSWORD=your_key_password"
    echo ""
    read -p "Press Enter after configuring gradle.properties..."
else
    echo "✅ gradle.properties configured"
fi

# Check version
echo ""
echo "📱 Current App Version:"
VERSION_CODE=$(grep "versionCode" "$PROJECT_ROOT/android/app/build.gradle" | sed 's/.*versionCode //' | sed 's/ //')
VERSION_NAME=$(grep "versionName" "$PROJECT_ROOT/android/app/build.gradle" | sed 's/.*versionName "//' | sed 's/"//')
echo "   Version Code: $VERSION_CODE"
echo "   Version Name: $VERSION_NAME"

echo ""
echo "🔨 Building Release AAB..."
echo "----------------------"

# Clean previous builds
cd "$PROJECT_ROOT/android"
./gradlew clean

# Build release AAB
./gradlew bundleRelease

# Check if AAB was created
AAB_PATH="$PROJECT_ROOT/android/app/build/outputs/bundle/release/app-release.aab"
if [ -f "$AAB_PATH" ]; then
    AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
    echo ""
    echo "✅ Build Successful!"
    echo "==================="
    echo "📦 AAB Location: $AAB_PATH"
    echo "📊 File Size: $AAB_SIZE"
    echo ""
    echo "📤 Next Steps:"
    echo "1. Upload this AAB to Google Play Console"
    echo "2. Go to: Release > Production > Create new release"
    echo "3. Upload: $AAB_PATH"
    echo "4. Add release notes"
    echo "5. Submit for review"
    echo ""
    echo "📚 See DEPLOYMENT_GUIDE.md for complete instructions"
else
    echo "❌ Build failed! AAB file not found."
    exit 1
fi

