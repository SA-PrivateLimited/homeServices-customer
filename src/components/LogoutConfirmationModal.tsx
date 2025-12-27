import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

interface LogoutConfirmationModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  visible,
  onConfirm,
  onCancel,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: theme.card,
              shadowColor: isDarkMode ? '#000' : '#000',
            },
          ]}>
          {/* Header with Icon */}
          <View style={styles.headerContainer}>
            <View
              style={[
                styles.iconContainer,
                {backgroundColor: theme.error + '15'},
              ]}>
              <Icon
                name="log-out-outline"
                size={32}
                color={theme.error}
              />
            </View>
            <Text style={[styles.headerTitle, {color: theme.text}]}>
              Logout
            </Text>
          </View>

          {/* Message */}
          <View style={styles.contentContainer}>
            <Text style={[styles.messageText, {color: theme.textSecondary}]}>
              Are you sure you want to logout?
            </Text>
            <Text
              style={[
                styles.subMessageText,
                {color: theme.textSecondary},
              ]}>
              You'll need to sign in again to access your account.
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  backgroundColor: theme.background,
                  borderColor: theme.border,
                },
              ]}
              onPress={onCancel}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.cancelButtonText,
                  {color: theme.text},
                ]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                {backgroundColor: theme.error},
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}>
              <Text style={styles.confirmButtonText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const {width} = Dimensions.get('window');
const modalWidth = width * 0.85;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: modalWidth,
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    elevation: 10,
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  contentContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 22,
  },
  subMessageText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
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
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  confirmButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default LogoutConfirmationModal;

