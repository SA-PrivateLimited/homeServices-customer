/**
 * Active Service Screen
 * Customer app - Real-time service tracking (Ola/Uber style)
 * Shows provider location, status updates, ETA
 */

import React, {useState, useEffect, useRef} from 'react';
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
  PermissionsAndroid,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GeolocationService from '../services/geolocationService';
// MapView is optional - will show simplified view if maps not available
let MapView: any = null;
let Marker: any = null;
let Polyline: any = null;

try {
  // Try direct import first (for older versions)
  const maps = require('react-native-maps');
  
  // Handle both default export and named exports
  if (maps.default) {
  MapView = maps.default;
    Marker = maps.default.Marker || maps.Marker;
    Polyline = maps.default.Polyline || maps.Polyline;
  } else {
    MapView = maps.MapView;
  Marker = maps.Marker;
  Polyline = maps.Polyline;
  }
  
  // Verify components are functions/components
  if (!MapView || typeof MapView !== 'function') {
    throw new Error('MapView is not a valid component');
  }
  
  console.log('✅ react-native-maps loaded successfully', {
    MapView: typeof MapView,
    Marker: typeof Marker,
    Polyline: typeof Polyline,
    MapViewExists: !!MapView,
    MarkerExists: !!Marker,
    PolylineExists: !!Polyline,
  });
} catch (e: any) {
  console.error('❌ react-native-maps not available:', e?.message || e);
  console.log('Using simplified view');
  MapView = null;
  Marker = null;
  Polyline = null;
}

