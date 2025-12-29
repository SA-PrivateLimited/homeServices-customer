# 🚀 Quick Deploy - Automated Script

## One-Command Deployment

Simply run:

```bash
cd HomeServices/server
./deploy.sh
```

The script will:
1. ✅ Check if gcloud CLI is installed
2. ✅ Authenticate you with GCP (if needed)
3. ✅ Set your GCP project (if needed)
4. ✅ Check for service account key (guide you if missing)
5. ✅ Enable required APIs
6. ✅ Build Docker image
7. ✅ Deploy to Cloud Run (Free Tier)

## Prerequisites

Before running, make sure you have:

1. **gcloud CLI installed**
   ```bash
   # macOS
   brew install --cask google-cloud-sdk
   
   # Or download from:
   # https://cloud.google.com/sdk/docs/install
   ```

2. **GCP Account** (FREE)
   - Sign up at https://cloud.google.com
   - Create a project

3. **Service Account Key**
   - Go to Firebase Console > Project Settings > Service Accounts
   - Click "Generate New Private Key"
   - Save as `serviceAccountKey.json` in `HomeServices/server/`

## Manual Steps (if script doesn't work)

If you prefer manual deployment, see `DEPLOY.md` for detailed instructions.

## After Deployment

The script will output your server URL. Update your app:

**Edit:** `HomeServicesProvider/src/services/websocketService.ts`

```typescript
const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:3001' // Local development
  : 'https://websocket-server-xxxxx-uc.a.run.app'; // Your Cloud Run URL
```

## Troubleshooting

### "gcloud: command not found"
Install gcloud CLI (see Prerequisites above)

### "Permission denied"
Make script executable:
```bash
chmod +x deploy.sh
```

### "serviceAccountKey.json not found"
Follow the instructions in Prerequisites to generate the key file.

