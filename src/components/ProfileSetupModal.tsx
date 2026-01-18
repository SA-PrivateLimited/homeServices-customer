import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';

interface ProfileSetupModalProps {
  visible: boolean;
  onSetupNow: () => void;
  onSetupLater: () => void;
}

const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({
  visible,
  onSetupNow,
  onSetupLater,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onSetupLater}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, {backgroundColor: theme.card}]}>
          {/* Icon */}
          <View style={[styles.iconContainer, {backgroundColor: theme.primary + '20'}]}>
            <Icon name="medical-services" size={64} color={theme.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, {color: theme.text}]}>
            {String(t('profile.completeYourProfileTitle') || 'Complete Your Profile')}
          </Text>

          {/* Description */}
          <Text style={[styles.description, {color: theme.textSecondary}]}>
            {String(t('profile.completeYourProfileDescription') || 'To start receiving service requests, you need to complete your profile setup.')}
          </Text>

          {/* Features List */}
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#34C759" />
              <Text style={[styles.featureText, {color: theme.text}]}>
                {String(t('profile.setSpecializationQualification') || 'Set your specialization & qualifications')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#34C759" />
              <Text style={[styles.featureText, {color: theme.text}]}>
                {String(t('profile.defineAvailabilityFees') || 'Define your availability & consultation fees')}
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color="#34C759" />
              <Text style={[styles.featureText, {color: theme.text}]}>
                {String(t('profile.startAcceptingRequests') || 'Start accepting service requests')}
              </Text>
            </View>
          </View>

          {/* Note */}
          <View style={[styles.noteContainer, {backgroundColor: theme.primary + '15'}]}>
            <Icon name="info" size={18} color={theme.primary} />
            <Text style={[styles.noteText, {color: theme.primary}]}>
              {String(t('profile.profileReviewNote') || 'Your profile will be reviewed by an admin before activation')}
            </Text>
          </View>

          {/* Buttons */}
          <TouchableOpacity
            style={[styles.primaryButton, {backgroundColor: theme.primary}]}
            onPress={onSetupNow}
            activeOpacity={0.8}>
            <Text style={styles.primaryButtonText}>
              {String(t('profile.setUpProfileNow') || 'Set Up Profile Now')}
            </Text>
            <Icon name="arrow-forward" size={20} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, {borderColor: theme.border}]}
            onPress={onSetupLater}
            activeOpacity={0.7}>
            <Text style={[styles.secondaryButtonText, {color: theme.textSecondary}]}>
              {String(t('profile.illDoThisLater') || "I'll Do This Later")}
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
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 10},
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
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
    marginBottom: 24,
    lineHeight: 22,
  },
  featuresList: {
    width: '100%',
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingLeft: 10,
  },
  featureText: {
    fontSize: 14,
    marginLeft: 12,
    flex: 1,
  },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 24,
    width: '100%',
  },
  noteText: {
    fontSize: 12,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
  },
});

export default ProfileSetupModal;
