/**
 * Simple Express Server for Push Notifications
 * 
 * This server can be hosted for FREE on:
 * - Railway.app (railway.app)
 * - Render.com (render.com)
 * - Fly.io (fly.io)
 * 
 * No Firebase Blaze plan needed!
 * 
 * Setup:
 * 1. npm install express firebase-admin cors
 * 2. Deploy to Railway/Render/Fly.io
 * 3. Update pushNotificationService.ts to call this server instead of Cloud Functions
 */

const express = require('express');
const admin = require('firebase-admin');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
    allowEIO3: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000
});

app.use(cors());
app.use(express.json());

// Initialize Firebase Admin
// You'll need to download serviceAccountKey.json from Firebase Console
// Go to: Project Settings > Service Accounts > Generate New Private Key
if (!admin.apps.length) {
  try {
    const serviceAccount = require('./serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    console.log('Make sure serviceAccountKey.json is in the server directory');
  }
}

// Health check endpoint
app.get('/', (req, res) => {
  res.json({status: 'ok', message: 'Push Notification Server is running'});
});

/**
 * Send push notification
 * POST /send-notification
 * Body: {
 *   token: 'FCM_TOKEN',
 *   notification: { title: 'Title', body: 'Body' },
 *   data: { type: 'consultation', consultationId: '123' }
 * }
 */
app.post('/send-notification', async (req, res) => {
  try {
    const {token, notification, data} = req.body;

    if (!token || !notification) {
      return res.status(400).json({
        success: false,
        error: 'Token and notification are required',
      });
    }

    const message = {
      token: token,
      notification: {
        title: notification.title || 'HomeServices',
        body: notification.body || '',
      },
      data: {
        ...data,
        // Convert all data values to strings (FCM requirement)
        ...Object.keys(data || {}).reduce((acc, key) => {
          acc[key] = String(data[key] || '');
          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'consultation-updates',
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    
    res.json({
      success: true,
      messageId: response,
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notification',
    });
  }
});

/**
 * Send notification to multiple tokens
 * POST /send-notification-multiple
 */
app.post('/send-notification-multiple', async (req, res) => {
  try {
    const {tokens, notification, data} = req.body;

    if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Tokens array is required',
      });
    }

    const message = {
      notification: {
        title: notification.title || 'HomeServices',
        body: notification.body || '',
      },
      data: {
        ...data,
        ...Object.keys(data || {}).reduce((acc, key) => {
          acc[key] = String(data[key] || '');
          return acc;
        }, {}),
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'consultation-updates',
          sound: 'default',
          priority: 'high',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
      tokens: tokens,
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    
    res.json({
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
    });
  } catch (error) {
    console.error('Error sending notifications:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send notifications',
    });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', {
    socketId: socket.id,
    transport: socket.conn.transport.name,
    remoteAddress: socket.handshake.address,
  });

  // Join provider-specific room
  socket.on('join-provider-room', (providerId) => {
    console.log(`Provider ${providerId} joined room: provider-${providerId}`);
    socket.join(`provider-${providerId}`);
    
    // Send confirmation back to client
    socket.emit('room-joined', {
      room: `provider-${providerId}`,
      providerId: providerId,
    });
  });

  // Join customer room
  socket.on('join-customer-room', (customerId) => {
    console.log(`Customer ${customerId} joined room`);
    socket.join(`customer-${customerId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

/**
 * Emit booking notification via WebSocket
 * POST /emit-booking
 * Body: {
 *   providerId: 'provider123',
 *   bookingData: { ... }
 * }
 */
app.post('/emit-booking', (req, res) => {
  try {
    const { providerId, bookingData } = req.body;

    if (!providerId || !bookingData) {
      return res.status(400).json({
        success: false,
        error: 'providerId and bookingData are required',
      });
    }

    // Emit to specific provider's room
    io.to(`provider-${providerId}`).emit('new-booking', bookingData);

    console.log(`Booking notification sent to provider ${providerId}`);

    res.json({
      success: true,
      message: 'Booking notification emitted',
    });
  } catch (error) {
    console.error('Error emitting booking:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to emit booking notification',
    });
  }
});

const PORT = process.env.PORT || 3000;
// Listen on all interfaces (0.0.0.0) to allow emulator access via 10.0.2.2
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Push Notification Server with WebSocket running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`Accessible from Android emulator at: http://10.0.2.2:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/`);
});

module.exports = { app, io, server };


