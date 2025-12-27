#!/bin/bash

# Start Metro bundler from the correct directory
# This ensures the app is registered correctly

cd "$(dirname "$0")"

# Verify we're in the correct directory
if [ ! -f "package.json" ] || [ ! -f "app.json" ]; then
    echo "❌ Error: Must run from HomeServices directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Verify app.json
APP_NAME=$(node -e "const app = require('./app.json'); console.log(app.name);" 2>/dev/null)
if [ "$APP_NAME" != "HomeServices" ]; then
    echo "❌ Error: app.json name mismatch"
    exit 1
fi

echo "✅ Starting Metro bundler from: $(pwd)"
echo "📱 App name: $APP_NAME"
echo ""

# Kill any existing Metro instances on port 8081
lsof -ti:8081 | xargs kill -9 2>/dev/null || true

# Start Metro with cache reset
exec npx react-native start --reset-cache

