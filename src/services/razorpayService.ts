import RazorpayCheckout from 'react-native-razorpay';
import firestore from '@react-native-firebase/firestore';
import {
  RAZORPAY_KEY_ID,
  PAYMENT_API_URL_DEV,
  PAYMENT_API_URL_PROD,
} from '@env';

/**
 * Razorpay Payment Service
 * Handles payment processing using Razorpay with server-side integration
 * 
 * All sensitive operations (order creation, payment verification) are done on the backend
 * for security.
 * 
 * Configuration is loaded from .env file:
 * - RAZORPAY_KEY_ID: Your Razorpay Key ID
 * - PAYMENT_API_URL_DEV: Payment server URL for development
 * - PAYMENT_API_URL_PROD: Payment server URL for production
 */

// Backend API Base URL from environment variables
// Get API URL at runtime to handle missing environment variables gracefully
const getApiBaseUrl = (): string => {
  try {
    if (__DEV__) {
      // Development mode - use DEV URL or fallback to localhost
      if (PAYMENT_API_URL_DEV && PAYMENT_API_URL_DEV.trim() !== '') {
        return PAYMENT_API_URL_DEV;
      }
      return 'http://10.0.2.2:3001';
    } else {
      // Production mode - MUST have PAYMENT_API_URL_PROD set
      if (PAYMENT_API_URL_PROD && 
          PAYMENT_API_URL_PROD.trim() !== '' && 
          PAYMENT_API_URL_PROD !== 'https://your-production-server.com') {
        return PAYMENT_API_URL_PROD;
      }
      // In production, return empty string if not configured (will be caught by validation)
      return '';
    }
  } catch (error) {
    // Fallback if environment variables are not accessible
    return __DEV__ ? 'http://10.0.2.2:3001' : '';
  }
};

// Store the URL, but validate at runtime in each function
const getValidatedApiUrl = (): string => {
  const url = getApiBaseUrl();
  if (!url || url.trim() === '' || url === 'https://your-production-server.com') {
    throw new Error(
      'Payment server is not configured. Please set PAYMENT_API_URL_PROD in your .env file with your production payment server URL and rebuild the app.'
    );
  }
  return url;
};

// Validate required environment variables with better error handling
if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID.trim() === '') {
  const errorMsg = 'RAZORPAY_KEY_ID is not configured. Payment features will not work. Please set RAZORPAY_KEY_ID in your .env file.';
  if (__DEV__) {
  } else {
    // In production, log to crash reporting service if available
  }
}

// Note: API URL validation happens at runtime in each payment function
// This prevents crashes during app startup if environment variables are missing

export interface PaymentOptions {
  amount: number; // Amount in paise (e.g., 50000 for ₹500)
  currency?: string;
  description: string;
  orderId?: string;
  consultationId?: string;
  prefill?: {
    email?: string;
    contact?: string;
    name?: string;
  };
  theme?: {
    color?: string;
  };
}

export interface PaymentResult {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Generate UPI QR code using Razorpay API via backend
 * Returns QR code image URL and UPI link
 */
export const generateUPIQRLink = async (
  options: PaymentOptions,
): Promise<string | {qrCodeImage: string; upiLink: string; qrCodeLink: string; qrCodeId: string; isVariableAmount?: boolean}> => {
  try {
    // Get validated API URL at runtime
    const API_BASE_URL = getValidatedApiUrl();
    
    // Validate RAZORPAY_KEY_ID
    if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID.trim() === '') {
      throw new Error('Payment gateway is not configured. Please contact support.');
    }

    const url = `${API_BASE_URL}/api/payment/generate-upi-link`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: options.amount, // Amount in paise
        description: options.description,
        name: `HomeServices - ${options.description}`,
        notes: {
          consultationId: options.consultationId,
          customerName: options.prefill?.name,
          customerEmail: options.prefill?.email,
          customerContact: options.prefill?.contact,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data.error || data.message || `Server error: ${response.status}`;
      console.error('❌ QR Code generation failed:', {
        status: response.status,
        statusText: response.statusText,
        error: errorMsg,
        url: url,
      });
      throw new Error(errorMsg || 'Failed to generate QR code. Please check your payment server configuration.');
    }

    if (!data.success) {
      throw new Error(data.error || 'Failed to generate QR code');
    }

    // QR Code generated successfully
    
    // Return object with QR code image and link
    // Server returns: qrCodeImage (short URL), qrCodeLink (short URL), upiLink (UPI URI)
    return {
      qrCodeImage: data.qrCodeImage || data.qrCodeLink, // Use short URL as image URL
      upiLink: data.upiLink || data.qrCodeLink || data.qrCodeImage,
      qrCodeLink: data.qrCodeLink || data.qrCodeImage,
      qrCodeId: data.qrCodeId,
      isVariableAmount: data.isVariableAmount || false,
    };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to generate QR code');
  }
};

