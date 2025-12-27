# Fix react-native-sound Error

## Problem
The app shows an error: `"The package 'react-native-sound' doesn't seem to be linked"`

This error occurs because:
- A stale `index.android.bundle` file contains references to `react-native-sound`
- `react-native-sound` is not installed in `package.json` (and is not needed)
- The app uses `react-native-push-notification` for sound notifications instead

## Solution

### Quick Fix (Automated)
Run the cleanup script:
```bash
cd HomeServices
./fix-sound-error.sh
```

Then rebuild:
```bash
npm start -- --reset-cache
# In another terminal:
npm run android
```

### Manual Fix
1. **Stop Metro bundler**:
   ```bash
   lsof -ti:8081 | xargs kill -9
   lsof -ti:8083 | xargs kill -9
   ```

2. **Remove stale bundle**:
   ```bash
   rm -rf android/app/src/main/assets/index.android.bundle
   rm -rf android/app/src/main/assets/index.android.bundle.meta
   ```

3. **Clean Android build**:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   ```

4. **Clear Metro cache and rebuild**:
   ```bash
   npm start -- --reset-cache
   # In another terminal:
   npm run android
   ```

## Why This Works
- Removing the stale bundle forces Metro to regenerate it without `react-native-sound` references
- The app doesn't need `react-native-sound` - it uses `react-native-push-notification` for sounds
- A fresh bundle will only include the packages actually installed in `package.json`

## Prevention
- Don't manually copy `index.android.bundle` files
- Always let Metro generate bundles automatically
- If you see this error again, just delete the bundle and rebuild

