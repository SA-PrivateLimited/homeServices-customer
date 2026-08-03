import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {usePincodeDetection} from '../hooks/usePincodeDetection';
import PincodeInputModal from './PincodeInputModal';
import PincodeSuccessModal from './PincodeSuccessModal';
import PincodeTooltip from './PincodeTooltip';
import {usersApi} from '../services/api/usersApi';
import {getStoredJwt} from '../services/session';

interface PincodeHeaderProps {
  onPress?: () => void;
}

const PincodeHeader: React.FC<PincodeHeaderProps> = ({onPress}) => {
  const {isDarkMode, setCurrentPincode, currentUser} = useStore();
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

  useEffect(() => {
    const loadLocationData = async () => {
      if (!currentPincode) {
        setLocationData(null);
        return;
      }

      try {
        const loc = currentUser?.location;
        if (loc) {
          setLocationData({
            address: loc.address,
            city: loc.city,
            state: loc.state,
          });
          return;
        }

        if (!(await getStoredJwt())) {
          setLocationData(null);
          return;
        }

        const me = await usersApi.getMe();
        if (me?.location) {
          setLocationData({
            address: me.location.address,
            city: me.location.city,
            state: me.location.state,
          });
        } else {
          setLocationData(null);
        }
      } catch {
        setLocationData(null);
      }
    };

    loadLocationData();
  }, [currentPincode, currentUser]);

  const handlePress = () => {
    if (currentPincode && locationData) {
      setShowTooltip(true);
    } else if (onPress) {
      onPress();
    } else {
      setModalVisible(true);
    }
  };

  const handleLongPress = () => {
    if (onPress) {
      onPress();
    } else {
      setModalVisible(true);
    }
  };

  const handlePincodeSaved = async (pincode: string) => {
    setCurrentPincode(pincode);
    try {
      const me = await usersApi.getMe();
      if (me?.location?.address) {
        setSavedAddress(me.location.address);
      }
    } catch {
      // ignore
    }
    setSavedPincode(pincode);
    setTimeout(() => setShowSuccessModal(true), 300);
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        onLongPress={handleLongPress}
        style={[styles.container, {backgroundColor: theme.card}]}
        activeOpacity={0.7}>
        <Icon
          name="location"
          size={16}
          color={theme.primary}
          style={styles.icon}
        />
        {isDetecting ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Text style={[styles.pincodeText, {color: theme.text}]}>
            {currentPincode || 'Set Location'}
          </Text>
        )}
        {currentPincode && locationData && (
          <Icon
            name="information-circle-outline"
            size={14}
            color={theme.textSecondary}
            style={styles.infoIcon}
          />
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
