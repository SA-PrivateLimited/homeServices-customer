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
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary} from 'react-native-image-picker';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {fetchServiceCategories, ServiceCategory} from '../services/serviceCategoriesService';
import GeolocationService from '../services/geolocationService';
import {
  getSavedAddresses,
  saveAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  type SavedAddress,
} from '../services/addressService';
import type {UserLocation} from '../types/consultation';
import WebSocketService from '../services/websocketService';

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
  const {isDarkMode, currentUser, currentPincode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [selectedServiceType, setSelectedServiceType] = useState<string>(
    route?.params?.serviceType || '',
  );
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

  useEffect(() => {
    loadServiceCategories();
    loadSavedAddresses();
  }, []);

  useEffect(() => {
    if (currentPincode && !selectedAddress) {
      // Try to auto-detect address
      loadCurrentAddress();
    }
  }, [currentPincode]);

  useEffect(() => {
    if (showAddressModal) {
      // Reload addresses when modal opens
      loadSavedAddresses();
    }
  }, [showAddressModal]);

  const loadServiceCategories = async () => {
    try {
      setLoadingCategories(true);
      const categories = await fetchServiceCategories();
      setServiceCategories(categories);
    } catch (error) {
      console.error('Error loading service categories:', error);
    } finally {
      setLoadingCategories(false);
    }
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
      const location = await GeolocationService.getCurrentLocation();
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
    } catch (error) {
      console.error('Error loading current address:', error);
      Alert.alert('Error', 'Failed to get current location');
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
        Alert.alert(
          'Permission Required',
          'Location permission is required to detect your address automatically.',
        );
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
      Alert.alert('Error', error.message || 'Failed to detect location');
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
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }

    if (!editAddress.trim()) {
      Alert.alert('Error', 'Please enter your address');
      return;
    }

    if (editLabel === 'other' && !editCustomLabel.trim()) {
      Alert.alert('Error', 'Please enter a custom label');
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
        Alert.alert('Success', 'Address updated successfully');
      } else {
        // Create new address
        await saveAddress(addressToSave);
        await loadSavedAddresses();
        setSelectedAddress(cleanAddressObject(addressToSave) as SavedAddress);
        Alert.alert('Success', 'Address saved successfully');
      }

      setShowEditAddressModal(false);
      setEditingAddress(null);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save address');
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
      Alert.alert('Error', 'No address selected');
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
      Alert.alert('Success', 'Address saved successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save address');
    }
  };

  const handleDeleteAddress = async (addressId: string) => {
    Alert.alert(
      'Delete Address',
      'Are you sure you want to delete this address?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAddress(addressId);
              await loadSavedAddresses();
              if (selectedAddress?.id === addressId) {
                setSelectedAddress(null);
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete address');
            }
          },
        },
      ],
    );
  };

  const getAddressLabelText = (address: SavedAddress): string => {
    if (address.label === 'home') return 'Home';
    if (address.label === 'office') return 'Office';
    return address.customLabel || 'Other';
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
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!currentUser) {
      Alert.alert('Login Required', 'Please login to request a service');
      navigation.navigate('Login');
      return;
    }

    // Check phone verification status
    // First check from store (fast), then verify/update in Firestore if needed
    const authUser = auth().currentUser;
    if (!authUser) {
      Alert.alert('Login Required', 'Please login to request a service');
      navigation.navigate('Login');
      return;
    }

    // If user logged in with phone, phone is verified
    const isPhoneAuth = !!authUser.phoneNumber;
    const phoneVerifiedFromStore = currentUser.phoneVerified === true;

    // If phone is verified in store or user logged in with phone, proceed
    if (!phoneVerifiedFromStore && !isPhoneAuth) {
      // Phone not verified - try to update Firestore or show error
      try {
        // Try to update the document to set phoneVerified if user has phone
        if (currentUser.phone) {
          await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .update({
              phoneVerified: true,
              phone: currentUser.phone,
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
          // Continue with request after update
        } else {
          // No phone number - require verification
          Alert.alert(
            'Phone Verification Required',
            'Please verify your phone number to request services. You can verify it in your profile settings.',
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'Go to Profile',
                onPress: () => navigation.navigate('Settings'),
              },
            ],
          );
          return;
        }
      } catch (error: any) {
        // If update fails, check if it's because document doesn't exist
        if (error.code === 'not-found' || error.message?.includes('No document')) {
          // Document doesn't exist - create it
          try {
            const userDataToCreate: any = {
              name: currentUser.name || authUser.displayName || 'User',
              email: currentUser.email || authUser.email || '',
              phone: authUser.phoneNumber || currentUser.phone || '',
              phoneVerified: isPhoneAuth || !!authUser.phoneNumber, // Phone auth means verified
              createdAt: firestore.FieldValue.serverTimestamp(),
              updatedAt: firestore.FieldValue.serverTimestamp(),
              role: 'customer', // HomeServices app is for customers
            };

            // Get FCM token if available
            try {
              const fcmToken = await messaging().getToken();
              if (fcmToken) {
                userDataToCreate.fcmToken = fcmToken;
              }
            } catch (fcmError) {
              console.warn('Could not get FCM token:', fcmError);
            }

            await firestore()
              .collection('users')
              .doc(currentUser.uid)
              .set(userDataToCreate);
            
            // Continue with request after creating document
          } catch (createError: any) {
            console.error('Error creating user document:', createError);
            // If creation fails due to permission, user needs to re-login
            if (createError.code === 'permission-denied') {
              Alert.alert(
                'Authentication Error',
                'Please log out and sign in again to refresh your session.',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Login'),
                  },
                ],
              );
            } else {
              Alert.alert(
                'Account Error',
                'Unable to create your account. Please try again or contact support.',
              );
            }
            return;
          }
        } else if (error.code === 'permission-denied') {
          // Permission denied - user might not be authenticated properly
          Alert.alert(
            'Authentication Error',
            'Please log out and sign in again to refresh your session.',
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'OK',
                onPress: () => navigation.navigate('Login'),
              },
            ],
          );
          return;
        } else {
          // Other error - show generic message
          console.error('Error updating phone verification:', error);
          Alert.alert(
            'Verification Error',
            'Unable to verify your phone number status. Please try again or contact support.',
          );
          return;
        }
      }
    }

    if (!selectedServiceType) {
      Alert.alert('Service Type Required', 'Please select a service type');
      return;
    }

    if (!problem.trim()) {
      Alert.alert('Problem Description Required', 'Please describe the problem');
      return;
    }

    if (!selectedAddress || !selectedAddress.pincode) {
      Alert.alert('Address Required', 'Please select or add your address');
      return;
    }

    if (urgency === 'scheduled' && !scheduledDate) {
      Alert.alert('Scheduled Date Required', 'Please select a date for scheduled service');
      return;
    }

    setLoading(true);
    try {
      // Ensure user document exists and is properly set up BEFORE creating consultation
      // This is required by Firestore rules which check phoneVerified and role
      const authUser = auth().currentUser;
      if (!authUser) {
        Alert.alert('Login Required', 'Please login to request a service');
        navigation.navigate('Login');
        setLoading(false);
        return;
      }

      // Ensure user document exists with phoneVerified = true
      // This must happen BEFORE creating the consultation
      const userDocRef = firestore().collection('users').doc(authUser.uid);
      
      // Check if document exists first
      const userDoc = await userDocRef.get();
      
      if (!userDoc.exists) {
        // Document doesn't exist - create it
        const userDataToCreate: any = {
          name: currentUser.name || authUser.displayName || 'User',
          email: currentUser.email || authUser.email || '',
          phone: authUser.phoneNumber || currentUser.phone || '',
          phoneVerified: true, // Phone auth means phone is verified
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          role: 'customer', // HomeServices app is for customers
        };

        // Get FCM token if available
        try {
          const fcmToken = await messaging().getToken();
          if (fcmToken) {
            userDataToCreate.fcmToken = fcmToken;
          }
        } catch (fcmError) {
          console.warn('Could not get FCM token:', fcmError);
        }

        try {
          await userDocRef.set(userDataToCreate);
          console.log('User document created successfully');
          
          // Verify the document was created by reading it back
          const verifyDoc = await userDocRef.get();
          if (!verifyDoc.exists || !verifyDoc.data()?.phoneVerified) {
            throw new Error('User document verification failed');
          }
        } catch (createError: any) {
          console.error('Error creating user document:', createError);
          Alert.alert(
            'Account Error',
            createError.code === 'permission-denied' 
              ? 'Permission denied. Please log out and sign in again.'
              : 'Unable to create your account. Please try again or contact support.',
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'OK',
                onPress: () => {
                  if (createError.code === 'permission-denied') {
                    navigation.navigate('Login');
                  }
                },
              },
            ],
          );
          setLoading(false);
          return;
        }
      } else {
        // Document exists - ensure phoneVerified is true
        const userData = userDoc.data();
        if (!userData?.phoneVerified) {
          try {
            await userDocRef.update({
              phoneVerified: true,
              phone: authUser.phoneNumber || currentUser.phone || userData?.phone || '',
              updatedAt: firestore.FieldValue.serverTimestamp(),
            });
            console.log('User document updated with phoneVerified: true');
            
            // Verify the update was successful
            const verifyDoc = await userDocRef.get();
            if (!verifyDoc.exists || !verifyDoc.data()?.phoneVerified) {
              throw new Error('User document verification failed after update');
            }
          } catch (updateError: any) {
            console.error('Error updating user document:', updateError);
            if (updateError.code === 'permission-denied') {
              Alert.alert(
                'Permission Error',
                'Unable to update your account. Please log out and sign in again.',
                [
                  {text: 'Cancel', style: 'cancel'},
                  {
                    text: 'OK',
                    onPress: () => navigation.navigate('Login'),
                  },
                ],
              );
              setLoading(false);
              return;
            }
            // If update fails for other reasons, still try to continue
            // The Firestore rule will catch it if phoneVerified is not true
          }
        } else {
          // Document exists and phoneVerified is already true - good to go
          console.log('User document verified: phoneVerified is true');
        }
      }

      // Clean address object - remove undefined and null values
      const cleanAddress = cleanAddressObject(selectedAddress);
      
      if (!cleanAddress || !cleanAddress.pincode || !cleanAddress.address) {
        Alert.alert('Invalid Address', 'Please select a valid address with pincode and address');
        setLoading(false);
        return;
      }

      // Create service request
      // IMPORTANT: Use authUser.uid to match Firestore rule check (request.auth.uid)
      const serviceRequestRef = firestore().collection('consultations').doc();
      
      // Build service request data - ensure no undefined values
      const serviceRequestDataRaw: any = {
        customerId: authUser.uid, // Must match request.auth.uid for Firestore rule
        customerName: currentUser.name || 'Customer',
        customerPhone: currentUser.phone || '',
        customerAddress: cleanAddress,
        serviceType: selectedServiceType,
        problem: problem.trim(),
        status: 'pending',
        urgency: urgency,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // Handle scheduledTime
      if (urgency === 'scheduled' && scheduledDate) {
        serviceRequestDataRaw.scheduledTime = firestore.Timestamp.fromDate(scheduledDate);
      } else {
        serviceRequestDataRaw.scheduledTime = firestore.FieldValue.serverTimestamp();
      }

      // Only include photos if there are any (filter out undefined/null/empty)
      if (photos.length > 0) {
        const validPhotos = photos.filter(photo => photo && photo !== undefined && photo !== null && photo !== '');
        if (validPhotos.length > 0) {
          serviceRequestDataRaw.photos = validPhotos;
        }
      }

      // Remove all undefined values before saving
      const serviceRequestData = removeUndefinedValues(serviceRequestDataRaw);

      await serviceRequestRef.set(serviceRequestData);

      // Notify nearby online providers via WebSocket
      try {
        // Find online providers for this service type
        const onlineProvidersSnapshot = await firestore()
          .collection('providers')
          .where('isOnline', '==', true)
          .where('approvalStatus', '==', 'approved')
          .where('specialization', '==', selectedServiceType)
          .get();

        // Also check the legacy 'specialty' field
        const onlineProvidersBySpecialtySnapshot = await firestore()
          .collection('providers')
          .where('isOnline', '==', true)
          .where('approvalStatus', '==', 'approved')
          .where('specialty', '==', selectedServiceType)
          .get();

        // Combine results and remove duplicates
        const allProviderIds = new Set<string>();
        onlineProvidersSnapshot.docs.forEach(doc => allProviderIds.add(doc.id));
        onlineProvidersBySpecialtySnapshot.docs.forEach(doc => allProviderIds.add(doc.id));

        // Emit WebSocket notification to each provider
        const notificationPromises = Array.from(allProviderIds).map(providerId => {
          return WebSocketService.emitNewBooking(providerId, {
            consultationId: serviceRequestRef.id,
            id: serviceRequestRef.id,
            bookingId: serviceRequestRef.id,
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
          }).catch(error => {
            console.error(`Failed to notify provider ${providerId}:`, error);
            // Don't fail the request if WebSocket notification fails
          });
        });

        await Promise.all(notificationPromises);
        console.log(`✅ Notified ${allProviderIds.size} online provider(s) about new service request`);
      } catch (websocketError) {
        console.error('Error notifying providers via WebSocket:', websocketError);
        // Don't fail the request if WebSocket notification fails
      }

      Alert.alert(
        'Service Requested!',
        'Your service request has been submitted. Nearby providers will be notified.',
        [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('ActiveService', {
                serviceRequestId: serviceRequestRef.id,
              });
            },
          },
        ],
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit service request');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategory = serviceCategories.find(
    cat => cat.name === selectedServiceType,
  );

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, {color: theme.text}]}>
          Request a Service
        </Text>
        <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
          Describe your problem and we'll find a provider
        </Text>
      </View>

      {/* Service Type Selection */}
      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.text}]}>
          Service Type *
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
              Select service type
            </Text>
          )}
          <Icon name="chevron-right" size={24} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Problem Description */}
      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.text}]}>
          Describe the Problem *
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
          placeholder="E.g., Leaking pipe in kitchen, need immediate repair"
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
          maxLength={500}
        />
        <Text style={[styles.charCount, {color: theme.textSecondary}]}>
          {problem.length}/500
        </Text>
      </View>

      {/* Photos */}
      <View style={styles.section}>
        <Text style={[styles.label, {color: theme.text}]}>
          Add Photos (Optional)
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
              Add Photo ({photos.length}/3)
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
          Service Address *
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
        <Text style={[styles.label, {color: theme.text}]}>When do you need it? *</Text>
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
              Immediate
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
              Scheduled
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
              // TODO: Add date/time picker
              Alert.alert('Coming Soon', 'Date/time picker will be added');
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
            <Text style={styles.submitButtonText}>Request Service</Text>
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
                Select Service Type
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
                  onPress={() => {
                    setSelectedServiceType(item.name);
                    setShowServiceTypeModal(false);
                  }}>
                  <View
                    style={[
                      styles.categoryIcon,
                      {backgroundColor: item.color + '20'},
                    ]}>
                    <Icon name={item.icon} size={24} color={item.color} />
                  </View>
                  <View style={styles.categoryText}>
                    <Text style={[styles.categoryName, {color: theme.text}]}>
                      {item.name}
                    </Text>
                    {item.description && (
                      <Text
                        style={[styles.categoryDescription, {color: theme.textSecondary}]}>
                        {item.description}
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
                Save Address
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
              <Text style={[styles.label, {color: theme.text}]}>Address Label</Text>
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
                <Text style={[styles.cancelButtonText, {color: theme.text}]}>Cancel</Text>
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
                <Text style={styles.saveButtonText}>Save Address</Text>
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
                Edit Address
              </Text>
              <TouchableOpacity onPress={() => setShowEditAddressModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.editAddressScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.labelSection}>
                <Text style={[styles.label, {color: theme.text}]}>Address Type *</Text>
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
                        {label === 'home' ? 'Home' : label === 'office' ? 'Office' : 'Other'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {editLabel === 'other' && (
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
                    value={editCustomLabel}
                    onChangeText={setEditCustomLabel}
                    placeholder="E.g., Mom's House, Warehouse"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>
              )}

              <View style={styles.section}>
                <Text style={[styles.label, {color: theme.text}]}>Pincode *</Text>
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
                    placeholder="Enter 6-digit pincode"
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
                    Fetching address...
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
                  placeholder="Street address, area, landmark"
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  editable={!isFetchingAddress}
                />
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, {color: theme.text}]}>City</Text>
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
                  placeholder="City"
                  placeholderTextColor={theme.textSecondary}
                  editable={!isFetchingAddress}
                />
              </View>

              <View style={styles.section}>
                <Text style={[styles.label, {color: theme.text}]}>State</Text>
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
                  placeholder="State"
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
                <Text style={[styles.cancelButtonText, {color: theme.text}]}>Cancel</Text>
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
                <Text style={styles.saveButtonText}>Save Address</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
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
});

