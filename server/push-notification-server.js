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
    const roomName = `provider-${providerId}`;
    console.log(`✅ Provider ${providerId} joining room: ${roomName}`);
    
    // Join the room
    socket.join(roomName);
    
    // Check room status immediately and after a short delay
    setTimeout(() => {
      const room = io.sockets.adapter.rooms.get(roomName);
      const roomSize = room ? room.size : 0;
      
      console.log(`✅ Provider ${providerId} joined room: ${roomName}`);
      console.log(`📊 Room size after join: ${roomSize}`);
      console.log(`📋 Socket ${socket.id} is in rooms:`, Array.from(socket.rooms || []));
      
      // Send confirmation back to client
      socket.emit('room-joined', {
        room: roomName,
        providerId: providerId,
        roomSize: roomSize,
      });
    }, 100); // Small delay to ensure room join is processed
  });

  // Join customer room
  socket.on('join-customer-room', (customerId) => {
    const roomName = `customer-${customerId}`;
    console.log(`✅ Customer ${customerId} joining room: ${roomName}`);
    console.log(`📋 Socket ID: ${socket.id}`);
    
    socket.join(roomName, (err) => {
      if (err) {
        console.error(`❌ Error joining customer room ${roomName}:`, err);
        return;
      }
      
      // Check room status after join
      setTimeout(() => {
        const room = io.sockets.adapter.rooms.get(roomName);
        const roomSize = room ? room.size : 0;
        console.log(`✅ Customer ${customerId} successfully joined room: ${roomName}`);
        console.log(`📊 Customer room size: ${roomSize}`);
        console.log(`📋 Sockets in room:`, room ? Array.from(room) : []);
        
        socket.emit('customer-room-joined', {
          room: roomName,
          customerId: customerId,
          roomSize: roomSize,
        });
      }, 100);
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

/**
 * Emit service completed notification to customer via WebSocket
 * POST /emit-service-completed
 * Body: {
 *   customerId: 'customer123',
 *   jobCardId: 'jobCard123',
 *   consultationId: 'consultation123',
 *   providerName: 'Provider Name',
 *   serviceType: 'Service Type'
 * }
 */
app.post('/emit-service-completed', (req, res) => {
  try {
    console.log('📥 [SERVER] Received /emit-service-completed request:', {
      body: req.body,
      timestamp: new Date().toISOString(),
    });

    const { customerId, jobCardId, consultationId, providerName, serviceType } = req.body;

    if (!customerId || !jobCardId || !consultationId) {
      console.error('❌ [SERVER] Missing required fields:', {
        customerId: !!customerId,
        jobCardId: !!jobCardId,
        consultationId: !!consultationId,
      });
      return res.status(400).json({
        success: false,
        error: 'customerId, jobCardId, and consultationId are required',
      });
    }

    const roomName = `customer-${customerId}`;
    
    // Check if room exists (has connected sockets)
    const room = io.sockets.adapter.rooms.get(roomName);
    const roomSize = room ? room.size : 0;
    
    console.log(`📤 [SERVER] Emitting service-completed to customer room: ${roomName}`);
    console.log(`📊 [SERVER] Customer room size (connected customers): ${roomSize}`);
    console.log(`📋 [SERVER] Service completion data:`, {
      jobCardId,
      consultationId,
      providerName,
      serviceType,
      customerId,
    });

    // Log all connected sockets for debugging
    const allRooms = Array.from(io.sockets.adapter.rooms.keys());
    const customerRooms = allRooms.filter(r => r.startsWith('customer-'));
    console.log(`📋 [SERVER] All customer rooms:`, customerRooms);
    console.log(`📋 [SERVER] Total connected sockets:`, io.sockets.sockets.size);

    // Emit to specific customer's room
    const eventData = {
      jobCardId,
      consultationId,
      providerName: providerName || 'Provider',
      serviceType: serviceType || 'Service',
    };
    
    console.log(`📤 [SERVER] Emitting 'service-completed' event with data:`, eventData);
    io.to(roomName).emit('service-completed', eventData);
    console.log(`✅ [SERVER] Event emitted to room: ${roomName}`);

    if (roomSize === 0) {
      console.warn(`⚠️ [SERVER] WARNING: No customers connected to room ${roomName}. Notification will NOT be received.`);
      console.warn(`⚠️ [SERVER] Customer ${customerId} needs to be connected and joined to room ${roomName}`);
    } else {
      console.log(`✅ [SERVER] Service completion notification sent to ${roomSize} customer(s) in room ${roomName}`);
    }

    res.json({
      success: true,
      message: 'Service completion notification emitted',
      roomSize: roomSize,
      roomName: roomName,
    });
  } catch (error) {
    console.error('❌ [SERVER] Error emitting service completion:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to emit service completion notification',
    });
  }
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
    // Support both providerId and doctorId for backward compatibility
    const { providerId, doctorId, bookingData } = req.body;
    const targetProviderId = providerId || doctorId;

    if (!targetProviderId || !bookingData) {
      return res.status(400).json({
        success: false,
        error: 'providerId (or doctorId) and bookingData are required',
      });
    }

    const roomName = `provider-${targetProviderId}`;
    
    // Check if room exists (has connected sockets)
    const room = io.sockets.adapter.rooms.get(roomName);
    const roomSize = room ? room.size : 0;
    
    console.log(`📤 Emitting booking to room: ${roomName}`);
    console.log(`📊 Room size (connected providers): ${roomSize}`);
    console.log(`📋 Booking data:`, {
      consultationId: bookingData.consultationId || bookingData.id || bookingData.bookingId,
      customerName: bookingData.customerName || bookingData.patientName,
      serviceType: bookingData.serviceType,
    });

    // Emit to specific provider's room
    io.to(roomName).emit('new-booking', bookingData);

    if (roomSize === 0) {
      console.warn(`⚠️ Warning: No providers connected to room ${roomName}. Notification may not be received.`);
    } else {
      console.log(`✅ Booking notification sent to ${roomSize} provider(s) in room ${roomName}`);
    }

    res.json({
      success: true,
      message: 'Booking notification emitted',
      roomSize: roomSize,
    });
  } catch (error) {
    console.error('Error emitting booking:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to emit booking notification',
    });
  }
});

// Cloud Run uses PORT env variable (defaults to 8080)
// Default to 3000 for local development
const PORT = process.env.PORT || 3000;
// Listen on all interfaces (0.0.0.0) - required for Cloud Run
server.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Push Notification Server with WebSocket running on port ${PORT}`);
  console.log(`🌐 WebSocket endpoint: ws://localhost:${PORT}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/`);
  if (process.env.K_SERVICE || process.env.K_REVISION) {
    console.log(`☁️ Running on GCP Cloud Run (FREE TIER)`);
  } else {
    console.log(`🔧 Running locally - Accessible from Android emulator at: http://10.0.2.2:${PORT}`);
  }
});

module.exports = { app, io, server };


