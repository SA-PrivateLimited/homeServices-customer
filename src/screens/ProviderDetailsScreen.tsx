import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import database from '@react-native-firebase/database';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import type {Doctor} from '../types/consultation';
import StarRating from '../components/StarRating';
import {serializeDoctorForNavigation} from '../utils/helpers';

interface ProviderDetailsScreenProps {
  navigation: any;
  route: {
    params: {
      provider: Doctor;
    };
  };
}

const ProviderDetailsScreen: React.FC<ProviderDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const {provider} = route.params || {provider: route.params?.doctor}; // Support both provider and doctor for backward compatibility
  const {isDarkMode, currentUser, setRedirectAfterLogin} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [imageError, setImageError] = React.useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(provider.isOnline || false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  // Fetch real-time online status from Realtime Database
  useEffect(() => {
    const providerId = (provider as any).id || (provider as any).uid;
    if (!providerId) return;

    // Listen to real-time online status
    const statusRef = database().ref(`providers/${providerId}/status`);
    
    const unsubscribe = statusRef.on('value', (snapshot) => {
      if (snapshot.exists()) {
        const status = snapshot.val();
        setIsOnline(status.isOnline === true);
        setIsAvailable(status.isAvailable !== false); // Default to true if not set
      }
    });

    return () => {
      statusRef.off('value', unsubscribe);
    };
  }, [provider]);

  // Helper function to get initials from name
  const getInitials = (name: string): string => {
    if (!name || name.trim() === '') return '';
    
    const nameParts = name.trim().split(/\s+/);
    
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
  };

  // Check if provider is approved (safety check)
  const isApproved = provider.approvalStatus === 'approved' || 
                     (!provider.approvalStatus && provider.verified === true);

  const handleBookConsultation = () => {
    // Prevent booking if provider is not approved
    if (!isApproved) {
      Alert.alert(
        'Provider Not Available',
        'This provider is not currently available for service requests. Please select another provider.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
      return;
    }

    // Check if provider is online and available
    if (!isOnline || !isAvailable) {
      Alert.alert(
        'Provider Not Available',
        'This provider is not currently online or available for service requests. Please select another provider.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
      return;
    }
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'Please login to request a service',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Login',
            onPress: () => {
              const serializableProvider = serializeDoctorForNavigation(provider);
              setRedirectAfterLogin({route: 'ProviderDetails', params: {provider: serializableProvider}});
              navigation.navigate('Login');
            },
          },
        ],
      );
      return;
    }

    const serializableProvider = serializeDoctorForNavigation(provider);
    navigation.navigate('ServiceRequest', {provider: serializableProvider});
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Provider Header */}
        <View
          style={[
            styles.headerCard,
            {backgroundColor: theme.card},
            commonStyles.shadowMedium,
          ]}>
          <View style={styles.imageContainer}>
            {(() => {
              const imageUrl = (provider.profileImage || provider.photo || '').trim();
              const hasValidImage = imageUrl !== '' && !imageError && 
                (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || 
                 imageUrl.startsWith('file://') || imageUrl.startsWith('content://'));
              
              if (hasValidImage) {
                return (
              <Image
                    source={{uri: imageUrl}}
                style={styles.image}
                    onError={() => setImageError(true)}
                resizeMode="cover"
              />
                );
              }
              
              return (
              <View
                style={[
                  styles.imagePlaceholder,
                  {backgroundColor: theme.primary},
                ]}>
                <Icon name="person" size={60} color="#fff" />
              </View>
              );
            })()}
            {provider.verified && (
              <View
                style={[styles.verifiedBadge, {backgroundColor: '#4CAF50'}]}>
                <Icon name="checkmark-circle" size={20} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={[styles.name, {color: theme.text}]}>
              {provider.name}
            </Text>
            <Text style={[styles.specialization, {color: theme.textSecondary}]}>
              {provider.specialization || provider.specialty || 'Service Provider'}
            </Text>

            {/* Online Status Indicator */}
            <View style={styles.statusRow}>
              <View style={[
                styles.statusIndicator,
                {backgroundColor: isOnline && isAvailable ? '#4CAF50' : '#9E9E9E'}
              ]}>
                <View style={[
                  styles.statusDot,
                  {backgroundColor: isOnline && isAvailable ? '#fff' : '#fff'}
                ]} />
              </View>
              <Text style={[styles.statusText, {color: theme.textSecondary}]}>
                {isOnline && isAvailable ? 'Online - Available' : 'Offline - Not Available'}
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <StarRating rating={provider.rating || 0} size={18} />
              <Text style={[styles.ratingText, {color: theme.textSecondary}]}>
                {provider.rating?.toFixed(1) || '0.0'} ({provider.totalConsultations || 0}{' '}
                {provider.totalConsultations === 1 ? 'service' : 'services'})
              </Text>
            </View>

            <View style={styles.contactRow}>
              <Icon name="mail-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.contactText, {color: theme.textSecondary}]}>
                {provider.email || 'Not provided'}
              </Text>
            </View>

            {provider.phone && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => {
                  const phoneNumber = provider.phone.replace(/[^\d+]/g, '');
                  Linking.openURL(`tel:${phoneNumber}`).catch(() => {
                    Alert.alert('Error', 'Unable to make phone call');
                  });
                }}
                activeOpacity={0.7}>
                <Icon name="call-outline" size={16} color={theme.primary} />
                <Text style={[styles.contactText, styles.phoneText, {color: theme.primary}]}>
                  {provider.phone}
                </Text>
                <Icon name="call" size={14} color={theme.primary} style={styles.callIcon} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Details Section */}
        <View
          style={[
            styles.section,
            {backgroundColor: theme.card},
            commonStyles.shadowSmall,
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            About Provider
          </Text>

          {/* Address */}
          {(provider as any).address && (
            <View style={styles.detailRow}>
              <Icon name="location-outline" size={20} color={theme.primary} />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  Address
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {(provider as any).address.address || ''}
                  {(provider as any).address.city && `, ${(provider as any).address.city}`}
                  {(provider as any).address.state && `, ${(provider as any).address.state}`}
                  {(provider as any).address.pincode && ` - ${(provider as any).address.pincode}`}
                </Text>
              </View>
            </View>
          )}

          {/* Experience */}
          {provider.experience && (
            <View style={styles.detailRow}>
              <Icon name="time-outline" size={20} color={theme.primary} />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  Experience
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {provider.experience} {provider.experience === 1 ? 'year' : 'years'}
                </Text>
              </View>
            </View>
          )}

          {/* Languages */}
          {provider.languages && provider.languages.length > 0 && (
            <View style={styles.detailRow}>
              <Icon name="language-outline" size={20} color={theme.primary} />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  Languages
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {provider.languages.join(', ')}
                </Text>
              </View>
            </View>
          )}

          {/* Qualifications (if available) */}
          {provider.qualifications && provider.qualifications.length > 0 && (
            <View style={styles.detailRow}>
              <Icon name="school-outline" size={20} color={theme.primary} />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  Qualifications
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {Array.isArray(provider.qualifications) 
                    ? provider.qualifications.join(', ')
                    : provider.qualifications}
                </Text>
              </View>
            </View>
          )}

          {/* Service Type */}
          <View style={styles.detailRow}>
            <Icon name="build-outline" size={20} color={theme.primary} />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                Service Type
              </Text>
              <Text style={[styles.detailValue, {color: theme.text}]}>
                {provider.specialization || provider.specialty || 'Service Provider'}
              </Text>
            </View>
          </View>
        </View>

        {/* Reviews Section (Placeholder) */}
        <View
          style={[
            styles.section,
            {backgroundColor: theme.card},
            commonStyles.shadowSmall,
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            Customer Reviews
          </Text>
          <Text style={[styles.comingSoonText, {color: theme.textSecondary}]}>
            Reviews coming soon
          </Text>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={[styles.footer, {backgroundColor: theme.card}]}>
        <TouchableOpacity
          style={[styles.bookButton, {backgroundColor: theme.primary}]}
          onPress={handleBookConsultation}>
          <Text style={styles.bookButtonText}>Request Service</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 12,
    padding: 4,
  },
  headerInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  specialization: {
    fontSize: 16,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactText: {
    fontSize: 14,
    marginLeft: 8,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  feeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  comingSoonText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  feeInfo: {
    flex: 1,
  },
  feeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  bookButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ProviderDetailsScreen;
