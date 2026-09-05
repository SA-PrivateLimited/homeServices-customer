/**
 * Service History Screen
 * Customer app - View past service requests
 * Shows completed services with review option
 */

import React, {useState, useEffect, useMemo, useCallback} from 'react';
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
import {useFocusEffect} from '@react-navigation/native';
import AlertModal from '../components/AlertModal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {getCustomerJobCards, JobCard} from '../services/jobCardService';
import {getJobCardReview, getProviderReviews, Review} from '../services/reviewService';
import ReviewModal from '../components/ReviewModal';
import AdSlot from '../components/AdSlot';
import {ServiceRequestCard} from '../components/ServiceRequestCard';
import {CrystalFilterMenu} from '../components/CrystalFilterMenu';
import {fetchServiceCategories, ServiceCategory} from '../services/serviceCategoriesService';
import {providersApi} from '../services/api/providersApi';
import {serviceRequestsApi} from '../services/api/serviceRequestsApi';
import {
  isLiveStatus,
  sortHistoryRows,
} from '../utils/historyNowFilter';
import useTranslation from '../hooks/useTranslation';
import {bilingualProfessionLine} from 'sapvt-ltd-app-packages';
import {
  useClearHelpRequest,
  useSetHelpRequestCandidates,
} from '../components/help/helpRequestContext';
import {pickHelpCandidates} from '../components/help/helpRequestMapper';
import type {ServiceRequest} from '../services/api/serviceRequestsApi';

type FilterType = 'now' | 'all' | 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
type DateFilterType = 'all' | 'today' | 'week' | 'month';

const DATE_OPTIONS: DateFilterType[] = ['all', 'today', 'week', 'month'];

function dateFilterLabelKey(key: DateFilterType): string {
  switch (key) {
    case 'today':
      return 'date.filter.today';
    case 'week':
      return 'date.filter.week';
    case 'month':
      return 'date.filter.month';
    default:
      return 'date.filter.all';
  }
}

