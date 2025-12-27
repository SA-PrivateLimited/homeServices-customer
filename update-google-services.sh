#!/bin/bash

# Script to clean and rebuild after updating google-services.json

echo "=========================================="
echo "Updating google-services.json"
echo "=========================================="
echo ""
echo "IMPORTANT: First download the new google-services.json from Firebase Console"
echo "and replace HomeServices/android/app/google-services.json"
echo ""
read -p "Have you replaced google-services.json? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please download google-services.json from Firebase Console first!"
    echo "1. Go to Firebase Console → Project Settings"
    echo "2. Find homeServiceCustomer app"
    echo "3. Click 'Download google-services.json'"
    echo "4. Replace HomeServices/android/app/google-services.json"
    exit 1
fi

cd "$(dirname "$0")"

echo "Cleaning Android build..."
cd android
./gradlew clean
cd ..

echo ""
echo "Rebuilding app..."
npm run android

echo ""
echo "=========================================="
echo "Done! Test phone authentication now."
echo "=========================================="

