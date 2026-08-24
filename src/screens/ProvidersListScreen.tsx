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
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {Select} from 'sapvt-ltd-app-packages';
import {providersApi} from '../services/api/providersApi';
import {usersApi} from '../services/api/usersApi';
import {serviceCategoriesApi} from '../services/api/serviceCategoriesApi';
import {
  getGeographyMeta,
  type GeographyDistrict,
  type GeographyState,
} from '../services/api/geographyApi';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import EmptyState from '../components/EmptyState';
import AdSlot from '../components/AdSlot';
import {ProviderCard} from '../components/ProviderCard';
import {getDistanceToCustomer} from '../services/providerLocationService';
import useTranslation from '../hooks/useTranslation';
import AlertModal from '../components/AlertModal';
import ProviderRequestModal from '../components/ProviderRequestModal';

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
  experience?: number;
  rating?: number;
  totalReviews?: number;
  totalConsultations?: number;
  profileImage?: string;
  isOnline?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  distance?: string;
  eta?: number;
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

function professionOf(p: ProviderWithStatus): string {
  return (
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

function matchesProfession(p: ProviderWithStatus, selected: string): boolean {
  if (!selected || selected === ALL_PROFESSIONS) return true;
  const needle = selected.toLowerCase().trim();
  const fields = [
    p.specialization,
    p.specialty,
    p.serviceType,
    professionOf(p),
  ];
  return fields.some(f => (f || '').toLowerCase().includes(needle));
}

export default function ProvidersListScreen({navigation}: any) {
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
  const [selectedStateId, setSelectedStateId] = useState(ALL_STATES);
  const [selectedDistrictId, setSelectedDistrictId] = useState(ALL_DISTRICTS);
  const [requestProvider, setRequestProvider] = useState<ProviderWithStatus | null>(null);


  useEffect(() => {
    loadProfessionOptions();
    void getGeographyMeta().then((meta) => {
      setGeoStates(meta.states || []);
      setGeoDistricts(meta.districts || []);
    });
  }, []);

  useEffect(() => {
    void loadOnlineProviders();
  }, [selectedStateId, selectedDistrictId]);

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
  // -----------------------------
  // Load Providers
  // -----------------------------
  const loadOnlineProviders = async () => {
    try {
      setLoading(true);

      const filters: {
        stateId?: string;
        districtId?: string;
        state?: string;
        district?: string;
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
          serviceType: (data as any).serviceType,
          experience: data.experience,
          rating: data.rating,
          totalReviews: (data as any).totalReviews,
          totalConsultations: (data as any).totalConsultations,
          profileImage: (data as any).profileImage,
          isOnline: data.isOnline,
          approvalStatus: data.approvalStatus || 'approved',
          address: {
            latitude: data.location?.latitude || (data as any).currentLocation?.latitude,
            longitude: data.location?.longitude || (data as any).currentLocation?.longitude,
            address: data.location?.address || (data as any).address?.address,
            city: data.location?.city || (data as any).address?.city,
            district:
              data.location?.district ||
              (data as any).address?.district ||
              data.location?.city,
            state: data.location?.state || (data as any).address?.state,
            stateId: data.location?.stateId,
            districtId: data.location?.districtId,
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

      setProviders(list);
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

  // Guest: no photo; same professional card, existing contact fields only
  const renderGuestProvider = ({item}: {item: ProviderWithStatus}) => {
    const phone = phoneOf(item);
    const profession = professionOf(item);
    const location = districtOf(item, geoDistricts);
    return (
      <ProviderCard
        theme={theme}
        name={item.name}
        profession={profession}
        location={location || undefined}
        isOnline={Boolean(item.isOnline)}
        onlineLabel={String(t('providers.online'))}
        phone={phone || null}
        callLabel={String(t('providers.callProvider'))}
        requestLabel={String(t('providers.requestService'))}
        hidePhoto
        onCall={phone ? () => handleCallProvider(item) : undefined}
        onRequest={() => openRequestModal(item)}
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
    setRequestProvider(item);
  };

  const renderProvider = ({item}: {item: ProviderWithStatus}) => {
    const phone = phoneOf(item);
    const location = districtOf(item, geoDistricts);
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
        profession={professionOf(item)}
        location={location || undefined}
        experienceLabel={experienceLabel}
        rating={item.rating}
        reviewsLabel={reviewsLabel}
        image={item.profileImage}
        isOnline={Boolean(item.isOnline)}
        onlineLabel={String(t('providers.online'))}
        phone={phone || null}
        callLabel={String(t('providers.callProvider'))}
        requestLabel={String(t('providers.requestService'))}
        onPress={() => navigation.navigate('ProviderDetails', {provider: item})}
        onCall={phone ? () => handleCallProvider(item) : undefined}
        onRequest={() => openRequestModal(item)}
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

  const professionSelectOptions = useMemo(
    () => [
      {value: ALL_PROFESSIONS, label: t('providers.allProfessions')},
      ...professionOptions.map(name => ({value: name, label: name})),
    ],
    [professionOptions, t],
  );

  const stateSelectOptions = useMemo(
    () => [
      {value: ALL_STATES, label: t('providers.allStates')},
      ...geoStates.map((s) => ({value: s._id, label: s.name})),
    ],
    [geoStates, t],
  );

  const districtSelectOptions = useMemo(
    () => [
      {value: ALL_DISTRICTS, label: t('providers.allDistricts')},
      ...geoDistricts
        .filter(
          (d) =>
            selectedStateId === ALL_STATES || d.stateId === selectedStateId,
        )
        .map((d) => ({value: d._id, label: d.name})),
    ],
    [geoDistricts, selectedStateId, t],
  );

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedProfession !== ALL_PROFESSIONS ||
    selectedStateId !== ALL_STATES ||
    selectedDistrictId !== ALL_DISTRICTS;

  if (loading && providers.length === 0) {
    return (
      <SafeAreaView
        style={[styles.container, {backgroundColor: theme.background}]}
        edges={['top']}>
        {isGuest ? (
          <View
            style={[
              styles.guestTopBar,
              {backgroundColor: theme.card, borderBottomColor: theme.border},
            ]}>
            <View style={{flex: 1}}>
              <Text style={[styles.guestBrand, {color: theme.text}]}>
                HomeServices
              </Text>
              <Text style={[styles.guestSub, {color: theme.textSecondary}]}>
                {t('auth.guestSettingsHint')}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.loginBtn, {backgroundColor: theme.primary}]}
              onPress={goLogin}
              accessibilityRole="button">
              <Icon name="login" size={18} color="#fff" />
              <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={styles.center}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{marginTop: 10, color: theme.textSecondary}}>
            {t('providers.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, {backgroundColor: theme.background}]}
      edges={['top']}>
      <StatusBar
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {isGuest ? (
        <View
          style={[
            styles.guestTopBar,
            {backgroundColor: theme.card, borderBottomColor: theme.border},
          ]}>
          <View style={{flex: 1}}>
            <Text style={[styles.guestBrand, {color: theme.text}]}>
              HomeServices
            </Text>
            <Text style={[styles.guestSub, {color: theme.textSecondary}]}>
              {t('auth.guestSettingsHint')}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.loginBtn, {backgroundColor: theme.primary}]}
            onPress={goLogin}
            accessibilityRole="button">
            <Icon name="login" size={18} color="#fff" />
            <Text style={styles.loginBtnText}>{t('auth.login')}</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Select
        label={t('providers.selectProfession')}
        options={professionSelectOptions}
        value={selectedProfession}
        onChange={setSelectedProfession}
        placeholder={t('providers.selectProfession')}
        title={t('providers.selectProfession')}
        style={{marginHorizontal: 16, marginBottom: 8}}
      />

      <View style={styles.geoFilterRow}>
        <Select
          label={t('providers.selectState')}
          options={stateSelectOptions}
          value={selectedStateId}
          onChange={(id) => {
            setSelectedStateId(id);
            setSelectedDistrictId(ALL_DISTRICTS);
          }}
          placeholder={t('providers.selectState')}
          title={t('providers.selectState')}
          style={{flex: 1, marginBottom: 0}}
        />
        <Select
          label={t('providers.selectDistrict')}
          options={districtSelectOptions}
          value={selectedDistrictId}
          onChange={setSelectedDistrictId}
          placeholder={t('providers.selectDistrict')}
          title={t('providers.selectDistrict')}
          disabled={selectedStateId === ALL_STATES}
          style={{flex: 1, marginBottom: 0}}
        />
      </View>

      {!isGuest ? (
        <TextInput
          placeholder={t('providers.searchProviders')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[
            styles.search,
            {
              backgroundColor: theme.card,
              borderColor: theme.border,
              color: theme.text,
            },
          ]}
          placeholderTextColor={theme.textSecondary}
        />
      ) : null}

      {filteredProviders.length === 0 ? (
        <EmptyState
          icon="person-remove-outline"
          title={String(t('providers.noProvidersFound'))}
          message={
            hasActiveFilters
              ? t('providers.tryAdjustingFilters')
              : t('providers.noProvidersFoundMessage')
          }
        />
      ) : (
        <FlatList
          data={filteredProviders}
          renderItem={isGuest ? renderGuestProvider : renderProvider}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListFooterComponent={isGuest ? null : <AdSlot size="banner" />}
          contentContainerStyle={{paddingBottom: 24}}
        />
      )}

      <ProviderRequestModal
        visible={!!requestProvider}
        provider={requestProvider}
        onClose={() => setRequestProvider(null)}
        onSuccess={(serviceRequestId) => {
          setRequestProvider(null);
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
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  geoFilterRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    alignItems: 'flex-start',
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
  filterList: {
    paddingHorizontal: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
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
