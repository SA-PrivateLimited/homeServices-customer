/**
 * Service Request Screen
 * Customer app - Request a home service (Ola/Uber style)
 * Simple flow: Select service → Describe problem → Choose address → Submit
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
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary} from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
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
  type SavedAddress,
} from '../services/addressService';
import type {UserLocation} from '../types/common';
import WebSocketService from '../services/websocketService';
import Toast from '../components/Toast';
import useTranslation from '../hooks/useTranslation';
import AlertModal from '../components/AlertModal';
import ConfirmationModal from '../components/ConfirmationModal';
import {serviceRequestsApi} from '../services/api/serviceRequestsApi';
import {usersApi} from '../services/api/usersApi';
import {providersApi} from '../services/api/providersApi';

interface ServiceRequestScreenProps {
  navigation: any;
  route?: {
    params?: {
      serviceType?: string;
    };
  };
}

export default function ServiceRequestScreen({
  navigation,
  route,
}: ServiceRequestScreenProps) {
  const {isDarkMode, currentUser, currentPincode, language} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  
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
  const [selectedServiceType, setSelectedServiceType] = useState<string>(
    route?.params?.serviceType || '',
  );
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null);
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireQuestion[]>([]);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState<Record<string, any>>({});
  const [problem, setProblem] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<UserLocation | null>(null);
  const [urgency, setUrgency] = useState<'immediate' | 'scheduled'>('immediate');
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [scheduledTime, setScheduledTime] = useState<string>('');
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
  const [showDateTimeModal, setShowDateTimeModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempScheduledDate, setTempScheduledDate] = useState<Date>(new Date());
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

  useEffect(() => {
    loadServiceCategories();
    loadSavedAddresses();
  }, []);

  useEffect(() => {
    // Load provider counts when service categories are loaded
    if (serviceCategories.length > 0) {
      loadProviderCounts();
    }
  }, [serviceCategories]);

  useEffect(() => {
    if (currentPincode && !selectedAddress) {
      // Try to auto-detect address
      // Add a small delay to prevent race conditions
      const timer = setTimeout(() => {
        loadCurrentAddress();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPincode]);

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
      
      // Fetch provider counts for each service category
      await Promise.all(
        serviceCategories.map(async (category) => {
          try {
            const providers = await providersApi.getAll({
              serviceType: category.name,
              // Only count approved providers
            });
            // Filter for approved providers only
            const approvedProviders = providers.filter(
              (p) => p.approvalStatus === 'approved'
            );
            counts[category.name] = approvedProviders.length;
          } catch (error) {
            console.error(`Error fetching providers for ${category.name}:`, error);
            counts[category.name] = 0;
          }
        })
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

      // If service type was pre-selected, load its questionnaire
      if (route?.params?.serviceType) {
        const category = categories.find(cat => cat.name === route.params.serviceType);
        if (category) {
          handleSelectServiceType(category);
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

  const handleSelectServiceType = (category: ServiceCategory) => {
    const count = providerCounts[category.name] || 0;
    
    // Check if provider count is zero
    if (count === 0) {
      const serviceName = language === 'hi' && category.nameHi ? category.nameHi : category.name;
      const messageTemplate = String(t('services.providerNotAvailableMessage'));
      const message = messageTemplate.replace('{{serviceType}}', serviceName);
      setAlertModal({
        visible: true,
        title: String(t('services.providerNotAvailable')),
        message: message,
        type: 'warning',
      });
      return;
    }
    
    setSelectedServiceType(category.name);
    setSelectedCategory(category);
    setQuestionnaire(category.questionnaire || []);
    setQuestionnaireAnswers({});
    setShowServiceTypeModal(false);
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
      
      // Set default address if available
      const defaultAddress = addresses.find(addr => addr.isDefault);
      if (defaultAddress) {
        setSelectedAddress(cleanAddressObject(defaultAddress) as SavedAddress);
      } else if (addresses.length > 0) {
        // Use first address if no default
        setSelectedAddress(cleanAddressObject(addresses[0]) as SavedAddress);
      }
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
          title: t('common.warning') || 'Permission Required',
          message: t('services.locationPermissionRequired') || 'Location permission is required to detect your address automatically.',
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

  const handleAddPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 3 - photos.length,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      const newPhotos = result.assets
        .filter(asset => asset.uri)
        .map(asset => asset.uri!);
      setPhotos([...photos, ...newPhotos]);
    } catch (error) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('services.selectPhotoError'),
        type: 'error',
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      setAlertModal({
        visible: true,
        title: t('auth.login'),
        message: t('services.loginRequired'),
        type: 'warning',
      });
      navigation.navigate('Login');
      return;
    }

    // Check phone verification status
    // First check from store (fast), then verify via API if needed
    const authUser = auth().currentUser;
    if (!authUser) {
      setAlertModal({
        visible: true,
        title: t('auth.login'),
        message: t('services.loginRequired'),
        type: 'warning',
      });
      navigation.navigate('Login');
      return;
    }

    // If user logged in with phone, phone is verified
    const isPhoneAuth = !!authUser.phoneNumber;
    const phoneVerifiedFromStore = currentUser.phoneVerified === true;

    // If phone is verified in store or user logged in with phone, proceed
    if (!phoneVerifiedFromStore && !isPhoneAuth) {
      // Phone not verified - require verification
      if (!currentUser.phone) {
        setConfirmationModal({
          visible: true,
          title: t('common.phoneVerificationRequired'),
          message: t('common.phoneVerificationMessage'),
          type: 'warning',
          onConfirm: () => {
            setConfirmationModal({visible: false, title: '', message: '', onConfirm: () => {}});
            navigation.navigate('Settings');
          },
        });
        return;
      }
      
      // Try to update phone verification via API
      try {
        await usersApi.updateMe({
          phoneVerified: true,
          phone: currentUser.phone,
        });
        // Continue with request after update
      } catch (error: any) {
        console.error('Error updating phone verification:', error);
        setAlertModal({
          visible: true,
          title: t('common.verificationError'),
          message: t('common.verificationErrorMessage'),
          type: 'error',
        });
        return;
      }
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

    // Check if selected service type has available providers
    const providerCount = providerCounts[selectedServiceType] || 0;
    if (providerCount === 0) {
      const selectedCategory = serviceCategories.find(cat => cat.name === selectedServiceType);
      const serviceName = language === 'hi' && selectedCategory?.nameHi ? selectedCategory.nameHi : selectedServiceType;
      const messageTemplate = String(t('services.providerNotAvailableMessage'));
      const message = messageTemplate.replace('{{serviceType}}', serviceName);
      setAlertModal({
        visible: true,
        title: String(t('services.providerNotAvailable')),
        message: message,
        type: 'warning',
      });
      return;
    }

    // Validate questionnaire answers
    if (questionnaire && questionnaire.length > 0) {
      const missingAnswers = questionnaire
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

      if (missingAnswers.length > 0) {
        setAlertModal({
          visible: true,
          title: t('common.requiredQuestions'),
          message: `${t('common.requiredQuestions')}:\n\n${missingAnswers.map(q => `• ${getQuestionText(q)}`).join('\n')}`,
          type: 'warning',
        });
        return;
      }
    }

    // If no questionnaire, problem description is required
    if ((!questionnaire || questionnaire.length === 0) && !problem.trim()) {
      setAlertModal({
        visible: true,
        title: t('common.problemDescriptionRequired'),
        message: t('common.problemDescriptionRequiredMessage'),
        type: 'warning',
      });
      return;
    }

    if (!selectedAddress || !selectedAddress.pincode) {
      setAlertModal({
        visible: true,
        title: t('common.addressRequired'),
        message: t('common.addressRequiredMessage'),
        type: 'warning',
      });
      return;
    }

    if (urgency === 'scheduled' && !scheduledDate) {
      setAlertModal({
        visible: true,
        title: t('common.scheduledDateRequired'),
        message: t('common.scheduledDateRequiredMessage'),
        type: 'warning',
      });
      return;
    }

    setLoading(true);
    try {
      // Ensure user is authenticated
      const authUser = auth().currentUser;
      if (!authUser) {
        setAlertModal({
          visible: true,
          title: t('auth.login'),
          message: t('services.loginRequired'),
          type: 'warning',
        });
        navigation.navigate('Login');
        setLoading(false);
        return;
      }

      // Ensure user profile exists with phoneVerified = true via API
      try {
        const user = await usersApi.getMe();
        if (!user || !user.phoneVerified) {
          // Update user profile to ensure phoneVerified is true
          await usersApi.updateMe({
            phoneVerified: true,
            phone: authUser.phoneNumber || currentUser.phone || '',
            role: 'customer',
          });
        }
      } catch (userError: any) {
        console.error('Error ensuring user profile:', userError);
        // Continue anyway - backend will validate
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
        customerId: authUser.uid,
        customerName: currentUser.name || 'Customer',
        customerPhone: currentUser.phone || '',
        customerAddress: cleanAddress,
        serviceType: selectedServiceType,
        problem: problem.trim(),
        status: 'pending',
        urgency: urgency,
      };

      // Handle scheduledTime
      if (urgency === 'scheduled' && scheduledDate) {
        serviceRequestDataRaw.scheduledTime = scheduledDate.toISOString();
      }

      // Only include photos if there are any (filter out undefined/null/empty)
      if (photos.length > 0) {
        const validPhotos = photos.filter(photo => photo && photo !== undefined && photo !== null && photo !== '');
        if (validPhotos.length > 0) {
          serviceRequestDataRaw.photos = validPhotos;
        }
      }

      // Include questionnaire answers if available
      if (questionnaire && questionnaire.length > 0 && Object.keys(questionnaireAnswers).length > 0) {
        serviceRequestDataRaw.questionnaireAnswers = questionnaireAnswers;
      }

      // Remove all undefined values before saving
      const serviceRequestData = removeUndefinedValues(serviceRequestDataRaw);

      // Create service request in Firestore (PRIMARY) - ensures provider can always find it
      const firestoreData = {
        ...serviceRequestData,
        customerId: currentUser.id,
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // Create document with auto-generated ID
      const docRef = await firestore()
        .collection('serviceRequests')
        .add(firestoreData);

      const serviceRequestId = docRef.id;
      console.log('✅ Service request created in Firestore:', serviceRequestId);

      // Also try to sync to MongoDB (optional, for backend consistency)
      try {
        await serviceRequestsApi.create({
          ...serviceRequestData,
          _id: serviceRequestId, // Use Firestore ID
          consultationId: serviceRequestId,
        });
        console.log('✅ Service request also synced to MongoDB:', serviceRequestId);
      } catch (apiError: any) {
        // MongoDB sync is optional - Firestore is primary
        console.warn('⚠️ MongoDB sync failed (service request is in Firestore):', apiError.message);
      }

      // Notify nearby online providers via WebSocket
      try {
        // Find online providers for this service type using API
        const onlineProviders = await providersApi.getAll({
          serviceType: selectedServiceType,
          isOnline: true,
          limit: 50,
        });

        // Filter approved providers
        const allProviderIds = onlineProviders
          .filter(p => p.approvalStatus === 'approved')
          .map(p => p._id || p.id)
          .filter((id): id is string => !!id);

        console.log(`📢 Notifying ${allProviderIds.length} provider(s) about service request: ${serviceRequestId}`);

        // Emit WebSocket notification to each provider
        const notificationPromises = Array.from(allProviderIds).map(providerId => {
          console.log(`📤 Sending WebSocket notification to provider: ${providerId}`);
          
          // Build WebSocket payload
          const websocketPayload: any = {
            consultationId: serviceRequestId,
            id: serviceRequestId,
            bookingId: serviceRequestId,
            customerName: serviceRequestData.customerName,
            patientName: serviceRequestData.customerName, // For backward compatibility
            customerPhone: serviceRequestData.customerPhone,
            patientPhone: serviceRequestData.customerPhone, // For backward compatibility
            customerAddress: serviceRequestData.customerAddress,
            patientAddress: serviceRequestData.customerAddress, // For backward compatibility
            serviceType: selectedServiceType,
            problem: problem.trim(),
            scheduledTime: urgency === 'scheduled' && scheduledDate ? scheduledDate : new Date(),
            consultationFee: 0, // Service requests don't have fees upfront
          };

          // Only include problem if it has a value AND there's no questionnaire
          // If questionnaire exists, the problem field is optional and shouldn't be sent if empty
          const hasQuestionnaire = questionnaire && questionnaire.length > 0 && Object.keys(questionnaireAnswers).length > 0;
          const hasProblem = problem.trim().length > 0;
          
          if (hasProblem && !hasQuestionnaire) {
            // Problem is required when no questionnaire
            websocketPayload.problem = problem.trim();
          } else if (hasProblem && hasQuestionnaire) {
            // Problem is optional when questionnaire exists, only include if provided
            websocketPayload.problem = problem.trim();
          }
          // If no problem and questionnaire exists, don't include problem field

          // Include questionnaire answers if available
          if (hasQuestionnaire) {
            websocketPayload.questionnaireAnswers = serviceRequestData.questionnaireAnswers;
          }

          return WebSocketService.emitNewBooking(providerId, websocketPayload).catch(error => {
            console.error(`Failed to notify provider ${providerId}:`, error);
            // Don't fail the request if WebSocket notification fails
          });
        });

        await Promise.all(notificationPromises);
        console.log(`✅ Notified ${allProviderIds.length} online provider(s) about new service request`);
      } catch (websocketError) {
        console.error('Error notifying providers via WebSocket:', websocketError);
        // Don't fail the request if WebSocket notification fails
      }

      // Show toast notification
      setSubmittedServiceRequestId(serviceRequestId);
      setToastMessage('Your service request has been submitted. Nearby providers will be notified.');
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

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.text}]}>
          {t('services.requestAService')}
        </Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          {t('services.describeProblemSubtitle')}
        </Text>
      </View>

      {/* Service Type Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.text}]}>
          {t('services.serviceType')} *
        </Text>
        <TouchableOpacity
          style={[
            styles.serviceTypeButton,
            {backgroundColor: theme.card, borderColor: theme.border},
          ]}
          onPress={() => setShowServiceTypeModal(true)}>
          {selectedCategory ? (
            <View style={styles.selectedServiceType}>
              <Icon
                name={selectedCategory.icon}
                size={24}
                color={selectedCategory.color}
              />
              <Text style={[styles.serviceTypeText, {color: theme.text}]}>
                {selectedCategory.name}
              </Text>
            </View>
          ) : (
            <Text style={[styles.placeholderText, {color: theme.textSecondary}]}>
              {t('services.selectServiceType')}
            </Text>
          )}
          <Icon name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Questionnaire */}
      {questionnaire && questionnaire.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionHeader, {color: theme.text}]}>
            Service Details
          </Text>
          <Text style={[styles.sectionSubheader, {color: theme.textSecondary}]}>
            Please answer these questions to help us serve you better
          </Text>
          {questionnaire.map((question, index) => (
            <View key={question.id} style={styles.questionContainer}>
              <Text style={[styles.questionText, {color: theme.text}]}>
                {index + 1}. {getQuestionText(question)}
                {question.required && <Text style={styles.requiredStar}> *</Text>}
              </Text>

              {/* Text Input */}
              {question.type === 'text' && (
                <TextInput
                  style={[
                    styles.questionInput,
                    {backgroundColor: theme.card, color: theme.text, borderColor: theme.border},
                  ]}
                  value={questionnaireAnswers[question.id] || ''}
                  onChangeText={(text) => handleQuestionnaireAnswer(question.id, text)}
                  placeholder={getPlaceholderText(question, t('services.enterYourAnswer'))}
                  placeholderTextColor={theme.textSecondary}
                  multiline
                />
              )}

              {/* Number Input */}
              {question.type === 'number' && (
                <TextInput
                  style={[
                    styles.questionInput,
                    {backgroundColor: theme.card, color: theme.text, borderColor: theme.border},
                  ]}
                  value={questionnaireAnswers[question.id] || ''}
                  onChangeText={(text) => handleQuestionnaireAnswer(question.id, text)}
                  placeholder={getPlaceholderText(question, t('services.enterANumber'))}
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              )}

              {/* Boolean (Yes/No) */}
              {question.type === 'boolean' && (
                <View style={styles.booleanButtons}>
                  <TouchableOpacity
                    style={[
                      styles.booleanButton,
                      questionnaireAnswers[question.id] === true && styles.booleanButtonSelected,
                      {borderColor: theme.border},
                      questionnaireAnswers[question.id] === true && {backgroundColor: theme.primary},
                    ]}
                    onPress={() => handleQuestionnaireAnswer(question.id, true)}>
                    <Text style={[
                      styles.booleanButtonText,
                      {color: questionnaireAnswers[question.id] === true ? '#fff' : theme.text},
                    ]}>
                      {t('common.yes')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.booleanButton,
                      questionnaireAnswers[question.id] === false && styles.booleanButtonSelected,
                      {borderColor: theme.border},
                      questionnaireAnswers[question.id] === false && {backgroundColor: theme.primary},
                    ]}
                    onPress={() => handleQuestionnaireAnswer(question.id, false)}>
                    <Text style={[
                      styles.booleanButtonText,
                      {color: questionnaireAnswers[question.id] === false ? '#fff' : theme.text},
                    ]}>
                      {t('common.no')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Select (Single choice) */}
              {question.type === 'select' && getOptions(question).length > 0 && (
                <View style={styles.selectOptions}>
                  {getOptions(question).map((option, optIdx) => {
                    // For Hindi options, use the English option as the value for backward compatibility
                    const englishOption = question.options?.[optIdx] || option;
                    return (
                    <TouchableOpacity
                      key={optIdx}
                      style={[
                        styles.selectOption,
                        {borderColor: theme.border},
                        questionnaireAnswers[question.id] === option && {
                          backgroundColor: theme.primary + '20',
                          borderColor: theme.primary,
                        },
                      ]}
                      onPress={() => handleQuestionnaireAnswer(question.id, englishOption)}>
                      <Icon
                        name={questionnaireAnswers[question.id] === englishOption ? 'radio-button-checked' : 'radio-button-unchecked'}
                        size={20}
                        color={questionnaireAnswers[question.id] === englishOption ? theme.primary : theme.textSecondary}
                      />
                      <Text style={[styles.selectOptionText, {color: theme.text}]}>{option}</Text>
                    </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Multi-select */}
              {question.type === 'multiselect' && getOptions(question).length > 0 && (
                <View style={styles.selectOptions}>
                  {getOptions(question).map((option, optIdx) => {
                    // For Hindi options, use the English option as the value for backward compatibility
                    const englishOption = question.options?.[optIdx] || option;
                    const selectedOptions = questionnaireAnswers[question.id] || [];
                    const isSelected = Array.isArray(selectedOptions) && selectedOptions.includes(englishOption);
                    return (
                      <TouchableOpacity
                        key={optIdx}
                        style={[
                          styles.selectOption,
                          {borderColor: theme.border},
                          isSelected && {
                            backgroundColor: theme.primary + '20',
                            borderColor: theme.primary,
                          },
                        ]}
                        onPress={() => {
                          const current = questionnaireAnswers[question.id] || [];
                          const updated = Array.isArray(current)
                            ? isSelected
                              ? current.filter(v => v !== englishOption)
                              : [...current, englishOption]
                            : [englishOption];
                          handleQuestionnaireAnswer(question.id, updated);
                        }}>
                        <Icon
                          name={isSelected ? 'check-box' : 'check-box-outline-blank'}
                          size={20}
                          color={isSelected ? theme.primary : theme.textSecondary}
                        />
                        <Text style={[styles.selectOptionText, {color: theme.text}]}>{option}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Problem Description */}
      {questionnaire && questionnaire.length > 0 ? (
        <View style={styles.section}>
          <Text style={[styles.label, {color: theme.text}]}>
           {t('services.problemInBrief')} *
          </Text>
          <Text style={[styles.sectionSubheader, {color: theme.textSecondary, marginBottom: 8}]}>
            {t('services.additionalInfoDescription')}
          </Text>
          <TextInput
            style={[
              styles.problemInput,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={problem}
            onChangeText={setProblem}
            placeholder={t('services.additionalInfoPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={[styles.charCount, {color: theme.textSecondary}]}>
            {problem.length}/500
          </Text>
        </View>
      ) : (
        <View style={styles.section}>
          <Text style={[styles.label, {color: theme.text}]}>
            {t('services.describeProblem')} *
          </Text>
          <TextInput
            style={[
              styles.problemInput,
              {
                backgroundColor: theme.card,
                color: theme.text,
                borderColor: theme.border,
              },
            ]}
            value={problem}
            onChangeText={setProblem}
            placeholder={t('services.problemPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={[styles.charCount, {color: theme.textSecondary}]}>
            {problem.length}/500
          </Text>
        </View>
      )}

      {/* Photos */}
      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.text}]}>
          {t('services.addPhotosOptional')}
        </Text>
        {photos.length < 3 && (
          <TouchableOpacity
            style={[
              styles.addPhotoButton,
              {borderColor: theme.border, backgroundColor: theme.card},
            ]}
            onPress={handleAddPhoto}>
            <Icon name="add-photo-alternate" size={24} color={theme.primary} />
            <Text style={[styles.addPhotoText, {color: theme.primary}]}>
              {t('services.addPhoto', {count: photos.length, max: 3})}
            </Text>
          </TouchableOpacity>
        )}
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
      </View>

      {/* Address Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.text}]}>
          {t('services.serviceAddress')} *
        </Text>
        <TouchableOpacity
          style={[
            styles.addressButton,
            {backgroundColor: theme.card, borderColor: theme.border},
          ]}
          onPress={() => setShowAddressModal(true)}>
          {selectedAddress ? (
            <View style={styles.addressContent}>
              <Icon
                name={
                  (selectedAddress as SavedAddress).label
                    ? getAddressLabelIcon((selectedAddress as SavedAddress).label)
                    : 'location-on'
                }
                size={24}
                color={theme.primary}
              />
              <View style={styles.addressText}>
                {(selectedAddress as SavedAddress).label && (
                  <Text style={[styles.addressLabel, {color: theme.primary}]}>
                    {getAddressLabelText(selectedAddress as SavedAddress)}
                  </Text>
                )}
                <Text style={[styles.addressLine, {color: theme.text}]}>
                  {selectedAddress.address}
                </Text>
                <Text style={[styles.addressDetails, {color: theme.textSecondary}]}>
                  {selectedAddress.pincode}
                  {selectedAddress.city && `, ${selectedAddress.city}`}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.addressContent}>
              <Icon name="add-location" size={24} color={theme.textSecondary} />
              <Text style={[styles.placeholderText, {color: theme.textSecondary}]}>
                Select or add address
              </Text>
            </View>
          )}
          <Icon name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Urgency Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.text}]}>{t('services.whenDoYouNeedIt')} *</Text>
        <View style={styles.urgencyContainer}>
          <TouchableOpacity
            style={[
              styles.urgencyButton,
              {
                backgroundColor:
                  urgency === 'immediate' ? theme.primary : theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setUrgency('immediate')}>
            <Icon
              name="flash-on"
              size={24}
              color={urgency === 'immediate' ? '#fff' : theme.textSecondary}
            />
            <Text
              style={[
                styles.urgencyText,
                {
                  color: urgency === 'immediate' ? '#fff' : theme.text,
                },
              ]}>
              {t('services.immediate')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.urgencyButton,
              {
                backgroundColor:
                  urgency === 'scheduled' ? theme.primary : theme.card,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setUrgency('scheduled')}>
            <Icon
              name="schedule"
              size={24}
              color={urgency === 'scheduled' ? '#fff' : theme.textSecondary}
            />
            <Text
              style={[
                styles.urgencyText,
                {
                  color: urgency === 'scheduled' ? '#fff' : theme.text,
                },
              ]}>
              {t('services.scheduled')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Scheduled Date/Time (if scheduled) */}
      {urgency === 'scheduled' && (
        <View style={styles.section}>
          <Text style={[styles.label, {color: theme.text}]}>
            Select Date & Time
          </Text>
          <TouchableOpacity
            style={[
              styles.dateTimeButton,
              {backgroundColor: theme.card, borderColor: theme.border},
            ]}
            onPress={() => {
              // Initialize with existing scheduled date, or set to at least 1 hour from now
              if (scheduledDate) {
                setTempScheduledDate(scheduledDate);
              } else {
                // Set to 1 hour from now to avoid validation errors
                const oneHourLater = new Date();
                oneHourLater.setHours(oneHourLater.getHours() + 1);
                // Round to next hour for cleaner display
                oneHourLater.setMinutes(0);
                setTempScheduledDate(oneHourLater);
              }
              setShowDateTimeModal(true);
            }}>
            <Icon name="calendar-today" size={24} color={theme.primary} />
            <Text style={[styles.dateTimeText, {color: theme.text}]}>
              {scheduledDate
                ? scheduledDate.toLocaleString()
                : 'Select date and time'}
            </Text>
            <Icon name="chevron-right" size={24} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Submit Button */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          {
            backgroundColor:
              selectedServiceType && problem.trim() && selectedAddress
                ? theme.primary
                : theme.border,
            opacity:
              selectedServiceType && problem.trim() && selectedAddress ? 1 : 0.5,
          },
        ]}
        onPress={handleSubmit}
        disabled={
          !selectedServiceType ||
          !problem.trim() ||
          !selectedAddress ||
          loading ||
          (urgency === 'scheduled' && !scheduledDate)
        }>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Text style={styles.submitButtonText}>{t('services.requestService')}</Text>
            <Icon name="arrow-forward" size={20} color="#fff" />
          </>
        )}
      </TouchableOpacity>

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
                    <View style={styles.categoryNameRow}>
                      <Text style={[styles.categoryName, {color: theme.text}]}>
                        {language === 'hi' && item.nameHi ? item.nameHi : item.name}
                      </Text>
                      {loadingProviderCounts ? (
                        <ActivityIndicator size="small" color={theme.primary} style={styles.countLoader} />
                      ) : (
                        <View style={[
                          styles.providerCountBadge,
                          {
                            backgroundColor: (providerCounts[item.name] || 0) === 0 
                              ? '#e74c3c' 
                              : theme.primary + '20',
                          }
                        ]}>
                          <Text style={[
                            styles.providerCountText,
                            {
                              color: (providerCounts[item.name] || 0) === 0 
                                ? '#fff' 
                                : theme.primary,
                            }
                          ]}>
                            {(providerCounts[item.name] || 0) === 0 
                              ? String(t('services.noProviders'))
                              : `${providerCounts[item.name] || 0} ${String(t('services.providersAvailable'))}`
                            }
                          </Text>
                        </View>
                      )}
                    </View>
                    {(item.description || item.descriptionHi) && (
                      <Text
                        style={[styles.categoryDescription, {color: theme.textSecondary}]}>
                        {language === 'hi' && item.descriptionHi ? item.descriptionHi : (item.description || '')}
                      </Text>
                    )}
                  </View>
                  {selectedServiceType === item.name && (
                    <Icon name="check-circle" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

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
                    No saved addresses
                  </Text>
                  <Text style={[styles.emptySubtext, {color: theme.textSecondary}]}>
                    Add an address to get started
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
                  {selectedAddress ? 'Save Current Address' : 'Use Current Location'}
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
                      {label === 'home' ? 'Home' : label === 'office' ? 'Office' : 'Other'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {newAddressLabel === 'other' && (
              <View style={styles.section}>
                <Text style={[styles.label, {color: theme.text}]}>Custom Label</Text>
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
      <Modal
        visible={showDateTimeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowDateTimeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.dateTimeModal, {backgroundColor: theme.card}]}>
            <View style={styles.dateTimeModalHeader}>
              <Text style={[styles.dateTimeModalTitle, {color: theme.text}]}>
                Select Date & Time
              </Text>
              <TouchableOpacity
                onPress={() => setShowDateTimeModal(false)}
                style={styles.modalCloseButton}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.dateTimeModalContent}>
              {/* Date Picker */}
              <View style={styles.dateTimePickerSection}>
                <Text style={[styles.dateTimePickerLabel, {color: theme.text}]}>
                  Select Date
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dateTimePickerButton,
                    {backgroundColor: theme.background, borderColor: theme.border},
                  ]}
                  onPress={() => setShowDatePicker(true)}>
                  <Icon name="calendar-today" size={20} color={theme.primary} />
                  <Text style={[styles.dateTimePickerButtonText, {color: theme.text}]}>
                    {tempScheduledDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Text>
                </TouchableOpacity>
                {showDatePicker && (
                  <DateTimePicker
                    value={tempScheduledDate}
                    mode="date"
                    minimumDate={new Date()}
                    display="default"
                    onChange={(event, selectedDate) => {
                      setShowDatePicker(false);
                      if (selectedDate) {
                        // Preserve the time when changing date
                        const newDate = new Date(selectedDate);
                        newDate.setHours(tempScheduledDate.getHours());
                        newDate.setMinutes(tempScheduledDate.getMinutes());
                        
                        // If selected date is today, ensure time is at least 1 hour from now
                        const now = new Date();
                        const isToday = newDate.toDateString() === now.toDateString();
                        if (isToday) {
                          const oneHourLater = new Date(now);
                          oneHourLater.setHours(oneHourLater.getHours() + 1);
                          if (newDate <= oneHourLater) {
                            // Set time to 1 hour from now if selected time is too close
                            newDate.setHours(oneHourLater.getHours());
                            newDate.setMinutes(0);
                          }
                        }
                        
                        setTempScheduledDate(newDate);
                      }
                    }}
                  />
                )}
              </View>

              {/* Time Picker */}
              <View style={styles.dateTimePickerSection}>
                <Text style={[styles.dateTimePickerLabel, {color: theme.text}]}>
                  Select Time
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dateTimePickerButton,
                    {backgroundColor: theme.background, borderColor: theme.border},
                  ]}
                  onPress={() => setShowTimePicker(true)}>
                  <Icon name="access-time" size={20} color={theme.primary} />
                  <Text style={[styles.dateTimePickerButtonText, {color: theme.text}]}>
                    {tempScheduledDate.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                    })}
                  </Text>
                </TouchableOpacity>
                {showTimePicker && (
                  <DateTimePicker
                    value={tempScheduledDate}
                    mode="time"
                    is24Hour={false}
                    display="default"
                    onChange={(event, selectedTime) => {
                      setShowTimePicker(false);
                      if (selectedTime) {
                        // Preserve the date when changing time
                        const newDate = new Date(tempScheduledDate);
                        newDate.setHours(selectedTime.getHours());
                        newDate.setMinutes(selectedTime.getMinutes());
                        setTempScheduledDate(newDate);
                      }
                    }}
                  />
                )}
              </View>

              {/* Action Buttons */}
              <View style={styles.dateTimeModalActions}>
                <TouchableOpacity
                  style={[
                    styles.dateTimeModalCancelButton,
                    {borderColor: theme.border},
                  ]}
                  onPress={() => setShowDateTimeModal(false)}>
                  <Text style={[styles.dateTimeModalCancelText, {color: theme.text}]}>
                    Cancel
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.dateTimeModalConfirmButton, {backgroundColor: theme.primary}]}
                  onPress={() => {
                    // Validate that selected date/time is at least 1 hour in the future
                    const now = new Date();
                    const oneHourLater = new Date(now);
                    oneHourLater.setHours(oneHourLater.getHours() + 1);
                    
                    if (tempScheduledDate <= oneHourLater) {
                      setAlertModal({
                        visible: true,
                        title: t('common.invalidDateTime') || 'Invalid Date/Time',
                        message: t('common.invalidDateTimeMessage') || 'Please select a date and time at least 1 hour in the future for scheduled service.',
                        type: 'warning',
                      });
                      return;
                    }
                    setScheduledDate(tempScheduledDate);
                    setShowDateTimeModal(false);
                  }}>
                  <Text style={styles.dateTimeModalConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
  problemInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
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
  urgencyContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  urgencyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  urgencyText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateTimeText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 12,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
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
  dateTimeModal: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  dateTimeModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  dateTimeModalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  modalCloseButton: {
    padding: 4,
  },
  dateTimeModalContent: {
    padding: 20,
  },
  dateTimePickerSection: {
    marginBottom: 24,
  },
  dateTimePickerLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  dateTimePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  dateTimePickerButtonText: {
    fontSize: 16,
    flex: 1,
  },
  dateTimeModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  dateTimeModalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateTimeModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateTimeModalConfirmButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  dateTimeModalConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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

