# Deploy WebSocket Server to GCP Cloud Run (FREE TIER)

This guide will help you deploy the WebSocket server to Google Cloud Platform (GCP) Cloud Run using the **FREE TIER** so it's always available for your app at no cost.

## 🆓 Free Tier Benefits

- **2 million requests/month** FREE
- **360,000 GB-seconds** FREE
- **180,000 vCPU-seconds** FREE
- **No credit card required** for free tier
- **Always-on option** with `min-instances: 0` (cold starts may occur)

## Prerequisites

1. **GCP Account**: Sign up at https://cloud.google.com (FREE)
2. **GCP Project**: Create a project in GCP Console
3. **gcloud CLI**: Install from https://cloud.google.com/sdk/docs/install
4. **Docker**: Install Docker Desktop (for local testing)

## Step 1: Authenticate with GCP

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

## Step 2: Enable Required APIs

```bash
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

## Step 3: Prepare Service Account Key

1. Go to Firebase Console > Project Settings > Service Accounts
2. Click "Generate New Private Key"
3. Save the file as `serviceAccountKey.json` in the `server/` directory
4. **IMPORTANT**: Add `serviceAccountKey.json` to `.gitignore` (never commit this file!)

## Step 4: Build and Deploy (Free Tier Optimized)

### Option A: Using Cloud Build (Recommended)

```bash
cd HomeServices/server
gcloud builds submit --config cloudbuild.yaml
```

### Option B: Manual Deployment (Free Tier Settings)

```bash
cd HomeServices/server

# Build the Docker image
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/websocket-server

# Deploy to Cloud Run with FREE TIER settings
gcloud run deploy websocket-server \
  --image gcr.io/YOUR_PROJECT_ID/websocket-server \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 256Mi \
  --cpu 1 \
  --min-instances 0 \
  --max-instances 10 \
  --timeout 300 \
  --cpu-throttling \
  --no-cpu-boost
```

**Free Tier Settings Explained:**
- `--memory 256Mi`: Minimum memory (reduces costs)
- `--min-instances 0`: No always-on instances (FREE, but may have cold starts)
- `--cpu-throttling`: Reduces CPU usage when idle (saves free tier quota)
- `--no-cpu-boost`: Disables CPU boost (keeps costs low)

## Step 5: Get the Server URL

After deployment, Cloud Run will provide a URL like:
```
https://websocket-server-xxxxx-uc.a.run.app
```

**Important**: Cloud Run uses HTTPS, but WebSocket connections need to use `wss://` (secure WebSocket).

## Step 6: Update Your App Configuration

Update the WebSocket URL in your app:

### For HomeServicesProvider:
Edit `src/services/websocketService.ts`:

```typescript
const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:3001' // Local development
  : 'https://websocket-server-xxxxx-uc.a.run.app'; // Your Cloud Run URL
```

**Note**: Cloud Run WebSocket connections use `wss://` protocol. Socket.io will handle this automatically if you use `https://` URL.

## Step 7: Test the Deployment

```bash
# Health check
curl https://websocket-server-xxxxx-uc.a.run.app/

# Should return: {"status":"ok","message":"Push Notification Server is running"}
```

## 💰 Cost Estimation (FREE TIER)

**With `min-instances: 0` (Recommended for Free Tier):**
- ✅ **$0/month** - Stays within free tier limits for most apps
- ✅ **2 million requests/month** FREE
- ✅ **360,000 GB-seconds** FREE (enough for ~100 hours of runtime)
- ✅ **180,000 vCPU-seconds** FREE

**Example Usage:**
- 1,000 requests/day = 30,000/month = **FREE** ✅
- 10,000 requests/day = 300,000/month = **FREE** ✅
- 50,000 requests/day = 1.5M/month = **FREE** ✅

**Cold Starts:**
- With `min-instances: 0`, the first request after idle time may take 2-5 seconds
- Subsequent requests are instant
- For always-on (no cold starts), set `--min-instances 1` (~$5-10/month)

**If you exceed free tier:**
- Requests: $0.40 per million
- Memory: $0.0000025 per GB-second
- CPU: $0.0000100 per vCPU-second

## Troubleshooting

### WebSocket Connection Issues

1. **Check Cloud Run logs**:
   ```bash
   gcloud run services logs read websocket-server --region us-central1
   ```

2. **Verify CORS settings**: The server already allows all origins (`origin: '*'`)

3. **Check firewall rules**: Cloud Run doesn't require firewall configuration

### Service Account Key Issues

If you get Firebase Admin errors:
1. Ensure `serviceAccountKey.json` is in the `server/` directory
2. Verify the service account has proper permissions
3. Check that the file is included in the Docker image

### Update Deployment

To update the server:

```bash
cd HomeServices/server
# Make your changes to push-notification-server.js
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/websocket-server
gcloud run deploy websocket-server \
  --image gcr.io/YOUR_PROJECT_ID/websocket-server \
  --region us-central1 \
  --memory 256Mi \
  --min-instances 0 \
  --cpu-throttling \
  --no-cpu-boost
```

## Security Notes

1. **Never commit `serviceAccountKey.json`** to Git
2. Use Cloud Run's built-in authentication if needed
3. Consider using Secret Manager for sensitive credentials
4. Enable Cloud Run's IAM authentication for production

## Next Steps

After deployment:
1. Update your app's WebSocket URL
2. Test booking notifications
3. Monitor Cloud Run logs for any issues
4. Set up alerts for errors

