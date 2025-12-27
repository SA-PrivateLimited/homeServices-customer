import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
  Dimensions,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';
import GuideTooltip, {GuideStep} from '../components/GuideTooltip';
import {useAppGuide} from '../hooks/useAppGuide';

const {height} = Dimensions.get('window');

// Guide steps for doctors
const doctorGuideSteps: GuideStep[] = [
  {
    id: 'calendar',
    title: 'Appointment Calendar',
    message: 'View all your appointments on the calendar. Dates with appointments are marked with dots.',
    position: {top: 120, left: 20},
    arrowDirection: 'top',
  },
  {
    id: 'filters',
    title: 'Filter Appointments',
    message: 'Filter appointments by status: scheduled, in-progress, completed, or cancelled.',
    position: {top: height / 2 - 50, left: 20},
    arrowDirection: 'top',
  },
  {
    id: 'appointment-card',
    title: 'Appointment Details',
    message: 'Tap on any appointment to view patient details, add diagnosis, and create prescriptions.',
    position: {bottom: 200, left: 20},
    arrowDirection: 'bottom',
  },
  {
    id: 'availability',
    title: 'Manage Availability',
    message: 'Set your availability from the Profile tab to let patients book consultations with you.',
    position: {bottom: 100, left: 20},
    arrowDirection: 'bottom',
  },
];

interface Appointment {
  id: string;
  patientName: string;
  patientPhone?: string;
  patientAge?: number;
  date: string;
  time: string;
  status: string;
  symptoms?: string;
  diagnosis?: string;
  prescription?: string;
  scheduledTime?: any;
  googleMeetLink?: string;
  notes?: string;
  [key: string]: any; // Allow other consultation fields
}

interface AppointmentsScreenProps {
  navigation?: any;
}

