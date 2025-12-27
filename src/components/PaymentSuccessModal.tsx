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

interface PaymentSuccessModalProps {
  visible: boolean;
  onViewConsultations: () => void;
  onClose: () => void;
  consultationDetails?: {
    doctorName: string;
    scheduledTime?: Date | string;
    consultationId?: string;
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
          <Icon name={icon} size={18} color={iconColor || theme.primary} style={styles.labelIcon} />
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

const PaymentSuccessModal: React.FC<PaymentSuccessModalProps> = ({
  visible,
  onViewConsultations,
  onClose,
  consultationDetails,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const primaryColor = '#10B981'; // Green for success

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
          {/* Success Header with Green Tick Icon */}
          <View style={[styles.header, {backgroundColor: primaryColor + '15'}]}>
            <View style={[styles.iconWrapper, {backgroundColor: primaryColor}]}>
              <Icon name="checkmark" size={56} color="#FFFFFF" />
            </View>
            <Text style={[styles.headerTitle, {color: theme.text}]}>
              Payment Successful!
            </Text>
            <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
              Your consultation has been booked successfully
            </Text>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}>
            
            {/* Success Badge */}
            <View style={[styles.successBadge, {backgroundColor: primaryColor + '20', borderColor: primaryColor + '40'}]}>
              <Icon name="checkmark-circle" size={24} color={primaryColor} />
              <Text style={[styles.successBadgeText, {color: primaryColor}]}>
                Consultation Confirmed
              </Text>
            </View>

            {/* Booking Details Section */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <View style={styles.sectionHeader}>
                <Icon name="calendar-outline" size={20} color={primaryColor} />
                <Text style={[styles.sectionTitle, {color: theme.text}]}>
                  Booking Details
                </Text>
              </View>
              
              <View style={styles.infoContainer}>
                {consultationDetails?.doctorName && (
                  <InfoRow
                    label="Doctor"
                    value={
                      <View style={styles.valueWithIcon}>
                        <Icon name="medical" size={16} color={primaryColor} />
                        <Text style={[styles.infoValue, {color: theme.text, marginLeft: 6}]}>
                          Dr. {consultationDetails.doctorName}
                        </Text>
                      </View>
                    }
                    theme={theme}
                    icon="person-outline"
                    iconColor={primaryColor}
                  />
                )}
                
                {consultationDetails?.scheduledTime && (
                  <InfoRow
                    label="Scheduled Time"
                    value={
                      <View style={styles.valueWithIcon}>
                        <Icon name="time-outline" size={16} color={primaryColor} />
                        <Text style={[styles.infoValue, {color: theme.text, marginLeft: 6}]}>
                          {formatScheduledTime(consultationDetails.scheduledTime)}
                        </Text>
                      </View>
                    }
                    theme={theme}
                    icon="calendar-outline"
                    iconColor={primaryColor}
                  />
                )}

                {consultationDetails?.consultationId && (
                  <InfoRow
                    label="Booking ID"
                    value={
                      <View style={styles.valueWithIcon}>
                        <Icon name="receipt-outline" size={16} color={primaryColor} />
                        <Text style={[styles.infoValue, {color: theme.textSecondary, marginLeft: 6, fontFamily: 'monospace'}]}>
                          {consultationDetails.consultationId.substring(0, 12)}...
                        </Text>
                      </View>
                    }
                    theme={theme}
                    icon="barcode-outline"
                    iconColor={primaryColor}
                  />
                )}
              </View>
            </View>

            {/* Reminder Section */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <View style={styles.sectionHeader}>
                <Icon name="notifications-outline" size={20} color={primaryColor} />
                <Text style={[styles.sectionTitle, {color: theme.text}]}>
                  Reminders
                </Text>
              </View>
              
              <View style={styles.infoContainer}>
                <View style={[styles.reminderCard, {backgroundColor: primaryColor + '10', borderColor: primaryColor + '30'}]}>
                  <Icon name="alarm-outline" size={20} color={primaryColor} />
                  <View style={styles.reminderTextContainer}>
                    <Text style={[styles.reminderTitle, {color: theme.text}]}>
                      Appointment Reminder
                    </Text>
                    <Text style={[styles.reminderText, {color: theme.textSecondary}]}>
                      You will receive a reminder 1 hour before your appointment time
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Important Note */}
            <View style={[styles.noteContainer, {backgroundColor: primaryColor + '10', borderColor: primaryColor + '30'}]}>
              <Icon name="information-circle" size={20} color={primaryColor} />
              <Text style={[styles.noteText, {color: theme.text}]}>
                Please be available on time for your consultation. You can view all your consultations in the Consultations tab.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.viewButton, {backgroundColor: primaryColor}]}
              onPress={onViewConsultations}
              activeOpacity={0.8}>
              <Icon name="list" size={20} color="#FFFFFF" />
              <Text style={styles.viewButtonText}>View Consultations</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.closeButton, {borderColor: theme.border}]}
              onPress={onClose}
              activeOpacity={0.7}>
              <Text style={[styles.closeButtonText, {color: theme.textSecondary}]}>
                OK
              </Text>
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
    shadowColor: '#10B981',
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
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  successBadgeText: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
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
  valueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  reminderCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  reminderTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  reminderText: {
    fontSize: 13,
    lineHeight: 18,
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
  viewButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#10B981',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  viewButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PaymentSuccessModal;

