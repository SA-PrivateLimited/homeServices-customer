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
import StarRating from '../components/StarRating';
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
import {CrystalSurface} from '../components/CrystalSurface';
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
  const experienceLabel =
    experienceYears == null
      ? ''
      : experienceYears === 1
        ? String(t('common.yearExperience', {count: experienceYears}))
        : String(t('common.yearsExperience', {count: experienceYears}));
  const profileAddressLine = hasProviderAddress(provider as any)
    ? formatProviderProfileAddressLine(provider as any)
    : '';
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
          {paddingBottom:
            showFooter || showUnavailableFooter ? 120 + insets.bottom : 24},
        ]}>
        {/* Hero — web .pd-hero */}
        <CrystalSurface
          primary={theme.primary}
          card={theme.card}
          isDark={isDarkMode}
          accent
          radius={18}
          style={styles.surfaceCard}
          contentStyle={styles.heroInner}>
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
                  <Icon name="person" size={40} color="#fff" />
                </View>
              );
            })()}
          </View>

          <View style={styles.headerInfo}>
            <Text style={[styles.name, {color: theme.text}]}>
              {provider.name}
            </Text>
            <Text style={[styles.specialization, {color: theme.textSecondary}]}>
              {professionLabel}
            </Text>
            {alsoServices.length > 0 ? (
              <View style={styles.alsoRow}>
                <Text style={[styles.alsoLead, {color: theme.textSecondary}]}>
                  {t('browse.alsoLead')}
                </Text>
                <View style={styles.alsoList}>
                  {alsoServices.map(svc => (
                    <View
                      key={svc}
                      style={[
                        styles.alsoChip,
                        {backgroundColor: `${theme.primary}14`},
                      ]}>
                      <Text style={[styles.alsoChipText, {color: theme.text}]}>
                        {svc}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Trust row — filled 8px online-dot + verified chip */}
            <View style={styles.trustRow}>
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
                    {t('provider.verified')}
                  </Text>
                </View>
              ) : null}
            </View>

            <View style={styles.metaRow}>
              {provider.rating && provider.rating > 0 ? (
                <View style={styles.ratingRow}>
                  <StarRating rating={provider.rating || 0} size={16} />
                  <Text
                    style={[styles.ratingText, {color: theme.textSecondary}]}>
                    {provider.rating?.toFixed(1) || '0.0'}
                    {(provider as any).totalReviews > 0
                      ? ` (${(provider as any).totalReviews})`
                      : ''}
                  </Text>
                </View>
              ) : (
                <Text style={[styles.ratingText, {color: theme.textSecondary}]}>
                  {t('provider.newProvider')}
                </Text>
              )}
              {experienceLabel ? (
                <Text
                  style={[styles.expChip, {color: theme.textSecondary}]}>
                  {experienceLabel}
                </Text>
              ) : null}
            </View>
          </View>
        </CrystalSurface>

        <WorkShowcaseGallery theme={theme} photos={(provider as any).photos} />

        {/* About — web .pd-section */}
        <CrystalSurface
          primary={theme.primary}
          card={theme.card}
          isDark={isDarkMode}
          accent
          radius={18}
          style={styles.surfaceCard}
          contentStyle={styles.sectionInner}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            {t('provider.about')}
          </Text>

          {experienceYears != null ? (
            <View style={styles.detailRow}>
              <Icon name="time-outline" size={20} color={theme.primary} />
              <View style={styles.detailInfo}>
                <Text
                  style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  {t('provider.experience')}
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {experienceLabel}
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
        </CrystalSurface>

        {/* Reviews — web .pd-section */}
        <CrystalSurface
          primary={theme.primary}
          card={theme.card}
          isDark={isDarkMode}
          accent
          radius={18}
          style={styles.surfaceCard}
          contentStyle={styles.sectionInner}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            {t('review.customerReviews') || t('providers.customerReviews')}
          </Text>
          <ReviewsList
            providerId={(provider as any).id || (provider as any).uid || ''}
            showHeader={false}
          />
        </CrystalSurface>
      </ScrollView>

      {/* Sticky footer — Call (no digits) + Request stacked */}
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
              accessibilityLabel={String(
                t('contact.callProvider') || t('providers.callProvider'),
              )}>
              <Icon name="call-outline" size={18} color={theme.primary} />
              <Text style={[styles.footerBtnSecondaryText, {color: theme.primary}]}>
                {t('contact.callProvider') || t('providers.callProvider')}
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
              <Text style={[styles.footerBtnSecondaryText, {color: theme.primary}]}>
                {t('contact.contactProvider') || t('providers.contactProvider')}
              </Text>
            </TouchableOpacity>
          ) : null}
          {canRequest ? (
            <TouchableOpacity
              style={[styles.footerBtn, {backgroundColor: theme.primary}]}
              onPress={handleRequestService}
              disabled={checkingActive}
              activeOpacity={0.7}>
              <Text style={styles.footerBtnPrimaryText}>
                {t('browse.requestThisProvider') ||
                  t('providers.requestService')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : showUnavailableFooter ? (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: theme.card,
              borderTopColor: theme.border,
              paddingBottom: footerPadBottom,
            },
          ]}>
          <Text
            style={[styles.unavailableFooterText, {color: theme.textSecondary}]}>
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
    padding: 16,
    gap: 12,
  },
  surfaceCard: {
    marginBottom: 0,
  },
  heroInner: {
    padding: 16,
    alignItems: 'center',
  },
  sectionInner: {
    padding: 14,
    paddingHorizontal: 16,
  },
  imageContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignSelf: 'center',
    marginBottom: 10,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    alignItems: 'center',
    width: '100%',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
    textAlign: 'center',
    lineHeight: 25,
  },
  specialization: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 19,
  },
  alsoRow: {
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
    maxWidth: '100%',
  },
  alsoLead: {fontSize: 12, fontWeight: '700'},
  alsoList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
  },
  alsoChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  alsoChipText: {fontSize: 12, fontWeight: '600'},
  trustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  onlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 5,
  },
  expChip: {
    fontSize: 13,
    fontWeight: '500',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
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
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  footerBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  footerBtnSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
  },
  footerBtnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
