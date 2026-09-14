/**
 * Share Contact Recommendation Screen
 * Customer app — recommend a trusted local professional (UI only; same API payload).
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
  LayoutAnimation,
  Platform,
  UIManager,
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
import {getGeographyMeta} from '../services/api/geographyApi';
import {readSearchLocation} from '../utils/browseLocationMemory';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ShareContactRecommendationScreenProps {
  navigation: any;
}

export default function ShareContactRecommendationScreen({
  navigation,
}: ShareContactRecommendationScreenProps) {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<string>('');
  const [providerName, setProviderName] = useState('');
  const [providerPhone, setProviderPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [stateId, setStateId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [geoStates, setGeoStates] = useState<{value: string; label: string}[]>(
    [],
  );
  const [geoDistricts, setGeoDistricts] = useState<
    {value: string; label: string; stateId: string}[]
  >([]);
  const [moreOpen, setMoreOpen] = useState(false);
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
    void loadServiceCategories();
    void getGeographyMeta()
      .then(meta => {
        setGeoStates(
          (meta.states || []).map(s => ({value: s._id, label: s.name})),
        );
        setGeoDistricts(
          (meta.districts || []).map(d => ({
            value: d._id,
            label: d.name,
            stateId: d.stateId,
          })),
        );
      })
      .catch(() => {
        setGeoStates([]);
        setGeoDistricts([]);
      });
    void readSearchLocation().then(saved => {
      if (!saved) return;
      if (saved.stateId) setStateId(saved.stateId);
      if (saved.districtId) setDistrictId(saved.districtId);
    });
  }, []);

  const districtOptions = geoDistricts.filter(
    d => !stateId || d.stateId === stateId,
  );

  const buildAddress = () => {
    const stateLabel = geoStates.find(s => s.value === stateId)?.label;
    const districtLabel = districtOptions.find(
      d => d.value === districtId,
    )?.label;
    const parts = [districtLabel, stateLabel, notes.trim()].filter(Boolean);
    return parts.length ? parts.join(', ') : undefined;
  };

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
        title: String(t('common.error')),
        message: String(
          t('shareContact.serviceRequired') ||
            t('recommendations.selectServiceType'),
        ),
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
        message: String(
          t('shareContact.phoneRequired') || t('recommendations.invalidPhone'),
        ),
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      await contactRecommendationsApi.create(
        {
          recommendedProviderName:
            providerName.trim() ||
            String(t('providers.title') || 'Service Provider'),
          recommendedProviderPhone: toE164(providerPhone),
          serviceType: selectedServiceType,
          address: buildAddress(),
        },
        {skipAuth: !currentUser},
      );

      setAlertModal({
        visible: true,
        title: String(t('shareContact.successTitle') || t('common.success')),
        message: String(
          t('shareContact.successBody') || t('recommendations.successMessage'),
        ),
        type: 'success',
      });

      setProviderName('');
      setProviderPhone('');
      setNotes('');
      setStateId('');
      setDistrictId('');
      setSelectedServiceType('');
      setMoreOpen(false);

      setTimeout(() => {
        navigation.goBack();
      }, 1800);
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

  const toggleMore = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMoreOpen(open => !open);
  };

  const crystalColors = {
    card: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.55)',
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.intro}>
          <Text style={[styles.introTitle, {color: theme.text}]}>
            {t('recommendations.shareContact')}
          </Text>
          <Text style={[styles.introSub, {color: theme.textSecondary}]}>
            {t('recommendations.shareContactSubtitle')}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.field}>
            <Select
              variant="crystal"
              label={String(t('recommendations.serviceType'))}
              options={serviceTypeOptions}
              value={selectedServiceType}
              onChange={setSelectedServiceType}
              placeholder={String(t('recommendations.selectServiceType'))}
              title={String(t('recommendations.selectServiceType'))}
              disabled={loadingCategories}
              colors={crystalColors}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, {color: theme.text}]}>
              {t('recommendations.nameOptional') ||
                t('shareContact.nameOptional') ||
                t('recommendations.providerName')}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: theme.border,
                  color: theme.text,
                  backgroundColor: theme.card,
                },
              ]}
              placeholder={String(t('recommendations.providerNamePlaceholder'))}
              placeholderTextColor={theme.textSecondary}
              value={providerName}
              onChangeText={setProviderName}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.label, {color: theme.text}]}>
              {t('recommendations.providerPhone')}
            </Text>
            <PhoneNumberInput
              value={providerPhone}
              onChangeText={setProviderPhone}
              placeholder={String(t('recommendations.providerPhonePlaceholder'))}
              borderColor={theme.border}
              backgroundColor={theme.card}
              prefixBackgroundColor={isDarkMode ? theme.border : '#F5F5F5'}
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
            />
            <TouchableOpacity
              onPress={() => setPickOpen(true)}
              style={[
                styles.pickContacts,
                {borderColor: `${theme.primary}55`},
              ]}
              accessibilityRole="button">
              <Icon name="contacts" size={18} color={theme.primary} />
              <Text style={[styles.pickContactsText, {color: theme.primary}]}>
                {String(
                  t('shareContact.pickContact') ||
                    t('recommendations.pickContact'),
                )}
              </Text>
            </TouchableOpacity>
          </View>

          {geoStates.length ? (
            <View style={styles.moreBlock}>
              <TouchableOpacity
                onPress={toggleMore}
                style={styles.moreToggle}
                accessibilityRole="button"
                accessibilityState={{expanded: moreOpen}}>
                <Text style={[styles.moreToggleText, {color: theme.text}]}>
                  {t('recommendations.moreDetails')}
                </Text>
                <Icon
                  name={moreOpen ? 'expand-less' : 'expand-more'}
                  size={22}
                  color={theme.textSecondary}
                />
              </TouchableOpacity>

              {moreOpen ? (
                <View style={styles.moreBody}>
                  <View style={styles.field}>
                    <Select
                      variant="crystal"
                      label={String(
                        t('shareContact.stateOptional') || 'State (optional)',
                      )}
                      options={[{value: '', label: '—'}, ...geoStates]}
                      value={stateId}
                      onChange={value => {
                        setStateId(value);
                        setDistrictId('');
                      }}
                      placeholder={String(
                        t('browse.selectState') || 'Select state',
                      )}
                      title={String(t('browse.selectState') || 'State')}
                      colors={crystalColors}
                      showSearch
                      searchPlaceholder={String(
                        t('browse.searchStatePlaceholder') ||
                          'Search state...',
                      )}
                      emptySearchText={String(
                        t('browse.noStatesFound') ||
                          'No states found\nTry a different name.',
                      )}
                    />
                  </View>
                  {districtOptions.length ? (
                    <View style={styles.field}>
                      <Select
                        variant="crystal"
                        label={String(
                          t('shareContact.districtOptional') ||
                            'District (optional)',
                        )}
                        options={[{value: '', label: '—'}, ...districtOptions]}
                        value={districtId}
                        onChange={setDistrictId}
                        placeholder={String(
                          t('browse.selectDistrict') || 'Select district',
                        )}
                        title={String(t('browse.selectDistrict') || 'District')}
                        colors={crystalColors}
                        showSearch
                        searchPlaceholder={String(
                          t('browse.searchDistrictPlaceholder') ||
                            'Search district...',
                        )}
                        emptySearchText={String(
                          t('browse.noDistrictsFound') ||
                            'No districts found\nTry a different name.',
                        )}
                      />
                    </View>
                  ) : null}
                  <View style={styles.field}>
                    <Text style={[styles.label, {color: theme.text}]}>
                      {t('shareContact.notesOptional') ||
                        t('recommendations.address')}
                    </Text>
                    <TextInput
                      style={[
                        styles.input,
                        styles.textArea,
                        {
                          borderColor: theme.border,
                          color: theme.text,
                          backgroundColor: theme.card,
                        },
                      ]}
                      placeholder={String(
                        t('shareContact.notesPlaceholder') ||
                          t('recommendations.addressPlaceholder'),
                      )}
                      placeholderTextColor={theme.textSecondary}
                      value={notes}
                      onChangeText={setNotes}
                      multiline
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.field}>
              <Text style={[styles.label, {color: theme.text}]}>
                {t('shareContact.notesOptional') ||
                  t('recommendations.address')}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  styles.textArea,
                  {
                    borderColor: theme.border,
                    color: theme.text,
                    backgroundColor: theme.card,
                  },
                ]}
                placeholder={String(t('recommendations.addressPlaceholder'))}
                placeholderTextColor={theme.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          )}

          <Text style={[styles.privacy, {color: theme.textSecondary}]}>
            {String(
              t('shareContact.privacy') || t('recommendations.infoMessage'),
            )}
          </Text>

          <TouchableOpacity
            style={[
              styles.submitButton,
              {backgroundColor: theme.primary, opacity: loading ? 0.7 : 1},
            ]}
            onPress={() => void handleSubmit()}
            disabled={loading}
            accessibilityRole="button">
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>
                {t('recommendations.submit')}
              </Text>
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
        title={String(
          t('shareContact.pickContact') || t('recommendations.pickContact'),
        )}
        emptyLabel={String(
          t('shareContact.pickerUnavailable') ||
            t('recommendations.pickerUnavailable'),
        )}
        cancelLabel={String(t('common.cancel') || 'Cancel')}
        backgroundColor={theme.background}
        textColor={theme.text}
        mutedColor={theme.textSecondary}
      />

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
  container: {flex: 1},
  scrollView: {flex: 1},
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 32,
  },
  intro: {marginBottom: 16},
  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  introSub: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
  },
  form: {gap: 4},
  field: {marginBottom: 14},
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 48,
  },
  textArea: {
    minHeight: 84,
    paddingTop: 12,
  },
  pickContacts: {
    marginTop: 10,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  pickContactsText: {fontSize: 14, fontWeight: '700'},
  moreBlock: {
    marginBottom: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  moreToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: 4,
  },
  moreToggleText: {fontSize: 14, fontWeight: '700'},
  moreBody: {paddingTop: 4},
  privacy: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 14,
  },
  submitButton: {
    minHeight: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
