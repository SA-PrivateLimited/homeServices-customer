import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {Calendar} from 'react-native-calendars';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import type {Doctor, TimeSlot} from '../types/consultation';
import consultationService from '../services/consultationService';
import notificationService from '../services/notificationService';
import TimeSlotPicker from '../components/TimeSlotPicker';
import {serializeDoctorForNavigation} from '../utils/helpers';
import PaymentSuccessModal from '../components/PaymentSuccessModal';
import PaymentRequiredModal from '../components/PaymentRequiredModal';

interface BookingScreenProps {
  navigation: any;
  route: {
    params: {
      doctor: Doctor;
    };
  };
}

const BookingScreen: React.FC<BookingScreenProps> = ({navigation, route}) => {
  const {doctor} = route.params;
  const {isDarkMode, currentUser, addConsultation, setRedirectAfterLogin} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [symptoms, setSymptoms] = useState('');
  const [notes, setNotes] = useState('');
  const [patientAge, setPatientAge] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentRequiredModal, setShowPaymentRequiredModal] = useState(false);
  const [bookedConsultation, setBookedConsultation] = useState<any>(null);
  const [pendingConsultation, setPendingConsultation] = useState<any>(null);

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get max date (30 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate);
    }
  }, [selectedDate]);

  const loadAvailableSlots = async (date: string) => {
    setLoadingSlots(true);
    setSelectedSlot(null);
    try {
      const slots = await consultationService.fetchDoctorAvailability(
        doctor.id,
        date,
      );
      
      // Filter out past time slots if the selected date is today
      const todayDate = getTodayDate();
      if (date === todayDate) {
        const now = new Date();
        
        const filteredSlots = slots.filter(slot => {
          // Create a Date object for this slot's start time
          const [hours, minutes] = slot.startTime.split(':').map(Number);
          const slotDateTime = new Date();
          slotDateTime.setHours(hours, minutes, 0, 0);
          
          // Only include slots that are at least 1 minute in the future
          // This prevents booking slots that are about to start
          const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
          
          return slotDateTime >= oneMinuteFromNow;
        });
        
        setAvailableSlots(filteredSlots);
      } else {
        setAvailableSlots(slots);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookConsultation = async () => {
    if (!currentUser) {
      Alert.alert(
        'Login Required',
        'Please login to book a consultation',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Login',
            onPress: () => {
              const serializableDoctor = serializeDoctorForNavigation(doctor);
              setRedirectAfterLogin({route: 'Booking', params: {doctor: serializableDoctor}});
              navigation.navigate('Login');
            },
          },
        ]
      );
      return;
    }

    // Check if user has a phone number
    if (!currentUser.phone || currentUser.phone.trim() === '') {
      Alert.alert(
        'Phone Number Required',
        'Please add your phone number in your profile before booking a consultation. This helps doctors contact you if needed.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Add Phone Number',
            onPress: () => {
              const serializableDoctor = serializeDoctorForNavigation(doctor);
              setRedirectAfterLogin({route: 'Booking', params: {doctor: serializableDoctor}});
              navigation.navigate('Profile');
            },
          },
        ]
      );
      return;
    }

    if (!selectedDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }

    if (!selectedSlot) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }

    // Create scheduled time from date and slot
    const [hours, minutes] = selectedSlot.startTime.split(':');
    const [year, month, day] = selectedDate.split('-').map(Number);
    const scheduledTime = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0, 0);

    // Validate that the scheduled time is in the future
    // Add 1 minute buffer to prevent booking slots that are about to start
    const now = new Date();
    const oneMinuteFromNow = new Date(now.getTime() + 60 * 1000);
    
    if (scheduledTime < oneMinuteFromNow) {
      Alert.alert(
        'Invalid Time',
        'You cannot book a consultation for a time that has already passed or is too soon. Please select a future time slot.',
      );
      return;
    }

    setLoading(true);
    try {
      // Create consultation with pending payment status
      const consultation = await consultationService.bookConsultation(
        {
          doctorId: doctor.id,
          doctorName: doctor.name,
          doctorSpecialization: doctor.specialization,
          patientId: currentUser.id,
          patientName: currentUser.name,
          patientAge: patientAge ? parseInt(patientAge, 10) : undefined,
          patientPhone: currentUser.phone || undefined,
          scheduledTime,
          consultationFee: doctor.consultationFee,
          symptoms: symptoms.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        selectedSlot,
        selectedDate,
      );

      await addConsultation(consultation);

      // Navigate to payment screen
      navigation.navigate('Payment', {
        consultationId: consultation.id,
        amount: doctor.consultationFee,
        description: `Consultation with Dr. ${doctor.name}`,
        doctorName: doctor.name,
        onPaymentSuccess: async () => {
          // Fetch updated consultation with payment status from Firestore
          let consultationWithPayment;
          try {
            const updatedConsultation = await consultationService.fetchConsultationById(consultation.id);
            consultationWithPayment = updatedConsultation || {
              ...consultation,
              paymentStatus: 'paid' as const,
            };
          } catch (error) {
            // If fetch fails, use consultation with updated paymentStatus
            consultationWithPayment = {
              ...consultation,
              paymentStatus: 'paid' as const,
            };
          }

          // Send booking confirmation notification with updated payment status
          notificationService.sendBookingConfirmation(consultationWithPayment);

      // Schedule reminder for 1 hour before consultation
          notificationService.scheduleConsultationReminder(consultationWithPayment);

          // Store consultation details and show success modal
          setBookedConsultation(consultationWithPayment);
          setShowSuccessModal(true);
        },
        onPaymentCancel: () => {
          // Store consultation details and show payment required modal
          setPendingConsultation(consultation);
          setShowPaymentRequiredModal(true);
        },
      });
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to book consultation. Please try again.';
      Alert.alert('Booking Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      contentContainerStyle={styles.content}>
      {/* Doctor Info */}
      <View
        style={[
          styles.doctorCard,
          {backgroundColor: theme.card},
          commonStyles.shadowSmall,
        ]}>
        <Text style={[styles.doctorName, {color: theme.text}]}>
          Dr. {doctor.name}
        </Text>
        <Text style={[styles.specialization, {color: theme.textSecondary}]}>
          {doctor.specialization}
        </Text>
        <View style={styles.feeRow}>
          <Icon name="cash-outline" size={16} color={theme.primary} />
          <Text style={[styles.fee, {color: theme.primary}]}>
            Consultation Fee: ₹{doctor.consultationFee}
          </Text>
        </View>
      </View>

      {/* Calendar */}
      <View
        style={[
          styles.section,
          {backgroundColor: theme.card},
          commonStyles.shadowSmall,
        ]}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          Select Date
        </Text>
        <Calendar
          minDate={getTodayDate()}
          maxDate={getMaxDate()}
          onDayPress={day => {
            // Double check that selected date is not in the past
            const selected = new Date(day.dateString);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selected >= today) {
              setSelectedDate(day.dateString);
            } else {
              Alert.alert('Invalid Date', 'You cannot select a past date for booking consultations.');
            }
          }}
          disableAllTouchEventsForDisabledDays={true}
          markedDates={{
            [selectedDate]: {
              selected: true,
              selectedColor: theme.primary,
            },
          }}
          theme={{
            backgroundColor: theme.card,
            calendarBackground: theme.card,
            textSectionTitleColor: theme.textSecondary,
            selectedDayBackgroundColor: theme.primary,
            selectedDayTextColor: '#ffffff',
            todayTextColor: theme.primary,
            dayTextColor: theme.text,
            textDisabledColor: theme.border,
            monthTextColor: theme.text,
            arrowColor: theme.primary,
            disabledDayTextColor: theme.border,
          }}
        />
      </View>

      {/* Time Slots */}
      {selectedDate && (
        <View
          style={[
            styles.section,
            {backgroundColor: theme.card},
            commonStyles.shadowSmall,
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            Select Time Slot
          </Text>

          {loadingSlots ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.loadingText, {color: theme.textSecondary}]}>
                Loading available slots...
              </Text>
            </View>
          ) : (
            <TimeSlotPicker
              slots={availableSlots}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
            />
          )}
        </View>
      )}

      {/* Patient Details */}
      {selectedSlot && (
        <View
          style={[
            styles.section,
            {backgroundColor: theme.card},
            commonStyles.shadowSmall,
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            Patient Details
          </Text>

          <Text style={[styles.label, {color: theme.textSecondary}]}>
            Age (Optional)
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
                minHeight: 50,
              },
            ]}
            placeholder="Enter your age in years"
            placeholderTextColor={theme.textSecondary}
            value={patientAge}
            onChangeText={setPatientAge}
            keyboardType="number-pad"
          />

          <Text style={[styles.label, {color: theme.textSecondary}]}>
            Symptoms (Optional)
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
            placeholder="Describe your symptoms..."
            placeholderTextColor={theme.textSecondary}
            value={symptoms}
            onChangeText={setSymptoms}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          <Text style={[styles.label, {color: theme.textSecondary}]}>
            Notes (Optional)
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                color: theme.text,
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
            placeholder="Any additional notes..."
            placeholderTextColor={theme.textSecondary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      )}

      {/* Book Button */}
      {selectedSlot && (
        <TouchableOpacity
          style={[
            styles.bookButton,
            {backgroundColor: theme.primary},
            loading && styles.buttonDisabled,
          ]}
          onPress={handleBookConsultation}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="calendar" size={20} color="#fff" />
              <Text style={styles.bookButtonText}>
                Book Consultation - ₹{doctor.consultationFee}
              </Text>
            </>
          )}
        </TouchableOpacity>
      )}

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        visible={showSuccessModal}
        onViewConsultations={() => {
          setShowSuccessModal(false);
          navigation.navigate('Consultations', {
            screen: 'ConsultationsHistory',
          });
        }}
        onClose={() => {
          setShowSuccessModal(false);
          navigation.goBack();
        }}
        consultationDetails={
          bookedConsultation
            ? {
                doctorName: bookedConsultation.doctorName,
                scheduledTime: bookedConsultation.scheduledTime,
                consultationId: bookedConsultation.id,
              }
            : undefined
        }
      />

      {/* Payment Required Modal */}
      <PaymentRequiredModal
        visible={showPaymentRequiredModal}
        onViewConsultations={() => {
          setShowPaymentRequiredModal(false);
          navigation.navigate('Consultations', {
            screen: 'ConsultationsHistory',
          });
        }}
        onClose={() => {
          setShowPaymentRequiredModal(false);
          navigation.goBack();
        }}
        consultationDetails={
          pendingConsultation
            ? {
                doctorName: pendingConsultation.doctorName,
                scheduledTime: pendingConsultation.scheduledTime,
                consultationId: pendingConsultation.id,
                amount: pendingConsultation.consultationFee,
              }
            : undefined
        }
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  doctorCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  doctorName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    marginBottom: 12,
  },
  feeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fee: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 14,
    marginLeft: 10,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 80,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
});

export default BookingScreen;
