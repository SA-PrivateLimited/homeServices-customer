/**
 * Providers List Screen
 * Customer app - Browse individual online service providers
 */

import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
          FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Icon as HsIcon, SearchBar, canCallThisProvider, canRequestThisProvider} from 'sapvt-ltd-app-packages';
import {PopularServices, ServiceCatalogOverlay} from '../components/PopularServices/PopularServices';
import {ActiveRequestConflictBanner} from '../components/ActiveRequestConflictBanner';
import {getActiveServiceRequest} from '../services/api/serviceRequestsApi';
import {loadBrowseServices, type BrowseService} from '../services/browseServices';
import {localizedServiceName} from '../utils/serviceDisplay';
import {providersApi} from '../services/api/providersApi';
import {usersApi} from '../services/api/usersApi';
import {serviceCategoriesApi} from '../services/api/serviceCategoriesApi';
import {
  getGeographyMeta,
  clearGeographyMetaCache,
  resolveGeographyFromCoordinates,
  type GeographyBlock,
  type GeographyDistrict,
  type GeographyState,
} from '../services/api/geographyApi';
import {BrowseLocationSection} from '../components/BrowseLocationSection/BrowseLocationSection';
import GeolocationService from '../services/geolocationService';
import {
  clearSearchLocation,
  readSearchLocation,
  saveDeviceAsSearchLocation,
  saveManualSearchLocation,
} from '../utils/browseLocationMemory';
import {formatBrowsePlaceLabel} from '../utils/browsePlaceLabel';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import EmptyState from '../components/EmptyState';
import AdSlot from '../components/AdSlot';
import {ProviderCard} from '../components/ProviderCard';
import {getDistanceToCustomer} from '../services/providerLocationService';
import useTranslation from '../hooks/useTranslation';
import AlertModal from '../components/AlertModal';
import ProviderRequestModal from '../components/ProviderRequestModal';
import {filterOutOwnProvider} from '../utils/excludeOwnProvider';
import {contactHintMessage} from '../utils/providerContact';
import {otherVisibleProviderServices, matchingProviderService, visibleProviderServices} from '../utils/matchingProviderService';
import {resolveServiceMeta} from '../services/serviceCatalog';

const ALL_PROFESSIONS = '__all__';
const ALL_STATES = '__all_states__';
const ALL_DISTRICTS = '__all_districts__';
const FALLBACK_PROFESSIONS = ['Electrician', 'Plumber'];

interface ProviderWithStatus {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  specialization?: string;
  specialty?: string;
  serviceType?: string;
  matchedService?: string;
  serviceCategories?: string[];
  experience?: number;
  rating?: number;
  totalReviews?: number;
  totalConsultations?: number;
  profileImage?: string;
  isOnline?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  showRequestService?: boolean;
  showContactToUser?: boolean;
  contactAvailable?: boolean;
  distance?: string;
  eta?: number;
  photos?: string[];
  address?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    district?: string;
    state?: string;
    stateId?: string;
    districtId?: string;
    pincode?: string;
  };
}

function professionOf(p: ProviderWithStatus, selected?: string): string {
  return (
    matchingProviderService(p as any, selected) ||
    p.matchedService ||
    p.specialization ||
    p.specialty ||
    p.serviceType ||
    'Service provider'
  );
}

function phoneOf(p: ProviderWithStatus): string {
  return p.phoneNumber || p.phone || '';
}

function districtOf(
  p: ProviderWithStatus,
  districts?: GeographyDistrict[],
): string {
  const named = (p.address?.district || p.address?.city || '').trim();
  if (named) return named;
  const id = p.address?.districtId;
  if (id && districts?.length) {
    return districts.find((d) => d._id === id)?.name || '';
  }
  return '';
}

/** Web BrowsePage: match by catalog key (serviceCategories), not specialization alone. */
function matchesProfession(p: ProviderWithStatus, selected: string): boolean {
  if (!selected || selected === ALL_PROFESSIONS) return true;
  const needleKey = resolveServiceMeta(selected).key;
  if (!needleKey) {
    const needle = selected.toLowerCase().trim();
    return visibleProviderServices(p as any).some(name =>
      name.toLowerCase().includes(needle),
    );
  }
  return visibleProviderServices(p as any).some(
    name => resolveServiceMeta(name).key === needleKey,
  );
}

