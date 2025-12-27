import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

interface PaymentFailedModalProps {
  visible: boolean;
  onRetry: () => void;
  onClose: () => void;
  errorMessage?: string;
  consultationDetails?: {
    doctorName?: string;
    scheduledTime?: Date | string;
    consultationId?: string;
    amount?: number;
  };
}

interface InfoRowProps {
  label: string;
  value: string | React.ReactNode;
  theme: any;
  icon?: string;
  iconColor?: string;
}

const InfoRow: React.FC<InfoRowProps> = ({label, value, theme, icon, iconColor}) => {
  return (
    <View style={styles.infoRow}>
      <View style={styles.labelContainer}>
        {icon && (
          <Icon name={icon} size={18} color={iconColor || theme.error} style={styles.labelIcon} />
        )}
        <Text style={[styles.infoLabel, {color: theme.textSecondary}]}>
          {label}
        </Text>
      </View>
      <View style={styles.infoValueContainer}>
        {typeof value === 'string' ? (
          <Text style={[styles.infoValue, {color: theme.text}]}>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
};

const PaymentFailedModal: React.FC<PaymentFailedModalProps> = ({
  visible,
  onRetry,
  onClose,
  errorMessage = 'Payment authentication failed. Please try again or use a different payment method.',
  consultationDetails,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const errorColor = '#EF4444'; // Red color for errors
  const warningColor = '#F59E0B'; // Amber color

  const formatTime = (time: Date | string | undefined) => {
    if (!time) return 'N/A';
    const date = time instanceof Date ? time : new Date(time);
    return date.toLocaleString('en-IN', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, {backgroundColor: theme.background}]}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}>
            {/* Header with Error Icon */}
            <View style={styles.headerContainer}>
              <View style={[styles.iconContainer, {backgroundColor: errorColor + '15'}]}>
                <View style={[styles.iconCircle, {backgroundColor: errorColor}]}>
                  <Icon name="close-circle" size={48} color="#FFFFFF" />
                </View>
              </View>
              <Text style={[styles.headerTitle, {color: theme.text}]}>
                Payment Failed
              </Text>
              <View style={[styles.statusBadge, {backgroundColor: errorColor + '20'}]}>
                <Text style={[styles.statusBadgeText, {color: errorColor}]}>
                  Failed
                </Text>
              </View>
            </View>

            {/* Error Message */}
            <View style={styles.messageContainer}>
              <Text style={[styles.messageText, {color: theme.text}]}>
                {errorMessage}
              </Text>
            </View>

            {/* Consultation Details */}
            {consultationDetails && (
              <View style={styles.detailsContainer}>
                <Text style={[styles.detailsTitle, {color: theme.text}]}>
                  Booking Details
                </Text>
                <View style={[styles.detailsBox, {backgroundColor: theme.card, borderColor: theme.border}]}>
                  {consultationDetails.doctorName && (
                    <InfoRow
                      label="Doctor"
                      value={consultationDetails.doctorName}
                      theme={theme}
                      icon="person-outline"
                      iconColor={theme.primary}
                    />
                  )}
                  {consultationDetails.scheduledTime && (
                    <InfoRow
                      label="Scheduled Time"
                      value={formatTime(consultationDetails.scheduledTime)}
                      theme={theme}
                      icon="time-outline"
                      iconColor={theme.primary}
                    />
                  )}
                  {consultationDetails.amount && (
                    <InfoRow
                      label="Amount"
                      value={`₹${consultationDetails.amount.toFixed(2)}`}
                      theme={theme}
                      icon="cash-outline"
                      iconColor={theme.primary}
                    />
                  )}
                  {consultationDetails.consultationId && (
                    <InfoRow
                      label="Booking ID"
                      value={consultationDetails.consultationId.substring(0, 8) + '...'}
                      theme={theme}
                      icon="receipt-outline"
                      iconColor={theme.primary}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Important Note */}
            <View style={[styles.noteContainer, {backgroundColor: warningColor + '15', borderColor: warningColor + '40'}]}>
              <Icon name="information-circle" size={20} color={warningColor} style={styles.noteIcon} />
              <Text style={[styles.noteText, {color: theme.text}]}>
                Don't worry! Your booking is safe. You can retry the payment or choose a different payment method.
              </Text>
            </View>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.retryButton, {backgroundColor: theme.primary}]}
                onPress={onRetry}
                activeOpacity={0.8}>
                <Icon name="refresh" size={20} color="#FFFFFF" style={styles.buttonIcon} />
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.closeButton, {borderColor: theme.border}]}
                onPress={onClose}
                activeOpacity={0.7}>
                <Text style={[styles.closeButtonText, {color: theme.textSecondary}]}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '90%',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  scrollContent: {
    padding: 24,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    marginBottom: 16,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 4,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  messageContainer: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  detailsBox: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  labelIcon: {
    marginRight: 8,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  infoValueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  noteContainer: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
  },
  noteIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  buttonContainer: {
    gap: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  buttonIcon: {
    marginRight: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '500',
  },
});

export default PaymentFailedModal;

