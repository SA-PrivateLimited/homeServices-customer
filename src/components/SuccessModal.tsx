import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

interface SuccessModalProps {
  visible: boolean;
  title: string;
  message: string;
  amount?: {
    total: number;
    fee: number;
    gst: number;
  };
  icon?: string;
  iconColor?: string;
  buttonText?: string;
  onClose: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({
  visible,
  title,
  message,
  amount,
  icon = 'checkmark-circle',
  iconColor,
  buttonText = 'OK',
  onClose,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const defaultIconColor = iconColor || theme.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, {backgroundColor: theme.card}]}>
          {/* Success Icon */}
          <View style={[styles.iconContainer, {backgroundColor: defaultIconColor + '15'}]}>
            <Icon name={icon} size={64} color={defaultIconColor} />
          </View>

          {/* Title */}
          <Text style={[styles.title, {color: theme.text}]}>{title}</Text>

          {/* Message */}
          <Text style={[styles.message, {color: theme.textSecondary}]}>{message}</Text>

          {/* Amount Breakdown */}
          {amount && (
            <View style={[styles.amountCard, {backgroundColor: theme.background}]}>
              <View style={styles.amountRow}>
                <Text style={[styles.amountLabel, {color: theme.textSecondary}]}>
                  Consultation Fee:
                </Text>
                <Text style={[styles.amountValue, {color: theme.text}]}>
                  ₹{amount.fee.toFixed(2)}
                </Text>
              </View>
              <View style={styles.amountRow}>
                <Text style={[styles.amountLabel, {color: theme.textSecondary}]}>
                  GST (2%):
                </Text>
                <Text style={[styles.amountValue, {color: theme.text}]}>
                  ₹{amount.gst.toFixed(2)}
                </Text>
              </View>
              <View style={[styles.divider, {backgroundColor: theme.border}]} />
              <View style={styles.amountRow}>
                <Text style={[styles.totalLabel, {color: theme.text}]}>
                  Total Amount:
                </Text>
                <Text style={[styles.totalValue, {color: defaultIconColor}]}>
                  ₹{amount.total.toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.button, {backgroundColor: defaultIconColor}]}
            onPress={onClose}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  amountCard: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
  },
  amountValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SuccessModal;

