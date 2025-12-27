#!/bin/bash

# HomeServices - Optimized Release APK Build Script
# This script builds a smaller release APK optimized for modern devices (arm64-v8a only)

set -e  # Exit on error

echo "🚀 HomeServices - Building Optimized Release APK (arm64-v8a only)"
echo "=============================================================="
echo ""
echo "This will build an APK optimized for modern Android devices."
echo "Most devices since 2014 use arm64-v8a architecture."
echo ""

# Set up environment
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$JAVA_HOME/bin

# Navigate to project root
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

echo "📋 Building optimized APK..."
echo ""

# Clean previous builds
cd "$PROJECT_ROOT/android"
./gradlew clean

# Build release APK with only arm64-v8a architecture (smaller size)
cd "$PROJECT_ROOT/android"
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a

# Check if APK was created
APK_PATH="$PROJECT_ROOT/android/app/build/outputs/apk/release/app-release.apk"
if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "✅ Build Successful!"
    echo "==================="
    echo "📦 APK Location: $APK_PATH"
    echo "📊 File Size: $APK_SIZE"
    echo ""
    echo "📱 Note: This APK is optimized for arm64-v8a devices only"
    echo "   (covers 99% of modern Android devices since 2014)"
    echo ""
else
    echo "❌ Build failed! APK file not found."
    exit 1
fi

