/**
 * Providers List Screen
 * Customer app - Browse individual online service providers
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  StatusBar,
  Alert,
  AppState,
  Platform,
  Pressable,
  Animated,
  Easing,
  InteractionManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
  type AppStateStatus,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {SearchBar, canCallThisProvider, canRequestThisProvider} from 'sapvt-ltd-app-packages';
import {PopularServices, ServiceCatalogOverlay} from '../components/PopularServices/PopularServices';
import {ActiveRequestConflictBanner} from '../components/ActiveRequestConflictBanner';
import {getActiveServiceRequest} from '../services/api/serviceRequestsApi';
import {loadBrowseServices, type BrowseService} from '../services/browseServices';
import {callButtonLabel} from '../utils/providerCallLabel';
import {localizedServiceName} from '../utils/serviceDisplay';
import {providersApi} from '../services/api/providersApi';
import {usersApi} from '../services/api/usersApi';
import {
  getGeographyMeta,
  clearGeographyMetaCache,
  resolveGeographyFromCoordinates,
  type GeographyBlock,
  type GeographyDistrict,
  type GeographyState,
} from '../services/api/geographyApi';
import {BrowseLocationPickerModal} from '../components/BrowseLocationSection/BrowseLocationPickerModal';
import {ProvidersBrowseHeader} from '../components/ProvidersBrowseHeader';
import GeolocationService from '../services/geolocationService';
import type {LocationErrorCode} from '../services/geolocationService';
import {
  clearSearchLocation,
  isDeviceLocationFresh,
  readFreshDeviceLocation,
  readLocationMemory,
  saveDeviceAsSearchLocation,
  saveDeviceLocationCache,
  saveManualSearchLocation,
  type DeviceLocationRecord,
  type SearchLocationRecord,
} from '../utils/browseLocationMemory';
import {
  formatBrowsePlaceLabel,
  hasBrowseLocationFilter,
} from '../utils/browsePlaceLabel';
import {
  dedupePlaceParts,
  formatProviderLocationLine,
} from '../utils/addressDisplay';
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
import {sortBrowseRows} from '../utils/browseDiscovery';
import {isConnectionFailure} from '../utils/userFacingError';
import {ConnectionNotice} from '../components/ConnectionNotice';
import {contactHintMessage} from '../utils/providerContact';
import {otherVisibleProviderServices, matchingProviderService, visibleProviderServices} from '../utils/matchingProviderService';
import {resolveServiceMeta} from '../services/serviceCatalog';

const ALL_PROFESSIONS = '__all__';
const ALL_STATES = '__all_states__';
const ALL_DISTRICTS = '__all_districts__';

/** Debounce for professional-name filter (local). Text field stays instant. */
const PROVIDER_NAME_SEARCH_DEBOUNCE_MS = 400;
/** Past this offset the in-list service block has scrolled away. */
const SERVICE_PIN_MIN_Y = 72;
/** Meaningful downward movement before hiding the pinned service bar. */
const SERVICE_PIN_HIDE_PX = 28;
/** Small upward movement to reveal pinned service controls. */
const SERVICE_PIN_SHOW_PX = 18;
const SERVICE_PIN_ANIM_MS = 180;

function ProviderListSeparator() {
  return <View style={separatorStyles.row} />;
}

const separatorStyles = StyleSheet.create({
  row: {height: 8},
});

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
    landmark?: string;
    city?: string;
    district?: string;
    block?: string;
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
  const fromAddr = formatProviderLocationLine({
    address: p.address as any,
    location: (p as any).location,
  });
  if (fromAddr) return fromAddr;
  const named = (p.address?.district || p.address?.city || '').trim();
  if (named) return named;
  const id = p.address?.districtId;
  if (id && districts?.length) {
    return districts.find((d) => d._id === id)?.name || '';
  }
  return '';
}

