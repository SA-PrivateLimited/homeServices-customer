import React, {useState, useEffect} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {usePincodeDetection} from '../hooks/usePincodeDetection';
import PincodeInputModal from './PincodeInputModal';
import PincodeSuccessModal from './PincodeSuccessModal';
import PincodeTooltip from './PincodeTooltip';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

interface PincodeHeaderProps {
  onPress?: () => void;
}

/**
 * PincodeHeader Component
 * Displays the current detected pincode in the header
 * Shows loading indicator while detecting
 * Opens modal to enter pincode manually if clicked
 */
const PincodeHeader: React.FC<PincodeHeaderProps> = ({onPress}) => {
  const {isDarkMode, setCurrentPincode} = useStore();
  const {currentPincode, isDetecting} = usePincodeDetection();
  const [modalVisible, setModalVisible] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [savedPincode, setSavedPincode] = useState<string>('');
  const [savedAddress, setSavedAddress] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState(false);
  const [locationData, setLocationData] = useState<{
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  } | null>(null);
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Load location data from Firestore
  useEffect(() => {
    const loadLocationData = async () => {
      if (!currentPincode) {
        setLocationData(null);
        return;
      }

      try {
        const currentUser = auth().currentUser;
        if (currentUser) {
          const userDoc = await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .get();
          
          if (userDoc.exists) {
            const userData = userDoc.data();
            const location = userData?.location;
            
            if (location) {
              setLocationData({
                address: location.address,
                city: location.city,
                state: location.state,
                country: location.country,
              });
            } else {
              setLocationData(null);
            }
          }
        }
      } catch (error) {
        setLocationData(null);
      }
    };

    loadLocationData();
  }, [currentPincode]);

  const handlePress = () => {
    if (currentPincode && locationData) {
      // Show tooltip if pincode and location are available
      setShowTooltip(true);
    } else {
      // Open input modal if no pincode or location
      if (onPress) {
        onPress();
      } else {
        setModalVisible(true);
      }
    }
  };

  const handleLongPress = () => {
    // Always open input modal on long press
    if (onPress) {
      onPress();
    } else {
      setModalVisible(true);
    }
  };

  const handlePincodeSaved = async (pincode: string) => {
    setCurrentPincode(pincode);
    
    // Get saved address from Firestore to show in success modal
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        const userDoc = await firestore().collection('users').doc(currentUser.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          const location = userData?.location;
          if (location?.address) {
            setSavedAddress(location.address);
          }
        }
      }
    } catch (error) {
    }
    
    setSavedPincode(pincode);
    // Show success modal after a small delay to allow input modal to close
    setTimeout(() => {
      setShowSuccessModal(true);
    }, 300);
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={[styles.container, {backgroundColor: theme.card}]}
        activeOpacity={0.7}>
        <Icon name="location" size={16} color={theme.primary} style={styles.icon} />
        {isDetecting ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Text style={[styles.pincodeText, {color: theme.text}]}>
            {currentPincode || 'Set Location'}
          </Text>
        )}
        {currentPincode && locationData && (
          <Icon name="information-circle-outline" size={14} color={theme.textSecondary} style={styles.infoIcon} />
        )}
        {currentPincode && !locationData && (
          <Icon name="chevron-down" size={14} color={theme.textSecondary} />
        )}
      </TouchableOpacity>

      <PincodeInputModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSuccess={handlePincodeSaved}
      />

      <PincodeSuccessModal
        visible={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        pincode={savedPincode}
        address={savedAddress}
      />

      {currentPincode && (
        <PincodeTooltip
          visible={showTooltip}
          onClose={() => setShowTooltip(false)}
          pincode={currentPincode}
          location={locationData || undefined}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  icon: {
    marginRight: 6,
  },
  pincodeText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 4,
  },
  infoIcon: {
    marginLeft: 4,
  },
});

export default PincodeHeader;

