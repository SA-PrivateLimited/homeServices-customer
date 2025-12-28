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
  Alert,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {getCustomerJobCards, JobCard, getCustomerActiveConsultations} from '../services/jobCardService';
import {getJobCardReview} from '../services/reviewService';
import ReviewModal from '../components/ReviewModal';
import {fetchServiceCategories, ServiceCategory} from '../services/serviceCategoriesService';

type FilterType = 'all' | 'active' | 'completed';
type DateFilterType = 'all' | 'today' | 'week' | 'month';

export default function ServiceHistoryScreen({navigation}: any) {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

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
      
      // Fetch job cards
      const cards = await getCustomerJobCards(user.uid);
      console.log(`✅ Loaded ${cards.length} job cards`);
      
      // Also fetch active consultations that might not have job cards yet
      const activeConsultations = await getCustomerActiveConsultations(user.uid);
      console.log(`✅ Loaded ${activeConsultations.length} active consultations`);
      
      // Combine and deduplicate (consultations that have job cards)
      const consultationIds = new Set(cards.map(c => c.consultationId || c.bookingId).filter(Boolean));
      const consultationsWithoutJobCards = activeConsultations.filter(
        c => !consultationIds.has(c.id)
      );
      
      // Convert consultations to job card format for display
      const consultationCards: JobCard[] = consultationsWithoutJobCards.map(consultation => ({
        id: consultation.id,
        consultationId: consultation.id,
        bookingId: consultation.id,
        customerId: consultation.customerId || user.uid,
        customerName: consultation.customerName || consultation.patientName || 'Customer',
        customerPhone: consultation.customerPhone || consultation.patientPhone || '',
        customerAddress: consultation.customerAddress || consultation.patientAddress || {},
        providerId: consultation.providerId || consultation.doctorId || '',
        providerName: consultation.providerName || 'Provider',
        providerAddress: consultation.providerAddress || {},
        serviceType: consultation.serviceType || 'Service',
        problem: consultation.problem || consultation.symptoms || '',
        status: consultation.status || 'pending',
        createdAt: consultation.createdAt || new Date(),
        updatedAt: consultation.updatedAt || new Date(),
        scheduledTime: consultation.scheduledTime,
      }));
      
      // Combine all cards
      const allCards = [...cards, ...consultationCards];
      
      // Sort by createdAt descending
      allCards.sort((a, b) => {
        const aTime = a.createdAt.getTime();
        const bTime = b.createdAt.getTime();
        return bTime - aTime;
      });
      
      console.log(`✅ Total cards to display: ${allCards.length}`);
      setJobCards(allCards);
    } catch (error: any) {
      console.error('❌ Error loading job cards:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to load service requests. Please try again.',
        [{text: 'OK'}]
      );
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

  const handleReview = async (jobCard: JobCard) => {
    // Check if review exists
    const existingReview = await getJobCardReview(jobCard.id || '');
    if (existingReview) {
      Alert.alert('Already Reviewed', 'You have already reviewed this service.');
      return;
    }

    setSelectedJobCard(jobCard);
    setShowReviewModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      case 'in-progress':
        return '#007AFF';
      case 'accepted':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      case 'in-progress':
        return 'In Progress';
      case 'accepted':
        return 'Accepted';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  const formatDate = (date: Date | any) => {
    try {
      let dateObj: Date;
      if (date instanceof Date) {
        dateObj = date;
      } else if (date && typeof date.toDate === 'function') {
        // Firestore Timestamp
        dateObj = date.toDate();
      } else if (typeof date === 'string' || typeof date === 'number') {
        dateObj = new Date(date);
      } else {
        return 'Date not available';
      }
      
      if (isNaN(dateObj.getTime())) {
        return 'Date not available';
      }
      
      return dateObj.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch (error) {
      console.warn('Error formatting date:', error);
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
      case 'active':
        filtered = activeCards;
        break;
      case 'completed':
        filtered = completedCards;
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
  }, [jobCards, filter, serviceTypeFilter, dateFilter, activeCards, completedCards]);

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  const allCount = jobCards.length;
  const activeCount = activeCards.length;
  const completedCount = completedCards.length;
  const filteredCount = filteredCards.length;

  const getSelectedServiceTypeName = () => {
    if (serviceTypeFilter === 'all') return 'All Services';
    return serviceCategories.find(cat => cat.name === serviceTypeFilter)?.name || serviceTypeFilter;
  };

  const getDateFilterLabel = () => {
    switch (dateFilter) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      default: return 'All Time';
    }
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
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
              All ({allCount})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterButton,
              filter === 'active' && styles.filterButtonActive,
              {backgroundColor: filter === 'active' ? theme.primary : theme.card},
            ]}
            onPress={() => setFilter('active')}>
            <Text
              style={[
                styles.filterButtonText,
                {color: filter === 'active' ? '#fff' : theme.text},
              ]}>
              Active ({activeCount})
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
              Completed ({completedCount})
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
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {filteredCards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon 
              name={filter === 'active' ? 'schedule' : filter === 'completed' ? 'check-circle' : 'history'} 
              size={64} 
              color={theme.textSecondary} 
            />
            <Text style={[styles.emptyText, {color: theme.text}]}>
              {filter === 'active' 
                ? 'No active services' 
                : filter === 'completed' 
                ? 'No completed services'
                : 'No service requests'}
            </Text>
            <Text style={[styles.emptySubtext, {color: theme.textSecondary}]}>
              {filter === 'active'
                ? 'Your active service requests will appear here'
                : filter === 'completed'
                ? 'Your completed services will appear here'
                : 'Your service requests will appear here'}
            </Text>
          </View>
        ) : (
          <>
            {/* Show sections only when filter is 'all' and no additional filters */}
            {filter === 'all' && serviceTypeFilter === 'all' && dateFilter === 'all' ? (
              <>
                {/* Active Cards Section */}
                {activeCards.length > 0 && (
                  <>
                    <View style={styles.sectionHeader}>
                      <Text style={[styles.sectionTitle, {color: theme.text}]}>
                        Active Services ({activeCards.length})
                      </Text>
                    </View>
                    {activeCards.map(jobCard => (
                  <TouchableOpacity
                    key={jobCard.id}
                    style={[styles.jobCard, {backgroundColor: theme.card}]}
                    onPress={() => {
                      navigation.navigate('ActiveService', {
                        serviceRequestId: jobCard.consultationId || jobCard.bookingId,
                        jobCardId: jobCard.id,
                      });
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
                            {jobCard.providerName || 'Waiting for provider...'}
                          </Text>
                        </View>
                      </View>
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
                        <Text
                          style={[styles.addressText, {color: theme.textSecondary}]}
                          numberOfLines={1}>
                          {jobCard.customerAddress.address}
                          {jobCard.customerAddress.pincode && `, ${jobCard.customerAddress.pincode}`}
                        </Text>
                      </View>
                    )}

                    {/* Date */}
                    <View style={styles.dateRow}>
                      <Icon name="calendar-today" size={16} color={theme.textSecondary} />
                      <Text style={[styles.dateText, {color: theme.textSecondary}]}>
                        {formatDate(jobCard.createdAt)}
                      </Text>
                    </View>

                    {/* Actions */}
                    <View style={styles.actionsRow}>
                      <TouchableOpacity
                        style={styles.viewButton}
                        onPress={() => {
                          navigation.navigate('ActiveService', {
                            serviceRequestId: jobCard.consultationId || jobCard.bookingId,
                            jobCardId: jobCard.id,
                          });
                        }}>
                        <Text style={[styles.viewButtonText, {color: theme.primary}]}>
                          View Details
                        </Text>
                        <Icon name="chevron-right" size={20} color={theme.primary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}

                {/* Completed Cards Section */}
                {completedCards.length > 0 && (
                  <>
                    {activeCards.length > 0 && (
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, {color: theme.text}]}>
                          Completed Services ({completedCards.length})
                        </Text>
                      </View>
                    )}
                    {completedCards.map(jobCard => (
            <TouchableOpacity
              key={jobCard.id}
              style={[styles.jobCard, {backgroundColor: theme.card}]}
              onPress={() => {
                navigation.navigate('ActiveService', {
                  serviceRequestId: jobCard.consultationId || jobCard.bookingId,
                  jobCardId: jobCard.id,
                });
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
                      {jobCard.providerName}
                    </Text>
                  </View>
                </View>
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
                  <Text
                    style={[styles.addressText, {color: theme.textSecondary}]}
                    numberOfLines={1}>
                    {jobCard.customerAddress.address}
                    {jobCard.customerAddress.pincode && `, ${jobCard.customerAddress.pincode}`}
                  </Text>
                </View>
              )}

              {/* Date */}
              <View style={styles.dateRow}>
                <Icon name="calendar-today" size={16} color={theme.textSecondary} />
                <Text style={[styles.dateText, {color: theme.textSecondary}]}>
                  {formatDate(jobCard.createdAt)}
                </Text>
              </View>

              {/* Actions */}
              <View style={styles.actionsRow}>
                {jobCard.status === 'completed' && (
                  <TouchableOpacity
                    style={styles.reviewButton}
                    onPress={() => handleReview(jobCard)}>
                    <Icon name="star" size={16} color="#FFD700" />
                    <Text style={styles.reviewButtonText}>Review</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.viewButton}
                  onPress={() => {
                    navigation.navigate('ActiveService', {
                      serviceRequestId: jobCard.consultationId || jobCard.bookingId,
                      jobCardId: jobCard.id,
                    });
                  }}>
                  <Text style={[styles.viewButtonText, {color: theme.primary}]}>
                    View Details
                  </Text>
                  <Icon name="chevron-right" size={20} color={theme.primary} />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
                    ))}
                  </>
                )}
              </>
            ) : (
              // Show filtered cards without sections when filters are applied
              filteredCards.map(jobCard => (
                <TouchableOpacity
                  key={jobCard.id}
                  style={[styles.jobCard, {backgroundColor: theme.card}]}
                  onPress={() => {
                    navigation.navigate('ActiveService', {
                      serviceRequestId: jobCard.consultationId || jobCard.bookingId,
                      jobCardId: jobCard.id,
                    });
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
                          {jobCard.providerName || 'Waiting for provider...'}
                        </Text>
                      </View>
                    </View>
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
                      <Text
                        style={[styles.addressText, {color: theme.textSecondary}]}
                        numberOfLines={1}>
                        {jobCard.customerAddress.address}
                        {jobCard.customerAddress.pincode && `, ${jobCard.customerAddress.pincode}`}
                      </Text>
                    </View>
                  )}

                  {/* Date */}
                  <View style={styles.dateRow}>
                    <Icon name="calendar-today" size={16} color={theme.textSecondary} />
                    <Text style={[styles.dateText, {color: theme.textSecondary}]}>
                      {formatDate(jobCard.createdAt)}
                    </Text>
                  </View>

                  {/* Actions */}
                  <View style={styles.actionsRow}>
                    {jobCard.status === 'completed' && (
                      <TouchableOpacity
                        style={styles.reviewButton}
                        onPress={() => handleReview(jobCard)}>
                        <Icon name="star" size={16} color="#FFD700" />
                        <Text style={styles.reviewButtonText}>Review</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => {
                        navigation.navigate('ActiveService', {
                          serviceRequestId: jobCard.consultationId || jobCard.bookingId,
                          jobCardId: jobCard.id,
                        });
                      }}>
                      <Text style={[styles.viewButtonText, {color: theme.primary}]}>
                        View Details
                      </Text>
                      <Icon name="chevron-right" size={20} color={theme.primary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>

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
                Filter by Service Type
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
                Filter by Date
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
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
});

