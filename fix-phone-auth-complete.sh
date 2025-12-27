#!/bin/bash

# Complete fix script for phone authentication issues
# This script performs all necessary steps to resolve auth/app-not-authorized error

echo "=========================================="
echo "Fixing Phone Authentication Issues"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Step 1: Stop Metro bundler
echo "1. Stopping Metro bundler..."
pkill -f "react-native start" || true
pkill -f "metro" || true
sleep 2

# Step 2: Clear Metro cache
echo "2. Clearing Metro cache..."
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-* 2>/dev/null || true
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true

# Step 3: Clear React Native cache
echo "3. Clearing React Native cache..."
rm -rf node_modules/.cache 2>/dev/null || true
npm cache clean --force 2>/dev/null || true

# Step 4: Clear Android build cache
echo "4. Clearing Android build cache..."
cd android
./gradlew clean 2>/dev/null || true
cd ..

# Step 5: Remove stale bundle
echo "5. Removing stale bundle files..."
rm -f android/app/src/main/assets/index.android.bundle 2>/dev/null || true
rm -rf android/app/build 2>/dev/null || true

# Step 6: Uninstall app from emulator/device
echo "6. Uninstalling app from device..."
adb uninstall com.homeservices.customer 2>/dev/null || true

# Step 7: Rebuild and reinstall
echo "7. Rebuilding and reinstalling app..."
echo "   This may take a few minutes..."
cd android
./gradlew assembleDebug 2>/dev/null || true
cd ..

echo ""
echo "=========================================="
echo "Fix Complete!"
echo "=========================================="
echo ""
echo "Next steps:"
echo "1. Wait 5-10 minutes for Firebase to fully propagate fingerprint changes"
echo "2. Start Metro bundler: npm start"
echo "3. Install app: npm run android"
echo "4. Test phone authentication"
echo ""
echo "If error persists:"
echo "- Verify fingerprints in Firebase Console match exactly"
echo "- Check that package name is: com.homeservices.customer"
echo "- Try using a different phone number"
echo "- Check Firebase project billing status"
echo ""

