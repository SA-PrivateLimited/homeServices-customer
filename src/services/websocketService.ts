/**
 * WebSocket Service for Real-time Booking Notifications
 * Uses Socket.io client to communicate with the server
 */

import io, { Socket } from 'socket.io-client';
import {SOCKET_URL} from '../config/api';

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private serviceCompletedCallbacks: Array<(data: {jobCardId: string; consultationId: string; providerName: string; serviceType: string}) => void> = [];

  /**
   * Set up service completion listener
   */
  private setupServiceCompletedListener(): void {
    if (!this.socket) {
      console.log('⚠️ [WEBSOCKET] Cannot setup listener - socket is null');
      return;
    }
    
    console.log('🔧 [WEBSOCKET] Setting up service-completed listener');
    console.log('📋 [WEBSOCKET] Current registered callbacks:', this.serviceCompletedCallbacks.length);
    
    // Remove existing listener to avoid duplicates
    this.socket.off('service-completed');
    
    // Set up service completion listener
    this.socket.on('service-completed', (data: {jobCardId: string; consultationId: string; providerName: string; serviceType: string}) => {
      console.log('📬 [WEBSOCKET] Service completed notification received:', {
        ...data,
        timestamp: new Date().toISOString(),
        socketId: this.socket?.id,
      });
      console.log('📬 [WEBSOCKET] Number of registered callbacks:', this.serviceCompletedCallbacks.length);
      
      // Check if callbacks are registered
      if (this.serviceCompletedCallbacks.length === 0) {
        console.log('ℹ️ [WEBSOCKET] No callbacks registered yet. Event received but no handlers to call.');
        console.log('ℹ️ [WEBSOCKET] This is normal if the callback hasn\'t been registered yet.');
        return;
      }
      
      // Notify all registered callbacks
      this.serviceCompletedCallbacks.forEach((callback, index) => {
        try {
          console.log(`📬 [WEBSOCKET] Calling callback ${index + 1}/${this.serviceCompletedCallbacks.length}`);
          callback(data);
        } catch (error: any) {
          console.error(`❌ [WEBSOCKET] Error in service completed callback ${index + 1}:`, {
            error: error.message,
            stack: error.stack,
          });
        }
      });
    });
    
    console.log('✅ [WEBSOCKET] Service-completed listener set up successfully');
  }

  /**
   * Initialize WebSocket connection
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      // Set up listener even if already connected
      this.setupServiceCompletedListener();
      return;
    }

    try {
      // Create socket instance
      const socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'], // Add polling as fallback
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      // Store reference immediately to prevent race conditions
      this.socket = socket;

      // Use the local socket reference in event handlers to avoid null issues
      socket.on('connect', () => {
        // Use the local socket reference, not this.socket (which might be null)
        if (!socket || !socket.connected) {
          console.error('❌ [WEBSOCKET] Socket is null or not connected in connect handler');
          return;
        }

        // Update this.socket to ensure it's in sync
        this.socket = socket;

        console.log('✅ [WEBSOCKET] WebSocket connected:', {
          socketId: socket.id,
          timestamp: new Date().toISOString(),
        });
        this.isConnected = true;
        
        // Set up service completion listener
        this.setupServiceCompletedListener();
      });

      socket.on('disconnect', () => {
        console.log('❌ WebSocket disconnected');
        this.isConnected = false;
        // Don't set socket to null here - let reconnection handle it
      });

      socket.on('connect_error', (error) => {
        console.error('❌ WebSocket connection error:', error);
        this.isConnected = false;
      });

      socket.on('reconnect', () => {
        console.log('✅ [WEBSOCKET] WebSocket reconnected');
        this.isConnected = true;
        this.setupServiceCompletedListener();
      });
      
      // Don't setup listener here - wait for 'connect' event
      // The listener will be set up in the 'connect' event handler above
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      this.socket = null;
      this.isConnected = false;
    }
  }

  /**
   * Join a customer-specific room for personalized notifications
   */
  joinCustomerRoom(customerId: string): void {
    console.log(`🔌 [WEBSOCKET] joinCustomerRoom called for customer: ${customerId}`);
    console.log(`🔌 [WEBSOCKET] Socket connected:`, this.socket?.connected);
    console.log(`🔌 [WEBSOCKET] Socket ID:`, this.socket?.id);
    
    if (this.socket?.connected) {
      const roomName = `customer-${customerId}`;
      console.log(`📤 [WEBSOCKET] Emitting join-customer-room event:`, {
        customerId,
        roomName,
        socketId: this.socket.id,
      });
      
      this.socket.emit('join-customer-room', customerId);
      console.log(`✅ [WEBSOCKET] Join request sent for room: ${roomName}`);
      
      // Listen for room join confirmation
      this.socket.once('customer-room-joined', (data: any) => {
        console.log(`✅ [WEBSOCKET] Customer room joined successfully:`, {
          ...data,
          timestamp: new Date().toISOString(),
        });
      });
    } else {
      console.warn('⚠️ [WEBSOCKET] Socket not connected. Waiting for connection...');
      // Wait for connection and then join
      if (this.socket) {
        this.socket.once('connect', () => {
          console.log('✅ [WEBSOCKET] Socket connected, now joining customer room');
          const roomName = `customer-${customerId}`;
          this.socket?.emit('join-customer-room', customerId);
          console.log(`✅ [WEBSOCKET] Joined customer room: ${roomName}`);
        });
      } else {
        // Connect first, then join
        console.log('🔌 [WEBSOCKET] Socket is null, connecting first...');
        this.connect();
        if (this.socket) {
          this.socket.once('connect', () => {
            const roomName = `customer-${customerId}`;
            this.socket?.emit('join-customer-room', customerId);
            console.log(`✅ [WEBSOCKET] Joined customer room: ${roomName}`);
          });
        }
      }
    }
  }

  /**
   * Register a callback for service completion events
   */
  onServiceCompleted(callback: (data: {jobCardId: string; consultationId: string; providerName: string; serviceType: string}) => void): () => void {
    console.log('📝 [WEBSOCKET] Registering service-completed callback');
    this.serviceCompletedCallbacks.push(callback);
    console.log('📝 [WEBSOCKET] Total callbacks registered:', this.serviceCompletedCallbacks.length);
    
    // Ensure listener is set up if socket is already connected
    if (this.socket?.connected) {
      console.log('📝 [WEBSOCKET] Socket already connected, ensuring listener is set up');
      this.setupServiceCompletedListener();
    }
    
    // Return unsubscribe function
    return () => {
      const index = this.serviceCompletedCallbacks.indexOf(callback);
      if (index > -1) {
        this.serviceCompletedCallbacks.splice(index, 1);
        console.log('🗑️ [WEBSOCKET] Callback unregistered. Remaining callbacks:', this.serviceCompletedCallbacks.length);
      }
    };
  }

  /**
   * Emit a new booking event to notify the provider
   */
  async emitNewBooking(providerId: string, bookingData: any): Promise<void> {
    try {
      // Call the REST API endpoint to emit the booking
      const response = await fetch(`${SOCKET_URL}/emit-booking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          providerId, // Use providerId instead of doctorId
          bookingData,
        }),
      });

      const result = await response.json();

      if (result.success) {
        console.log('Booking notification emitted successfully');
      } else {
        console.error('Failed to emit booking notification:', result.error);
      }
    } catch (error) {
      console.error('Error emitting booking notification:', error);
    }
  }

  /**
   * Disconnect the WebSocket
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      console.log('WebSocket disconnected');
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get socket instance (for advanced use cases)
   */
  getSocket(): Socket | null {
    return this.socket;
  }
}

// Export singleton instance
export default new WebSocketService();
