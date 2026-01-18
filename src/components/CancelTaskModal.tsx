import React, {useState} from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';

interface CancelTaskModalProps {
  visible: boolean;
  onCancel: (reason: string) => Promise<void>;
  onClose: () => void;
}

const CancelTaskModal: React.FC<CancelTaskModalProps> = ({
  visible,
  onCancel,
  onClose,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const [reason, setReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');

  const cancellationReasons = [
    t('common.noLongerNeeded'),
    t('common.foundAnotherProvider'),
    t('common.addressChanged'),
    t('common.serviceNotAvailable'),
    t('common.personalEmergency'),
    t('common.otherReason'),
  ];

  const handleCancel = async () => {
    if (!reason.trim()) {
      setError(t('common.provideCancellationReason'));
      return;
    }

    if (reason.trim().length < 10) {
      setError(t('common.provideDetailedReason'));
      return;
    }

    setCancelling(true);
    setError('');
    try {
      await onCancel(reason.trim());
      setReason('');
    } catch (err: any) {
      setError(err.message || t('activeService.failedToCancelService'));
    } finally {
      setCancelling(false);
    }
  };

  const handleClose = () => {
    setReason('');
    setError('');
    onClose();
  };

  const handleReasonSelect = (selectedReason: string) => {
    if (selectedReason === t('common.otherReason')) {
      setReason('');
    } else {
      setReason(selectedReason);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}>
        <View style={styles.overlay}>
          <View
            style={[
              styles.modalContainer,
              {
                backgroundColor: theme.card,
                shadowColor: isDarkMode ? '#000' : '#000',
              },
            ]}>
            {/* Header */}
            <View style={styles.headerContainer}>
              <View
                style={[
                  styles.iconContainer,
                  {backgroundColor: '#FF3B30' + '15'},
                ]}>
                <Icon name="close-circle" size={32} color="#FF3B30" />
              </View>
              <Text style={[styles.headerTitle, {color: theme.text}]}>
                {String(t('activeService.cancelService') || 'Cancel Service')}
              </Text>
              <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
                {String(t('common.cancelServiceDescription') || 'Please provide a reason for cancelling this service. The provider will be notified.')}
              </Text>
            </View>

            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
              {/* Quick Reason Selection */}
              <View style={styles.quickReasonsContainer}>
                <Text style={[styles.sectionLabel, {color: theme.textSecondary}]}>
                  {String(t('common.quickSelect') || 'Quick Select:')}
                </Text>
                <View style={styles.reasonsGrid}>
                  {cancellationReasons.map((quickReason) => (
                    <TouchableOpacity
                      key={quickReason}
                      style={[
                        styles.reasonChip,
                        {
                          backgroundColor:
                            reason === quickReason
                              ? theme.primary + '20'
                              : theme.background,
                          borderColor:
                            reason === quickReason ? theme.primary : theme.border,
                        },
                      ]}
                      onPress={() => handleReasonSelect(quickReason)}>
                      <Text
                        style={[
                          styles.reasonChipText,
                          {
                            color:
                              reason === quickReason ? theme.primary : theme.text,
                          },
                        ]}>
                        {quickReason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Reason Input */}
              <View style={styles.inputContainer}>
                <Text style={[styles.inputLabel, {color: theme.text}]}>
                  {String(t('common.cancellationReason') || 'Cancellation Reason')} {reason && reason !== t('common.otherReason') ? `(${String(t('common.youCanEdit') || 'You can edit')})` : ''}
                </Text>
                <TextInput
                  style={[
                    styles.reasonInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: error ? '#FF3B30' : theme.border,
                    },
                  ]}
                  value={reason}
                  onChangeText={(text) => {
                    setReason(text);
                    setError('');
                  }}
                  placeholder={String(t('common.cancellationReasonPlaceholder') || 'Enter detailed cancellation reason...')}
                  placeholderTextColor={theme.textSecondary}
                  multiline={true}
                  numberOfLines={4}
                  textAlignVertical="top"
                  maxLength={200}
                />
                {error && (
                  <Text style={styles.errorText}>{error}</Text>
                )}
                <Text style={[styles.charCount, {color: theme.textSecondary}]}>
                  {reason.length} / 200 {String(t('common.characters') || 'characters')}
                </Text>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  {
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
                onPress={handleClose}
                disabled={cancelling}>
                <Text
                  style={[
                    styles.closeButtonText,
                    {color: theme.text},
                  ]}>
                  {String(t('common.close') || 'Close')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  {
                    backgroundColor: '#FF3B30',
                    opacity: cancelling ? 0.6 : 1,
                  },
                ]}
                onPress={handleCancel}
                disabled={cancelling || !reason.trim() || reason.trim().length < 10}>
                {cancelling ? (
                  <Text style={styles.cancelButtonText}>{String(t('common.cancelling') || 'Cancelling...')}</Text>
                ) : (
                  <Text style={styles.cancelButtonText}>{String(t('activeService.cancelService') || 'Cancel Service')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const {width, height} = Dimensions.get('window');
const modalWidth = width * 0.9;
const modalHeight = height * 0.7;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: modalWidth,
    maxWidth: 500,
    maxHeight: modalHeight,
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
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  contentContainer: {
    maxHeight: height * 0.4,
  },
  quickReasonsContainer: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  reasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  reasonInput: {
    width: '100%',
    minHeight: 100,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    marginBottom: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    marginBottom: 4,
  },
  charCount: {
    fontSize: 12,
    textAlign: 'right',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  closeButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
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
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default CancelTaskModal;

