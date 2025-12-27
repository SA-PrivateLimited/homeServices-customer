import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Share,
  Image,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import razorpayService, {PaymentOptions, PaymentResult} from '../services/razorpayService';
import SuccessModal from './SuccessModal';
import CODConfirmationModal from './CODConfirmationModal';
import PaymentFailedModal from './PaymentFailedModal';
import PaymentSuccessModal from './PaymentSuccessModal';

interface PaymentScreenProps {
  navigation: any;
  route: {
    params: {
      consultationId: string;
      amount: number; // Amount in rupees
      description: string;
      doctorName: string;
      onPaymentSuccess?: () => void;
      onPaymentCancel?: () => void;
    };
  };
}

const PaymentScreen: React.FC<PaymentScreenProps> = ({navigation, route}) => {
  const {consultationId, amount, description, doctorName, onPaymentSuccess, onPaymentCancel} =
    route.params;
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Calculate GST (2% of consultation fee)
  const GST_PERCENTAGE = 2;
  const consultationFee = amount;
  const gstAmount = Math.round((consultationFee * GST_PERCENTAGE) / 100 * 100) / 100; // Round to 2 decimal places
  const totalAmount = consultationFee + gstAmount;

  const [paymentMethod, setPaymentMethod] = useState<'upi_qr' | 'razorpay_checkout' | 'cod'>('razorpay_checkout');
  const [qrCodeLink, setQrCodeLink] = useState<string | null>(null);
  const [qrCodeImageUrl, setQrCodeImageUrl] = useState<string | null>(null);
  const [isVariableAmount, setIsVariableAmount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentSuccessModal, setShowPaymentSuccessModal] = useState(false);
  const [showCODModal, setShowCODModal] = useState(false);
  const [showFailedModal, setShowFailedModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string>('');

  useEffect(() => {
    if (paymentMethod === 'upi_qr') {
      generateQRCode();
    }
  }, [paymentMethod]);

  const generateQRCode = async () => {
    setLoading(true);
    try {
      const amountInPaise = Math.round(totalAmount * 100); // Convert total amount (including GST) to paise
      const qrData = await razorpayService.generateUPIQRLink({
        amount: amountInPaise,
        description: `${description} (Incl. GST)`,
        consultationId,
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || '',
          contact: currentUser?.phone || '',
        },
      });
      
      // qrData can be either a string (legacy) or an object with qrCodeImage and upiLink
      if (typeof qrData === 'string') {
        setQrCodeLink(qrData);
        setQrCodeImageUrl(null);
        setIsVariableAmount(false);
      } else {
        setQrCodeLink(qrData.upiLink || qrData.qrCodeLink);
        setQrCodeImageUrl(qrData.qrCodeImage);
        setIsVariableAmount(qrData.isVariableAmount || false);
      }
    } catch (error: any) {
      setPaymentError(error.message || 'Failed to generate QR code');
      setShowFailedModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleRazorpayPayment = async () => {
    setProcessing(true);
    try {
      const amountInPaise = Math.round(totalAmount * 100); // Convert total amount (including GST) to paise
      const paymentOptions: PaymentOptions = {
        amount: amountInPaise,
        currency: 'INR',
        description: `Consultation with ${doctorName} (Incl. GST)`,
        consultationId,
        prefill: {
          name: currentUser?.name || '',
          email: currentUser?.email || '',
          contact: currentUser?.phone || '',
        },
        theme: {
          color: theme.primary,
        },
      };

      const paymentResult = await razorpayService.initializePayment(paymentOptions);

      // Save payment record
      await razorpayService.savePaymentRecord(
        consultationId,
        paymentResult,
        amountInPaise,
      );

      // Show beautiful payment success modal instead of Alert
      setShowPaymentSuccessModal(true);
    } catch (error: any) {
      const errorMessage = error.message || 'Payment failed. Please try again.';
      
      if (errorMessage === 'Payment was cancelled' || errorMessage.includes('cancelled')) {
        // User cancelled - don't show error, just call cancel callback
        if (onPaymentCancel) {
          onPaymentCancel();
        }
      } else {
        // Show beautiful error modal instead of Alert
        setPaymentError(errorMessage);
        setShowFailedModal(true);
      }
    } finally {
      setProcessing(false);
    }
  };

  const handleCODPayment = () => {
    setShowCODModal(true);
  };

  const handleCODConfirm = async () => {
    setShowCODModal(false);
    setProcessing(true);
    try {
      // Save COD payment record with total amount (including GST)
      await razorpayService.saveCODPaymentRecord(
        consultationId,
        totalAmount, // Total amount including GST
      );

      // Call onPaymentSuccess callback if provided (this will send notification with 'paid' status)
      if (onPaymentSuccess) {
        onPaymentSuccess();
      } else {
        // Show success modal if no callback provided
        setShowSuccessModal(true);
      }
    } catch (error: any) {
      setPaymentError(error.message || 'Failed to confirm COD booking');
      setShowFailedModal(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleCODCancel = () => {
    setShowCODModal(false);
    if (onPaymentCancel) {
      onPaymentCancel();
    }
  };

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false);
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
    navigation.goBack();
  };

  const handleShareQRCode = async () => {
    if (!qrCodeLink) return;

    try {
      await Share.share({
        message: `Scan this QR code to pay ₹${totalAmount.toFixed(2)} (Consultation Fee: ₹${consultationFee} + GST: ₹${gstAmount.toFixed(2)}) for ${description}:\n\n${qrCodeLink}`,
        title: 'Payment QR Code',
      });
    } catch (error) {
    }
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      contentContainerStyle={styles.content}>
      {/* Header */}
      <View
        style={[
          styles.headerCard,
          {backgroundColor: theme.card},
          commonStyles.shadowSmall,
        ]}>
        <Icon name="checkmark-circle" size={48} color={theme.primary} />
        <Text style={[styles.amountText, {color: theme.text}]}>
          ₹{totalAmount.toFixed(2)}
        </Text>
        <View style={styles.priceBreakdown}>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, {color: theme.textSecondary}]}>
              Consultation Fee:
            </Text>
            <Text style={[styles.priceValue, {color: theme.text}]}>
              ₹{consultationFee}
            </Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, {color: theme.textSecondary}]}>
              GST ({GST_PERCENTAGE}%):
            </Text>
            <Text style={[styles.priceValue, {color: theme.text}]}>
              ₹{gstAmount.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.priceRow, styles.totalRow]}>
            <Text style={[styles.totalLabel, {color: theme.text, fontWeight: '600'}]}>
              Total:
            </Text>
            <Text style={[styles.totalValue, {color: theme.primary, fontWeight: '700'}]}>
              ₹{totalAmount.toFixed(2)}
            </Text>
          </View>
        </View>
        <Text style={[styles.descriptionText, {color: theme.textSecondary, marginTop: 8}]}>
          {description}
        </Text>
        <Text style={[styles.doctorText, {color: theme.textSecondary}]}>
          Dr. {doctorName}
        </Text>
      </View>

      {/* Payment Method Selection */}
      <View
        style={[
          styles.section,
          {backgroundColor: theme.card},
          commonStyles.shadowSmall,
        ]}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          Choose Payment Method
        </Text>

        <TouchableOpacity
          style={[
            styles.methodOption,
            {
              backgroundColor:
                paymentMethod === 'razorpay_checkout'
                  ? theme.primary + '20'
                  : theme.background,
              borderColor:
                paymentMethod === 'razorpay_checkout' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setPaymentMethod('razorpay_checkout')}>
          <Icon
            name="card-outline"
            size={24}
            color={
              paymentMethod === 'razorpay_checkout'
                ? theme.primary
                : theme.textSecondary
            }
          />
          <View style={styles.methodInfo}>
            <Text
              style={[
                styles.methodTitle,
                {
                  color:
                    paymentMethod === 'razorpay_checkout' ? theme.primary : theme.text,
                },
              ]}>
              Razorpay Checkout
            </Text>
            <Text style={[styles.methodDescription, {color: theme.textSecondary}]}>
              Cards, UPI, Wallets & more
            </Text>
          </View>
          {paymentMethod === 'razorpay_checkout' && (
            <Icon name="checkmark-circle" size={24} color={theme.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodOption,
            {
              backgroundColor:
                paymentMethod === 'upi_qr' ? theme.primary + '20' : theme.background,
              borderColor:
                paymentMethod === 'upi_qr' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setPaymentMethod('upi_qr')}>
          <Icon
            name="qr-code-outline"
            size={24}
            color={paymentMethod === 'upi_qr' ? theme.primary : theme.textSecondary}
          />
          <View style={styles.methodInfo}>
            <Text
              style={[
                styles.methodTitle,
                {
                  color: paymentMethod === 'upi_qr' ? theme.primary : theme.text,
                },
              ]}>
              UPI QR Code
            </Text>
            <Text style={[styles.methodDescription, {color: theme.textSecondary}]}>
              Scan with any UPI app
            </Text>
          </View>
          {paymentMethod === 'upi_qr' && (
            <Icon name="checkmark-circle" size={24} color={theme.primary} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.methodOption,
            {
              backgroundColor:
                paymentMethod === 'cod' ? theme.primary + '20' : theme.background,
              borderColor: paymentMethod === 'cod' ? theme.primary : theme.border,
            },
          ]}
          onPress={() => setPaymentMethod('cod')}>
          <Icon
            name="cash-outline"
            size={24}
            color={paymentMethod === 'cod' ? theme.primary : theme.textSecondary}
          />
          <View style={styles.methodInfo}>
            <Text
              style={[
                styles.methodTitle,
                {
                  color: paymentMethod === 'cod' ? theme.primary : theme.text,
                },
              ]}>
              Cash after Appointment
            </Text>
            <Text style={[styles.methodDescription, {color: theme.textSecondary}]}>
              Pay in cash after the appointment
            </Text>
          </View>
          {paymentMethod === 'cod' && (
            <Icon name="checkmark-circle" size={24} color={theme.primary} />
          )}
        </TouchableOpacity>
      </View>

      {/* UPI QR Code Display */}
      {paymentMethod === 'upi_qr' && (
        <View
          style={[
            styles.section,
            {backgroundColor: theme.card},
            commonStyles.shadowSmall,
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            Scan QR Code to Pay
          </Text>

          {loading ? (
            <View style={styles.qrContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
                Generating QR code...
              </Text>
            </View>
          ) : qrCodeLink ? (
            <View style={styles.qrContainer}>
              <View
                style={[
                  styles.qrCodeWrapper,
                  {backgroundColor: '#FFFFFF', borderColor: theme.border},
                ]}>
                {qrCodeImageUrl ? (
                  // Use Razorpay QR code image
                  <Image
                    source={{uri: qrCodeImageUrl}}
                    style={styles.qrCodeImage}
                    resizeMode="contain"
                  />
                ) : (
                  // Fallback to local QR code generation
                  <QRCode value={qrCodeLink} size={250} />
                )}
              </View>
              {isVariableAmount ? (
                <View
                  style={[
                    styles.amountWarningBox,
                    {
                      backgroundColor: theme.primary + '20',
                      borderColor: theme.primary,
                    },
                  ]}>
                  <Icon name="alert-circle" size={20} color={theme.primary} />
                  <Text
                    style={[
                      styles.amountWarningText,
                      {color: theme.primary, fontWeight: '600'},
                    ]}>
                    Please pay exactly ₹{totalAmount.toFixed(2)}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.amountInfoBox,
                    {
                      backgroundColor: theme.primary + '10',
                      borderColor: theme.primary + '40',
                    },
                  ]}>
                  <Icon name="checkmark-circle" size={20} color={theme.primary} />
                  <Text
                    style={[
                      styles.amountInfoText,
                      {color: theme.text, fontWeight: '500'},
                    ]}>
                    Amount pre-set: ₹{totalAmount.toFixed(2)}
                  </Text>
                </View>
              )}
              <Text style={[styles.qrInstructions, {color: theme.textSecondary}]}>
                {isVariableAmount
                  ? `Open your UPI app (Google Pay, PhonePe, Paytm, etc.), scan this QR code, and enter the amount ₹${totalAmount.toFixed(2)} when prompted.`
                  : `Open your UPI app (Google Pay, PhonePe, Paytm, etc.) and scan this QR code. The amount ₹${totalAmount.toFixed(2)} is already set.`}
              </Text>
              <TouchableOpacity
                style={[styles.shareButton, {borderColor: theme.primary}]}
                onPress={handleShareQRCode}>
                <Icon name="share-outline" size={20} color={theme.primary} />
                <Text style={[styles.shareButtonText, {color: theme.primary}]}>
                  Share QR Code
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.qrContainer}>
              <Text style={[styles.errorText, {color: theme.error}]}>
                Failed to generate QR code
              </Text>
              <TouchableOpacity
                style={[styles.retryButton, {backgroundColor: theme.primary}]}
                onPress={generateQRCode}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Razorpay Checkout Button */}
      {paymentMethod === 'razorpay_checkout' && (
        <TouchableOpacity
          style={[
            styles.payButton,
            {backgroundColor: theme.primary},
            processing && styles.buttonDisabled,
          ]}
          onPress={handleRazorpayPayment}
          disabled={processing}>
          {processing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="card" size={20} color="#fff" />
              <Text style={styles.payButtonText}>
                Pay ₹{totalAmount.toFixed(2)} with Razorpay
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* COD Button */}
      {paymentMethod === 'cod' && (
        <View
          style={[
            styles.section,
            {backgroundColor: theme.card},
            commonStyles.shadowSmall,
          ]}>
          <View style={styles.codInfo}>
            <Icon name="information-circle-outline" size={24} color={theme.primary} />
            <Text style={[styles.codInfoText, {color: theme.textSecondary}]}>
              You will pay ₹{totalAmount.toFixed(2)} (Consultation Fee: ₹{consultationFee} + GST: ₹{gstAmount.toFixed(2)}) in cash when you meet the doctor at the consultation.
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.payButton,
              {backgroundColor: theme.primary},
              processing && styles.buttonDisabled,
            ]}
            onPress={handleCODPayment}
            disabled={processing}>
            {processing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="cash" size={20} color="#fff" />
                <Text style={styles.payButtonText}>
                  Confirm Cash after Appointment
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Cancel Button */}
      <TouchableOpacity
        style={[styles.cancelButton, {borderColor: theme.border}]}
        onPress={() => {
          if (onPaymentCancel) {
            onPaymentCancel();
          }
          navigation.goBack();
        }}>
        <Text style={[styles.cancelButtonText, {color: theme.textSecondary}]}>
          Cancel Payment
        </Text>
      </TouchableOpacity>

      {/* COD Confirmation Modal */}
      <CODConfirmationModal
        visible={showCODModal}
        onConfirm={handleCODConfirm}
        onCancel={handleCODCancel}
        totalAmount={totalAmount}
        consultationFee={consultationFee}
        gstAmount={gstAmount}
        doctorName={doctorName}
      />

      {/* Success Modal for COD */}
      <SuccessModal
        visible={showSuccessModal}
        title="Booking Confirmed!"
        message={`Your consultation is booked with Cash after Appointment. Please pay the amount when you meet Dr. ${doctorName}.`}
        amount={{
          total: totalAmount,
          fee: consultationFee,
          gst: gstAmount,
        }}
        icon="checkmark-circle"
        iconColor={theme.primary}
        buttonText="Got it!"
        onClose={handleSuccessModalClose}
      />

      {/* Payment Success Modal for Razorpay/UPI Payments */}
      <PaymentSuccessModal
        visible={showPaymentSuccessModal}
        onViewConsultations={() => {
          setShowPaymentSuccessModal(false);
          if (onPaymentSuccess) {
            onPaymentSuccess();
          }
          navigation.navigate('Main', {screen: 'ConsultationsHistory'});
        }}
        onClose={() => {
          setShowPaymentSuccessModal(false);
          if (onPaymentSuccess) {
            onPaymentSuccess();
          }
          navigation.goBack();
        }}
        consultationDetails={{
          doctorName,
          consultationId,
        }}
      />

      {/* Payment Failed Modal */}
      <PaymentFailedModal
        visible={showFailedModal}
        onRetry={() => {
          setShowFailedModal(false);
          // Retry based on current payment method
          if (paymentMethod === 'razorpay_checkout') {
            handleRazorpayPayment();
          } else if (paymentMethod === 'upi_qr') {
            generateQRCode();
          }
        }}
        onClose={() => setShowFailedModal(false)}
        errorMessage={paymentError}
        consultationDetails={{
          doctorName,
          amount: totalAmount,
          consultationId,
        }}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 12,
  },
  priceBreakdown: {
    width: '100%',
    marginTop: 8,
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  totalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  priceLabel: {
    fontSize: 14,
  },
  priceValue: {
    fontSize: 14,
  },
  totalLabel: {
    fontSize: 16,
  },
  totalValue: {
    fontSize: 18,
  },
  descriptionText: {
    fontSize: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  doctorText: {
    fontSize: 14,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  methodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  methodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  methodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
  },
  qrContainer: {
    alignItems: 'center',
    padding: 20,
  },
  qrCodeWrapper: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrCodeImage: {
    width: 250,
    height: 250,
  },
  qrInstructions: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  errorText: {
    fontSize: 14,
    marginBottom: 12,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
  },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  payButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  payButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  cancelButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  codInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.1)',
    marginBottom: 16,
  },
  codInfoText: {
    flex: 1,
    fontSize: 14,
    marginLeft: 12,
    lineHeight: 20,
  },
  amountWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 12,
  },
  amountWarningText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  amountInfoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 12,
    marginBottom: 12,
  },
  amountInfoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});

export default PaymentScreen;

