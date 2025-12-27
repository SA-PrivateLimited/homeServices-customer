# HomeServices - Pharmacy Information App

<div align="center">
  <h3>Professional Medicine Information App for Android</h3>
  <p>Search medicines, get detailed information, and manage your medication schedule</p>
</div>

---

## Features

- **Medicine Search**: Search for medicines using FDA API and web scraping
- **AI Assistant**: Get detailed information using OpenAI integration
- **Search History**: Keep track of your searched medicines
- **Favorites**: Save medicines for offline viewing
- **Medication Reminders**: Set up dosage reminders with notifications
- **Share**: Share medicine information with others
- **Dark Mode**: Professional light and dark themes
- **Offline Support**: Access saved favorites without internet

## Tech Stack

- **Framework**: React Native 0.73
- **Language**: TypeScript
- **State Management**: Zustand
- **Navigation**: React Navigation
- **Storage**: AsyncStorage
- **APIs**: FDA Drug API, RxNav API, OpenAI API
- **Notifications**: React Native Push Notification
- **UI**: Custom components with professional design

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18 or higher
- **npm** or **yarn**: Package manager
- **Java Development Kit (JDK)**: Version 11 or higher
- **Android Studio**: Latest version with Android SDK
- **Android SDK**: API Level 34 (Android 14)
- **Watchman**: (macOS only) `brew install watchman`

## Installation

### 1. Clone or Navigate to Project

```bash
cd "/Users/sandeepgupta/Desktop/Play Store/pharmacy_app/HomeServices"
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment Variables

#### Option 1: Local Development (using .env file)

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` and add your OpenAI API key:

```
OPENAI_API_KEY=your_openai_api_key_here
APP_NAME=HomeServices
COPYRIGHT_OWNER=SA-PrivateLimited
```

#### Option 2: GitHub Environments (for CI/CD)

Environment variables are configured in GitHub Environments:
- **Secret**: `OPENAI_API_KEY` - Your OpenAI API key
- **Variables**: 
  - `APP_NAME=HomeServices`
  - `COPYRIGHT_OWNER=SA-PrivateLimited`

These are accessible via GitHub Actions workflows in the `production` environment.

### 4. Install iOS Dependencies (macOS only)

```bash
cd ios && pod install && cd ..
```

## Running the App

### Development Mode

#### Android
```bash
npm run android
# or
yarn android
```

#### iOS (macOS only)
```bash
npm run ios
# or
yarn ios
```

### Start Metro Bundler Separately

```bash
npm start
# or
yarn start
```

## Building for Production

### Android APK/AAB for Play Store

#### Step 1: Generate Signing Key

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore homeservices-release-key.keystore -alias homeservices-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Important**: Save the passwords you create! You'll need them.

#### Step 2: Configure Gradle Variables

Create `android/gradle.properties` or edit the existing one and add:

```properties
MYAPP_RELEASE_STORE_FILE=homeservices-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=homeservices-key-alias
MYAPP_RELEASE_STORE_PASSWORD=your_keystore_password
MYAPP_RELEASE_KEY_PASSWORD=your_key_password
```

**Security Note**: Never commit this file to version control!

#### Step 3: Build Release APK

```bash
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

#### Step 4: Build Release AAB (for Play Store)

```bash
cd android
./gradlew bundleRelease
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

## Play Store Deployment Guide

### 1. Prepare App Assets

You'll need:
- **App Icon**: 512x512 PNG
- **Feature Graphic**: 1024x500 PNG
- **Screenshots**: At least 2 screenshots (phone and tablet)
- **Privacy Policy URL**: Required for Play Store

### 2. Create Play Console Account

