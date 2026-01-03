# Free Push Notification Server

This is a simple Express.js server that sends push notifications using Firebase Admin SDK. It can be hosted for **FREE** on various platforms, avoiding the need for Firebase Blaze plan.

## Free Hosting Options

### 1. Railway.app (Recommended)
- **Free Tier:** $5 credit/month (enough for this server)
- **Setup:** Connect GitHub repo, auto-deploys
- **URL:** https://railway.app

### 2. Render.com
- **Free Tier:** 750 hours/month
- **Setup:** Connect GitHub, auto-deploys
- **URL:** https://render.com

### 3. Fly.io
- **Free Tier:** 3 shared VMs
- **Setup:** Use fly CLI
- **URL:** https://fly.io

## Setup Instructions

### Step 1: Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** > **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file
6. Rename it to `serviceAccountKey.json`
7. Place it in the `server/` directory

**⚠️ IMPORTANT:** Add `serviceAccountKey.json` to `.gitignore` - never commit it!

### Step 2: Install Dependencies

```bash
cd server
npm install
```

### Step 3: Test Locally

```bash
npm start
```

Server will run on `http://localhost:3000`

### Step 4: Deploy to Railway (Free)

1. Sign up at https://railway.app
2. Click "New Project"
3. Select "Deploy from GitHub repo"
4. Select your HomeServices repository
5. Set root directory to `server`
6. Add environment variable: `PORT=3000`
7. Upload `serviceAccountKey.json` as a secret file
8. Deploy!

### Step 5: Update App Code

Update `pushNotificationService.ts` to call your server instead of Cloud Functions:

```typescript
// Replace Cloud Function call with:
const SERVER_URL = 'https://your-server.railway.app'; // Your deployed URL

const response = await fetch(`${SERVER_URL}/send-notification`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    token: fcmToken,
    notification: {
      title: notification.title,
      body: notification.body,
    },
    data: notification,
  }),
});

const result = await response.json();
```

## Environment Variables

- `PORT`: Server port (default: 3000)
- Railway/Render will set this automatically

## Security Notes

1. **Never commit `serviceAccountKey.json`** to Git
2. Add it to `.gitignore`
3. Upload it as a secret/environment file in your hosting platform
4. Consider adding API key authentication to your endpoints

## Cost Comparison

| Solution | Cost |
|----------|------|
| Firebase Cloud Functions (Blaze) | Pay per invocation |
| Railway.app | $5 credit/month (free tier) |
| Render.com | Free (750 hours/month) |
| Fly.io | Free (3 VMs) |

## Benefits

✅ **Free hosting** (within limits)  
✅ **No Firebase Blaze plan needed**  
✅ **Full control** over your server  
✅ **Easy to scale** if needed  
✅ **Can add more features** (analytics, logging, etc.)

## Alternative: Firebase Cloud Functions

For production use, consider Firebase Cloud Functions with FCM:
- Free tier: 10,000 subscribers
- No server needed
- Easy React Native integration
- See `PUSH_NOTIFICATION_ALTERNATIVES.md` for details


