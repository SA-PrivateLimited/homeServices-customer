/**
 * WebSocket Service for Real-time Booking Notifications
 * Uses Socket.io client to communicate with the server
 */

import io, { Socket } from 'socket.io-client';

const SOCKET_URL = __DEV__
  ? 'http://10.0.2.2:3001' // Android emulator localhost (using port 3001 to avoid conflicts)
  : 'https://your-production-server.com'; // Replace with your production URL

class WebSocketService {
  private socket: Socket | null = null;
  private isConnected: boolean = false;

  /**
   * Initialize WebSocket connection
   */
  connect(): void {
    if (this.socket?.connected) {
      console.log('WebSocket already connected');
      return;
    }

    try {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 10,
      });

      this.socket.on('connect', () => {
        console.log('WebSocket connected:', this.socket?.id);
        this.isConnected = true;
      });

      this.socket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        this.isConnected = false;
      });

      this.socket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        this.isConnected = false;
      });
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }

  /**
   * Join a customer-specific room for personalized notifications
   */
  joinCustomerRoom(customerId: string): void {
    if (this.socket?.connected) {
      this.socket.emit('join-customer-room', customerId);
      console.log(`Joined customer room: ${customerId}`);
    } else {
      console.warn('Socket not connected. Cannot join customer room.');
    }
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
