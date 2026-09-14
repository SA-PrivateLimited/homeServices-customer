import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
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
  buttonText = 'Done',
  onClose,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const accent = iconColor || theme.success || theme.primary;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, {backgroundColor: theme.card}]}>
          <View style={[styles.iconContainer, {backgroundColor: `${accent}18`}]}>
            <Icon name={icon} size={28} color={accent} />
          </View>

          <Text style={[styles.title, {color: theme.text}]}>{title}</Text>

          {message ? (
            <Text style={[styles.message, {color: theme.textSecondary}]}>
              {message}
            </Text>
          ) : null}

          {amount ? (
            <View
              style={[styles.amountCard, {backgroundColor: theme.background}]}>
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
                <Text style={[styles.totalValue, {color: accent}]}>
                  ₹{amount.total.toFixed(2)}
                </Text>
              </View>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.button, {backgroundColor: accent}]}
            onPress={onClose}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={buttonText}>
            <Text style={styles.buttonText}>{buttonText}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const {width} = Dimensions.get('window');
const modalWidth = Math.min(width * 0.86, 360);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContainer: {
    width: modalWidth,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 10,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
    lineHeight: 24,
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  amountCard: {
    width: '100%',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 13,
  },
  amountValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    marginVertical: 6,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  button: {
    width: '100%',
    minHeight: 44,
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default SuccessModal;
