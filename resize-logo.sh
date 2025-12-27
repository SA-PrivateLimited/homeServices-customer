#!/bin/bash

# Script to resize logo for Android app icons
# Requires ImageMagick (install with: brew install imagemagick on macOS)

echo "🎨 HomeServices Logo Resizer"
echo "============================"
echo ""

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo "❌ ImageMagick is not installed."
    echo "   Install it with: brew install imagemagick (macOS)"
    echo "   or: sudo apt-get install imagemagick (Linux)"
    exit 1
fi

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

# Resize and create icons
echo "🔄 Resizing logo for different densities..."
echo ""

# mdpi: 48x48
convert logo.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher.png
convert logo.png -resize 48x48 android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png
echo "✅ Created mdpi icons (48x48)"

# hdpi: 72x72
convert logo.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher.png
convert logo.png -resize 72x72 android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png
echo "✅ Created hdpi icons (72x72)"

# xhdpi: 96x96
convert logo.png -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher.png
convert logo.png -resize 96x96 android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png
echo "✅ Created xhdpi icons (96x96)"

# xxhdpi: 144x144
convert logo.png -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png
convert logo.png -resize 144x144 android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png
echo "✅ Created xxhdpi icons (144x144)"

# xxxhdpi: 192x192
convert logo.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png
convert logo.png -resize 192x192 android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png
echo "✅ Created xxxhdpi icons (192x192)"

echo ""
echo "✨ Done! All app icons have been created."
echo ""
echo "📋 Next steps:"
echo "1. Review the generated icons"
echo "2. Rebuild the app: cd android && ./gradlew clean && ./gradlew assembleDebug"
echo "3. Test on device/emulator"
echo ""

