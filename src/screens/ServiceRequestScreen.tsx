/**
 * Service Request Screen
 * Customer app — service first (web RequestPage parity).
 * Flow: Service → Problem → Address → Photos → Submit
 */

import React, {useState, useEffect, useCallback, useMemo} from 'react';
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
  Image,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchCamera, launchImageLibrary} from 'react-native-image-picker';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {fetchServiceCategories, ServiceCategory, QuestionnaireQuestion, DEFAULT_SERVICE_CATEGORIES} from '../services/serviceCategoriesService';
import GeolocationService from '../services/geolocationService';
import {
  getSavedAddresses,
  saveAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  rememberServiceAddress,
  type SavedAddress,
} from '../services/addressService';
import type {UserLocation} from '../types/common';
import Toast from '../components/Toast';
import useTranslation from '../hooks/useTranslation';
import AlertModal from '../components/AlertModal';
import ConfirmationModal from '../components/ConfirmationModal';
import ServiceAddressPicker, {
  emptyAddressSelection,
  type ServiceAddressSelection,
} from '../components/ServiceAddressPicker';
import ServiceQuestionnaireFields from '../components/ServiceQuestionnaireFields';
import {Select, MobilePhotoPicker} from 'sapvt-ltd-app-packages';
import {
  getActiveServiceRequest,
  serviceRequestsApi,
} from '../services/api/serviceRequestsApi';
import {ActiveRequestConflictBanner} from '../components/ActiveRequestConflictBanner';
import {uploadRequestPhotos} from '../utils/uploadRequestPhotos';
import {usersApi} from '../services/api/usersApi';
import {providersApi, type Provider} from '../services/api/providersApi';
import {isLiveActiveRequest} from '../utils/activeRequestUx';
import {CrystalSurface} from '../components/CrystalSurface';
import ServiceSelectionModal from '../components/ServiceSelectionModal';
import {toSafeMaterialIcon} from '../utils/serviceIcons';
import {
  buildProblemPayload,
  isMoreInfoOption,
  resolveProblemFlow,
} from '../utils/requestProblemFlow';

interface ServiceRequestScreenProps {
  navigation: any;
  route?: {
    params?: {
      serviceType?: string;
      /**
       * Only set when navigating from a specific provider's details.
       * Default / Services-tab flow stays open (any provider can accept).
       */
      requestMode?: 'open' | 'specificProvider';
      provider?: any;
      editServiceRequestId?: string;
    };
  };
}

