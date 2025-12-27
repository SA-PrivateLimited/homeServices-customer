# Fix "HomeServices has not been registered" Error

## Problem
The app shows an error: `"HomeServices" has not been registered`

This error occurs when:
- Metro bundler is running from the wrong directory
- Metro cache is stale or corrupted
- The app component failed to load before registration

## Solution

### Quick Fix (Automated)
Run the cleanup script:
```bash
cd HomeServices
./fix-app-registration.sh
```

Then start Metro from the **HomeServices directory**:
```bash
npm start -- --reset-cache
```

In another terminal, rebuild:
```bash
npm run android
```

### Manual Fix

1. **Stop all Metro instances**:
   ```bash
   lsof -ti:8081 | xargs kill -9
   lsof -ti:8082 | xargs kill -9
   lsof -ti:8083 | xargs kill -9
   ```

2. **Navigate to HomeServices directory** (IMPORTANT!):
   ```bash
   cd /Users/sandeepgupta/Desktop/playStore/home-services/HomeServices
   ```

3. **Clear Metro cache**:
   ```bash
   rm -rf $TMPDIR/metro-*
   rm -rf $TMPDIR/haste-*
   rm -rf node_modules/.cache
   ```

4. **Start Metro from HomeServices directory**:
   ```bash
   npm start -- --reset-cache
   ```

5. **In another terminal, rebuild**:
   ```bash
   cd /Users/sandeepgupta/Desktop/playStore/home-services/HomeServices
   npm run android
   ```

## Why This Works
- Metro must be started from the directory containing `package.json` and `app.json`
- Clearing cache ensures a fresh bundle is generated
- The app name "HomeServices" is correctly defined in `app.json` and registered in `index.js`

## Verification
Check that these files exist and are correct:
- ✅ `app.json` contains `"name": "HomeServices"`
- ✅ `index.js` imports and registers the app correctly
- ✅ `App.tsx` exports the App component as default

## Common Causes
1. **Metro running from wrong directory** - Most common cause
2. **Stale cache** - Metro cache contains old bundle
3. **Module loading error** - Check console for import errors before registration

