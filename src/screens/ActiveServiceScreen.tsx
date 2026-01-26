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

  console.log('✅ react-native-maps loaded successfully');
} catch (e: any) {
  console.log('Using simplified distance view - maps not available');
  MapView = null;
  Marker = null;
  Polyline = null;
}
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {subscribeToJobCardStatus, verifyTaskCompletion, cancelTaskWithReason, getJobCardById} from '../services/jobCardService';
import {jobCardsApi} from '../services/api/jobCardsApi';
import {serviceRequestsApi} from '../services/api/serviceRequestsApi';
import CancelTaskModal from '../components/CancelTaskModal';
import {getDistanceToCustomer, formatDistance} from '../services/providerLocationService';
import ReviewModal from '../components/ReviewModal';
import ConfirmationModal from '../components/ConfirmationModal';
import AlertModal from '../components/AlertModal';
import {canCustomerReview, getJobCardReview} from '../services/reviewService';
import {providersApi, Provider} from '../services/api/providersApi';
import WebSocketService from '../services/websocketService';
import useTranslation from '../hooks/useTranslation';

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
  const {t} = useTranslation();

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
  const [requestCreatedAt, setRequestCreatedAt] = useState<Date | null>(null);
  const [canReRequest, setCanReRequest] = useState<boolean>(false);
  const [showReRequestModal, setShowReRequestModal] = useState(false);
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);

  // Modal states
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCancelReasonModal, setShowCancelReasonModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertModalConfig, setAlertModalConfig] = useState<{
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  } | null>(null);

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
          setAlertModalConfig({
            title: t('activeService.locationPermissionRequired'),
            message: t('activeService.locationPermissionMessage'),
            type: 'warning',
          });
          setShowAlertModal(true);
          // Note: User can open settings manually if needed
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
      
      // Register callback FIRST before connecting
      // This ensures the listener is set up with the callback when connection is established
      console.log('👂 [CUSTOMER] Registering service-completed callback BEFORE connecting');
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
      
      // NOW connect after callback is registered
      console.log('🔌 [CUSTOMER] WebSocket connect() called after callback registration');
      WebSocketService.connect();
      
      // Function to join room (will retry if not connected)
      let retryCount = 0;
      const maxRetries = 5;
      console.log('🔌 [CUSTOMER] Initializing WebSocket connection...');
      
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
          console.warn('⚠️ [CUSTOMER] Failed to connect WebSocket after', maxRetries, 'attempts. This is non-critical - API polling will handle updates.');
          // Don't show error - WebSocket is optional, API polling will handle notifications
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
      }
      
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

  // Poll for service request updates to detect when provider accepts
  useEffect(() => {
    if (!serviceRequestId || !currentUser) return;

    // Poll every 5 seconds for status updates
    const pollInterval = setInterval(async () => {
      try {
        const request = await serviceRequestsApi.getById(serviceRequestId);
        if (request) {
          const newStatus = request.status || 'pending';
          const newProviderId = request.providerId;

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
      } catch (error) {
        console.error('Error polling service request updates:', error);
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [serviceRequestId, status]);
    
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
        // Reload data when status changes to get updated provider info or PIN
        if (newStatus === 'accepted' || newStatus === 'in-progress') {
          console.log(`🔄 Status changed to ${newStatus}, reloading service data to get updated info (including PIN if started)...`);
          loadServiceData();
        }
        },
      );

      return () => unsubscribe();
  }, [jobCardId]);

  // Subscribe to provider location updates when provider is assigned
  // Initial fetch from backend API, then subscribe to Firebase Realtime DB for real-time updates
  useEffect(() => {
    const providerId = jobCard?.providerId || serviceRequest?.providerId;
    
    if (!providerId) {
      // Clear location if no provider
      setProviderLocation(null);
      return;
    }

    console.log('Setting up provider location tracking for:', providerId);
    
    // Initial fetch from backend API (which reads from Firebase Realtime DB)
    const fetchInitialLocation = async () => {
      try {
        const provider = await providersApi.getById(providerId);
        if (provider) {
          // Backend returns location in currentLocation field (from Firebase Realtime DB)
          const locationData = (provider as any).currentLocation || provider.location;
          if (locationData && locationData.latitude && locationData.longitude) {
            const location = {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              address: locationData.address || provider.location?.address,
              city: locationData.city || provider.location?.city,
              state: locationData.state || provider.location?.state,
              pincode: locationData.pincode || provider.location?.pincode,
              updatedAt: locationData.updatedAt || Date.now(),
            };
            console.log('Provider location fetched from backend API (via Firebase Realtime DB):', location);
            setProviderLocation(location);
            calculateDistanceAndETA(location);
          }
        }
      } catch (error) {
        console.error('Error fetching initial provider location from backend API:', error);
      }
    };

    // Fetch initial location from backend
    fetchInitialLocation();

    // Subscribe to Firebase Realtime Database for real-time updates
    // Location is stored in Firebase Realtime DB, so we subscribe directly for efficiency
    const locationRef = database().ref(`providers/${providerId}/location`);
    
    const unsubscribe = locationRef.on('value', snapshot => {
      if (snapshot.exists()) {
        const location = snapshot.val();
        console.log('Provider location updated from Firebase Realtime DB:', location);
        setProviderLocation(location);
        calculateDistanceAndETA(location);
      } else {
        console.log('Provider location not available in Firebase Realtime DB');
      }
    });

    return () => {
      console.log('Unsubscribing from provider location');
      locationRef.off('value', unsubscribe);
    };
  }, [jobCard?.providerId, serviceRequest?.providerId]);

  // Check if re-request is allowed (10 minutes after creation and status is pending)
  useEffect(() => {
    const checkCanReRequest = () => {
      // Only allow re-request if status is pending
      if (status !== 'pending') {
        setCanReRequest(false);
        return;
      }

      // Check if request creation time is available
      if (!requestCreatedAt) {
        setCanReRequest(false);
        return;
      }

      // Calculate time difference in milliseconds
      const now = new Date();
      const createdAt = requestCreatedAt instanceof Date 
        ? requestCreatedAt 
        : new Date(requestCreatedAt);
      const timeDiff = now.getTime() - createdAt.getTime();
      
      // 10 minutes = 10 * 60 * 1000 milliseconds
      const tenMinutesInMs = 10 * 60 * 1000;
      
      // Allow re-request only if 10 minutes have passed
      setCanReRequest(timeDiff >= tenMinutesInMs);
    };

    checkCanReRequest();

    // Check every minute to update the re-request button availability
    const interval = setInterval(checkCanReRequest, 60000); // Check every 60 seconds

    return () => clearInterval(interval);
  }, [status, requestCreatedAt]);

  // Fetch available providers when status is pending
  useEffect(() => {
    const fetchAvailableProviders = async () => {
      if (status === 'pending' && serviceRequest?.serviceType) {
        try {
          setLoadingProviders(true);
          console.log('Fetching available providers for service type:', serviceRequest.serviceType);
          const providers = await providersApi.getAll({
            serviceType: serviceRequest.serviceType,
            isOnline: true, // Only fetch online providers
            limit: 10
          });
          
          // Fetch full provider details including phone numbers for each provider
          const providersWithDetails = await Promise.all(
            providers.map(async (provider) => {
              try {
                // Get full provider details to ensure we have phone number
                const fullProvider = await providersApi.getById(provider._id || provider.id || '');
                if (fullProvider) {
                  return {
                    ...provider,
                    phoneNumber: fullProvider.phoneNumber || fullProvider.phone || (fullProvider as any)?.primaryPhone || (fullProvider as any)?.mobile || provider.phoneNumber || provider.phone,
                    phone: fullProvider.phoneNumber || fullProvider.phone || (fullProvider as any)?.primaryPhone || (fullProvider as any)?.mobile || provider.phone || provider.phoneNumber,
                  };
                }
                return provider;
              } catch (error) {
                console.warn('Failed to fetch full details for provider:', provider._id || provider.id, error);
                return provider;
              }
            })
          );
          
          setAvailableProviders(providersWithDetails);
          console.log('Available providers fetched with details:', providersWithDetails.length);
          providersWithDetails.forEach(p => {
            console.log('Provider:', p.name, 'Phone:', p.phoneNumber || p.phone);
          });
        } catch (error) {
          console.error('Error fetching available providers:', error);
          setAvailableProviders([]);
        } finally {
          setLoadingProviders(false);
        }
      } else if (status !== 'pending') {
        // Clear providers list when status changes from pending
        setAvailableProviders([]);
      }
    };

    fetchAvailableProviders();
  }, [status, serviceRequest?.serviceType]);

  const loadServiceData = async () => {
    try {
      setLoading(true);

      // Load service request from API
      const requestData = await serviceRequestsApi.getById(serviceRequestId);

      if (requestData) {
        // Verify user has permission to view this consultation
        const userId = currentUser?.uid;
        const customerId = requestData?.customerId;
        
        if (userId && customerId !== userId) {
          // Check if user is the provider
          const providerId = requestData?.providerId;
          if (providerId !== userId) {
            // User is neither customer nor provider - permission denied
            console.warn('Permission denied: User does not have access to this consultation');
            setAlertModalConfig({
              title: t('activeService.accessDenied'),
              message: t('activeService.accessDeniedMessage'),
              type: 'error',
            });
            setShowAlertModal(true);
            setLoading(false);
            return;
          }
        }
        
        setServiceRequest({
          id: requestData._id || requestData.id,
          ...requestData,
        });
        setStatus(requestData?.status || 'pending');
        
        // Track when the request was created for re-request feature
        if (requestData?.createdAt) {
          const createdAt = requestData.createdAt instanceof Date 
            ? requestData.createdAt 
            : new Date(requestData.createdAt);
          setRequestCreatedAt(createdAt);
        }
        
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

        // If provider details are stored in the service request document, use them
        if (requestData.providerId) {
          // Check if provider details are already in the document
          if (requestData.providerName || requestData.providerPhone) {
            setProviderProfile({
              id: requestData.providerId,
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
          } else {
            // Fetch provider profile from API
            try {
              const provider = await providersApi.getById(requestData.providerId);
              if (provider) {
                setProviderProfile({
                  id: provider._id || provider.id,
                  ...provider,
                });
              }
            } catch (providerError) {
              console.warn('Could not fetch provider profile:', providerError);
            }
          }
        }
      }

      // Load job card if ID provided
      if (jobCardId) {
        const jobCardData = await jobCardsApi.getById(jobCardId);

        if (jobCardData) {
          const jobCardWithPIN = {
            id: jobCardData._id || jobCardData.id,
            ...jobCardData,
            createdAt: jobCardData.createdAt instanceof Date 
              ? jobCardData.createdAt 
              : new Date(jobCardData.createdAt),
            updatedAt: jobCardData.updatedAt instanceof Date 
              ? jobCardData.updatedAt 
              : new Date(jobCardData.updatedAt),
            scheduledTime: jobCardData.scheduledTime 
              ? (jobCardData.scheduledTime instanceof Date 
                  ? jobCardData.scheduledTime 
                  : new Date(jobCardData.scheduledTime))
              : undefined,
            pinGeneratedAt: jobCardData.pinGeneratedAt 
              ? (jobCardData.pinGeneratedAt instanceof Date 
                  ? jobCardData.pinGeneratedAt 
                  : new Date(jobCardData.pinGeneratedAt))
              : undefined,
            taskPIN: jobCardData.taskPIN,
          };
          setJobCard(jobCardWithPIN);
          setStatus(jobCardData?.status || 'pending');
          
          // Log PIN if available
          if (jobCardData?.taskPIN) {
            console.log('🔐 Customer PIN loaded:', jobCardData.taskPIN);
          }
          
          // Check if this is an immediate service (from job card or consultation)
          const hasScheduledTime = jobCardData?.scheduledTime;
          const isImmediate = !hasScheduledTime;
          setIsImmediateService(isImmediate);
          
          // Request location permission only for immediate services
          if (isImmediate) {
            requestLocationAndGetCurrentLocation().catch(err => {
              console.error('Error requesting location:', err);
            });
          }

          // Load provider profile and location
          if (jobCardData?.providerId) {
            // Fetch provider profile from API (backend will get location from Firebase Realtime DB)
            try {
              const provider = await providersApi.getById(jobCardData.providerId);
              if (provider) {
                setProviderProfile({
                  id: provider._id || provider.id,
                  ...provider,
                });

                // Get provider location from backend API (backend reads from Firebase Realtime DB)
                // Backend returns location in currentLocation field
                const locationData = (provider as any).currentLocation || provider.location;
                if (locationData && locationData.latitude && locationData.longitude) {
                  const location = {
                    latitude: locationData.latitude,
                    longitude: locationData.longitude,
                    address: locationData.address || provider.location?.address,
                    city: locationData.city || provider.location?.city,
                    state: locationData.state || provider.location?.state,
                    pincode: locationData.pincode || provider.location?.pincode,
                    updatedAt: locationData.updatedAt || Date.now(),
                  };
                  console.log('Provider location loaded from backend API (via Firebase Realtime DB):', location);
                  setProviderLocation(location);
                  calculateDistanceAndETA(location);
                } else {
                  console.log('Provider location not available from backend API');
                }
              }
            } catch (providerError) {
              console.warn('Could not fetch provider profile:', providerError);
            }
          }
        }
      } else if (requestData?.providerId) {
        // If no job card yet but provider is assigned in service request
        // If provider details are already in the service request document, use them
        if (requestData.providerName || requestData.providerPhone) {
          // Provider details already stored in service request document
          if (!providerProfile) {
            setProviderProfile({
              id: requestData.providerId,
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
          // Fetch provider profile from API
          try {
            const provider = await providersApi.getById(requestData.providerId);
            if (provider) {
              setProviderProfile({
                id: provider._id || provider.id,
                ...provider,
              });
            }
          } catch (providerError) {
            console.warn('Could not fetch provider profile:', providerError);
          }
        }
      }

      setLoading(false);
    } catch (error: any) {
      const errorMessage = error?.message || String(error || 'Unknown error');
      console.error('Error loading service data:', errorMessage);
      
      setAlertModalConfig({
        title: t('common.error'),
        message: errorMessage || t('errors.generic'),
        type: 'error',
      });
      setShowAlertModal(true);
      
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
        // Try to find jobCard by consultationId using API
        try {
          const jobCards = await jobCardsApi.getAll({
            customerId: currentUser?.uid,
            limit: 10,
          });
          
          const matchingJobCard = jobCards.find(
            (jc: any) => jc.consultationId === serviceRequestId || jc._id === serviceRequestId || jc.id === serviceRequestId
          );
          
          if (matchingJobCard) {
            currentJobCardId = matchingJobCard._id || matchingJobCard.id;
            console.log('✅ Found jobCard:', currentJobCardId, 'Status:', matchingJobCard?.status);
            setJobCard({
              id: currentJobCardId,
              ...matchingJobCard,
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
      setAlertModalConfig({
        title: t('activeService.phoneNotAvailable'),
        message: t('activeService.phoneNotAvailableMessage'),
        type: 'info',
      });
      setShowAlertModal(true);
    }
  };

  const handleCancelService = () => {
    setShowCancelReasonModal(true);
  };

  const handleReRequest = () => {
    setShowReRequestModal(true);
  };

  const confirmReRequest = async () => {
    try {
      setLoading(true);
      setShowReRequestModal(false);

      if (!serviceRequest) {
        setAlertModalConfig({
          title: t('common.error'),
          message: t('activeService.serviceRequestNotFound'),
          type: 'error',
        });
        setShowAlertModal(true);
        setLoading(false);
        return;
      }

      // Create a new service request with the same data
      const authUser = auth().currentUser;
      if (!authUser) {
        setAlertModalConfig({
          title: t('common.error'),
          message: t('activeService.pleaseLoginToReRequest'),
          type: 'error',
        });
        setShowAlertModal(true);
        setLoading(false);
        return;
      }

      // Cancel the old request first
      try {
        await serviceRequestsApi.cancel(
          serviceRequestId,
          'Re-requested by customer after 10 minutes'
        );
      } catch (error) {
        console.warn('Could not cancel old request:', error);
        // Continue anyway
      }

      // Create new service request
      const newServiceRequestData: any = {
        customerId: authUser.uid,
        customerName: serviceRequest.customerName || (currentUser as any)?.name || 'Customer',
        customerPhone: serviceRequest.customerPhone || (currentUser as any)?.phone || '',
        customerAddress: serviceRequest.customerAddress,
        serviceType: serviceRequest.serviceType,
        problem: serviceRequest.problem || '',
        status: 'pending',
        urgency: serviceRequest.urgency || 'immediate',
        questionnaireAnswers: serviceRequest.questionnaireAnswers || undefined,
      };

      if (serviceRequest.scheduledTime) {
        const scheduledTime = serviceRequest.scheduledTime instanceof Date 
          ? serviceRequest.scheduledTime 
          : new Date(serviceRequest.scheduledTime);
        newServiceRequestData.scheduledTime = scheduledTime.toISOString();
      }

      if (serviceRequest.photos && serviceRequest.photos.length > 0) {
        newServiceRequestData.photos = serviceRequest.photos;
      }

      // Create service request in Firestore (PRIMARY) - ensures provider can always find it
      const firestoreData = {
        ...newServiceRequestData,
        customerId: currentUser?.uid || '',
        status: 'pending',
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // Create document with auto-generated ID
      const docRef = await firestore()
        .collection('serviceRequests')
        .add(firestoreData);

      const newServiceRequestId = docRef.id;
      console.log('✅ Service request created in Firestore:', newServiceRequestId);

      // Also try to sync to MongoDB (optional, for backend consistency)
      try {
        await serviceRequestsApi.create({
          ...newServiceRequestData,
          _id: newServiceRequestId, // Use Firestore ID
          consultationId: newServiceRequestId,
        });
        console.log('✅ Service request also synced to MongoDB:', newServiceRequestId);
      } catch (apiError: any) {
        // MongoDB sync is optional - Firestore is primary
        console.warn('⚠️ MongoDB sync failed (service request is in Firestore):', apiError.message);
      }

      // Notify providers via WebSocket
      try {
        // Get online providers from API
        const onlineProviders = await providersApi.getAll({
          serviceType: serviceRequest.serviceType,
          isOnline: true,
          limit: 50,
        });

        const allProviderIds = onlineProviders
          .filter(p => p.approvalStatus === 'approved')
          .map(p => p._id || p.id)
          .filter((id): id is string => !!id);

        const notificationPromises = allProviderIds.map(providerId => {
          return WebSocketService.emitNewBooking(providerId, {
            consultationId: newServiceRequestId,
            id: newServiceRequestId,
            bookingId: newServiceRequestId,
            customerName: newServiceRequestData.customerName,
            patientName: newServiceRequestData.customerName,
            customerPhone: newServiceRequestData.customerPhone,
            patientPhone: newServiceRequestData.customerPhone,
            customerAddress: newServiceRequestData.customerAddress,
            patientAddress: newServiceRequestData.customerAddress,
            serviceType: serviceRequest.serviceType,
            problem: serviceRequest.problem || '',
            scheduledTime: serviceRequest.scheduledTime 
              ? (serviceRequest.scheduledTime instanceof Date 
                  ? serviceRequest.scheduledTime 
                  : new Date(serviceRequest.scheduledTime))
              : new Date(),
            consultationFee: 0,
            questionnaireAnswers: newServiceRequestData.questionnaireAnswers || undefined,
          }).catch(error => {
            console.error(`Failed to notify provider ${providerId}:`, error);
          });
        });

        await Promise.all(notificationPromises);
      } catch (websocketError) {
        console.error('Error notifying providers via WebSocket:', websocketError);
      }

      // Update the current screen with new request ID
      setAlertModalConfig({
        title: t('common.success'),
        message: t('activeService.serviceReRequestedSuccess'),
        type: 'success',
      });
      setShowAlertModal(true);
      
      // Reload with new service request ID
      setTimeout(() => {
        navigation.replace('ActiveService', {
          serviceRequestId: newServiceRequestId,
        });
      }, 2000);
    } catch (error: any) {
      const errorMessage = error?.message || String(error || 'Unknown error');
      setAlertModalConfig({
        title: t('common.error'),
        message: errorMessage || t('activeService.failedToReRequest'),
        type: 'error',
      });
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelWithReason = async (reason: string) => {
    try {
      setLoading(true);
      setShowCancelReasonModal(false);
      
      let cancelled = false;
      
      // Cancel job card if it exists (this will notify provider)
      if (jobCardId) {
        try {
          await cancelTaskWithReason(jobCardId, reason);
          cancelled = true;
        } catch (error: any) {
          console.error('Error cancelling job card:', error);
          // Continue to try consultation cancellation
        }
      }
      
      // Also cancel the consultation/service request if it exists
      if (serviceRequestId) {
        try {
          await serviceRequestsApi.cancel(serviceRequestId, reason.trim());
          cancelled = true;
        } catch (error: any) {
          console.error('Error cancelling service request:', error);
        }
      }
      
      if (cancelled) {
        setAlertModalConfig({
          title: t('common.success'),
          message: t('activeService.serviceCancelledSuccess'),
          type: 'success',
        });
        setShowAlertModal(true);
      } else {
        // If neither document exists, show a different message
        setAlertModalConfig({
          title: t('common.info'),
          message: t('activeService.serviceRequestNotFoundInfo'),
          type: 'info',
        });
        setShowAlertModal(true);
      }
    } catch (error: any) {
      console.error('Error cancelling service:', error);
      setAlertModalConfig({
        title: t('common.error'),
        message: error.message || t('activeService.failedToCancelService'),
        type: 'error',
      });
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCompletion = () => {
    setShowVerifyModal(true);
  };

  const confirmVerifyCompletion = async () => {
    setShowVerifyModal(false);
    if (!jobCardId) {
      setAlertModalConfig({
        title: t('common.error'),
        message: t('activeService.jobCardIdNotFound'),
        type: 'error',
      });
      setShowAlertModal(true);
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
      setAlertModalConfig({
        title: t('common.error'),
        message: error.message || t('activeService.failedToVerifyCompletion'),
        type: 'error',
      });
      setShowAlertModal(true);
    } finally {
      setLoading(false);
    }
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
        return t('activeService.waitingForProvider');
      case 'accepted':
        return t('activeService.providerAssigned');
      case 'in-progress':
        return t('activeService.serviceInProgress');
      case 'completed':
        return t('activeService.serviceCompleted');
      case 'cancelled':
        return t('activeService.cancelled');
      default:
        return statusValue;
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center'}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary, marginTop: 16}]}>
          {t('activeService.loadingServiceDetails')}
        </Text>
        {isImmediateService && !locationPermissionGranted && (
          <TouchableOpacity
            style={[styles.requestLocationButton, {backgroundColor: theme.primary, marginTop: 20}]}
            onPress={requestLocationAndGetCurrentLocation}>
            <Icon name="location-on" size={20} color="#fff" />
            <Text style={styles.requestLocationText}>{t('activeService.requestLocationAccess')}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const customerAddress = serviceRequest?.customerAddress || jobCard?.customerAddress;
  const provider = jobCard || serviceRequest || {};

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
      {/* Map View - Hidden since mapKey is removed - showing simplified view instead */}
      {false ? (
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
                title={t('jobCard.serviceAddress')}
                description={t('services.address')}
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
                title={t('activeService.yourCurrentLocation')}
                description={t('activeService.liveLocation')}
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
                  title={t('activeService.providerLocation')}
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
        <View style={[styles.mapContainer, styles.simplifiedMap, {backgroundColor: theme.card}]}>
          <View style={styles.mapPlaceholder}>
            {status === 'completed' ? (
              <>
                <View style={[styles.distanceIconContainer, {backgroundColor: '#34C759' + '20'}]}>
                  <Icon name="check-circle" size={48} color="#34C759" />
                </View>
                <Text style={[styles.mapPlaceholderText, {color: theme.text}]}>
                  {t('activeService.serviceCompleted')}
                </Text>
              </>
            ) : status === 'cancelled' ? (
              <>
                <View style={[styles.distanceIconContainer, {backgroundColor: '#FF3B30' + '20'}]}>
                  <Icon name="cancel" size={48} color="#FF3B30" />
                </View>
                <Text style={[styles.mapPlaceholderText, {color: theme.text}]}>
                  {t('activeService.cancelled')}
                </Text>
              </>
            ) : providerLocation && distance ? (
              <>
                <View style={[styles.distanceIconContainer, {backgroundColor: theme.primary + '20'}]}>
                  <Icon name="directions-walk" size={48} color={theme.primary} />
                </View>
                <Text style={[styles.mapPlaceholderText, {color: theme.text, fontWeight: '600'}]}>
                  {t('activeService.providerIsOnTheWay')}
                </Text>
                <View style={styles.distanceInfoContainer}>
                  <View style={styles.distanceItem}>
                    <Icon name="straighten" size={24} color={theme.primary} />
                    <Text style={[styles.distanceValue, {color: theme.primary}]}>{distance}</Text>
                    <Text style={[styles.distanceLabel, {color: theme.textSecondary}]}>{t('activeService.away')}</Text>
                  </View>
                  {eta > 0 && isImmediateService && (
                    <View style={styles.distanceItem}>
                      <Icon name="schedule" size={24} color="#FF9500" />
                      <Text style={[styles.distanceValue, {color: '#FF9500'}]}>{eta} {t('activeService.min')}</Text>
                      <Text style={[styles.distanceLabel, {color: theme.textSecondary}]}>{t('activeService.eta')}</Text>
                    </View>
                  )}
                </View>
                {providerLocation.address && (
                  <View style={styles.locationDetailsContainer}>
                    <Icon name="location-on" size={16} color={theme.textSecondary} />
                    <Text style={[styles.locationDetailsText, {color: theme.textSecondary}]} numberOfLines={2}>
                      {providerLocation.address}
                      {providerLocation.city ? `, ${providerLocation.city}` : ''}
                      {providerLocation.state ? `, ${providerLocation.state}` : ''}
                    </Text>
                  </View>
                )}
              </>
            ) : providerLocation ? (
              <>
                <View style={[styles.distanceIconContainer, {backgroundColor: theme.primary + '20'}]}>
                  <Icon name="location-on" size={48} color={theme.primary} />
                </View>
                <Text style={[styles.mapPlaceholderText, {color: theme.text, fontWeight: '600'}]}>
                  {t('activeService.providerLocation')}
                </Text>
                {providerLocation.address && (
                  <View style={styles.locationDetailsContainer}>
                    <Text style={[styles.locationDetailsText, {color: theme.textSecondary}]} numberOfLines={2}>
                      {providerLocation.address}
                      {providerLocation.city ? `, ${providerLocation.city}` : ''}
                      {providerLocation.state ? `, ${providerLocation.state}` : ''}
                    </Text>
                  </View>
                )}
                {isImmediateService && eta > 0 && (
                  <View style={styles.distanceInfoContainer}>
                    <View style={styles.distanceItem}>
                      <Icon name="schedule" size={24} color="#FF9500" />
                      <Text style={[styles.distanceValue, {color: '#FF9500'}]}>{eta} {t('activeService.min')}</Text>
                      <Text style={[styles.distanceLabel, {color: theme.textSecondary}]}>{t('activeService.eta')}</Text>
                    </View>
                  </View>
                )}
                {!isImmediateService && serviceRequest?.scheduledTime && (
                  <View style={styles.scheduledTimeContainer}>
                    <Icon name="event" size={20} color={theme.primary} />
                    <Text style={[styles.scheduledTimeText, {color: theme.text}]}>
                      {new Date(serviceRequest.scheduledTime).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
              </>
            ) : status === 'pending' ? (
              <>
                <View style={[styles.distanceIconContainer, {backgroundColor: '#FF9500' + '20'}]}>
                  <Icon name="hourglass-empty" size={48} color="#FF9500" />
                </View>
                <Text style={[styles.mapPlaceholderText, {color: theme.text}]}>
                  {t('activeService.waitingForProvider')}
                </Text>
                <Text style={[styles.mapPlaceholderSubtext, {color: theme.textSecondary}]}>
                  {t('activeService.waitingForProviderToAccept')}
                </Text>
              </>
            ) : status === 'accepted' ? (
              <>
                <View style={[styles.distanceIconContainer, {backgroundColor: '#007AFF' + '20'}]}>
                  <Icon name="person-pin" size={48} color="#007AFF" />
                </View>
                <Text style={[styles.mapPlaceholderText, {color: theme.text}]}>
                  {t('activeService.providerAssigned')}
                </Text>
                <Text style={[styles.mapPlaceholderSubtext, {color: theme.textSecondary}]}>
                  {t('activeService.providerLocationWillAppear')}
                </Text>
                {!isImmediateService && serviceRequest?.scheduledTime && (
                  <View style={styles.scheduledTimeContainer}>
                    <Icon name="event" size={20} color={theme.primary} />
                    <Text style={[styles.scheduledTimeText, {color: theme.text}]}>
                      {String(t('activeService.scheduledFor'))}: {new Date(serviceRequest.scheduledTime).toLocaleString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                )}
                {isImmediateService && (
                  <Text style={[styles.mapPlaceholderSubtext, {color: theme.textSecondary, marginTop: 8}]}>
                    {String(t('activeService.providerWillArriveSoon'))}
                  </Text>
                )}
              </>
            ) : status === 'in-progress' ? (
              <>
                <View style={[styles.distanceIconContainer, {backgroundColor: '#34C759' + '20'}]}>
                  <Icon name="engineering" size={48} color="#34C759" />
                </View>
                <Text style={[styles.mapPlaceholderText, {color: theme.text}]}>
                  {t('activeService.serviceInProgress')}
                </Text>
                {providerProfile?.name && (
                  <Text style={[styles.mapPlaceholderSubtext, {color: theme.textSecondary}]}>
                    {String(t('activeService.providerWorking'))}: {providerProfile.name}
                  </Text>
                )}
              </>
            ) : (
              <>
                <View style={[styles.distanceIconContainer, {backgroundColor: theme.primary + '20'}]}>
                  <Icon name="location-on" size={48} color={theme.primary} />
                </View>
                <Text style={[styles.mapPlaceholderText, {color: theme.text}]}>
                  {t('activeService.trackingService')}
                </Text>
              </>
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
                  {isImmediateService ? t('services.immediate') : t('services.scheduled')}
                </Text>
              </View>
            </View>
            {status === 'accepted' && providerLocation && distance ? (
              <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                {t('activeService.providerIsAway').replace('{0}', distance).replace('{1}', String(eta))}
              </Text>
            ) : null}
            {status === 'accepted' && !providerLocation && (
              <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                {t('activeService.providerLocationWillAppear')}
              </Text>
            )}
            {status === 'in-progress' && (
              <View style={styles.pinContainer}>
                <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                  {t('activeService.serviceInProgress')}
                </Text>
                {jobCard?.taskPIN ? (
                  <View style={[styles.pinDisplay, {backgroundColor: theme.primary + '15', borderColor: theme.primary}]}>
                    <Icon name="lock" size={16} color={theme.primary} />
                    <Text style={[styles.pinLabel, {color: theme.textSecondary}]}>
                      {t('jobCard.yourVerificationPIN')}
                    </Text>
                    <Text style={[styles.pinValue, {color: theme.primary}]}>
                      {jobCard.taskPIN}
                    </Text>
                    <Text style={[styles.pinInstruction, {color: theme.textSecondary}]}>
                      {t('jobCard.sharePIN')}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}
            {status === 'pending' && (
              <View>
                <Text style={[styles.distanceText, {color: theme.textSecondary}]}>
                  {t('activeService.waitingForProviderToAccept')}
                </Text>
                {loadingProviders ? (
                  <View style={styles.providersLoadingContainer}>
                    <ActivityIndicator size="small" color={theme.primary} />
                    <Text style={[styles.providersLoadingText, {color: theme.textSecondary}]}>
                      {t('loading')}
                    </Text>
                  </View>
                ) : availableProviders.length > 0 ? (
                  <View style={styles.providersListContainer}>
                    <Text style={[styles.providersHeader, {color: theme.text}]}>
                      {t('activeService.availableProviders')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.providersScrollContainer}
                    >
                      {availableProviders.map((provider:any) => (
                        <View key={provider._id || provider.id} style={[styles.providerCard, {backgroundColor: theme.card, borderColor: theme.border}]}>
                          <View style={styles.providerCardInfo}>
                            <Text style={[styles.providerCardName, {color: theme.text}]}>
                              {provider.displayName || provider.name || t('activeService.providerDetails')}
                            </Text>
                            <Text style={[styles.providerCardPhone, {color: theme.textSecondary}]}>
                              {provider?.phoneNumber || provider?.phone || (provider as any)?.primaryPhone || (provider as any)?.mobile || t('activeService.phoneNotAvailable')}
                            </Text>
                          </View>
                          <View style={styles.providerStatusContainer}>
                            <View style={[
                              styles.providerStatusIndicator,
                              {backgroundColor: provider.isOnline ? '#34C759' : '#FF3B30'}
                            ]} />
                            <Text style={[
                              styles.providerStatusText,
                              {color: provider.isOnline ? '#34C759' : '#FF3B30'}
                            ]}>
                              {provider.isOnline ? t('activeService.online') : t('activeService.offline')}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Provider Details Card */}
      {(providerProfile || provider || jobCard?.providerId || serviceRequest?.providerId) && (
        <ScrollView
          style={styles.detailsContainer}
          showsVerticalScrollIndicator={false}>
          <View style={[styles.card, {backgroundColor: theme.card}]}>
            <Text style={[styles.cardTitle, {color: theme.text}]}>
              {t('activeService.providerDetails')}
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
                    {((providerProfile?.name || serviceRequest?.providerName || jobCard?.providerName || (provider as any)?.providerName || 'P') as string).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.providerDetails}>
                <Text 
                  style={[styles.providerName, {color: theme.text}]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {providerProfile?.name || serviceRequest?.providerName || jobCard?.providerName || (provider as any)?.providerName || 'Provider'}
                </Text>
                <Text 
                  style={[styles.serviceType, {color: theme.textSecondary}]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {providerProfile?.specialization || providerProfile?.specialty || serviceRequest?.providerSpecialization || jobCard?.serviceType || (provider as any)?.serviceType || serviceRequest?.serviceType || 'Service'}
                </Text>
                {(providerProfile?.rating || serviceRequest?.providerRating || (provider as any)?.rating) && (
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={[styles.rating, {color: theme.text}]}>
                      {(providerProfile?.rating || serviceRequest?.providerRating || (provider as any)?.rating || 0).toFixed(1)}
                    </Text>
                    {providerProfile?.totalConsultations ? (
                      <Text style={[styles.reviewsCount, {color: theme.textSecondary}]}>
                        ({providerProfile.totalConsultations} {t('activeService.reviews')})
                      </Text>
                    ) : null}
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
                  <Text 
                    style={[styles.contactValue, {color: theme.primary}]}
                    numberOfLines={1}
                    ellipsizeMode="tail">
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
                {providerProfile?.experience ? (
                  <View style={styles.infoRow}>
                    <Icon name="work" size={18} color={theme.textSecondary} />
                    <Text style={[styles.infoText, {color: theme.text}]}>
                      {providerProfile.experience} {t('activeService.yearsOfExperience')}
                    </Text>
                  </View>
                ) : null}
                {(providerProfile?.address || jobCard?.providerAddress) && (
                  <View style={styles.infoRow}>
                    <Icon name="location-on" size={18} color={theme.textSecondary} />
                    <Text style={[styles.infoText, {color: theme.text}]}>
                      {(() => {
                        if (providerProfile?.address) {
                          if (typeof providerProfile.address === 'string') {
                            return providerProfile.address;
                          }
                          const addr = providerProfile.address;
                          return `${addr.address || ''}${addr.city ? `, ${addr.city}` : ''}${addr.pincode ? ` - ${addr.pincode}` : ''}`;
                        }
                        if (jobCard?.providerAddress) {
                          if (typeof jobCard.providerAddress === 'string') {
                            return jobCard.providerAddress;
                          }
                          const addr = jobCard.providerAddress;
                          return `${addr.address || ''}${addr.city ? `, ${addr.city}` : ''}${addr.pincode ? ` - ${addr.pincode}` : ''}`;
                        }
                        return t('activeService.addressNotAvailable');
                      })()}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Service Details */}
          <View style={[styles.card, {backgroundColor: theme.card}]}>
            <Text style={[styles.cardTitle, {color: theme.text}]}>
              {t('jobCard.serviceDetails')}
            </Text>
            <View style={styles.detailRow}>
              <Icon name="build" size={20} color={theme.primary} />
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                {t('services.serviceType')}:
              </Text>
              <Text style={[styles.detailValue, {color: theme.text}]}>
                {provider?.serviceType || serviceRequest?.serviceType || jobCard?.serviceType || 'N/A'}
              </Text>
            </View>
            {(serviceRequest?.problem || jobCard?.problem) && (
              <View style={styles.detailRow}>
                <Icon name="description" size={20} color={theme.primary} />
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  {t('services.problem')}:
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {serviceRequest?.problem || jobCard?.problem || ''}
                </Text>
              </View>
            )}
            {customerAddress && (
              <View style={styles.detailRow}>
                <Icon name="location-on" size={20} color={theme.primary} />
                <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                  {t('services.address')}:
                </Text>
                <Text style={[styles.detailValue, {color: theme.text}]}>
                  {customerAddress.address || 'Address not available'}
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
                  <Text style={styles.actionButtonText}>{t('activeService.verifyTaskCompleted')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, {backgroundColor: theme.primary}]}
                  onPress={handleCallProvider}>
                  <Icon name="phone" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>{t('activeService.callProvider')}</Text>
                </TouchableOpacity>
              </>
            )}

            {status === 'pending' && (
              <>
                {canReRequest && (
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      {backgroundColor: theme.primary},
                    ]}
                    onPress={handleReRequest}
                    disabled={loading}>
                    <Icon name="refresh" size={20} color="#fff" />
                    <Text style={styles.actionButtonText}>{t('activeService.reRequestService')}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {backgroundColor: theme.error},
                  ]}
                  onPress={handleCancelService}
                  disabled={loading}>
                  <Icon name="cancel" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>{t('activeService.cancelService')}</Text>
                </TouchableOpacity>
              </>
            )}

            {status === 'accepted' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, {backgroundColor: theme.primary}]}
                  onPress={handleCallProvider}>
                  <Icon name="phone" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>{t('activeService.callProvider')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    {backgroundColor: theme.error},
                  ]}
                  onPress={handleCancelService}
                  disabled={loading}>
                  <Icon name="cancel" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>{t('activeService.cancelService')}</Text>
                </TouchableOpacity>
              </>
            )}

            {status === 'completed' && (
              <TouchableOpacity
                style={[styles.actionButton, {backgroundColor: theme.primary}]}
                onPress={() => navigation.navigate('ServiceHistory')}>
                <Icon name="history" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>{t('activeService.viewHistory')}</Text>
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
            setAlertModalConfig({
              title: t('messages.thankYou'),
              message: t('activeService.thankYouReviewSubmitted'),
              type: 'success',
            });
            setShowAlertModal(true);
          }}
          onSkip={() => {
            setShowReviewModal(false);
            setReviewDismissed(true); // Mark as dismissed so it won't show again automatically
          }}
        />
      )}

      {/* Cancel Service Reason Modal */}
      <CancelTaskModal
        visible={showCancelReasonModal}
        onCancel={handleCancelWithReason}
        onClose={() => setShowCancelReasonModal(false)}
      />

      {/* Verify Completion Confirmation Modal */}
      <ConfirmationModal
        visible={showVerifyModal}
        title={t('activeService.verifyTaskCompletionTitle')}
        message={t('activeService.verifyTaskCompletionMessage')}
        confirmText={t('activeService.yesVerify')}
        cancelText={t('common.no')}
        type="info"
        icon="checkmark-circle"
        onConfirm={confirmVerifyCompletion}
        onCancel={() => setShowVerifyModal(false)}
      />

      {/* Re-Request Confirmation Modal */}
      <ConfirmationModal
        visible={showReRequestModal}
        title={t('activeService.reRequestTitle')}
        message={t('activeService.reRequestMessage')}
        confirmText={t('activeService.yesReRequest')}
        cancelText={t('common.cancel')}
        type="info"
        icon="refresh"
        onConfirm={confirmReRequest}
        onCancel={() => setShowReRequestModal(false)}
      />

      {/* Alert Modal */}
      {alertModalConfig && (
        <AlertModal
          visible={showAlertModal}
          title={alertModalConfig.title}
          message={alertModalConfig.message}
          type={alertModalConfig.type}
          onClose={() => {
            setShowAlertModal(false);
            // Navigate back if it was a success cancel
            if (alertModalConfig.title === 'Success' && alertModalConfig.message.includes('cancelled')) {
              navigation.goBack();
            }
            // Navigate back if it was an access denied error
            if (alertModalConfig.title === 'Access Denied') {
              navigation.goBack();
            }
            setAlertModalConfig(null);
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
    padding: 20,
  },
  mapPlaceholderText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  mapPlaceholderDistance: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '600',
  },
  distanceIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distanceInfoContainer: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 40,
  },
  distanceItem: {
    alignItems: 'center',
    gap: 4,
  },
  distanceValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  distanceLabel: {
    fontSize: 12,
  },
  locationDetailsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  locationDetailsText: {
    fontSize: 13,
    flex: 1,
    textAlign: 'center',
  },
  scheduledTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    gap: 8,
    justifyContent: 'center',
  },
  scheduledTimeText: {
    fontSize: 14,
    fontWeight: '500',
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
  pinContainer: {
    alignItems: 'center',
    gap: 12,
  },
  pinDisplay: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 8,
    gap: 8,
    minWidth: 200,
  },
  pinLabel: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  pinValue: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 4,
    textAlign: 'center',
  },
  pinInstruction: {
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
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
    minWidth: 0, // Allow flex children to shrink
  },
  providerName: {
    fontSize: 18,
    fontWeight: '600',
    flexShrink: 1,
  },
  serviceType: {
    fontSize: 14,
    marginTop: 4,
    flexShrink: 1,
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
    minWidth: 0, // Allow flex children to shrink
  },
  contactValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    flexShrink: 1,
    minWidth: 0, // Allow text to shrink and not wrap
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
  providersListContainer: {
    marginTop: 16,
  },
  providersHeader: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  providersScrollContainer: {
    flexDirection: 'row',
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginRight: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 200,
    maxWidth: 250,
  },
  providerCardInfo: {
    flex: 1,
  },
  providerCardName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },
  providerCardPhone: {
    fontSize: 12,
  },
  providerStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  providerStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
  },
  providerStatusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  providersLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    padding: 8,
  },
  providersLoadingText: {
    marginLeft: 8,
    fontSize: 12,
  },
});

