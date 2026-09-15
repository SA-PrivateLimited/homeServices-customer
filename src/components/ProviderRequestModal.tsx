/**
 * Modal to request a specific provider: address cards/edit, category questions, optional problem.
 */

import React, {useEffect, useState} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {MobilePhotoPicker} from 'sapvt-ltd-app-packages';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import ServiceAddressPicker, {
  emptyAddressSelection,
  type ServiceAddressSelection,
} from './ServiceAddressPicker';
import type {ServiceAddressValue} from './ServiceAddressFields';
import ServiceQuestionnaireFields from './ServiceQuestionnaireFields';
import {serviceRequestsApi} from '../services/api/serviceRequestsApi';
import {usersApi} from '../services/api/usersApi';
import {
  rememberServiceAddress,
} from '../services/addressService';
import {
  fetchServiceCategories,
  type QuestionnaireQuestion,
  type ServiceCategory,
} from '../services/serviceCategoriesService';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import useTranslation from '../hooks/useTranslation';
import {uploadRequestPhotos} from '../utils/uploadRequestPhotos';

export type RequestableProvider = {
  id?: string;
  _id?: string;
  uid?: string;
  name?: string;
  phone?: string;
  phoneNumber?: string;
  specialization?: string;
  specialty?: string;
  serviceType?: string;
  rating?: number;
  profileImage?: string;
  image?: string;
  photoURL?: string;
};

type Props = {
  visible: boolean;
  provider: RequestableProvider | null;
  requestedServiceType?: string;
  onClose: () => void;
  onSuccess: (serviceRequestId: string) => void;
};

function cleanAddress(addr: ServiceAddressValue | null): ServiceAddressValue | null {
  if (!addr) return null;
  const out: ServiceAddressValue = {};
  (Object.keys(addr) as (keyof ServiceAddressValue)[]).forEach(k => {
    const v = addr[k];
    if (v !== undefined && v !== null && v !== '') {
      (out as any)[k] = v;
    }
  });
  return out.address && out.pincode ? out : null;
}

function serviceTypeOf(
  p: RequestableProvider,
  preferred?: string,
): string {
  const pref = String(preferred || '').trim();
  if (pref) return pref;
  return p.specialization || p.specialty || p.serviceType || 'Service';
}

function providerIdOf(p: RequestableProvider): string {
  return String(p.id || p._id || p.uid || '');
}

function matchCategory(
  categories: ServiceCategory[],
  serviceType: string,
): ServiceCategory | null {
  const n = serviceType.toLowerCase().trim();
  if (!n) return null;
  return (
    categories.find(c => c.name.toLowerCase() === n) ||
    categories.find(
      c =>
        c.name.toLowerCase().includes(n) ||
        n.includes(c.name.toLowerCase()) ||
        (c.nameHi && c.nameHi.includes(serviceType)),
    ) ||
    null
  );
}

