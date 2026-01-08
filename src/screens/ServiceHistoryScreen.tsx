/**
 * Service History Screen
 * Customer app - View past service requests
 * Shows completed services with review option
 */

import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
  FlatList,
} from 'react-native';
import AlertModal from '../components/AlertModal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {getCustomerJobCards, JobCard} from '../services/jobCardService';
import {getJobCardReview, getProviderReviews, Review} from '../services/reviewService';
import ReviewModal from '../components/ReviewModal';
import {fetchServiceCategories, ServiceCategory} from '../services/serviceCategoriesService';
import firestore from '@react-native-firebase/firestore';
import useTranslation from '../hooks/useTranslation';

type FilterType = 'all' | 'pending' | 'accepted' | 'in-progress' | 'completed';
type DateFilterType = 'all' | 'today' | 'week' | 'month';

export default function ServiceHistoryScreen({navigation}: any) {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('all');
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [showDateFilterModal, setShowDateFilterModal] = useState(false);
  const [showCompletedServiceModal, setShowCompletedServiceModal] = useState(false);
  const [selectedCompletedService, setSelectedCompletedService] = useState<JobCard | null>(null);
  const [providerDetails, setProviderDetails] = useState<{
    phone?: string;
    address?: any;
  } | null>(null);
  const [providerReview, setProviderReview] = useState<Review | null>(null);
  const [loadingProviderDetails, setLoadingProviderDetails] = useState(false);
  const [providerPhones, setProviderPhones] = useState<Record<string, string>>({});
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

  useEffect(() => {
    loadJobCards();
    loadServiceCategories();
  }, []);

  const loadServiceCategories = async () => {
    try {
      const categories = await fetchServiceCategories();
      setServiceCategories(categories);
    } catch (error) {
      console.error('Error loading service categories:', error);
    }
  };

  const loadJobCards = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log('📋 Loading job cards for customer:', user.uid);

      // Fetch job cards by customerId
      let cardsByCustomerId = await getCustomerJobCards(user.uid);
      console.log(`✅ Loaded ${cardsByCustomerId.length} job cards by customerId`);

      // ALWAYS fetch by phone number as well and merge results
      let cardsByPhone: JobCard[] = [];
      if (user.phoneNumber) {
        console.log('🔍 Also fetching by phone number:', user.phoneNumber);
        try {
          const phoneSnapshot = await firestore()
            .collection('jobCards')
            .where('customerPhone', '==', user.phoneNumber)
            .get();

          cardsByPhone = phoneSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data?.createdAt?.toDate() || new Date(),
              updatedAt: data?.updatedAt?.toDate() || new Date(),
              scheduledTime: data?.scheduledTime?.toDate(),
              pinGeneratedAt: data?.pinGeneratedAt?.toDate(),
              taskPIN: data?.taskPIN,
            };
          }) as JobCard[];

          console.log(`✅ Found ${cardsByPhone.length} cards by phone number`);
        } catch (error) {
          console.error('❌ Error fetching by phone:', error);
        }
      }

      // Merge and deduplicate cards (prefer cardsByPhone if duplicate IDs)
      const cardsMap = new Map<string, JobCard>();

      // Add cards by customerId first
      cardsByCustomerId.forEach(card => {
        if (card.id) cardsMap.set(card.id, card);
      });

      // Add/override with cards by phone (in case customerId is wrong but phone is correct)
      cardsByPhone.forEach(card => {
        if (card.id) cardsMap.set(card.id, card);
      });

      const cards = Array.from(cardsMap.values());
      console.log(`📊 Total unique cards after merge: ${cards.length}`);

      // DEBUG: Directly query Firestore to see ALL job cards
      console.log('🔍 DEBUG: Current user ID:', user.uid);
      console.log('🔍 DEBUG: User phone:', user.phoneNumber);

      const debugSnapshot = await firestore()
        .collection('jobCards')
        .where('customerId', '==', user.uid)
        .get();
      console.log('🔍 DEBUG: Total job cards in Firestore (by customerId):', debugSnapshot.size);
      const debugStatuses = debugSnapshot.docs.map(doc => doc.data().status);
      console.log('🔍 DEBUG: All statuses in Firestore:', debugStatuses);
      const debugAcceptedCount = debugStatuses.filter(s => s === 'accepted').length;
      console.log('🔍 DEBUG: Accepted count in Firestore:', debugAcceptedCount);

      // Check if there are job cards with different customerId but same phone
      if (user.phoneNumber) {
        const phoneSnapshot = await firestore()
          .collection('jobCards')
          .where('customerPhone', '==', user.phoneNumber)
          .get();
        console.log('🔍 DEBUG: Job cards by phone:', phoneSnapshot.size);
        phoneSnapshot.docs.forEach(doc => {
          const data = doc.data();
          console.log(`  - ID: ${doc.id}, customerId: ${data.customerId}, status: ${data.status}`);
        });
      }

      // Debug: Log unique status values
      const uniqueStatuses = new Set(cards.map(card => card.status));
      console.log('📊 Unique status values:', Array.from(uniqueStatuses));

      // Debug: Count by status
      const statusCounts = {
        pending: cards.filter(c => c.status === 'pending').length,
        accepted: cards.filter(c => c.status === 'accepted').length,
        'in-progress': cards.filter(c => c.status === 'in-progress').length,
        completed: cards.filter(c => c.status === 'completed').length,
      };
      console.log('📈 Status counts (raw):', statusCounts);

      // Debug: Log all accepted cards details
      const acceptedCards = cards.filter(c => c.status === 'accepted');
      console.log('✅ Accepted cards:', acceptedCards.length);
      acceptedCards.forEach((card, index) => {
        console.log(`  ${index + 1}. ID: ${card.id}, Status: "${card.status}", Provider: ${card.providerName || 'N/A'}`);
      });

      // Debug: Log normalized status counts
      const normalizedCounts = {
        pending: cards.filter(c => normalizeStatus(c.status) === 'pending').length,
        accepted: cards.filter(c => normalizeStatus(c.status) === 'accepted').length,
        'in-progress': cards.filter(c => normalizeStatus(c.status) === 'in-progress').length,
        completed: cards.filter(c => normalizeStatus(c.status) === 'completed').length,
      };
      console.log('📊 Status counts (normalized):', normalizedCounts);

      // Use job cards directly
      const allCards = cards;
      
      // Sort by createdAt descending
      allCards.sort((a, b) => {
        const aTime = a.createdAt.getTime();
        const bTime = b.createdAt.getTime();
        return bTime - aTime;
      });
      
      // Fetch provider phones for all cards
      const phoneMap: Record<string, string> = {};
      const providerIds = new Set(allCards.map(card => card.providerId).filter(Boolean));
      
      await Promise.all(
        Array.from(providerIds).map(async (providerId) => {
          if (providerId) {
            try {
              const providerDoc = await firestore()
                .collection('providers')
                .doc(providerId)
                .get();
              if (providerDoc.exists) {
                const providerData = providerDoc.data();
                const phone = providerData?.phone || providerData?.primaryPhone || providerData?.phoneNumber;
                if (phone) {
                  phoneMap[providerId] = phone;
                  console.log(`✅ Fetched phone for provider ${providerId}: ${phone}`);
                }
              } else {
                console.warn(`Provider document not found: ${providerId}`);
              }
            } catch (error) {
              console.error(`Error fetching phone for provider ${providerId}:`, error);
            }
          }
        })
      );
      console.log(`✅ Fetched ${Object.keys(phoneMap).length} provider phone numbers`);
      setProviderPhones(phoneMap);
      
      console.log(`✅ Total cards to display: ${allCards.length}`);
      setJobCards(allCards);
    } catch (error: any) {
      console.error('❌ Error loading job cards:', error);
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('serviceHistory.failedToLoad'),
        type: 'error',
      });
      setJobCards([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadJobCards();
  };

  const loadProviderDetailsAndReview = async (jobCard: JobCard) => {
    if (!jobCard.providerId) return;
    
    setLoadingProviderDetails(true);
    try {
      // Fetch provider details
      const providerDoc = await firestore()
        .collection('providers')
        .doc(jobCard.providerId)
        .get();
      
      if (providerDoc.exists) {
        const providerData = providerDoc.data();
        setProviderDetails({
          phone: providerData?.phone || providerData?.primaryPhone,
          address: providerData?.address || providerData?.homeAddress || providerData?.officeAddress,
        });
      }

      // Fetch review for this job card
      if (jobCard.id) {
        const review = await getJobCardReview(jobCard.id);
        setProviderReview(review);
      }
    } catch (error) {
      console.error('Error loading provider details:', error);
    } finally {
      setLoadingProviderDetails(false);
    }
  };

  const handleCallProvider = (phoneNumber?: string) => {
    if (!phoneNumber) {
      setAlertModal({
        visible: true,
        title: t('serviceHistory.phoneNotAvailable'),
        message: t('serviceHistory.phoneNotAvailableMessage'),
        type: 'warning',
      });
      return;
    }
    
    const phone = phoneNumber.replace(/[^\d+]/g, ''); // Remove non-digit characters except +
    const phoneUrl = `tel:${phone}`;
    
    Linking.canOpenURL(phoneUrl)
      .then(supported => {
        if (supported) {
          return Linking.openURL(phoneUrl);
        } else {
          setAlertModal({
            visible: true,
            title: t('common.error'),
            message: t('serviceHistory.unableToCall'),
            type: 'error',
          });
        }
      })
      .catch(err => {
        console.error('Error opening phone dialer:', err);
        setAlertModal({
          visible: true,
          title: t('common.error'),
          message: t('serviceHistory.failedToOpenDialer'),
          type: 'error',
        });
      });
  };

  const handleReview = async (jobCard: JobCard) => {
    // Check if review exists
    const existingReview = await getJobCardReview(jobCard.id || '');
    if (existingReview) {
      setAlertModal({
        visible: true,
        title: t('serviceHistory.alreadyReviewed'),
        message: t('serviceHistory.alreadyReviewedMessage'),
        type: 'info',
      });
      return;
    }

    setSelectedJobCard(jobCard);
    setShowReviewModal(true);
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus = normalizeStatus(status);
    switch (normalizedStatus) {
      case 'completed':
        return '#34C759';
      case 'in-progress':
        return '#FF6B35';
      case 'accepted':
        return '#FF9500';
      case 'pending':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  const normalizeStatus = (status: string): 'pending' | 'accepted' | 'in-progress' | 'completed' => {
    const lowerStatus = status?.toLowerCase() || '';

    // Completed statuses
    if (lowerStatus === 'completed' || lowerStatus === 'done' || lowerStatus === 'finished') {
      return 'completed';
    }

    // In-progress statuses
    if (lowerStatus === 'in-progress' || lowerStatus === 'in progress' ||
        lowerStatus === 'inprogress' || lowerStatus === 'active' ||
        lowerStatus === 'ongoing' || lowerStatus === 'started') {
      return 'in-progress';
    }

    // Accepted statuses
    if (lowerStatus === 'accepted' || lowerStatus === 'confirmed' ||
        lowerStatus === 'assigned' || lowerStatus === 'provider-accepted') {
      return 'accepted';
    }

    // Everything else (pending, waiting, new, cancelled, etc.) is treated as pending
    return 'pending';
  };

  const getStatusText = (status: string) => {
    const normalizedStatus = normalizeStatus(status);
    switch (normalizedStatus) {
      case 'completed':
        return t('services.completed');
      case 'in-progress':
        return t('services.inProgress');
      case 'accepted':
        return t('services.accepted');
      case 'pending':
        return t('services.pending');
      default:
        return t('services.pending');
    }
  };

  const formatDate = (date: Date | any) => {
    try {
      // Return early if date is null, undefined, or empty
      if (!date) {
        return t('serviceHistory.dateNotAvailable');
      }
      
      let dateObj: Date;
      if (date instanceof Date) {
        dateObj = date;
      } else if (date && typeof date.toDate === 'function') {
        // Firestore Timestamp
        dateObj = date.toDate();
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return t('serviceHistory.dateNotAvailable');
      }
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        return t('serviceHistory.dateNotAvailable');
      }
      
      return dateObj.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
    } catch (error) {
      console.warn('Error formatting date:', error, date);
      return 'Date not available';
    }
  };

  // Separate active and completed cards - compute before hooks
  const activeCards = useMemo(() => 
    jobCards.filter(card => 
      ['pending', 'accepted', 'in-progress'].includes(card.status)
    ), [jobCards]);
  
  const completedCards = useMemo(() => 
    jobCards.filter(card => 
      card.status === 'completed' || card.status === 'cancelled'
    ), [jobCards]);

  // Get unique service types from job cards
  const availableServiceTypes = useMemo(() => {
    const types = new Set(jobCards.map(card => card.serviceType).filter(Boolean));
    return Array.from(types).sort();
  }, [jobCards]);

  // Filter cards based on all selected filters
  const filteredCards = useMemo(() => {
    let filtered = jobCards;

    // Status filter
    switch (filter) {
      case 'pending':
        filtered = jobCards.filter(card => normalizeStatus(card.status) === 'pending');
        break;
      case 'accepted':
        filtered = jobCards.filter(card => normalizeStatus(card.status) === 'accepted');
        break;
      case 'in-progress':
        filtered = jobCards.filter(card => normalizeStatus(card.status) === 'in-progress');
        break;
      case 'completed':
        filtered = jobCards.filter(card => normalizeStatus(card.status) === 'completed');
        break;
      default:
        filtered = jobCards;
    }

    // Service type filter
    if (serviceTypeFilter !== 'all') {
      filtered = filtered.filter(card => card.serviceType === serviceTypeFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);

      filtered = filtered.filter(card => {
        const cardDate = card.createdAt instanceof Date ? card.createdAt : new Date(card.createdAt);
        
        switch (dateFilter) {
          case 'today':
            return cardDate >= today;
          case 'week':
            return cardDate >= weekAgo;
          case 'month':
            return cardDate >= monthAgo;
          default:
            return true;
        }
      });
    }

    return filtered;
  }, [jobCards, filter, serviceTypeFilter, dateFilter]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.centerContent, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary, marginTop: 16}]}>
          {t('serviceHistory.loading')}
        </Text>
      </View>
    );
  }

  const allCount = jobCards.length;
  const pendingCount = jobCards.filter(card => normalizeStatus(card.status) === 'pending').length;
  const acceptedCount = jobCards.filter(card => normalizeStatus(card.status) === 'accepted').length;
  const inProgressCount = jobCards.filter(card => normalizeStatus(card.status) === 'in-progress').length;
  const completedCount = jobCards.filter(card => normalizeStatus(card.status) === 'completed').length;
  const filteredCount = filteredCards.length;

  const getSelectedServiceTypeName = () => {
    if (serviceTypeFilter === 'all') return t('serviceHistory.allServices');
    return serviceCategories.find(cat => cat.name === serviceTypeFilter)?.name || serviceTypeFilter;
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return t('serviceHistory.today');
      case 'week': return t('serviceHistory.thisWeek');
      case 'month': return t('serviceHistory.thisMonth');
      default: return t('serviceHistory.allTime');
    }
  };

  const renderServiceCard = (jobCard: JobCard) => (
    <TouchableOpacity
      key={jobCard.id}
      style={[styles.jobCard, {backgroundColor: theme.card}]}
      onPress={() => {
        if (jobCard.status === 'completed') {
          setSelectedCompletedService(jobCard);
          setShowCompletedServiceModal(true);
        } else {
          navigation.navigate('ActiveService', {
            serviceRequestId: jobCard.consultationId || jobCard.bookingId,
            jobCardId: jobCard.id,
          });
        }
      }}>
      {/* Header */}
      <View style={styles.jobCardHeader}>
        <View style={styles.serviceTypeContainer}>
          <Icon name="build" size={24} color={theme.primary} />
          <View style={styles.serviceTypeText}>
            <Text style={[styles.serviceType, {color: theme.text}]}>
              {jobCard.serviceType}
            </Text>
            <Text style={[styles.providerName, {color: theme.textSecondary}]}>
              {jobCard.providerName || t('serviceHistory.waitingForProvider')}
            </Text>

            {/* Show provider phone for accepted and in-progress status */}
            {(normalizeStatus(jobCard.status) === 'accepted' || normalizeStatus(jobCard.status) === 'in-progress') &&
             providerPhones[jobCard.providerId] && (
              <View style={styles.providerPhoneRow}>
                <Icon name="phone" size={14} color={theme.primary} />
                <Text style={[styles.providerPhone, {color: theme.textSecondary}]}>
                  {providerPhones[jobCard.providerId]}
                </Text>
                <TouchableOpacity
                  style={[styles.callButton, {backgroundColor: theme.primary}]}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleCallProvider(providerPhones[jobCard.providerId]);
                  }}>
                  <Icon name="phone" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
            )}

            {/* Show PIN for in-progress status */}
            {normalizeStatus(jobCard.status) === 'in-progress' && (jobCard as any).taskPIN && (
              <View style={[styles.pinDisplayCard, {backgroundColor: theme.primary + '15', borderColor: theme.primary}]}>
                <Icon name="lock" size={16} color={theme.primary} />
                <Text style={[styles.pinLabel, {color: theme.textSecondary}]}>
                  {t('jobCard.yourVerificationPIN')}
                </Text>
                <Text style={[styles.pinValue, {color: theme.primary}]}>
                  {(jobCard as any).taskPIN}
                </Text>
                <Text style={[styles.pinInstruction, {color: theme.textSecondary}]}>
                  {t('jobCard.sharePIN')}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.statusChipsContainer}>
          <View
            style={[
              styles.statusBadge,
              {backgroundColor: getStatusColor(jobCard.status) + '20'},
            ]}>
            <Text
              style={[
                styles.statusText,
                {color: getStatusColor(jobCard.status)},
              ]}>
              {getStatusText(jobCard.status)}
            </Text>
          </View>
          {/* Service Type Chip */}
          {(() => {
            const urgency = (jobCard as any).urgency;
            if (urgency === 'immediate') {
              return (
                <View style={[styles.serviceTypeChip, {backgroundColor: '#FF9500' + '20'}]}>
                  <Text style={[styles.serviceTypeChipText, {color: '#FF9500'}]}>
                    {t('services.immediate')}
                  </Text>
                </View>
              );
            }
            if (urgency === 'scheduled') {
              return (
                <View style={[styles.serviceTypeChip, {backgroundColor: '#007AFF' + '20'}]}>
                  <Text style={[styles.serviceTypeChipText, {color: '#007AFF'}]}>
                    {t('services.scheduled')}
                  </Text>
                </View>
              );
            }
            const hasScheduledTime = jobCard.scheduledTime && jobCard.scheduledTime instanceof Date && !isNaN(jobCard.scheduledTime.getTime());
            const isImmediate = !hasScheduledTime;
            return (
              <View style={[styles.serviceTypeChip, {backgroundColor: isImmediate ? '#FF9500' + '20' : '#007AFF' + '20'}]}>
                <Text style={[styles.serviceTypeChipText, {color: isImmediate ? '#FF9500' : '#007AFF'}]}>
                  {isImmediate ? t('services.immediate') : t('services.scheduled')}
                </Text>
              </View>
            );
          })()}
        </View>
      </View>

      {/* Problem */}
      {jobCard.problem && (
        <Text style={[styles.problemText, {color: theme.text}]} numberOfLines={2}>
          {jobCard.problem}
        </Text>
      )}

      {/* Address */}
      {jobCard.customerAddress && (
        <View style={styles.addressRow}>
          <Icon name="location-on" size={16} color={theme.textSecondary} />
          <Text style={[styles.addressText, {color: theme.textSecondary}]} numberOfLines={1}>
            {jobCard.customerAddress.address}
            {jobCard.customerAddress.pincode && `, ${jobCard.customerAddress.pincode}`}
          </Text>
        </View>
      )}

      {/* Date */}
      <View style={styles.dateRow}>
        <Icon name="calendar-today" size={16} color={theme.textSecondary} />
        <Text style={[styles.dateText, {color: theme.textSecondary}]}>
          {formatDate(jobCard.scheduledTime || jobCard.createdAt)}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actionsRow}>
        {jobCard.status === 'completed' && (
          <TouchableOpacity
            style={styles.reviewButton}
            onPress={(e) => {
              e.stopPropagation();
              handleReview(jobCard);
            }}>
            <Icon name="star" size={16} color="#FFD700" />
            <Text style={styles.reviewButtonText}>{t('jobCard.review')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.viewButton}>
          <Text style={[styles.viewButtonText, {color: theme.primary}]}>
            {t('jobCard.viewDetails')}
          </Text>
          <Icon name="chevron-right" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Header */}
      <View style={[styles.header, {backgroundColor: theme.card, borderBottomColor: theme.border}]}>
        <Text style={[styles.headerTitle, {color: theme.text}]}>{t('services.myServices')}</Text>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'all' && styles.filterButtonActive,
              {backgroundColor: filter === 'all' ? theme.primary : theme.card},
            ]}
            onPress={() => setFilter('all')}>
            <Text
              style={[
                styles.filterButtonText,
                {color: filter === 'all' ? '#fff' : theme.text},
              ]}>
              {t('common.all')} ({allCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'pending' && styles.filterButtonActive,
              {backgroundColor: filter === 'pending' ? theme.primary : theme.card},
            ]}
            onPress={() => setFilter('pending')}>
            <Text
              style={[
                styles.filterButtonText,
                {color: filter === 'pending' ? '#fff' : theme.text},
              ]}>
              {t('services.pending')} ({pendingCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'accepted' && styles.filterButtonActive,
              {backgroundColor: filter === 'accepted' ? theme.primary : theme.card},
            ]}
            onPress={() => setFilter('accepted')}>
            <Text
              style={[
                styles.filterButtonText,
                {color: filter === 'accepted' ? '#fff' : theme.text},
              ]}>
              {t('services.accepted')} ({acceptedCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'in-progress' && styles.filterButtonActive,
              {backgroundColor: filter === 'in-progress' ? theme.primary : theme.card},
            ]}
            onPress={() => setFilter('in-progress')}>
            <Text
              style={[
                styles.filterButtonText,
                {color: filter === 'in-progress' ? '#fff' : theme.text},
              ]}>
              {t('services.inProgress')} ({inProgressCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'completed' && styles.filterButtonActive,
              {backgroundColor: filter === 'completed' ? theme.primary : theme.card},
            ]}
            onPress={() => setFilter('completed')}>
            <Text
              style={[
                styles.filterButtonText,
                {color: filter === 'completed' ? '#fff' : theme.text},
              ]}>
              {t('services.completed')} ({completedCount})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Additional Filters Row */}
      <View style={styles.additionalFiltersContainer}>
        <TouchableOpacity
          style={[styles.additionalFilterButton, {backgroundColor: theme.card}]}
          onPress={() => setShowServiceTypeModal(true)}>
          <Icon name="build" size={18} color={theme.primary} />
          <Text style={[styles.additionalFilterText, {color: theme.text}]}>
            {getSelectedServiceTypeName()}
          </Text>
          <Icon name="arrow-drop-down" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.additionalFilterButton, {backgroundColor: theme.card}]}
          onPress={() => setShowDateFilterModal(true)}>
          <Icon name="calendar-today" size={18} color={theme.primary} />
          <Text style={[styles.additionalFilterText, {color: theme.text}]}>
            {getDateFilterLabel()}
          </Text>
          <Icon name="arrow-drop-down" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        {(serviceTypeFilter !== 'all' || dateFilter !== 'all') && (
          <TouchableOpacity
            style={[styles.clearFiltersButton, {backgroundColor: theme.card}]}
            onPress={() => {
              setServiceTypeFilter('all');
              setDateFilter('all');
            }}>
            <Icon name="clear" size={18} color={theme.textSecondary} />
            <Text style={[styles.clearFiltersText, {color: theme.textSecondary}]}>
              {t('serviceHistory.clear')}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Service Cards List */}
      {filteredCards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name={filter === 'pending' ? 'schedule' : filter === 'accepted' ? 'check-circle' : filter === 'completed' ? 'check-circle' : 'history'}
            size={64}
            color={theme.textSecondary}
          />
          <Text style={[styles.emptyText, {color: theme.text}]}>
            {filter === 'pending'
              ? t('services.noPendingServices')
              : filter === 'accepted'
              ? t('services.noAcceptedServices')
              : filter === 'completed'
              ? t('services.noCompletedServices')
              : t('services.noServices')}
          </Text>
          <Text style={[styles.emptySubtext, {color: theme.textSecondary}]}>
            {filter === 'pending'
              ? t('services.noPendingServices')
              : filter === 'accepted'
              ? t('services.noAcceptedServices')
              : filter === 'completed'
              ? t('services.noCompletedServices')
              : t('services.noServices')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCards}
          keyExtractor={(item) => item.id}
          renderItem={({item}) => renderServiceCard(item)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      {/* Service Type Filter Modal */}
      <Modal
        visible={showServiceTypeModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowServiceTypeModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                {t('serviceHistory.filterByServiceType')}
              </Text>
              <TouchableOpacity onPress={() => setShowServiceTypeModal(false)}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  serviceTypeFilter === 'all' && styles.modalOptionSelected,
                  {backgroundColor: serviceTypeFilter === 'all' ? theme.primary + '20' : 'transparent'},
                ]}
                onPress={() => {
                  setServiceTypeFilter('all');
                  setShowServiceTypeModal(false);
                }}>
                <Text style={[
                  styles.modalOptionText,
                  {color: serviceTypeFilter === 'all' ? theme.primary : theme.text},
                ]}>
                  All Services
                </Text>
                {serviceTypeFilter === 'all' && (
                  <Icon name="check-circle" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
              {availableServiceTypes.map(serviceType => (
                <TouchableOpacity
                  key={serviceType}
                  style={[
                    styles.modalOption,
                    serviceTypeFilter === serviceType && styles.modalOptionSelected,
                    {backgroundColor: serviceTypeFilter === serviceType ? theme.primary + '20' : 'transparent'},
                  ]}
                  onPress={() => {
                    setServiceTypeFilter(serviceType);
                    setShowServiceTypeModal(false);
                  }}>
                  <Text style={[
                    styles.modalOptionText,
                    {color: serviceTypeFilter === serviceType ? theme.primary : theme.text},
                  ]}>
                    {serviceType}
                  </Text>
                  {serviceTypeFilter === serviceType && (
                    <Icon name="check-circle" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Date Filter Modal */}
      <Modal
        visible={showDateFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDateFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, {color: theme.text}]}>
                {t('serviceHistory.filterByDate')}
              </Text>
              <TouchableOpacity 
                onPress={() => setShowDateFilterModal(false)}
                style={{padding: 4}}>
                <Icon name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalScrollView}>
              {(['all', 'today', 'week', 'month'] as DateFilterType[]).map(dateFilterOption => (
                <TouchableOpacity
                  key={dateFilterOption}
                  style={[
                    styles.modalOption,
                    dateFilter === dateFilterOption && styles.modalOptionSelected,
                    {backgroundColor: dateFilter === dateFilterOption ? theme.primary + '20' : 'transparent'},
                  ]}
                  onPress={() => {
                    setDateFilter(dateFilterOption);
                    setShowDateFilterModal(false);
                  }}>
                  <Text style={[
                    styles.modalOptionText,
                    {color: dateFilter === dateFilterOption ? theme.primary : theme.text},
                  ]}>
                    {dateFilterOption === 'all' ? 'All Time' :
                     dateFilterOption === 'today' ? 'Today' :
                     dateFilterOption === 'week' ? 'This Week' :
                     'This Month'}
                  </Text>
                  {dateFilter === dateFilterOption && (
                    <Icon name="check-circle" size={24} color={theme.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Review Modal */}
      {selectedJobCard && (
        <ReviewModal
          visible={showReviewModal}
          jobCardId={selectedJobCard.id || ''}
          providerName={selectedJobCard.providerName}
          serviceType={selectedJobCard.serviceType}
          onReviewSubmitted={() => {
            setShowReviewModal(false);
            setSelectedJobCard(null);
            loadJobCards(); // Refresh to show review status
          }}
          onSkip={() => {
            setShowReviewModal(false);
            setSelectedJobCard(null);
          }}
        />
      )}

      {/* Alert Modal */}
      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({...alertModal, visible: false})}
      />

      {/* Completed Service Details Modal */}
      <Modal
        visible={showCompletedServiceModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCompletedServiceModal(false)}>
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCompletedServiceModal(false)}>
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}>
            <View style={[styles.completedServiceModal, {backgroundColor: theme.card}]}>
              {/* Drag Indicator */}
              <View style={styles.dragIndicator} />

              {/* Header with gradient background */}
              <View style={[styles.completedModalHeader, {backgroundColor: theme.primary}]}>
                <View style={styles.completedHeaderContent}>
                  <View style={styles.completedHeaderIcon}>
                    <Icon name="check-circle" size={32} color="#fff" />
                  </View>
                  <View style={styles.completedHeaderText}>
                    <Text style={styles.completedModalTitle}>
                      Service Completed
                    </Text>
                    <Text style={styles.completedModalSubtitle}>
                      View service details below
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.closeIconButton}
                  onPress={() => setShowCompletedServiceModal(false)}>
                  <Icon name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              {selectedCompletedService && (
                <ScrollView
                  style={styles.completedServiceContent}
                  contentContainerStyle={styles.completedServiceContentContainer}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}>

                  {/* Service Type Card */}
                  <View style={[styles.detailCard, {backgroundColor: theme.background}]}>
                    <View style={styles.detailCardHeader}>
                      <Icon name="build" size={24} color={theme.primary} />
                      <Text style={[styles.detailCardTitle, {color: theme.text}]}>
                        Service Information
                      </Text>
                    </View>
                    <Text style={[styles.detailCardValue, {color: theme.text}]}>
                      {selectedCompletedService.serviceType}
                    </Text>
                  </View>

                  {/* Provider Card */}
                  <View style={[styles.detailCard, {backgroundColor: theme.background}]}>
                    <View style={styles.detailCardHeader}>
                      <Icon name="person" size={24} color={theme.primary} />
                      <Text style={[styles.detailCardTitle, {color: theme.text}]}>
                        Service Provider
                      </Text>
                    </View>
                    <Text style={[styles.detailCardValue, {color: theme.text}]}>
                      {selectedCompletedService.providerName}
                    </Text>
                    {providerDetails?.phone && (
                      <View style={styles.providerContactRow}>
                        <Icon name="phone" size={18} color={theme.primary} />
                        <Text style={[styles.providerPhoneText, {color: theme.textSecondary}]}>
                          {providerDetails.phone}
                        </Text>
                        <TouchableOpacity
                          style={[styles.modalCallButton, {backgroundColor: theme.primary}]}
                          onPress={() => handleCallProvider(providerDetails.phone)}>
                          <Icon name="phone" size={16} color="#fff" />
                          <Text style={styles.modalCallButtonText}>Call</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* Provider Address Card */}
                  {providerDetails?.address && (
                    <View style={[styles.detailCard, {backgroundColor: theme.background}]}>
                      <View style={styles.detailCardHeader}>
                        <Icon name="home" size={24} color={theme.primary} />
                        <Text style={[styles.detailCardTitle, {color: theme.text}]}>
                          Provider Address
                        </Text>
                      </View>
                      <Text style={[styles.detailCardValue, {color: theme.textSecondary}]}>
                        {typeof providerDetails.address === 'string'
                          ? providerDetails.address
                          : providerDetails.address.address
                          ? `${providerDetails.address.address}${providerDetails.address.city ? ', ' + providerDetails.address.city : ''}${providerDetails.address.state ? ', ' + providerDetails.address.state : ''}${providerDetails.address.pincode ? ' - ' + providerDetails.address.pincode : ''}`
                          : 'N/A'}
                      </Text>
                    </View>
                  )}

                  {/* Review Card */}
                  {providerReview && (
                    <View style={[styles.detailCard, {backgroundColor: theme.background}]}>
                      <View style={styles.detailCardHeader}>
                        <Icon name="star" size={24} color={theme.primary} />
                        <Text style={[styles.detailCardTitle, {color: theme.text}]}>
                          Your Review
                        </Text>
                      </View>
                      <View style={styles.reviewRatingRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Icon
                            key={star}
                            name={star <= providerReview.rating ? 'star' : 'star-border'}
                            size={20}
                            color={star <= providerReview.rating ? '#FFD700' : theme.textSecondary}
                          />
                        ))}
                        <Text style={[styles.reviewRatingText, {color: theme.textSecondary}]}>
                          {providerReview.rating}/5
                        </Text>
                      </View>
                      {providerReview.comment && (
                        <Text style={[styles.reviewComment, {color: theme.textSecondary}]}>
                          "{providerReview.comment}"
                        </Text>
                      )}
                    </View>
                  )}

                  {/* Date Card */}
                  {selectedCompletedService.createdAt && (
                    <View style={[styles.detailCard, {backgroundColor: theme.background}]}>
                      <View style={styles.detailCardHeader}>
                        <Icon name="calendar-today" size={24} color={theme.primary} />
                        <Text style={[styles.detailCardTitle, {color: theme.text}]}>
                          Service Date
                        </Text>
                      </View>
                      <Text style={[styles.detailCardValue, {color: theme.text}]}>
                        {new Date(selectedCompletedService.createdAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                  )}

                  {/* Problem/Description Card */}
                  {selectedCompletedService.problem && (
                    <View style={[styles.detailCard, {backgroundColor: theme.background}]}>
                      <View style={styles.detailCardHeader}>
                        <Icon name="description" size={24} color={theme.primary} />
                        <Text style={[styles.detailCardTitle, {color: theme.text}]}>
                          Service Details
                        </Text>
                      </View>
                      <Text style={[styles.detailCardValue, {color: theme.textSecondary}]}>
                        {selectedCompletedService.problem}
                      </Text>
                    </View>
                  )}

                  {/* Address Card */}
                  {selectedCompletedService.customerAddress && (
                    <View style={[styles.detailCard, {backgroundColor: theme.background}]}>
                      <View style={styles.detailCardHeader}>
                        <Icon name="location-on" size={24} color={theme.primary} />
                        <Text style={[styles.detailCardTitle, {color: theme.text}]}>
                          Service Location
                        </Text>
                      </View>
                      <Text style={[styles.detailCardValue, {color: theme.textSecondary}]}>
                        {typeof selectedCompletedService.customerAddress === 'string'
                          ? selectedCompletedService.customerAddress
                          : selectedCompletedService.customerAddress.address || 'N/A'}
                      </Text>
                    </View>
                  )}

                  {/* Amount Card */}
                  {(selectedCompletedService as any).totalAmount && (
                    <View style={[styles.detailCard, styles.amountCard, {backgroundColor: theme.primary + '15'}]}>
                      <View style={styles.detailCardHeader}>
                        <Icon name="payment" size={24} color={theme.primary} />
                        <Text style={[styles.detailCardTitle, {color: theme.text}]}>
                          Total Amount
                        </Text>
                      </View>
                      <Text style={[styles.amountValue, {color: theme.primary}]}>
                        ₹{(selectedCompletedService as any).totalAmount}
                      </Text>
                    </View>
                  )}

                  {/* Status Badge */}
                  <View style={styles.statusBadgeContainer}>
                    <View style={styles.completedBadge}>
                      <Icon name="verified" size={20} color="#4CAF50" />
                      <Text style={styles.completedBadgeText}>
                        Service Successfully Completed
                      </Text>
                    </View>
                  </View>
                </ScrollView>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.dismissButton, {borderColor: theme.border}]}
                  onPress={() => setShowCompletedServiceModal(false)}>
                  <Text style={[styles.dismissButtonText, {color: theme.textSecondary}]}>
                    Close
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    minHeight: 400,
  },
  loadingText: {
    fontSize: 16,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  jobCard: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 4,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  jobCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  serviceTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  serviceTypeText: {
    flex: 1,
  },
  serviceType: {
    fontSize: 18,
    fontWeight: '600',
  },
  providerName: {
    fontSize: 14,
    marginTop: 2,
  },
  providerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 6,
  },
  providerPhone: {
    fontSize: 12,
    flex: 1,
  },
  callButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  providerContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  providerPhoneText: {
    fontSize: 14,
    flex: 1
  },
  modalCallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  modalCallButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  reviewRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  reviewRatingText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  reviewComment: {
    fontSize: 14,
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 20,
  },
  statusChipsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  serviceTypeChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  serviceTypeChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  problemText: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    color: '#666',
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  reviewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFD700',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  filterContainer: {
    paddingVertical: 12,
    paddingTop: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  filterButtonActive: {
    // Active state handled by backgroundColor
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  additionalFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  additionalFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 6,
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  additionalFilterText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  clearFiltersText: {
    fontSize: 13,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalScrollView: {
    maxHeight: 400,
    paddingTop: 8,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    minHeight: 56,
  },
  modalOptionSelected: {
    // Selected state handled by backgroundColor
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
  },
  completedServiceModal: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    flexDirection: 'column',
  },
  dragIndicator: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  completedModalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  completedHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  completedHeaderIcon: {
    marginRight: 16,
  },
  completedHeaderText: {
    flex: 1,
  },
  completedModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  completedModalSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '400',
  },
  closeIconButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  completedServiceContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  completedServiceContentContainer: {
    paddingTop: 16,
    paddingBottom: 100, // Extra padding to ensure content is scrollable
  },
  detailCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  detailCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailCardValue: {
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
  },
  amountCard: {
    borderWidth: 2,
    borderColor: 'rgba(74, 144, 226, 0.3)',
  },
  amountValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusBadgeContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
  },
  completedBadgeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  modalActions: {
    padding: 16,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  dismissButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dismissButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    flex: 1,
  },
  pinDisplayCard: {
    flexDirection: 'column',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    marginTop: 8,
    gap: 8,
    minWidth: 180,
  },
  pinLabel: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  pinValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 3,
    textAlign: 'center',
  },
  pinInstruction: {
    fontSize: 10,
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 2,
  },
});

