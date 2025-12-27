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

interface PincodeSuccessModalProps {
  visible: boolean;
  onClose: () => void;
  pincode?: string;
  address?: string;
}

const PincodeSuccessModal: React.FC<PincodeSuccessModalProps> = ({
  visible,
  onClose,
  pincode,
  address,
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
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, {backgroundColor: theme.card}]}>
          {/* Success Header with Green Tick Icon */}
          <View style={[styles.header, {backgroundColor: primaryColor + '15'}]}>
            <View style={[styles.iconWrapper, {backgroundColor: primaryColor}]}>
              <Icon name="checkmark" size={56} color="#FFFFFF" />
            </View>
            <Text style={[styles.headerTitle, {color: theme.text}]}>
              Success!
            </Text>
            <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
              Your pincode and address have been saved successfully
            </Text>
          </View>

          {/* Details Section */}
          {(pincode || address) && (
            <View style={styles.content}>
              <View style={[styles.section, {backgroundColor: theme.background}]}>
                <View style={styles.sectionHeader}>
                  <Icon name="location" size={20} color={primaryColor} />
                  <Text style={[styles.sectionTitle, {color: theme.text}]}>
                    Location Details
                  </Text>
                </View>
                
                <View style={styles.detailsContainer}>
                  {pincode && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailLeft}>
                        <Icon name="pin" size={18} color={primaryColor} style={styles.detailIcon} />
                        <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                          Pincode
                        </Text>
                      </View>
                      <Text style={[styles.detailValue, {color: theme.text}]}>
                        {pincode}
                      </Text>
                    </View>
                  )}

                  {address && (
                    <View style={styles.detailRow}>
                      <View style={styles.detailLeft}>
                        <Icon name="home" size={18} color={primaryColor} style={styles.detailIcon} />
                        <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                          Address
                        </Text>
                      </View>
                      <Text style={[styles.detailValue, {color: theme.text}]} numberOfLines={3}>
                        {address}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Info Note */}
              <View style={[styles.noteContainer, {backgroundColor: primaryColor + '10', borderColor: primaryColor + '30'}]}>
                <Icon name="information-circle" size={20} color={primaryColor} />
                <Text style={[styles.noteText, {color: theme.text}]}>
                  We'll use this location to help you find nearby doctors and provide better service.
                </Text>
              </View>
            </View>
          )}

          {/* Action Button */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.okButton, {backgroundColor: primaryColor}]}
              onPress={onClose}
              activeOpacity={0.8}>
              <Icon name="checkmark-circle" size={20} color="#FFFFFF" />
              <Text style={styles.okButtonText}>OK</Text>
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
    lineHeight: 20,
  },
  content: {
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
  detailsContainer: {
    marginTop: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    minHeight: 44,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailIcon: {
    marginRight: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    flex: 1,
    marginLeft: 12,
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
    padding: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  okButton: {
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
  okButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
});

export default PincodeSuccessModal;

