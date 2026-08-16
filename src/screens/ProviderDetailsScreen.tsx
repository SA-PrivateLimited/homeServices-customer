import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import {providersApi, type Provider} from '../services/api/providersApi';
import StarRating from '../components/StarRating';
import {serializeDoctorForNavigation} from '../utils/helpers';
import ReviewsList from '../components/ReviewsList';
import AlertModal from '../components/AlertModal';
import ConfirmationModal from '../components/ConfirmationModal';
import useTranslation from '../hooks/useTranslation';
import ProviderRequestModal from '../components/ProviderRequestModal';
import {getActiveServiceRequest} from '../services/api/serviceRequestsApi';
import {activeRequestCopy} from '../utils/activeRequestUx';
import {contactHintMessage} from '../utils/providerContact';

interface ProviderDetailsScreenProps {
  navigation: any;
  route: {
    params: {
      provider: Provider;
      doctor?: Provider; // Backward compatibility
    };
  };
}

const ProviderDetailsScreen: React.FC<ProviderDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const provider = (route.params?.provider || route.params?.doctor) as Provider & {
    profileImage?: string;
    photo?: string;
    specialty?: string;
    totalConsultations?: number;
    phone?: string;
    languages?: string[];
    qualifications?: string[];
  };
  const {isDarkMode, currentUser, setRedirectAfterLogin} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const [imageError, setImageError] = React.useState(false);
  const [isOnline, setIsOnline] = useState<boolean>((provider as any).isOnline || false);
  const [isAvailable, setIsAvailable] = useState<boolean>(true);
  const [approvalStatus, setApprovalStatus] = useState<string | undefined>(
    (provider as any).approvalStatus,
  );

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    buttonText?: string;
    onClose?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [checkingActive, setCheckingActive] = useState(false);

  // Poll online status from Mongo/backend API
  useEffect(() => {
    const providerId =
      (provider as any).id ||
      (provider as any)._id ||
      (provider as any).uid;
    if (!providerId) return;

    const refresh = async () => {
      try {
        const latest = await providersApi.getById(providerId);
        if (latest) {
          setIsOnline(!!(latest as any).isOnline);
          setIsAvailable((latest as any).isAvailable !== false);
          if ((latest as any).approvalStatus) {
            setApprovalStatus((latest as any).approvalStatus);
          }
        }
      } catch {
        // keep last known status
      }
    };

    refresh();
    const interval = setInterval(refresh, 15000);
    return () => clearInterval(interval);
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

  // Browse list only shows approved providers; missing status should not block requests.
  // Only block when explicitly pending/rejected.
  const showActiveConflict = (active: {
    serviceRequestId: string;
    serviceType: string;
    status: string;
  }) => {
    const copy = activeRequestCopy(t, active);
    setAlertModal({
      visible: true,
      title: copy.title,
      message: copy.message,
      type: 'info',
      buttonText: copy.viewLabel,
      onClose: () => {
        setAlertModal(prev => ({...prev, visible: false}));
        navigation.navigate('Services', {
          screen: 'ActiveService',
          params: {serviceRequestId: active.serviceRequestId},
        });
      },
    });
  };

  const handleRequestService = async () => {
    const phoneVerified = currentUser?.phoneVerified === true;
    const customerId = currentUser?.id || currentUser?._id;
    if (!currentUser || !customerId || !phoneVerified) {
      setShowLoginModal(true);
      return;
    }
    if (checkingActive) return;
    setCheckingActive(true);
    try {
      const serviceType =
        (provider as any).specialization ||
        (provider as any).specialty ||
        (provider as any).serviceType ||
        'Service';
      const active = await getActiveServiceRequest(serviceType);
      if (active?.serviceRequestId) {
        showActiveConflict(active);
        return;
      }
      setRequestModalVisible(true);
    } catch {
      setRequestModalVisible(true);
    } finally {
      setCheckingActive(false);
    }
  };

  const handleContactProvider = () => {
    const phoneVerified = currentUser?.phoneVerified === true;
    const customerId = currentUser?.id || currentUser?._id;
    if (!currentUser || !customerId || !phoneVerified) {
      setAlertModal({
        visible: true,
        title: t('providers.contactSignInTitle'),
        message: t('providers.contactSignInMessage'),
        type: 'info',
        onClose: () => {
          setAlertModal(prev => ({...prev, visible: false}));
          setShowLoginModal(true);
        },
      });
      return;
    }
    setAlertModal({
      visible: true,
      title: t('providers.contactUnavailable'),
      message: contactHintMessage(
        key => String(t(key)),
        undefined,
        provider.providerContactPolicy,
      ),
      type: 'info',
    });
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
              const imageUrl = ((provider as any).profileImage || (provider as any).photo || provider.photos?.[0] || '').trim();
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
              {provider.specialization || (provider as any).specialty || 'Service Provider'}
            </Text>
            {((provider as any).address?.district ||
              (provider as any).location?.district ||
              (provider as any).address?.city) ? (
              <Text style={[styles.statusText, {color: theme.textSecondary, marginTop: 4}]}>
                {t('providers.district')}:{' '}
                {(provider as any).address?.district ||
                  (provider as any).location?.district ||
                  (provider as any).address?.city}
              </Text>
            ) : null}

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
                {isOnline && isAvailable ? t('providers.onlineAvailable') : t('providers.offlineNotAvailable')}
              </Text>
            </View>

            <View style={styles.ratingRow}>
              <StarRating rating={provider.rating || 0} size={18} />
              <Text style={[styles.ratingText, {color: theme.textSecondary}]}>
                {provider.rating?.toFixed(1) || '0.0'} ({(provider as any).totalConsultations || provider.totalReviews || 0}{' '}
                {((provider as any).totalConsultations || provider.totalReviews || 0) === 1 ? t('providers.service') : t('providers.services')})
              </Text>
            </View>
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
            {t('providers.aboutProvider')}
          </Text>

          {/* Address */}
          {(provider as any).address && (
            <View style={styles.detailRow}>
              <Icon name="location-outline" size={20} color={theme.primary} />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  {t('profile.address')}
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
          {provider.experience ? (
            <View style={styles.detailRow}>
              <Icon name="time-outline" size={20} color={theme.primary} />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  {t('providers.experience')}
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {t('providers.experienceWithYears', {years: provider.experience, count: provider.experience})}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Languages */}
          {(provider as any).languages && (provider as any).languages.length > 0 ? (
            <View style={styles.detailRow}>
              <Icon name="language-outline" size={20} color={theme.primary} />
              <View style={styles.detailInfo}>
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  {t('providers.languages')}
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {(provider as any).languages.join(', ')}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Reviews Section */}
        <View
          style={[
            styles.section,
            {backgroundColor: theme.card},
            commonStyles.shadowSmall,
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            {t('providers.customerReviews')}
          </Text>
          <ReviewsList 
            providerId={(provider as any).id || (provider as any).uid || ''} 
            showHeader={false}
          />
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={[styles.footer, {backgroundColor: theme.card}]}>
        <TouchableOpacity
          style={[
            styles.bookButton,
            {
              backgroundColor: 'transparent',
              borderWidth: 1,
              borderColor: theme.primary,
              marginBottom: 8,
            },
          ]}
          onPress={handleContactProvider}>
          <Text style={[styles.bookButtonText, {color: theme.primary}]}>
            {t('providers.contactProvider')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.bookButton, {backgroundColor: theme.primary}]}
          onPress={handleRequestService}>
          <Text style={styles.bookButtonText}>{t('providers.requestService')}</Text>
        </TouchableOpacity>
      </View>

      <ProviderRequestModal
        visible={requestModalVisible}
        provider={provider as any}
        onClose={() => setRequestModalVisible(false)}
        onSuccess={(serviceRequestId) => {
          setRequestModalVisible(false);
          navigation.navigate('Services', {
            screen: 'ActiveService',
            params: {serviceRequestId},
          });
        }}
        onActiveConflict={(active) => {
          setRequestModalVisible(false);
          showActiveConflict(active);
        }}
      />

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        buttonText={alertModal.buttonText}
        onClose={() => {
          if (alertModal.onClose) {
            alertModal.onClose();
          } else {
            setAlertModal({...alertModal, visible: false});
          }
        }}
      />

      {/* Login Confirmation Modal */}
      <ConfirmationModal
        visible={showLoginModal}
        title={t('auth.verifyMobileToBook')}
        message={t('auth.verifyMobileToBookMessage')}
        confirmText={t('auth.verifyWithOtp')}
        cancelText={t('common.cancel')}
        onConfirm={() => {
          setShowLoginModal(false);
          const serializableProvider = serializeDoctorForNavigation(provider as any);
          setRedirectAfterLogin({
            route: 'ProviderDetails',
            params: {
              provider: serializableProvider,
            },
          });
          navigation.navigate('Login');
        }}
        onCancel={() => setShowLoginModal(false)}
      />
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
