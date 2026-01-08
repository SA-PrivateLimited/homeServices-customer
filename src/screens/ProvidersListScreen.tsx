/**
 * Providers List Screen
 * Customer app - Browse individual online service providers
 */

import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import EmptyState from '../components/EmptyState';
import {getDistanceToCustomer} from '../services/providerLocationService';
import useTranslation from '../hooks/useTranslation';
import AlertModal from '../components/AlertModal';

interface ProviderWithStatus {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  specialization?: string;
  specialty?: string;
  experience?: number;
  rating?: number;
  totalConsultations?: number;
  profileImage?: string;
  isOnline?: boolean;
  distance?: string;
  eta?: number;
  address?: {
    latitude?: number;
    longitude?: number;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

export default function ProvidersListScreen({navigation}: any) {
  const {isDarkMode, currentUser, currentPincode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  
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
  const [selectedServiceType, setSelectedServiceType] = useState(t('common.all'));

  useEffect(() => {
    loadOnlineProviders();

    // Listen to real-time online status updates via Realtime Database
    // This updates online status instantly when provider goes online/offline
    const providersRef = database().ref('providers');
    
    // Listen to status changes for any provider
    const unsubscribeStatus = providersRef.on('child_changed', (snapshot) => {
      const providerId = snapshot.key;
      if (!providerId) return;
      
      // Check if status node changed
      const statusSnapshot = snapshot.child('status');
      if (statusSnapshot.exists()) {
        const isOnline = statusSnapshot.val()?.isOnline === true;
        
        // Update online status for this specific provider
        setProviders(prevProviders => 
          prevProviders.map(p => 
            p.id === providerId ? {...p, isOnline} : p
          )
        );
      }
    });

    return () => {
      providersRef.off('child_changed', unsubscribeStatus);
    };
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, searchQuery, selectedServiceType]);

  // -----------------------------
  // Load Providers
  // -----------------------------
  const loadOnlineProviders = async () => {
    try {
      setLoading(true);

      const snapshot = await firestore()
        .collection('providers')
        .where('approvalStatus', '==', 'approved')
        .get();

      const list: ProviderWithStatus[] = [];

      for (const doc of snapshot.docs) {
        const data = doc.data();
        const providerId = doc.id;

        let isOnline = false;
        try {
          const statusSnap = await database()
            .ref(`providers/${providerId}/status`)
            .once('value');
          isOnline = statusSnap.val()?.isOnline === true;
        } catch {
          isOnline = data.isOnline === true;
        }

        const provider: ProviderWithStatus = {
          id: providerId,
          name: data.name || 'Provider',
          email: data.email,
          phone: data.phone,
          phoneNumber: data.phoneNumber,
          specialization: data.specialization || data.specialty,
          experience: data.experience,
          rating: data.rating,
          totalConsultations: data.totalConsultations,
          profileImage: data.profileImage,
          isOnline,
          address: data.address,
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
      Alert.alert(
        'Error',
        String(error?.message || 'Failed to load providers'),
      );
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

      const doc = await firestore()
        .collection('users')
        .doc(currentUser.id)
        .get();

      const data = doc.data();
      if (data?.location?.latitude && data?.location?.longitude) {
        return {
          latitude: Number(data.location.latitude),
          longitude: Number(data.location.longitude),
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

    if (selectedServiceType !== t('common.all')) {
      list = list.filter(
        p =>
          p.specialization === selectedServiceType ||
          p.specialty === selectedServiceType,
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        p =>
          p.name.toLowerCase().includes(q) ||
          p.specialization?.toLowerCase().includes(q) ||
          p.specialty?.toLowerCase().includes(q),
      );
    }

    setFilteredProviders(list);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOnlineProviders();
  };

  const handleCallProvider = (provider: ProviderWithStatus) => {
    const phone = provider.phoneNumber || provider.phone;
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

  // -----------------------------
  // Render Card
  // -----------------------------
  const renderProvider = ({item}: {item: ProviderWithStatus}) => (
    <TouchableOpacity
      style={[styles.card, {backgroundColor: theme.card, borderColor: theme.border}]}
      onPress={() => navigation.navigate('ProviderDetails', {provider: item})}
      activeOpacity={0.7}>
      <View style={styles.imageWrap}>
        {item.profileImage ? (
          <Image source={{uri: item.profileImage}} style={styles.image} />
        ) : (
          <View style={[styles.placeholder, {backgroundColor: theme.border}]}>
            <Icon name="person" size={36} color={theme.textSecondary} />
          </View>
        )}
        {item.isOnline && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.info}>
        {/* Name and Online Status */}
        <View style={styles.nameRow}>
          <Text style={[styles.name, {color: theme.text}]} numberOfLines={1}>
            {item.name}
          </Text>
          {item.isOnline && (
            <View style={styles.onlineBadge}>
              <Text style={styles.onlineBadgeText}>{t('providers.online')}</Text>
            </View>
          )}
        </View>

        {/* Specialization */}
        <Text style={[styles.specialization, {color: theme.textSecondary}]} numberOfLines={1}>
          {item.specialization || item.specialty || t('providers.serviceProvider')}
        </Text>

        {/* Rating and Reviews */}
        {item.rating !== undefined && item.rating > 0 && (
          <View style={styles.ratingRow}>
            <Icon name="star" size={14} color="#FFD700" />
            <Text style={[styles.ratingText, {color: theme.text}]}>
              {item.rating.toFixed(1)}
            </Text>
            {item.totalConsultations !== undefined && item.totalConsultations > 0 && (
              <Text style={[styles.reviewsText, {color: theme.textSecondary}]}>
                ({item.totalConsultations} {item.totalConsultations === 1 ? t('providers.review') : t('providers.reviews')})
              </Text>
            )}
          </View>
        )}

        {/* Experience */}
        {item.experience !== undefined && item.experience > 0 && (
          <Text style={[styles.experience, {color: theme.textSecondary}]}>
            {t('providers.experienceWithYears', {years: item.experience, count: item.experience})}
          </Text>
        )}

        {/* Distance and ETA */}
        {(item.distance || item.eta) && (
          <View style={styles.locationRow}>
            {item.distance && (
              <View style={styles.locationItem}>
                <Icon name="location-on" size={14} color={theme.primary} />
                <Text style={[styles.locationText, {color: theme.textSecondary}]}>
                  {item.distance}
                </Text>
              </View>
            )}
            {item.eta && (
              <View style={styles.locationItem}>
                <Icon name="access-time" size={14} color={theme.primary} />
                <Text style={[styles.locationText, {color: theme.textSecondary}]}>
                  ~{item.eta} min
                </Text>
              </View>
            )}
          </View>
        )}
      </View>

      <TouchableOpacity
        style={[styles.callBtn, {backgroundColor: theme.primary}]}
        onPress={() => handleCallProvider(item)}
        activeOpacity={0.7}>
        <Icon name="phone" size={20} color="#fff" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  // -----------------------------
  // UI
  // -----------------------------
  if (loading && providers.length === 0) {
    return (
      <View style={[styles.center, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={{marginTop: 10}}>{t('providers.loading')}</Text>
      </View>
    );
  }

  // Get unique service types from providers
  const serviceTypes = [
    t('common.all'),
    ...new Set(
      providers
        .map(p => p.specialization || p.specialty)
        .filter(Boolean) as string[],
    ),
  ];

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <TextInput
        placeholder={t('providers.searchProviders')}
        value={searchQuery}
        onChangeText={setSearchQuery}
        style={[styles.search, {backgroundColor: theme.card, borderColor: theme.border, color: theme.text}]}
        placeholderTextColor={theme.textSecondary}
      />

      {/* Service Type Filter */}
      {serviceTypes.length > 1 && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={serviceTypes}
            keyExtractor={item => item}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      selectedServiceType === item ? theme.primary : theme.card,
                    borderColor: theme.border,
                  },
                ]}
                onPress={() => setSelectedServiceType(item)}>
                <Text
                  style={[
                    styles.filterChipText,
                    {
                      color: selectedServiceType === item ? '#FFF' : theme.text,
                    },
                  ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.filterList}
          />
        </View>
      )}

      {filteredProviders.length === 0 ? (
        <EmptyState
          icon="person-remove-outline"
          title="No Providers Found"
          message={
            searchQuery || selectedServiceType !== t('common.all')
              ? t('providers.tryAdjustingFilters')
              : t('providers.noProvidersFoundMessage')
          }
        />
      ) : (
        <FlatList
          data={filteredProviders}
          renderItem={renderProvider}
          keyExtractor={item => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
      
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({visible: false, title: '', message: '', type: 'info'})}
      />
    </View>
  );
}

// -----------------------------
// Styles
// -----------------------------
const styles = StyleSheet.create({
  container: {flex: 1},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  search: {
    margin: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
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
  callBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
});