export default function ServiceRequestScreen({
  navigation,
  route,
}: ServiceRequestScreenProps) {
  const {
    isDarkMode,
    currentUser,
    currentPincode,
    language,
    setRedirectAfterLogin,
    addServiceRequest,
  } = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  // Two distinct flows:
  // 1) Services tab (open): no requestMode / 'open' → broadcast, any provider can accept
  // 2) Provider details (specific): requestMode === 'specificProvider' → only that provider
  const targetedProvider =
    route?.params?.requestMode === 'specificProvider'
      ? route?.params?.provider || null
      : null;
  const targetedProviderId =
    targetedProvider?.id ||
    targetedProvider?._id ||
    targetedProvider?.uid ||
    null;
  const isTargetedRequest =
    route?.params?.requestMode === 'specificProvider' && !!targetedProviderId;
  const editId = String(route?.params?.editServiceRequestId || '').trim();
  const lockedServiceType =
    (isTargetedRequest &&
      (route?.params?.serviceType ||
        targetedProvider?.specialization ||
        targetedProvider?.specialty ||
        targetedProvider?.serviceType ||
        '')) ||
    '';

  // Helper function to get question text based on language preference
  const getQuestionText = (q: QuestionnaireQuestion): string => {
    if (language === 'hi' && q.questionHi) {
      return q.questionHi;
    }
    return q.question;
  };

  // Helper function to get placeholder text based on language preference
  const getPlaceholderText = (q: QuestionnaireQuestion, defaultPlaceholder: string): string => {
    if (language === 'hi' && q.placeholderHi) {
      return q.placeholderHi;
    }
    return q.placeholder || defaultPlaceholder;
  };

  // Helper function to get options based on language preference
  const getOptions = (q: QuestionnaireQuestion): string[] => {
    if (language === 'hi' && q.optionsHi && q.optionsHi.length > 0) {
      return q.optionsHi;
    }
    return q.options || [];
  };

  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [providerCounts, setProviderCounts] = useState<Record<string, number>>({});
  const [loadingProviderCounts, setLoadingProviderCounts] = useState(false);
  /** Service types the customer already asked admin to source in this area */
  const [requestedAreaTypes, setRequestedAreaTypes] = useState<Record<string, boolean>>({});
  const [notifyingDemandFor, setNotifyingDemandFor] = useState<string | null>(null);
  const [selectedServiceType, setSelectedServiceType] = useState<string>(
    route?.params?.serviceType || '',
  );
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireQuestion[]>([]);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, any>>({});
  const [problem, setProblem] = useState('');
  const [addressSel, setAddressSel] = useState<ServiceAddressSelection>(
    emptyAddressSelection({mode: 'saved'}),
  );
  const [addressRefreshKey, setAddressRefreshKey] = useState(0);
  const [selectedAddress, setSelectedAddress] = useState<UserLocation | null>(null);
  const [saveAddressForFuture, setSaveAddressForFuture] = useState(true);
  const [areaProviders, setAreaProviders] = useState<Provider[]>([]);
  const [loadingAreaProviders, setLoadingAreaProviders] = useState(false);
  /** '' = any available provider in area (open request) */
  const [preferredProviderId, setPreferredProviderId] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddAddressModal, setShowAddAddressModal] = useState(false);
  const [showEditAddressModal, setShowEditAddressModal] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [newAddressLabel, setNewAddressLabel] = useState<'home' | 'office' | 'other'>('home');
  const [newAddressCustomLabel, setNewAddressCustomLabel] = useState('');
  const [editingAddress, setEditingAddress] = useState<UserLocation | null>(null);
  const [editPincode, setEditPincode] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editState, setEditState] = useState('');
  const [editLabel, setEditLabel] = useState<'home' | 'office' | 'other'>('home');
  const [editCustomLabel, setEditCustomLabel] = useState('');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [submittedServiceRequestId, setSubmittedServiceRequestId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
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
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info' | 'success';
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info',
  });
  const [activeConflict, setActiveConflict] = useState<
    import('../services/api/serviceRequestsApi').ActiveServiceRequestSummary | null
  >(null);

  useEffect(() => {
    loadServiceCategories();
    loadSavedAddresses();
    setAddressRefreshKey(k => k + 1);
  }, []);

  // Keep legacy selectedAddress in sync with address picker (submit + validation)
  useEffect(() => {
    const a = addressSel.address;
    if (a?.address && a?.pincode) {
      setSelectedAddress(a as UserLocation);
      setSaveAddressForFuture(addressSel.saveForFuture);
    } else if (addressSel.mode === 'new' && !a?.address) {
      // keep previous until valid, or clear if switching to empty new
      if (!addressSel.selectedId) {
        setSelectedAddress(a as UserLocation);
      }
    } else if (addressSel.mode === 'saved' && a?.address) {
      setSelectedAddress(a as UserLocation);
    }
  }, [addressSel]);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    void serviceRequestsApi
      .getById(editId)
      .then(req => {
        if (cancelled || !req) return;
        if (String(req.status || '') !== 'pending') {
          setAlertModal({
            visible: true,
            title: t('common.error'),
            message: t('request.noLongerEditable') || t('request.editNotAllowed'),
            type: 'warning',
          });
          navigation.goBack();
          return;
        }
        setSelectedServiceType(req.serviceType || '');
        setProblem(req.problem || '');
        if (req.questionnaireAnswers && typeof req.questionnaireAnswers === 'object') {
          setQuestionnaireAnswers(req.questionnaireAnswers);
        }
        const ca = req.customerAddress || ({} as any);
        setAddressSel(
          emptyAddressSelection({
            mode: 'saved',
            saveForFuture: false,
            selectedId: null,
            address: {
              address: ca.address || '',
              landmark: ca.landmark || '',
              city: ca.district || ca.city || '',
              district: ca.district || ca.city || '',
              state: ca.state || '',
              stateId: ca.stateId || '',
              districtId: ca.districtId || '',
              pincode: ca.pincode || '',
              latitude: ca.latitude,
              longitude: ca.longitude,
            },
          }),
        );
        const photoUrls = (Array.isArray(req.photos) ? req.photos : [])
          .map(p => (typeof p === 'string' ? p : (p as any)?.url))
          .filter((u): u is string => Boolean(u) && /^https?:\/\//i.test(String(u)));
        if (photoUrls.length) setPhotos(photoUrls);
        if (req.providerId) setPreferredProviderId(String(req.providerId));
      })
      .catch(() => {
        if (cancelled) return;
        setAlertModal({
          visible: true,
          title: t('common.error'),
          message: t('request.editNotAllowed') || t('errors.generic'),
          type: 'error',
        });
      });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  const loadAreaProviders = useCallback(async () => {
    if (isTargetedRequest) {
      setAreaProviders([]);
      return;
    }
    const addr = addressSel.address;
    if (!selectedServiceType || !addr?.pincode) {
      setAreaProviders([]);
      setPreferredProviderId('');
      return;
    }
    setLoadingAreaProviders(true);
    try {
      const filters: any = {
        serviceType: selectedServiceType,
      };
      if (addr.districtId) filters.districtId = addr.districtId;
      if (addr.district || addr.city) {
        filters.district = addr.district || addr.city;
      }
      if (addr.pincode) filters.pincode = addr.pincode;
      if (addr.stateId) filters.stateId = addr.stateId;

      let providers = await providersApi.getAll(filters);
      providers = providers.filter(p => p.approvalStatus !== 'rejected');

      // If district filter returned empty, retry with pincode only
      if (providers.length === 0 && addr.pincode) {
        providers = (
          await providersApi.getAll({
            serviceType: selectedServiceType,
            pincode: addr.pincode,
          })
        ).filter(p => p.approvalStatus !== 'rejected');
      }

      setAreaProviders(providers);
      setProviderCounts(prev => ({
        ...prev,
        [selectedServiceType]: providers.length,
      }));
      // Clear preferred if no longer in list
      setPreferredProviderId(prev => {
        if (!prev) return '';
        const stillThere = providers.some(
          p => String(p.id || p._id) === prev,
        );
        return stillThere ? prev : '';
      });
    } catch (e) {
      console.warn('loadAreaProviders failed', e);
      setAreaProviders([]);
    } finally {
      setLoadingAreaProviders(false);
    }
  }, [
    isTargetedRequest,
    selectedServiceType,
    addressSel.address?.pincode,
    addressSel.address?.districtId,
    addressSel.address?.district,
    addressSel.address?.city,
    addressSel.address?.stateId,
  ]);

  useEffect(() => {
    void loadAreaProviders();
  }, [loadAreaProviders]);

  useEffect(() => {
    // Load provider counts for the picker (area-scoped when address is set)
    if (serviceCategories.length > 0) {
      void loadProviderCounts();
    }
    // New area → allow requesting again
    setRequestedAreaTypes({});
  }, [
    serviceCategories,
    addressSel.address?.pincode,
    addressSel.address?.districtId,
    addressSel.address?.district,
    addressSel.address?.city,
  ]);

  useEffect(() => {
    if (showServiceTypeModal && serviceCategories.length > 0) {
      void loadProviderCounts();
    }
  }, [showServiceTypeModal]);

  useEffect(() => {
    if (showAddressModal) {
      // Reload addresses when modal opens
      loadSavedAddresses();
    }
  }, [showAddressModal]);

  const loadProviderCounts = async () => {
    try {
      setLoadingProviderCounts(true);
      const counts: Record<string, number> = {};
      const addr = addressSel.address || selectedAddress;

      await Promise.all(
        serviceCategories.map(async category => {
          try {
            const filters: any = {
              serviceType: category.name,
            };
            if (addr?.districtId) filters.districtId = addr.districtId;
            if ((addr as any)?.district || addr?.city) {
              filters.district = (addr as any)?.district || addr?.city;
            }
            if (addr?.pincode) filters.pincode = addr.pincode;
            if ((addr as any)?.stateId) filters.stateId = (addr as any).stateId;

            let providers = await providersApi.getAll(filters);
            providers = providers.filter(p => p.approvalStatus !== 'rejected');

            // If area filter returned empty, retry with pincode only
            if (providers.length === 0 && addr?.pincode) {
              providers = (
                await providersApi.getAll({
                  serviceType: category.name,
                  pincode: addr.pincode,
                })
              ).filter(p => p.approvalStatus !== 'rejected');
            }

            // Without an address, count approved providers nationwide as a fallback
            if (!addr?.pincode) {
              providers = providers.filter(p => p.approvalStatus === 'approved');
            }

            counts[category.name] = providers.length;
          } catch (error) {
            console.error(`Error fetching providers for ${category.name}:`, error);
            counts[category.name] = 0;
          }
        }),
      );

      setProviderCounts(counts);
    } catch (error) {
      console.error('Error loading provider counts:', error);
    } finally {
      setLoadingProviderCounts(false);
    }
  };

  const loadServiceCategories = async () => {
    try {
      setLoadingCategories(true);
      
      // Increase timeout to 20 seconds and add retry logic
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout loading service categories')), 20000);
      });
      
      let categories;
      try {
        categories = await Promise.race([
          fetchServiceCategories(),
          timeoutPromise,
        ]);
      } catch (timeoutError: any) {
        // On timeout, try once more with a shorter timeout
        console.warn('First attempt timed out, retrying...');
        categories = await Promise.race([
          fetchServiceCategories(),
          new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Timeout loading service categories')), 15000);
          }),
        ]);
      }
      
      setServiceCategories(categories);

      // Prefill service type (locked for specific-provider requests)
      const preferredType =
        lockedServiceType || route?.params?.serviceType || '';
      if (preferredType) {
        const normalized = String(preferredType).trim().toLowerCase();
        const category =
          categories.find(cat => cat.name === preferredType) ||
          categories.find(cat => cat.name?.toLowerCase() === normalized) ||
          categories.find(
            cat =>
              cat.nameHi?.toLowerCase() === normalized ||
              (cat as any).nameEn?.toLowerCase() === normalized,
          );
        if (category) {
          applyServiceType(category);
        } else if (isTargetedRequest) {
          // Provider profession not in catalog — still lock the label for submit
          setSelectedServiceType(preferredType);
          setSelectedCategory({
            id: 'locked',
            name: preferredType,
            icon: 'build',
            color: theme.primary,
            questionnaire: [],
          } as ServiceCategory);
        }
      }
    } catch (error: any) {
      console.error('Error loading service categories:', error);
      // On error or timeout, use default categories to prevent empty screen
      const defaultCategories = DEFAULT_SERVICE_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: `default_${index}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as ServiceCategory[];
      
      setServiceCategories(defaultCategories);

      const preferredType =
        lockedServiceType || route?.params?.serviceType || '';
      if (preferredType) {
        const category = defaultCategories.find(
          cat => cat.name === preferredType || cat.name?.toLowerCase() === preferredType.toLowerCase(),
        );
        if (category) {
          applyServiceType(category);
        } else if (isTargetedRequest) {
          setSelectedServiceType(preferredType);
          setSelectedCategory({
            id: 'locked',
            name: preferredType,
            icon: 'build',
            color: theme.primary,
            questionnaire: [],
          } as ServiceCategory);
        }
      }
      
      // Only show error if it's not a timeout (timeout means we're using defaults)
      if (error.message !== 'Timeout loading service categories') {
        setAlertModal({
          visible: true,
          title: t('common.error'),
          message: t('services.loadCategoriesError'),
          type: 'error',
        });
      }
    } finally {
      setLoadingCategories(false);
    }
  };

  const applyServiceType = (category: ServiceCategory) => {
    setSelectedServiceType(category.name);
    setSelectedCategory(category);
    setQuestionnaire(category.questionnaire || []);
    setQuestionnaireAnswers({});
    setShowServiceTypeModal(false);
  };

  const handleSelectServiceType = (category: ServiceCategory) => {
    // Specific-provider flow: service type is fixed to the provider's profession
    if (isTargetedRequest) {
      return;
    }
    // Service-first (web parity): choose service without waiting for address /
    // area provider counts. Zero-provider assist still runs on submit.
    applyServiceType(category);
  };

  const localizedCategoryName = (category: ServiceCategory | null | undefined, fallback = '') => {
    if (!category) return fallback;
    if (language === 'hi' && category.nameHi) return category.nameHi;
    return category.name || fallback;
  };

  const handleRequestAreaProviders = (category: ServiceCategory) => {
    const addr = (addressSel.address || selectedAddress) as UserLocation | null;
    if (!addr?.pincode) {
      setShowServiceTypeModal(false);
      setAlertModal({
        visible: true,
        title: String(t('common.addressRequired')),
        message: String(t('services.requestProvidersNeedAddress')),
        type: 'warning',
      });
      return;
    }

    if (!currentUser || currentUser.phoneVerified !== true) {
      requirePhoneLogin();
      return;
    }

    const serviceName =
      language === 'hi' && category.nameHi ? category.nameHi : category.name;
    const areaLabel =
      addr.pincode +
      (addr.city || (addr as any).district
        ? ` · ${addr.city || (addr as any).district}`
        : '');
    const message = String(t('services.requestProvidersConfirmMessage'))
      .replace('{{serviceType}}', serviceName)
      .replace('{{area}}', areaLabel);

    setConfirmationModal({
      visible: true,
      title: String(
        t('services.requestProvidersConfirmTitle'),
      ),
      message,
      type: 'info',
      onConfirm: () => {
        setConfirmationModal(prev => ({...prev, visible: false}));
        void (async () => {
          setNotifyingDemandFor(category.name);
          try {
            await serviceRequestsApi.requestAreaProviders({
              serviceType: category.name,
              customerName: currentUser.name || currentUser.displayName || '',
              customerPhone: currentUser.phone || currentUser.phoneNumber || '',
              customerAddress: {
                address: addr.address || '',
                city: addr.city,
                district: (addr as any).district || addr.city,
                state: addr.state,
                pincode: addr.pincode,
                latitude: addr.latitude,
                longitude: addr.longitude,
              },
            });
            setRequestedAreaTypes(prev => ({
              ...prev,
              [category.name]: true,
            }));
            setToastMessage(
              String(
                t('services.requestProvidersSuccess'),
              ).replace('{{serviceType}}', serviceName),
            );
            setShowToast(true);
          } catch (e: any) {
            setAlertModal({
              visible: true,
              title: String(t('common.error')),
              message:
                e?.message ||
                String(
                  t('services.requestProvidersFailed'),
                ),
              type: 'error',
            });
          } finally {
            setNotifyingDemandFor(null);
          }
        })();
      },
    });
  };

  const handleQuestionnaireAnswer = (questionId: string, answer: any) => {
    setQuestionnaireAnswers(prev => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  // Helper function to clean address object (remove undefined and null values)
  const cleanAddressObject = (address: UserLocation | SavedAddress | null): any => {
    if (!address) return null;
    
    const cleaned: any = {};
    
    // Only include fields that are not undefined and not null
    if (address.pincode !== undefined && address.pincode !== null && address.pincode !== '') {
      cleaned.pincode = address.pincode;
    }
    if (address.address !== undefined && address.address !== null && address.address !== '') {
      cleaned.address = address.address;
    }
    if (address.city !== undefined && address.city !== null && address.city !== '') {
      cleaned.city = address.city;
    }
    const anyAddr = address as any;
    if (anyAddr.district) cleaned.district = anyAddr.district;
    if (anyAddr.landmark) cleaned.landmark = anyAddr.landmark;
    if (anyAddr.stateId) cleaned.stateId = anyAddr.stateId;
    if (anyAddr.districtId) cleaned.districtId = anyAddr.districtId;
    if (anyAddr.district && !cleaned.city) cleaned.city = anyAddr.district;
    if (address.state !== undefined && address.state !== null && address.state !== '') {
      cleaned.state = address.state;
    }
    if (address.country !== undefined && address.country !== null && address.country !== '') {
      cleaned.country = address.country;
    }
    if (address.latitude !== undefined && address.latitude !== null) {
      cleaned.latitude = address.latitude;
    }
    if (address.longitude !== undefined && address.longitude !== null) {
      cleaned.longitude = address.longitude;
    }
    
    // Include SavedAddress specific fields
    const savedAddr = address as SavedAddress;
    if (savedAddr.label !== undefined && savedAddr.label !== null) {
      cleaned.label = savedAddr.label;
    }
    if (savedAddr.customLabel !== undefined && savedAddr.customLabel !== null && savedAddr.customLabel !== '') {
      cleaned.customLabel = savedAddr.customLabel;
    }
    if (savedAddr.isDefault !== undefined && savedAddr.isDefault !== null) {
      cleaned.isDefault = savedAddr.isDefault;
    }
    if (savedAddr.id !== undefined && savedAddr.id !== null) {
      cleaned.id = savedAddr.id;
    }
    
    return cleaned;
  };

  // Helper function to remove undefined values from any object
  const removeUndefinedValues = (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    if (Array.isArray(obj)) {
      return obj.map(item => removeUndefinedValues(item)).filter(item => item !== undefined);
    }
    if (typeof obj === 'object') {
      const cleaned: any = {};
      Object.keys(obj).forEach(key => {
        const value = obj[key];
        if (value !== undefined) {
          cleaned[key] = removeUndefinedValues(value);
        }
      });
      return cleaned;
    }
    return obj;
  };

  const loadSavedAddresses = async () => {
    try {
      setLoadingAddresses(true);
      const addresses = await getSavedAddresses();
      setSavedAddresses(addresses);
      // Do not set selectedAddress here — ServiceAddressPicker selects
      // isDefault → id "home" → first (same as customer-web).
    } catch (error) {
      console.error('Error loading saved addresses:', error);
    } finally {
      setLoadingAddresses(false);
    }
  };

  const loadCurrentAddress = async () => {
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Timeout getting location')), 15000);
      });
      
      const location = await Promise.race([
        GeolocationService.getCurrentLocation(),
        timeoutPromise,
      ]);
      
      if (location) {
        const address: UserLocation = {
          pincode: location.pincode,
          address: location.address,
          city: location.city,
          state: location.state,
          country: location.country,
          latitude: location.latitude,
          longitude: location.longitude,
        };
        const cleanedAddress = cleanAddressObject(address);
        setSelectedAddress(cleanedAddress);
        // Open edit modal to allow user to edit and save
        setEditingAddress(cleanedAddress);
        setEditPincode(location.pincode || '');
        setEditAddress(location.address || '');
        setEditCity(location.city || '');
        setEditState(location.state || '');
        setEditLabel('home');
        setEditCustomLabel('');
        setShowEditAddressModal(true);
      }
    } catch (error: any) {
      console.error('Error loading current address:', error);
      // Don't show alert for timeout, just log it
      if (error.message !== 'Timeout getting location') {
        setAlertModal({
          visible: true,
          title: t('common.error'),
          message: t('services.locationError'),
          type: 'error',
        });
      }
    }
  };

  // Fetch address from pincode
  const fetchAddressFromPincode = async (pincode: string) => {
    if (pincode.length !== 6 || !/^\d+$/.test(pincode)) {
      return;
    }

    setIsFetchingAddress(true);
    try {
      const geocodeData = await GeolocationService.geocodePincode(pincode);
      if (geocodeData.address) {
        setEditAddress(geocodeData.address);
        setEditCity(geocodeData.city || '');
        setEditState(geocodeData.state || '');
      }
    } catch (error) {
      console.error('Error fetching address:', error);
    } finally {
      setIsFetchingAddress(false);
    }
  };

  // Auto-detect location for edit
  const handleDetectLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const hasPermission = await GeolocationService.requestLocationPermission();
      if (hasPermission !== 'granted') {
        setAlertModal({
          visible: true,
          title: t('common.permissionRequired'),
          message: t('services.locationPermissionRequired'),
          type: 'warning',
        });
        setIsDetectingLocation(false);
        return;
      }

      const location = await GeolocationService.getCurrentLocation();
      if (location.pincode) {
        setEditPincode(location.pincode);
        if (location.address) {
          setEditAddress(location.address);
          setEditCity(location.city || '');
          setEditState(location.state || '');
        }
      }
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('services.locationError'),
        type: 'error',
      });
    } finally {
      setIsDetectingLocation(false);
    }
  };

  // Handle pincode change
  useEffect(() => {
    if (editPincode.length === 6 && /^\d+$/.test(editPincode)) {
      fetchAddressFromPincode(editPincode);
    }
  }, [editPincode]);

  // Save edited address
  const handleSaveEditedAddress = async () => {
    if (!editPincode.trim() || editPincode.length !== 6) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('services.invalidPincode'),
        type: 'error',
      });
      return;
    }

    if (!editAddress.trim()) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('services.addressRequired'),
        type: 'error',
      });
      return;
    }

    if (editLabel === 'other' && !editCustomLabel.trim()) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('services.customLabelRequired'),
        type: 'error',
      });
      return;
    }

    try {
      // Build address object without undefined values
      const addressToSave: any = {
        pincode: editPincode.trim(),
        address: editAddress.trim(),
        label: editLabel,
        isDefault: savedAddresses.length === 0,
      };

      // Only include fields that have values
      if (editCity.trim()) {
        addressToSave.city = editCity.trim();
      }
      if (editState.trim()) {
        addressToSave.state = editState.trim();
      }
      if (editingAddress?.country) {
        addressToSave.country = editingAddress.country;
      }
      if (editingAddress?.latitude !== undefined) {
        addressToSave.latitude = editingAddress.latitude;
      }
      if (editingAddress?.longitude !== undefined) {
        addressToSave.longitude = editingAddress.longitude;
      }
      if (editLabel === 'other' && editCustomLabel.trim()) {
        addressToSave.customLabel = editCustomLabel.trim();
      }

      // Check if editing existing address
      const existingAddress = editingAddress && (editingAddress as SavedAddress).id;
      
      if (existingAddress) {
        // Update existing address
        await updateAddress(existingAddress, addressToSave);
        await loadSavedAddresses();
        // Update selected address if it was the one being edited
        if (selectedAddress?.id === existingAddress) {
          setSelectedAddress(cleanAddressObject({...addressToSave, id: existingAddress}) as SavedAddress);
        }
        setAlertModal({
          visible: true,
          title: t('common.success'),
          message: t('services.addressUpdated'),
          type: 'success',
        });
      } else {
        // Create new address
        await saveAddress(addressToSave);
        await loadSavedAddresses();
        setSelectedAddress(cleanAddressObject(addressToSave) as SavedAddress);
        setAlertModal({
          visible: true,
          title: t('common.success'),
          message: t('services.addressSaved'),
          type: 'success',
        });
      }

      setShowEditAddressModal(false);
      setEditingAddress(null);
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('services.addressSaveError'),
        type: 'error',
      });
    }
  };

  const handleUseCurrentLocation = async () => {
    await loadCurrentAddress(); // This will open edit modal
  };

  const handleSelectAddress = async (address: SavedAddress) => {
    setSelectedAddress(cleanAddressObject(address) as SavedAddress);
    setShowAddressModal(false);
  };

  const handleSaveCurrentAsAddress = async () => {
    if (!selectedAddress) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('services.noAddressSelected'),
        type: 'error',
      });
      return;
    }

    try {
      // Build address object without undefined values
      const addressToSave: any = {
        pincode: selectedAddress.pincode,
        address: selectedAddress.address,
        label: newAddressLabel,
        isDefault: savedAddresses.length === 0,
      };

      // Only include fields that have values
      if (selectedAddress.city) addressToSave.city = selectedAddress.city;
      if (selectedAddress.state) addressToSave.state = selectedAddress.state;
      if (selectedAddress.country) addressToSave.country = selectedAddress.country;
      if (selectedAddress.latitude !== undefined) addressToSave.latitude = selectedAddress.latitude;
      if (selectedAddress.longitude !== undefined) addressToSave.longitude = selectedAddress.longitude;
      if (newAddressLabel === 'other' && newAddressCustomLabel.trim()) {
        addressToSave.customLabel = newAddressCustomLabel.trim();
      }
      
      await saveAddress(addressToSave);
      await loadSavedAddresses();
      setShowAddAddressModal(false);
      setNewAddressLabel('home');
      setNewAddressCustomLabel('');
      setAlertModal({
        visible: true,
        title: t('common.success'),
        message: t('services.addressSaved'),
        type: 'success',
      });
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('services.addressSaveError'),
        type: 'error',
      });
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    setConfirmationModal({
      visible: true,
      title: t('services.deleteAddress'),
      message: t('services.deleteAddressConfirm'),
      type: 'danger',
      onConfirm: async () => {
        try {
          await deleteAddress(addressId);
          await loadSavedAddresses();
          if (selectedAddress?.id === addressId) {
            setSelectedAddress(null);
          }
          setConfirmationModal({visible: false, title: '', message: '', onConfirm: () => {}});
        } catch (error: any) {
          setConfirmationModal({visible: false, title: '', message: '', onConfirm: () => {}});
          setAlertModal({
            visible: true,
            title: t('common.error'),
            message: error.message || t('services.addressDeleteError'),
            type: 'error',
          });
        }
      },
    });
  };

  const getAddressLabelText = (address: SavedAddress): string => {
    if (address.label === 'home') {
      const translated = t('services.home');
      return typeof translated === 'string' ? translated : 'Home';
    }
    if (address.label === 'office') {
      const translated = t('services.work');
      return typeof translated === 'string' ? translated : 'Work';
    }
    if (address.customLabel) {
      return address.customLabel;
    }
    const translated = t('services.other');
    return typeof translated === 'string' ? translated : 'Other';
  };

  const getAddressLabelIcon = (label: string): string => {
    if (label === 'home') return 'home';
    if (label === 'office') return 'business';
    return 'location-on';
  };

  const ensureCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  };

  const pickRequestPhotoFromCamera = async (): Promise<string | null> => {
    const ok = await ensureCameraPermission();
    if (!ok) return null;
    const result = await launchCamera({
      mediaType: 'photo',
      quality: 0.75,
      saveToPhotos: false,
    });
    if (result.didCancel || result.errorCode) return null;
    return result.assets?.[0]?.uri || null;
  };

  const pickRequestPhotoFromGallery = async (): Promise<string[] | null> => {
    const remaining = 3 - photos.length;
    if (remaining <= 0) return null;
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.75,
      selectionLimit: remaining,
    });
    if (result.didCancel || result.errorCode) return null;
    const uris = (result.assets || [])
      .map(a => a.uri)
      .filter((u): u is string => Boolean(u));
    return uris.length > 0 ? uris : null;
  };

  const onRequestPhotosPicked = (uris: string[]) => {
    const clean = uris.map(u => String(u || '').trim()).filter(Boolean);
    if (clean.length === 0) return;
    setPhotos(prev => [...prev, ...clean].slice(0, 3));
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const requirePhoneLogin = () => {
    setRedirectAfterLogin({
      route: 'ServiceRequest',
      params: route.params,
    });
    setAlertModal({
      visible: true,
      title: t('auth.verifyMobileToBook'),
      message: t('auth.verifyMobileToBookMessage'),
      type: 'warning',
    });
    navigation.navigate('Login');
  };

  const handleSubmit = async (opts?: {requestAdminHelp?: boolean}) => {
    const requestAdminHelp = opts?.requestAdminHelp === true;
    const customerId = currentUser?.id || currentUser?._id;
    const isPhoneVerified = currentUser?.phoneVerified === true;

    // Guests must set/enter PIN before booking (backend JWT session)
    if (!currentUser || !customerId || !isPhoneVerified) {
      requirePhoneLogin();
      return;
    }

    if (!selectedServiceType) {
      setAlertModal({
        visible: true,
        title: t('common.serviceTypeRequired'),
        message: t('common.serviceTypeRequiredMessage'),
        type: 'warning',
      });
      return;
    }

    if (addressSel.mode === 'edit') {
      setAlertModal({
        visible: true,
        title: t('common.warning'),
        message:
          t('services.saveAddressFirst'),
        type: 'warning',
      });
      return;
    }

    if (!selectedAddress || !selectedAddress.pincode || !selectedAddress.address) {
      setAlertModal({
        visible: true,
        title: t('common.addressRequired'),
        message: t('common.addressRequiredMessage'),
        type: 'warning',
      });
      return;
    }

    // Check if selected service type has available providers in area (skip for targeted / admin-assist)
    if (!isTargetedRequest && !requestAdminHelp) {
      const providerCount =
        areaProviders.length || providerCounts[selectedServiceType] || 0;
      if (providerCount === 0) {
        const selectedCat = serviceCategories.find(cat => cat.name === selectedServiceType);
        const serviceName = language === 'hi' && selectedCat?.nameHi ? selectedCat.nameHi : selectedServiceType;
        const messageTemplate = String(
          t('services.providerNotAvailableNotifyAdmin'),
        );
        const message = messageTemplate.replace('{{serviceType}}', serviceName);
        setConfirmationModal({
          visible: true,
          title: String(t('services.providerNotAvailable')),
          message,
          type: 'warning',
          onConfirm: () => {
            setConfirmationModal(prev => ({...prev, visible: false}));
            void handleSubmit({requestAdminHelp: true});
          },
        });
        return;
      }
    }

    // Validate problem flow (primary select + optional free text + follow-ups)
    const submitProblemFlow = resolveProblemFlow(selectedCategory as any);
    const submitPrimaryQ = submitProblemFlow.primary;
    const submitFollowUps = submitProblemFlow.followUps;
    const submitPrimaryAnswer = submitPrimaryQ
      ? questionnaireAnswers[submitPrimaryQ.id]
      : undefined;
    const submitPrimarySelected = Boolean(
      String(submitPrimaryAnswer ?? '').trim(),
    );
    const submitShowMore = submitPrimaryQ
      ? isMoreInfoOption(submitPrimaryAnswer)
      : false;

    if (submitPrimaryQ) {
      if (!submitPrimarySelected) {
        setAlertModal({
          visible: true,
          title: t('common.requiredQuestions'),
          message: String(t('request.selectProblem')),
          type: 'warning',
        });
        return;
      }
      if (submitShowMore && !problem.trim()) {
        setAlertModal({
          visible: true,
          title: t('common.problemDescriptionRequired'),
          message: t('common.problemDescriptionRequiredMessage'),
          type: 'warning',
        });
        return;
      }
      const missingFollowUps = submitFollowUps
        .filter(q => q.required)
        .filter(q => {
          const answer = questionnaireAnswers[q.id];
          if (answer === undefined || answer === null || answer === '') {
            return true;
          }
          if (Array.isArray(answer) && answer.length === 0) {
            return true;
          }
          return false;
        });
      if (missingFollowUps.length > 0) {
        setAlertModal({
          visible: true,
          title: t('common.requiredQuestions'),
          message: `${t('common.requiredQuestions')}:\n\n${missingFollowUps.map(q => `• ${getQuestionText(q)}`).join('\n')}`,
          type: 'warning',
        });
        return;
      }
    } else if (!problem.trim()) {
      setAlertModal({
        visible: true,
        title: t('common.problemDescriptionRequired'),
        message: t('common.problemDescriptionRequiredMessage'),
        type: 'warning',
      });
      return;
    }


    setLoading(true);
    try {
      const customerId = currentUser.id || currentUser._id || '';
      if (!customerId || currentUser.phoneVerified !== true) {
        requirePhoneLogin();
        setLoading(false);
        return;
      }

      const existing = await getActiveServiceRequest(selectedServiceType).catch(
        () => null,
      );
      if (
        existing &&
        isLiveActiveRequest(existing) &&
        (!editId || existing.serviceRequestId !== editId)
      ) {
        setLoading(false);
        setActiveConflict(existing);
        return;
      }

      try {
        await usersApi.updateMe({
          phoneVerified: true,
          phone:
            currentUser.phone ||
            currentUser.phoneNumber ||
            '',
          role: 'customer',
        });
      } catch (userError: any) {
        console.error('Error syncing user profile:', userError);
      }

      // Clean address object - remove undefined and null values
      const cleanAddress = cleanAddressObject(selectedAddress);
      
      if (!cleanAddress || !cleanAddress.pincode || !cleanAddress.address) {
        setAlertModal({
          visible: true,
          title: t('common.invalidAddress'),
          message: t('common.invalidAddressMessage'),
          type: 'error',
        });
        setLoading(false);
        return;
      }

      // Create service request via API
      // Build service request data - ensure no undefined values
      const serviceRequestDataRaw: any = {
        customerId,
        customerName: currentUser.name || 'Customer',
        customerPhone:
          currentUser.phone ||
          currentUser.phoneNumber ||
          '',
        customerAddress: {
          ...cleanAddress,
          label: addressSel.label,
          ...(addressSel.label === 'other' || addressSel.customLabel.trim()
            ? {customLabel: addressSel.customLabel.trim()}
            : {}),
        },
        serviceType: selectedServiceType,
        problem: problem.trim(),
        status: 'pending',
        urgency: 'immediate',
        ...(requestAdminHelp
          ? {requestAdminHelp: true, needsAdminAssignment: true}
          : {}),
      };

      const problemBuilt = buildProblemPayload({
        primary: submitPrimaryQ,
        answers: questionnaireAnswers,
        freeText: problem,
      });
      if (problemBuilt.problem) {
        serviceRequestDataRaw.problem = problemBuilt.problem;
      } else {
        delete serviceRequestDataRaw.problem;
      }
      if (problemBuilt.questionnaireAnswers) {
        serviceRequestDataRaw.questionnaireAnswers =
          problemBuilt.questionnaireAnswers;
      }

      // Web: secondary phone comes from profile, not the request form.
      const profileSecondary = String(
        (currentUser as any)?.secondaryPhone || '',
      )
        .replace(/\D/g, '')
        .slice(-10);
      if (profileSecondary.length === 10) {
        serviceRequestDataRaw.secondaryPhone = `+91${profileSecondary}`;
      }

      if (saveAddressForFuture && cleanAddress) {
        try {
          await rememberServiceAddress({
            ...(cleanAddress as any),
            label: addressSel.label,
            customLabel:
              addressSel.label === 'other'
                ? addressSel.customLabel.trim()
                : undefined,
          });
        } catch (saveErr) {
          console.warn('Could not save address for future', saveErr);
        }
      }

      // Targeted (provider details) or optional dropdown pick on this screen.
      const dropdownProvider =
        !isTargetedRequest && preferredProviderId
          ? areaProviders.find(
              p => String(p.id || p._id) === preferredProviderId,
            )
          : null;
      const assignProvider = isTargetedRequest
        ? targetedProvider
        : dropdownProvider;
      const assignProviderId = isTargetedRequest
        ? targetedProviderId
        : preferredProviderId || null;

      if (assignProviderId && assignProvider) {
        serviceRequestDataRaw.providerId = String(assignProviderId);
        serviceRequestDataRaw.providerName = assignProvider?.name || '';
        const phone =
          (assignProvider as any)?.phone ||
          (assignProvider as any)?.phoneNumber ||
          (assignProvider as any)?.primaryPhone ||
          '';
        if (phone) {
          serviceRequestDataRaw.providerPhone = phone;
        }
        const specialization =
          (assignProvider as any)?.specialization ||
          (assignProvider as any)?.specialty ||
          (assignProvider as any)?.serviceType ||
          selectedServiceType;
        if (specialization) {
          serviceRequestDataRaw.providerSpecialization = specialization;
        }
        if ((assignProvider as any)?.rating != null) {
          serviceRequestDataRaw.providerRating = (assignProvider as any).rating;
        }
        const image =
          (assignProvider as any)?.image ||
          (assignProvider as any)?.photoURL ||
          (assignProvider as any)?.profileImage;
        if (image) {
          serviceRequestDataRaw.providerImage = image;
        }
      } else {
        // Explicitly keep open requests unassigned until a provider accepts
        delete serviceRequestDataRaw.providerId;
        delete serviceRequestDataRaw.providerName;
        delete serviceRequestDataRaw.providerPhone;
        delete serviceRequestDataRaw.providerSpecialization;
        delete serviceRequestDataRaw.providerRating;
        delete serviceRequestDataRaw.providerImage;
      }


      // Photos uploaded after clean — never send local file:// URIs
      if (photos.length > 0) {
        serviceRequestDataRaw.photos = await uploadRequestPhotos(
          photos.filter(Boolean),
        );
      }

      // questionnaireAnswers already set via buildProblemPayload when present

      // Remove all undefined values before saving
      const serviceRequestData = removeUndefinedValues(serviceRequestDataRaw);

      const created = editId
        ? await serviceRequestsApi.update(editId, serviceRequestData)
        : await serviceRequestsApi.create({
        ...serviceRequestData,
      });
      const serviceRequestId =
        (created as any)?._id ||
        (created as any)?.id ||
        (created as any)?.consultationId ||
        '';
      console.log('✅ Service request created in MongoDB:', serviceRequestId);

      if (!serviceRequestId) {
        throw new Error('Service request created but no id returned');
      }

      try {
        await addServiceRequest(created as any);
      } catch (e) {
        console.warn('Could not cache service request locally:', e);
      }

      // Provider + admin notifications are handled by the backend on create
      // (area-scoped providers + admin realtime/FCM). Do not emit from the client.

      // Show toast notification
      setSubmittedServiceRequestId(serviceRequestId);
      setToastMessage(
        isTargetedRequest
          ? String(t('services.requestSentToProvider'))
          : requestAdminHelp
            ? String(
                t('services.adminNotifiedForUnavailable'),
              )
            : String(
                t('services.requestSubmittedProvidersNotified'),
              ),
      );
      setShowToast(true);
      
      // Navigate to ActiveService after a short delay
      setTimeout(() => {
        if (serviceRequestId) {
          navigation.navigate('ActiveService', {
            serviceRequestId: serviceRequestId,
          });
          setSubmittedServiceRequestId(null);
        }
      }, 2000);
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('services.submitError'),
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const problemFlow = useMemo(
    () => resolveProblemFlow(selectedCategory as any),
    [selectedCategory],
  );
  const primaryProblemQ = problemFlow.primary;
  const followUpQs = problemFlow.followUps;
  const primaryAnswer = primaryProblemQ
    ? questionnaireAnswers[primaryProblemQ.id]
    : undefined;
  const primarySelected = Boolean(String(primaryAnswer ?? '').trim());
  const showProblemDetails = primaryProblemQ
    ? isMoreInfoOption(primaryAnswer)
    : false;
  const followUpComplete = !followUpQs.some(q => {
    if (!q.required) return false;
    const a = questionnaireAnswers[q.id];
    if (a === undefined || a === '' || a === null) return true;
    if (Array.isArray(a) && a.length === 0) return true;
    return false;
  });
  const problemFlowComplete = primaryProblemQ
    ? primarySelected && (!showProblemDetails || Boolean(problem.trim())) && followUpComplete
    : Boolean(problem.trim());

  const popularCategories = useMemo(() => {
    const cats = serviceCategories.filter(c => c.name);
    const popular = cats.filter(c => Boolean((c as {isPopular?: boolean}).isPopular));
    const list = popular.length ? popular : cats.slice(0, 8);
    const rank = (name: string) => {
      const k = name.toLowerCase();
      if (k.includes('plumb')) return 0;
      if (k.includes('electric')) return 1;
      return 9;
    };
    return [...list]
      .sort(
        (a, b) =>
          rank(a.name) - rank(b.name) ||
          (a.order ?? 999) - (b.order ?? 999) ||
          a.name.localeCompare(b.name),
      )
      .slice(0, 6);
  }, [serviceCategories]);

  const primarySelectOptions = useMemo(() => {
    if (!primaryProblemQ?.options?.length) return [];
    return primaryProblemQ.options.map((opt, i) => ({
      value: opt,
      label:
        language === 'hi' && primaryProblemQ.optionsHi?.[i]
          ? primaryProblemQ.optionsHi[i]
          : opt,
    }));
  }, [primaryProblemQ, language]);

  const problemHeading =
    language === 'hi'
      ? primaryProblemQ?.questionHi ||
        primaryProblemQ?.question ||
        String(t('request.problemRequired'))
      : primaryProblemQ?.question || String(t('request.problemRequired'));

  const canSubmit =
    Boolean(selectedServiceType) &&
    Boolean(selectedAddress?.address) &&
    Boolean(selectedAddress?.pincode) &&
    problemFlowComplete &&
    !loading &&
    addressSel.mode !== 'edit';

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}>
      {/* Header — web request.pageTitle / pageSub */}
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.text}]}>
          {editId ? t('request.editTitle') : t('request.pageTitle')}
        </Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          {isTargetedRequest
            ? String(
                t('services.requestSpecificProviderSubtitle') ||
                  `Requesting ${targetedProvider?.name || 'this provider'}`,
              )
            : t('request.pageSub')}
        </Text>
      </View>

      {isTargetedRequest && targetedProvider ? (
        <View style={styles.step}>
          <CrystalSurface
            primary={theme.primary}
            card={theme.card}
            isDark={isDarkMode}
            radius={16}
            style={styles.stepCardFlat}
            contentStyle={styles.stepCardInner}>
            <Text style={[{color: theme.textSecondary, fontSize: 12, marginBottom: 4}]}>
              {t('services.selectedProvider')}
            </Text>
            <Text style={[{color: theme.text, fontSize: 15, fontWeight: '600'}]}>
              {targetedProvider.name || t('services.selectedProvider')}
            </Text>
            <Text style={[{color: theme.textSecondary, fontSize: 13, marginTop: 4}]}>
              {String(t('services.requestGoesToThisProvider'))}
            </Text>
          </CrystalSurface>
        </View>
      ) : null}

      {/* 1. Service first */}
      <View style={styles.step}>
        {selectedServiceType ? (
          <CrystalSurface
            primary={theme.primary}
            card={theme.card}
            isDark={isDarkMode}
            radius={16}
            style={styles.stepCardFlat}
            contentStyle={styles.stepCardInner}>
            <TouchableOpacity
              style={styles.serviceSelectedRow}
              activeOpacity={isTargetedRequest ? 1 : 0.7}
              disabled={isTargetedRequest}
              onPress={() => {
                if (!isTargetedRequest) setShowServiceTypeModal(true);
              }}>
              <View style={styles.serviceSelectedMain}>
                <View
                  style={[
                    styles.categoryIconWrap,
                    {backgroundColor: `${theme.primary}24`},
                  ]}>
                  <Icon
                    name={toSafeMaterialIcon(
                      selectedCategory?.icon,
                      selectedCategory?.name || selectedServiceType,
                    )}
                    size={22}
                    color={selectedCategory?.color || theme.primary}
                  />
                </View>
                <Text
                  style={[styles.serviceSelectedName, {color: theme.text}]}
                  numberOfLines={2}>
                  {localizedCategoryName(selectedCategory, selectedServiceType)}
                </Text>
              </View>
              {isTargetedRequest ? (
                <Icon name="lock" size={18} color={theme.textSecondary} />
              ) : (
                <Text style={[styles.changeService, {color: theme.primary}]}>
                  {t('request.changeService')}
                </Text>
              )}
            </TouchableOpacity>
          </CrystalSurface>
        ) : (
          <View style={styles.serviceEntry}>
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => setShowServiceTypeModal(true)}>
              <CrystalSurface
                primary={theme.primary}
                card={theme.card}
                isDark={isDarkMode}
                radius={14}
                contentStyle={styles.serviceSearchCta}>
                <Icon name="search" size={20} color={theme.textSecondary} />
                <Text
                  style={[styles.serviceSearchLabel, {color: theme.textSecondary}]}
                  numberOfLines={1}>
                  {t('request.chooseServiceCta')}
                </Text>
              </CrystalSurface>
            </TouchableOpacity>
            {!editId && popularCategories.length > 0 ? (
              <View style={styles.serviceGrid}>
                {popularCategories.map(c => (
                  <TouchableOpacity
                    key={c.id || c.name}
                    style={styles.serviceTile}
                    activeOpacity={0.8}
                    onPress={() => applyServiceType(c)}>
                    <CrystalSurface
                      primary={theme.primary}
                      card={theme.card}
                      isDark={isDarkMode}
                      accent
                      radius={18}
                      style={styles.serviceTileSurface}
                      contentStyle={styles.serviceTileInner}>
                      <View
                        style={[
                          styles.serviceTileIcon,
                          {backgroundColor: `${theme.primary}24`},
                        ]}>
                        <Icon
                          name={toSafeMaterialIcon(c.icon, c.name)}
                          size={22}
                          color={c.color || theme.primary}
                        />
                      </View>
                      <Text
                        style={[styles.serviceTileName, {color: theme.text}]}
                        numberOfLines={2}>
                        {localizedCategoryName(c)}
                      </Text>
                    </CrystalSurface>
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </View>

      {/* 2. Problem — only after service */}
      {selectedServiceType ? (
        <View style={styles.step}>
          <Text style={[styles.stepHeading, {color: theme.text}]}>
            {problemHeading}
          </Text>
          <CrystalSurface
            primary={theme.primary}
            card={theme.card}
            isDark={isDarkMode}
            radius={16}
            style={styles.stepCardFlat}
            contentStyle={styles.stepCardInner}>
            {primaryProblemQ ? (
              <Select
                variant="crystal"
                colors={{
                  card: isDarkMode
                    ? 'rgba(255,255,255,0.12)'
                    : 'rgba(255,255,255,0.72)',
                }}
                style={{marginBottom: 0}}
                options={primarySelectOptions}
                value={String(primaryAnswer ?? '')}
                onChange={v =>
                  handleQuestionnaireAnswer(primaryProblemQ.id, v)
                }
                placeholder={String(t('request.selectProblem'))}
                title={String(t('request.selectProblem'))}
              />
            ) : null}

            {showProblemDetails ? (
              <View style={styles.problemMore}>
                <Text style={[styles.fieldLabel, {color: theme.text}]}>
                  {t('request.tellUsMore')}
                </Text>
                <TextInput
                  style={[
                    styles.problemInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: 'transparent',
                    },
                  ]}
                  value={problem}
                  onChangeText={text => setProblem(text.slice(0, 500))}
                  placeholder={String(t('request.problemPlaceholder'))}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={2}
                  maxLength={500}
                />
                <Text style={[styles.charCount, {color: theme.textSecondary}]}>
                  {problem.length}/500
                </Text>
              </View>
            ) : null}

            {followUpQs.length > 0 ? (
              <View style={styles.followUps}>
                <ServiceQuestionnaireFields
                  questions={followUpQs as QuestionnaireQuestion[]}
                  answers={questionnaireAnswers}
                  onChange={handleQuestionnaireAnswer}
                  theme={theme}
                  language={language}
                  title=""
                  subtitle=""
                  yesLabel={String(t('common.yes'))}
                  noLabel={String(t('common.no'))}
                  selectPlaceholder={String(t('request.selectProblem'))}
                  textPlaceholder={String(t('services.enterYourAnswer'))}
                  numberPlaceholder={String(t('services.enterANumber'))}
                  crystalSelect
                  isDark={isDarkMode}
                />
              </View>
            ) : null}
          </CrystalSurface>
        </View>
      ) : null}

      {/* 3. Address — only after service */}
      {selectedServiceType ? (
        <View style={styles.step}>
          <Text style={[styles.stepHeading, {color: theme.text}]}>
            {t('request.serviceAddress')}
          </Text>
          <CrystalSurface
            primary={theme.primary}
            card={theme.card}
            isDark={isDarkMode}
            radius={16}
            style={styles.stepCardFlat}
            contentStyle={styles.stepCardInner}>
            <ServiceAddressPicker
              theme={theme}
              value={addressSel}
              onChange={setAddressSel}
              t={t as any}
              refreshKey={addressRefreshKey}
            />
          </CrystalSurface>
        </View>
      ) : null}

      {/* Photos optional — web PhotoAttachments parity */}
      {selectedServiceType ? (
        <View style={styles.step}>
          <Text style={[styles.stepHeading, {color: theme.text}]}>
            {t('request.photosOptional')}
          </Text>
          <Text style={[styles.photosHint, {color: theme.textSecondary}]}>
            {t('request.photosHint', {max: 3})}
          </Text>
          <CrystalSurface
            primary={theme.primary}
            card={theme.card}
            isDark={isDarkMode}
            radius={16}
            style={styles.stepCardFlat}
            contentStyle={styles.stepCardInner}>
            {photos.length > 0 && (
              <View style={styles.photosContainer}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoWrapper}>
                    <Image source={{uri: photo}} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => handleRemovePhoto(index)}>
                      <Icon name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
            {photos.length < 3 ? (
              <MobilePhotoPicker
                layout="stack"
                cameraLabel={String(t('photo.takePhoto') || 'Take photo')}
                galleryLabel={String(
                  t('photo.chooseGallery') || 'Choose from gallery',
                )}
                onPickCamera={pickRequestPhotoFromCamera}
                onPickGallery={pickRequestPhotoFromGallery}
                onChange={onRequestPhotosPicked}
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
          </CrystalSurface>
        </View>
      ) : null}

      {/* Submit */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          {
            backgroundColor: canSubmit ? theme.primary : theme.border,
            opacity: canSubmit ? 1 : 0.5,
          },
        ]}
        onPress={handleSubmit}
        disabled={!canSubmit}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>
              {editId ? t('request.saveChanges') : t('request.submit')}
            </Text>
            <Icon name="arrow-forward" size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>

      {/* Service Type Modal — web ServiceSelectionModal parity */}
      <ServiceSelectionModal
        open={showServiceTypeModal}
        onClose={() => setShowServiceTypeModal(false)}
        categories={serviceCategories}
        selectedName={selectedServiceType || undefined}
        onSelect={handleSelectServiceType}
        theme={theme}
        isDark={isDarkMode}
        language={language}
      />

      {/* Address Selection Modal */}
      <Modal
        visible={showAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddressModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                Select Address
              </Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addressListContainer} showsVerticalScrollIndicator={false}>
              {loadingAddresses ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={theme.primary} />
                  <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
                    Loading addresses...
                  </Text>
                </View>
              ) : savedAddresses.length > 0 ? (
                savedAddresses.map(address => (
                  <TouchableOpacity
                    key={address.id}
                    style={[
                      styles.savedAddressItem,
                      {
                        backgroundColor:
                          selectedAddress?.id === address.id
                            ? theme.primary + '20'
                            : theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => handleSelectAddress(address)}>
                    <View style={styles.addressItemContent}>
                      <View
                        style={[
                          styles.addressLabelIcon,
                          {backgroundColor: theme.primary + '20'},
                        ]}>
                        <Icon
                          name={getAddressLabelIcon(address.label)}
                          size={24}
                          color={theme.primary}
                        />
                      </View>
                      <View style={styles.addressItemText}>
                        <View style={styles.addressItemHeader}>
                          <Text style={[styles.addressLabelText, {color: theme.text}]}>
                            {getAddressLabelText(address)}
                          </Text>
                          {address.isDefault && (
                            <View style={styles.defaultBadge}>
                              <Text style={styles.defaultBadgeText}>Default</Text>
                            </View>
                          )}
                        </View>
                        <Text
                          style={[styles.addressItemAddress, {color: theme.textSecondary}]}
                          numberOfLines={2}>
                          {address.address}
                        </Text>
                        <Text style={[styles.addressItemDetails, {color: theme.textSecondary}]}>
                          {address.pincode}
                          {address.city && `, ${address.city}`}
                          {address.state && `, ${address.state}`}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.addressItemActions}>
                      {selectedAddress?.id === address.id && (
                        <Icon name="check-circle" size={24} color={theme.primary} />
                      )}
                      <TouchableOpacity
                        onPress={() => {
                          setEditingAddress(address);
                          setEditPincode(address.pincode || '');
                          setEditAddress(address.address || '');
                          setEditCity(address.city || '');
                          setEditState(address.state || '');
                          setEditLabel(address.label || 'home');
                          setEditCustomLabel(address.customLabel || '');
                          setShowAddressModal(false);
                          setShowEditAddressModal(true);
                        }}
                        style={styles.editButton}>
                        <Icon name="edit" size={20} color={theme.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDeleteAddress(address.id!)}
                        style={styles.deleteButton}>
                        <Icon name="delete-outline" size={20} color={theme.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon name="location-off" size={48} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, {color: theme.textSecondary}]}>
                    {t('services.noSavedAddresses')}
                  </Text>
                  <Text style={[styles.emptySubtext, {color: theme.textSecondary}]}>
                    {t('services.addAddressToGetStarted')}
                  </Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.addressModalFooter}>
              <TouchableOpacity
                style={[styles.addAddressButton, {borderColor: theme.border}]}
                onPress={() => {
                  if (selectedAddress) {
                    setShowAddAddressModal(true);
                  } else {
                    handleUseCurrentLocation();
                  }
                }}>
                <Icon name="add-location" size={20} color={theme.primary} />
                <Text style={[styles.addAddressText, {color: theme.primary}]}>
                  {selectedAddress
                    ? t('services.saveCurrentAddress')
                    : t('services.useCurrentLocation')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Address Modal */}
      <Modal
        visible={showAddAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAddAddressModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                {t('services.saveAddress')}
              </Text>
              <TouchableOpacity onPress={() => setShowAddAddressModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {selectedAddress && (
              <View style={styles.addressPreview}>
                <Icon name="location-on" size={20} color={theme.primary} />
                <View style={styles.addressPreviewText}>
                  <Text style={[styles.addressPreviewLine, {color: theme.text}]}>
                    {selectedAddress.address}
                  </Text>
                  <Text style={[styles.addressPreviewDetails, {color: theme.textSecondary}]}>
                    {selectedAddress.pincode}
                    {selectedAddress.city && `, ${selectedAddress.city}`}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.labelSection}>
              <Text style={[styles.label, {color: theme.text}]}>{t('services.addressLabel')}</Text>
              <View style={styles.labelOptions}>
                {(['home', 'office', 'other'] as const).map(label => (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.labelOption,
                      {
                        backgroundColor:
                          newAddressLabel === label ? theme.primary : theme.background,
                        borderColor: theme.border,
                      },
                    ]}
                    onPress={() => setNewAddressLabel(label)}>
                    <Icon
                      name={getAddressLabelIcon(label)}
                      size={20}
                      color={newAddressLabel === label ? '#fff' : theme.text}
                    />
                    <Text
                      style={[
                        styles.labelOptionText,
                        {
                          color: newAddressLabel === label ? '#fff' : theme.text,
                        },
                      ]}>
                      {label === 'home'
                        ? t('services.home')
                        : label === 'office'
                          ? t('services.office')
                          : t('services.other')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {newAddressLabel === 'other' && (
              <View style={styles.section}>
                <Text style={[styles.label, {color: theme.text}]}>
                  {t('services.customLabel')}
                </Text>
                <TextInput
                  style={[
                    styles.customLabelInput,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={newAddressCustomLabel}
                  onChangeText={setNewAddressCustomLabel}
                  placeholder="E.g., Mom's House, Warehouse"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, {borderColor: theme.border}]}
                onPress={() => setShowAddAddressModal(false)}>
                <Text style={[styles.cancelButtonText, {color: theme.text}]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      newAddressLabel === 'other' && !newAddressCustomLabel.trim()
                        ? theme.border
                        : theme.primary,
                    opacity:
                      newAddressLabel === 'other' && !newAddressCustomLabel.trim() ? 0.5 : 1,
                  },
                ]}
                onPress={handleSaveCurrentAsAddress}
                disabled={newAddressLabel === 'other' && !newAddressCustomLabel.trim()}>
                <Text style={styles.saveButtonText}>{t('services.saveAddress')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Address Modal */}
      <Modal
        visible={showEditAddressModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditAddressModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                {t('services.editAddress')}
              </Text>
              <TouchableOpacity onPress={() => setShowEditAddressModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editAddressScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.labelSection}>
                <Text style={[styles.label, {color: theme.text}]}>{t('services.addressType')} *</Text>
                <View style={styles.labelOptions}>
                  {(['home', 'office', 'other'] as const).map(label => (
                    <TouchableOpacity
                      key={label}
                      style={[
                        styles.labelOption,
                        {
                          backgroundColor:
                            editLabel === label ? theme.primary : theme.background,
                          borderColor: theme.border,
                        },
                      ]}
                      onPress={() => setEditLabel(label)}>
                      <Icon
                        name={getAddressLabelIcon(label)}
                        size={20}
                        color={editLabel === label ? '#fff' : theme.text}
                      />
                      <Text
                        style={[
                          styles.labelOptionText,
                          {
                            color: editLabel === label ? '#fff' : theme.text,
                          },
                        ]}>
                        {label === 'home' ? t('services.home') : label === 'office' ? t('services.work') : t('services.other')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {editLabel === 'other' && (
                <View style={styles.section}>
                  <Text style={[styles.label, {color: theme.text}]}>{t('services.customLabel')}</Text>
                  <TextInput
                    style={[
                      styles.customLabelInput,
                      {
                        backgroundColor: theme.background,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    value={editCustomLabel}
                    onChangeText={setEditCustomLabel}
                    placeholder={t('services.customLabelPlaceholder')}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              )}

              <View style={styles.section}>
                <Text style={[styles.label, {color: theme.text}]}>{t('services.pincode')} *</Text>
                <View style={styles.pincodeContainer}>
                  <TextInput
                    style={[
                      styles.pincodeInput,
                      {
                        backgroundColor: theme.background,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    value={editPincode}
                    onChangeText={setEditPincode}
                    placeholder={t('services.enterPincode')}
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                    maxLength={6}
                  />
                  <TouchableOpacity
                    style={[styles.detectButton, {backgroundColor: theme.primary}]}
                    onPress={handleDetectLocation}
                    disabled={isDetectingLocation}>
                    {isDetectingLocation ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Icon name="my-location" size={20} color="#fff" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {isFetchingAddress && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
                    {t('services.fetchingAddress')}
                  </Text>
                </View>
              )}

              <View style={styles.section}>
                <Text style={[styles.label, {color: theme.text}]}>Address *</Text>
                <TextInput
                  style={[
                    styles.addressInputField,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={editAddress}
                  onChangeText={setEditAddress}
                  placeholder={t('services.addressPlaceholder')}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  editable={!isFetchingAddress}
                />
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, {color: theme.text}]}>{t('services.city')}</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={editCity}
                  onChangeText={setEditCity}
                  placeholder={t('services.city')}
                  placeholderTextColor={theme.textSecondary}
                  editable={!isFetchingAddress}
                />
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, {color: theme.text}]}>{t('services.state')}</Text>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      backgroundColor: theme.background,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={editState}
                  onChangeText={setEditState}
                  placeholder={t('services.state')}
                  placeholderTextColor={theme.textSecondary}
                  editable={!isFetchingAddress}
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelButton, {borderColor: theme.border}]}
                onPress={() => {
                  setShowEditAddressModal(false);
                  setEditingAddress(null);
                }}>
                <Text style={[styles.cancelButtonText, {color: theme.text}]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  {
                    backgroundColor:
                      editLabel === 'other' && !editCustomLabel.trim()
                        ? theme.border
                        : theme.primary,
                    opacity:
                      editLabel === 'other' && !editCustomLabel.trim() ? 0.5 : 1,
                  },
                ]}
                onPress={handleSaveEditedAddress}
                disabled={editLabel === 'other' && !editCustomLabel.trim()}>
                <Text style={styles.saveButtonText}>{t('services.saveAddress')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date/Time Picker Modal */}

      {/* Toast Notification */}
      <Toast
        visible={showToast}
        message={toastMessage}
        type="success"
        duration={3000}
        onHide={() => setShowToast(false)}
      />
      
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({visible: false, title: '', message: '', type: 'info'})}
      />
      
      <ConfirmationModal
        visible={confirmationModal.visible}
        title={confirmationModal.title}
        message={confirmationModal.message}
        type={confirmationModal.type || 'info'}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        onConfirm={() => {
          confirmationModal.onConfirm();
        }}
        onCancel={() => setConfirmationModal({visible: false, title: '', message: '', onConfirm: () => {}})}
      />
      {activeConflict ? (
        <ActiveRequestConflictBanner
          active={activeConflict}
          onDismiss={() => setActiveConflict(null)}
          onView={action => {
            setActiveConflict(null);
            if (action.screen === 'ActiveService') {
              navigation.navigate('ActiveService', action.params);
            } else {
              navigation.navigate('ServiceHistory');
            }
          }}
        />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  step: {
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  stepHeading: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  photosHint: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  /** Android elevation draws a hard outline — web crystal cards have no border */
  stepCardFlat: {
    elevation: 0,
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: {width: 0, height: 2},
  },
  stepCardInner: {
    padding: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  section: {
    paddingHorizontal: 14,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  serviceEntry: {
    gap: 10,
  },
  serviceSearchCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  serviceSearchLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  serviceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  serviceTile: {
    width: '48%',
    flexGrow: 1,
    maxWidth: '48.5%',
  },
  serviceTileSurface: {
    width: '100%',
  },
  serviceTileInner: {
    minHeight: 100,
    maxHeight: 120,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  serviceTileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceTileName: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 16,
  },
  serviceSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    minHeight: 44,
  },
  serviceSelectedMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serviceSelectedName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  changeService: {
    fontSize: 13,
    fontWeight: '600',
  },
  serviceTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  selectedServiceType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serviceTypeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 16,
  },
  problemMore: {
    marginTop: 10,
  },
  followUps: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(100,116,139,0.35)',
  },
  problemInput: {
    borderWidth: 0,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'right',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  photoWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  addressContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  addressText: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  addressLine: {
    fontSize: 16,
    fontWeight: '500',
  },
  addressDetails: {
    fontSize: 14,
    marginTop: 4,
  },


  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 40,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 17,
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
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  categorySelectArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
  categoryNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  providerCountBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  providerCountText: {
    fontSize: 12,
    fontWeight: '600',
  },
  requestProvidersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 88,
  },
  requestProvidersButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  countLoader: {
    marginLeft: 8,
  },
  categoryDescription: {
    fontSize: 14,
    marginTop: 2,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  useCurrentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  useCurrentLocationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  addressListContainer: {
    maxHeight: 400,
    marginBottom: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  savedAddressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  addressItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  addressLabelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressItemText: {
    flex: 1,
  },
  addressItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  addressLabelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  defaultBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  addressItemAddress: {
    fontSize: 14,
    marginBottom: 4,
  },
  addressItemDetails: {
    fontSize: 12,
  },
  addressItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
    marginRight: 4,
  },
  deleteButton: {
    padding: 4,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
  },
  addressModalFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  addAddressButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  addAddressText: {
    fontSize: 16,
    fontWeight: '500',
  },
  addressPreview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    marginBottom: 20,
    gap: 12,
  },
  addressPreviewText: {
    flex: 1,
  },
  addressPreviewLine: {
    fontSize: 14,
    marginBottom: 4,
  },
  addressPreviewDetails: {
    fontSize: 12,
  },
  labelSection: {
    marginBottom: 20,
  },
  labelOptions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  labelOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  labelOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  customLabelInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  editAddressScrollView: {
    maxHeight: 500,
  },
  pincodeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  pincodeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
  },
  detectButton: {
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 50,
  },
  addressInputField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 80,
    textAlignVertical: 'top',
    marginTop: 8,
  },
  inputField: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    marginTop: 8,
  },



  modalCloseButton: {
    padding: 4,
  },










  // Questionnaire styles
  sectionHeader: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubheader: {
    fontSize: 14,
    marginBottom: 16,
  },
  questionContainer: {
    marginBottom: 20,
  },
  questionText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 12,
    lineHeight: 22,
  },
  requiredStar: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  questionInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  booleanButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  booleanButton: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  booleanButtonSelected: {
    // Styles applied when selected
  },
  booleanButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectOptions: {
    gap: 10,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  selectOptionText: {
    fontSize: 15,
    flex: 1,
  },
});

