import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {providersApi, type Provider} from '../services/api/providersApi';
import {serializeDoctorForNavigation} from '../utils/helpers';
import ReviewsList from '../components/ReviewsList';
import {WorkShowcaseGallery} from '../components/WorkShowcaseGallery';
import AlertModal from '../components/AlertModal';
import ConfirmationModal from '../components/ConfirmationModal';
import useTranslation from '../hooks/useTranslation';
import ProviderRequestModal from '../components/ProviderRequestModal';
import {ActiveRequestConflictBanner} from '../components/ActiveRequestConflictBanner';
import {getActiveServiceRequest} from '../services/api/serviceRequestsApi';
import {isLiveActiveRequest} from '../utils/activeRequestUx';
import {
  contactHintMessage,
  providerPhoneFromApi,
} from '../utils/providerContact';
import {canCallThisProvider, canRequestThisProvider} from 'sapvt-ltd-app-packages';
import {
  matchingProviderService,
  otherVisibleProviderServices,
} from '../utils/matchingProviderService';
import {localizedServiceName} from '../utils/serviceDisplay';
import {
  formatProviderProfileAddressLine,
  hasProviderAddress,
} from '../utils/addressDisplay';
import {isOwnProvider as isOwnProviderProfile} from '../utils/excludeOwnProvider';

interface ProviderDetailsScreenProps {
  navigation?: any;
  route?: {
    params?: {
      provider: Provider;
      doctor?: Provider; // Backward compatibility
      service?: string;
      requestedService?: string;
    };
  };
}

