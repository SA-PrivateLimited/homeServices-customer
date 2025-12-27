/**
 * Active Service Screen
 * Customer app - Real-time service tracking (Ola/Uber style)
 * Shows provider location, status updates, ETA
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
// MapView is optional - will show simplified view if maps not available
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

try {
  const maps = require('react-native-maps');
  MapView = maps.default;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
} catch (e) {
  console.log('react-native-maps not available, using simplified view');
}
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {subscribeToJobCardStatus} from '../services/jobCardService';
import {getDistanceToCustomer, formatDistance} from '../services/providerLocationService';
import ReviewModal from '../components/ReviewModal';
import {canCustomerReview, getJobCardReview} from '../services/reviewService';

interface ActiveServiceScreenProps {
  navigation: any;
  route: {
    params: {
      serviceRequestId: string;
      jobCardId?: string;
    };
  };
}

export default function ActiveServiceScreen({
  navigation,
  route,
}: ActiveServiceScreenProps) {
  const {serviceRequestId, jobCardId} = route.params;
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const currentUser = auth().currentUser;

  const [serviceRequest, setServiceRequest] = useState<any>(null);
  const [jobCard, setJobCard] = useState<any>(null);
  const [providerLocation, setProviderLocation] = useState<any>(null);
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [distance, setDistance] = useState<string>('');
  const [eta, setEta] = useState<number>(0);

  useEffect(() => {
    loadServiceData();
    
    // Subscribe to job card status updates
    if (jobCardId) {
      const unsubscribe = subscribeToJobCardStatus(
        jobCardId,
        (newStatus, updatedAt) => {
          setStatus(newStatus);
          if (newStatus === 'completed') {
            // Check if customer can review
            checkReviewStatus();
          }
        },
      );

      return () => unsubscribe();
    }

    // Subscribe to provider location updates
    const providerId = jobCard?.providerId || serviceRequest?.providerId || serviceRequest?.doctorId;
    if (providerId) {
      const locationRef = database().ref(`providers/${providerId}/location`);
      const unsubscribe = locationRef.on('value', snapshot => {
        if (snapshot.exists()) {
          const location = snapshot.val();
          setProviderLocation(location);
          calculateDistanceAndETA(location);
        }
      });

      return () => locationRef.off('value', unsubscribe);
    }
  }, [jobCardId, jobCard?.providerId, serviceRequest?.providerId, serviceRequest?.doctorId]);

  const loadServiceData = async () => {
    try {
      setLoading(true);

      // Load service request
      const requestDoc = await firestore()
        .collection('consultations')
        .doc(serviceRequestId)
        .get();

      if (requestDoc.exists) {
        const requestData = requestDoc.data();
        setServiceRequest({
          id: requestDoc.id,
          ...requestData,
        });
        setStatus(requestData?.status || 'pending');
      }

      // Load job card if ID provided
      if (jobCardId) {
        const jobCardDoc = await firestore()
          .collection('jobCards')
          .doc(jobCardId)
          .get();

        if (jobCardDoc.exists) {
          const jobCardData = jobCardDoc.data();
          setJobCard({
            id: jobCardDoc.id,
            ...jobCardData,
          });
          setStatus(jobCardData?.status || 'pending');

          // Load provider profile and location
          if (jobCardData?.providerId) {
            // Fetch full provider profile
            const providerDoc = await firestore()
              .collection('providers')
              .doc(jobCardData.providerId)
              .get();

            if (providerDoc.exists) {
              setProviderProfile({
                id: providerDoc.id,
                ...providerDoc.data(),
              });
            }

            // Load provider location
            const providerLocationRef = database().ref(
              `providers/${jobCardData.providerId}/location`,
            );
            const snapshot = await providerLocationRef.once('value');
            if (snapshot.exists()) {
              const location = snapshot.val();
              setProviderLocation(location);
              calculateDistanceAndETA(location);
            }
          }
        }
      } else if (requestData?.providerId || requestData?.doctorId) {
        // If no job card yet but provider is assigned in consultation
        const providerId = requestData.providerId || requestData.doctorId;
        const providerDoc = await firestore()
          .collection('providers')
          .doc(providerId)
          .get();

        if (providerDoc.exists) {
          setProviderProfile({
            id: providerDoc.id,
            ...providerDoc.data(),
          });
        }
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading service data:', error);
      setLoading(false);
    }
  };

  const calculateDistanceAndETA = (providerLoc: any) => {
    if (!providerLoc || !serviceRequest?.customerAddress) return;

    const customerLoc = serviceRequest.customerAddress;
    if (customerLoc.latitude && customerLoc.longitude) {
      const distanceInfo = getDistanceToCustomer(providerLoc, {
        latitude: customerLoc.latitude,
        longitude: customerLoc.longitude,
      });
      setDistance(distanceInfo.distanceFormatted);
      setEta(distanceInfo.etaMinutes);
    }
  };

  const checkReviewStatus = async () => {
    if (jobCardId) {
      const canReview = await canCustomerReview(jobCardId);
      if (canReview) {
        setTimeout(() => {
          setShowReviewModal(true);
        }, 2000); // Show after 2 seconds
      }
    }
  };

  const handleCallProvider = () => {
    const phoneNumber = 
      providerProfile?.phoneNumber || 
      providerProfile?.phone || 
      jobCard?.providerPhone || 
      serviceRequest?.providerPhone;
    
    if (phoneNumber) {
      // Ensure phone number has + prefix for tel: links
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      Linking.openURL(`tel:${formattedPhone}`);
    } else {
      Alert.alert('Phone number not available');
    }
  };

  const handleCancelService = () => {
    Alert.alert(
      'Cancel Service?',
      'Are you sure you want to cancel this service request?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              if (jobCardId) {
                await firestore()
                  .collection('jobCards')
                  .doc(jobCardId)
                  .update({
                    status: 'cancelled',
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });
              }
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel service');
            }
          },
        },
      ],
    );
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'pending':
        return '#FF9500';
      case 'accepted':
        return '#007AFF';
      case 'in-progress':
        return '#34C759';
      case 'completed':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (statusValue: string) => {
    switch (statusValue) {
      case 'pending':
        return 'Waiting for provider...';
      case 'accepted':
        return 'Provider assigned';
      case 'in-progress':
        return 'Service in progress';
      case 'completed':
        return 'Service completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return statusValue;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const customerAddress = serviceRequest?.customerAddress || jobCard?.customerAddress;
  const provider = jobCard || serviceRequest;

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Map View */}
      {MapView ? (
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            initialRegion={{
              latitude: customerAddress?.latitude || 28.6139,
              longitude: customerAddress?.longitude || 77.209,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}>
            {/* Customer Location Marker */}
            {customerAddress?.latitude && customerAddress?.longitude && (
              <Marker
                coordinate={{
                  latitude: customerAddress.latitude,
                  longitude: customerAddress.longitude,
                }}
                title="Your Location"
                pinColor="#007AFF">
                <View style={styles.customerMarker}>
                  <Icon name="home" size={24} color="#007AFF" />
                </View>
              </Marker>
            )}

            {/* Provider Location Marker */}
            {providerLocation?.latitude &&
              providerLocation?.longitude &&
              status !== 'completed' && (
                <Marker
                  coordinate={{
                    latitude: providerLocation.latitude,
                    longitude: providerLocation.longitude,
                  }}
                  title="Provider Location"
                  pinColor="#34C759">
                  <View style={styles.providerMarker}>
                    <Icon name="person" size={24} color="#34C759" />
                  </View>
                </Marker>
              )}

            {/* Route Line */}
            {providerLocation &&
              customerAddress?.latitude &&
              customerAddress?.longitude &&
              status !== 'completed' && (
                <Polyline
                  coordinates={[
                    {
                      latitude: providerLocation.latitude,
                      longitude: providerLocation.longitude,
                    },
                    {
                      latitude: customerAddress.latitude,
                      longitude: customerAddress.longitude,
                    },
                  ]}
                  strokeColor="#007AFF"
                  strokeWidth={3}
                />
              )}
          </MapView>
        </View>
      ) : (
        <View style={[styles.mapContainer, styles.simplifiedMap]}>
          <View style={styles.mapPlaceholder}>
            <Icon name="map" size={48} color="#8E8E93" />
            <Text style={styles.mapPlaceholderText}>
              {status === 'completed'
                ? 'Service Completed'
                : providerLocation
                ? 'Provider is on the way'
                : 'Waiting for provider...'}
            </Text>
            {distance && (
              <Text style={styles.mapPlaceholderDistance}>
                {distance} away • ETA: ~{eta} min
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Status Card */}
      <View style={[styles.statusCard, {backgroundColor: theme.card}]}>
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.statusIndicator,
              {backgroundColor: getStatusColor(status)},
            ]}
          />
          <View style={styles.statusTextContainer}>
            <Text style={[styles.statusText, {color: theme.text}]}>
              {getStatusText(status)}
            </Text>
            {distance && status !== 'completed' && (
              <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                {distance} away • ETA: ~{eta} min
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Provider Details Card */}
      {(provider || providerProfile) && (
        <ScrollView
          style={styles.detailsContainer}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.card, {backgroundColor: theme.card}]}>
            <Text style={[styles.cardTitle, {color: theme.text}]}>
              Provider Details
            </Text>
            <View style={styles.providerInfo}>
              {providerProfile?.profileImage ? (
                <Image 
                  source={{uri: providerProfile.profileImage}} 
                  style={styles.providerImage}
                />
              ) : (
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerInitial}>
                    {(providerProfile?.name || provider?.providerName || 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.providerDetails}>
                <Text style={[styles.providerName, {color: theme.text}]}>
                  {providerProfile?.name || provider?.providerName || 'Provider'}
                </Text>
                <Text style={[styles.serviceType, {color: theme.textSecondary}]}>
                  {providerProfile?.specialization || providerProfile?.specialty || provider?.serviceType || serviceRequest?.serviceType || 'Service'}
                </Text>
                {(providerProfile?.rating || provider?.rating) && (
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={[styles.rating, {color: theme.text}]}>
                      {(providerProfile?.rating || provider?.rating || 0).toFixed(1)}
                    </Text>
                    {providerProfile?.totalConsultations && (
                      <Text style={[styles.reviewsCount, {color: theme.textSecondary}]}>
                        ({providerProfile.totalConsultations} reviews)
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.contactSection}>
              {(providerProfile?.phoneNumber || providerProfile?.phone) && (
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={handleCallProvider}
                  activeOpacity={0.7}>
                  <Icon name="phone" size={20} color={theme.primary} />
                  <Text style={[styles.contactValue, {color: theme.primary}]}>
                    {providerProfile.phoneNumber || providerProfile.phone}
                  </Text>
                  <Icon name="chevron-right" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
              {providerProfile?.email && (
                <View style={styles.contactRow}>
                  <Icon name="email" size={20} color={theme.textSecondary} />
                  <Text style={[styles.contactValue, {color: theme.text}]}>
                    {providerProfile.email}
                  </Text>
                </View>
              )}
            </View>

            {/* Additional Provider Info */}
            {(providerProfile?.experience || providerProfile?.address) && (
              <View style={styles.additionalInfo}>
                {providerProfile?.experience && (
                  <View style={styles.infoRow}>
                    <Icon name="work" size={18} color={theme.textSecondary} />
                    <Text style={[styles.infoText, {color: theme.text}]}>
                      {providerProfile.experience} years of experience
                    </Text>
                  </View>
                )}
                {providerProfile?.address && (
                  <View style={styles.infoRow}>
                    <Icon name="location-on" size={18} color={theme.textSecondary} />
                    <Text style={[styles.infoText, {color: theme.text}]}>
                      {typeof providerProfile.address === 'string' 
                        ? providerProfile.address 
                        : `${providerProfile.address.address || ''}${providerProfile.address.city ? `, ${providerProfile.address.city}` : ''}${providerProfile.address.pincode ? ` - ${providerProfile.address.pincode}` : ''}`}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Service Details */}
          <View style={[styles.card, {backgroundColor: theme.card}]}>
            <Text style={[styles.cardTitle, {color: theme.text}]}>
              Service Details
            </Text>
            <View style={styles.detailRow}>
              <Icon name="build" size={20} color={theme.primary} />
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                Service Type:
              </Text>
              <Text style={[styles.detailValue, {color: theme.text}]}>
                {provider.serviceType || serviceRequest?.serviceType || 'N/A'}
              </Text>
            </View>
            {serviceRequest?.problem && (
              <View style={styles.detailRow}>
                <Icon name="description" size={20} color={theme.primary} />
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  Problem:
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {serviceRequest.problem}
                </Text>
              </View>
            )}
            {customerAddress && (
              <View style={styles.detailRow}>
                <Icon name="location-on" size={20} color={theme.primary} />
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  Address:
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {customerAddress.address}
                  {customerAddress.pincode && `, ${customerAddress.pincode}`}
                </Text>
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionsContainer}>
            {status !== 'completed' && status !== 'cancelled' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, {backgroundColor: theme.primary}]}
                  onPress={handleCallProvider}>
                  <Icon name="phone" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Call Provider</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border},
                  ]}
                  onPress={handleCancelService}>
                  <Icon name="cancel" size={20} color="#FF3B30" />
                  <Text style={[styles.actionButtonText, {color: '#FF3B30'}]}>
                    Cancel Service
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {status === 'completed' && (
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: theme.primary}]}
                onPress={() => navigation.navigate('ServiceHistory')}>
                <Icon name="history" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>View History</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}

      {/* Review Modal */}
      {jobCardId && (
        <ReviewModal
          visible={showReviewModal}
          jobCardId={jobCardId}
          providerName={provider?.providerName || 'Provider'}
          serviceType={provider?.serviceType || 'Service'}
          onReviewSubmitted={() => {
            setShowReviewModal(false);
            navigation.navigate('ServiceHistory');
          }}
          onSkip={() => {
            setShowReviewModal(false);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mapContainer: {
    height: '40%',
    width: '100%',
  },
  map: {
    flex: 1,
  },
  simplifiedMap: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapPlaceholder: {
    alignItems: 'center',
  },
  mapPlaceholderText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  mapPlaceholderDistance: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '600',
  },
  customerMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  providerMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#34C759',
  },
  statusCard: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: -20,
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 14,
    marginTop: 4,
  },
  detailsContainer: {
    flex: 1,
    marginTop: 12,
  },
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  providerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  providerInitial: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  serviceType: {
    fontSize: 14,
    marginTop: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  rating: {
    fontSize: 14,
    fontWeight: '500',
  },
  reviewsCount: {
    fontSize: 12,
    marginLeft: 4,
  },
  providerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  contactSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  contactValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  additionalInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    minWidth: 100,
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  actionsContainer: {
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

