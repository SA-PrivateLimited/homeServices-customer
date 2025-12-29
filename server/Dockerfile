# Dockerfile for WebSocket Server on GCP Cloud Run
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (using npm install for better compatibility)
RUN npm install --production --legacy-peer-deps

# Copy server files
COPY push-notification-server.js ./
COPY serviceAccountKey.json ./

# Expose port (Cloud Run uses PORT env variable)
EXPOSE 8080

# Start the server
CMD ["node", "push-notification-server.js"]

