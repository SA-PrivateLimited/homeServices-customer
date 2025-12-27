import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import firebaseApp from '@react-native-firebase/app';
import {launchImageLibrary} from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Helper function to check if Firebase is initialized
const isFirebaseInitialized = (): boolean => {
  try {
    firebaseApp.app();
    return true;
  } catch (error) {
    return false;
  }
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SPECIALTIES = [
  'General Physician',
  'Cardiologist',
  'Dermatologist',
  'Pediatrician',
  'Orthopedic',
  'Gynecologist',
  'ENT Specialist',
  'Neurologist',
  'Psychiatrist',
  'Dentist',
];

const LANGUAGES = ['English', 'Hindi', 'Bengali', 'Telugu', 'Marathi', 'Tamil', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'];

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySlots {
  [key: string]: TimeSlot[];
}

export default function EditDoctorScreen({route, navigation}: any) {
  const {doctor} = route.params;

  const [name, setName] = useState(doctor.name || '');
  // Handle both specialization and specialty fields for backward compatibility
  const [specialty, setSpecialty] = useState(() => {
    const savedSpecialization = (doctor.specialization || doctor.specialty || '').trim();
    if (savedSpecialization) {
      const normalized = SPECIALTIES.find(spec => 
        spec.toLowerCase() === savedSpecialization.toLowerCase() ||
        spec === savedSpecialization
      );
      return normalized || savedSpecialization;
    }
    return '';
  });
  const [email, setEmail] = useState(doctor.email || '');
  const [phone, setPhone] = useState(doctor.phone || '');
  const [experience, setExperience] = useState(doctor.experience ? doctor.experience.toString() : '0');
  const [qualification, setQualification] = useState(() => {
    // Handle both qualifications (array) and qualification (string) fields
    if (Array.isArray(doctor.qualifications)) {
      return doctor.qualifications.join(', ');
    }
    return doctor.qualification || '';
  });
  const [consultationFee, setConsultationFee] = useState(doctor.consultationFee ? doctor.consultationFee.toString() : '0');
  const [languages, setLanguages] = useState<string[]>(doctor.languages || []);
  const [availableDays, setAvailableDays] = useState<string[]>(doctor.availableDays || []);
  const [timeSlots, setTimeSlots] = useState<DaySlots>(doctor.timeSlots || {});
  const [photo, setPhoto] = useState<string | null>(() => {
    const existingImage = doctor.profileImage || doctor.photo;
    if (existingImage && typeof existingImage === 'string' && existingImage.trim() !== '' && 
        (existingImage.startsWith('http://') || existingImage.startsWith('https://') || 
         existingImage.startsWith('file://') || existingImage.startsWith('content://'))) {
      return existingImage.trim();
    }
    return null;
  });
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showSlotModal, setShowSlotModal] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartTime, setTempStartTime] = useState(new Date());
  const [tempEndTime, setTempEndTime] = useState(new Date());

  const toggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
      // Remove time slots for this day
      const newSlots = {...timeSlots};
      delete newSlots[day];
      setTimeSlots(newSlots);
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const openSlotModal = (day: string) => {
    setSelectedDay(day);
    setShowSlotModal(true);
  };

  const addTimeSlot = () => {
    if (!selectedDay) return;

    const startHour = tempStartTime.getHours().toString().padStart(2, '0');
    const startMin = tempStartTime.getMinutes().toString().padStart(2, '0');
    const endHour = tempEndTime.getHours().toString().padStart(2, '0');
    const endMin = tempEndTime.getMinutes().toString().padStart(2, '0');

    const newSlot: TimeSlot = {
      start: `${startHour}:${startMin}`,
      end: `${endHour}:${endMin}`,
    };

    setTimeSlots({
      ...timeSlots,
      [selectedDay]: [...(timeSlots[selectedDay] || []), newSlot],
    });
  };

  const removeTimeSlot = (day: string, index: number) => {
    const daySlots = timeSlots[day] || [];
    const newDaySlots = daySlots.filter((_, i) => i !== index);

    if (newDaySlots.length === 0) {
      const newSlots = {...timeSlots};
      delete newSlots[day];
      setTimeSlots(newSlots);
    } else {
      setTimeSlots({
        ...timeSlots,
        [day]: newDaySlots,
      });
    }
  };

  const pickImage = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets[0].uri) {
        setPhoto(response.assets[0].uri);
        setImageError(false); // Reset error when new image is selected
      }
    });
  };

  const handleImageError = () => {
    // If image fails to load, show placeholder
    setImageError(true);
    setPhoto(null);
  };

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const uploadImage = async (uri: string): Promise<string> => {
    if (!isFirebaseInitialized()) {
      throw new Error('Firebase is not initialized');
    }
    const filename = `doctors/${Date.now()}.jpg`;
    const reference = storage().ref(filename);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  const handleUpdateDoctor = async () => {
    if (!isFirebaseInitialized()) {
      Alert.alert('Error', 'Firebase is not initialized. Please restart the app.');
      return;
    }

    if (!name || !specialty || !email || !phone || !experience || !qualification || !consultationFee) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (languages.length === 0) {
      Alert.alert('Error', 'Please select at least one language');
      return;
    }

    if (availableDays.length === 0) {
      Alert.alert('Error', 'Please select at least one available day');
      return;
    }

    setLoading(true);
    try {
      let photoUrl = doctor.profileImage || doctor.photo || '';
      
      // Only upload if photo is a local file (starts with file:// or content://)
      // Skip if it's already a Firebase/HTTP URL
      if (photo && (photo.startsWith('file://') || photo.startsWith('content://'))) {
        try {
          photoUrl = await uploadImage(photo);
        } catch (uploadError: any) {
          // If upload fails, keep existing image URL or skip image
          if (uploadError.code === 'storage/file-not-found') {
            Alert.alert(
              'Image Upload Failed',
              'The selected image file could not be found. Please select the image again.',
            );
            setLoading(false);
            return;
          }
          // For other errors, continue without image or use existing
          Alert.alert('Warning', 'Failed to upload image. Profile will be saved without updating the image.');
        }
      } else if (photo && (photo.startsWith('http://') || photo.startsWith('https://'))) {
        // If it's already a URL (Firebase or other), use it as is
        photoUrl = photo;
      }

      await firestore().collection('providers').doc(doctor.id).update({
        name,
        specialization: specialty, // Save to specialization field
        specialty, // Also save to specialty for backward compatibility
        email,
        phone,
        experience: parseInt(experience, 10),
        qualification,
        consultationFee: parseFloat(consultationFee),
        languages,
        availableDays,
        timeSlots,
        profileImage: photoUrl, // Save to profileImage field
        photo: photoUrl, // Also save to photo for backward compatibility
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Doctor updated successfully', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update doctor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage} activeOpacity={0.8}>
          {photo && photo.trim() !== '' && !imageError ? (
            <View style={styles.imageContainer}>
              <Image
                source={{uri: photo}}
                style={styles.photo}
                onError={handleImageError}
                resizeMode="cover"
              />
              <View style={styles.imageOverlay}>
                <Icon name="edit" size={20} color="#fff" />
                <Text style={styles.editText}>Change Photo</Text>
              </View>
            </View>
          ) : (
            <View style={styles.photoPlaceholder}>
              {name && name.trim() !== '' ? (
                <>
                  <Text style={styles.initialsText}>
                    {name.trim().charAt(0).toUpperCase()}
                  </Text>
                  <View style={styles.plusIconContainer}>
                    <Icon name="add" size={20} color="#fff" />
                  </View>
                </>
              ) : (
                <>
                  <Icon name="person" size={48} color="#007AFF" />
                  <View style={styles.plusIconContainer}>
                    <Icon name="add" size={20} color="#fff" />
                  </View>
                </>
              )}
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="Dr. John Doe"
        />

        <Text style={styles.label}>Specialty *</Text>
        <View style={styles.specialtyContainer}>
          {SPECIALTIES.map(spec => (
            <TouchableOpacity
              key={spec}
              style={[
                styles.specialtyChip,
                specialty === spec && styles.specialtyChipSelected,
              ]}
              onPress={() => setSpecialty(spec)}>
              <Text
                style={[
                  styles.specialtyText,
                  specialty === spec && styles.specialtyTextSelected,
                ]}>
                {spec}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="doctor@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Phone *</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder="+91 9876543210"
          keyboardType="phone-pad"
        />

        <Text style={styles.label}>Experience (years) *</Text>
        <TextInput
          style={styles.input}
          value={experience}
          onChangeText={setExperience}
          placeholder="5"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Qualification *</Text>
        <TextInput
          style={styles.input}
          value={qualification}
          onChangeText={setQualification}
          placeholder="MBBS, MD"
        />

        <Text style={styles.label}>Consultation Fee (₹) *</Text>
        <TextInput
          style={styles.input}
          value={consultationFee}
          onChangeText={setConsultationFee}
          placeholder="500"
          keyboardType="numeric"
        />

        <Text style={styles.label}>Languages *</Text>
        <View style={styles.languagesContainer}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang}
              style={[
                styles.languageChip,
                languages.includes(lang) && styles.languageChipSelected,
              ]}
              onPress={() => toggleLanguage(lang)}>
              <Text
                style={[
                  styles.languageText,
                  languages.includes(lang) && styles.languageTextSelected,
                ]}>
                {lang}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Available Days *</Text>
        <View style={styles.daysContainer}>
          {DAYS.map(day => (
            <TouchableOpacity
              key={day}
              style={[
                styles.dayChip,
                availableDays.includes(day) && styles.dayChipSelected,
              ]}
              onPress={() => toggleDay(day)}>
              <Text
                style={[
                  styles.dayText,
                  availableDays.includes(day) && styles.dayTextSelected,
                ]}>
                {day.substring(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {availableDays.length > 0 && (
          <>
            <Text style={styles.label}>Time Slots</Text>
            <Text style={styles.helperText}>
              Set available time slots for each day
            </Text>
            {availableDays.map(day => (
              <View key={day} style={styles.daySlotContainer}>
                <View style={styles.daySlotHeader}>
                  <Text style={styles.daySlotTitle}>{day}</Text>
                  <TouchableOpacity
                    style={styles.addSlotButton}
                    onPress={() => openSlotModal(day)}>
                    <Icon name="add-circle" size={24} color="#007AFF" />
                  </TouchableOpacity>
                </View>
                {timeSlots[day] && timeSlots[day].length > 0 ? (
                  <View style={styles.slotsListContainer}>
                    {timeSlots[day].map((slot, index) => (
                      <View key={index} style={styles.slotItem}>
                        <Icon name="access-time" size={16} color="#666" />
                        <Text style={styles.slotText}>
                          {slot.start} - {slot.end}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeTimeSlot(day, index)}>
                          <Icon name="close" size={20} color="#FF3B30" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noSlotsText}>No time slots added</Text>
                )}
              </View>
            ))}
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleUpdateDoctor}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Update Doctor</Text>
          )}
        </TouchableOpacity>
      </View>

      <Modal
        visible={showSlotModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowSlotModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add Time Slot for {selectedDay}
              </Text>
              <TouchableOpacity onPress={() => setShowSlotModal(false)}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.timePickerContainer}>
              <Text style={styles.timeLabel}>Start Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowStartPicker(true)}>
                <Icon name="access-time" size={20} color="#007AFF" />
                <Text style={styles.timeButtonText}>
                  {tempStartTime.getHours().toString().padStart(2, '0')}:
                  {tempStartTime.getMinutes().toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>

              {showStartPicker && (
                <DateTimePicker
                  value={tempStartTime}
                  mode="time"
                  is24Hour={true}
                  onChange={(event, date) => {
                    setShowStartPicker(false);
                    if (date) setTempStartTime(date);
                  }}
                />
              )}
            </View>

            <View style={styles.timePickerContainer}>
              <Text style={styles.timeLabel}>End Time</Text>
              <TouchableOpacity
                style={styles.timeButton}
                onPress={() => setShowEndPicker(true)}>
                <Icon name="access-time" size={20} color="#007AFF" />
                <Text style={styles.timeButtonText}>
                  {tempEndTime.getHours().toString().padStart(2, '0')}:
                  {tempEndTime.getMinutes().toString().padStart(2, '0')}
                </Text>
              </TouchableOpacity>

              {showEndPicker && (
                <DateTimePicker
                  value={tempEndTime}
                  mode="time"
                  is24Hour={true}
                  onChange={(event, date) => {
                    setShowEndPicker(false);
                    if (date) setTempEndTime(date);
                  }}
                />
              )}
            </View>

            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                addTimeSlot();
                setShowSlotModal(false);
              }}>
              <Text style={styles.addButtonText}>Add Slot</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 20,
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  imageContainer: {
    position: 'relative',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderBottomLeftRadius: 60,
    borderBottomRightRadius: 60,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  editText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '600',
  },
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  initialsText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#007AFF',
  },
  plusIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  photoText: {
    color: '#666',
  },
  label: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  specialtyContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  specialtyChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 10,
    marginBottom: 10,
  },
  specialtyChipSelected: {
    backgroundColor: '#007AFF',
  },
  specialtyText: {
    color: '#007AFF',
    fontSize: 14,
  },
  specialtyTextSelected: {
    color: '#fff',
  },
  languagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  languageChip: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 10,
    marginBottom: 10,
  },
  languageChipSelected: {
    backgroundColor: '#007AFF',
  },
  languageText: {
    color: '#007AFF',
    fontSize: 14,
  },
  languageTextSelected: {
    color: '#fff',
  },
  daysContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  dayChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
    marginBottom: 8,
  },
  dayChipSelected: {
    backgroundColor: '#007AFF',
  },
  dayText: {
    color: '#007AFF',
    fontSize: 12,
  },
  dayTextSelected: {
    color: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 15,
    marginTop: -8,
  },
  daySlotContainer: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  daySlotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  daySlotTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  addSlotButton: {
    padding: 4,
  },
  slotsListContainer: {
    gap: 8,
  },
  slotItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  slotText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  noSlotsText: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  timePickerContainer: {
    marginBottom: 20,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  timeButtonText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  addButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
