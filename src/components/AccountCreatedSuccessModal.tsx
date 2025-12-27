import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';

interface AccountCreatedSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  userName?: string;
  userEmail?: string;
}

const AccountCreatedSuccessModal: React.FC<AccountCreatedSuccessModalProps> = ({
  visible,
  onClose,
  userName,
  userEmail,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const primaryColor = '#10B981'; // Green for success

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
          {/* Success Icon */}
          <View style={[styles.iconContainer, {backgroundColor: primaryColor + '20'}]}>
            <Icon name="checkmark-circle" size={64} color={primaryColor} />
          </View>

          {/* Header */}
          <Text style={[styles.header, {color: theme.text}]}>
            Account Created!
          </Text>

          {/* Success Message */}
          <Text style={[styles.message, {color: theme.textSecondary}]}>
            Your account has been created successfully. You can now proceed to select your role.
          </Text>

          {/* Account Details */}
          <View style={[styles.detailsContainer, {backgroundColor: theme.background}]}>
            {userName && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <Icon name="person-outline" size={18} color={theme.primary} style={styles.detailIcon} />
                  <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                    Name
                  </Text>
                </View>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {userName}
                </Text>
              </View>
            )}
            
            {userEmail && (
              <View style={styles.detailRow}>
                <View style={styles.detailLabelContainer}>
                  <Icon name="mail-outline" size={18} color={theme.primary} style={styles.detailIcon} />
                  <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                    Email
                  </Text>
                </View>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {userEmail}
                </Text>
              </View>
            )}
          </View>

          {/* Info Note */}
          <View style={[styles.infoContainer, {backgroundColor: theme.primary + '10', borderLeftColor: theme.primary}]}>
            <Icon name="information-circle-outline" size={20} color={theme.primary} />
            <Text style={[styles.infoText, {color: theme.textSecondary}]}>
              Please select your role to continue
            </Text>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.button, {backgroundColor: primaryColor}]}
            onPress={onClose}
            activeOpacity={0.8}>
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  detailsContainer: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderLeftWidth: 3,
  },
  infoText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  button: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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

export default AccountCreatedSuccessModal;

