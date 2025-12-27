#!/bin/bash

# Script to resize logo for Android app icons using macOS built-in sips tool

echo "🎨 HomeServices Logo Resizer (macOS)"
echo "===================================="
echo ""

# Check if logo.png exists
if [ ! -f "logo.png" ]; then
    echo "❌ logo.png not found in the current directory."
    echo "   Please place your logo image as 'logo.png' in the project root."
    exit 1
fi

echo "✅ Found logo.png"
echo ""

# Create directories if they don't exist
echo "📁 Creating directories..."
mkdir -p android/app/src/main/res/mipmap-mdpi
mkdir -p android/app/src/main/res/mipmap-hdpi
mkdir -p android/app/src/main/res/mipmap-xhdpi
mkdir -p android/app/src/main/res/mipmap-xxhdpi
mkdir -p android/app/src/main/res/mipmap-xxxhdpi

# Resize and create icons using sips (macOS built-in)
echo "🔄 Resizing logo for different densities..."
echo ""

# mdpi: 48x48
sips -z 48 48 logo.png --out android/app/src/main/res/mipmap-mdpi/ic_launcher.png
sips -z 48 48 logo.png --out android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
echo "✅ Created mdpi icons (48x48)"

# hdpi: 72x72
sips -z 72 72 logo.png --out android/app/src/main/res/mipmap-hdpi/ic_launcher.png
sips -z 72 72 logo.png --out android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
echo "✅ Created hdpi icons (72x72)"

# xhdpi: 96x96
sips -z 96 96 logo.png --out android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
sips -z 96 96 logo.png --out android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
echo "✅ Created xhdpi icons (96x96)"

# xxhdpi: 144x144
sips -z 144 144 logo.png --out android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
sips -z 144 144 logo.png --out android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
echo "✅ Created xxhdpi icons (144x144)"

# xxxhdpi: 192x192
sips -z 192 192 logo.png --out android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
sips -z 192 192 logo.png --out android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
echo "✅ Created xxxhdpi icons (192x192)"

echo ""
echo "✨ Done! All app icons have been created."
echo ""
echo "📋 Next steps:"
echo "1. Review the generated icons"
echo "2. Rebuild the app: cd android && ./gradlew clean && ./gradlew assembleDebug"
echo "3. Test on device/emulator"
echo ""

