import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface Consultation {
  id: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  date: string;
  time: string;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled' | 'pending' | 'in-progress';
  symptoms: string;
  diagnosis?: string;
  prescription?: string;
  scheduledTime?: any;
  googleMeetLink?: string;
  notes?: string;
  cancellationReason?: string;
}

export default function ConsultationsScreen({navigation}: any) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled'>('all');
  const currentUser = auth().currentUser;

  useEffect(() => {
    if (!currentUser) return;

    // First, get the doctor ID from the doctors collection
    const getDoctorId = async () => {
      try {
        const doctorSnapshot = await firestore()
          .collection('providers')
          .where('email', '==', currentUser.email)
          .limit(1)
          .get();

        if (doctorSnapshot.empty) {
          setLoading(false);
          return;
        }

        const doctorId = doctorSnapshot.docs[0].id;

        // Now fetch consultations for this doctor
        const unsubscribe = firestore()
          .collection('consultations')
          .where('doctorId', '==', doctorId)
          .onSnapshot(
            snapshot => {
              const consultationsList = snapshot.docs.map(doc => {
                const data = doc.data();
                const scheduledTime = data.scheduledTime?.toDate() || new Date();
                
                // Convert scheduledTime to date and time strings
                const date = scheduledTime.toISOString().split('T')[0];
                const time = scheduledTime.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                });

                return {
                  id: doc.id,
                  ...data,
                  date,
                  time,
                  scheduledTime,
                } as Consultation;
              });

              // Sort in memory to avoid needing composite index
              consultationsList.sort((a, b) => {
                const dateA = a.scheduledTime?.getTime() || 0;
                const dateB = b.scheduledTime?.getTime() || 0;
                return dateB - dateA; // Descending order
              });

              setConsultations(consultationsList);
              setLoading(false);
            },
            error => {
              if (error.code === 'firestore/failed-precondition') {
              }
              setLoading(false);
            },
          );

        return unsubscribe;
      } catch (error) {
        setLoading(false);
        return () => {};
      }
    };

    const cleanup = getDoctorId();
    return () => {
      cleanup.then(unsubscribe => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [currentUser]);

  const getStatusColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'pending':
      case 'scheduled':
        return '#FF9500'; // Orange
      case 'in-progress':
      case 'ongoing':
        return '#007AFF'; // Blue
      case 'completed':
        return '#34C759'; // Green
      case 'cancelled':
        return '#FF3B30'; // Red
      default:
        return '#8E8E93'; // Gray
    }
  };

  const filteredConsultations = consultations.filter(consultation => {
    if (filter === 'all') return true;
    // Map status values: 'pending' -> 'scheduled', 'ongoing' -> 'in-progress'
    const statusMap: {[key: string]: string} = {
      'pending': 'scheduled',
      'scheduled': 'scheduled',
      'ongoing': 'in-progress',
      'completed': 'completed',
      'cancelled': 'cancelled',
    };
    const mappedStatus = statusMap[consultation.status] || consultation.status;
    return mappedStatus === filter;
  });

  // Calculate counts for each status
  const allCount = consultations.length;
  const scheduledCount = consultations.filter(
    c => c.status === 'pending' || c.status === 'scheduled'
  ).length;
  const inProgressCount = consultations.filter(
    c => c.status === 'in-progress' || c.status === 'ongoing'
  ).length;
  const completedCount = consultations.filter(c => c.status === 'completed').length;
  const cancelledCount = consultations.filter(c => c.status === 'cancelled').length;

  const renderConsultation = ({item}: {item: Consultation}) => {
    // Map status to display format
    const getStatusLabel = (status: string) => {
      switch (status.toLowerCase()) {
        case 'pending':
        case 'scheduled':
          return 'SCHEDULED';
        case 'in-progress':
        case 'ongoing':
          return 'IN-PROGRESS';
        case 'completed':
          return 'COMPLETED';
        case 'cancelled':
          return 'CANCELLED';
        default:
          return status.toUpperCase();
      }
    };

    // Convert to plain object for navigation (fixes serialization warning)
    const handlePress = () => {
      const plainConsultation = {
        id: item.id,
        patientName: item.patientName,
        patientPhone: item.patientPhone,
        patientAge: item.patientAge,
        date: item.date,
        time: item.time,
        status: item.status,
        symptoms: item.symptoms,
        diagnosis: item.diagnosis,
        prescription: item.prescription,
        scheduledTime: item.scheduledTime,
        googleMeetLink: item.googleMeetLink,
        notes: item.notes,
        cancellationReason: item.cancellationReason || '',
      };
      navigation.navigate('DoctorConsultationDetail', {consultation: plainConsultation});
    };

    return (
    <TouchableOpacity
      style={styles.consultationCard}
        onPress={handlePress}
        activeOpacity={0.7}>
        {/* Card Header with Status Pill */}
        <View style={styles.cardHeader}>
        <View style={styles.patientInfo}>
          <View style={styles.avatar}>
            <Icon name="person" size={24} color="#007AFF" />
          </View>
          <View style={styles.patientDetails}>
              <Text style={styles.patientName} numberOfLines={1}>
                {item.patientName}
              </Text>
              <Text style={styles.patientAge}>
                {item.patientAge ? `${item.patientAge} years old` : 'Age not specified'}
              </Text>
          </View>
        </View>
          <View style={[styles.statusPill, {backgroundColor: getStatusColor(item.status)}]}>
            <Text style={styles.statusPillText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

        {/* Consultation Details */}
      <View style={styles.consultationDetails}>
        <View style={styles.detailRow}>
            <Icon name="calendar-today" size={18} color="#666" />
          <Text style={styles.detailText}>{item.date}</Text>
        </View>
        <View style={styles.detailRow}>
            <Icon name="access-time" size={18} color="#666" />
          <Text style={styles.detailText}>{item.time}</Text>
        </View>
          {item.patientPhone && (
        <View style={styles.detailRow}>
              <Icon name="phone" size={18} color="#666" />
          <Text style={styles.detailText}>{item.patientPhone}</Text>
        </View>
          )}
      </View>

        {/* Symptoms Section */}
        {item.symptoms && (
      <View style={styles.symptomsContainer}>
        <Text style={styles.symptomsLabel}>Symptoms:</Text>
        <Text style={styles.symptomsText} numberOfLines={2}>
          {item.symptoms}
        </Text>
      </View>
        )}

        {/* Card Footer with Arrow */}
      <View style={styles.cardFooter}>
          <Icon name="chevron-right" size={24} color="#007AFF" />
      </View>
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

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {['all', 'scheduled', 'in-progress', 'completed', 'cancelled'].map(status => {
            let count = 0;
            let label = status === 'all' ? 'ALL' : status.toUpperCase().replace('-', ' ');
            
            switch (status) {
              case 'all':
                count = allCount;
                break;
              case 'scheduled':
                count = scheduledCount;
                break;
              case 'in-progress':
                count = inProgressCount;
                break;
              case 'completed':
                count = completedCount;
                break;
              case 'cancelled':
                count = cancelledCount;
                break;
            }
            
            const getActiveBackgroundColor = () => {
              if (filter === status) {
                if (status === 'all') {
                  return '#FFCC00'; // Yellow for all
                }
                if (status === 'completed') {
                  return '#34C759'; // Green for completed
                }
                if (status === 'in-progress') {
                  return '#007AFF'; // Blue for in-progress
                }
                if (status === 'cancelled') {
                  return '#FF3B30'; // Red for cancelled
                }
                return '#FF9500'; // Orange for other active filters
              }
              return null;
            };

            const activeBgColor = getActiveBackgroundColor();

            return (
          <TouchableOpacity
            key={status}
            style={[
                  styles.filterChip,
                  activeBgColor && {backgroundColor: activeBgColor},
            ]}
            onPress={() => setFilter(status as any)}>
            <Text
              style={[
                styles.filterText,
                filter === status && styles.filterTextActive,
                    filter === status && status === 'all' && {color: '#000'},
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
            <Icon name="medical-services" size={64} color="#ccc" />
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
    borderRadius: 8,
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
    textAlign: 'center',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 15,
  },
  consultationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  patientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allows text to shrink and truncate
    marginRight: 16, // Increased spacing from status pill
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    flexShrink: 0, // Prevents avatar from shrinking
  },
  patientDetails: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0, // Allows text to truncate properly
  },
  patientName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
    flexShrink: 1, // Allows text to shrink
  },
  patientAge: {
    fontSize: 13,
    color: '#666',
    fontWeight: '400',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
    flexShrink: 0, // Prevents status pill from shrinking
  },
  statusPillText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  consultationDetails: {
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  symptomsContainer: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  symptomsLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  symptomsText: {
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  cardFooter: {
    alignItems: 'flex-end',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15,
  },
});