export default function ProvidersListScreen({navigation, route}: any) {
  const {isDarkMode, currentUser, currentPincode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const isGuest = !currentUser?.id && !currentUser?._id;

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

  const [providers, setProviders] = useState<ProviderWithStatus[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ProviderWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProfession, setSelectedProfession] = useState(ALL_PROFESSIONS);
  const [categoryNames, setCategoryNames] = useState<string[]>([]);
  const [geoStates, setGeoStates] = useState<GeographyState[]>([]);
  const [geoDistricts, setGeoDistricts] = useState<GeographyDistrict[]>([]);
  const [geoBlocks, setGeoBlocks] = useState<GeographyBlock[]>([]);
  const [selectedStateId, setSelectedStateId] = useState(ALL_STATES);
  const [selectedDistrictId, setSelectedDistrictId] = useState(ALL_DISTRICTS);
  const [selectedBlockId, setSelectedBlockId] = useState('');
  const [blockName, setBlockName] = useState('');
  const [locationLabel, setLocationLabel] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogServices, setCatalogServices] = useState<BrowseService[]>([]);
  const [activeConflict, setActiveConflict] = useState<
    import('../services/api/serviceRequestsApi').ActiveServiceRequestSummary | null
  >(null);
  const [checkingActive, setCheckingActive] = useState(false);
  const [requestProvider, setRequestProvider] = useState<ProviderWithStatus | null>(null);


  useEffect(() => {
    loadProfessionOptions();
    void (async () => {
      let meta = await getGeographyMeta();
      if (!meta.blocks?.length) {
        await clearGeographyMetaCache();
        meta = await getGeographyMeta({force: true});
      }
      setGeoStates(meta.states || []);
      setGeoDistricts(meta.districts || []);
      setGeoBlocks(meta.blocks || []);

      const saved = await readSearchLocation();
      if (saved) {
        if (saved.stateId) setSelectedStateId(saved.stateId);
        if (saved.districtId) setSelectedDistrictId(saved.districtId);
        if (saved.blockId) setSelectedBlockId(saved.blockId);
        if (saved.blockName) setBlockName(saved.blockName);
        if (saved.label) setLocationLabel(saved.label);
        setUsingDeviceLocation(saved.source === 'device');
      }
    })();
    void loadBrowseServices()
      .then(setCatalogServices)
      .catch(() => setCatalogServices([]));
    const incomingService = String(route?.params?.service || '').trim();
    if (incomingService) setSelectedProfession(incomingService);
    const incomingState = String(route?.params?.stateId || '').trim();
    const incomingDistrict = String(route?.params?.districtId || '').trim();
    const incomingBlock = String(route?.params?.blockId || '').trim();
    const incomingPlace = String(route?.params?.locationQuery || '').trim();
    if (incomingState) setSelectedStateId(incomingState);
    if (incomingDistrict) setSelectedDistrictId(incomingDistrict);
    if (incomingBlock) setSelectedBlockId(incomingBlock);
    if (incomingPlace) setSearchQuery(incomingPlace);
  }, []);

  useEffect(() => {
    void loadOnlineProviders();
  }, [selectedStateId, selectedDistrictId, selectedBlockId, selectedProfession]);

  useEffect(() => {
    filterProviders();
  }, [providers, searchQuery, selectedProfession]);

  const loadProfessionOptions = async () => {
    try {
      const cats = await serviceCategoriesApi.getAll();
      const names = (cats || [])
        .filter(c => c.isActive !== false)
        .map(c => c.name)
        .filter(Boolean) as string[];
      setCategoryNames(names.length ? names : FALLBACK_PROFESSIONS);
    } catch {
      setCategoryNames(FALLBACK_PROFESSIONS);
    }
  };

  const handleUseMyLocation = async () => {
    try {
      setLocating(true);
      const loc = await GeolocationService.getLocationWithPrompt();
      if (!loc) return;
      const resolved = await resolveGeographyFromCoordinates(
        loc.latitude,
        loc.longitude,
      );
      const nextStateId = resolved.stateId || ALL_STATES;
      const nextDistrictId = resolved.districtId || ALL_DISTRICTS;
      const nextBlockId = resolved.blockId || '';
      const nextBlockName = resolved.blockName || '';
      const label =
        resolved.label ||
        [nextBlockName, resolved.districtName, resolved.stateName]
          .filter(Boolean)
          .join(', ') ||
        null;
      setSelectedStateId(nextStateId);
      setSelectedDistrictId(nextDistrictId);
      setSelectedBlockId(nextBlockId);
      setBlockName(nextBlockName);
      setLocationLabel(label);
      setUsingDeviceLocation(true);
      setLocationPickerOpen(false);
      void saveDeviceAsSearchLocation({
        stateId: nextStateId === ALL_STATES ? '' : nextStateId,
        districtId: nextDistrictId === ALL_DISTRICTS ? '' : nextDistrictId,
        blockId: nextBlockId || undefined,
        stateName: resolved.stateName,
        districtName: resolved.districtName,
        blockName: nextBlockName || undefined,
        label: label || '',
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
    } catch (err: unknown) {
      // Match web BrowsePage locationErrorMessage → ecosystem.location*
      let code = 'unavailable';
      if (err && typeof err === 'object' && 'code' in err) {
        const c = String((err as {code: string}).code);
        if (
          [
            'denied',
            'timeout',
            'unsupported',
            'geocode',
            'nomatch',
            'invalid',
            'unavailable',
          ].includes(c)
        ) {
          code = c;
        }
      } else if (err instanceof Error) {
        const m = err.message.toLowerCase();
        if (m.includes('permission') || m.includes('denied')) code = 'denied';
        else if (m.includes('timeout')) code = 'timeout';
        else if (
          [
            'unavailable',
            'nomatch',
            'geocode',
            'invalid',
            'unsupported',
          ].includes(err.message)
        ) {
          code = err.message;
        }
      }
      const messageKey =
        code === 'denied'
          ? 'ecosystem.locationDenied'
          : code === 'timeout'
            ? 'ecosystem.locationTimeout'
            : code === 'unsupported'
              ? 'ecosystem.locationUnsupported'
              : code === 'geocode'
                ? 'ecosystem.locationGeocodeFailed'
                : code === 'nomatch'
                  ? 'ecosystem.locationNoMatch'
                  : 'ecosystem.locationUnavailable';
      setAlertModal({
        visible: true,
        title: String(t('common.error')),
        message: String(
          t(messageKey, {
            defaultValue:
              'Could not read your location. Choose state and district below, or try again.',
          }),
        ),
        type: 'error',
      });
    } finally {
      setLocating(false);
    }
  };

  // -----------------------------
  // Load Providers
  // -----------------------------
  const loadOnlineProviders = async () => {
    try {
      setLoading(true);

      const filters: {
        stateId?: string;
        districtId?: string;
        blockId?: string;
        state?: string;
        district?: string;
        serviceType?: string;
        limit?: number;
      } = {limit: 100};

      if (selectedStateId !== ALL_STATES) {
        filters.stateId = selectedStateId;
        const st = geoStates.find((s) => s._id === selectedStateId);
        if (st?.name) filters.state = st.name;
      }
      if (selectedDistrictId !== ALL_DISTRICTS) {
        filters.districtId = selectedDistrictId;
        const d = geoDistricts.find((x) => x._id === selectedDistrictId);
        if (d?.name) filters.district = d.name;
      }
      if (selectedBlockId) {
        filters.blockId = selectedBlockId;
      }
      // Web BrowsePage: serviceType is sent to API so multi-trade partners match
      if (selectedProfession !== ALL_PROFESSIONS) {
        filters.serviceType = selectedProfession;
      }

      const apiProviders = await providersApi.getAll(filters);

      const list: ProviderWithStatus[] = [];

      for (const data of apiProviders) {
        const providerId = data._id || data.id || '';

        const provider: ProviderWithStatus = {
          id: providerId,
          name: data.name || data.displayName || 'Provider',
          email: data.email,
          phone: (data as any).phone,
          phoneNumber: data.phoneNumber,
          specialization: data.specialization || (data as any).specialty,
          specialty: (data as any).specialty,
          serviceType: data.serviceType || (data as any).serviceType,
          matchedService: data.matchedService,
          serviceCategories: data.serviceCategories,
          experience: data.experience,
          rating: data.rating,
          totalReviews: (data as any).totalReviews,
          totalConsultations: (data as any).totalConsultations,
          profileImage: (data as any).profileImage,
          isOnline: data.isOnline,
          approvalStatus: data.approvalStatus || 'approved',
          showRequestService: (data as any).showRequestService,
          showContactToUser: (data as any).showContactToUser,
          contactAvailable: (data as any).contactAvailable,
          photos: Array.isArray((data as any).photos)
            ? ((data as any).photos as unknown[]).filter(
                (u): u is string =>
                  typeof u === 'string' && /^https?:\/\//i.test(u),
              )
            : undefined,
          address: {
            latitude: data.location?.latitude || (data as any).currentLocation?.latitude,
            longitude: data.location?.longitude || (data as any).currentLocation?.longitude,
            address:
              data.location?.address ||
              (data as any).address?.address,
            city: data.location?.city || (data as any).address?.city,
            district:
              data.location?.district ||
              (data as any).address?.district ||
              data.location?.city,
            state: data.location?.state || (data as any).address?.state,
            stateId:
              data.location?.stateId || (data as any).address?.stateId,
            districtId:
              data.location?.districtId || (data as any).address?.districtId,
            pincode: data.location?.pincode || (data as any).address?.pincode,
          },
        };

        // Distance calculation
        if (
          currentPincode &&
          provider.address?.latitude &&
          provider.address?.longitude
        ) {
          const customerLocation = await getCustomerLocation();
          if (customerLocation) {
            const distanceInfo = getDistanceToCustomer(
              {
                latitude: provider.address.latitude,
                longitude: provider.address.longitude,
                address: provider.address.address || '',
                city: provider.address.city,
                state: provider.address.state,
                pincode: provider.address.pincode || '',
                updatedAt: Date.now(),
              },
              customerLocation,
            );
            provider.distance = distanceInfo.distanceFormatted;
            provider.eta = distanceInfo.etaMinutes;
          }
        }

        list.push(provider);
      }

      list.sort((a, b) => {
        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;
        if (a.eta && b.eta) return a.eta - b.eta;
        if (a.rating && b.rating) return b.rating - a.rating;
        return 0;
      });

      setProviders(filterOutOwnProvider(list, currentUser));
    } catch (error: any) {
      console.error('Error loading providers:', error);
      setProviders([]);
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error?.message || t('providers.failedToLoad'),
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // -----------------------------
  // Customer Location
  // -----------------------------
  const getCustomerLocation = async (): Promise<{
    latitude: number;
    longitude: number;
  } | null> => {
    try {
      if (!currentUser?.id) return null;

      // Get user location from API
      const user = await usersApi.getMe();
      if (user?.location?.latitude && user?.location?.longitude) {
        return {
          latitude: Number(user.location.latitude),
          longitude: Number(user.location.longitude),
        };
      }
      return null;
    } catch (e) {
      console.error('Location error:', e);
      return null;
    }
  };

  // -----------------------------
  // Filters
  // -----------------------------
  const filterProviders = () => {
    let list = providers;

    if (selectedProfession !== ALL_PROFESSIONS) {
      list = list.filter(p => matchesProfession(p, selectedProfession));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.specialization?.toLowerCase().includes(q) ||
          p.specialty?.toLowerCase().includes(q) ||
          p.serviceType?.toLowerCase().includes(q),
      );
    }

    setFilteredProviders(list);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOnlineProviders();
  };

  const handleCallProvider = (provider: ProviderWithStatus) => {
    const phone = phoneOf(provider);
    if (!phone) {
      setAlertModal({
        visible: true,
        title: t('providers.noPhoneNumber'),
        message: t('providers.noPhoneNumberMessage'),
        type: 'warning',
      });
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  const goLogin = () => {
    // Login lives on the root stack (above GuestStack / Main)
    const root = navigation.getParent()?.getParent() ?? navigation.getParent();
    if (root) {
      root.navigate('Login');
    } else {
      navigation.navigate('Login');
    }
  };

  const selectedServiceForAlso =
    selectedProfession !== ALL_PROFESSIONS ? selectedProfession : undefined;

  // Guest: no photo; same professional card, existing contact fields only
  const renderGuestProvider = ({item}: {item: ProviderWithStatus}) => {
    const canCall = canCallThisProvider(item);
    const phone = canCall ? phoneOf(item) : '';
    const profession = localizedServiceName(
      professionOf(item, selectedServiceForAlso),
    );
    const alsoServices = otherVisibleProviderServices(
      item as any,
      selectedServiceForAlso,
    ).map(name => localizedServiceName(name));
    const location = districtOf(item, geoDistricts);
    return (
      <ProviderCard
        theme={theme}
        name={item.name}
        profession={profession}
        alsoServices={alsoServices}
        alsoLead={
          alsoServices.length ? String(t('browse.alsoLead')) : undefined
        }
        location={location || undefined}
        isOnline={Boolean(item.isOnline)}
        onlineLabel={String(t('providers.online'))}
        phone={phone || null}
        callLabel={String(t('providers.callProvider'))}
        requestLabel={String(t('providers.requestService'))}
        hidePhoto
        onPress={isGuest ? undefined : () => openProviderDetails(item)}
        onCall={phone ? () => handleCallProvider(item) : undefined}
        onRequest={
          canRequestThisProvider(item)
            ? () => openRequestModal(item)
            : undefined
        }
        onContact={
          !phone && canCallThisProvider(item)
            ? () =>
                setAlertModal({
                  visible: true,
                  title: String(t('providers.contactProvider')),
                  message: contactHintMessage(
                    t as any,
                    (item as any).contactHint,
                    (item as any).contactPolicy,
                  ),
                  type: 'info',
                })
            : undefined
        }
      />
    );
  };

  const openRequestModal = (item: ProviderWithStatus) => {
    const phoneVerified = currentUser?.phoneVerified === true;
    const customerId = currentUser?.id || (currentUser as any)?._id;
    if (!currentUser || !customerId || !phoneVerified) {
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: String(t('providers.pleaseLoginToRequest')),
        type: 'warning',
      });
      return;
    }
    if (checkingActive) return;
    const serviceType = professionOf(item, selectedServiceForAlso);
    setCheckingActive(true);
    setActiveConflict(null);
    void getActiveServiceRequest(serviceType)
      .then(active => {
        if (active?.serviceRequestId) {
          setActiveConflict(active);
          return;
        }
        setRequestProvider(item);
      })
      .catch(() => setRequestProvider(item))
      .finally(() => setCheckingActive(false));
  };

  const renderProvider = ({item}: {item: ProviderWithStatus}) => {
    const canCall = canCallThisProvider(item);
    const phone = canCall ? phoneOf(item) : '';
    const location = districtOf(item, geoDistricts);
    const alsoServices = otherVisibleProviderServices(
      item as any,
      selectedServiceForAlso,
    ).map(name => localizedServiceName(name));
    const experienceLabel =
      item.experience !== undefined && item.experience > 0
        ? String(
            t('providers.experienceWithYears', {
              years: item.experience,
              count: item.experience,
            }),
          )
        : undefined;
    const reviewsLabel =
      item.totalReviews !== undefined && item.totalReviews > 0
        ? `${item.totalReviews} ${
            item.totalReviews === 1
              ? t('providers.review')
              : t('providers.reviews')
          }`
        : undefined;

    return (
      <ProviderCard
        theme={theme}
        name={item.name}
        profession={localizedServiceName(
          professionOf(item, selectedServiceForAlso),
        )}
        alsoServices={alsoServices}
        alsoLead={
          alsoServices.length ? String(t('browse.alsoLead')) : undefined
        }
        location={location || undefined}
        experienceLabel={experienceLabel}
        rating={item.rating}
        reviewsLabel={reviewsLabel}
        image={item.profileImage}
        showcasePhotos={item.photos}
        isOnline={Boolean(item.isOnline)}
        onlineLabel={String(t('providers.online'))}
        phone={phone || null}
        callLabel={String(t('providers.callProvider'))}
        requestLabel={String(t('providers.requestService'))}
        onPress={() => openProviderDetails(item)}
        onCall={phone ? () => handleCallProvider(item) : undefined}
        onRequest={
          canRequestThisProvider(item)
            ? () => openRequestModal(item)
            : undefined
        }
        onContact={
          !phone && canCallThisProvider(item)
            ? () =>
                setAlertModal({
                  visible: true,
                  title: String(t('providers.contactProvider')),
                  message: contactHintMessage(
                    t as any,
                    (item as any).contactHint,
                    (item as any).contactPolicy,
                  ),
                  type: 'info',
                })
            : undefined
        }
      />
    );
  };

  const professionOptions = useMemo(() => {
    const fromProviders = providers
      .map(p => professionOf(p))
      .filter(name => name && name !== 'Service provider');
    const merged = [...categoryNames, ...fromProviders, ...FALLBACK_PROFESSIONS];
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const name of merged) {
      const key = name.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push(name);
    }
    unique.sort((a, b) => a.localeCompare(b));
    return unique;
  }, [categoryNames, providers]);

  const activeBlockName = useMemo(() => {
    if (selectedBlockId) {
      const match = geoBlocks.find(b => b._id === selectedBlockId);
      if (match?.name) return match.name;
    }
    return blockName;
  }, [selectedBlockId, geoBlocks, blockName]);

  const activePlace = formatBrowsePlaceLabel(
    locationLabel,
    selectedStateId === ALL_STATES ? '' : selectedStateId,
    selectedDistrictId === ALL_DISTRICTS ? '' : selectedDistrictId,
    geoStates,
    geoDistricts,
    selectedBlockId || undefined,
    geoBlocks,
    activeBlockName,
  );

  const applyManualState = (id: string) => {
    const nextStateId = id || ALL_STATES;
    setUsingDeviceLocation(false);
    setLocationLabel(null);
    setSelectedStateId(nextStateId);
    setSelectedDistrictId(ALL_DISTRICTS);
    setSelectedBlockId('');
    setBlockName('');
    if (!id) {
      void clearSearchLocation();
      return;
    }
    const state = geoStates.find(s => s._id === id);
    void saveManualSearchLocation({
      stateId: id,
      districtId: '',
      stateName: state?.name,
      label: state?.name || id,
    });
  };

  const applyManualDistrict = (id: string) => {
    const nextDistrictId = id || ALL_DISTRICTS;
    setUsingDeviceLocation(false);
    setSelectedDistrictId(nextDistrictId);
    setSelectedBlockId('');
    setBlockName('');
    setLocationLabel(null);
    // Keep picker open after state → district so user can pick block.
    // Only auto-collapse when this district has no blocks (final step).
    if (id) {
      const hasBlocks = geoBlocks.some(b => b.districtId === id);
      if (!hasBlocks) setLocationPickerOpen(false);
    }
    const stateKey = selectedStateId === ALL_STATES ? '' : selectedStateId;
    if (!stateKey && !id) {
      void clearSearchLocation();
      return;
    }
    const state = geoStates.find(s => s._id === stateKey);
    const district = geoDistricts.find(d => d._id === id);
    const label = [district?.name, state?.name].filter(Boolean).join(', ');
    void saveManualSearchLocation({
      stateId: stateKey,
      districtId: id,
      stateName: state?.name,
      districtName: district?.name,
      label: label || state?.name || '',
    });
  };

  const applyManualBlock = (id: string) => {
    setUsingDeviceLocation(false);
    setSelectedBlockId(id);
    const block = geoBlocks.find(b => b._id === id);
    setBlockName(block?.name || '');
    setLocationLabel(null);
    // Block is the last step — then collapse (same idea as web Done).
    if (id) setLocationPickerOpen(false);
    const stateKey = selectedStateId === ALL_STATES ? '' : selectedStateId;
    const districtKey =
      selectedDistrictId === ALL_DISTRICTS ? '' : selectedDistrictId;
    if (!stateKey && !districtKey && !id) {
      void clearSearchLocation();
      return;
    }
    const state = geoStates.find(s => s._id === stateKey);
    const district = geoDistricts.find(d => d._id === districtKey);
    const label = [block?.name, district?.name, state?.name]
      .filter(Boolean)
      .join(', ');
    void saveManualSearchLocation({
      stateId: stateKey,
      districtId: districtKey,
      blockId: id || undefined,
      stateName: state?.name,
      districtName: district?.name,
      blockName: block?.name,
      label: label || state?.name || '',
    });
  };

  const openProviderDetails = (item: ProviderWithStatus) => {
    navigation.navigate('ProviderDetails', {
      provider: item,
      service:
        selectedProfession !== ALL_PROFESSIONS
          ? selectedProfession
          : undefined,
    });
  };

  // Web BrowsePage results heading (never show missing browse.resultsTitle)
  const resultsHeading = useMemo(() => {
    const count = filteredProviders.length;
    const place = activePlace || '';
    const serviceLabel =
      selectedProfession !== ALL_PROFESSIONS
        ? localizedServiceName(selectedProfession)
        : '';
    if (serviceLabel && place) {
      return count === 1
        ? String(
            t('browse.resultsServiceInPlaceOne', {
              service: serviceLabel,
              place,
            }),
          )
        : String(
            t('browse.resultsServiceInPlace', {
              service: serviceLabel,
              place,
              count,
            }),
          );
    }
    if (serviceLabel) {
      return count === 1
        ? String(t('browse.resultsServiceOne', {service: serviceLabel}))
        : String(
            t('browse.resultsService', {service: serviceLabel, count}),
          );
    }
    if (place) {
      return String(t('browse.resultsInPlace', {place, count}));
    }
    return String(t('browse.resultsAllSimple', {count}));
  }, [
    filteredProviders.length,
    activePlace,
    selectedProfession,
    t,
  ]);

  const emptyTitle = useMemo(() => {
    const place = activePlace || '';
    const serviceLabel =
      selectedProfession !== ALL_PROFESSIONS
        ? localizedServiceName(selectedProfession)
        : '';
    if (serviceLabel && place) {
      return String(
        t('browse.emptyServiceInPlaceTitle', {
          service: serviceLabel,
          place,
        }),
      );
    }
    if (serviceLabel) {
      return String(t('browse.emptyServiceTitle', {service: serviceLabel}));
    }
    if (place) {
      return String(t('browse.emptyPlaceTitle', {place}));
    }
    return String(t('browse.emptyDefaultTitle'));
  }, [activePlace, selectedProfession, t]);

  // Keep discovery + location picker mounted while providers reload (web BrowsePage).
  // A full-screen loader was collapsing State→District→Block mid-selection.

  const crystalServiceBg = isDarkMode
    ? 'rgba(255,255,255,0.1)'
    : 'rgba(255,255,255,0.55)';

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.background}]}
      edges={[]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      <View style={styles.discovery}>
      <View style={styles.serviceTriggerWrap}>
        <Text style={[styles.serviceTriggerLabel, {color: theme.text}]}>
          {t('browse.selectProfession')}
        </Text>
        <TouchableOpacity
          style={[styles.serviceTrigger, {backgroundColor: crystalServiceBg}]}
          onPress={() => setCatalogOpen(true)}
          accessibilityRole="button">
          <Text
            style={[
              styles.serviceTriggerValue,
              {
                color:
                  selectedProfession === ALL_PROFESSIONS
                    ? theme.textSecondary
                    : theme.text,
              },
            ]}
            numberOfLines={1}>
            {selectedProfession === ALL_PROFESSIONS
              ? t('browse.searchPlaceholder')
              : localizedServiceName(selectedProfession)}
          </Text>
          {selectedProfession !== ALL_PROFESSIONS ? (
            <TouchableOpacity
              onPress={() => setSelectedProfession(ALL_PROFESSIONS)}
              hitSlop={8}
              accessibilityLabel={String(t('common.clear'))}>
              <Icon name="close" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
          <Icon name="expand-more" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
      <ServiceCatalogOverlay
        theme={theme}
        open={catalogOpen}
        onClose={() => setCatalogOpen(false)}
        services={catalogServices}
        selectedApiName={
          selectedProfession === ALL_PROFESSIONS ? '' : selectedProfession
        }
        onSelect={name =>
          setSelectedProfession(name ? name : ALL_PROFESSIONS)
        }
      />

      <PopularServices
        theme={theme}
        selectedApiName={
          selectedProfession === ALL_PROFESSIONS ? '' : selectedProfession
        }
        onSelect={name =>
          setSelectedProfession(name ? name : ALL_PROFESSIONS)
        }
      />

      <BrowseLocationSection
        theme={theme}
        states={geoStates}
        districts={geoDistricts}
        blocks={geoBlocks}
        stateId={selectedStateId === ALL_STATES ? '' : selectedStateId}
        districtId={
          selectedDistrictId === ALL_DISTRICTS ? '' : selectedDistrictId
        }
        blockId={selectedBlockId}
        blockName={activeBlockName}
        locationLabel={locationLabel}
        locating={locating}
        usingDeviceLocation={usingDeviceLocation}
        pickerOpen={locationPickerOpen}
        onPickerOpenChange={setLocationPickerOpen}
        onUseMyLocation={() => void handleUseMyLocation()}
        onStateChange={applyManualState}
        onDistrictChange={applyManualDistrict}
        onBlockChange={applyManualBlock}
      />

      {selectedProfession !== ALL_PROFESSIONS ? (
        <View style={styles.activeFilters}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {backgroundColor: 'rgba(49, 130, 206, 0.12)'},
            ]}
            onPress={() => setSelectedProfession(ALL_PROFESSIONS)}
            accessibilityLabel={String(t('browse.activeFilters'))}>
            <Text style={[styles.filterChipText, {color: theme.text}]}>
              {localizedServiceName(selectedProfession)}
            </Text>
            <Icon name="close" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : null}

      </View>

      {isGuest ? (
        <Text style={[styles.guestNote, {color: theme.textSecondary}]}>
          {t('browse.guestNote')}{' '}
          <Text style={{color: theme.primary, fontWeight: '600'}} onPress={goLogin}>
            {t('auth.login')}
          </Text>
        </Text>
      ) : null}

      <View style={{marginHorizontal: 14, marginBottom: 12}}>
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder={String(t('browse.searchProviders') || t('providers.searchProviders'))}
        />
      </View>

      {filteredProviders.length > 0 ? (
        <View style={styles.resultsHead}>
          <View style={styles.resultsHeadLead}>
            <Text style={[styles.listTitle, {color: theme.text}]}>
              {resultsHeading}
            </Text>
            <TouchableOpacity
              onPress={handleRefresh}
              disabled={refreshing}
              style={[
                styles.refreshBtn,
                {backgroundColor: 'rgba(49, 130, 206, 0.10)'},
              ]}
              accessibilityLabel={String(t('browse.refresh'))}>
              <HsIcon name="refresh" size={20} color={theme.primary} />
            </TouchableOpacity>
          </View>
          {!isGuest ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('ShareContactRecommendation')}>
              <Text
                style={{
                  color: theme.primary,
                  fontWeight: '600',
                  fontSize: 13,
                }}>
                {t('browse.suggestCta')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {loading && filteredProviders.length === 0 ? (
        <View style={styles.resultsLoading}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{marginTop: 10, color: theme.textSecondary}}>
            {t('browse.loading') || t('providers.loading')}
          </Text>
        </View>
      ) : filteredProviders.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState icon="search-outline" title={emptyTitle} />
          {!isGuest ? (
            <TouchableOpacity
              onPress={() => navigation.navigate('ShareContactRecommendation')}
              style={styles.emptyAction}>
              <Text style={[styles.emptyActionText, {color: theme.primary}]}>
                {t('browse.suggestCta')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={filteredProviders}
          renderItem={isGuest ? renderGuestProvider : renderProvider}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListFooterComponent={isGuest ? null : <AdSlot size="banner" />}
          contentContainerStyle={{paddingHorizontal: 14, paddingBottom: 24}}
          ItemSeparatorComponent={() => <View style={{height: 14}} />}
        />
      )}

      <ProviderRequestModal
        visible={!!requestProvider}
        provider={requestProvider}
        requestedServiceType={
          selectedProfession !== ALL_PROFESSIONS
            ? selectedProfession
            : undefined
        }
        onClose={() => setRequestProvider(null)}
        onSuccess={(serviceRequestId) => {
          setRequestProvider(null);
          navigation.navigate('Services', {
            screen: 'ActiveService',
            params: {serviceRequestId},
          });
        }}
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

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() =>
          setAlertModal({visible: false, title: '', message: '', type: 'info'})
        }
      />
    </SafeAreaView>
  );
}

// -----------------------------
// Styles
// -----------------------------
const styles = StyleSheet.create({
  container: {flex: 1},
  discovery: {
    gap: 16,
    marginBottom: 18,
  },
  serviceTriggerWrap: {marginHorizontal: 14},
  serviceTriggerLabel: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 19.5,
    marginBottom: 8,
  },
  serviceTrigger: {
    minHeight: 46,
    borderRadius: 16,
    borderWidth: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: 'rgba(30, 60, 90, 0.05)',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 1,
  },
  serviceTriggerValue: {flex: 1, fontSize: 15, fontWeight: '600'},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  geoFilterRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 0,
    alignItems: 'flex-start',
  },
  guestNote: {
    marginHorizontal: 14,
    marginBottom: 12,
    fontSize: 13,
    lineHeight: 18.85,
  },
  resultsLoading: {
    paddingHorizontal: 14,
    paddingTop: 40,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingHorizontal: 14,
    paddingTop: 24,
    paddingBottom: 40,
    alignItems: 'center',
    gap: 10,
  },
  emptyAction: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsHead: {
    gap: 8,
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 14,
  },
  resultsHeadLead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listTitle: {flex: 1, fontSize: 16, fontWeight: '700', lineHeight: 21.6},
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  browseFilterChip: {
    minHeight: 32,
    paddingVertical: 0,
    paddingHorizontal: 12,
    borderWidth: 0,
    backgroundColor: 'rgba(49, 130, 206, 0.12)',
  },
  guestTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  guestBrand: {
    fontSize: 18,
    fontWeight: '700',
  },
  guestSub: {
    fontSize: 12,
    marginTop: 2,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  loginBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  guestInfo: {
    flex: 1,
    marginRight: 8,
  },
  guestPhone: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  professionDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  professionLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  professionValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalContent: {
    maxHeight: '60%',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modalOptionText: {
    fontSize: 16,
  },
  search: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 15,
  },
  filterContainer: {
    marginBottom: 8,
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 14,
    marginTop: 4,
  },
  filterList: {
    paddingHorizontal: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 0,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 12,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  imageWrap: {
    marginRight: 12,
    position: 'relative',
  },
  image: {width: 64, height: 64, borderRadius: 32},
  placeholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  onlineBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  onlineBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  specialization: {
    fontSize: 14,
    marginBottom: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    marginLeft: 4,
  },
  experience: {
    fontSize: 12,
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  locationText: {
    fontSize: 12,
    marginLeft: 4,
  },

  cardMain: {
    flexDirection: 'row',
    flex: 1,
    minWidth: 0,
  },
  cardActions: {
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 8,
  },
  requestBtn: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 8,
    maxWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
