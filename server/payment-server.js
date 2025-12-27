/**
 * Razorpay Payment Server
 * 
 * This server handles Razorpay payment operations securely on the backend:
 * - Creating payment orders
 * - Verifying payment signatures
 * - Handling webhooks
 * 
 * Setup:
 * 1. Install dependencies: npm install razorpay dotenv
 * 2. Create .env file with RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET
 * 3. Start server: npm start
 * 
 * Deploy to:
 * - Railway.app (railway.app)
 * - Render.com (render.com)
 * - Fly.io (fly.io)
 * - Heroku (heroku.com)
 */

require('dotenv').config();
const express = require('express');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const app = express();
app.use(express.json());

// CORS configuration
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Payment server is running',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Create a Razorpay order
 * POST /api/payment/create-order
 * Body: {
 *   amount: 50000, // Amount in paise (50000 = ₹500)
 *   currency: 'INR',
 *   receipt: 'order_receipt_id',
 *   notes: {
 *     consultationId: 'consultation_id',
 *     description: 'Consultation with Dr. Name'
 *   }
 * }
 */
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const {amount, currency = 'INR', receipt, notes = {}} = req.body;

    // Validate amount
    if (!amount || amount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be at least ₹1 (100 paise)',
      });
    }

    // Create order
    const order = await razorpay.orders.create({
      amount: amount, // Amount in paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
      notes: notes,
    });

    console.log('Order created:', order.id);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt,
        status: order.status,
      },
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create order',
    });
  }
});

/**
 * Verify payment signature
 * POST /api/payment/verify
 * Body: {
 *   razorpay_order_id: 'order_id',
 *   razorpay_payment_id: 'payment_id',
 *   razorpay_signature: 'signature'
 * }
 */
app.post('/api/payment/verify', (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required payment details',
      });
    }

    // Create signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    // Verify signature
    const isSignatureValid = generatedSignature === razorpay_signature;

    if (isSignatureValid) {
      console.log('Payment verified successfully:', razorpay_payment_id);
      res.json({
        success: true,
        message: 'Payment verified successfully',
        payment_id: razorpay_payment_id,
        order_id: razorpay_order_id,
      });
    } else {
      console.error('Payment verification failed:', razorpay_payment_id);
      res.status(400).json({
        success: false,
        error: 'Invalid payment signature',
      });
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to verify payment',
    });
  }
});

/**
 * Generate UPI payment link
 * POST /api/payment/generate-upi-link
 * Body: {
 *   amount: 50000, // Amount in paise
 *   upiId: 'merchant@paytm',
 *   description: 'Consultation payment'
 * }
 */
app.post('/api/payment/generate-upi-link', (req, res) => {
  try {
    const {amount, upiId, description = 'Payment'} = req.body;

    if (!amount || amount < 100) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be at least ₹1 (100 paise)',
      });
    }

    if (!upiId) {
      return res.status(400).json({
        success: false,
        error: 'UPI ID is required',
      });
    }

    const amountInRupees = amount / 100;
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
    const merchantName = process.env.MERCHANT_NAME || 'HomeServices';

    // Generate UPI payment URL
    const upiLink = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(merchantName)}&am=${amountInRupees.toFixed(2)}&cu=INR&tn=${encodeURIComponent(description)}&tr=${encodeURIComponent(transactionId)}`;

    res.json({
      success: true,
      upiLink: upiLink,
      transactionId: transactionId,
    });
  } catch (error) {
    console.error('Error generating UPI link:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate UPI link',
    });
  }
});

/**
 * Razorpay Webhook Handler
 * POST /api/payment/webhook
 * Handles payment status updates from Razorpay
 */
app.post('/api/payment/webhook', express.raw({type: 'application/json'}), (req, res) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.warn('Webhook secret not configured. Skipping signature verification.');
      return res.status(200).json({received: true});
    }

    // Verify webhook signature
    const signature = req.headers['x-razorpay-signature'];
    const text = req.body.toString();
    const generatedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(text)
      .digest('hex');

    if (generatedSignature !== signature) {
      console.error('Invalid webhook signature');
      return res.status(400).json({error: 'Invalid signature'});
    }

    const event = JSON.parse(text);
    console.log('Webhook received:', event.event);

    // Handle different webhook events
    switch (event.event) {
      case 'payment.captured':
        console.log('Payment captured:', event.payload.payment.entity.id);
        // Update payment status in your database
        // TODO: Update consultation payment status in Firestore
        break;

      case 'payment.failed':
        console.log('Payment failed:', event.payload.payment.entity.id);
        // Handle failed payment
        // TODO: Update consultation payment status in Firestore
        break;

      case 'order.paid':
        console.log('Order paid:', event.payload.order.entity.id);
        // Handle paid order
        // TODO: Update consultation payment status in Firestore
        break;

      default:
        console.log('Unhandled webhook event:', event.event);
    }

    res.status(200).json({received: true});
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({error: 'Webhook processing failed'});
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
  });
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Payment server running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔑 Razorpay Key ID: ${process.env.RAZORPAY_KEY_ID ? 'Configured' : 'NOT CONFIGURED'}`);
});

module.exports = app;

