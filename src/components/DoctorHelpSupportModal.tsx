import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';

interface DoctorHelpSupportModalProps {
  visible: boolean;
  onClose: () => void;
}

const DoctorHelpSupportModal: React.FC<DoctorHelpSupportModalProps> = ({
  visible,
  onClose,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const supportEmail = 'support@sa-privatelimited.com';

  const handleSendEmail = async () => {
    try {
      const subject = 'HomeServices Doctor Support Request';
      const mailtoUrl = `mailto:${supportEmail}?subject=${encodeURIComponent(subject)}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        onClose();
      } else {
        Alert.alert(
          'Email App Not Found',
          `Please send your support request to:\n${supportEmail}`,
          [{text: 'OK'}]
        );
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Could not open email client. Please email us at:\n${supportEmail}`,
        [{text: 'OK'}]
      );
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
          {/* Icon */}
          <View style={[styles.iconContainer, {backgroundColor: theme.primary + '20'}]}>
            <Icon name="help-circle" size={60} color={theme.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, {color: theme.text}]}>
            Help & Support
          </Text>

          {/* Description */}
          <Text style={[styles.description, {color: theme.textSecondary}]}>
            Need assistance with your doctor profile, appointments, or consultations? Our support team is here to help you.
          </Text>

          {/* Email Info */}
          <View style={[styles.emailContainer, {backgroundColor: theme.background}]}>
            <Icon name="mail" size={20} color={theme.primary} />
            <Text style={[styles.emailText, {color: theme.text}]}>
              {supportEmail}
            </Text>
          </View>

          {/* Support Topics */}
          <View style={styles.topicsList}>
            <Text style={[styles.topicsTitle, {color: theme.textSecondary}]}>
              We can help with:
            </Text>
            <View style={styles.topicItem}>
              <Icon name="checkmark-circle" size={18} color="#34C759" />
              <Text style={[styles.topicText, {color: theme.text}]}>
                Profile setup & approval issues
              </Text>
            </View>
            <View style={styles.topicItem}>
              <Icon name="checkmark-circle" size={18} color="#34C759" />
              <Text style={[styles.topicText, {color: theme.text}]}>
                Managing appointments & availability
              </Text>
            </View>
            <View style={styles.topicItem}>
              <Icon name="checkmark-circle" size={18} color="#34C759" />
              <Text style={[styles.topicText, {color: theme.text}]}>
                Technical support & account questions
              </Text>
            </View>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.emailButton, {backgroundColor: theme.primary}]}
            onPress={handleSendEmail}
            activeOpacity={0.8}>
            <Icon name="mail-outline" size={20} color="#fff" />
            <Text style={styles.emailButtonText}>Send Email</Text>
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
    maxWidth: 400,
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    ...commonStyles.shadowMedium,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
    width: '100%',
  },
  emailText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 10,
  },
  topicsList: {
    width: '100%',
    marginBottom: 24,
  },
  topicsTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
    ...commonStyles.shadowSmall,
  },
  emailButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default DoctorHelpSupportModal;
