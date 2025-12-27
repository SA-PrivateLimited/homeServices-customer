#!/bin/bash

# Fix "HomeServices has not been registered" error
# This script ensures Metro is running from the correct directory and clears caches

echo "🔧 Fixing app registration error..."

cd "$(dirname "$0")"

# Verify we're in the correct directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    echo "❌ Error: Must run from HomeServices directory"
    exit 1
fi

# Verify app.json exists and has correct name
APP_NAME=$(node -e "const app = require('./app.json'); console.log(app.name);")
echo "📱 App name from app.json: $APP_NAME"

if [ "$APP_NAME" != "HomeServices" ]; then
    echo "❌ Error: app.json name mismatch. Expected 'HomeServices', got '$APP_NAME'"
    exit 1
fi

# Kill all Metro bundler instances
echo "🛑 Stopping all Metro bundler instances..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
lsof -ti:8082 | xargs kill -9 2>/dev/null || true
lsof -ti:8083 | xargs kill -9 2>/dev/null || true
sleep 2

# Clear Metro bundler cache
echo "🧹 Clearing Metro bundler cache..."
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-* 2>/dev/null || true
rm -rf $TMPDIR/react-* 2>/dev/null || true

# Clear watchman cache
echo "🧹 Clearing Watchman cache..."
watchman watch-del-all 2>/dev/null || true

# Clear React Native cache
echo "🧹 Clearing React Native cache..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .metro 2>/dev/null || true

# Verify index.js exists and is correct
if [ ! -f "index.js" ]; then
    echo "❌ Error: index.js not found"
    exit 1
fi

echo "✅ Cache cleared!"
echo ""
echo "📱 Next steps:"
echo "1. Make sure you're in the HomeServices directory"
echo "2. Start Metro: npm start -- --reset-cache"
echo "3. In another terminal, rebuild: npm run android"
echo ""
echo "⚠️  Important: Metro MUST be started from the HomeServices directory!"