/**
 * Initialize Razorpay payment
 * Creates order on backend first, then opens Razorpay checkout
 */
export const initializePayment = async (
  options: PaymentOptions,
  ): Promise<PaymentResult> => {
    try {
      // Get validated API URL at runtime
      const API_BASE_URL = getValidatedApiUrl();
      
      // Validate RAZORPAY_KEY_ID
      if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID.trim() === '') {
        throw new Error('Payment gateway is not configured. Please contact support.');
      }

      // options.amount is already in paise (converted by PaymentScreen)
      const amountInPaise = options.amount;
      
      // Step 1: Create order on backend
      const orderUrl = `${API_BASE_URL}/api/payment/create-order`;
      const orderResponse = await fetch(orderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountInPaise, // Amount in paise
        currency: options.currency || 'INR',
        receipt: options.consultationId || `receipt_${Date.now()}`,
        notes: {
          consultationId: options.consultationId,
          description: options.description,
          appName: 'HomeServices',
        },
      }),
    });

    const orderData = await orderResponse.json();

    if (!orderResponse.ok) {
      const errorMsg = orderData.error || orderData.message || `Server error: ${orderResponse.status}`;
      console.error('❌ Order creation failed:', {
        status: orderResponse.status,
        statusText: orderResponse.statusText,
        error: errorMsg,
        url: orderUrl,
      });
      throw new Error(errorMsg || 'Failed to create payment order. Please check your payment server configuration.');
    }

    if (!orderData.success) {
      throw new Error(orderData.error || 'Failed to create payment order');
    }

    const orderId = orderData.order.id;

    // Step 2: Open Razorpay checkout with order ID
    if (!RAZORPAY_KEY_ID) {
      throw new Error('RAZORPAY_KEY_ID is not configured. Please set it in .env file.');
    }

    const paymentOptions = {
      description: options.description,
      image: 'https://your-logo-url.com/logo.png', // Optional: Add HomeServices logo URL
      currency: options.currency || 'INR',
      key: RAZORPAY_KEY_ID,
      amount: amountInPaise, // Amount in paise
      order_id: orderId, // Use order ID from backend
      name: 'HomeServices',
      prefill: {
        email: options.prefill?.email || '',
        contact: options.prefill?.contact || '',
        name: options.prefill?.name || '',
      },
      theme: {
        color: options.theme?.color || '#4A90E2',
      },
    };

    const paymentResult = await RazorpayCheckout.open(paymentOptions);

    // Step 3: Verify payment signature on backend
    const verifyUrl = `${API_BASE_URL}/api/payment/verify`;
    const verifyResponse = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        razorpay_order_id: paymentResult.razorpay_order_id || orderId,
        razorpay_payment_id: paymentResult.razorpay_payment_id,
        razorpay_signature: paymentResult.razorpay_signature,
        consultationId: options.consultationId,
        amount: amountInPaise,
        notes: {
          consultationId: options.consultationId,
          description: options.description,
        },
      }),
    });

    const verifyData = await verifyResponse.json();

    if (!verifyResponse.ok) {
      const errorMsg = verifyData.error || verifyData.message || `Server error: ${verifyResponse.status}`;
      console.error('❌ Payment verification failed:', {
        status: verifyResponse.status,
        statusText: verifyResponse.statusText,
        error: errorMsg,
        url: verifyUrl,
      });
      throw new Error(errorMsg || 'Payment verification failed. Please contact support.');
    }

    if (!verifyData.success) {
      throw new Error(verifyData.error || 'Payment verification failed');
    }

    return paymentResult as PaymentResult;
  } catch (error: any) {
    // Parse error to get user-friendly message
    let errorMessage = 'Payment failed. Please try again.';
    
    try {
      // Handle Razorpay error structure - can be deeply nested
      let razorpayError: any = null;
      
      // Step 1: Try to extract error from error.error structure (most common Razorpay pattern)
      // The actual error details are usually in error.error with step, reason, etc.
      if (error.error) {
        razorpayError = error.error;
        
        // Step 2: Check for nested error.error structure first (rare but possible)
        if (razorpayError.error) {
          razorpayError = razorpayError.error;
        }
        
        // Step 3: Also check error.description at root level (can contain JSON with more details)
        if (error.description && typeof error.description === 'string' && error.description.trim().startsWith('{')) {
          try {
            const parsedDesc = JSON.parse(error.description);
            if (parsedDesc.error) {
              // Merge parsed error details with existing razorpayError
              // Prefer existing razorpayError values, but add missing ones from parsed
              razorpayError = {
                ...razorpayError,
                ...parsedDesc.error,
                // Keep step/reason from error.error if they exist (they're more reliable)
                step: razorpayError.step || parsedDesc.error.step,
                reason: razorpayError.reason || parsedDesc.error.reason,
              };
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }
        
        // Step 4: Check if razorpayError.description contains JSON string (less common)
        if (razorpayError.description && typeof razorpayError.description === 'string' && razorpayError.description.trim().startsWith('{')) {
          try {
            const parsedDesc = JSON.parse(razorpayError.description);
            if (parsedDesc.error) {
              // Use parsed error, but keep step/reason from parent if available
              razorpayError = {
                ...parsedDesc.error,
                step: razorpayError.step || parsedDesc.error.step,
                reason: razorpayError.reason || parsedDesc.error.reason,
              };
            }
          } catch (e) {
            // Not JSON, continue with original error structure
          }
        }
      } 
      // Step 5: If no error.error, check direct properties
      else if (error.code || error.description || error.step || error.reason) {
        razorpayError = error;
      }
      
      // Step 5: Parse error based on extracted structure
      if (razorpayError) {
        // Handle payment cancellation first
        const desc = razorpayError.description;
        const isCancelled = desc === 'User cancelled the payment' || 
                           desc?.includes('cancelled') ||
                           razorpayError.reason === 'user_cancelled';
        
        if (isCancelled) {
          errorMessage = 'Payment was cancelled';
          throw new Error(errorMessage); // Throw early for cancellation
        }
        
        // Handle BAD_REQUEST_ERROR
        if (razorpayError.code === 'BAD_REQUEST_ERROR') {
          const step = razorpayError.step ? String(razorpayError.step) : '';
          const reason = razorpayError.reason ? String(razorpayError.reason) : '';
          const source = razorpayError.source;
          
          // Payment authentication errors - check step first (most reliable)
          // Handle both "payment_authentication" (underscore) and "payment authentication" (space)
          const stepLower = step.toLowerCase();
          const reasonLower = reason.toLowerCase();
          
          if (step === 'payment_authentication' || 
              step === 'payment authentication' ||
              stepLower.includes('authentication')) {
            errorMessage = 'Payment authentication failed. Please try again or use a different payment method.';
          }
          // Check reason as fallback
          else if (reason === 'payment_authentication' ||
                   reason === 'payment authentication' ||
                   reasonLower.includes('authentication')) {
            errorMessage = 'Payment authentication failed. Please try again or use a different payment method.';
          } 
          // Payment processing errors
          else if (reason === 'payment_error' || step === 'payment_processing') {
            errorMessage = 'Payment processing failed. Please check your payment details and try again.';
          }
          // Customer-side errors
          else if (source === 'customer' && step) {
            const stepText = step.replace(/_/g, ' ');
            errorMessage = `Payment ${stepText} failed. Please try again or use a different payment method.`;
          }
          // Generic bad request
          else {
            errorMessage = 'Invalid payment request. Please check your payment details and try again.';
          }
        } 
        // Handle other error codes
        else if (razorpayError.code === 'GATEWAY_ERROR') {
          errorMessage = 'Payment gateway error. Please try again in a few moments.';
        } else if (razorpayError.code === 'NETWORK_ERROR') {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (razorpayError.code === 'SERVER_ERROR') {
          errorMessage = 'Server error. Please try again later.';
        } 
        // Try to extract message from description if valid
        else if (desc && 
                 desc !== 'undefined' && 
                 desc !== 'null' &&
                 typeof desc === 'string' &&
                 desc.length > 0 &&
                 desc.length < 200 &&
                 !desc.startsWith('{') &&
                 !desc.startsWith('[')) {
          errorMessage = desc;
        }
      }
      
      // Final fallback: Use error.message if it's valid
      if (errorMessage === 'Payment failed. Please try again.' && error.message) {
        const msg = error.message;
        if (msg && 
            msg !== 'undefined' && 
            msg !== 'null' &&
            typeof msg === 'string' &&
            msg.length > 0 &&
            msg.length < 200 &&
            !msg.includes('{') && 
            !msg.includes('[')) {
          errorMessage = msg;
        }
      }
    } catch (parseError: any) {
      // If error parsing fails, check if it's a cancellation
      if (parseError.message === 'Payment was cancelled') {
        throw parseError; // Re-throw cancellation
      }
      // Otherwise use default message
      if (__DEV__) {
      }
    }
    
    // Only log parsed error message (not raw error object) to avoid console spam
    if (__DEV__) {
    }
    
    throw new Error(errorMessage);
  }
};

/**
 * Save payment record to Firestore
 */
export const savePaymentRecord = async (
  consultationId: string,
  paymentData: PaymentResult,
  amount: number,
): Promise<void> => {
  try {
    await firestore()
      .collection('payments')
      .add({
        consultationId,
        razorpayPaymentId: paymentData.razorpay_payment_id,
        razorpayOrderId: paymentData.razorpay_order_id,
        razorpaySignature: paymentData.razorpay_signature,
        amount,
        status: 'completed',
        paidAt: firestore.FieldValue.serverTimestamp(),
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

    // Update consultation with payment status
    await firestore()
      .collection('consultations')
      .doc(consultationId)
      .update({
        paymentStatus: 'paid',
        paymentId: paymentData.razorpay_payment_id,
        paidAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
  } catch (error) {
    throw new Error('Failed to save payment record');
  }
};

/**
 * Save COD (Cash on Delivery) payment record to Firestore
 */
export const saveCODPaymentRecord = async (
  consultationId: string,
  amount: number, // Amount in rupees
): Promise<void> => {
  try {
    const amountInPaise = Math.round(amount * 100);

    // Save COD payment record
    await firestore()
      .collection('payments')
      .add({
        consultationId,
        paymentMethod: 'cod',
        amount: amountInPaise,
        amountInRupees: amount,
        status: 'pending', // COD payments are pending until collected
        createdAt: firestore.FieldValue.serverTimestamp(),
      });

    // Update consultation with COD payment status
    await firestore()
      .collection('consultations')
      .doc(consultationId)
      .update({
        paymentStatus: 'cod', // Special status for COD
        paymentMethod: 'cod',
        amount: amountInPaise,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

    // COD payment record saved successfully
  } catch (error) {
    throw new Error('Failed to save COD payment record');
  }
};

/**
 * Verify payment status via backend API
 */
export const verifyPayment = async (
  paymentId: string,
  orderId: string,
  signature: string,
): Promise<boolean> => {
  try {
    const API_BASE_URL = getValidatedApiUrl();
    const verifyUrl = `${API_BASE_URL}/api/payment/verify`;
    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      return false;
    }

    return true;
  } catch (error) {
    return false;
  }
};

export default {
  generateUPIQRLink,
  initializePayment,
  savePaymentRecord,
  saveCODPaymentRecord,
  verifyPayment,
};