1. Go to [Google Play Console](https://play.google.com/console)
2. Pay one-time $25 registration fee
3. Complete account setup

### 3. Create New App

1. Click "Create app"
2. Fill in app details:
   - **App name**: HomeServices
   - **Default language**: English
   - **App or game**: App
   - **Free or paid**: Free

### 4. Complete Store Listing

#### Main Store Listing
- **App name**: HomeServices
- **Short description**: Medicine information and medication management app
- **Full description**:
```
HomeServices is your comprehensive medicine information companion. Search for any medicine and get detailed information including ingredients, uses, side effects, and dosage recommendations.

Features:
✓ Medicine Search - Find detailed information about any medicine
✓ AI Assistant - Get answers to your medicine-related questions
✓ Search History - Keep track of searched medicines
✓ Favorites - Save medicines for quick access
✓ Medication Reminders - Never miss a dose
✓ Dark Mode - Easy on the eyes
✓ Share - Share information with family and friends

Note: This app is for educational purposes only. Always consult healthcare professionals for medical advice.
```

- **App icon**: Upload your 512x512 icon
- **Feature graphic**: Upload 1024x500 graphic
- **Screenshots**: Upload at least 2 screenshots

#### Content Rating
1. Fill out the questionnaire
2. Get your content rating

#### Target Audience
- Select appropriate age groups
- Complete the questionnaire

#### Privacy Policy
- Required for apps that access internet
- Host your privacy policy and provide URL

### 5. Upload Release

1. Go to "Production" → "Create new release"
2. Upload `app-release.aab`
3. Add release notes
4. Review and rollout

### 6. Version Updates

To release updates:

1. Update version in `android/app/build.gradle`:
```gradle
versionCode 2  // Increment by 1
versionName "1.0.1"  // Update version string
```

2. Build new AAB
3. Upload to Play Console
4. Submit for review

## App Icon Guidelines

Create app icons for different densities:

- **mdpi**: 48x48 px
- **hdpi**: 72x72 px
- **xhdpi**: 96x96 px
- **xxhdpi**: 144x144 px
- **xxxhdpi**: 192x192 px

Place icons in:
- `android/app/src/main/res/mipmap-{density}/ic_launcher.png`
- `android/app/src/main/res/mipmap-{density}/ic_launcher_round.png`

## Testing

### Testing Checklist Before Release

- [ ] Test medicine search functionality
- [ ] Test OpenAI integration
- [ ] Test search history
- [ ] Test favorites (add/remove)
- [ ] Test medication reminders
- [ ] Test notifications
- [ ] Test share functionality
- [ ] Test dark mode toggle
- [ ] Test on different Android versions
- [ ] Test on different screen sizes
- [ ] Test offline functionality
- [ ] Verify all permissions work
- [ ] Check app performance
- [ ] Verify no crashes

### Common Issues

**Issue**: App crashes on start
- **Solution**: Check if all dependencies are installed correctly

**Issue**: OpenAI not working
- **Solution**: Verify API key in `.env` file

**Issue**: Notifications not working
- **Solution**: Check notification permissions in device settings

**Issue**: Build fails
- **Solution**: Clean gradle cache: `cd android && ./gradlew clean`

## Project Structure

```
HomeServices/
├── android/              # Android native code
├── ios/                  # iOS native code
├── src/
│   ├── components/       # Reusable components
│   ├── navigation/       # Navigation configuration
│   ├── screens/          # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── DetailsScreen.tsx
│   │   ├── AIAssistantScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   ├── FavoritesScreen.tsx
│   │   ├── RemindersScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/         # API services
│   │   ├── medicineService.ts
│   │   └── notificationService.ts
│   ├── store/            # State management
│   ├── utils/            # Utilities
│   └── types/            # TypeScript types
├── App.tsx               # Root component
├── index.js              # Entry point
└── package.json          # Dependencies
```

## Important Files

- **`.env`**: Environment variables (API keys)
- **`package.json`**: Dependencies and scripts
- **`android/app/build.gradle`**: Android build configuration
- **`android/gradle.properties`**: Gradle properties (signing config)

## Security Notes

### Never Commit These Files:
- `.env` - Contains API keys
- `android/gradle.properties` - Contains signing passwords
- `*.keystore` - Signing keys
- `node_modules/` - Dependencies

### Keep Secure:
- OpenAI API key
- Keystore file and passwords
- Play Store credentials

## License & Copyright

© 2025 SA-PrivateLimited. All rights reserved.

This application is proprietary software. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

## Support & Contact

For issues or questions:
- Create an issue in the project repository
- Contact: SA-PrivateLimited

## Disclaimer

This app is for educational purposes only. The information provided should not be used as a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.

---

**Built with ❤️ using React Native**
# homeServices-customer