// Debug: Log map components (only log once on module load)
if (typeof MapView === 'function') {
  console.log('MAP DEBUG - Components loaded:', {
    MapView: 'function',
    Marker: typeof Marker,
    Polyline: typeof Polyline,
  });
} else {
  console.log('MAP DEBUG - Components NOT loaded:', {
    MapView: MapView,
    Marker: Marker,
    Polyline: Polyline,
  });
}
import firestore from '@react-native-firebase/firestore';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {subscribeToJobCardStatus, verifyTaskCompletion} from '../services/jobCardService';
import {getDistanceToCustomer, formatDistance} from '../services/providerLocationService';
import ReviewModal from '../components/ReviewModal';
import {canCustomerReview, getJobCardReview} from '../services/reviewService';
import WebSocketService from '../services/websocketService';

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
  const [isImmediateService, setIsImmediateService] = useState<boolean>(false);
  const mapRef = useRef<any>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [distance, setDistance] = useState<string>('');
  const [eta, setEta] = useState<number>(0);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(false);
  const [customerLocation, setCustomerLocation] = useState<any>(null);

  // Request location permission and get customer location
  const requestLocationAndGetCurrentLocation = async () => {
    try {
      const permission = await GeolocationService.requestLocationPermission();
      if (permission === 'granted') {
        setLocationPermissionGranted(true);
        try {
          const location = await GeolocationService.getCurrentLocation();
          if (location) {
            const loc = {
              latitude: location.latitude,
              longitude: location.longitude,
            };
            setCustomerLocation(loc);
            console.log('✅ Customer live location obtained:', loc);
            
            // Update map region to show live location
            if (mapRef.current) {
              try {
                const coordinates = [
                  {latitude: loc.latitude, longitude: loc.longitude},
                ];
                
                // Add service address if different
                if (customerAddress?.latitude && customerAddress?.longitude) {
                  const isDifferent = 
                    Math.abs(loc.latitude - customerAddress.latitude) > 0.0001 ||
                    Math.abs(loc.longitude - customerAddress.longitude) > 0.0001;
                  if (isDifferent) {
                    coordinates.push({
                      latitude: customerAddress.latitude,
                      longitude: customerAddress.longitude,
                    });
                  }
                }
                
                // Add provider location if available
                if (providerLocation?.latitude && providerLocation?.longitude) {
                  coordinates.push({
                    latitude: providerLocation.latitude,
                    longitude: providerLocation.longitude,
                  });
                }
                
                if (coordinates.length > 1) {
                  mapRef.current.fitToCoordinates(coordinates, {
                    edgePadding: {top: 100, right: 50, bottom: 100, left: 50},
                    animated: true,
                  });
                } else {
                  // Fallback to animateToRegion
                  mapRef.current.animateToRegion({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }, 1000);
                }
              } catch (e) {
                console.error('Error updating map region:', e);
                // Fallback to animateToRegion
                try {
                  mapRef.current.animateToRegion({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }, 1000);
                } catch (e2) {
                  console.error('Error animating map:', e2);
                }
              }
            }
            
            return location;
          }
        } catch (error) {
          console.error('Error getting current location:', error);
        }
      } else {
        setLocationPermissionGranted(false);
        if (permission === 'never_ask_again') {
          Alert.alert(
            'Location Permission Required',
            'Location permission is required to show your live location on the map. Please enable it in device settings.',
            [
              {text: 'Cancel', style: 'cancel'},
              {text: 'Open Settings', onPress: () => Linking.openSettings()},
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
    }
    return null;
  };

  useEffect(() => {
    loadServiceData();
    
    // Connect to WebSocket and join customer room
    if (currentUser?.uid) {
      console.log('🔌 [CUSTOMER] Initializing WebSocket connection for customer:', {
        userId: currentUser.uid,
        serviceRequestId,
        jobCardId,
        timestamp: new Date().toISOString(),
      });
      
      // Connect first
      WebSocketService.connect();
      console.log('🔌 [CUSTOMER] WebSocket connect() called');
      
      // Function to join room (will retry if not connected)
      let retryCount = 0;
      const maxRetries = 5;
      // Ensure WebSocket is connected first
      console.log('🔌 [CUSTOMER] Initializing WebSocket connection...');
      WebSocketService.connect();
      
      const joinRoom = () => {
        retryCount++;
        const isConnected = WebSocketService.getConnectionStatus();
        const socket = WebSocketService.getSocket();
        console.log(`🔌 [CUSTOMER] Attempt ${retryCount}/${maxRetries} to join room. Connected:`, isConnected, 'Socket exists:', !!socket);
        
        if (isConnected && socket?.connected) {
          console.log('✅ [CUSTOMER] WebSocket connected, joining customer room');
          WebSocketService.joinCustomerRoom(currentUser.uid);
        } else if (retryCount < maxRetries) {
          console.log(`⏳ [CUSTOMER] WebSocket not connected yet, retrying in 1 second... (${retryCount}/${maxRetries})`);
          // Ensure connection is attempted
          if (!socket) {
            console.log('🔌 [CUSTOMER] Socket is null, calling connect()...');
            WebSocketService.connect();
          }
          setTimeout(joinRoom, 1000);
        } else {
          console.warn('⚠️ [CUSTOMER] Failed to connect WebSocket after', maxRetries, 'attempts. This is non-critical - Firestore will handle updates.');
          // Don't show error - WebSocket is optional, Firestore triggers will handle notifications
        }
      };
      
      // Wait a bit for connection, then join room
      const connectTimeout = setTimeout(joinRoom, 1000);
      
      // Also try joining when socket connects
      const socket = WebSocketService.getSocket();
      if (socket) {
        socket.once('connect', () => {
          console.log('✅ [CUSTOMER] WebSocket connected event received, joining customer room');
          WebSocketService.joinCustomerRoom(currentUser.uid);
        });
      } else {
        // Socket doesn't exist yet - connect() will create it
        console.log('🔌 [CUSTOMER] Socket is null, connect() will create it');
        // The connect() call above will create the socket
      }
      
      // Listen for service completion events
      console.log('👂 [CUSTOMER] Registering service-completed callback');
      const unsubscribe = WebSocketService.onServiceCompleted((data) => {
        console.log('📬 [CUSTOMER] Service completed callback triggered:', {
          ...data,
          timestamp: new Date().toISOString(),
        });
        console.log('📬 [CUSTOMER] Current screen state:', {
          serviceRequestId,
          jobCardId,
          jobCardIdFromState: jobCard?.id,
          status,
        });
        console.log('📬 [CUSTOMER] Received data:', {
          consultationId: data.consultationId,
          jobCardId: data.jobCardId,
        });
        
        // Check if this is the current service
        const matchesConsultation = data.consultationId === serviceRequestId;
        const matchesJobCard = data.jobCardId === jobCardId || (jobCardId && data.jobCardId === jobCard?.id);
        
        console.log('📬 [CUSTOMER] Matching results:', {
          matchesConsultation,
          matchesJobCard,
          willShowModal: matchesConsultation || matchesJobCard,
        });
        
        if (matchesConsultation || matchesJobCard) {
          console.log('✅ [CUSTOMER] Service completion matches current service, showing review modal');
          
          // Update jobCardId if we got it from WebSocket
          if (data.jobCardId && !jobCardId) {
            console.log('📝 [CUSTOMER] Setting jobCardId from WebSocket:', data.jobCardId);
            setJobCard({id: data.jobCardId});
          }
          
          // Reset dismissed state
          setReviewDismissed(false);
          
          // Show review modal after a short delay
          setTimeout(() => {
            console.log('📱 [CUSTOMER] Showing review modal NOW');
            setShowReviewModal(true);
          }, 1500);
        } else {
          console.log('⚠️ [CUSTOMER] Service completion does not match current service, ignoring');
          console.log('⚠️ [CUSTOMER] Expected consultationId:', serviceRequestId, 'Got:', data.consultationId);
          console.log('⚠️ [CUSTOMER] Expected jobCardId:', jobCardId, 'Got:', data.jobCardId);
        }
      });
      console.log('✅ [CUSTOMER] Service-completed callback registered');
      
      return () => {
        console.log('🧹 [CUSTOMER] Cleaning up WebSocket listeners');
        clearTimeout(connectTimeout);
        unsubscribe();
      };
    } else {
      console.warn('⚠️ [CUSTOMER] Cannot initialize WebSocket - no currentUser.uid');
    }
  }, [serviceRequestId, jobCardId, currentUser?.uid]);
  
  // Update customer location periodically for immediate services
  useEffect(() => {
    if (!isImmediateService) return;
    
    // Request location permission and start tracking
    requestLocationAndGetCurrentLocation();
    
    // Update location every 30 seconds for immediate services
    const locationInterval = setInterval(() => {
      requestLocationAndGetCurrentLocation();
    }, 30000);
    
    return () => clearInterval(locationInterval);
  }, [isImmediateService]);

  // Subscribe to consultation/service request updates to detect when provider accepts
  useEffect(() => {
    if (!serviceRequestId || !currentUser) return;

    // Set up real-time listener for consultation updates
    const unsubscribe = firestore()
      .collection('consultations')
      .doc(serviceRequestId)
      .onSnapshot(
        snapshot => {
          if (snapshot.exists) {
            const data = snapshot.data();
            const newStatus = data?.status || 'pending';
            const newProviderId = data?.providerId || data?.doctorId;

            // If status changed to accepted and we have a provider, reload data
            if (newStatus === 'accepted' && newProviderId && status !== 'accepted') {
              console.log('✅ Provider accepted, reloading service data...', newProviderId);
              loadServiceData();
            }

            setStatus(newStatus);
            
            if (newStatus === 'completed') {
              // Reset dismissed state when status changes to completed
              setReviewDismissed(false);
              setTimeout(() => {
                checkReviewStatus();
              }, 1000);
            }
          }
        },
        error => {
          console.error('Error listening to consultation updates:', error);
          // Handle permission errors gracefully - don't show alert, just log
          const errorCode = (error as any)?.code;
          if (errorCode === 'permission-denied' || errorCode === 'permissions-denied') {
            console.warn('Permission denied for consultation updates. User may not have access.');
            // Don't show alert here as loadServiceData will handle it
          }
        }
      );

    return () => unsubscribe();
  }, [serviceRequestId]);
    
    // Subscribe to job card status updates
  useEffect(() => {
    if (!jobCardId) return;

      const unsubscribe = subscribeToJobCardStatus(
        jobCardId,
        (newStatus, updatedAt) => {
          setStatus(newStatus);
          if (newStatus === 'completed') {
          console.log('✅ Job card status changed to completed via Realtime DB');
          // Reset dismissed state when status changes to completed
          setReviewDismissed(false);
          // Check review status immediately (fallback if WebSocket didn't work)
          console.log('🔍 Checking review status (Realtime DB fallback)');
            checkReviewStatus();
          }
        // Reload data when status changes to get updated provider info
        if (newStatus === 'accepted') {
          loadServiceData();
        }
        },
      );

      return () => unsubscribe();
  }, [jobCardId]);

  // Subscribe to provider location updates when provider is assigned
  useEffect(() => {
    const providerId = jobCard?.providerId || serviceRequest?.providerId || serviceRequest?.doctorId;
    
    if (!providerId) {
      // Clear location if no provider
      setProviderLocation(null);
      return;
    }

    console.log('Subscribing to provider location:', providerId);
      const locationRef = database().ref(`providers/${providerId}/location`);
    
      const unsubscribe = locationRef.on('value', snapshot => {
        if (snapshot.exists()) {
          const location = snapshot.val();
        console.log('Provider location updated:', location);
          setProviderLocation(location);
          calculateDistanceAndETA(location);
      } else {
        console.log('Provider location not available yet');
        setProviderLocation(null);
        }
      });

    return () => {
      console.log('Unsubscribing from provider location');
      locationRef.off('value', unsubscribe);
    };
  }, [jobCard?.providerId, serviceRequest?.providerId, serviceRequest?.doctorId]);

  const loadServiceData = async () => {
    try {
      setLoading(true);

      // Load service request
      const requestDoc = await firestore()
        .collection('consultations')
        .doc(serviceRequestId)
        .get();

      let requestData: any = null;
      if (requestDoc.exists) {
        requestData = requestDoc.data();
        
        // Verify user has permission to view this consultation
        const userId = currentUser?.uid;
        const customerId = requestData?.customerId || requestData?.patientId;
        
        if (userId && customerId !== userId) {
          // Check if user is the provider
          const providerId = requestData?.providerId || requestData?.doctorId;
          if (providerId !== userId) {
            // User is neither customer nor provider - permission denied
            console.warn('Permission denied: User does not have access to this consultation');
            Alert.alert(
              'Access Denied',
              'You do not have permission to view this service request.',
              [{text: 'OK', onPress: () => navigation.goBack()}]
            );
            setLoading(false);
            return;
          }
        }
        
        setServiceRequest({
          id: requestDoc.id,
          ...requestData,
        });
        setStatus(requestData?.status || 'pending');
        
        // Check if this is an immediate service
        const urgency = requestData?.urgency;
        const hasScheduledTime = requestData?.scheduledTime;
        const isImmediate = urgency === 'immediate' || !hasScheduledTime;
        setIsImmediateService(isImmediate);
        
        // Request location permission only for immediate services
        if (isImmediate) {
          requestLocationAndGetCurrentLocation().catch(err => {
            console.error('Error requesting location:', err);
          });
        }

        // If provider details are stored in the consultation document, use them
        if (requestData.providerId || requestData.doctorId) {
          const providerId = requestData.providerId || requestData.doctorId;
          
          // Check if provider details are already in the document
          if (requestData.providerName || requestData.providerPhone) {
            setProviderProfile({
              id: providerId,
              name: requestData.providerName,
              phoneNumber: requestData.providerPhone,
              phone: requestData.providerPhone,
              email: requestData.providerEmail,
              specialization: requestData.providerSpecialization,
              specialty: requestData.providerSpecialization,
              rating: requestData.providerRating || 0,
              profileImage: requestData.providerImage,
              address: requestData.providerAddress,
            });
          }
        }
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
          
          // Check if this is an immediate service (from job card or consultation)
          const jobCardUrgency = jobCardData?.urgency;
          const hasScheduledTime = jobCardData?.scheduledTime;
          const isImmediate = jobCardUrgency === 'immediate' || !hasScheduledTime;
          setIsImmediateService(isImmediate);
          
          // Request location permission only for immediate services
          if (isImmediate) {
            requestLocationAndGetCurrentLocation().catch(err => {
              console.error('Error requesting location:', err);
            });
          }

          // Load provider profile and location
          if (jobCardData?.providerId) {
            // Try to fetch full provider profile from providers collection
            // Fallback to doctors collection for backward compatibility
            try {
            const providerDoc = await firestore()
              .collection('providers')
              .doc(jobCardData.providerId)
              .get();

            if (providerDoc.exists) {
              setProviderProfile({
                id: providerDoc.id,
                ...providerDoc.data(),
              });
              } else {
                // Try doctors collection as fallback
                const doctorDoc = await firestore()
                  .collection('doctors')
                  .doc(jobCardData.providerId)
                  .get();

                if (doctorDoc.exists) {
                  setProviderProfile({
                    id: doctorDoc.id,
                    ...doctorDoc.data(),
                  });
                }
              }
            } catch (providerError: any) {
              // If permission denied for providers collection, try doctors collection
              if (providerError.code === 'permission-denied') {
                try {
                  const doctorDoc = await firestore()
                    .collection('doctors')
                    .doc(jobCardData.providerId)
                    .get();

                  if (doctorDoc.exists) {
                    setProviderProfile({
                      id: doctorDoc.id,
                      ...doctorDoc.data(),
                    });
                  }
                } catch (doctorError) {
                  console.warn('Could not fetch provider profile:', doctorError);
                }
              } else {
                console.warn('Error fetching provider profile:', providerError);
              }
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
      } else {
        // If no job card yet but provider is assigned in consultation
        if (requestData && (requestData.providerId || requestData.doctorId)) {
          const providerId = requestData.providerId || requestData.doctorId;
          
          // If provider details are already in the consultation document, use them
          // Otherwise, fetch from providers collection
          if (requestData.providerName || requestData.providerPhone) {
            // Provider details already stored in consultation document
            if (!providerProfile) {
              setProviderProfile({
                id: providerId,
                name: requestData.providerName,
                phoneNumber: requestData.providerPhone,
                phone: requestData.providerPhone,
                email: requestData.providerEmail,
                specialization: requestData.providerSpecialization,
                specialty: requestData.providerSpecialization,
                rating: requestData.providerRating || 0,
                profileImage: requestData.providerImage,
                address: requestData.providerAddress,
              });
            }
          } else {
            // Try to fetch full provider profile from providers collection
            // Fallback to doctors collection for backward compatibility
            try {
          const providerDoc = await firestore()
            .collection('providers')
            .doc(providerId)
            .get();

          if (providerDoc.exists) {
            setProviderProfile({
              id: providerDoc.id,
              ...providerDoc.data(),
            });
              } else {
                // Try doctors collection as fallback
                const doctorDoc = await firestore()
                  .collection('doctors')
                  .doc(providerId)
                  .get();

                if (doctorDoc.exists) {
                  setProviderProfile({
                    id: doctorDoc.id,
                    ...doctorDoc.data(),
                  });
                }
              }
            } catch (providerError: any) {
              // If permission denied for providers collection, try doctors collection
              if (providerError.code === 'permission-denied') {
                try {
                  const doctorDoc = await firestore()
                    .collection('doctors')
                    .doc(providerId)
                    .get();

                  if (doctorDoc.exists) {
                    setProviderProfile({
                      id: doctorDoc.id,
                      ...doctorDoc.data(),
                    });
                  }
                } catch (doctorError) {
                  console.warn('Could not fetch provider profile:', doctorError);
                }
              } else {
                console.warn('Error fetching provider profile:', providerError);
              }
            }
          }
        }
      }

      setLoading(false);
    } catch (error: any) {
      console.error('Error loading service data:', error);
      
      // Handle permission denied errors gracefully
      if (error.code === 'permission-denied' || error.code === 'permissions-denied') {
        Alert.alert(
          'Access Denied',
          'You do not have permission to view this service request. Please ensure you are logged in with the correct account.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      } else {
        Alert.alert(
          'Error',
          error.message || 'Failed to load service data. Please try again.',
          [{text: 'OK'}],
        );
      }
      
      setLoading(false);
    } finally {
      // Ensure loading is set to false even if there's an error (fallback timeout)
      setTimeout(() => {
        setLoading(false);
      }, 10000); // 10 second fallback timeout
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
    try {
      console.log('🔍 checkReviewStatus called:', {
        reviewDismissed,
        jobCardId,
        jobCardIdFromState: jobCard?.id,
        serviceRequestId,
        status,
        currentUserId: currentUser?.uid,
      });

      // If review was dismissed and user hasn't submitted, don't show again automatically
      // User can still access it from service history
      if (reviewDismissed) {
        console.log('⚠️ Review was dismissed, not showing again automatically');
        return;
      }

      // Try to get jobCardId from current jobCard or find it from consultation
      let currentJobCardId = jobCardId || jobCard?.id;
      
      if (!currentJobCardId && serviceRequestId) {
        console.log('🔍 No jobCardId, searching by consultationId:', serviceRequestId);
        // Try to find jobCard by consultationId
        try {
          const jobCardsSnapshot = await firestore()
            .collection('jobCards')
            .where('consultationId', '==', serviceRequestId)
            .where('customerId', '==', currentUser?.uid)
            .limit(1)
            .get();
          
          if (!jobCardsSnapshot.empty) {
            currentJobCardId = jobCardsSnapshot.docs[0].id;
            const jobCardData = jobCardsSnapshot.docs[0].data();
            console.log('✅ Found jobCard:', currentJobCardId, 'Status:', jobCardData?.status);
            setJobCard({
              id: currentJobCardId,
              ...jobCardData,
            });
          } else {
            console.log('⚠️ No jobCard found for consultationId:', serviceRequestId);
          }
        } catch (error) {
          console.error('❌ Error finding job card:', error);
        }
      }

      if (currentJobCardId) {
        console.log('🔍 Checking if customer can review jobCard:', currentJobCardId);
        const canReview = await canCustomerReview(currentJobCardId);
        console.log('📋 Can review:', canReview);
        
      if (canReview) {
          console.log('✅ Customer can review, showing modal in 2 seconds');
          // Show modal after a short delay
        setTimeout(() => {
            console.log('📱 Showing review modal from checkReviewStatus');
          setShowReviewModal(true);
          }, 2000);
        } else {
          // Check if review already exists
          const existingReview = await getJobCardReview(currentJobCardId);
          if (existingReview) {
            console.log('ℹ️ Review already exists for this job');
          } else {
            console.log('⚠️ Cannot review - job may not be completed or customer mismatch');
          }
        }
      } else if (status === 'completed' && serviceRequestId) {
        // If no jobCardId but service is completed, still try to show review
        // This handles cases where jobCard might be created later
        console.log('⚠️ Service completed but no jobCardId found yet. Will retry in 3 seconds...');
        // Retry after a delay
        setTimeout(() => {
          checkReviewStatus();
        }, 3000);
      } else {
        console.log('⚠️ Cannot check review status - missing jobCardId and serviceRequestId');
      }
    } catch (error) {
      console.error('❌ Error checking review status:', error);
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
              setLoading(true);
              
              // Cancel the consultation/service request
              if (serviceRequestId) {
                await firestore()
                  .collection('consultations')
                  .doc(serviceRequestId)
                  .update({
                    status: 'cancelled',
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });
              }
              
              // Also cancel job card if it exists
              if (jobCardId) {
                await firestore()
                  .collection('jobCards')
                  .doc(jobCardId)
                  .update({
                    status: 'cancelled',
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  });
              }
              
              Alert.alert('Success', 'Service request cancelled successfully', [
                {text: 'OK', onPress: () => navigation.goBack()},
              ]);
            } catch (error: any) {
              console.error('Error cancelling service:', error);
              Alert.alert('Error', error.message || 'Failed to cancel service. Please try again.');
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const handleVerifyCompletion = () => {
    Alert.alert(
      'Verify Task Completion',
      'Have you verified that the service has been completed to your satisfaction?',
      [
        {text: 'No', style: 'cancel'},
        {
          text: 'Yes, Verify',
          onPress: async () => {
            if (!jobCardId) {
              Alert.alert('Error', 'Job card ID not found');
              return;
            }

            try {
              setLoading(true);
              await verifyTaskCompletion(jobCardId);
              setStatus('completed');
              
              // Reload job card to get updated status
              await loadServiceData();
              
              // Show review modal after a short delay
              setTimeout(() => {
                checkReviewStatus();
              }, 1000);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to verify task completion');
            } finally {
              setLoading(false);
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
      <View style={[styles.container, {backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary, marginTop: 16}]}>
          Loading service details...
        </Text>
        {isImmediateService && !locationPermissionGranted && (
          <TouchableOpacity
            style={[styles.requestLocationButton, {backgroundColor: theme.primary, marginTop: 20}]}
            onPress={requestLocationAndGetCurrentLocation}>
            <Icon name="location-on" size={20} color="#fff" />
            <Text style={styles.requestLocationText}>Request Location Access</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const customerAddress = serviceRequest?.customerAddress || jobCard?.customerAddress;
  const provider = jobCard || serviceRequest;

  // Debug logging
  console.log('🗺️ Map rendering check:', {
    hasMapView: !!MapView,
    hasMarker: !!Marker,
    hasPolyline: !!Polyline,
    customerAddress: customerAddress ? {
      lat: customerAddress.latitude,
      lng: customerAddress.longitude,
    } : null,
    providerLocation: providerLocation ? {
      lat: providerLocation.latitude,
      lng: providerLocation.longitude,
    } : null,
    status,
    isImmediateService,
  });

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Map View - Always show map for instant services */}
      {MapView && Marker && Polyline ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider="google"
            initialRegion={
              customerLocation?.latitude && customerLocation?.longitude
                ? {
                    latitude: customerLocation.latitude,
                    longitude: customerLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }
                : customerAddress?.latitude && customerAddress?.longitude
                ? {
                    latitude: customerAddress.latitude,
                    longitude: customerAddress.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }
                : providerLocation?.latitude && providerLocation?.longitude
                ? {
                    latitude: providerLocation.latitude,
                    longitude: providerLocation.longitude,
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                  }
                : {
                    latitude: 28.6139,
                    longitude: 77.209,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                  }
            }
            showsUserLocation={locationPermissionGranted && isImmediateService}
            showsMyLocationButton={locationPermissionGranted && isImmediateService}
            mapType="standard"
            loadingEnabled={false}
            loadingIndicatorColor={theme.primary}
            loadingBackgroundColor={theme.background}
            onMapReady={() => {
              console.log('✅ Map is ready');
              console.log('📍 Map data:', {
                customerAddress: customerAddress ? {lat: customerAddress.latitude, lng: customerAddress.longitude} : null,
                customerLocation: customerLocation ? {lat: customerLocation.latitude, lng: customerLocation.longitude} : null,
                providerLocation: providerLocation ? {lat: providerLocation.latitude, lng: providerLocation.longitude} : null,
              });
              
              // Fit map to show both customer and provider locations if available
              if (mapRef.current) {
                const locations: Array<{latitude: number; longitude: number}> = [];
                
                // Add customer address (service location)
                if (customerAddress?.latitude && customerAddress?.longitude) {
                  locations.push({
                    latitude: customerAddress.latitude,
                    longitude: customerAddress.longitude,
                  });
                  console.log('📍 Added customer address to map:', customerAddress.latitude, customerAddress.longitude);
                }
                
                // Add live customer location if available
                if (customerLocation?.latitude && customerLocation?.longitude) {
                  locations.push({
                    latitude: customerLocation.latitude,
                    longitude: customerLocation.longitude,
                  });
                  console.log('📍 Added customer live location to map:', customerLocation.latitude, customerLocation.longitude);
                }
                
                // Add provider location if available
                if (providerLocation?.latitude && providerLocation?.longitude) {
                  locations.push({
                    latitude: providerLocation.latitude,
                    longitude: providerLocation.longitude,
                  });
                  console.log('📍 Added provider location to map:', providerLocation.latitude, providerLocation.longitude);
                }
                
                if (locations.length > 0) {
                  console.log('🗺️ Fitting map to', locations.length, 'locations');
                  try {
                    mapRef.current.fitToCoordinates(locations, {
                      edgePadding: {top: 100, right: 50, bottom: 100, left: 50},
                      animated: true,
                    });
                    console.log('✅ Map fitted to coordinates');
                  } catch (e) {
                    console.error('❌ Error fitting map to coordinates:', e);
                    // Fallback to customer address or first location
                    const fallbackLoc = locations[0];
                    if (fallbackLoc) {
                      console.log('📍 Falling back to animateToRegion:', fallbackLoc);
                      mapRef.current.animateToRegion({
                        latitude: fallbackLoc.latitude,
                        longitude: fallbackLoc.longitude,
                        latitudeDelta: 0.05,
                        longitudeDelta: 0.05,
                      }, 1000);
                    }
                  }
                } else {
                  console.warn('⚠️ No locations available to show on map');
                }
              }
            }}
            onError={(error: any) => {
              console.error('❌ Map error:', error);
            }}>
            {/* Service Address Marker - Show service location */}
            {customerAddress?.latitude && customerAddress?.longitude && (
              <Marker
                coordinate={{
                  latitude: customerAddress.latitude,
                  longitude: customerAddress.longitude,
                }}
                title="Service Location"
                description="Service address"
                pinColor="#007AFF">
                <View style={styles.customerMarker}>
                  <Icon name="home" size={24} color="#007AFF" />
                </View>
              </Marker>
            )}

            {/* Live Customer Location Marker - Show if available for immediate services */}
            {isImmediateService && customerLocation?.latitude && customerLocation?.longitude && (
              <Marker
                coordinate={{
                  latitude: customerLocation.latitude,
                  longitude: customerLocation.longitude,
                }}
                title="Your Current Location"
                description="Live location"
                pinColor="#FF9500">
                <View style={styles.liveLocationMarker}>
                  <Icon name="my-location" size={20} color="#FF9500" />
                </View>
              </Marker>
            )}

            {/* Provider Location Marker - Show when provider is assigned (especially for immediate services) */}
            {providerLocation?.latitude &&
              providerLocation?.longitude &&
              status !== 'completed' &&
              status !== 'cancelled' &&
              (status === 'accepted' || status === 'in-progress' || isImmediateService) && (
                <Marker
                  coordinate={{
                    latitude: providerLocation.latitude,
                    longitude: providerLocation.longitude,
                  }}
                  title="Provider Location"
                  description={`Provider is ${distance || 'on the way'}`}
                  pinColor="#34C759">
                  <View style={styles.providerMarker}>
                    <Icon name="person" size={24} color="#34C759" />
                  </View>
                </Marker>
              )}

            {/* Route Line - Show route when provider location is available (especially for immediate services) */}
            {providerLocation &&
              customerAddress?.latitude &&
              customerAddress?.longitude &&
              status !== 'completed' &&
              status !== 'cancelled' &&
              (status === 'accepted' || status === 'in-progress' || isImmediateService) && (
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
            <View style={styles.statusRow}>
            <Text style={[styles.statusText, {color: theme.text}]}>
              {getStatusText(status)}
            </Text>
              {/* Service Type Chip */}
              <View
                style={[
                  styles.serviceTypeChip,
                  {
                    backgroundColor: isImmediateService
                      ? '#FF9500' + '20'
                      : '#007AFF' + '20',
                  },
                ]}>
                <Text
                  style={[
                    styles.serviceTypeChipText,
                    {
                      color: isImmediateService ? '#FF9500' : '#007AFF',
                    },
                  ]}>
                  {isImmediateService ? 'Immediate' : 'Scheduled'}
                </Text>
              </View>
            </View>
            {status === 'accepted' && providerLocation && distance && (
              <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                Provider is {distance} away • ETA: ~{eta} min
              </Text>
            )}
            {status === 'accepted' && !providerLocation && (
              <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                Provider location will appear here
              </Text>
            )}
            {status === 'in-progress' && (
              <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                Service in progress
              </Text>
            )}
            {status === 'pending' && (
              <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                Waiting for provider to accept
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Provider Details Card */}
      {(providerProfile || provider || jobCard?.providerId || serviceRequest?.providerId || serviceRequest?.doctorId) && (
        <ScrollView
          style={styles.detailsContainer}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.card, {backgroundColor: theme.card}]}>
            <Text style={[styles.cardTitle, {color: theme.text}]}>
              Provider Details
            </Text>
            <View style={styles.providerInfo}>
              {(providerProfile?.profileImage || serviceRequest?.providerImage) ? (
                <Image 
                  source={{uri: providerProfile?.profileImage || serviceRequest?.providerImage}} 
                  style={styles.providerImage}
                />
              ) : (
                <View style={styles.providerAvatar}>
                  <Text style={styles.providerInitial}>
                    {(providerProfile?.name || serviceRequest?.providerName || provider?.providerName || 'P').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.providerDetails}>
                <Text style={[styles.providerName, {color: theme.text}]}>
                  {providerProfile?.name || serviceRequest?.providerName || jobCard?.providerName || provider?.providerName || 'Provider'}
                </Text>
                <Text style={[styles.serviceType, {color: theme.textSecondary}]}>
                  {providerProfile?.specialization || providerProfile?.specialty || serviceRequest?.providerSpecialization || jobCard?.serviceType || provider?.serviceType || serviceRequest?.serviceType || 'Service'}
                </Text>
                {(providerProfile?.rating || serviceRequest?.providerRating || provider?.rating) && (
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={[styles.rating, {color: theme.text}]}>
                      {(providerProfile?.rating || serviceRequest?.providerRating || provider?.rating || 0).toFixed(1)}
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
            {(providerProfile?.phoneNumber || providerProfile?.phone || serviceRequest?.providerPhone || jobCard?.providerPhone) && (
              <View style={styles.contactSection}>
                <TouchableOpacity
                  style={styles.contactRow}
                  onPress={handleCallProvider}
                  activeOpacity={0.7}>
                  <Icon name="phone" size={20} color={theme.primary} />
                  <Text style={[styles.contactValue, {color: theme.primary}]}>
                    {providerProfile?.phoneNumber || providerProfile?.phone || serviceRequest?.providerPhone || jobCard?.providerPhone || 'N/A'}
                  </Text>
                  <Icon name="chevron-right" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
                {(providerProfile?.email || serviceRequest?.providerEmail) && (
                  <View style={styles.contactRow}>
                    <Icon name="email" size={20} color={theme.textSecondary} />
                    <Text style={[styles.contactValue, {color: theme.text}]}>
                      {providerProfile.email}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Additional Provider Info */}
            {(providerProfile?.experience || providerProfile?.address || jobCard?.providerAddress) && (
              <View style={styles.additionalInfo}>
                {providerProfile?.experience && (
                  <View style={styles.infoRow}>
                    <Icon name="work" size={18} color={theme.textSecondary} />
                    <Text style={[styles.infoText, {color: theme.text}]}>
                      {providerProfile.experience} years of experience
                    </Text>
                  </View>
                )}
                {(providerProfile?.address || jobCard?.providerAddress) && (
                  <View style={styles.infoRow}>
                    <Icon name="location-on" size={18} color={theme.textSecondary} />
                    <Text style={[styles.infoText, {color: theme.text}]}>
                      {providerProfile?.address 
                        ? (typeof providerProfile.address === 'string' 
                            ? providerProfile.address 
                            : `${providerProfile.address.address || ''}${providerProfile.address.city ? `, ${providerProfile.address.city}` : ''}${providerProfile.address.pincode ? ` - ${providerProfile.address.pincode}` : ''}`)
                        : (jobCard?.providerAddress 
                            ? (typeof jobCard.providerAddress === 'string' 
                                ? jobCard.providerAddress 
                                : `${jobCard.providerAddress.address || ''}${jobCard.providerAddress.city ? `, ${jobCard.providerAddress.city}` : ''}${jobCard.providerAddress.pincode ? ` - ${jobCard.providerAddress.pincode}` : ''}`)
                            : 'Address not available')}
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
            {status === 'in-progress' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, {backgroundColor: '#34C759'}]}
                  onPress={handleVerifyCompletion}>
                  <Icon name="check-circle" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Verify Task Completed</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, {backgroundColor: theme.primary}]}
                  onPress={handleCallProvider}>
                  <Icon name="phone" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Call Provider</Text>
                </TouchableOpacity>
              </>
            )}

            {status === 'pending' && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {backgroundColor: theme.error},
                ]}
                onPress={handleCancelService}
                disabled={loading}>
                <Icon name="cancel" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Cancel Service</Text>
              </TouchableOpacity>
            )}

            {status === 'accepted' && (
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
                    {backgroundColor: theme.error},
                  ]}
                  onPress={handleCancelService}
                  disabled={loading}>
                  <Icon name="cancel" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Cancel Service</Text>
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
      {(jobCardId || jobCard?.id) && (
        <ReviewModal
          visible={showReviewModal && status === 'completed'}
          jobCardId={jobCardId || jobCard?.id}
          providerName={providerProfile?.name || jobCard?.providerName || serviceRequest?.providerName || 'Provider'}
          serviceType={providerProfile?.specialization || providerProfile?.specialty || jobCard?.serviceType || serviceRequest?.serviceType || 'Service'}
          onReviewSubmitted={() => {
            setShowReviewModal(false);
            setReviewDismissed(false); // Reset dismissed state
            // Reload data to show updated status
            loadServiceData();
            Alert.alert(
              'Thank You!',
              'Your review has been submitted successfully.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Optionally navigate to service history
                    // navigation.navigate('ServiceHistory');
                  },
                },
              ],
            );
          }}
          onSkip={() => {
            setShowReviewModal(false);
            setReviewDismissed(true); // Mark as dismissed so it won't show again automatically
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
  loadingText: {
    fontSize: 16,
    textAlign: 'center',
  },
  requestLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginHorizontal: 20,
    gap: 8,
  },
  requestLocationText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  mapContainer: {
    height: '40%',
    width: '100%',
    backgroundColor: '#E5E5E5',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  liveLocationMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    borderWidth: 2,
    borderColor: '#FF9500',
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  serviceTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  serviceTypeChipText: {
    fontSize: 12,
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

