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

interface ConfirmationModalProps {
  visible: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info' | 'success';
  icon?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  visible,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'info',
  icon,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const getIconConfig = () => {
    if (icon) {
      return {name: icon, color: theme.primary};
    }

    switch (type) {
      case 'danger':
        return {name: 'alert-circle', color: '#FF3B30'};
      case 'warning':
        return {name: 'warning', color: '#FF9500'};
      case 'success':
        return {name: 'checkmark-circle', color: '#34C759'};
      case 'info':
      default:
        return {name: 'information-circle', color: theme.primary};
    }
  };

  const getButtonColors = () => {
    switch (type) {
      case 'danger':
        return {
          confirmBg: '#FF3B30',
          confirmText: '#FFFFFF',
          cancelBorder: theme.border,
          cancelText: theme.text,
        };
      case 'warning':
        return {
          confirmBg: '#FF9500',
          confirmText: '#FFFFFF',
          cancelBorder: theme.border,
          cancelText: theme.text,
        };
      case 'success':
        return {
          confirmBg: '#34C759',
          confirmText: '#FFFFFF',
          cancelBorder: theme.border,
          cancelText: theme.text,
        };
      case 'info':
      default:
        return {
          confirmBg: theme.primary,
          confirmText: '#FFFFFF',
          cancelBorder: theme.border,
          cancelText: theme.text,
        };
    }
  };

  const iconConfig = getIconConfig();
  const buttonColors = getButtonColors();
  const iconBgColor = iconConfig.color + '15';

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
                {backgroundColor: iconBgColor},
              ]}>
              <Icon
                name={iconConfig.name}
                size={32}
                color={iconConfig.color}
              />
            </View>
            <Text style={[styles.headerTitle, {color: theme.text}]}>
              {title}
            </Text>
          </View>

          {/* Message */}
          <View style={styles.contentContainer}>
            <Text style={[styles.messageText, {color: theme.textSecondary}]}>
              {message}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.cancelButton,
                {
                  borderColor: buttonColors.cancelBorder,
                  backgroundColor: theme.background,
                },
              ]}
              onPress={onCancel}
              activeOpacity={0.7}>
              <Text
                style={[
                  styles.cancelButtonText,
                  {color: buttonColors.cancelText},
                ]}>
                {cancelText.toUpperCase()}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                {
                  backgroundColor: buttonColors.confirmBg,
                },
              ]}
              onPress={onConfirm}
              activeOpacity={0.8}>
              <Text
                style={[
                  styles.confirmButtonText,
                  {color: buttonColors.confirmText},
                ]}>
                {confirmText.toUpperCase()}
              </Text>
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
    fontSize: 22,
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
    lineHeight: 22,
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
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
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
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default ConfirmationModal;