export default function ProviderRequestModal({
  visible,
  provider,
  requestedServiceType,
  onClose,
  onSuccess,
}: Props) {
  const {isDarkMode, currentUser, setCurrentUser, addServiceRequest, language} =
    useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [addressSel, setAddressSel] = useState<ServiceAddressSelection>(
    emptyAddressSelection(),
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const [questionnaire, setQuestionnaire] = useState<QuestionnaireQuestion[]>(
    [],
  );
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<
    Record<string, any>
  >({});
  const [problem, setProblem] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  useEffect(() => {
    if (!visible || !provider) return;
    setProblem('');
    setPhotos([]);
    setError(null);
    setSubmitting(false);
    setAddressSel(emptyAddressSelection({mode: 'saved'}));
    setRefreshKey(k => k + 1);
    setQuestionnaireAnswers({});

    const serviceType = serviceTypeOf(provider, requestedServiceType);
    setLoadingQuestions(true);
    void fetchServiceCategories()
      .then(cats => {
        const cat = matchCategory(cats, serviceType);
        setQuestionnaire(cat?.questionnaire || []);
      })
      .catch(() => setQuestionnaire([]))
      .finally(() => setLoadingQuestions(false));
  }, [visible, provider]);

  const ensureCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickPhotoFromCamera = async (): Promise<string | null> => {
    const ok = await ensureCameraPermission();
    if (!ok) return null;
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.8,
      saveToPhotos: false,
    });
    if (result.didCancel || result.errorCode) return null;
    return result.assets?.[0]?.uri || null;
  };

  const pickPhotoFromGallery = async (): Promise<string[] | null> => {
    const remaining = 3 - photos.length;
    if (remaining <= 0) return null;
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: remaining,
    });
    if (result.didCancel || result.errorCode) return null;
    const uris = (result.assets || [])
      .map(a => a.uri)
      .filter((u): u is string => Boolean(u));
    return uris.length > 0 ? uris : null;
  };

  const onPhotosPicked = (uris: string[]) => {
    const clean = uris.map(u => String(u || '').trim()).filter(Boolean);
    if (clean.length === 0) return;
    setPhotos(prev => [...prev, ...clean].slice(0, 3));
  };

  const onSubmit = async () => {
    if (!provider) return;
    const customerId = currentUser?.id || (currentUser as any)?._id;
    if (!customerId) {
      setError(String(t('providers.pleaseLoginToRequest')));
      return;
    }
    if (currentUser?.phoneVerified !== true) {
      setError(String(t('providers.pleaseLoginToRequest')));
      return;
    }

    if (addressSel.mode === 'edit') {
      setError(String(t('services.saveAddressFirst')));
      return;
    }

    const cleaned = cleanAddress(addressSel.address);
    if (!cleaned) {
      setError(String(t('services.validAddressWithPincode')));
      return;
    }

    if (
      addressSel.mode === 'new' &&
      addressSel.label === 'other' &&
      !addressSel.customLabel.trim()
    ) {
      setError(String(t('services.customLabelRequired')));
      return;
    }

    if (questionnaire.length > 0) {
      const missing = questionnaire.filter(q => {
        if (!q.required) return false;
        const answer = questionnaireAnswers[q.id];
        if (answer === undefined || answer === null || answer === '') return true;
        if (Array.isArray(answer) && answer.length === 0) return true;
        return false;
      });
      if (missing.length > 0) {
        setError(String(t('common.pleaseAnswerRequiredQuestions')));
        return;
      }
    } else if (!problem.trim()) {
      setError(String(t('services.problemRequired')));
      return;
    }

    const providerId = providerIdOf(provider);
    if (!providerId) {
      setError(String(t('common.error')));
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      if (addressSel.mode === 'new' && addressSel.saveForFuture) {
        try {
          const saved = await rememberServiceAddress({
            ...cleaned,
            label: addressSel.label,
            customLabel:
              addressSel.label === 'other'
                ? addressSel.customLabel.trim()
                : undefined,
          });
          if (saved) {
            try {
              const me = await usersApi.getMe();
              if (me) await setCurrentUser(me as any);
            } catch {
              // optional
            }
          }
        } catch {
          // non-fatal
        }
      }

      const serviceType = serviceTypeOf(provider, requestedServiceType);
      const customerAddress: any = {
        ...cleaned,
        label: addressSel.label,
      };
      if (addressSel.label === 'other' || addressSel.customLabel.trim()) {
        customerAddress.customLabel = addressSel.customLabel.trim();
      }

      const payload: any = {
        customerId,
        customerName: (currentUser as any)?.name || 'Customer',
        customerPhone:
          (currentUser as any)?.phone ||
          (currentUser as any)?.phoneNumber ||
          '',
        customerAddress,
        serviceType,
        problem: problem.trim(),
        status: 'pending',
        urgency: 'immediate',
        providerId,
        providerName: provider.name || '',
        providerSpecialization: serviceType,
      };
      if (questionnaire.length > 0 && Object.keys(questionnaireAnswers).length) {
        payload.questionnaireAnswers = questionnaireAnswers;
      }
      if (photos.length) {
        payload.photos = await uploadRequestPhotos(photos);
      }
      const phone = provider.phone || provider.phoneNumber;
      if (phone) payload.providerPhone = phone;
      if (provider.rating != null) payload.providerRating = provider.rating;
      const image =
        provider.profileImage || provider.image || provider.photoURL;
      if (image) payload.providerImage = image;

      const created = await serviceRequestsApi.create(payload);
      const serviceRequestId =
        (created as any)?._id ||
        (created as any)?.id ||
        (created as any)?.consultationId ||
        '';
      if (!serviceRequestId) {
        throw new Error('Service request created but no id returned');
      }

      try {
        await addServiceRequest(created as any);
      } catch {
        // cache optional
      }

      onClose();
      onSuccess(String(serviceRequestId));
    } catch (err: any) {
      setError(err?.message || String(t('services.submitError')));
    } finally {
      setSubmitting(false);
    }
  };

  if (!provider) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, {backgroundColor: theme.card}]}>
          <View style={styles.header}>
            <View style={{flex: 1}}>
              <Text style={[styles.title, {color: theme.text}]}>
                {t('providers.requestService')}
              </Text>
              <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
                {provider.name || t('services.selectedProvider')}
                {' · '}
                {serviceTypeOf(provider, requestedServiceType)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{top: 12, bottom: 12, left: 12, right: 12}}
              accessibilityRole="button"
              accessibilityLabel={String(t('common.cancel'))}>
              <Icon name="close" size={24} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}>
            <ServiceAddressPicker
              theme={theme}
              value={addressSel}
              onChange={setAddressSel}
              t={t as any}
              refreshKey={refreshKey}
            />

            {loadingQuestions ? (
              <ActivityIndicator
                color={theme.primary}
                style={{marginVertical: 16}}
              />
            ) : (
              <View style={{marginTop: 16}}>
                <ServiceQuestionnaireFields
                  questions={questionnaire}
                  answers={questionnaireAnswers}
                  onChange={(id, answer) =>
                    setQuestionnaireAnswers(prev => ({...prev, [id]: answer}))
                  }
                  theme={theme}
                  language={language}
                  title={String(t('services.serviceDetails'))}
                  subtitle={String(t('services.answerQuestionsToHelp'))}
                  yesLabel={String(t('common.yes'))}
                  noLabel={String(t('common.no'))}
                  selectPlaceholder={String(t('common.select'))}
                  textPlaceholder={String(t('services.enterYourAnswer'))}
                  numberPlaceholder={String(t('services.enterANumber'))}
                />
              </View>
            )}

            <Text style={[styles.label, {color: theme.text, marginTop: 4}]}>
              {t('services.describeProblem')}
              {questionnaire.length === 0 ? ' *' : ` (${t('common.optional')})`}
            </Text>
            <TextInput
              style={[
                styles.problemInput,
                {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background,
                },
              ]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholder={String(t('services.problemPlaceholder'))}
              placeholderTextColor={theme.textSecondary}
              value={problem}
              onChangeText={setProblem}
            />
            <View style={styles.photosBlock}>
              <Text style={[styles.photosTitle, {color: theme.text}]}>
                {String(t('request.photosOptional'))}
              </Text>
              <Text style={[styles.photosHint, {color: theme.textSecondary}]}>
                {String(t('request.photosHint', {max: 3}))}
              </Text>
              {photos.length > 0 ? (
                <View style={styles.photosRow}>
                  {photos.map((uri, index) => (
                    <View key={uri} style={styles.photoWrap}>
                      <Image source={{uri}} style={styles.photoThumb} />
                      <TouchableOpacity
                        style={styles.photoRemove}
                        onPress={() =>
                          setPhotos(prev => prev.filter((_, i) => i !== index))
                        }
                        accessibilityRole="button"
                        accessibilityLabel={String(t('common.remove') || 'Remove')}>
                        <Icon name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}
              {photos.length < 3 ? (
                <MobilePhotoPicker
                  layout="stack"
                  cameraLabel={String(t('photo.takePhoto') || 'Take photo')}
                  galleryLabel={String(
                    t('photo.chooseGallery') || 'Choose from gallery',
                  )}
                  onPickCamera={pickPhotoFromCamera}
                  onPickGallery={pickPhotoFromGallery}
                  onChange={onPhotosPicked}
                  colors={{
                    primary: theme.primary,
                    card: theme.card,
                    text: theme.text,
                    textSecondary: theme.textSecondary,
                    border: theme.border,
                    background: theme.background,
                  }}
                />
              ) : null}
            </View>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </ScrollView>

          <View style={[styles.footer, {borderTopColor: theme.border}]}>
            <TouchableOpacity
              style={[styles.cancelBtn, {borderColor: theme.border}]}
              onPress={onClose}
              disabled={submitting}>
              <Text style={{color: theme.text, fontWeight: '600'}}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitBtn,
                {backgroundColor: theme.primary, opacity: submitting ? 0.7 : 1},
              ]}
              onPress={() => void onSubmit()}
              disabled={submitting}>
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitText}>
                  {t('providers.submitRequest') ||
                    t('common.submit') ||
                    'Submit'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '92%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  problemInput: {
    minHeight: 100,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
  },
  errorText: {
    color: '#E53E3E',
    marginTop: 12,
    fontSize: 13,
  },
  photosBlock: {
    marginTop: 16,
  },
  photosTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  photosHint: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  photosRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  photoWrap: {
    position: 'relative',
  },
  photoThumb: {
    width: 72,
    height: 72,
    borderRadius: 10,
  },
  photoRemove: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  submitBtn: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});
