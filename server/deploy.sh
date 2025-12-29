#!/bin/bash

# Automated Deployment Script for WebSocket Server to GCP Cloud Run (Free Tier)
# This script will check prerequisites and deploy automatically

set -e  # Exit on error

echo "🚀 Starting automated deployment to GCP Cloud Run..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Add gcloud to PATH if installed but not in PATH
if [ -d "$HOME/google-cloud-sdk/bin" ]; then
    export PATH="$HOME/google-cloud-sdk/bin:$PATH"
fi

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI is not installed${NC}"
    echo ""
    echo "Please install gcloud CLI:"
    echo "  macOS: brew install --cask google-cloud-sdk"
    echo "  Or visit: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo -e "${GREEN}✅ gcloud CLI found${NC}"

# Check if authenticated
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo -e "${YELLOW}⚠️  Not authenticated with GCP${NC}"
    echo "Logging in..."
    gcloud auth login
fi

ACCOUNT=$(gcloud auth list --filter=status:ACTIVE --format="value(account)" | head -1)
echo -e "${GREEN}✅ Authenticated as: ${ACCOUNT}${NC}"

# Check if project is set
PROJECT_ID=$(gcloud config get-value project 2>/dev/null || echo "")
if [ -z "$PROJECT_ID" ]; then
    echo -e "${YELLOW}⚠️  No GCP project set${NC}"
    echo "Available projects:"
    gcloud projects list --format="table(projectId,name)"
    echo ""
    read -p "Enter your GCP Project ID: " PROJECT_ID
    gcloud config set project "$PROJECT_ID"
fi

echo -e "${GREEN}✅ Using project: ${PROJECT_ID}${NC}"

# Check for service account key
if [ ! -f "serviceAccountKey.json" ]; then
    echo -e "${YELLOW}⚠️  serviceAccountKey.json not found${NC}"
    echo ""
    echo "To get your service account key:"
    echo "1. Go to Firebase Console: https://console.firebase.google.com"
    echo "2. Select your project"
    echo "3. Go to Project Settings > Service Accounts"
    echo "4. Click 'Generate New Private Key'"
    echo "5. Save the file as 'serviceAccountKey.json' in this directory"
    echo ""
    read -p "Press Enter after you've placed serviceAccountKey.json in this directory..."
    
    if [ ! -f "serviceAccountKey.json" ]; then
        echo -e "${RED}❌ serviceAccountKey.json still not found. Exiting.${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}✅ Service account key found${NC}"

# Enable required APIs
echo ""
echo "📡 Enabling required GCP APIs..."
gcloud services enable cloudbuild.googleapis.com --project="$PROJECT_ID" 2>/dev/null || true
gcloud services enable run.googleapis.com --project="$PROJECT_ID" 2>/dev/null || true
gcloud services enable containerregistry.googleapis.com --project="$PROJECT_ID" 2>/dev/null || true
echo -e "${GREEN}✅ APIs enabled${NC}"

# Build and deploy
echo ""
echo "🏗️  Building Docker image..."
gcloud builds submit --tag gcr.io/${PROJECT_ID}/websocket-server --project="$PROJECT_ID"

echo ""
echo "🚀 Deploying to Cloud Run (Free Tier)..."
gcloud run deploy websocket-server \
  --image gcr.io/${PROJECT_ID}/websocket-server \
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
  --no-cpu-boost \
  --project="$PROJECT_ID"

# Get the deployed URL
SERVICE_URL=$(gcloud run services describe websocket-server --region us-central1 --format="value(status.url)" --project="$PROJECT_ID")

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""
echo "🌐 Your WebSocket server is live at:"
echo "   ${SERVICE_URL}"
echo ""
echo "📋 Next steps:"
echo "1. Update your app's WebSocket URL:"
echo "   Edit: HomeServicesProvider/src/services/websocketService.ts"
echo "   Change: const SOCKET_URL = '${SERVICE_URL}';"
echo ""
echo "2. Test the server:"
echo "   curl ${SERVICE_URL}/"
echo ""
echo "💡 Free Tier Limits:"
echo "   - 2 million requests/month"
echo "   - 360,000 GB-seconds"
echo "   - 180,000 vCPU-seconds"
echo ""