export default function ServiceHistoryScreen({navigation}: any) {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const {t} = useTranslation();
  const setHelpCandidates = useSetHelpRequestCandidates();
  const clearHelpRequest = useClearHelpRequest();

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [filter, setFilter] = useState<FilterType>('now');
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
  const [providerImages, setProviderImages] = useState<Record<string, string>>({});
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
    loadServiceCategories();
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
      return () => {
        clearHelpRequest();
      };
    }, [currentUser?.id, currentUser?._id, clearHelpRequest]),
  );

  const loadServiceCategories = async () => {
    try {
      const categories = await fetchServiceCategories();
      setServiceCategories(categories);
    } catch (error) {
      console.error('Error loading service categories:', error);
    }
  };

  const serviceRequestToCard = (req: any): JobCard => {
    const id = req._id || req.id || '';
    return {
      id: `sr_${id}`,
      providerId: req.providerId || '',
      providerName: req.providerName || '',
      providerAddress: req.providerAddress || {
        type: 'home',
        address: '',
        pincode: '',
      },
      customerId: req.customerId || '',
      customerName: req.customerName || '',
      customerPhone: req.customerPhone || '',
      customerAddress: req.customerAddress || {
        address: '',
        pincode: '',
      },
      serviceType: req.serviceType || 'Service',
      problem: req.problem,
      consultationId: id,
      bookingId: id,
      status: req.status || 'pending',
      scheduledTime: req.scheduledTime ? new Date(req.scheduledTime) : undefined,
      createdAt: req.createdAt ? new Date(req.createdAt) : new Date(),
      updatedAt: req.updatedAt ? new Date(req.updatedAt) : new Date(),
      urgency: req.urgency,
      providerImage: req.providerImage,
    } as JobCard & {urgency?: string; providerImage?: string};
  };

  const loadHistory = async () => {
    try {
      const userId = currentUser?.id || currentUser?._id;
      if (!userId) {
        setJobCards([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      setLoading(true);

      const [cardsByCustomerId, serviceRequests] = await Promise.all([
        getCustomerJobCards(userId).catch((e) => {
          console.warn('Job cards load failed:', e);
          return [] as JobCard[];
        }),
        serviceRequestsApi.getAll().catch((e) => {
          console.warn('Service requests load failed:', e);
          return [] as any[];
        }),
      ]);

      const cards = cardsByCustomerId || [];
      const linkedIds = new Set<string>();
      cards.forEach(card => {
        if (card.consultationId) linkedIds.add(String(card.consultationId));
        if (card.bookingId) linkedIds.add(String(card.bookingId));
        if (card.id) linkedIds.add(String(card.id));
      });

      // Include service requests that do not yet have a job card (e.g. pending)
      const orphanRequests = (serviceRequests || [])
        .filter(req => {
          const id = String(req._id || req.id || '');
          if (!id) return false;
          return !linkedIds.has(id);
        })
        .map(serviceRequestToCard);

      const allCards = [...cards, ...orphanRequests];
      allCards.sort((a, b) => {
        const aTime = a.createdAt instanceof Date ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
        const bTime = b.createdAt instanceof Date ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
        return bTime - aTime;
      });

      const phoneMap: Record<string, string> = {};
      const imageMap: Record<string, string> = {};
      const providerIds = new Set(allCards.map(card => card.providerId).filter(Boolean));

      await Promise.all(
        Array.from(providerIds).map(async providerId => {
          if (!providerId) return;
          try {
            const provider = await providersApi.getById(providerId);
            if (provider) {
              const phone =
                provider.phoneNumber ||
                (provider as any).phone ||
                (provider as any).primaryPhone;
              if (phone) phoneMap[providerId] = phone;
              const image =
                (provider as any).profileImage ||
                (provider as any).photo ||
                (provider as any).image;
              if (image) imageMap[providerId] = image;
            }
          } catch (error) {
            console.error(`Error fetching phone for provider ${providerId}:`, error);
          }
        }),
      );
      setProviderPhones(phoneMap);
      setProviderImages(imageMap);
      setJobCards(allCards);
      // Web HistoryPage: feed Help picker with live-ish request candidates
      setHelpCandidates(
        pickHelpCandidates((serviceRequests || []) as ServiceRequest[]),
      );
    } catch (error: any) {
      console.error('❌ Error loading history:', error);
      setAlertModal({
        visible: true,
        title: t('common.error'),
        message: error.message || t('serviceHistory.failedToLoad'),
        type: 'error',
      });
      setJobCards([]);
      setHelpCandidates([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadHistory();
  };

  const loadProviderDetailsAndReview = async (jobCard: JobCard) => {
    if (!jobCard.providerId) return;
    
    setLoadingProviderDetails(true);
    try {
      // Fetch provider details from API
      const provider = await providersApi.getById(jobCard.providerId);
      
      if (provider) {
        setProviderDetails({
          phone: provider.phoneNumber || (provider as any).phone || (provider as any).primaryPhone,
          address: provider.location || (provider as any).address || (provider as any).homeAddress || (provider as any).officeAddress,
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
        return theme.warning;
      case 'accepted':
        return theme.success;
      case 'cancelled':
        return theme.error;
      case 'rejected':
        return theme.error;
      case 'pending':
        return '#8E8E93';
      default:
        return '#8E8E93';
    }
  };

  const normalizeStatus = (
    status: string,
  ): 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled' | 'rejected' => {
    const lowerStatus = status?.toLowerCase() || '';

    if (lowerStatus === 'completed' || lowerStatus === 'done' || lowerStatus === 'finished') {
      return 'completed';
    }

    if (lowerStatus === 'cancelled' || lowerStatus === 'canceled') {
      return 'cancelled';
    }

    if (lowerStatus === 'rejected' || lowerStatus === 'declined') {
      return 'rejected';
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
      case 'cancelled':
        return t('services.cancelled');
      case 'rejected':
        return t('activeService.declined');
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
        // Legacy Firestore Timestamp (for backward compatibility)
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
      case 'now':
        filtered = jobCards.filter(card => isLiveStatus(card as any));
        filtered = sortHistoryRows(filtered as any, 'now') as typeof jobCards;
        break;
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
      case 'cancelled':
        filtered = jobCards.filter(card => {
          const ns = normalizeStatus(card.status);
          return ns === 'cancelled' || ns === 'rejected';
        });
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

  const serviceFilterOptions = useMemo(
    () => [
      {value: 'all', label: String(t('history.allServices'))},
      ...availableServiceTypes.map(type => {
        const cat = serviceCategories.find(c => c.name === type);
        return {
          value: type,
          label: bilingualProfessionLine(type, {nameHi: cat?.nameHi}),
        };
      }),
    ],
    [availableServiceTypes, serviceCategories, t],
  );

  const dateFilterOptions = useMemo(
    () =>
      DATE_OPTIONS.map(opt => ({
        value: opt,
        label: String(t(dateFilterLabelKey(opt))),
      })),
    [t],
  );

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
  const nowCount = jobCards.filter(card => isLiveStatus(card as any)).length;
  const pendingCount = jobCards.filter(card => normalizeStatus(card.status) === 'pending').length;
  const acceptedCount = jobCards.filter(card => normalizeStatus(card.status) === 'accepted').length;
  const inProgressCount = jobCards.filter(card => normalizeStatus(card.status) === 'in-progress').length;
  const completedCount = jobCards.filter(card => normalizeStatus(card.status) === 'completed').length;
  const cancelledCount = jobCards.filter(card => {
    const ns = normalizeStatus(card.status);
    return ns === 'cancelled' || ns === 'rejected';
  }).length;
  const filteredCount = filteredCards.length;

  const getSelectedServiceTypeName = () => {
    if (serviceTypeFilter === 'all') return String(t('history.allServices'));
    const cat = serviceCategories.find(c => c.name === serviceTypeFilter);
    return bilingualProfessionLine(serviceTypeFilter, {
      nameHi: cat?.nameHi,
    });
  };

  const getDateFilterLabel = () => String(t(dateFilterLabelKey(dateFilter)));

  const openServiceDetails = (jobCard: JobCard) => {
    if (jobCard.status === 'completed') {
      setSelectedCompletedService(jobCard);
      setShowCompletedServiceModal(true);
      return;
    }
    navigation.navigate('ActiveService', {
      serviceRequestId: jobCard.consultationId || jobCard.bookingId,
      // Synthetic ids (sr_*) are pending service requests without a real job card yet
      ...(!String(jobCard.id || '').startsWith('sr_')
        ? {jobCardId: jobCard.id}
        : {}),
    });
  };

  const renderServiceCard = (jobCard: JobCard) => {
    const ns = normalizeStatus(jobCard.status);
    const assigned = ns === 'accepted' || ns === 'in-progress';
    const allotted = ns !== 'pending' && Boolean(jobCard.providerId || jobCard.providerName);
    const avatarSrc = allotted
      ? providerImages[jobCard.providerId] || (jobCard as any).providerImage || null
      : null;
    const addressLine = [
      jobCard.customerAddress?.address,
      jobCard.customerAddress?.pincode,
    ]
      .filter(Boolean)
      .join(', ');
    const phone =
      assigned && jobCard.providerId ? providerPhones[jobCard.providerId] : undefined;
    const facts = [
      addressLine
        ? {
            icon: 'location_on',
            value: addressLine,
          }
        : null,
      {
        icon: 'schedule',
        value: formatDate(jobCard.scheduledTime || jobCard.createdAt),
      },
    ].filter(Boolean) as {icon: string; value: string}[];

    return (
      <ServiceRequestCard
        theme={theme}
        statusKey={ns}
        title={jobCard.serviceType || t('common.services')}
        subtitle={
          assigned
            ? jobCard.providerName || undefined
            : ns === 'pending'
              ? t('serviceHistory.waitingForProvider')
              : jobCard.providerName || undefined
        }
        serviceType={jobCard.serviceType}
        chips={[
          {
            label: String(getStatusText(jobCard.status) || ''),
            color: getStatusColor(jobCard.status),
          },
        ]}
        facts={facts}
        phone={phone || null}
        callLabel={String(t('contact.callProvider') || t('activeService.callProvider') || 'Call')}
        avatarSrc={avatarSrc}
        avatarName={allotted ? jobCard.providerName || String(t('services.provider')) : null}
        viewDetailsLabel={String(t('jobCard.viewDetails'))}
        onPress={() => openServiceDetails(jobCard)}
        onCall={phone ? () => handleCallProvider(phone) : undefined}
        leadingAction={
          jobCard.status === 'completed' ? (
            <TouchableOpacity
              style={styles.reviewButton}
              onPress={() => handleReview(jobCard)}>
              <Icon name="star" size={16} color="#FFD700" />
              <Text style={styles.reviewButtonText}>{t('jobCard.review')}</Text>
            </TouchableOpacity>
          ) : undefined
        }>
        {ns === 'in-progress' && (jobCard as any).taskPIN ? (
          <View
            style={[
              styles.pinDisplayCard,
              {backgroundColor: theme.primary + '15', borderColor: theme.primary},
            ]}>
            <Icon name="lock" size={16} color={theme.primary} />
            <Text style={[styles.pinLabel, {color: theme.textSecondary}]}>
              {t('jobCard.yourVerificationPIN')}
            </Text>
            <Text style={[styles.pinValue, {color: theme.primary}]}>
              {(jobCard as any).taskPIN}
            </Text>
          </View>
        ) : null}
      </ServiceRequestCard>
    );
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Intro — title lives in the nav header (web AppShell). */}
      <View style={[styles.header, {backgroundColor: theme.card, borderBottomColor: theme.border}]}>
        <Text style={[styles.headerIntro, {color: theme.textSecondary}]}>
          {t('history.intro')}
        </Text>
      </View>

      {/* Filter Buttons — web history-status-chip crystal pills */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}>
          {(
            [
              {key: 'now', label: `${t('status.filter.now')} (${nowCount})`},
              {key: 'all', label: `${t('common.all')} (${allCount})`},
              {
                key: 'pending',
                label: `${t('services.pending')} (${pendingCount})`,
              },
              {
                key: 'accepted',
                label: `${t('services.accepted')} (${acceptedCount})`,
              },
              {
                key: 'in-progress',
                label: `${t('services.inProgress')} (${inProgressCount})`,
              },
              {
                key: 'completed',
                label: `${t('services.completed')} (${completedCount})`,
              },
              {
                key: 'cancelled',
                label: `${t('services.cancelled')} (${cancelledCount})`,
              },
            ] as const
          ).map(chip => {
            const active = filter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                style={[
                  styles.filterButton,
                  {
                    backgroundColor: active
                      ? theme.primary
                      : isDarkMode
                        ? 'rgba(255,255,255,0.08)'
                        : 'rgba(255,255,255,0.82)',
                    borderColor: active
                      ? theme.primary
                      : isDarkMode
                        ? 'rgba(255,255,255,0.16)'
                        : 'rgba(15,28,46,0.12)',
                  },
                ]}
                onPress={() => setFilter(chip.key)}>
                <Text
                  style={[
                    styles.filterButtonText,
                    {color: active ? '#fff' : theme.text},
                  ]}>
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Additional Filters Row — web crystal-filter-trigger (no border) */}
      <View
        style={[
          styles.additionalFiltersContainer,
          {borderBottomColor: `${theme.border}80`},
        ]}>
        <TouchableOpacity
          style={[
            styles.additionalFilterButton,
            {
              backgroundColor:
                serviceTypeFilter !== 'all' || showServiceTypeModal
                  ? isDarkMode
                    ? `${theme.primary}33`
                    : `${theme.primary}24`
                  : isDarkMode
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(255,255,255,0.55)',
            },
          ]}
          onPress={() => setShowServiceTypeModal(true)}
          accessibilityRole="button"
          accessibilityState={{expanded: showServiceTypeModal}}>
          <Text
            style={[styles.additionalFilterText, {color: theme.text}]}
            numberOfLines={1}>
            {getSelectedServiceTypeName()}
          </Text>
          <Icon
            name="expand-more"
            size={18}
            color={theme.textSecondary}
            style={
              showServiceTypeModal ? {transform: [{rotate: '180deg'}]} : undefined
            }
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.additionalFilterButton,
            {
              backgroundColor:
                dateFilter !== 'all' || showDateFilterModal
                  ? isDarkMode
                    ? `${theme.primary}33`
                    : `${theme.primary}24`
                  : isDarkMode
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(255,255,255,0.55)',
            },
          ]}
          onPress={() => setShowDateFilterModal(true)}
          accessibilityRole="button"
          accessibilityState={{expanded: showDateFilterModal}}>
          <Text
            style={[styles.additionalFilterText, {color: theme.text}]}
            numberOfLines={1}>
            {getDateFilterLabel()}
          </Text>
          <Icon
            name="expand-more"
            size={18}
            color={theme.textSecondary}
            style={
              showDateFilterModal ? {transform: [{rotate: '180deg'}]} : undefined
            }
          />
        </TouchableOpacity>

        {(serviceTypeFilter !== 'all' || dateFilter !== 'all') && (
          <TouchableOpacity
            style={[
              styles.clearFiltersButton,
              {
                backgroundColor: isDarkMode
                  ? 'rgba(255,255,255,0.1)'
                  : 'rgba(255,255,255,0.55)',
              },
            ]}
            onPress={() => {
              setServiceTypeFilter('all');
              setDateFilter('all');
            }}>
            <Icon name="close" size={18} color={theme.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Service Cards List */}
      {filteredCards.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name={
              filter === 'now'
                ? 'flash-on'
                : filter === 'pending'
                ? 'schedule'
                : filter === 'accepted'
                  ? 'check-circle'
                  : filter === 'completed'
                    ? 'check-circle'
                    : filter === 'cancelled'
                      ? 'cancel'
                      : 'history'
            }
            size={64}
            color={theme.textSecondary}
          />
          <Text style={[styles.emptyText, {color: theme.text}]}>
            {filter === 'now'
              ? t('history.empty.now.title')
              : filter === 'pending'
              ? t('history.empty.pending.title')
              : filter === 'accepted'
              ? t('history.empty.accepted.title')
              : filter === 'in-progress'
              ? t('history.empty.inProgress.title')
              : filter === 'completed'
              ? t('history.empty.completed.title')
              : filter === 'cancelled'
              ? t('history.empty.cancelled.title')
              : t('history.emptyTitle')}
          </Text>
          <Text style={[styles.emptySubtext, {color: theme.textSecondary}]}>
            {filter === 'now'
              ? t('history.empty.now.message')
              : filter === 'pending'
              ? t('history.empty.pending.message')
              : filter === 'accepted'
              ? t('history.empty.accepted.message')
              : filter === 'in-progress'
              ? t('history.empty.inProgress.message')
              : filter === 'completed'
              ? t('history.empty.completed.message')
              : filter === 'cancelled'
              ? t('history.empty.cancelled.message')
              : t('history.emptyMessage')}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCards}
          keyExtractor={(item) => item.id || ''}
          renderItem={({item}) => renderServiceCard(item)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListFooterComponent={<AdSlot size="banner" />}
        />
      )}

      <CrystalFilterMenu
        open={showServiceTypeModal}
        onClose={() => setShowServiceTypeModal(false)}
        title={String(t('history.filterServiceType'))}
        options={serviceFilterOptions}
        selected={serviceTypeFilter}
        onSelect={setServiceTypeFilter}
        theme={theme}
        isDark={isDarkMode}
      />

      <CrystalFilterMenu
        open={showDateFilterModal}
        onClose={() => setShowDateFilterModal(false)}
        title={String(t('history.filterDate'))}
        options={dateFilterOptions}
        selected={dateFilter}
        onSelect={v => setDateFilter(v as DateFilterType)}
        theme={theme}
        isDark={isDarkMode}
      />

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
            loadHistory(); // Refresh to show review status
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
                  {(selectedCompletedService as any).totalAmount || (selectedCompletedService as any).serviceAmount ? (
                    <View style={[styles.detailCard, styles.amountCard, {backgroundColor: theme.primary + '15'}]}>
                      <View style={styles.detailCardHeader}>
                        <Icon name="payment" size={24} color={theme.primary} />
                        <Text style={[styles.detailCardTitle, {color: theme.text}]}>
                          {String(t('serviceHistory.totalAmount'))}
                        </Text>
                      </View>
                      <Text style={[styles.amountValue, {color: theme.primary}]}>
                        ₹{(selectedCompletedService as any).totalAmount || (selectedCompletedService as any).serviceAmount || 0}
                      </Text>
                      {(selectedCompletedService as any).materialsUsed && (selectedCompletedService as any).materialsUsed.length > 0 && (
                        <View style={styles.materialsBreakdown}>
                          {(selectedCompletedService as any).serviceAmount > 0 && (
                            <Text style={[styles.materialsBreakdownText, {color: theme.textSecondary}]}>
                              {String(t('serviceHistory.serviceFee'))}: ₹{(selectedCompletedService as any).serviceAmount.toFixed(2)}
                            </Text>
                          )}
                          {(selectedCompletedService as any).materialsUsed.reduce((sum: number, m: any) => sum + (m.total || 0), 0) > 0 && (
                            <Text style={[styles.materialsBreakdownText, {color: theme.textSecondary}]}>
                              {String(t('serviceHistory.materials'))}: ₹{(selectedCompletedService as any).materialsUsed.reduce((sum: number, m: any) => sum + (m.total || 0), 0).toFixed(2)}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  ) : null}

                  {/* Job Card PDF */}
                  {(selectedCompletedService as any).jobCardPdfUrl && (
                    <View style={[styles.detailCard, {backgroundColor: theme.background}]}>
                      <View style={styles.detailCardHeader}>
                        <Icon name="description" size={24} color={theme.primary} />
                        <Text style={[styles.detailCardTitle, {color: theme.text}]}>
                          {String(t('serviceHistory.jobCard'))}
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.pdfButton, {backgroundColor: theme.primary}]}
                        onPress={() => {
                          Linking.openURL((selectedCompletedService as any).jobCardPdfUrl).catch(err => {
                            setAlertModal({
                              visible: true,
                              title: String(t('common.error')),
                              message: String(t('serviceHistory.failedToOpenPDF')),
                              type: 'error',
                            });
                          });
                        }}>
                        <Icon name="picture-as-pdf" size={20} color="#fff" />
                        <Text style={styles.pdfButtonText}>
                          {String(t('serviceHistory.viewJobCard'))}
                        </Text>
                        <Icon name="open-in-new" size={18} color="#fff" />
                      </TouchableOpacity>
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
    paddingTop: 4,
    paddingBottom: 10,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerIntro: {
    fontSize: 13,
    lineHeight: 17.5,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
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
    paddingHorizontal: 14,
    paddingTop: 14,
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
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterButton: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 999,
    marginRight: 8,
    alignItems: 'center',
    minHeight: 30,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterButtonActive: {
    // Active state handled by backgroundColor
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  additionalFiltersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
  },
  additionalFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 6,
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    borderWidth: 0,
  },
  additionalFilterText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    minWidth: 0,
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    minHeight: 38,
    borderWidth: 0,
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
  pdfButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 12,
    gap: 8,
  },
  pdfButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  materialsBreakdown: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    gap: 6,
  },
  materialsBreakdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

