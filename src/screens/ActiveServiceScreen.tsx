/**
 * Active Service Screen — parity with customer-web ActivePage.
 * Crystal status hero → provider card (callOnly, no digits) → service details → actions.
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
  PermissionsAndroid,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Button, Avatar} from 'sapvt-ltd-app-packages';
import GeolocationService from '../services/geolocationService';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {CrystalSurface} from '../components/CrystalSurface';
import {subscribeToJobCardStatus, verifyTaskCompletion, cancelTaskWithReason, getJobCardById} from '../services/jobCardService';
import {jobCardsApi} from '../services/api/jobCardsApi';
import JobCardComments from '../components/JobCardComments';
import {serviceRequestsApi} from '../services/api/serviceRequestsApi';
import CancelTaskModal from '../components/CancelTaskModal';
import {getDistanceToCustomer, formatDistance} from '../services/providerLocationService';
import ReviewModal from '../components/ReviewModal';
import ConfirmationModal from '../components/ConfirmationModal';
import AlertModal from '../components/AlertModal';
import Toast from '../components/Toast';
import {canCustomerReview, getJobCardReview, type Review} from '../services/reviewService';
import YourJobReview from '../components/YourJobReview';
import ProviderRequestModal, {
  type RequestableProvider,
} from '../components/ProviderRequestModal';
import {providersApi, Provider} from '../services/api/providersApi';
import {AvailableProviders} from '../components/AvailableProviders';
import RequestPhotoGallery from '../components/RequestPhotoGallery';
import WebSocketService from '../services/websocketService';
import useTranslation from '../hooks/useTranslation';
import {getUserId} from '../services/session';
import {
  resolveActivePhase,
  activePhaseIcon,
  activePhaseTitle,
  activePhaseSubtitle,
} from '../utils/activeServiceStatus';
import {localizedServiceName} from '../utils/serviceDisplay';
import {
  formatAddressDisplayLines,
  formatFullAddressLine,
} from '../utils/addressDisplay';
import {formatJobDateTime} from '../utils/dateDisplay';
import {contactHintMessage} from '../utils/providerContact';
import {toSafeMaterialIcon} from '../utils/serviceIcons';

type ThemeColors = typeof lightTheme;

function RequestStatusSteps({
  status,
  theme,
  labels,
}: {
  status: string;
  theme: ThemeColors;
  labels: {
    sent: string;
    accepted: string;
    inProgress: string;
    done: string;
    title: string;
  };
}) {
  const ns = String(status || '')
    .toLowerCase()
    .trim();
  if (
    ns === 'cancelled' ||
    ns === 'canceled' ||
    ns === 'rejected' ||
    ns === 'declined'
  ) {
    return null;
  }

  const acceptedDone = [
    'accepted',
    'confirmed',
    'assigned',
    'in-progress',
    'in progress',
    'inprogress',
    'in_progress',
    'completed',
    'done',
    'finished',
  ].includes(ns);
  const inProgressDone = [
    'in-progress',
    'in progress',
    'inprogress',
    'in_progress',
    'completed',
    'done',
    'finished',
  ].includes(ns);
  const doneDone = ['completed', 'done', 'finished'].includes(ns);
  const inProgressCurrent =
    ns === 'in-progress' ||
    ns === 'in progress' ||
    ns === 'inprogress' ||
    ns === 'in_progress';

  // Always show the real customer path (no invented backend states).
  const steps = [
    {key: 'sent', label: labels.sent, done: true, current: false},
    {
      key: 'accepted',
      label: labels.accepted,
      done: acceptedDone,
      current: acceptedDone && !inProgressDone,
    },
    {
      key: 'progress',
      label: labels.inProgress,
      done: inProgressDone,
      current: inProgressCurrent,
    },
    {key: 'done', label: labels.done, done: doneDone, current: false},
  ];

  return (
    <View style={styles.statusStepsWrap}>
      <Text style={[styles.statusStepsTitle, {color: theme.textSecondary}]}>
        {labels.title}
      </Text>
      <View style={styles.statusStepsRow}>
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            {index > 0 ? (
              <View
                style={[
                  styles.statusStepLine,
                  {
                    backgroundColor: step.done ? theme.success : theme.border,
                  },
                ]}
              />
            ) : null}
            <View style={styles.statusStepItem}>
              <View
                style={[
                  styles.statusStepDot,
                  {
                    backgroundColor: step.done
                      ? theme.success
                      : step.current
                        ? `${theme.primary}22`
                        : theme.card,
                    borderColor: step.done
                      ? theme.success
                      : step.current
                        ? theme.primary
                        : theme.border,
                  },
                ]}>
                {step.done ? (
                  <Icon name="check" size={12} color="#fff" />
                ) : step.current ? (
                  <View
                    style={[
                      styles.statusStepCurrentInner,
                      {backgroundColor: theme.primary},
                    ]}
                  />
                ) : null}
              </View>
              <Text
                style={[
                  styles.statusStepLabel,
                  {
                    color:
                      step.done || step.current
                        ? theme.text
                        : theme.textSecondary,
                    fontWeight: step.done || step.current ? '700' : '500',
                  },
                ]}
                numberOfLines={1}>
                {step.label}
              </Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

interface ActiveServiceScreenProps {
  navigation?: any;
  route?: {
    params?: {
      serviceRequestId: string;
      jobCardId?: string;
    };
  };
}

export default function ActiveServiceScreen({
  navigation,
  route,
}: ActiveServiceScreenProps) {
  const serviceRequestId = route?.params?.serviceRequestId || '';
  const jobCardId = route?.params?.jobCardId;
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const insets = useSafeAreaInsets();

  const [serviceRequest, setServiceRequest] = useState<any>(null);
  const [jobCard, setJobCard] = useState<any>(null);
  const customerUserId =
    getUserId(currentUser) ||
    (serviceRequest?.customerId ? String(serviceRequest.customerId) : '') ||
    '';
  const [providerLocation, setProviderLocation] = useState<any>(null);
  const [providerProfile, setProviderProfile] = useState<any>(null);
  const [status, setStatus] = useState<string>('pending');
  const [loading, setLoading] = useState(true);
  const [isImmediateService, setIsImmediateService] = useState<boolean>(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewDismissed, setReviewDismissed] = useState(false);
  const [submittedReview, setSubmittedReview] = useState<Review | null>(null);
  const [distance, setDistance] = useState<string>('');
  const [eta, setEta] = useState<number>(0);
  const [locationPermissionGranted, setLocationPermissionGranted] = useState<boolean>(false);
  const [customerLocation, setCustomerLocation] = useState<any>(null);
  const [requestCreatedAt, setRequestCreatedAt] = useState<Date | null>(null);
  const [canReRequest, setCanReRequest] = useState<boolean>(false);
  const [showReRequestModal, setShowReRequestModal] = useState(false);
  const [showRepeatPartnerConfirm, setShowRepeatPartnerConfirm] =
    useState(false);
  const [showRepeatPartnerRequest, setShowRepeatPartnerRequest] =
    useState(false);
  const [availableProviders, setAvailableProviders] = useState<Provider[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

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
    if (customerUserId) {
      console.log('🔌 [CUSTOMER] Initializing WebSocket connection for customer:', {
        userId: customerUserId,
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
          WebSocketService.joinCustomerRoom(customerUserId);
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
          WebSocketService.joinCustomerRoom(customerUserId);
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
    }
    // Wait until we have a customer id (from session or loaded service request)
  }, [serviceRequestId, jobCardId, customerUserId]);
  
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

  // Poll for service request updates to detect when provider accepts / rejects
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

          if (newStatus === 'rejected' && status !== 'rejected') {
            setServiceRequest((prev: any) => ({
              ...(prev || {}),
              ...request,
              rejectionReason: (request as any).rejectionReason,
            }));
          } else if (newStatus === 'pending') {
            // Keep declinedProviders in sync while still waiting
            setServiceRequest((prev: any) => ({
              ...(prev || {}),
              ...request,
              declinedProviders: (request as any).declinedProviders || [],
            }));
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

  // Poll provider location from Mongo/backend API (no Firebase RTDB)
  useEffect(() => {
    const providerId = jobCard?.providerId || serviceRequest?.providerId;

    if (!providerId) {
      setProviderLocation(null);
      return;
    }

    console.log('Setting up provider location polling for:', providerId);

    const fetchLocation = async () => {
      try {
        const provider = await providersApi.getById(providerId);
        if (provider) {
          const locationData =
            (provider as any).currentLocation || provider.location;
          if (
            locationData &&
            locationData.latitude &&
            locationData.longitude
          ) {
            const location = {
              latitude: locationData.latitude,
              longitude: locationData.longitude,
              address: locationData.address || provider.location?.address,
              city: locationData.city || provider.location?.city,
              state: locationData.state || provider.location?.state,
              pincode: locationData.pincode || provider.location?.pincode,
              updatedAt: locationData.updatedAt || Date.now(),
            };
            setProviderLocation(location);
            calculateDistanceAndETA(location);
          }
        }
      } catch (error) {
        console.error('Error fetching provider location from API:', error);
      }
    };

    fetchLocation();
    const interval = setInterval(fetchLocation, 10000);
    return () => clearInterval(interval);
  }, [jobCard?.providerId, serviceRequest?.providerId]);

  // Check if re-request is allowed (10 minutes after creation and status is pending)
  // Only for open (broadcast) requests — specific-provider requests stay pending until accept/reject.
  useEffect(() => {
    const checkCanReRequest = () => {
      // Targeted to a specific provider: do not offer re-request / auto-cancel
      if (serviceRequest?.providerId) {
        setCanReRequest(false);
        return;
      }

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
  }, [status, requestCreatedAt, serviceRequest?.providerId]);

  // Fetch available providers when status is pending (open requests only)
  useEffect(() => {
    const fetchAvailableProviders = async () => {
      // Targeted requests already have a providerId — don't list other providers
      if (serviceRequest?.providerId) {
        setAvailableProviders([]);
        setLoadingProviders(false);
        return;
      }
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
  }, [status, serviceRequest?.serviceType, serviceRequest?.providerId]);

  // Realtime: accept / targeted reject / open-request decline
  useEffect(() => {
    if (!serviceRequestId || !customerUserId) return;

    const unsubscribe = WebSocketService.onServiceRequestStatus(data => {
      const eventId = String(
        data.serviceRequestId || data.consultationId || '',
      );
      if (!eventId || eventId !== String(serviceRequestId)) return;

      if (data.status === 'accepted') {
        loadServiceData();
        return;
      }

      if (data.status === 'rejected') {
        setStatus('rejected');
        setServiceRequest((prev: any) => ({
          ...(prev || {}),
          status: 'rejected',
          rejectionReason: data.rejectionReason,
          providerName: data.providerName || prev?.providerName,
          providerId: data.providerId || prev?.providerId,
        }));
        return;
      }

      if (data.status === 'pending' && Array.isArray(data.declinedProviders)) {
        setServiceRequest((prev: any) => ({
          ...(prev || {}),
          declinedProviders: data.declinedProviders,
        }));
        const name =
          data.lastDeclinedProvider?.providerName ||
          data.declinedProviders[data.declinedProviders.length - 1]
            ?.providerName ||
          'Provider';
        setToastMessage(
          String(
            t('activeService.providerDeclinedToast') ||
              '{{name}} declined — still waiting for others',
          ).replace('{{name}}', name),
        );
        setShowToast(true);
      }
    });

    return unsubscribe;
  }, [serviceRequestId, customerUserId, t]);

  const loadServiceData = async () => {
    try {
      setLoading(true);

      // Load service request from API
      const requestData = await serviceRequestsApi.getById(serviceRequestId);

      if (requestData) {
        // Verify user has permission to view this consultation
        const userId = getUserId(currentUser);
        const customerId = requestData?.customerId;
        
        if (userId && customerId && customerId !== userId) {
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

      // Load job card if ID provided (skip synthetic sr_* ids from pending requests)
      if (jobCardId && !String(jobCardId).startsWith('sr_')) {
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
        currentUserId: getUserId(currentUser),
      });

      // Try to get jobCardId from current jobCard or find it from consultation
      let currentJobCardId = jobCardId || jobCard?.id;
      
      if (!currentJobCardId && serviceRequestId) {
        console.log('🔍 No jobCardId, searching by consultationId:', serviceRequestId);
        // Try to find jobCard by consultationId using API
        try {
          const jobCards = await jobCardsApi.getAll({
            customerId: getUserId(currentUser) || undefined,
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
        const existingReview = await getJobCardReview(currentJobCardId);
        if (existingReview) {
          setSubmittedReview(existingReview);
          return;
        }
        setSubmittedReview(null);

        // If review was dismissed and user hasn't submitted, don't show again automatically
        // User can still access it from service history / Rate button
        if (reviewDismissed) {
          console.log('⚠️ Review was dismissed, not showing again automatically');
          return;
        }

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
          console.log('⚠️ Cannot review - job may not be completed or customer mismatch');
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
    const liveStatus = String(
      serviceRequest?.status || jobCard?.status || '',
    ).toLowerCase();
    if (liveStatus !== 'accepted' && liveStatus !== 'in-progress') {
      return;
    }
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

      // Specific-provider requests must not be cancelled via re-request
      if (serviceRequest.providerId) {
        setAlertModalConfig({
          title: t('common.info'),
          message:
            t('activeService.specificProviderNoReRequest') ||
            'This request is waiting for the selected provider. You can cancel it, or choose another provider from Browse.',
          type: 'info',
        });
        setShowAlertModal(true);
        setLoading(false);
        return;
      }

      if (!customerUserId) {
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
      }

      const newServiceRequestData: any = {
        customerId: customerUserId,
        customerName: serviceRequest.customerName || currentUser?.name || 'Customer',
        customerPhone:
          serviceRequest.customerPhone ||
          currentUser?.phone ||
          currentUser?.phoneNumber ||
          '',
        customerAddress: serviceRequest.customerAddress,
        serviceType: serviceRequest.serviceType,
        problem: serviceRequest.problem || '',
        status: 'pending',
        urgency: serviceRequest.urgency || 'immediate',
        questionnaireAnswers: serviceRequest.questionnaireAnswers || undefined,
      };

      if (serviceRequest.scheduledTime) {
        const scheduledTime =
          serviceRequest.scheduledTime instanceof Date
            ? serviceRequest.scheduledTime
            : new Date(serviceRequest.scheduledTime);
        newServiceRequestData.scheduledTime = scheduledTime.toISOString();
      }

      if (serviceRequest.photos && serviceRequest.photos.length > 0) {
        newServiceRequestData.photos = serviceRequest.photos;
      }

      const created = await serviceRequestsApi.create(newServiceRequestData);
      const newServiceRequestId =
        (created as any)?._id ||
        (created as any)?.id ||
        (created as any)?.consultationId;

      if (!newServiceRequestId) {
        throw new Error('Failed to create service request');
      }
      console.log('✅ Service request created in MongoDB:', newServiceRequestId);

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
      const trimmedReason = reason.trim();
      const realJobCardId =
        jobCardId && !String(jobCardId).startsWith('sr_')
          ? jobCardId
          : jobCard?.id && !String(jobCard.id).startsWith('sr_')
            ? jobCard.id
            : null;

      // Cancel job card only when a real job card exists (accepted / in-progress).
      // Pending specific-provider requests have no job card yet.
      if (realJobCardId) {
        try {
          await cancelTaskWithReason(realJobCardId, trimmedReason);
          cancelled = true;
        } catch (error: any) {
          const msg = String(error?.message || error || '');
          const code = String((error as {code?: string})?.code || '');
          if (
            code === 'JOB_CARD_NOT_FOUND' ||
            /not found|404/i.test(msg)
          ) {
            // Expected when only a service request exists — cancel SR below.
          } else {
            console.warn('Error cancelling job card:', msg);
          }
          // Continue — still cancel the service request below
        }
      }
      
      // Cancel the service request (covers pending / not-yet-accepted cases)
      if (serviceRequestId) {
        try {
          await serviceRequestsApi.cancel(serviceRequestId, trimmedReason);
          cancelled = true;
          setStatus('cancelled');
          setServiceRequest((prev: any) =>
            prev
              ? {...prev, status: 'cancelled', cancellationReason: trimmedReason}
              : prev,
          );
        } catch (error: any) {
          console.warn('Error cancelling service request:', error?.message || error);
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
        setAlertModalConfig({
          title: t('common.info'),
          message: t('activeService.serviceRequestNotFoundInfo'),
          type: 'info',
        });
        setShowAlertModal(true);
      }
    } catch (error: any) {
      console.warn('Error cancelling service:', error?.message || error);
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
    // pending→warning, accepted→primary (blue), completed→success (green),
    // in-progress→warning/orange for live work, cancelled/rejected→error
    switch (String(statusValue || '').toLowerCase()) {
      case 'pending':
      case 'finding':
      case 'waiting-accept':
        return theme.warning;
      case 'accepted':
        return theme.primary;
      case 'completed':
        return theme.success;
      case 'in-progress':
      case 'in_progress':
        return theme.warning;
      case 'cancelled':
      case 'canceled':
      case 'rejected':
        return theme.error;
      default:
        return theme.textSecondary;
    }
  };

  const heroTint = getStatusColor(status);
  const isDark = theme.background === '#0B1220';

  const declinedProvidersList: Array<{
    providerId: string;
    providerName?: string;
    providerPhone?: string;
  }> = Array.isArray(serviceRequest?.declinedProviders)
    ? serviceRequest.declinedProviders
    : [];
  const declinedIdSet = new Set(
    declinedProvidersList.map(d => String(d.providerId)),
  );

  /** Online + declined merged for pending open requests */
  const displayProviders: Array<{
    id: string;
    name: string;
    profession?: string;
    phone?: string;
    image?: string | null;
    location?: string;
    isOnline?: boolean;
    declined?: boolean;
  }> = (() => {
    if (status !== 'pending' || serviceRequest?.providerId) return [];
    const fallbackName = String(t('activeService.providerDetails') || 'Provider');
    const mapRow = (p: any, declined: boolean) => {
      const loc = p.location || {};
      const location = [...new Set([loc.district, loc.city].filter(Boolean))].join(
        ', ',
      );
      const phone = String(p.phoneNumber || p.phone || '').trim();
      return {
        id: String(p._id || p.id || ''),
        name: p.displayName || p.name || fallbackName,
        profession: p.specialization || p.serviceCategories?.[0] || undefined,
        phone: phone || undefined,
        image: p.profileImage || null,
        location: location || undefined,
        isOnline: p.isOnline,
        declined,
      };
    };
    const online = (availableProviders || []).map(p => {
      const id = String(p._id || p.id || '');
      return mapRow(p, declinedIdSet.has(id));
    });
    const onlineIds = new Set(online.map(p => p.id).filter(Boolean));
    const declinedOnly = declinedProvidersList
      .filter(d => !onlineIds.has(String(d.providerId)))
      .map(d =>
        mapRow(
          {
            _id: d.providerId,
            name: d.providerName || fallbackName,
            phoneNumber: d.providerPhone || '',
            isOnline: false,
          },
          true,
        ),
      );
    return [
      ...declinedOnly,
      ...online.filter(p => p.declined),
      ...online.filter(p => !p.declined),
    ];
  })();
  const availableCount = displayProviders.filter(p => !p.declined).length;

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
  const assignedProviderName =
    providerProfile?.name ||
    serviceRequest?.providerName ||
    jobCard?.providerName;
  const showProviderCard =
    Boolean(assignedProviderName || serviceRequest?.providerId || jobCard?.providerId) &&
    status !== 'pending' &&
    status !== 'rejected';
  const providerPhone =
    providerProfile?.phoneNumber ||
    providerProfile?.phone ||
    serviceRequest?.providerPhone ||
    jobCard?.providerPhone;
  const canCall =
    (status === 'accepted' || status === 'in-progress') && Boolean(providerPhone);
  const providerRating = Number(
    providerProfile?.rating || serviceRequest?.providerRating || (provider as any)?.rating || 0,
  );
  const requestedAt = serviceRequest?.createdAt || jobCard?.createdAt;
  const serviceLabel =
    localizedServiceName(
      serviceRequest?.serviceType || jobCard?.serviceType || '',
    ) || String(t('common.service') || 'Service');
  const nearbyReady = displayProviders.some(p => !p.declined);
  const hasNamedProvider = Boolean(
    assignedProviderName || serviceRequest?.providerId || jobCard?.providerId,
  );
  const phase = resolveActivePhase(status, {
    hasNearbyProviders: nearbyReady,
    hasNamedProvider,
  });
  const phaseIcon = toSafeMaterialIcon(activePhaseIcon(phase));
  const heroTitle = activePhaseTitle(phase, {
    serviceType: serviceLabel,
    providerName: assignedProviderName || undefined,
  });
  const heroSub = activePhaseSubtitle(phase, {
    providerName: assignedProviderName || undefined,
    serviceType: serviceLabel,
    brandName: 'Akansho',
  });
  const waiting = phase === 'finding' || phase === 'waiting-accept';
  const canEdit = status === 'pending';
  const taskPin = jobCard?.taskPIN || (serviceRequest as any)?.taskPIN || null;
  const addressLines = formatAddressDisplayLines(customerAddress as any);
  const serviceAddressLine =
    addressLines.length > 0
      ? addressLines.join('\n')
      : formatFullAddressLine(customerAddress as any);
  const requestedDisplay = formatJobDateTime(
    requestedAt,
    undefined,
    '',
  );
  const contactHint = canCall
    ? null
    : contactHintMessage(
        k => String(t(k) || ''),
        serviceRequest?.contact?.providerContactHint,
        serviceRequest?.contact?.providerContactPolicy,
      );
  const providerLocLabel = (() => {
    const loc = providerProfile?.location || {};
    const parts = [loc.district || loc.city, loc.state]
      .map((p: unknown) => String(p || '').trim())
      .filter(Boolean)
      .filter(
        (part: string, index: number, all: string[]) =>
          index === 0 || part.toLowerCase() !== all[index - 1].toLowerCase(),
      );
    return parts.join(', ');
  })();
  const providerDisplayName =
    assignedProviderName ||
    String(t('active.partnerFallback') || 'Someone');
  const repeatPartnerId = String(
    providerProfile?.id ||
      providerProfile?._id ||
      serviceRequest?.providerId ||
      jobCard?.providerId ||
      '',
  ).trim();
  const canRequestSamePartner =
    status === 'completed' && Boolean(repeatPartnerId);
  const repeatPartner: RequestableProvider | null = canRequestSamePartner
    ? {
        id: repeatPartnerId,
        _id: repeatPartnerId,
        name: assignedProviderName || providerDisplayName,
        phone:
          providerProfile?.phoneNumber ||
          providerProfile?.phone ||
          serviceRequest?.providerPhone,
        phoneNumber:
          providerProfile?.phoneNumber ||
          providerProfile?.phone ||
          serviceRequest?.providerPhone,
        specialization:
          providerProfile?.specialization ||
          providerProfile?.specialty ||
          serviceRequest?.serviceType ||
          jobCard?.serviceType,
        specialty: providerProfile?.specialty,
        serviceType:
          serviceRequest?.serviceType ||
          jobCard?.serviceType ||
          providerProfile?.serviceType,
        rating: providerRating || undefined,
        profileImage:
          providerProfile?.profileImage || serviceRequest?.providerImage,
        image: providerProfile?.profileImage || serviceRequest?.providerImage,
      }
    : null;
  const providerFirstName = String(providerDisplayName)
    .trim()
    .split(/\s+/)[0];
  const callActionLabel = providerFirstName
    ? String(
        t('providers.callNamed', {name: providerFirstName}) ||
          t('active.callNamed', {name: providerFirstName}),
      )
    : String(t('contact.callProvider') || t('activeService.callProvider'));
  const showRefresh = !['completed', 'cancelled', 'canceled', 'rejected'].includes(
    String(status || '').toLowerCase(),
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, {backgroundColor: theme.background}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.detailsContainer}
        contentContainerStyle={styles.pageContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {/* Single status hero — web `.active-hero` (no left stripe, no map banner) */}
        <CrystalSurface
          primary={theme.primary}
          card={theme.card}
          isDark={isDark}
          statusColor={heroTint}
          radius={18}
          style={styles.heroCard}
          contentStyle={styles.heroInner}>
          <View style={styles.heroTitleRow}>
            <View
              style={[
                styles.heroIcon,
                {backgroundColor: `${heroTint}24`},
              ]}>
              <Icon name={phaseIcon} size={20} color={heroTint} />
            </View>
            <Text
              style={[styles.heroTitle, {color: theme.text}]}
              numberOfLines={2}>
              {heroTitle}
            </Text>
            {showRefresh ? (
              <TouchableOpacity
                style={[styles.heroBell, {backgroundColor: `${theme.primary}14`}]}
                onPress={() => void loadServiceData()}
                accessibilityRole="button"
                accessibilityLabel={String(t('active.refreshStatus') || 'Refresh')}>
                <Icon name="refresh" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
          {heroSub ? (
            <Text style={[styles.heroSub, {color: theme.textSecondary}]}>
              {heroSub}
            </Text>
          ) : null}
          {serviceLabel &&
          (phase === 'accepted' ||
            phase === 'in-progress' ||
            phase === 'waiting-accept') ? (
            <Text style={[styles.heroService, {color: theme.text}]}>
              {serviceLabel}
            </Text>
          ) : null}
          <RequestStatusSteps
            status={status}
            theme={theme}
            labels={{
              title: String(t('active.requestStatus') || 'Request status'),
              sent: String(t('active.stepSent') || 'Sent'),
              accepted: String(t('active.stepAccepted') || 'Accepted'),
              inProgress: String(t('active.stepInProgress') || 'In progress'),
              done: String(t('active.stepDone') || 'Done'),
            }}
          />
          {distance &&
          (status === 'accepted' || status === 'in-progress') &&
          isImmediateService ? (
            <Text style={[styles.heroSub, {color: theme.textSecondary}]}>
              {String(
                t('activeService.providerIsAway') ||
                  'Provider is {0} away • ETA: ~{1} min',
              )
                .replace('{0}', distance)
                .replace('{1}', String(eta || '—'))}
            </Text>
          ) : null}
          {canEdit ? (
            <Text style={[styles.heroReassure, {color: theme.textSecondary}]}>
              {String(
                t('active.editUntilAccepted', {type: serviceLabel}) ||
                  `You can edit this request until someone accepts it.`,
              )}
            </Text>
          ) : waiting ? (
            <Text style={[styles.heroReassure, {color: theme.textSecondary}]}>
              {String(t('active.youCanWait') || "You don't need to do anything right now.")}
            </Text>
          ) : null}
          {status === 'in-progress' && taskPin ? (
            <View
              style={[
                styles.pinBox,
                {
                  backgroundColor: `${theme.primary}15`,
                  borderColor: `${theme.primary}55`,
                },
              ]}>
              <Text style={[styles.pinBoxLabel, {color: theme.textSecondary}]}>
                {String(t('active.verificationPin') || 'Task completion PIN')}
              </Text>
              <Text style={[styles.pinBoxValue, {color: theme.primary}]}>
                {String(taskPin)}
              </Text>
              <Text style={[styles.pinBoxHint, {color: theme.textSecondary}]}>
                {String(
                  t('active.verificationPinHint') ||
                    'Share this 4-digit PIN when they finish the work.',
                )}
              </Text>
            </View>
          ) : null}
        </CrystalSurface>

        {status === 'pending' && !serviceRequest?.providerId ? (
          <AvailableProviders
            theme={theme}
            providers={displayProviders}
            loading={loadingProviders}
            title={serviceLabel}
            countLabel={
              availableCount === 1
                ? String(
                    t('active.providerAvailable', {type: serviceLabel}) ||
                      t('activeService.providerAvailable') ||
                      '1 provider available',
                  )
                : availableCount > 1
                  ? String(
                      t('active.providersAvailable', {
                        count: availableCount,
                        type: serviceLabel,
                      }) ||
                        t('activeService.providersAvailable') ||
                        '{{count}} providers available',
                    ).replace('{{count}}', String(availableCount))
                  : undefined
            }
            emptyTitle={String(
              t('active.noProvidersTitle') || t('activeService.noProvidersTitle'),
            )}
            emptyMessage={String(
              t('active.noProvidersMessage') ||
                t('activeService.noProvidersMessage'),
            )}
            onlineLabel={String(t('common.online') || t('activeService.online'))}
            offlineLabel={String(
              t('common.offline') || t('activeService.offline'),
            )}
            declinedLabel={String(
              t('status.declined') || t('activeService.declined'),
            )}
            callLabel={String(t('contact.callProvider') || t('activeService.callProvider'))}
          />
        ) : null}

        {showProviderCard ? (
          <CrystalSurface
            primary={theme.primary}
            card={theme.card}
            isDark={isDark}
            radius={16}
            style={styles.detailCard}
            contentStyle={styles.detailCardInner}>
            <Text style={[styles.cardTitle, {color: theme.text}]}>
              {String(
                t('active.yourProfessional') || 'Your professional',
              )}
            </Text>
            <View style={styles.providerInfo}>
              <Avatar
                src={
                  providerProfile?.profileImage ||
                  serviceRequest?.providerImage ||
                  null
                }
                name={providerDisplayName}
                size={48}
                colors={{primary: theme.primary}}
              />
              <View style={styles.providerDetails}>
                <Text
                  style={[styles.providerName, {color: theme.text}]}
                  numberOfLines={1}
                  ellipsizeMode="tail">
                  {providerDisplayName}
                </Text>
                <Text
                  style={[styles.serviceType, {color: theme.textSecondary}]}
                  numberOfLines={2}
                  ellipsizeMode="tail">
                  {serviceLabel}
                </Text>
                {providerLocLabel ? (
                  <Text
                    style={[styles.providerLoc, {color: theme.textSecondary}]}
                    numberOfLines={1}>
                    {providerLocLabel}
                  </Text>
                ) : null}
                {providerRating > 0 ? (
                  <View style={styles.ratingContainer}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={[styles.rating, {color: theme.text}]}>
                      {providerRating.toFixed(1)}
                    </Text>
                  </View>
                ) : null}
                {providerProfile?.isOnline === true ? (
                  <Text style={[styles.presenceText, {color: theme.success}]}>
                    ●  {String(
                      t('active.currentlyOnline') ||
                        t('common.online') ||
                        'Currently online',
                    )}
                  </Text>
                ) : providerProfile?.isOnline === false ? (
                  <Text
                    style={[styles.presenceText, {color: theme.textSecondary}]}>
                    ●  {String(
                      t('active.currentlyOffline') ||
                        'Currently offline',
                    )}
                  </Text>
                ) : null}
              </View>
            </View>

            {!canCall && contactHint ? (
              <Text style={[styles.contactHint, {color: theme.textSecondary}]}>
                {contactHint}
              </Text>
            ) : null}
          </CrystalSurface>
        ) : null}

        {/* Your request */}
        <CrystalSurface
          primary={theme.primary}
          card={theme.card}
          isDark={isDark}
          radius={16}
          style={styles.detailCard}
          contentStyle={styles.detailCardInner}>
          <Text style={[styles.cardTitle, {color: theme.text}]}>
            {String(t('active.serviceDetails') || 'Your request')}
          </Text>
          <View style={styles.detailBlock}>
            <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
              {String(t('active.serviceType') || t('services.serviceType') || 'Service')}
            </Text>
            <Text style={[styles.detailValueStack, {color: theme.text}]}>
              {serviceLabel}
            </Text>
          </View>
          {(serviceRequest?.problem || jobCard?.problem) ? (
            <View style={styles.detailBlock}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                {String(t('active.problem') || 'What you need')}
              </Text>
              <Text style={[styles.detailValueStack, {color: theme.text}]}>
                {serviceRequest?.problem || jobCard?.problem || ''}
              </Text>
            </View>
          ) : null}
          {serviceAddressLine ? (
            <View style={styles.detailBlock}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                {String(t('active.address') || t('services.address') || 'Address')}
              </Text>
              {addressLines.length > 0 ? (
                addressLines.map(line => (
                  <Text
                    key={line}
                    style={[styles.detailAddress, {color: theme.text}]}>
                    {line}
                  </Text>
                ))
              ) : (
                <Text style={[styles.detailAddress, {color: theme.text}]}>
                  {serviceAddressLine}
                </Text>
              )}
            </View>
          ) : null}
          {status === 'cancelled' &&
          String(serviceRequest?.cancellationReason || '').trim() ? (
            <View style={styles.detailBlock}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                {String(t('active.cancelReason') || 'Reason')}
              </Text>
              <Text style={[styles.detailValueStack, {color: theme.error}]}>
                {String(serviceRequest.cancellationReason).trim()}
              </Text>
            </View>
          ) : null}
          {requestedDisplay ? (
            <View style={styles.detailBlock}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                {String(t('active.requested') || 'Requested')}
              </Text>
              <Text style={[styles.detailValueStack, {color: theme.text}]}>
                {requestedDisplay}
              </Text>
            </View>
          ) : null}
        </CrystalSurface>

          <RequestPhotoGallery
            photos={serviceRequest?.photos}
            theme={theme}
            title={String(t('jobDetails.customerPhotos') || t('activeService.photos') || 'Photos')}
          />
          <RequestPhotoGallery
            photos={
              (serviceRequest as any)?.completionPhotos ||
              (jobCard as any)?.completionPhotos
            }
            theme={theme}
            title={String(t('active.completionPhotos'))}
          />

          {status === 'completed' && submittedReview ? (
            <YourJobReview
              review={submittedReview}
              theme={theme}
              title={String(
                t('serviceHistory.yourReview') ||
                  t('review.yourRating') ||
                  'Your review',
              )}
            />
          ) : null}

          {/* Comments — shared with provider & admin once a job card exists */}
          {jobCardId && !String(jobCardId).startsWith('sr_') ? (
            <JobCardComments
              comments={(jobCard as any)?.comments || []}
              theme={theme}
              canComment={
                status === 'accepted' ||
                status === 'in-progress' ||
                status === 'completed'
              }
              title={String(
                t('active.updatesMessages') ||
                  t('jobCard.comments') ||
                  'Updates & messages',
              )}
              placeholder={String(
                t('jobCard.commentPlaceholder') || 'Write a message…',
              )}
              emptyText={String(
                t('jobCard.noComments') || 'No updates yet',
              )}
              postLabel={String(t('jobCard.postComment') || 'Send')}
              onSubmit={async text => {
                const updated = await jobCardsApi.addComment(jobCardId, text);
                setJobCard((prev: any) => ({
                  ...(prev || {}),
                  ...(updated as any),
                  comments: (updated as any).comments || [],
                }));
              }}
            />
          ) : null}
        </ScrollView>

      {status === 'in-progress' ||
      status === 'pending' ||
      status === 'rejected' ||
      status === 'accepted' ||
      status === 'completed' ? (
      <View
        style={[
          styles.stickyActions,
          {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            paddingBottom: Math.max(insets.bottom, 12),
          },
        ]}>
        {status === 'in-progress' ? (
          <>
            <Button
              title={String(t('activeService.verifyTaskCompleted'))}
              variant="primary"
              block
              onPress={handleVerifyCompletion}
              colors={{primary: theme.success, card: theme.card, text: '#fff', border: theme.success}}
            />
            {canCall ? (
              <Button
                title={callActionLabel}
                variant="secondary"
                block
                onPress={handleCallProvider}
                colors={{
                  primary: theme.primary,
                  card: theme.card,
                  text: theme.primary,
                  border: theme.primary,
                }}
                textStyle={{color: theme.primary}}
              />
            ) : null}
          </>
        ) : null}

        {status === 'pending' ? (
          <>
            {canReRequest ? (
              <Button
                title={String(t('activeService.reRequestService'))}
                variant="primary"
                block
                onPress={handleReRequest}
                disabled={loading}
                colors={{primary: theme.primary, card: theme.card, text: '#fff', border: theme.primary}}
              />
            ) : null}
            <Button
              title={String(t('active.editRequest') || t('activeRequest.edit') || 'Edit request')}
              variant="secondary"
              block
              onPress={() =>
                navigation.navigate('ServiceRequest', {
                  editServiceRequestId: serviceRequestId,
                  serviceType: serviceRequest?.serviceType,
                })
              }
              disabled={loading}
            />
            <Button
              title={String(t('active.cancelService') || t('activeService.cancelService'))}
              variant="secondary"
              block
              onPress={handleCancelService}
              disabled={loading}
              colors={{primary: theme.error, card: theme.card, text: theme.error, border: theme.error}}
              textStyle={{color: theme.error}}
              style={{borderColor: theme.error}}
            />
          </>
        ) : null}

        {status === 'rejected' ? (
          <>
            <Button
              title={String(t('activeService.chooseAnotherProvider'))}
              variant="primary"
              block
              onPress={() => navigation.navigate('Providers')}
              colors={{primary: theme.primary, card: theme.card, text: '#fff', border: theme.primary}}
            />
            <Button
              title={String(t('activeService.requestAgain'))}
              variant="secondary"
              block
              onPress={() =>
                navigation.navigate('Services', {
                  screen: 'ServiceRequest',
                  params: {requestMode: 'open'},
                })
              }
            />
          </>
        ) : null}

        {status === 'accepted' ? (
          <>
            {canCall ? (
              <Button
                title={callActionLabel}
                variant="primary"
                block
                onPress={handleCallProvider}
                colors={{primary: theme.primary, card: theme.card, text: '#fff', border: theme.primary}}
              />
            ) : null}
            <Button
              title={String(
                t('active.cancelService') || t('activeService.cancelService'),
              )}
              variant="secondary"
              block
              onPress={handleCancelService}
              disabled={loading}
              colors={{primary: theme.error, card: theme.card, text: theme.error, border: theme.error}}
              textStyle={{color: theme.error}}
              style={{borderColor: theme.error}}
            />
          </>
        ) : null}

        {status === 'completed' ? (
          <>
            {!submittedReview ? (
              <Button
                title={String(
                  t('review.ratePartner') ||
                    t('review.rateExperience') ||
                    t('jobCard.review') ||
                    'Rate your partner',
                )}
                variant="secondary"
                block
                onPress={() => setShowReviewModal(true)}
                colors={{
                  primary: theme.primary,
                  card: theme.card,
                  text: theme.primary,
                  border: theme.primary,
                }}
              />
            ) : null}
            {canRequestSamePartner ? (
              <Button
                title={String(
                  t('active.requestSamePartner') ||
                    t('activeService.requestAgain') ||
                    'Request same partner',
                )}
                variant="primary"
                block
                onPress={() => setShowRepeatPartnerConfirm(true)}
                colors={{
                  primary: theme.primary,
                  card: theme.card,
                  text: '#fff',
                  border: theme.primary,
                }}
              />
            ) : (
              <Button
                title={String(
                  t('active.requestAgain') ||
                    t('activeService.requestAgain') ||
                    'Request again',
                )}
                variant="primary"
                block
                onPress={() =>
                  navigation.navigate('Services', {
                    screen: 'ServiceRequest',
                    params: {
                      serviceType:
                        serviceRequest?.serviceType || jobCard?.serviceType,
                    },
                  })
                }
                colors={{
                  primary: theme.primary,
                  card: theme.card,
                  text: '#fff',
                  border: theme.primary,
                }}
              />
            )}
            <Button
              title={String(
                t('active.viewHistory') ||
                  t('activeService.viewHistory') ||
                  'View My Requests',
              )}
              variant="secondary"
              block
              onPress={() => navigation.navigate('ServiceHistory')}
              colors={{
                primary: theme.primary,
                card: theme.card,
                text: theme.primary,
                border: theme.primary,
              }}
            />
          </>
        ) : null}
      </View>
      ) : null}

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
            const id = jobCardId || jobCard?.id;
            if (id) {
              void getJobCardReview(String(id)).then(r => {
                if (r) setSubmittedReview(r);
              });
            }
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

      <ConfirmationModal
        visible={showRepeatPartnerConfirm}
        title={String(
          t('active.requestSamePartnerConfirmTitle') ||
            'Request this partner again?',
        )}
        message={String(
          t('active.requestSamePartnerConfirmBody', {
            name: providerDisplayName,
            service: serviceLabel,
          }) ||
            `Do you want to request ${providerDisplayName} again for ${serviceLabel}?`,
        )}
        confirmText={String(t('common.continue') || t('actions.continue') || 'Continue')}
        cancelText={String(t('common.cancel') || 'Cancel')}
        type="info"
        icon="refresh"
        onConfirm={() => {
          setShowRepeatPartnerConfirm(false);
          setShowRepeatPartnerRequest(true);
        }}
        onCancel={() => setShowRepeatPartnerConfirm(false)}
      />

      <ProviderRequestModal
        visible={showRepeatPartnerRequest && Boolean(repeatPartner)}
        provider={repeatPartner}
        requestedServiceType={
          serviceRequest?.serviceType || jobCard?.serviceType || undefined
        }
        onClose={() => setShowRepeatPartnerRequest(false)}
        onSuccess={newId => {
          setShowRepeatPartnerRequest(false);
          navigation.replace('ActiveService', {serviceRequestId: newId});
        }}
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

      <Toast
        visible={showToast}
        message={toastMessage}
        type="info"
        duration={3500}
        onHide={() => setShowToast(false)}
      />
    </KeyboardAvoidingView>
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
    height: 'auto',
    minHeight: 0,
    backgroundColor: 'transparent',
    justifyContent: 'flex-start',
    alignItems: 'stretch',
  },
  statusHero: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  mapPlaceholder: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    gap: 12,
  },
  statusHeroCopy: {
    flex: 1,
    minWidth: 0,
  },
  mapPlaceholderText: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'left',
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'left',
    lineHeight: 20,
  },
  presenceText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  mapPlaceholderDistance: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    fontWeight: '600',
  },
  distanceIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    marginHorizontal: 16,
    marginTop: -20,
  },
  statusCardInner: {
    padding: 16,
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
  },
  pageContent: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 28,
    gap: 12,
  },
  heroCard: {
    marginHorizontal: 0,
  },
  heroInner: {
    padding: 12,
    gap: 8,
  },
  heroTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  heroIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  heroBell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 18,
    marginLeft: 44,
  },
  heroService: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginLeft: 44,
  },
  statusStepsWrap: {
    marginLeft: 44,
    marginTop: 4,
    gap: 8,
  },
  statusStepsTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  statusStepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  statusStepItem: {
    alignItems: 'center',
    gap: 4,
    minWidth: 52,
  },
  statusStepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusStepCurrentInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusStepLine: {
    height: 2,
    flex: 1,
    minWidth: 12,
    marginHorizontal: 2,
    marginBottom: 16,
    borderRadius: 1,
  },
  statusStepLabel: {
    fontSize: 11,
    maxWidth: 72,
    textAlign: 'center',
  },
  heroReassure: {
    fontSize: 12,
    lineHeight: 17,
    marginLeft: 44,
    fontWeight: '500',
  },
  pinBox: {
    marginTop: 4,
    marginLeft: 44,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  pinBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  pinBoxValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 6,
  },
  pinBoxHint: {
    fontSize: 11,
    lineHeight: 15,
  },
  detailCard: {
    marginHorizontal: 0,
  },
  detailCardInner: {
    padding: 12,
    gap: 10,
  },
  contactHint: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  detailGridRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  detailBlock: {
    gap: 4,
  },
  detailAddress: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  detailValueStack: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  detailTime: {
    fontSize: 12,
    marginTop: 2,
  },
  detailsContent: {
    paddingBottom: 24,
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
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  providerInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 0,
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
    fontSize: 17,
    fontWeight: '700',
    flexShrink: 1,
  },
  serviceType: {
    fontSize: 13,
    marginTop: 2,
    flexShrink: 1,
  },
  providerLoc: {
    fontSize: 12,
    marginTop: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  rating: {
    fontSize: 13,
    fontWeight: '600',
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
  stickyActions: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
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

