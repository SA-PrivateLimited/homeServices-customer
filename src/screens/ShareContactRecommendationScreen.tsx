/**
 * Share Contact Recommendation Screen
 * Customer app - Share contact of plumber, electrician, etc.
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Select, bilingualProfessionLine} from 'sapvt-ltd-app-packages';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {fetchServiceCategories, ServiceCategory} from '../services/serviceCategoriesService';
import useTranslation from '../hooks/useTranslation';
import AlertModal from '../components/AlertModal';
import {contactRecommendationsApi} from '../services/api/contactRecommendationsApi';
import PhoneNumberInput from '../components/PhoneNumberInput';
import {ContactPickModal} from '../components/ContactPickModal';
import {localTenDigits, toE164} from '../utils/phone';

interface ShareContactRecommendationScreenProps {
  navigation: any;
}

export default function ShareContactRecommendationScreen({
  navigation,
}: ShareContactRecommendationScreenProps) {
  const {isDarkMode, currentUser, language} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [providerName, setProviderName] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [pickOpen, setPickOpen] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });

  useEffect(() => {
    loadServiceCategories();
  }, []);

  const loadServiceCategories = async () => {
    try {
      setLoadingCategories(true);
      const categories = await fetchServiceCategories();
      setServiceCategories(categories);
    } catch (error: any) {
      console.error('Error loading service categories:', error);
      setAlertModal({
        visible: true,
        title: String(t('common.error')),
        message: String(t('services.loadCategoriesError')),
        type: 'error',
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleSelectServiceType = (categoryName: string) => {
    setSelectedServiceType(categoryName);
  };

  const serviceTypeOptions = serviceCategories.map(cat => ({
    value: cat.name,
    label: bilingualProfessionLine(cat.name, {nameHi: cat.nameHi}),
  }));

  const validatePhone = (phone: string): boolean => {
    return localTenDigits(phone).length === 10;
  };

  const handleSubmit = async () => {
    if (!selectedServiceType) {
      setAlertModal({
        visible: true,
        title: String(t('common.serviceTypeRequired')),
        message: String(t('common.serviceTypeRequiredMessage')),
        type: 'warning',
      });
      return;
    }

    if (!providerPhone.trim()) {
      setAlertModal({
        visible: true,
        title: String(t('common.error')),
        message: String(t('recommendations.providerPhoneRequired')),
        type: 'warning',
      });
      return;
    }

    if (!validatePhone(providerPhone)) {
      setAlertModal({
        visible: true,
        title: String(t('common.error')),
        message: String(t('recommendations.invalidPhone')),
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      await contactRecommendationsApi.create(
        {
          recommendedProviderName:
            providerName.trim() || String(t('providers.title') || 'Service Provider'),
          recommendedProviderPhone: toE164(providerPhone),
          serviceType: selectedServiceType,
          address: address.trim() || undefined,
        },
        {skipAuth: !currentUser},
      );

      setAlertModal({
        visible: true,
        title: String(t('common.success')),
        message: String(t('recommendations.successMessage')),
        type: 'success',
      });

      // Reset form
      setProviderName('');
      setProviderPhone('');
      setAddress('');
      setSelectedServiceType('');

      // Navigate back after a delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting recommendation:', error);
      setAlertModal({
        visible: true,
        title: String(t('common.error')),
        message: error.message || String(t('recommendations.submitError')),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Icon name="person-add" size={48} color={theme.primary} />
          <Text style={[styles.headerTitle, {color: theme.text}]}>
            {t('recommendations.shareContact')}
          </Text>
          <Text style={[styles.headerSubtitle, {color: theme.textSecondary}]}>
            {t('recommendations.shareContactSubtitle')}
          </Text>
        </View>

        {/* Form */}
        <View style={[styles.form, {backgroundColor: theme.card}]}>
          {/* Service Type */}
          <View style={styles.formGroup}>
            <Select
              label={`${t('recommendations.serviceType')} *`}
              options={serviceTypeOptions}
              value={selectedServiceType}
              onChange={handleSelectServiceType}
              placeholder={String(t('recommendations.selectServiceType'))}
              title={String(t('services.selectServiceType'))}
              disabled={loadingCategories}
            />
          </View>

          {/* Provider Name */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, {color: theme.text}]}>
              {t('recommendations.providerName')} *
            </Text>
            <TextInput
              style={[styles.input, {borderColor: theme.border, color: theme.text}]}
              placeholder={t('recommendations.providerNamePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={providerName}
              onChangeText={setProviderName}
            />
          </View>

          {/* Provider Phone */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, {color: theme.text}]}>
              {t('recommendations.providerPhone')} *
            </Text>
            <PhoneNumberInput
              value={providerPhone}
              onChangeText={setProviderPhone}
              placeholder={String(
                t('recommendations.providerPhonePlaceholder') ||
                  '10-digit mobile',
              )}
              borderColor={theme.border}
              backgroundColor={theme.card}
              prefixBackgroundColor={isDarkMode ? theme.border : '#F5F5F5'}
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
            />
            <TouchableOpacity
              onPress={() => setPickOpen(true)}
              style={{marginTop: 8}}>
              <Text style={{color: theme.primary, fontWeight: '600', fontSize: 13}}>
                {String(t('recommendations.pickContact') || 'Choose from contacts')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Address (Optional) */}
          <View style={styles.formGroup}>
            <Text style={[styles.label, {color: theme.text}]}>
              {t('recommendations.address')} ({t('common.optional')})
            </Text>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {borderColor: theme.border, color: theme.text},
              ]}
              placeholder={t('recommendations.addressPlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={address}
              onChangeText={setAddress}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Info Box */}
          <View style={[styles.infoBox, {backgroundColor: theme.primary + '15', borderColor: theme.primary + '30'}]}>
            <Icon name="info" size={20} color={theme.primary} />
            <Text style={[styles.infoText, {color: theme.text}]}>
              {t('recommendations.infoMessage')}
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, {backgroundColor: theme.primary}]}
            onPress={handleSubmit}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Icon name="send" size={20} color="#fff" />
                <Text style={styles.submitButtonText}>
                  {t('recommendations.submit')}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ContactPickModal
        visible={pickOpen}
        onClose={() => setPickOpen(false)}
        onPick={(name, phone) => {
          if (name) setProviderName(name);
          if (phone) setProviderPhone(phone);
        }}
        title={String(t('recommendations.pickContact') || 'Choose from contacts')}
        emptyLabel={String(
          t('recommendations.pickerUnavailable') ||
            'Could not open contacts. Enter the mobile number.',
        )}
        cancelLabel={String(t('common.cancel') || 'Cancel')}
        backgroundColor={theme.background}
        textColor={theme.text}
        mutedColor={theme.textSecondary}
      />

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({...alertModal, visible: false})}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  form: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectInputText: {
    fontSize: 16,
    flex: 1,
  },
  textArea: {
    minHeight: 80,
    paddingTop: 14,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryText: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
  },
});
