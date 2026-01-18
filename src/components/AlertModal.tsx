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
import useTranslation from '../hooks/useTranslation';

interface AlertModalProps {
  visible: boolean;
  title: string;
  message: string;
  buttonText?: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'info' | 'warning';
  icon?: string;
}

const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  buttonText,
  onClose,
  type = 'info',
  icon,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  
  const defaultButtonText = buttonText || t('common.ok');

  const getIconConfig = () => {
    if (icon) {
      return {name: icon, color: theme.primary};
    }

    switch (type) {
      case 'error':
        return {name: 'close-circle', color: '#FF3B30'};
      case 'warning':
        return {name: 'warning', color: '#FF9500'};
      case 'success':
        return {name: 'checkmark-circle', color: '#34C759'};
      case 'info':
      default:
        return {name: 'information-circle', color: theme.primary};
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case 'error':
        return '#FF3B30';
      case 'warning':
        return '#FF9500';
      case 'success':
        return '#34C759';
      case 'info':
      default:
        return theme.primary;
    }
  };

  const iconConfig = getIconConfig();
  const buttonColor = getButtonColor();
  const iconBgColor = iconConfig.color + '15';

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}>
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
                size={40}
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

          {/* Action Button */}
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: buttonColor,
              },
            ]}
            onPress={onClose}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>{defaultButtonText.toUpperCase()}</Text>
          </TouchableOpacity>
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
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
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
  button: {
    width: '100%',
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

export default AlertModal;

