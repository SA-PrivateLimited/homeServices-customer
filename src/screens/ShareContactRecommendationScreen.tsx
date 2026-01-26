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
  Modal,
  FlatList,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {fetchServiceCategories, ServiceCategory} from '../services/serviceCategoriesService';
import useTranslation from '../hooks/useTranslation';
import AlertModal from '../components/AlertModal';
import {contactRecommendationsApi} from '../services/api/contactRecommendationsApi';

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
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
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

  const handleSelectServiceType = (category: ServiceCategory) => {
    setSelectedServiceType(category.name);
    setShowServiceTypeModal(false);
  };

  const validatePhone = (phone: string): boolean => {
    // Basic phone validation - 10 digits
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.length === 10;
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setAlertModal({
        visible: true,
        title: String(t('auth.login')),
        message: String(t('services.loginRequired')),
        type: 'warning',
      });
      navigation.navigate('Login');
      return;
    }

    // Validation
    if (!selectedServiceType) {
      setAlertModal({
        visible: true,
        title: String(t('common.serviceTypeRequired')),
        message: String(t('common.serviceTypeRequiredMessage')),
        type: 'warning',
      });
      return;
    }

    if (!providerName.trim()) {
      setAlertModal({
        visible: true,
        title: String(t('common.error')),
        message: String(t('recommendations.providerNameRequired')),
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
      const response = await contactRecommendationsApi.create({
        recommendedProviderName: providerName.trim(),
        recommendedProviderPhone: providerPhone.trim(),
        serviceType: selectedServiceType,
        address: address.trim() || undefined,
      });

      setAlertModal({
        visible: true,
        title: String(t('common.success')),
        message: response.message || String(t('recommendations.successMessage')),
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

  const selectedCategory = serviceCategories.find(cat => cat.name === selectedServiceType);

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
            <Text style={[styles.label, {color: theme.text}]}>
              {t('recommendations.serviceType')} *
            </Text>
            <TouchableOpacity
              style={[
                styles.input,
                styles.selectInput,
                {borderColor: theme.border, backgroundColor: theme.background},
              ]}
              onPress={() => setShowServiceTypeModal(true)}>
              <Text
                style={[
                  styles.selectInputText,
                  {color: selectedServiceType ? theme.text : theme.textSecondary},
                ]}>
                {selectedServiceType
                  ? (language === 'hi' && selectedCategory?.nameHi
                      ? selectedCategory.nameHi
                      : selectedServiceType)
                  : t('recommendations.selectServiceType')}
              </Text>
              <Icon name="arrow-drop-down" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
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
            <TextInput
              style={[styles.input, {borderColor: theme.border, color: theme.text}]}
              placeholder={t('recommendations.providerPhonePlaceholder')}
              placeholderTextColor={theme.textSecondary}
              value={providerPhone}
              onChangeText={setProviderPhone}
              keyboardType="phone-pad"
              maxLength={10}
            />
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

      {/* Service Type Modal */}
      <Modal
        visible={showServiceTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServiceTypeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                {t('services.selectServiceType')}
              </Text>
              <TouchableOpacity onPress={() => setShowServiceTypeModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            {loadingCategories ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : (
              <FlatList
                data={serviceCategories}
                keyExtractor={item => item.id}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryItem,
                      {
                        backgroundColor:
                          selectedServiceType === item.name
                            ? theme.primary + '20'
                            : 'transparent',
                      },
                    ]}
                    onPress={() => handleSelectServiceType(item)}>
                    <View
                      style={[
                        styles.categoryIcon,
                        {backgroundColor: item.color + '20'},
                      ]}>
                      <Icon name={item.icon} size={24} color={item.color} />
                    </View>
                    <View style={styles.categoryText}>
                      <Text style={[styles.categoryName, {color: theme.text}]}>
                        {language === 'hi' && item.nameHi ? item.nameHi : item.name}
                      </Text>
                    </View>
                    {selectedServiceType === item.name && (
                      <Icon name="check-circle" size={24} color={theme.primary} />
                    )}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>

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
