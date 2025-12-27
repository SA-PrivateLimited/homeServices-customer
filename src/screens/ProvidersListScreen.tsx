/**
 * Providers List Screen
 * Customer app - Browse individual online service providers
 * Shows only providers who are currently online
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import type {Doctor} from '../types/consultation';
import EmptyState from '../components/EmptyState';
import {getDistanceToCustomer} from '../services/providerLocationService';

interface ProviderWithStatus extends Doctor {
  isOnline?: boolean;
  distance?: string;
  eta?: number;
}

export default function ProvidersListScreen({navigation}: any) {
  const {isDarkMode, currentUser, currentPincode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [providers, setProviders] = useState<ProviderWithStatus[]>([]);
  const [filteredProviders, setFilteredProviders] = useState<ProviderWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState('All');

  useEffect(() => {
    loadOnlineProviders();
    
    // Subscribe to real-time online status updates
    const onlineStatusRef = database().ref('providers');
    const unsubscribe = onlineStatusRef.on('value', () => {
      loadOnlineProviders();
    });

    return () => {
      onlineStatusRef.off('value', unsubscribe);
    };
  }, []);

  useEffect(() => {
    filterProviders();
  }, [providers, searchQuery, selectedServiceType]);

  const loadOnlineProviders = async () => {
    try {
      setLoading(true);
      
      // Fetch providers from Firestore where isOnline is true
      const providersSnapshot = await firestore()
        .collection('providers')
        .where('isOnline', '==', true)
        .where('approvalStatus', '==', 'approved')
        .get();

      const providersList: ProviderWithStatus[] = [];

      for (const doc of providersSnapshot.docs) {
        const providerData = doc.data() as Doctor;
        const providerId = doc.id;

        // Get real-time status from Realtime Database
        const statusSnapshot = await database()
          .ref(`providers/${providerId}/status`)
          .once('value');
        
        const realtimeStatus = statusSnapshot.val();
        
        // Only include if truly online
        if (realtimeStatus?.isOnline === true) {
          const provider: ProviderWithStatus = {
            ...providerData,
            id: providerId,
            isOnline: true,
          };

          // Calculate distance if customer location is available
          if (
            currentPincode &&
            providerData.address?.latitude &&
            providerData.address?.longitude
          ) {
            try {
              const customerLocation = await getCustomerLocation();
              if (customerLocation && providerData.address) {
                const distanceInfo = getDistanceToCustomer(
                  {
                    latitude: providerData.address.latitude,
                    longitude: providerData.address.longitude,
                    address: providerData.address.address || '',
                    city: providerData.address.city,
                    state: providerData.address.state,
                    pincode: providerData.address.pincode || '',
                    updatedAt: Date.now(),
                  },
                  customerLocation,
                );
                provider.distance = distanceInfo.distanceFormatted;
                provider.eta = distanceInfo.etaMinutes;
              }
            } catch (error) {
              console.log('Could not calculate distance:', error);
            }
          }

          providersList.push(provider);
        }
      }

      // Sort by rating (highest first), then by distance if available
      providersList.sort((a, b) => {
        if (a.eta && b.eta) {
          return a.eta - b.eta; // Sort by ETA if both have it
        }
        if (a.rating && b.rating) {
          return b.rating - a.rating; // Sort by rating
        }
        return 0;
      });

      setProviders(providersList);
    } catch (error: any) {
      console.error('Error loading online providers:', error);
      Alert.alert('Error', 'Failed to load providers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getCustomerLocation = async (): Promise<{latitude: number; longitude: number} | null> => {
    try {
      if (currentUser?.id) {
        const userDoc = await firestore()
          .collection('users')
          .doc(currentUser.id)
          .get();
        
        const userData = userDoc.data();
        if (userData?.location?.latitude && userData?.location?.longitude) {
          return {
            latitude: userData.location.latitude,
            longitude: userData.location.longitude,
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting customer location:', error);
      return null;
    }
  };

  const filterProviders = () => {
    let filtered = providers;

    // Filter by service type
    if (selectedServiceType !== 'All') {
      filtered = filtered.filter(
        provider =>
          provider.specialization === selectedServiceType ||
          provider.specialty === selectedServiceType,
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        provider =>
          provider.name?.toLowerCase().includes(query) ||
          provider.specialization?.toLowerCase().includes(query) ||
          provider.specialty?.toLowerCase().includes(query),
      );
    }

    setFilteredProviders(filtered);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadOnlineProviders();
  };

  const handleProviderPress = (provider: ProviderWithStatus) => {
    navigation.navigate('ProviderDetails', {provider, doctor: provider}); // Support both for backward compatibility
  };

  const serviceTypes = [
    'All',
    ...new Set(
      providers
        .map(p => p.specialization || p.specialty)
        .filter(Boolean) as string[],
    ),
  ];

  const renderProviderCard = ({item}: {item: ProviderWithStatus}) => {
    return (
      <TouchableOpacity
        style={[styles.providerCard, {backgroundColor: theme.card, borderColor: theme.border}]}
        onPress={() => handleProviderPress(item)}
        activeOpacity={0.7}>
        {/* Provider Image */}
        <View style={styles.providerImageContainer}>
          {item.profileImage ? (
            <Image source={{uri: item.profileImage}} style={styles.providerImage} />
          ) : (
            <View style={[styles.providerImagePlaceholder, {backgroundColor: theme.border}]}>
              <Icon name="person" size={40} color={theme.textSecondary} />
            </View>
          )}
          {/* Online Indicator */}
          <View style={styles.onlineIndicator} />
        </View>

        {/* Provider Info */}
        <View style={styles.providerInfo}>
          <View style={styles.providerHeader}>
            <Text style={[styles.providerName, {color: theme.text}]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.rating && (
              <View style={styles.ratingContainer}>
                <Icon name="star" size={16} color="#FFD700" />
                <Text style={[styles.ratingText, {color: theme.text}]}>
                  {item.rating.toFixed(1)}
                </Text>
                {item.totalConsultations && (
                  <Text style={[styles.reviewsText, {color: theme.textSecondary}]}>
                    ({item.totalConsultations})
                  </Text>
                )}
              </View>
            )}
          </View>

          <Text style={[styles.serviceType, {color: theme.textSecondary}]} numberOfLines={1}>
            {item.specialization || item.specialty || 'Service Provider'}
          </Text>

          {item.experience && (
            <Text style={[styles.experience, {color: theme.textSecondary}]}>
              {item.experience} years experience
            </Text>
          )}

          {/* Distance and ETA */}
          {(item.distance || item.eta) && (
            <View style={styles.distanceContainer}>
              {item.distance && (
                <View style={styles.distanceItem}>
                  <Icon name="location-on" size={14} color={theme.primary} />
                  <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                    {item.distance}
                  </Text>
                </View>
              )}
              {item.eta && (
                <View style={styles.distanceItem}>
                  <Icon name="access-time" size={14} color={theme.primary} />
                  <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                    ~{item.eta} min
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Arrow */}
        <Icon name="chevron-right" size={24} color={theme.textSecondary} />
      </TouchableOpacity>
    );
  };

  if (loading && providers.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
          Loading online providers...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, {backgroundColor: theme.card}]}>
        <Icon name="search" size={24} color={theme.textSecondary} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, {color: theme.text}]}
          placeholder="Search providers..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Service Type Filter */}
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

      {/* Providers List */}
      {filteredProviders.length === 0 ? (
        <EmptyState
          icon="person-off"
          title="No Online Providers"
          message={
            searchQuery || selectedServiceType !== 'All'
              ? 'Try adjusting your filters'
              : 'No providers are currently online. Check back later!'
          }
        />
      ) : (
        <FlatList
          data={filteredProviders}
          renderItem={renderProviderCard}
          keyExtractor={item => item.id || ''}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />
          }
          ListHeaderComponent={
            <View style={styles.headerInfo}>
              <Text style={[styles.headerText, {color: theme.textSecondary}]}>
                {filteredProviders.length} provider{filteredProviders.length !== 1 ? 's' : ''} online
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  filterContainer: {
    marginVertical: 12,
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
  listContent: {
    padding: 16,
  },
  headerInfo: {
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500',
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  providerImageContainer: {
    position: 'relative',
    marginRight: 12,
  },
  providerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  providerImagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#34C759',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  providerInfo: {
    flex: 1,
  },
  providerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
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
  serviceType: {
    fontSize: 14,
    marginBottom: 4,
  },
  experience: {
    fontSize: 12,
    marginBottom: 4,
  },
  distanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  distanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  distanceText: {
    fontSize: 12,
    marginLeft: 4,
  },
});

