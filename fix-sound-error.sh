#!/bin/bash

# Fix react-native-sound linking error in HomeServices
# This script cleans caches and rebuilds the app

echo "🔧 Fixing react-native-sound error in HomeServices..."

cd "$(dirname "$0")"

# Kill Metro bundler if running
echo "📦 Stopping Metro bundler..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true

# Clear Metro bundler cache
echo "🧹 Clearing Metro bundler cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true
npx react-native start --reset-cache &
METRO_PID=$!
sleep 3
kill $METRO_PID 2>/dev/null || true

# Clear watchman cache
echo "🧹 Clearing Watchman cache..."
watchman watch-del-all 2>/dev/null || true

# Clean Android build
echo "🧹 Cleaning Android build..."
cd android
./gradlew clean
cd ..

# Remove node_modules and reinstall (optional - uncomment if needed)
# echo "📦 Reinstalling dependencies..."
# rm -rf node_modules
# npm install

# Clear React Native cache
echo "🧹 Clearing React Native cache..."
rm -rf android/app/build
rm -rf android/.gradle

# Remove stale bundle file that contains react-native-sound reference
echo "🗑️  Removing stale bundle file..."
rm -rf android/app/src/main/assets/index.android.bundle 2>/dev/null || true
rm -rf android/app/src/main/assets/index.android.bundle.meta 2>/dev/null || true

# Ensure assets directory exists
mkdir -p android/app/src/main/assets

echo "✅ Cleanup complete!"
echo ""
echo "📱 Next steps:"
echo "1. Run: cd /Users/sandeepgupta/Desktop/playStore/home-services/HomeServices"
echo "2. Start Metro: npm start -- --reset-cache"
echo "3. In another terminal, rebuild: npm run android"
echo ""
echo "This will regenerate the bundle without react-native-sound references."

