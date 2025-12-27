import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';

interface PincodeTooltipProps {
  visible: boolean;
  onClose: () => void;
  pincode: string;
  location?: {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

const PincodeTooltip: React.FC<PincodeTooltipProps> = ({
  visible,
  onClose,
  pincode,
  location,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const getLocationText = () => {
    if (!location) return 'Location details not available';
    
    const parts: string[] = [];
    if (location.address) parts.push(location.address);
    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.country) parts.push(location.country);
    
    if (parts.length === 0) return 'Location details not available';
    return parts.join(', ');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.tooltipContainer,
                {
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                  shadowColor: theme.text,
                },
              ]}>
              {/* Arrow pointing up */}
              <View
                style={[
                  styles.arrow,
                  {
                    borderBottomColor: theme.card,
                  },
                ]}
              />

              {/* Header */}
              <View style={styles.header}>
                <View style={[styles.iconContainer, {backgroundColor: theme.primary + '20'}]}>
                  <Icon name="location" size={24} color={theme.primary} />
                </View>
                <View style={styles.headerText}>
                  <Text style={[styles.title, {color: theme.text}]}>Location</Text>
                  <Text style={[styles.pincode, {color: theme.primary}]}>{pincode}</Text>
                </View>
              </View>

              {/* Location Details */}
              <View style={[styles.content, {borderTopColor: theme.border}]}>
                <View style={styles.detailRow}>
                  <Icon name="map-outline" size={18} color={theme.textSecondary} />
                  <Text style={[styles.detailText, {color: theme.text}]} numberOfLines={3}>
                    {getLocationText()}
                  </Text>
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                style={[styles.closeButton, {backgroundColor: theme.background}]}
                onPress={onClose}
                activeOpacity={0.7}>
                <Text style={[styles.closeButtonText, {color: theme.primary}]}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  tooltipContainer: {
    width: '100%',
    maxWidth: 350,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  arrow: {
    position: 'absolute',
    top: -8,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  pincode: {
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    paddingTop: 16,
    borderTopWidth: 1,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default PincodeTooltip;