type BrowseListRow = ProviderWithStatus;

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
  const [connectionFailed, setConnectionFailed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [selectedProfession, setSelectedProfession] = useState(ALL_PROFESSIONS);
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
  /** False until Browse location bootstrap finishes (avoids empty-then-refetch providers). */
  const [locationReady, setLocationReady] = useState(false);
  /** Resume "use my location" after device Location or app Settings. */
  const locationResumeRef = useRef<'device_location' | 'app_permission' | null>(
    null,
  );
  const locationFlowBusyRef = useRef(false);
  const locationLeftAppRef = useRef(false);
  /**
   * Bumped on every customer-intent location change (manual or explicit GPS).
   * In-flight GPS results must match this epoch before becoming ACTIVE.
   */
  const locationEpochRef = useRef(0);
  const locationBootstrapDoneRef = useRef(false);
  const openLocationPicker = useCallback(() => {
    setLocationPickerOpen(true);
  }, []);

  const bumpLocationEpoch = useCallback(() => {
    locationEpochRef.current += 1;
    return locationEpochRef.current;
  }, []);

  const applyActiveLocationToState = useCallback(
    (
      place: {
        stateId?: string;
        districtId?: string;
        blockId?: string;
        blockName?: string;
        label?: string;
      },
      source: 'manual' | 'device',
      epoch: number,
    ) => {
      if (epoch !== locationEpochRef.current) {
        return false;
      }
      const nextStateId = place.stateId || ALL_STATES;
      const nextDistrictId = place.districtId || ALL_DISTRICTS;
      const nextBlockId = place.blockId || '';
      setSelectedStateId(nextStateId);
      setSelectedDistrictId(nextDistrictId);
      setSelectedBlockId(nextBlockId);
      setBlockName(place.blockName || '');
      setLocationLabel(place.label || null);
      setUsingDeviceLocation(source === 'device');
      return true;
    },
    [],
  );
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [catalogServices, setCatalogServices] = useState<BrowseService[]>([]);
  const [activeConflict, setActiveConflict] = useState<
    import('../services/api/serviceRequestsApi').ActiveServiceRequestSummary | null
  >(null);
  const [checkingActive, setCheckingActive] = useState(false);
  const [requestProvider, setRequestProvider] = useState<ProviderWithStatus | null>(null);


  useEffect(() => {
    void (async () => {
      let meta = await getGeographyMeta();
      if (!meta.blocks?.length) {
        await clearGeographyMetaCache();
        meta = await getGeographyMeta({force: true});
      }
      setGeoStates(meta.states || []);
      setGeoDistricts(meta.districts || []);
      setGeoBlocks(meta.blocks || []);

      const incomingState = String(route?.params?.stateId || '').trim();
      const incomingDistrict = String(route?.params?.districtId || '').trim();
      const incomingBlock = String(route?.params?.blockId || '').trim();
      const incomingPlace = String(route?.params?.locationQuery || '').trim();
      if (incomingState) setSelectedStateId(incomingState);
      if (incomingDistrict) setSelectedDistrictId(incomingDistrict);
      if (incomingBlock) setSelectedBlockId(incomingBlock);
      if (incomingPlace) setSearchQuery(incomingPlace);

      // Route params already force a place — do not auto GPS overwrite.
      if (incomingState || incomingDistrict || incomingBlock) {
        locationBootstrapDoneRef.current = true;
        setLocationReady(true);
        return;
      }

      if (locationBootstrapDoneRef.current) {
        setLocationReady(true);
        return;
      }
      locationBootstrapDoneRef.current = true;

      const memory = await readLocationMemory();
      const saved: SearchLocationRecord | null = memory?.search || null;
      const device: DeviceLocationRecord | undefined = memory?.device;
      const epoch = locationEpochRef.current;

      if (saved && (saved.stateId || saved.districtId || saved.blockId || saved.label)) {
        applyActiveLocationToState(saved, saved.source, epoch);
        // Stale GPS-sourced active location: refresh quietly; never if manual.
        if (
          saved.source === 'device' &&
          !isDeviceLocationFresh(device)
        ) {
          void (async () => {
            const started = locationEpochRef.current;
            try {
              const perm =
                await GeolocationService.checkLocationPermission();
              if (perm !== 'granted') return;
              if (!(await GeolocationService.isDeviceLocationEnabled())) {
                return;
              }
              const loc = await GeolocationService.getCurrentLocation();
              if (started !== locationEpochRef.current) return;
              const resolved = await resolveGeographyFromCoordinates(
                loc.latitude,
                loc.longitude,
              );
              if (started !== locationEpochRef.current) return;
              const mem = await readLocationMemory();
              if (mem?.search?.source === 'manual') {
                await saveDeviceLocationCache(
                  {
                    stateId: resolved.stateId || '',
                    districtId: resolved.districtId || '',
                    blockId: resolved.blockId || undefined,
                    stateName: resolved.stateName,
                    districtName: resolved.districtName,
                    blockName: resolved.blockName,
                    label: resolved.label || '',
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                  },
                  {promoteToActive: false},
                );
                return;
              }
              const label =
                resolved.label ||
                [resolved.blockName, resolved.districtName, resolved.stateName]
                  .filter(Boolean)
                  .join(', ') ||
                '';
              const applied = applyActiveLocationToState(
                {
                  stateId: resolved.stateId,
                  districtId: resolved.districtId,
                  blockId: resolved.blockId,
                  blockName: resolved.blockName,
                  label,
                },
                'device',
                started,
              );
              if (!applied) return;
              await saveDeviceAsSearchLocation({
                stateId: resolved.stateId || '',
                districtId: resolved.districtId || '',
                blockId: resolved.blockId || undefined,
                stateName: resolved.stateName,
                districtName: resolved.districtName,
                blockName: resolved.blockName,
                label,
                latitude: loc.latitude,
                longitude: loc.longitude,
              });
            } catch {
              // Keep existing active location; fail soft.
            }
          })();
        }
        setLocationReady(true);
        return;
      }

      // No ACTIVE location — promote fresh GPS cache if present.
      const freshDevice = await readFreshDeviceLocation();
      if (freshDevice) {
        applyActiveLocationToState(freshDevice, 'device', epoch);
        await saveDeviceLocationCache(freshDevice, {promoteToActive: true});
        setLocationReady(true);
        return;
      }

      // Auto-init current location only when permission + device Location already OK.
      // Do not force consent/settings loops on every Browse open.
      try {
        const perm = await GeolocationService.checkLocationPermission();
        const servicesOn = await GeolocationService.isDeviceLocationEnabled();
        if (perm !== 'granted' || !servicesOn) {
          setLocationReady(true);
          return;
        }
        const started = locationEpochRef.current;
        setLocating(true);
        const loc = await GeolocationService.getCurrentLocation();
        if (started !== locationEpochRef.current) {
          setLocationReady(true);
          return;
        }
        const resolved = await resolveGeographyFromCoordinates(
          loc.latitude,
          loc.longitude,
        );
        if (started !== locationEpochRef.current) {
          setLocationReady(true);
          return;
        }
        const label =
          resolved.label ||
          [resolved.blockName, resolved.districtName, resolved.stateName]
            .filter(Boolean)
            .join(', ') ||
          '';
        const applied = applyActiveLocationToState(
          {
            stateId: resolved.stateId,
            districtId: resolved.districtId,
            blockId: resolved.blockId,
            blockName: resolved.blockName,
            label,
          },
          'device',
          started,
        );
        if (!applied) {
          setLocationReady(true);
          return;
        }
        await saveDeviceAsSearchLocation({
          stateId: resolved.stateId || '',
          districtId: resolved.districtId || '',
          blockId: resolved.blockId || undefined,
          stateName: resolved.stateName,
          districtName: resolved.districtName,
          blockName: resolved.blockName,
          label,
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      } catch {
        // Leave "Choose your place" — manual always available.
      } finally {
        setLocating(false);
        setLocationReady(true);
      }
    })();
    // One-time service catalog hydrate for chips + overlay (cached in serviceCatalog).
    void loadBrowseServices()
      .then(setCatalogServices)
      .catch(() => setCatalogServices([]));
    const incomingService = String(route?.params?.service || '').trim();
    if (incomingService) setSelectedProfession(incomingService);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time Browse location bootstrap
  }, []);

  useEffect(() => {
    if (!locationReady) {
      return;
    }
    void loadOnlineProviders();
  }, [locationReady, selectedStateId, selectedDistrictId, selectedBlockId, selectedProfession]);

  // Debounce professional-name filter only — input text stays immediate.
  // Empty query restores the list immediately (no wait).
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedSearchQuery('');
      return;
    }
    const handle = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, PROVIDER_NAME_SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    filterProviders();
  }, [providers, debouncedSearchQuery, selectedProfession]);

  const handleUseMyLocation = useCallback(async () => {
    if (locationFlowBusyRef.current) {
      return;
    }
    locationFlowBusyRef.current = true;

    const keepManualPicker = () => {
      setLocationPickerOpen(true);
    };

    const enableDeviceLocationAndRetry = async () => {
      locationResumeRef.current = 'device_location';
      try {
        const result = await GeolocationService.promptEnableDeviceLocation();
        if (result === 'enabled') {
          locationResumeRef.current = null;
          locationFlowBusyRef.current = false;
          await handleUseMyLocation();
          return;
        }
        if (result === 'opened_settings') {
          // AppState resume will continue when user returns.
          return;
        }
        // cancelled
        locationResumeRef.current = null;
        Alert.alert(
          String(t('ecosystem.turnOnLocationTitle')),
          String(t('ecosystem.turnOnLocationMessage')),
          [
            {
              text: String(t('ecosystem.chooseAreaManually')),
              onPress: keepManualPicker,
            },
            {
              text: String(t('common.cancel') || 'Cancel'),
              style: 'cancel',
            },
          ],
        );
      } catch {
        locationResumeRef.current = null;
        await GeolocationService.openDeviceLocationSettings();
        locationResumeRef.current = 'device_location';
      }
    };

    const openAppSettingsAndResume = async () => {
      locationResumeRef.current = 'app_permission';
      await GeolocationService.openAppPermissionSettings();
    };

    const showLocationFlowError = (code: string) => {
      if (code === 'services_off') {
        Alert.alert(
          String(t('ecosystem.turnOnLocationTitle')),
          String(t('ecosystem.turnOnLocationMessage')),
          [
            {
              text: String(t('ecosystem.chooseAreaManually')),
              onPress: keepManualPicker,
            },
            {
              text: String(t('ecosystem.turnOnLocationAction')),
              onPress: () => {
                void enableDeviceLocationAndRetry();
              },
            },
          ],
        );
        return;
      }

      if (code === 'never_ask_again') {
        Alert.alert(
          String(t('ecosystem.allowLocationTitle')),
          String(t('ecosystem.locationNeverAskAgain')),
          [
            {
              text: String(t('ecosystem.chooseAreaManually')),
              onPress: keepManualPicker,
            },
            {
              text: String(t('ecosystem.openAppSettings')),
              onPress: () => {
                void openAppSettingsAndResume();
              },
            },
          ],
        );
        return;
      }

      if (code === 'denied') {
        Alert.alert(
          String(t('ecosystem.allowLocationTitle')),
          String(t('ecosystem.locationDenied')),
          [
            {
              text: String(t('ecosystem.chooseAreaManually')),
              onPress: keepManualPicker,
            },
            {
              text: String(t('ecosystem.tryAgainLocation')),
              onPress: () => {
                locationFlowBusyRef.current = false;
                void handleUseMyLocation();
              },
            },
          ],
        );
        return;
      }

      const messageKey =
        code === 'timeout'
          ? 'ecosystem.locationTimeout'
          : code === 'unsupported'
            ? 'ecosystem.locationUnsupported'
            : code === 'geocode'
              ? 'ecosystem.locationGeocodeFailed'
              : code === 'nomatch'
                ? 'ecosystem.locationNoMatch'
                : 'ecosystem.locationUnavailable';

      Alert.alert(
        String(t('common.error') || "Couldn't get your location"),
        String(
          t(messageKey, {
            defaultValue:
              "Couldn't get your location. Please try again or choose your area manually.",
          }),
        ),
        [
          {
            text: String(t('ecosystem.chooseAreaManually')),
            onPress: keepManualPicker,
          },
          {
            text: String(t('ecosystem.tryAgainLocation')),
            onPress: () => {
              locationFlowBusyRef.current = false;
              void handleUseMyLocation();
            },
          },
        ],
      );
    };

    try {
      // Explicit customer intent: switch ACTIVE location to current GPS.
      const startedEpoch = bumpLocationEpoch();

      // Android often hides the system permission dialog while another RN Modal
      // is open (Select Address). Close it first so the prompt can appear.
      setLocationPickerOpen(false);
      await new Promise<void>(resolve => {
        InteractionManager.runAfterInteractions(() => {
          setTimeout(resolve, 280);
        });
      });

      setLocating(true);
      const loc = await GeolocationService.getLocationWithPrompt();
      if (startedEpoch !== locationEpochRef.current) {
        return;
      }
      const resolved = await resolveGeographyFromCoordinates(
        loc.latitude,
        loc.longitude,
      );
      if (startedEpoch !== locationEpochRef.current) {
        return;
      }
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
      const applied = applyActiveLocationToState(
        {
          stateId: resolved.stateId,
          districtId: resolved.districtId,
          blockId: nextBlockId,
          blockName: nextBlockName,
          label: label || undefined,
        },
        'device',
        startedEpoch,
      );
      if (!applied) {
        return;
      }
      // Re-open picker so the customer sees the selected (ticked) current location.
      setLocationPickerOpen(true);
      locationResumeRef.current = null;
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
      let code: LocationErrorCode | string = 'unavailable';
      if (err && typeof err === 'object' && 'code' in err) {
        const c = String((err as {code: string}).code);
        if (
          [
            'services_off',
            'denied',
            'never_ask_again',
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
        else if (m.includes('location services') || m.includes('disabled')) {
          code = 'services_off';
        }
      }
      showLocationFlowError(code);
    } finally {
      setLocating(false);
      locationFlowBusyRef.current = false;
    }
  }, [t, bumpLocationEpoch, applyActiveLocationToState]);

  useEffect(() => {
    const onAppState = (next: AppStateStatus) => {
      if (next === 'background' || next === 'inactive') {
        if (locationResumeRef.current) {
          locationLeftAppRef.current = true;
        }
        return;
      }
      if (next !== 'active') {
        return;
      }
      if (!locationLeftAppRef.current) {
        return;
      }
      locationLeftAppRef.current = false;
      const pending = locationResumeRef.current;
      if (!pending) {
        return;
      }
      // Clear first so we never loop on repeated active events.
      locationResumeRef.current = null;
      void (async () => {
        if (pending === 'device_location') {
          const enabled = await GeolocationService.isDeviceLocationEnabled();
          if (enabled) {
            await handleUseMyLocation();
            return;
          }
          Alert.alert(
            String(t('ecosystem.turnOnLocationTitle')),
            String(t('ecosystem.turnOnLocationMessage')),
            [
              {
                text: String(t('ecosystem.chooseAreaManually')),
                onPress: () => setLocationPickerOpen(true),
              },
              {
                text: String(t('ecosystem.turnOnLocationAction')),
                onPress: () => {
                  locationResumeRef.current = 'device_location';
                  void GeolocationService.promptEnableDeviceLocation().then(
                    result => {
                      if (result === 'enabled') {
                        locationResumeRef.current = null;
                        void handleUseMyLocation();
                      } else if (result === 'opened_settings') {
                        locationResumeRef.current = 'device_location';
                      } else {
                        locationResumeRef.current = null;
                      }
                    },
                  );
                },
              },
            ],
          );
          return;
        }

        const permission = await GeolocationService.checkLocationPermission();
        if (permission === 'granted') {
          await handleUseMyLocation();
          return;
        }
        Alert.alert(
          String(t('ecosystem.allowLocationTitle')),
          String(t('ecosystem.locationNeverAskAgain')),
          [
            {
              text: String(t('ecosystem.chooseAreaManually')),
              onPress: () => setLocationPickerOpen(true),
            },
            {
              text: String(t('ecosystem.openAppSettings')),
              onPress: () => {
                locationResumeRef.current = 'app_permission';
                void GeolocationService.openAppPermissionSettings();
              },
            },
          ],
        );
      })();
    };

    const sub = AppState.addEventListener('change', onAppState);
    return () => sub.remove();
  }, [handleUseMyLocation, t]);

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
            landmark:
              data.location?.landmark ||
              (data as any).address?.landmark,
            city: data.location?.city || (data as any).address?.city,
            district:
              data.location?.district ||
              (data as any).address?.district ||
              data.location?.city,
            block:
              data.location?.block ||
              (data as any).address?.block,
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

      setConnectionFailed(false);
      setProviders(filterOutOwnProvider(sortBrowseRows(list), currentUser));
    } catch (error: any) {
      console.error('Error loading providers:', error);
      if (isConnectionFailure(error)) {
        setConnectionFailed(true);
        if (!refreshing) setProviders([]);
      } else {
        setProviders([]);
        setAlertModal({
          visible: true,
          title: t('common.error'),
          message: error?.message || t('providers.failedToLoad'),
          type: 'error',
        });
      }
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

    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase();
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
    const dial = () => {
      void Linking.openURL(`tel:${phone}`);
    };
    // Guest (and anyone leaving the app): confirm before jumping to Phone.
    if (isGuest || route?.name === 'GuestProviders') {
      Alert.alert(
        String(t('browse.call') || t('providers.call') || 'Call'),
        String(
          t('browse.callLeavesAppHint') ||
            'This opens your Phone app to call the provider.',
        ),
        [
          {text: String(t('common.cancel') || 'Cancel'), style: 'cancel'},
          {
            text: String(t('browse.call') || 'Call'),
            onPress: dial,
          },
        ],
      );
      return;
    }
    dial();
  };

  const goLogin = useCallback(() => {
    // Login lives on the root stack (above GuestStack / Main)
    const root = navigation.getParent()?.getParent() ?? navigation.getParent();
    if (root) {
      root.navigate('Login');
    } else {
      navigation.navigate('Login');
    }
  }, [navigation]);

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
        callLabel={callButtonLabel(item.name, t as any)}
        requestLabel={String(t('providers.requestService'))}
        compact
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
        rating={item.rating}
        reviewsLabel={reviewsLabel}
        image={item.profileImage}
        showcasePhotos={item.photos}
        isOnline={Boolean(item.isOnline)}
        onlineLabel={String(t('providers.online'))}
        phone={phone || null}
        callLabel={callButtonLabel(item.name, t as any)}
        requestLabel={String(t('providers.requestService'))}
        compact
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

  const browseHasLocation = hasBrowseLocationFilter(
    locationLabel,
    selectedStateId === ALL_STATES ? '' : selectedStateId,
    selectedDistrictId === ALL_DISTRICTS ? '' : selectedDistrictId,
    selectedBlockId,
  );

  const headerLocationLabel = useMemo(() => {
    if (!browseHasLocation) {
      return String(t('browse.chooseYourPlace'));
    }
    const state = geoStates.find(s => s._id === selectedStateId);
    const district = geoDistricts.find(d => d._id === selectedDistrictId);
    const block = geoBlocks.find(b => b._id === selectedBlockId);
    const parts = dedupePlaceParts([
      block?.name || activeBlockName?.trim(),
      district?.name,
      state?.name,
    ]);
    // Show leaf + parent (Block · District or District · State), not leaf alone.
    if (parts.length >= 2) return `${parts[0]} · ${parts[1]}`;
    if (parts.length === 1) return parts[0];
    return activePlace || String(t('browse.chooseYourPlace'));
  }, [
    browseHasLocation,
    geoStates,
    selectedStateId,
    geoDistricts,
    selectedDistrictId,
    geoBlocks,
    selectedBlockId,
    activeBlockName,
    activePlace,
    t,
  ]);

  const guestBrowse = isGuest || route?.name === 'GuestProviders';

  useLayoutEffect(() => {
    navigation.setOptions({
      header: (props: {navigation: any}) => (
        <ProvidersBrowseHeader
          navigation={props.navigation}
          theme={theme}
          title={String(t('nav.browse') || t('common.browse'))}
          locationLabel={headerLocationLabel}
          locating={locating}
          onLocationPress={openLocationPicker}
          guest={guestBrowse}
        />
      ),
    });
  }, [
    navigation,
    theme,
    t,
    headerLocationLabel,
    locating,
    guestBrowse,
    openLocationPicker,
  ]);

  const applyManualState = (id: string) => {
    bumpLocationEpoch();
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
    bumpLocationEpoch();
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
    bumpLocationEpoch();
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
    const label = dedupePlaceParts([
      block?.name,
      district?.name,
      state?.name,
    ]).join(', ');
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
    ? 'rgba(255,255,255,0.12)'
    : '#FFFFFF';

  const listRef = useRef<FlatList<ProviderWithStatus>>(null);
  const pinnedServiceAnim = useRef(new Animated.Value(0)).current;
  const pinnedServiceVisibleRef = useRef(false);
  const lastScrollYRef = useRef(0);
  const accumDownRef = useRef(0);
  const accumUpRef = useRef(0);
  const providerCountRef = useRef(0);
  const [pinnedServiceVisible, setPinnedServiceVisible] = useState(false);
  providerCountRef.current = filteredProviders.length;

  const setPinnedServiceBar = useCallback(
    (visible: boolean) => {
      if (pinnedServiceVisibleRef.current === visible) return;
      pinnedServiceVisibleRef.current = visible;
      setPinnedServiceVisible(visible);
      Animated.timing(pinnedServiceAnim, {
        toValue: visible ? 1 : 0,
        duration: SERVICE_PIN_ANIM_MS,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [pinnedServiceAnim],
  );

  useEffect(() => {
    listRef.current?.scrollToOffset({offset: 0, animated: false});
    lastScrollYRef.current = 0;
    accumDownRef.current = 0;
    accumUpRef.current = 0;
    setPinnedServiceBar(false);
  }, [selectedProfession, setPinnedServiceBar]);

  const onProviderListScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = Math.max(0, event.nativeEvent.contentOffset.y);
      const dy = y - lastScrollYRef.current;
      lastScrollYRef.current = y;

      // Near top: in-list service block is visible — hide overlay duplicate.
      if (y < SERVICE_PIN_MIN_Y || providerCountRef.current === 0) {
        accumDownRef.current = 0;
        accumUpRef.current = 0;
        setPinnedServiceBar(false);
        return;
      }

      if (dy > 2) {
        accumDownRef.current += dy;
        accumUpRef.current = 0;
        if (accumDownRef.current >= SERVICE_PIN_HIDE_PX) {
          setPinnedServiceBar(false);
          accumDownRef.current = 0;
        }
      } else if (dy < -2) {
        accumUpRef.current += -dy;
        accumDownRef.current = 0;
        if (accumUpRef.current >= SERVICE_PIN_SHOW_PX) {
          setPinnedServiceBar(true);
          accumUpRef.current = 0;
        }
      }
    },
    [setPinnedServiceBar],
  );

  const renderServiceSelector = useCallback(
    () => (
      <View style={styles.discoveryChromeInner}>
        <View style={styles.serviceTriggerWrap}>
          <Text style={[styles.serviceTriggerLabel, {color: theme.text}]}>
            {t('browse.selectProfession')}
          </Text>
          <TouchableOpacity
            style={[
              styles.serviceTrigger,
              {
                backgroundColor: crystalServiceBg,
                borderColor: theme.border,
              },
            ]}
            onPress={() => setCatalogOpen(true)}
            accessibilityRole="button">
            <Icon name="search" size={18} color={theme.textSecondary} />
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

        <PopularServices
          theme={theme}
          services={catalogServices.length > 0 ? catalogServices : undefined}
          selectedApiName={
            selectedProfession === ALL_PROFESSIONS ? '' : selectedProfession
          }
          onSelect={name =>
            setSelectedProfession(name ? name : ALL_PROFESSIONS)
          }
        />

        {isGuest ? (
          <Text style={[styles.guestNote, {color: theme.textSecondary}]}>
            {String(
              t('browse.guestNote') ||
                'Browse freely. Sign in to request a service.',
            )}{' '}
            <Text
              style={{color: theme.primary, fontWeight: '600'}}
              onPress={goLogin}>
              {t('auth.login') || t('actions.signIn')}
            </Text>
          </Text>
        ) : null}
      </View>
    ),
    [
      theme,
      t,
      crystalServiceBg,
      selectedProfession,
      catalogServices,
      isGuest,
      goLogin,
    ],
  );

  const renderResultsMeta = useCallback(
    () => (
      <View
        style={[
          styles.resultsMeta,
          {backgroundColor: theme.background},
        ]}>
        {!loading ? (
          <View style={styles.resultsHead}>
            <Text
              style={[styles.listTitle, {color: theme.text}]}
              numberOfLines={2}>
              {resultsHeading}
            </Text>
          </View>
        ) : null}

        {providers.length > 0 || searchQuery.trim() ? (
          <View style={styles.providerSearchWrap}>
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder={String(
                t('browse.searchByNamePlaceholder') ||
                  t('browse.searchProviders') ||
                  t('providers.searchProviders'),
              )}
            />
          </View>
        ) : null}

        {connectionFailed && filteredProviders.length > 0 ? (
          <ConnectionNotice
            kind="refresh"
            onRetry={() => void handleRefresh()}
          />
        ) : null}
      </View>
    ),
    [
      loading,
      theme,
      resultsHeading,
      t,
      providers.length,
      searchQuery,
      connectionFailed,
      filteredProviders.length,
      handleRefresh,
    ],
  );

  const listHeader = useMemo(
    () => (
      <View>
        <View
          style={[
            styles.discoveryChrome,
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
            },
          ]}>
          {renderServiceSelector()}
        </View>
        {renderResultsMeta()}
      </View>
    ),
    [theme.card, theme.border, renderServiceSelector, renderResultsMeta],
  );

  const renderListEmpty = useCallback(() => {
    if (loading) {
      return (
        <View style={styles.resultsLoading}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{marginTop: 8, color: theme.textSecondary}}>
            {t('browse.loading') || t('providers.loading')}
          </Text>
        </View>
      );
    }
    if (connectionFailed) {
      return (
        <ConnectionNotice
          kind="load"
          emptyTitle={String(t('browse.loadFailedTitle') || emptyTitle)}
          onRetry={() => void loadOnlineProviders()}
        />
      );
    }

    const state = geoStates.find(s => s._id === selectedStateId);
    const district = geoDistricts.find(d => d._id === selectedDistrictId);
    const hasBlock = Boolean(selectedBlockId);
    const hasDistrict =
      Boolean(selectedDistrictId) && selectedDistrictId !== ALL_DISTRICTS;
    const hasState =
      Boolean(selectedStateId) && selectedStateId !== ALL_STATES;
    // Name filter empty ≠ place filter empty — only offer widen when no providers at all.
    const showWidenActions = providers.length === 0;

    return (
      <View style={styles.emptyWrap}>
        <EmptyState
          icon="search-outline"
          title={emptyTitle}
          message={String(t('browse.emptyHint'))}
        />
        <Pressable
          onPress={openLocationPicker}
          style={({pressed}) => [
            styles.emptyPrimaryBtn,
            {
              backgroundColor: theme.primary,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={String(
            t('browse.changeLocationCta') || 'Change location',
          )}>
          <Text style={styles.emptyPrimaryBtnText}>
            {String(t('browse.changeLocationCta') || 'Change location')}
          </Text>
        </Pressable>
        {showWidenActions && hasBlock && district?.name ? (
          <TouchableOpacity
            onPress={() => applyManualDistrict(selectedDistrictId)}
            style={styles.emptyAction}
            accessibilityRole="button">
            <Text style={[styles.emptyActionText, {color: theme.primary}]}>
              {t('browse.widenToDistrict', {district: district.name})}
            </Text>
          </TouchableOpacity>
        ) : null}
        {showWidenActions && hasDistrict && state?.name ? (
          <TouchableOpacity
            onPress={() => applyManualState(selectedStateId)}
            style={styles.emptyAction}
            accessibilityRole="button">
            <Text style={[styles.emptyActionText, {color: theme.primary}]}>
              {t('browse.widenToState', {state: state.name})}
            </Text>
          </TouchableOpacity>
        ) : null}
        {showWidenActions && (hasState || hasDistrict || hasBlock) ? (
          <TouchableOpacity
            onPress={() => applyManualState('')}
            style={styles.emptyAction}
            accessibilityRole="button">
            <Text style={[styles.emptyActionText, {color: theme.textSecondary}]}>
              {t('browse.clearPlaceFilter')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    );
  }, [
    loading,
    theme.primary,
    theme.textSecondary,
    t,
    connectionFailed,
    emptyTitle,
    loadOnlineProviders,
    geoStates,
    selectedStateId,
    geoDistricts,
    selectedDistrictId,
    selectedBlockId,
    applyManualDistrict,
    applyManualState,
    providers.length,
    openLocationPicker,
  ]);

  const renderBrowseRow = useCallback(
    ({item}: {item: ProviderWithStatus}) =>
      isGuest
        ? renderGuestProvider({item})
        : renderProvider({item}),
    [isGuest, renderGuestProvider, renderProvider],
  );

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.background}]}
      edges={[]}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

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

      <BrowseLocationPickerModal
        theme={theme}
        visible={locationPickerOpen}
        onClose={() => setLocationPickerOpen(false)}
        states={geoStates}
        districts={geoDistricts}
        blocks={geoBlocks}
        stateId={selectedStateId === ALL_STATES ? '' : selectedStateId}
        districtId={
          selectedDistrictId === ALL_DISTRICTS ? '' : selectedDistrictId
        }
        blockId={selectedBlockId}
        locating={locating}
        usingDeviceLocation={usingDeviceLocation}
        hasLocation={browseHasLocation}
        onUseMyLocation={() => void handleUseMyLocation()}
        onStateChange={applyManualState}
        onDistrictChange={applyManualDistrict}
        onBlockChange={applyManualBlock}
      />

      <View style={styles.providerList}>
        {/* Pinned service controls — native-driver fade/slide on upward scroll */}
        <Animated.View
          pointerEvents={pinnedServiceVisible ? 'auto' : 'none'}
          style={[
            styles.pinnedServiceBar,
            {
              backgroundColor: theme.card,
              borderBottomColor: theme.border,
              opacity: pinnedServiceAnim,
              transform: [
                {
                  translateY: pinnedServiceAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-10, 0],
                  }),
                },
              ],
            },
          ]}>
          {renderServiceSelector()}
        </Animated.View>

        <FlatList
          ref={listRef}
          style={styles.providerListFlex}
          data={filteredProviders}
          renderItem={renderBrowseRow}
          keyExtractor={item => item.id}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={renderListEmpty}
          ListFooterComponent={isGuest ? null : <AdSlot size="banner" />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ProviderListSeparator}
          keyboardShouldPersistTaps="handled"
          onScroll={onProviderListScroll}
          scrollEventThrottle={16}
          initialNumToRender={10}
          maxToRenderPerBatch={12}
          windowSize={9}
          removeClippedSubviews={false}
        />
      </View>

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
  listContent: {
    paddingHorizontal: 14,
    paddingBottom: 110,
    flexGrow: 1,
  },
  providerList: {
    flex: 1,
    position: 'relative',
  },
  providerListFlex: {
    flex: 1,
  },
  pinnedServiceBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    elevation: 6,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  listSeparator: {height: 8},
  discoveryChrome: {
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  discoveryChromeInner: {
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  discoveryTop: {
    gap: 8,
    paddingTop: 8,
    paddingBottom: 6,
  },
  stickyChips: {
    paddingTop: 4,
    paddingBottom: 6,
    zIndex: 2,
  },
  resultsMeta: {
    gap: 6,
    paddingTop: 8,
    paddingBottom: 6,
  },
  discovery: {
    gap: 8,
    paddingTop: 8,
    paddingBottom: 4,
  },
  serviceTriggerWrap: {marginHorizontal: 0},
  serviceTriggerLabel: {
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 17,
    marginBottom: 4,
  },
  serviceTrigger: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceTriggerValue: {flex: 1, fontSize: 14, fontWeight: '600'},
  providerSearchWrap: {marginBottom: 2, marginTop: 2},
  nameSearchHint: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  suggestLink: {fontWeight: '600', fontSize: 12},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  geoFilterRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 0,
    alignItems: 'flex-start',
  },
  guestNote: {
    fontSize: 12,
    lineHeight: 17,
  },
  resultsLoading: {
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyWrap: {
    paddingTop: 8,
    paddingBottom: 16,
    alignItems: 'center',
    gap: 6,
  },
  emptyPrimaryBtn: {
    marginTop: 4,
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPrimaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptyAction: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  emptyActionText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  resultsHead: {
    gap: 2,
    marginBottom: 2,
  },
  listTitle: {flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18},
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
