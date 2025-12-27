/**
 * Service History Screen
 * Customer app - View past service requests
 * Shows completed services with review option
 */

import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import {getCustomerJobCards, JobCard} from '../services/jobCardService';
import {getJobCardReview} from '../services/reviewService';
import ReviewModal from '../components/ReviewModal';

export default function ServiceHistoryScreen({navigation}: any) {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [jobCards, setJobCards] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedJobCard, setSelectedJobCard] = useState<JobCard | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);

  useEffect(() => {
    loadJobCards();
  }, []);

  const loadJobCards = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const cards = await getCustomerJobCards(user.uid);
      setJobCards(cards);
    } catch (error: any) {
      console.error('Error loading job cards:', error);
      // Error is already logged in the service, just set empty array
      // The UI will show "No service history" message
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

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading && !refreshing) {
    return (
      <View style={[styles.container, {backgroundColor: theme.background}]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }>
        {jobCards.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="history" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyText, {color: theme.text}]}>
              No service history
            </Text>
            <Text style={[styles.emptySubtext, {color: theme.textSecondary}]}>
              Your completed services will appear here
            </Text>
          </View>
        ) : (
          jobCards.map(jobCard => (
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
          ))
        )}
      </ScrollView>

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
    marginTop: 12,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
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
  },
  dateText: {
    fontSize: 14,
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
});