const ProviderDetailsScreen: React.FC<ProviderDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const routeProvider = (route?.params?.provider || route?.params?.doctor) as Provider & {
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
  const insets = useSafeAreaInsets();
  const [imageError, setImageError] = React.useState(false);
  const [provider, setProvider] = useState(routeProvider);
  const [isOnline, setIsOnline] = useState<boolean>((routeProvider as any).isOnline || false);
  const [isAvailable, setIsAvailable] = useState<boolean>(
    (routeProvider as any).isAvailable !== false,
  );
  const [approvalStatus, setApprovalStatus] = useState<string | undefined>(
    (routeProvider as any).approvalStatus,
  );

  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    onClose?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [activeConflict, setActiveConflict] = useState<
    import('../services/api/serviceRequestsApi').ActiveServiceRequestSummary | null
  >(null);
  const [checkingActive, setCheckingActive] = useState(false);

  const requestedService = String(
    route?.params?.requestedService || route?.params?.service || '',
  ).trim();
  const displayService =
    matchingProviderService(provider as any, requestedService) ||
    provider.specialization ||
    (provider as any).specialty ||
    '';
  const professionLabel = displayService
    ? localizedServiceName(displayService)
    : String(t('browse.serviceProvider'));
  const alsoServices = otherVisibleProviderServices(
    provider as any,
    requestedService || undefined,
  ).map(name => localizedServiceName(name));
  const takingRequests =
    typeof (provider as any).isAvailable === 'boolean'
      ? isAvailable
      : isOnline;
  const isVerified =
    provider.verified === true || approvalStatus === 'approved';
  const experienceYears =
    provider.experience != null && Number(provider.experience) > 0
      ? Number(provider.experience)
      : null;
  const experienceValue =
    experienceYears == null
      ? ''
      : experienceYears === 1
        ? `1 ${t('providers.year') || 'year'}`
        : `${experienceYears} ${t('providers.years') || 'years'}`;
  const profileAddressLine = hasProviderAddress(provider as any)
    ? formatProviderProfileAddressLine(provider as any)
    : '';
  const firstName = String(provider.name || '')
    .trim()
    .split(/\s+/)[0];
  const callLabel = firstName
    ? String(t('providers.callNamed', {name: firstName}))
    : String(t('contact.callProvider') || t('providers.callProvider'));
  const requestLabel = String(
    t('request.submit') || t('providers.requestService'),
  );
  const aboutTitle = firstName
    ? String(t('providers.aboutNamed', {name: firstName}))
    : String(t('providers.aboutProvider') || t('provider.about'));
  const reviewCount = Number((provider as any).totalReviews || 0);
  const ratingValue =
    provider.rating && provider.rating > 0 ? provider.rating : 0;
  const ratingSummary =
    ratingValue > 0
      ? `★ ${ratingValue.toFixed(1)}${
          reviewCount > 0
            ? ` · ${reviewCount} ${
                reviewCount === 1
                  ? t('providers.review')
                  : t('providers.reviews')
              }`
            : ''
        }`
      : String(t('provider.newProvider') || t('providers.noReviewsYet'));
  const avatarInitial = String(provider.name || 'A')
    .trim()
    .charAt(0)
    .toUpperCase();
  const canCall = canCallThisProvider(provider as any);
  const canRequest = canRequestThisProvider(provider as any);
  const callPhone = canCall ? providerPhoneFromApi(provider as any) : '';

  // Poll online status + CTA flags from Mongo/backend API
  useEffect(() => {
    const providerId =
      (routeProvider as any).id ||
      (routeProvider as any)._id ||
      (routeProvider as any).uid;
    if (!providerId) return;

    const refresh = async () => {
      try {
        const latest = await providersApi.getById(providerId, {
          serviceType: requestedService || undefined,
        });
        if (latest) {
          setProvider(prev => ({...prev, ...latest} as any));
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
  }, [routeProvider, requestedService]);

  const isOwnProvider = isOwnProviderProfile(provider as any, currentUser);

  const handleRequestService = () => {
    const phoneVerified = currentUser?.phoneVerified === true;
    const customerId = currentUser?.id || currentUser?._id;
    if (!currentUser || !customerId || !phoneVerified) {
      setShowLoginModal(true);
      return;
    }
    if (checkingActive) return;
    const serviceType =
      requestedService ||
      (provider as any).specialization ||
      (provider as any).specialty ||
      (provider as any).serviceType ||
      '';
    setCheckingActive(true);
    void getActiveServiceRequest(serviceType)
      .then(active => {
        if (isLiveActiveRequest(active)) {
          setActiveConflict(active);
          return;
        }
        setRequestModalVisible(true);
      })
      .catch(() => setRequestModalVisible(true))
      .finally(() => setCheckingActive(false));
  };

  const handleCall = () => {
    if (!callPhone) return;
    Linking.openURL(`tel:${callPhone}`).catch(() => {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: t('providers.unableToCall'),
        type: 'error',
      });
    });
  };

  const handleContactUnavailable = () => {
    setAlertModal({
      visible: true,
      title: String(t('contact.unavailable') || t('providers.contactProvider')),
      message: contactHintMessage(
        t as any,
        (provider as any).providerContactHint || (provider as any).contactHint,
        (provider as any).providerContactPolicy ||
          (provider as any).contactPolicy,
      ),
      type: 'info',
    });
  };

  const showFooter = !isOwnProvider && (canCall || canRequest);
  const showUnavailableFooter = !isOwnProvider && !showFooter;
  const footerPadBottom = 12 + insets.bottom;
  const unavailableMessage = !canRequest
    ? String(
        t('provider.notTakingRequests', {
          defaultValue: 'Not taking new requests',
        }),
      )
    : contactHintMessage(
        t as any,
        (provider as any).providerContactHint || (provider as any).contactHint,
        (provider as any).providerContactPolicy ||
          (provider as any).contactPolicy,
      );

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom:
              showFooter || showUnavailableFooter ? 96 + insets.bottom : 24,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.imageContainer}>
            {(() => {
              const imageUrl = (
                (provider as any).profileImage ||
                (provider as any).photo ||
                provider.photos?.[0] ||
                ''
              ).trim();
              const hasValidImage =
                imageUrl !== '' &&
                !imageError &&
                (imageUrl.startsWith('http://') ||
                  imageUrl.startsWith('https://') ||
                  imageUrl.startsWith('file://') ||
                  imageUrl.startsWith('content://'));

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
                  <Text style={styles.avatarInitial}>{avatarInitial}</Text>
                </View>
              );
            })()}
          </View>

          <Text style={[styles.name, {color: theme.text}]}>
            {provider.name}
          </Text>

          <Text style={[styles.specialization, {color: theme.textSecondary}]}>
            {professionLabel}
          </Text>
          {alsoServices.map(svc => (
            <Text
              key={svc}
              style={[styles.alsoService, {color: theme.textSecondary}]}>
              {svc}
            </Text>
          ))}

          <View style={styles.trustCol}>
            <View style={styles.onlineWrap}>
              <View
                style={[
                  styles.onlineDot,
                  {
                    backgroundColor: takingRequests ? '#4CAF50' : '#9E9E9E',
                  },
                ]}
              />
              <Text style={[styles.statusText, {color: theme.textSecondary}]}>
                {takingRequests
                  ? t('provider.availableForRequests')
                  : t('provider.notTakingRequests')}
              </Text>
            </View>
            {isVerified ? (
              <View style={styles.verifiedChip}>
                <Icon
                  name="checkmark-circle"
                  size={16}
                  color={theme.primaryDark || theme.primary}
                />
                <Text
                  style={[
                    styles.verifiedChipText,
                    {color: theme.primaryDark || theme.primary},
                  ]}>
                  {t('provider.verified') || t('settings.verified')}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={[styles.ratingSummary, {color: theme.text}]}>
            {ratingSummary}
          </Text>
        </View>

        <WorkShowcaseGallery theme={theme} photos={(provider as any).photos} />

        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            {aboutTitle}
          </Text>

          {experienceYears != null ? (
            <View style={styles.detailRow}>
              <Icon name="time-outline" size={20} color={theme.primary} />
              <View style={styles.detailInfo}>
                <Text
                  style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  {t('provider.experience') || t('providers.experience')}
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {experienceValue}
                </Text>
              </View>
            </View>
          ) : null}

          <View style={[styles.detailRow, styles.detailRowLast]}>
            <Icon name="location-outline" size={20} color={theme.primary} />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                {t('provider.serviceArea')}
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  {
                    color: profileAddressLine
                      ? theme.text
                      : theme.textSecondary,
                    fontWeight: profileAddressLine ? '500' : '400',
                  },
                ]}>
                {profileAddressLine || t('provider.serviceAreaNotShared')}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.section,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
            },
          ]}>
          <ReviewsList
            providerId={(provider as any).id || (provider as any).uid || ''}
            showHeader
            summaryLabel={ratingValue > 0 ? ratingSummary : undefined}
            collapsedByDefault
          />
        </View>
      </ScrollView>

      {showFooter ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: footerPadBottom,
            },
          ]}>
          {canCall && callPhone ? (
            <TouchableOpacity
              style={[
                styles.footerBtn,
                styles.footerBtnSecondary,
                {borderColor: theme.primary},
              ]}
              onPress={handleCall}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={callLabel}>
              <Icon name="call-outline" size={18} color={theme.primary} />
              <Text
                style={[styles.footerBtnSecondaryText, {color: theme.primary}]}
                numberOfLines={1}>
                {callLabel}
              </Text>
            </TouchableOpacity>
          ) : canCall ? (
            <TouchableOpacity
              style={[
                styles.footerBtn,
                styles.footerBtnSecondary,
                {borderColor: theme.primary},
              ]}
              onPress={handleContactUnavailable}
              activeOpacity={0.7}>
              <Text
                style={[styles.footerBtnSecondaryText, {color: theme.primary}]}
                numberOfLines={1}>
                {t('contact.contactProvider') || t('providers.contactProvider')}
              </Text>
            </TouchableOpacity>
          ) : null}
          {canRequest ? (
            <TouchableOpacity
              style={[
                styles.footerBtn,
                styles.footerBtnPrimary,
                {backgroundColor: theme.primary},
              ]}
              onPress={handleRequestService}
              disabled={checkingActive}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={requestLabel}>
              <Text style={styles.footerBtnPrimaryText} numberOfLines={1}>
                {requestLabel}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : showUnavailableFooter ? (
        <View
          style={[
            styles.footer,
            styles.footerUnavailable,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: footerPadBottom,
            },
          ]}>
          <Text
            style={[
              styles.unavailableFooterText,
              {color: theme.textSecondary},
            ]}>
            {unavailableMessage}
          </Text>
        </View>
      ) : null}

      <ProviderRequestModal
        visible={requestModalVisible}
        provider={provider as any}
        requestedServiceType={requestedService || undefined}
        onClose={() => setRequestModalVisible(false)}
        onSuccess={serviceRequestId => {
          setRequestModalVisible(false);
          navigation.navigate('Services', {
            screen: 'ActiveService',
            params: {serviceRequestId},
          });
        }}
      />

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => {
          if (alertModal.onClose) {
            alertModal.onClose();
          } else {
            setAlertModal({...alertModal, visible: false});
          }
        }}
      />

      <ConfirmationModal
        visible={showLoginModal}
        title={t('auth.verifyMobileToBook')}
        message={t('auth.verifyMobileToBookMessage')}
        confirmText={t('auth.verifyWithOtp')}
        cancelText={t('common.cancel')}
        onConfirm={() => {
          setShowLoginModal(false);
          const serializableProvider = serializeDoctorForNavigation(
            provider as any,
          );
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
      {activeConflict ? (
        <ActiveRequestConflictBanner
          active={activeConflict}
          onDismiss={() => setActiveConflict(null)}
          onView={action => {
            setActiveConflict(null);
            if (action.screen === 'ActiveService') {
              navigation.navigate('Services', {
                screen: 'ActiveService',
                params: action.params,
              });
            } else {
              navigation.navigate('History');
            }
          }}
        />
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 12,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  imageContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center',
    marginBottom: 10,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
    lineHeight: 28,
  },
  specialization: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 20,
  },
  alsoService: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 19,
    marginTop: 2,
  },
  trustCol: {
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  onlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  verifiedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  ratingSummary: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  section: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  reviewsSummary: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  detailRowLast: {
    marginBottom: 0,
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerUnavailable: {
    flexDirection: 'column',
  },
  footerBtn: {
    flex: 1,
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  footerBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  footerBtnPrimary: {
    flex: 1.15,
  },
  footerBtnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  footerBtnPrimaryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    flexShrink: 1,
  },
  unavailableFooterText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    paddingVertical: 4,
  },
});

export default ProviderDetailsScreen;
