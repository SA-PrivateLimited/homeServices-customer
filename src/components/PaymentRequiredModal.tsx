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

interface PaymentRequiredModalProps {
  visible: boolean;
  onViewConsultations: () => void;
  onClose: () => void;
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
          <Icon name={icon} size={18} color={iconColor || theme.warning} style={styles.labelIcon} />
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

const PaymentRequiredModal: React.FC<PaymentRequiredModalProps> = ({
  visible,
  onViewConsultations,
  onClose,
  consultationDetails,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const warningColor = theme.warning || '#F6AD55'; // Orange/amber for warning

  // Format scheduled time if available
  const formatScheduledTime = (time?: Date | string) => {
    if (!time) return 'Not specified';
    
    try {
      let date: Date;
      if (time instanceof Date) {
        date = time;
      } else if (typeof time === 'string') {
        date = new Date(time);
      } else {
        return 'Not specified';
      }

      if (isNaN(date.getTime())) {
        return 'Not specified';
      }

      return date.toLocaleString('en-IN', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Not specified';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, {backgroundColor: theme.card}]}>
          {/* Header with Warning Icon */}
          <View style={[styles.header, {backgroundColor: warningColor + '15'}]}>
            <View style={[styles.iconWrapper, {backgroundColor: warningColor}]}>
              <Icon name="alert-circle" size={56} color="#FFFFFF" />
            </View>
            <Text style={[styles.headerTitle, {color: theme.text}]}>
              Payment Required
            </Text>
            <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
              Complete payment to confirm your booking
            </Text>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}>
            
            {/* Status Badge */}
            <View style={[styles.statusBadge, {backgroundColor: warningColor + '20', borderColor: warningColor + '40'}]}>
              <Icon name="time-outline" size={24} color={warningColor} />
              <Text style={[styles.statusBadgeText, {color: warningColor}]}>
                Booking Pending Payment
              </Text>
            </View>

            {/* Information Message */}
            <View style={[styles.messageCard, {backgroundColor: theme.background}]}>
              <View style={styles.messageIconContainer}>
                <Icon name="information-circle" size={28} color={warningColor} />
              </View>
              <Text style={[styles.messageText, {color: theme.text}]}>
                Your consultation booking has been saved but is pending payment. Please complete the payment to confirm your appointment.
              </Text>
            </View>

            {/* Booking Details Section */}
            {consultationDetails && (
              <View style={[styles.section, {backgroundColor: theme.background}]}>
                <View style={styles.sectionHeader}>
                  <Icon name="calendar-outline" size={20} color={warningColor} />
                  <Text style={[styles.sectionTitle, {color: theme.text}]}>
                    Booking Details
                  </Text>
                </View>
                
                <View style={styles.infoContainer}>
                  {consultationDetails.doctorName && (
                    <InfoRow
                      label="Doctor"
                      value={
                        <View style={styles.valueWithIcon}>
                          <Icon name="medical" size={16} color={warningColor} />
                          <Text style={[styles.infoValue, {color: theme.text, marginLeft: 6}]}>
                            Dr. {consultationDetails.doctorName}
                          </Text>
                        </View>
                      }
                      theme={theme}
                      icon="person-outline"
                      iconColor={warningColor}
                    />
                  )}
                  
                  {consultationDetails.scheduledTime && (
                    <InfoRow
                      label="Scheduled Time"
                      value={
                        <View style={styles.valueWithIcon}>
                          <Icon name="time-outline" size={16} color={warningColor} />
                          <Text style={[styles.infoValue, {color: theme.text, marginLeft: 6}]}>
                            {formatScheduledTime(consultationDetails.scheduledTime)}
                          </Text>
                        </View>
                      }
                      theme={theme}
                      icon="calendar-outline"
                      iconColor={warningColor}
                    />
                  )}

                  {consultationDetails.amount && (
                    <InfoRow
                      label="Amount"
                      value={
                        <View style={styles.valueWithIcon}>
                          <Icon name="cash-outline" size={16} color={warningColor} />
                          <Text style={[styles.amountValue, {color: warningColor, marginLeft: 6}]}>
                            ₹{consultationDetails.amount.toFixed(2)}
                          </Text>
                        </View>
                      }
                      theme={theme}
                      icon="wallet-outline"
                      iconColor={warningColor}
                    />
                  )}
                </View>
              </View>
            )}

            {/* Important Note */}
            <View style={[styles.noteContainer, {backgroundColor: warningColor + '10', borderColor: warningColor + '30'}]}>
              <Icon name="alert-circle-outline" size={20} color={warningColor} />
              <Text style={[styles.noteText, {color: theme.text}]}>
                Your booking will remain pending until payment is completed. You can view all your consultations in the Consultations tab.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, {borderColor: theme.border}]}
              onPress={onViewConsultations}
              activeOpacity={0.7}>
              <Icon name="close-circle-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.cancelButtonText, {color: theme.textSecondary}]}>
                Cancel & Go to Consultations
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.stayButton, {backgroundColor: warningColor}]}
              onPress={onClose}
              activeOpacity={0.8}>
              <Icon name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.stayButtonText}>Stay Here</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '90%',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#F6AD55',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    maxHeight: 400,
  },
  contentContainer: {
    padding: 20,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  statusBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  messageCard: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  messageIconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  messageText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoContainer: {
    marginTop: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    minHeight: 44,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  labelIcon: {
    marginRight: 6,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  infoValueContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'right',
  },
  valueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  noteContainer: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    paddingTop: 12,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  cancelButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  stayButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#F6AD55',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  stayButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default PaymentRequiredModal;

