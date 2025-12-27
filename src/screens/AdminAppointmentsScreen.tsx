import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import firebaseApp from '@react-native-firebase/app';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import AdminConsultationDetailScreen from './AdminConsultationDetailScreen';

interface Consultation {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  doctorId: string;
  doctorSpecialization: string;
  scheduledTime: any;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  consultationFee: number;
  symptoms?: string;
  notes?: string;
  createdAt?: any;
}

// Helper function to check if Firebase is initialized
const isFirebaseInitialized = (): boolean => {
  try {
    firebaseApp.app();
    return true;
  } catch (error) {
    return false;
  }
};

interface AdminAppointmentsScreenProps {
  navigation?: any;
}

export default function AppointmentsScreen({navigation}: AdminAppointmentsScreenProps) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'>('all');
  const [firebaseError, setFirebaseError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!isFirebaseInitialized()) {
      setFirebaseError(true);
      setErrorMessage('Firebase not initialized. Please check your Firebase configuration.');
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = firestore()
        .collection('consultations')
        .orderBy('scheduledTime', 'desc')
        .onSnapshot(
          snapshot => {
            const consultationsList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as Consultation[];
            setConsultations(consultationsList);
            setLoading(false);
            setFirebaseError(false);
          },
          error => {
            setFirebaseError(true);

            // Check if it's a permission error
            if (error.code === 'permission-denied') {
              setErrorMessage('Permission Denied: Please update Firestore rules to allow admin access to consultations.');
            } else {
              setErrorMessage(`Error: ${error.message || 'Failed to fetch consultations'}`);
            }
            setLoading(false);
          },
        );

      return () => unsubscribe();
    } catch (error: any) {
      setFirebaseError(true);
      setErrorMessage(error.message || 'An error occurred while fetching consultations');
      setLoading(false);
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#FF9500';
      case 'ongoing':
        return '#007AFF';
      case 'completed':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return {date: 'N/A', time: 'N/A'};

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {date: dateStr, time: timeStr};
  };

  const filteredConsultations = consultations.filter(consultation =>
    filter === 'all' ? true : consultation.status === filter
  );

  // Calculate counts for each status
  const allCount = consultations.length;
  const scheduledCount = consultations.filter(c => c.status === 'scheduled').length;
  const ongoingCount = consultations.filter(c => c.status === 'ongoing').length;
  const completedCount = consultations.filter(c => c.status === 'completed').length;
  const cancelledCount = consultations.filter(c => c.status === 'cancelled').length;

  const renderConsultation = ({item}: {item: Consultation}) => {
    const {date, time} = formatDateTime(item.scheduledTime);

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => {
          // Navigate to consultation detail screen
          // This will be handled by the parent navigator
          if (navigation) {
            navigation.navigate('AdminConsultationDetail', {consultation: item});
          }
        }}>
        <View style={styles.cardTopSection}>
          <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.patientSection}>
          <Icon name="person" size={20} color="#007AFF" style={styles.sectionIcon} />
          <View style={styles.sectionContent}>
            <Text style={styles.patientName}>{item.patientName}</Text>
            <Text style={styles.patientPhone}>Fee: ₹{item.consultationFee}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.doctorSection}>
          <Icon name="medical-services" size={18} color="#34C759" style={styles.sectionIcon} />
          <View style={styles.sectionContent}>
            <Text style={styles.doctorName}>Dr. {item.doctorName}</Text>
            <Text style={styles.specialty}>{item.doctorSpecialization}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.appointmentDetails}>
          <View style={styles.detailRow}>
            <Icon name="calendar-today" size={18} color="#FF9500" />
            <Text style={styles.detailText}>{date}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="access-time" size={18} color="#FF9500" />
            <Text style={styles.detailText}>{time}</Text>
          </View>
        </View>

        {item.symptoms && (
          <View style={styles.symptomsContainer}>
            <View style={styles.symptomsHeader}>
              <Icon name="description" size={16} color="#666" />
              <Text style={styles.symptomsLabel}>Symptoms</Text>
            </View>
            <Text style={styles.symptomsText}>{item.symptoms}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (firebaseError) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Error Loading Appointments</Text>
        <Text style={styles.errorSubtext}>
          {errorMessage || 'Please check your Firebase configuration'}
        </Text>
        {errorMessage.includes('Permission Denied') && (
          <Text style={styles.errorHint}>
            Update Firestore rules to allow admin access to appointments collection
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'scheduled', 'ongoing', 'completed', 'cancelled'].map(status => {
            let count = 0;
            let label = status.charAt(0).toUpperCase() + status.slice(1);
            
            switch (status) {
              case 'all':
                count = allCount;
                break;
              case 'scheduled':
                count = scheduledCount;
                break;
              case 'ongoing':
                count = ongoingCount;
                break;
              case 'completed':
                count = completedCount;
                break;
              case 'cancelled':
                count = cancelledCount;
                break;
            }
            
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  filter === status && styles.filterChipActive,
                ]}
                onPress={() => setFilter(status as any)}>
                <Text
                  style={[
                    styles.filterText,
                    filter === status && styles.filterTextActive,
                  ]}>
                  {label}
                  {status !== 'all' && ` (${count})`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={filteredConsultations}
        renderItem={renderConsultation}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="event-busy" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No consultations found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 5,
  },
  filterChipActive: {
    backgroundColor: '#FF9500',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardTopSection: {
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  patientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  doctorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionContent: {
    flex: 1,
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  patientPhone: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  specialty: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  appointmentDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 8,
    backgroundColor: '#fafafa',
    borderRadius: 10,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  symptomsContainer: {
    marginTop: 8,
    padding: 14,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30',
  },
  symptomsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  symptomsLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  symptomsText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 80,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 17,
    color: '#999',
    marginTop: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginTop: 15,
    textAlign: 'center',
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  errorHint: {
    fontSize: 12,
    color: '#007AFF',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 30,
    fontStyle: 'italic',
  },
});