export default function AppointmentsScreen({navigation}: AppointmentsScreenProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [markedDates, setMarkedDates] = useState<any>({});
  const [selectedDate, setSelectedDate] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled'>('all');
  const currentUser = auth().currentUser;

  // Initialize guide for doctors
  const guide = useAppGuide('doctor_appointments', doctorGuideSteps, 'doctor');

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
              const appointmentsList = snapshot.docs.map(doc => {
                const data = doc.data();
                const scheduledTime = data.scheduledTime?.toDate() || new Date();
                
                // Convert scheduledTime to date string (YYYY-MM-DD)
                const date = scheduledTime.toISOString().split('T')[0];
                // Convert to time string (HH:MM AM/PM)
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
                  status: data.status || 'scheduled',
                } as Appointment;
              });

              setAppointments(appointmentsList);

              const marked: any = {};
              appointmentsList.forEach(app => {
                marked[app.date] = {
                  marked: true,
                  dotColor: app.status === 'completed' ? '#34C759' : '#007AFF',
                };
              });
              setMarkedDates(marked);
              setLoading(false);
            },
            error => {
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

  const selectedAppointments = appointments.filter(
    app => app.date === selectedDate
  );

  // Filter appointments by status
  const getFilteredAppointments = (type: 'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled') => {
    let filtered: Appointment[] = [];
    switch (type) {
      case 'all':
        filtered = appointments;
        break;
      case 'scheduled':
        filtered = appointments.filter(a => a.status === 'pending' || a.status === 'scheduled');
        break;
      case 'in-progress':
        filtered = appointments.filter(a => a.status === 'in-progress' || a.status === 'ongoing');
        break;
      case 'completed':
        filtered = appointments.filter(a => a.status === 'completed');
        break;
      case 'cancelled':
        filtered = appointments.filter(a => a.status === 'cancelled');
        break;
      default:
        filtered = appointments;
    }
    
    // Sort by scheduledTime (most recent first)
    return filtered.sort((a, b) => {
      const timeA = a.scheduledTime?.toDate?.() || new Date(a.date + ' ' + a.time);
      const timeB = b.scheduledTime?.toDate?.() || new Date(b.date + ' ' + b.time);
      return timeB.getTime() - timeA.getTime();
    });
  };

  const handleStatCardPress = (type: 'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled') => {
    setFilterType(type);
    setModalVisible(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return '#34C759';
      case 'in-progress':
      case 'ongoing':
        return '#007AFF';
      case 'pending':
      case 'scheduled':
        return '#FF9500';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

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

  const getModalTitle = () => {
    switch (filterType) {
      case 'all':
        return 'All Appointments';
      case 'scheduled':
        return 'Scheduled Appointments';
      case 'in-progress':
        return 'In Progress Appointments';
      case 'completed':
        return 'Completed Appointments';
      case 'cancelled':
        return 'Cancelled Appointments';
      default:
        return 'Appointments';
    }
  };

  const filteredAppointments = getFilteredAppointments(filterType);

  const handleConsultationPress = (appointment: Appointment) => {
    const plainConsultation = {
      id: appointment.id,
      patientName: appointment.patientName,
      patientPhone: appointment.patientPhone,
      patientAge: appointment.patientAge,
      date: appointment.date,
      time: appointment.time,
      status: appointment.status,
      symptoms: appointment.symptoms,
      diagnosis: appointment.diagnosis,
      prescription: appointment.prescription,
      scheduledTime: appointment.scheduledTime,
      googleMeetLink: appointment.googleMeetLink,
      notes: appointment.notes,
    };
    setModalVisible(false);
    navigation?.navigate('DoctorConsultationDetail', {
      consultation: plainConsultation,
    });
  };

  const renderConsultationCard = ({item}: {item: Appointment}) => (
    <TouchableOpacity
      style={styles.modalConsultationCard}
      onPress={() => handleConsultationPress(item)}
      activeOpacity={0.7}>
      <View style={styles.modalCardHeader}>
        <View style={styles.modalPatientInfo}>
          <View style={styles.modalAvatar}>
            <Icon name="person" size={24} color="#007AFF" />
          </View>
          <View style={styles.modalPatientDetails}>
            <Text style={styles.modalPatientName} numberOfLines={1}>
              {item.patientName}
            </Text>
            <Text style={styles.modalPatientAge}>
              {item.patientAge ? `${item.patientAge} years old` : 'Age not specified'}
            </Text>
          </View>
        </View>
        <View style={[styles.modalStatusPill, {backgroundColor: getStatusColor(item.status)}]}>
          <Text style={styles.modalStatusPillText}>{getStatusLabel(item.status)}</Text>
        </View>
      </View>

      <View style={styles.modalConsultationDetails}>
        <View style={styles.modalDetailRow}>
          <Icon name="calendar-today" size={18} color="#666" />
          <Text style={styles.modalDetailText}>{item.date}</Text>
        </View>
        <View style={styles.modalDetailRow}>
          <Icon name="access-time" size={18} color="#666" />
          <Text style={styles.modalDetailText}>{item.time}</Text>
        </View>
        {item.patientPhone && (
          <View style={styles.modalDetailRow}>
            <Icon name="phone" size={18} color="#666" />
            <Text style={styles.modalDetailText}>{item.patientPhone}</Text>
          </View>
        )}
        {item.symptoms && (
          <View style={styles.modalDetailRow}>
            <Icon name="local-hospital" size={18} color="#666" />
            <Text style={styles.modalDetailText} numberOfLines={2}>
              {item.symptoms}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Calendar
        markedDates={{
          ...markedDates,
          [selectedDate]: {
            ...markedDates[selectedDate],
            selected: true,
            selectedColor: '#007AFF',
          },
        }}
        onDayPress={day => setSelectedDate(day.dateString)}
        theme={{
          todayTextColor: '#007AFF',
          selectedDayBackgroundColor: '#007AFF',
          selectedDayTextColor: '#ffffff',
          arrowColor: '#007AFF',
        }}
      />

      <View style={styles.appointmentsContainer}>
        <Text style={styles.appointmentsTitle}>
          {selectedDate
            ? `Appointments on ${selectedDate}`
            : 'Select a date to view appointments'}
        </Text>

        <ScrollView
          style={styles.appointmentsScrollView}
          contentContainerStyle={styles.appointmentsScrollContent}
          showsVerticalScrollIndicator={true}>
        {selectedAppointments.length > 0 ? (
            selectedAppointments.map(appointment => {
              // Convert to plain object for navigation (fixes serialization warning)
              const handlePress = () => {
                const plainConsultation = {
                  id: appointment.id,
                  patientName: appointment.patientName,
                  patientPhone: appointment.patientPhone,
                  patientAge: appointment.patientAge,
                  date: appointment.date,
                  time: appointment.time,
                  status: appointment.status,
                  symptoms: appointment.symptoms,
                  diagnosis: appointment.diagnosis,
                  prescription: appointment.prescription,
                  scheduledTime: appointment.scheduledTime,
                  googleMeetLink: appointment.googleMeetLink,
                  notes: appointment.notes,
                };
                navigation?.navigate('DoctorConsultationDetail', {
                  consultation: plainConsultation,
                });
              };

              return (
                <TouchableOpacity
                  key={appointment.id}
                  style={styles.appointmentCard}
                  onPress={handlePress}
                  activeOpacity={0.7}>
              <View style={styles.appointmentHeader}>
                <Icon name="person" size={24} color="#007AFF" />
                <View style={styles.appointmentInfo}>
                  <Text style={styles.patientName}>
                    {appointment.patientName}
                  </Text>
                  <Text style={styles.appointmentTime}>
                    {appointment.time}
                  </Text>
                </View>
                    <View style={styles.appointmentRight}>
                <View
                  style={[
                    styles.statusDot,
                    {
                      backgroundColor:
                        appointment.status === 'completed'
                          ? '#34C759'
                            : appointment.status === 'in-progress' || appointment.status === 'ongoing'
                            ? '#007AFF'
                            : appointment.status === 'pending' || appointment.status === 'scheduled'
                            ? '#FF9500'
                            : '#FF9500', // Default to orange for pending
                    },
                  ]}
                />
                      <Icon name="chevron-right" size={20} color="#007AFF" style={styles.chevronIcon} />
                </View>
              </View>
                </TouchableOpacity>
              );
            })
        ) : selectedDate ? (
          <View style={styles.emptyContainer}>
            <Icon name="event-busy" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No appointments on this date</Text>
          </View>
        ) : null}
        </ScrollView>
      </View>

      <View style={styles.statsContainer}>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => handleStatCardPress('all')}
          activeOpacity={0.7}>
          <Text style={styles.statNumber}>{appointments.length}</Text>
          <Text style={styles.statLabel} numberOfLines={2}>
            Total Appointments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => handleStatCardPress('scheduled')}
          activeOpacity={0.7}>
          <Text style={styles.statNumber}>
            {appointments.filter(a => a.status === 'pending' || a.status === 'scheduled').length}
          </Text>
          <Text style={styles.statLabel}>Scheduled</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => handleStatCardPress('in-progress')}
          activeOpacity={0.7}>
          <Text style={styles.statNumber}>
            {appointments.filter(a => a.status === 'in-progress' || a.status === 'ongoing').length}
          </Text>
          <Text style={styles.statLabel} numberOfLines={2}>
            In Progress
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => handleStatCardPress('completed')}
          activeOpacity={0.7}>
          <Text style={styles.statNumber}>
            {appointments.filter(a => a.status === 'completed').length}
          </Text>
          <Text style={styles.statLabel}>Completed</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.statCard}
          onPress={() => handleStatCardPress('cancelled')}
          activeOpacity={0.7}>
          <Text style={styles.statNumber}>
            {appointments.filter(a => a.status === 'cancelled').length}
          </Text>
          <Text style={styles.statLabel}>Cancelled</Text>
        </TouchableOpacity>
      </View>

      {/* Modal for filtered consultations */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseButton}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {filteredAppointments.length > 0 ? (
              <FlatList
                data={filteredAppointments}
                keyExtractor={item => item.id}
                renderItem={renderConsultationCard}
                contentContainerStyle={styles.modalContent}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <View style={styles.modalEmptyContainer}>
                <Icon name="event-busy" size={64} color="#ccc" />
                <Text style={styles.modalEmptyText}>
                  No {filterType === 'all' ? '' : filterType.replace('-', ' ')} appointments found
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* App Guide Tooltip */}
      {guide.currentGuideStep && (
        <GuideTooltip
          visible={guide.showGuide}
          step={guide.currentGuideStep}
          currentStep={guide.currentStep}
          totalSteps={guide.totalSteps}
          onNext={guide.nextStep}
          onSkip={guide.skipGuide}
          onPrevious={guide.currentStep > 0 ? guide.previousStep : undefined}
        />
      )}
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
  appointmentsContainer: {
    flex: 1,
    padding: 15,
  },
  appointmentsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  appointmentsScrollView: {
    flex: 1,
  },
  appointmentsScrollContent: {
    paddingBottom: 10,
  },
  appointmentCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  appointmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appointmentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#1a1a1a',
  },
  appointmentTime: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  appointmentRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  chevronIcon: {
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 30,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    minWidth: 0,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: '#666',
    textAlign: 'center',
    lineHeight: 13,
    paddingHorizontal: 2,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalContent: {
    padding: 15,
  },
  modalEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  modalEmptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
  },
  modalConsultationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  modalCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPatientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  modalAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modalPatientDetails: {
    flex: 1,
  },
  modalPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  modalPatientAge: {
    fontSize: 14,
    color: '#666',
  },
  modalStatusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  modalStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  modalConsultationDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  modalDetailText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
    flex: 1,
  },
});
