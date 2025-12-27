import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import type {Consultation, ConsultationStatus} from '../types/consultation';
import consultationService from '../services/consultationService';
import ConsultationCard from '../components/ConsultationCard';
import ConsultationDetailsModal from '../components/ConsultationDetailsModal';
import EmptyState from '../components/EmptyState';
import ragService from '../services/ragService';

interface ConsultationsHistoryScreenProps {
  navigation: any;
}

const ConsultationsHistoryScreen: React.FC<ConsultationsHistoryScreenProps> = ({
  navigation,
}) => {
  const {isDarkMode, currentUser, consultations, setConsultations, setRedirectAfterLogin} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | ConsultationStatus>('all');
  const [filteredConsultations, setFilteredConsultations] = useState<Consultation[]>([]);
  const [selectedConsultation, setSelectedConsultation] = useState<Consultation | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  const filters: Array<{label: string; value: 'all' | ConsultationStatus}> = [
    {label: 'All', value: 'all'},
    {label: 'Scheduled', value: 'scheduled'},
    {label: 'Completed', value: 'completed'},
    {label: 'Cancelled', value: 'cancelled'},
  ];

  useEffect(() => {
    if (currentUser) {
      loadConsultations();
    }
  }, [currentUser]);

  useEffect(() => {
    filterConsultations();
  }, [consultations, selectedFilter]);

  const loadConsultations = async () => {
    if (!currentUser) return;

    setLoading(true);
    try {
      const userConsultations = await consultationService.fetchUserConsultations(
        currentUser.id,
      );
      await setConsultations(userConsultations);
      
      // Index consultations for RAG service
      if (userConsultations.length > 0) {
        ragService.indexConsultations(userConsultations).catch(error => {
        });
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (!currentUser) return;

    setRefreshing(true);
    try {
      const userConsultations = await consultationService.fetchUserConsultations(
        currentUser.id,
      );
      await setConsultations(userConsultations);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const filterConsultations = () => {
    if (selectedFilter === 'all') {
      setFilteredConsultations(consultations);
    } else {
      setFilteredConsultations(
        consultations.filter(c => c.status === selectedFilter),
      );
    }
  };

  const handleConsultationPress = (consultation: Consultation) => {
    
    // Ensure all fields are present with proper defaults
    const consultationForModal: Consultation = {
      id: consultation.id,
      patientId: consultation.patientId || '',
      patientName: consultation.patientName || '',
      patientAge: consultation.patientAge,
      patientPhone: consultation.patientPhone,
      doctorId: consultation.doctorId || '',
      doctorName: consultation.doctorName || '',
      doctorSpecialization: consultation.doctorSpecialization || '',
      scheduledTime: consultation.scheduledTime,
      duration: consultation.duration || 30,
      status: consultation.status || 'scheduled',
      consultationFee: consultation.consultationFee || 0,
      agoraChannelName: consultation.agoraChannelName || '',
      agoraToken: consultation.agoraToken,
      googleMeetLink: consultation.googleMeetLink,
      symptoms: consultation.symptoms || '',
      notes: consultation.notes || '',
      diagnosis: consultation.diagnosis || '',
      prescription: consultation.prescription || '',
      doctorNotes: consultation.doctorNotes || '',
      cancellationReason: consultation.cancellationReason || '',
      prescriptionId: consultation.prescriptionId,
      createdAt: consultation.createdAt,
      updatedAt: consultation.updatedAt,
    };
    
    setSelectedConsultation(consultationForModal);
    setModalVisible(true);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedConsultation(null);
  };

  const handleJoinCall = (consultation: Consultation) => {
    // Video calling feature coming soon
    Alert.alert('Video Call', 'Video calling feature will be available soon!');
  };

  const handleViewPrescription = (consultation: Consultation) => {
    if (consultation.prescriptionId) {
      // Navigate to prescription details (to be implemented in Phase 7)
      Alert.alert('Prescription', `Prescription ID: ${consultation.prescriptionId}`);
    }
  };


  const renderFilter = ({item}: {item: typeof filters[0]}) => {
    const isSelected = item.value === selectedFilter;
    return (
      <TouchableOpacity
        style={[
          styles.filterChip,
          {
            backgroundColor: isSelected ? theme.primary : theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
          },
        ]}
        onPress={() => setSelectedFilter(item.value)}>
        <Text
          style={[
            styles.filterText,
            {color: isSelected ? '#fff' : theme.text},
          ]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  const handlePayNow = (consultation: Consultation) => {
    navigation.navigate('Payment', {
      consultationId: consultation.id,
      amount: consultation.consultationFee,
      description: `Consultation with Dr. ${consultation.doctorName}`,
      doctorName: consultation.doctorName,
      onPaymentSuccess: () => {
        // Refresh consultations after payment
        loadConsultations();
      },
    });
  };

  const renderConsultation = ({item}: {item: Consultation}) => (
    <ConsultationCard
      consultation={item}
      onPress={() => handleConsultationPress(item)}
      onJoinCall={() => handleJoinCall(item)}
      onViewPrescription={() => handleViewPrescription(item)}
      onPayNow={() => handlePayNow(item)}
    />
  );

  if (!currentUser) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {backgroundColor: theme.background},
        ]}>
        <EmptyState
          icon="person-outline"
          title="Login Required"
          message="Please login to view your consultations"
        />
        <TouchableOpacity
          style={[styles.button, {backgroundColor: theme.primary}]}
          onPress={() => {
            setRedirectAfterLogin({route: 'ConsultationsHistory'});
            navigation.navigate('Login');
          }}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {backgroundColor: theme.background},
        ]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
          Loading consultations...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Header Section */}
      <View style={[styles.headerSection, {backgroundColor: theme.background}]}>
        <Text style={[styles.screenTitle, {color: theme.text}]}>My Consultations</Text>
        {filteredConsultations.length > 0 && (
          <Text style={[styles.resultCount, {color: theme.textSecondary}]}>
            {filteredConsultations.length} {filteredConsultations.length === 1 ? 'consultation' : 'consultations'}
          </Text>
        )}
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={filters}
          renderItem={renderFilter}
          keyExtractor={item => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Consultations List */}
      {filteredConsultations.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No Consultations"
          message={
            selectedFilter === 'all'
              ? 'You have no consultations yet. Book your first consultation!'
              : `No ${selectedFilter} consultations`
          }
        />
      ) : (
        <FlatList
          data={filteredConsultations}
          renderItem={renderConsultation}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
        />
      )}

      {/* Consultation Details Modal */}
      <ConsultationDetailsModal
        visible={modalVisible}
        consultation={selectedConsultation}
        onClose={handleCloseModal}
        onJoinCall={(consultation) => {
          handleCloseModal();
          handleJoinCall(consultation);
        }}
        onViewPrescription={(consultation) => {
          handleCloseModal();
          handleViewPrescription(consultation);
        }}
        onPayNow={(consultation) => {
          handleCloseModal();
          handlePayNow(consultation);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  headerSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 15,
    fontWeight: '500',
  },
  filtersContainer: {
    paddingVertical: 12,
    paddingBottom: 16,
  },
  filtersList: {
    paddingHorizontal: 20,
  },
  filterChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1.5,
    marginRight: 10,
    minWidth: 90,
    alignItems: 'center',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ConsultationsHistoryScreen;
