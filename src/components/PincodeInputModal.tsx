import React, {useState, useEffect} from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import GeolocationService from '../services/geolocationService';

interface PincodeInputModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (pincode: string) => void;
}

/**
 * Modal for entering pincode manually
 */
const PincodeInputModal: React.FC<PincodeInputModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [pincode, setPincode] = useState('');
  const [address, setAddress] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isFetchingAddress, setIsFetchingAddress] = useState(false);

  // Load user's existing pincode and address when modal opens
  useEffect(() => {
    if (visible && currentUser) {
      const loadUserLocation = async () => {
        try {
          const userDoc = await firestore()
            .collection('users')
            .doc(currentUser.id)
            .get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            const location = userData?.location;
            
            if (location?.pincode) {
              setPincode(location.pincode);
              
              // Build address from location data
              if (location.address) {
                setAddress(location.address);
              } else if (location.city || location.state) {
                const addressParts = [];
                if (location.city) addressParts.push(location.city);
                if (location.state) addressParts.push(location.state);
                if (location.pincode) addressParts.push(location.pincode);
                setAddress(addressParts.join(', '));
              }
            }
          }
        } catch (error) {
        }
      };
      
      loadUserLocation();
    } else if (!visible) {
      // Reset when modal closes
      setPincode('');
      setAddress('');
    }
  }, [visible, currentUser]);

  // Fetch address when pincode changes (debounced)
  useEffect(() => {
    if (!pincode.trim() || pincode.trim().length < 6) {
      setAddress('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsFetchingAddress(true);
      try {
        const addressData = await GeolocationService.geocodePincode(pincode.trim());
        if (addressData.address) {
          setAddress(addressData.address);
        } else {
          setAddress('');
        }
      } catch (error) {
        setAddress('');
      } finally {
        setIsFetchingAddress(false);
      }
    }, 800); // Debounce for 800ms

    return () => clearTimeout(timeoutId);
  }, [pincode]);

  const handleSave = async () => {
    if (!pincode.trim()) {
      Alert.alert('Error', 'Please enter a valid pincode');
      return;
    }

    if (pincode.trim().length < 4) {
      Alert.alert('Error', 'Pincode must be at least 4 digits');
      return;
    }

    const currentUser = auth().currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'Please login to save your pincode');
      return;
    }

    setIsSaving(true);
    try {
      // Get address data if available
      let addressData: any = {
        pincode: pincode.trim(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // Try to fetch address if not already set
      if (!address) {
        const geocodeData = await GeolocationService.geocodePincode(pincode.trim());
        if (geocodeData.address) {
          addressData.address = geocodeData.address;
          addressData.city = geocodeData.city;
          addressData.state = geocodeData.state;
          addressData.country = geocodeData.country;
          if (geocodeData.latitude) addressData.latitude = geocodeData.latitude;
          if (geocodeData.longitude) addressData.longitude = geocodeData.longitude;
        }
      } else {
        // Use existing address if available
        const userDoc = await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();
        const userData = userDoc.data();
        const location = userData?.location;
        if (location) {
          if (location.address) addressData.address = location.address;
          if (location.city) addressData.city = location.city;
          if (location.state) addressData.state = location.state;
          if (location.country) addressData.country = location.country;
          if (location.latitude) addressData.latitude = location.latitude;
          if (location.longitude) addressData.longitude = location.longitude;
        }
      }

      // Save pincode and address to user profile
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .set(
          {
            location: addressData,
          },
          {merge: true},
        );

      // Notify parent component (PincodeHeader) to show success modal
      onSuccess(pincode.trim());
      setPincode('');
      setAddress('');
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save pincode. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      // Check permission status first
      const permissionStatus = await GeolocationService.checkLocationPermission();
      
      // If permission was denied or never ask again, show alert to go to settings
      if (permissionStatus === 'denied' || permissionStatus === 'never_ask_again') {
        Alert.alert(
          'Location Permission Denied',
          'Location permission was denied. Please enable it in Settings to auto-detect your pincode, or enter it manually.',
          [{text: 'OK'}],
        );
        setIsDetecting(false);
        return;
      }

      // Request permission if not determined
      if (permissionStatus === 'not_determined') {
        const requestResult = await GeolocationService.requestLocationPermission();
        if (requestResult !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Location permission is required to auto-detect your pincode. Please enable it or enter pincode manually.',
            [{text: 'OK'}],
          );
          setIsDetecting(false);
          return;
        }
      }

      // Wrap location call in timeout to prevent hanging
      const locationPromise = GeolocationService.getCurrentLocation();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Location detection timeout')), 15000)
      );

      const location = await Promise.race([locationPromise, timeoutPromise]);
      
      if (location?.pincode) {
        setPincode(location.pincode);
        // Set address if available
        if (location.address) {
          setAddress(location.address);
        } else if (location.city || location.state) {
          const addressParts = [];
          if (location.city) addressParts.push(location.city);
          if (location.state) addressParts.push(location.state);
          if (location.pincode) addressParts.push(location.pincode);
          setAddress(addressParts.join(', '));
        }
        Alert.alert(
          'Location Detected',
          `Detected pincode: ${location.pincode}. Click Save to confirm.`,
        );
      } else {
        Alert.alert(
          'Detection Failed',
          'Could not detect pincode. Please enter it manually.',
        );
      }
    } catch (error: any) {
      const errorMessage = error?.message || String(error) || 'Unknown error';
      let userMessage = 'Could not detect your location. Please enter pincode manually.';
      
      if (errorMessage.includes('permission') || errorMessage.includes('Permission')) {
        userMessage = 'Location permission is required. Please enable it in settings or enter pincode manually.';
      } else if (errorMessage.includes('timeout') || errorMessage.includes('Timeout')) {
        userMessage = 'Location detection timed out. Please try again or enter pincode manually.';
      } else if (errorMessage.includes('unavailable') || errorMessage.includes('UNAVAILABLE')) {
        userMessage = 'Location services are unavailable. Please enable location services or enter pincode manually.';
      }
      
      Alert.alert(
        'Detection Failed',
        userMessage,
      );
    } finally {
      setIsDetecting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
          <View style={styles.header}>
            <Text style={[styles.title, {color: theme.text}]}>
              Enter Your Pincode
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.description, {color: theme.textSecondary}]}>
            Enter your pincode to help us provide better service. You can also
            try auto-detecting your location.
          </Text>

          <View style={styles.inputContainer}>
            <Icon
              name="location"
              size={20}
              color={theme.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, {color: theme.text, borderColor: theme.border}]}
              placeholder="Enter pincode"
              placeholderTextColor={theme.textSecondary}
              value={pincode}
              onChangeText={setPincode}
              keyboardType="number-pad"
              maxLength={10}
              autoFocus
            />
          </View>

          {/* Address Display */}
          {(address || isFetchingAddress) && (
            <View style={[styles.addressContainer, {backgroundColor: theme.background, borderColor: theme.border}]}>
              {isFetchingAddress ? (
                <View style={styles.addressLoading}>
                  <ActivityIndicator size="small" color={theme.primary} />
                  <Text style={[styles.addressText, {color: theme.textSecondary}]}>
                    Fetching address...
                  </Text>
                </View>
              ) : (
                <>
                  <Icon name="home" size={18} color={theme.primary} style={styles.addressIcon} />
                  <View style={styles.addressContent}>
                    <Text style={[styles.addressLabel, {color: theme.textSecondary}]}>
                      Address
                    </Text>
                    <Text style={[styles.addressText, {color: theme.text}]} numberOfLines={2}>
                      {address || 'Address not available'}
                    </Text>
                  </View>
                </>
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={handleAutoDetect}
            disabled={isDetecting}
            style={[
              styles.autoDetectButton,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}>
            {isDetecting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <Icon name="locate" size={18} color={theme.primary} />
                <Text style={[styles.autoDetectText, {color: theme.primary}]}>
                  Auto-detect Location
                </Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              onPress={onClose}
              style={[styles.cancelButton, {borderColor: theme.border}]}>
              <Text style={[styles.cancelButtonText, {color: theme.text}]}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSave}
              disabled={isSaving || !pincode.trim()}
              style={[
                styles.saveButton,
                {
                  backgroundColor: theme.primary,
                  opacity: isSaving || !pincode.trim() ? 0.5 : 1,
                },
              ]}>
              {isSaving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    marginBottom: 24,
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 50,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    borderWidth: 0,
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  addressIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  addressContent: {
    flex: 1,
  },
  addressLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addressLabel: {
    fontSize: 11,
    marginBottom: 4,
    fontWeight: '500',
  },
  addressText: {
    fontSize: 14,
    lineHeight: 20,
  },
  autoDetectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
    gap: 8,
  },
  autoDetectText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PincodeInputModal;

