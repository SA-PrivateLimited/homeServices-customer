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

interface CODConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  totalAmount: number;
  consultationFee: number;
  gstAmount: number;
  doctorName: string;
}

interface InfoRowProps {
  label: string;
  value: string | React.ReactNode;
  theme: any;
  isTotal?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({label, value, theme, isTotal = false}) => {
  return (
    <View style={[styles.infoRow, isTotal && styles.totalRow]}>
      <Text style={[styles.infoLabel, {color: theme.textSecondary}, isTotal && styles.totalLabel]}>
        {label}
      </Text>
      <View style={styles.infoValueContainer}>
        {typeof value === 'string' ? (
          <Text style={[styles.infoValue, {color: theme.text}, isTotal && styles.totalValue]}>
            {value}
          </Text>
        ) : (
          value
        )}
      </View>
    </View>
  );
};

const CODConfirmationModal: React.FC<CODConfirmationModalProps> = ({
  visible,
  onConfirm,
  onCancel,
  totalAmount,
  consultationFee,
  gstAmount,
  doctorName,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const primaryColor = theme.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, {backgroundColor: theme.card}]}>
          {/* Header with Green Tick Icon */}
          <View style={[styles.header, {backgroundColor: primaryColor + '15'}]}>
            <View style={[styles.iconWrapper, {backgroundColor: primaryColor}]}>
              <Icon name="checkmark" size={48} color="#FFFFFF" />
            </View>
            <Text style={[styles.headerTitle, {color: theme.text}]}>
              Confirm Cash after Appointment
            </Text>
            <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
              Review payment details before confirming
            </Text>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}>
            
            {/* Payment Details Section */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <View style={styles.sectionHeader}>
                <Icon name="receipt-outline" size={20} color={primaryColor} />
                <Text style={[styles.sectionTitle, {color: theme.text}]}>
                  Payment Details
                </Text>
              </View>
              
              <View style={styles.infoContainer}>
                <InfoRow
                  label="Consultation Fee"
                  value={`₹${consultationFee.toFixed(2)}`}
                  theme={theme}
                />
                <InfoRow
                  label="GST (2%)"
                  value={`₹${gstAmount.toFixed(2)}`}
                  theme={theme}
                />
                <View style={[styles.divider, {backgroundColor: theme.border}]} />
                <InfoRow
                  label="Total Amount"
                  value={
                    <View style={styles.totalAmountContainer}>
                      <Text style={[styles.totalAmountText, {color: primaryColor}]}>
                        ₹{totalAmount.toFixed(2)}
                      </Text>
                    </View>
                  }
                  theme={theme}
                  isTotal={true}
                />
              </View>
            </View>

            {/* Payment Method Section */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <View style={styles.sectionHeader}>
                <Icon name="cash-outline" size={20} color={primaryColor} />
                <Text style={[styles.sectionTitle, {color: theme.text}]}>
                  Payment Method
                </Text>
              </View>
              
              <View style={styles.infoContainer}>
                <InfoRow
                  label="Method"
                  value={
                    <View style={styles.methodBadge}>
                      <Icon name="cash" size={16} color="#FFFFFF" />
                      <Text style={styles.methodBadgeText}>Cash after Appointment</Text>
                    </View>
                  }
                  theme={theme}
                />
                <InfoRow
                  label="Payment Time"
                  value={
                    <View style={styles.valueWithIcon}>
                      <Icon name="time-outline" size={16} color={primaryColor} />
                      <Text style={[styles.infoValue, {color: theme.text, marginLeft: 6}]}>
                        After the appointment
                      </Text>
                    </View>
                  }
                  theme={theme}
                />
              </View>
            </View>

            {/* Doctor Information */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <View style={styles.sectionHeader}>
                <Icon name="medical-outline" size={20} color={primaryColor} />
                <Text style={[styles.sectionTitle, {color: theme.text}]}>
                  Doctor Information
                </Text>
              </View>
              
              <View style={styles.infoContainer}>
                <InfoRow
                  label="Doctor Name"
                  value={
                    <View style={styles.valueWithIcon}>
                      <Icon name="person-outline" size={16} color={primaryColor} />
                      <Text style={[styles.infoValue, {color: theme.text, marginLeft: 6}]}>
                        Dr. {doctorName}
                      </Text>
                    </View>
                  }
                  theme={theme}
                />
              </View>
            </View>

            {/* Important Note */}
            <View style={[styles.noteContainer, {backgroundColor: primaryColor + '10', borderColor: primaryColor + '30'}]}>
              <Icon name="information-circle" size={20} color={primaryColor} />
              <Text style={[styles.noteText, {color: theme.text}]}>
                Please ensure you have the exact amount ready after the appointment for payment.
              </Text>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.cancelButton, {borderColor: theme.border}]}
              onPress={onCancel}
              activeOpacity={0.7}>
              <Text style={[styles.cancelButtonText, {color: theme.textSecondary}]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.confirmButton, {backgroundColor: primaryColor}]}
              onPress={onConfirm}
              activeOpacity={0.8}>
              <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Confirm</Text>
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
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 22,
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
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
  },
  totalRow: {
    marginTop: 4,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
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
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalAmountContainer: {
    alignItems: 'flex-end',
  },
  totalAmountText: {
    fontSize: 22,
    fontWeight: '700',
  },
  valueWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  methodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  methodBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
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
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default CODConfirmationModal;

