import React, {useState, useEffect} from 'react';
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
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import auth from '@react-native-firebase/auth';
import {launchImageLibrary} from 'react-native-image-picker';
import {useStore} from '../store';

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

export default function DoctorProfileSetupScreen({navigation}: any) {
  const {currentUser} = useStore();
  const [name, setName] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [slotDuration, setSlotDuration] = useState('30');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [existingProfile, setExistingProfile] = useState<any>(null);

  useEffect(() => {
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const user = auth().currentUser;
      if (!user) {
        navigation.goBack();
        return;
      }

      const doctorDoc = await firestore()
        .collection('providers')
        .where('email', '==', user.email)
        .limit(1)
        .get();

      if (!doctorDoc.empty) {
        const profile = {id: doctorDoc.docs[0].id, ...doctorDoc.docs[0].data()};
        setExistingProfile(profile);
        setName(profile.name || '');
        
        // Load specialization - check both fields and prioritize specialization
        // Trim and normalize the value to handle any whitespace issues
        let savedSpecialization = (profile.specialization || profile.specialty || '').trim();
        
        // Normalize the saved value to match one of the SPECIALTIES array values exactly
        // This handles case sensitivity and ensures exact match
        if (savedSpecialization) {
          const normalized = SPECIALTIES.find(spec => 
            spec.toLowerCase() === savedSpecialization.toLowerCase() ||
            spec === savedSpecialization
          );
          if (normalized) {
            savedSpecialization = normalized; // Use the exact value from SPECIALTIES array
          }
        }
        
        setSpecialization(savedSpecialization);
        
        setEmail(profile.email || user.email || '');
        setPhone(profile.phone || user.phoneNumber || '');
        setExperience(profile.experience?.toString() || '');
        setQualifications(Array.isArray(profile.qualifications) ? profile.qualifications.join(', ') : (profile.qualification || ''));
        setConsultationFee(profile.consultationFee?.toString() || '');
        setLanguages(profile.languages || []);
        setAvailableDays(profile.availableDays || []);
        setStartTime(profile.startTime || '09:00');
        setEndTime(profile.endTime || '18:00');
        setSlotDuration(profile.slotDuration?.toString() || '30');
        const existingImage = profile.profileImage || profile.photo;
        // Only set image if it's a valid non-empty URL, otherwise show placeholder
        if (existingImage && typeof existingImage === 'string' && existingImage.trim() !== '' && 
            (existingImage.startsWith('http://') || existingImage.startsWith('https://') || 
             existingImage.startsWith('file://') || existingImage.startsWith('content://'))) {
          setProfileImage(existingImage.trim());
        } else {
          setProfileImage(null);
        }
        setImageError(false);
      } else {
        // Set default values from current user
        setName(user.displayName || '');
        setEmail(user.email || '');
        setPhone(user.phoneNumber || '');
      }
    } catch (error) {
    } finally {
      setChecking(false);
    }
  };

  const toggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const toggleLanguage = (lang: string) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter(l => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const pickImage = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets[0].uri) {
        setProfileImage(response.assets[0].uri);
        setImageError(false); // Reset error when new image is selected
      }
    });
  };

  const handleImageError = () => {
    // If image fails to load, show placeholder
    setImageError(true);
    setProfileImage(null);
  };

  const uploadImage = async (uri: string): Promise<string> => {
    const filename = `doctors/${Date.now()}.jpg`;
    const reference = storage().ref(filename);
    await reference.putFile(uri);
    return await reference.getDownloadURL();
  };

  // Generate time slots between start and end time
  const generateTimeSlots = (startTime: string, endTime: string, duration: number): Array<{startTime: string; endTime: string}> => {
    const slots: Array<{startTime: string; endTime: string}> = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    let currentHour = startHour;
    let currentMin = startMin;
    const endTotalMinutes = endHour * 60 + endMin;
    
    while (currentHour * 60 + currentMin < endTotalMinutes) {
      const slotStart = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
      
      // Calculate end time
      let slotEndMin = currentMin + duration;
      let slotEndHour = currentHour;
      if (slotEndMin >= 60) {
        slotEndHour += Math.floor(slotEndMin / 60);
        slotEndMin = slotEndMin % 60;
      }
      
      const slotEnd = `${String(slotEndHour).padStart(2, '0')}:${String(slotEndMin).padStart(2, '0')}`;
      
      // Check if slot end time exceeds end time
      if (slotEndHour * 60 + slotEndMin > endTotalMinutes) {
        break;
      }
      
      slots.push({startTime: slotStart, endTime: slotEnd});
      
      // Move to next slot
      currentMin += duration;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }
    
    return slots;
  };

  // Generate availability for the next 30 days
  const generateAvailabilitySlots = async (
    doctorId: string,
    days: string[],
    startTime: string,
    endTime: string,
    slotDuration: number,
  ) => {
    try {
      const timeSlots = generateTimeSlots(startTime, endTime, slotDuration);
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      // Generate for next 30 days
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dayName = dayNames[date.getDay()];
        
        // Only create availability for selected days
        if (days.includes(dayName)) {
          const dateStr = date.toISOString().split('T')[0]; // Format: YYYY-MM-DD
          const docId = `${doctorId}_${dateStr}`;
          
          const slots = timeSlots.map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            isBooked: false,
          }));
          
          await firestore()
            .collection('availability')
            .doc(docId)
            .set(
              {
                doctorId,
                date: dateStr,
                slots,
                createdAt: firestore.FieldValue.serverTimestamp(),
                updatedAt: firestore.FieldValue.serverTimestamp(),
              },
              {merge: true},
            );
        }
      }
      
    } catch (error) {
      // Don't throw - availability generation failure shouldn't block profile save
    }
  };

  const handleSubmit = async () => {
    if (!name || !specialization || !email || !phone || !experience || !qualifications || !consultationFee) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (availableDays.length === 0) {
      Alert.alert('Error', 'Please select at least one available day');
      return;
    }

    if (languages.length === 0) {
      Alert.alert('Error', 'Please select at least one language');
      return;
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      Alert.alert('Error', 'Please enter valid time in HH:MM format (e.g., 09:00)');
      return;
    }

    // Validate end time is after start time
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (endMinutes <= startMinutes) {
      Alert.alert('Error', 'End time must be after start time');
      return;
    }

    // Validate slot duration
    const duration = parseInt(slotDuration, 10);
    if (isNaN(duration) || duration <= 0 || duration > 120) {
      Alert.alert('Error', 'Slot duration must be between 1 and 120 minutes');
      return;
    }

    setLoading(true);
    try {
      const user = auth().currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      let imageUrl = existingProfile?.profileImage || existingProfile?.photo || '';
      
      // Only upload if profileImage is a local file (starts with file:// or content://)
      // Skip if it's already a Firebase/HTTP URL
      if (profileImage && (profileImage.startsWith('file://') || profileImage.startsWith('content://'))) {
        try {
        imageUrl = await uploadImage(profileImage);
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
      } else if (profileImage && (profileImage.startsWith('http://') || profileImage.startsWith('https://'))) {
        // If it's already a URL (Firebase or other), use it as is
        imageUrl = profileImage;
      }

      const qualificationsArray = qualifications.split(',').map(q => q.trim()).filter(q => q);
      const newFee = parseFloat(consultationFee);
      const currentFee = existingProfile?.consultationFee || 0;
      const isFeeChanged = existingProfile && newFee !== currentFee;

      // Get doctorId first (needed for fee change request)
      let doctorId: string;
      if (existingProfile) {
        doctorId = existingProfile.id;
      } else {
        // For new profiles, we'll create the profile first, then handle fee
        doctorId = ''; // Will be set after profile creation
      }

      // If doctor is approved and trying to change fee, create a fee change request
      if (isFeeChanged && existingProfile?.approvalStatus === 'approved' && doctorId) {
        // Create fee change request
        await firestore()
          .collection('feeChangeRequests')
          .add({
            doctorId: doctorId,
            doctorEmail: email,
            doctorName: name,
            currentFee: currentFee,
            requestedFee: newFee,
            status: 'pending',
            reason: `Fee change request from ₹${currentFee} to ₹${newFee}`,
            requestedAt: firestore.FieldValue.serverTimestamp(),
            createdAt: firestore.FieldValue.serverTimestamp(),
          });

        Alert.alert(
          'Fee Change Request Submitted',
          `Your fee change request from ₹${currentFee} to ₹${newFee} has been submitted for admin approval. You will be notified once it's approved.`,
          [{text: 'OK'}],
        );

        // Continue with profile update but keep the current fee
        const doctorData = {
          name,
          specialization,
          specialty: specialization, // Also save to legacy field for backward compatibility
          email,
          phone,
          experience: parseInt(experience, 10),
          qualifications: qualificationsArray,
          consultationFee: currentFee, // Keep current fee, don't update
          languages,
          availableDays,
          startTime,
          endTime,
          slotDuration: parseInt(slotDuration, 10),
          profileImage: imageUrl,
          rating: existingProfile?.rating || 0,
          totalConsultations: existingProfile?.totalConsultations || 0,
          verified: false,
          approvalStatus: existingProfile?.approvalStatus || 'pending',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        // Update existing profile (fee not changed, or fee change request created)
        // doctorId already set above
        await firestore().collection('providers').doc(doctorId).set(doctorData, {merge: true});

        // Generate availability slots for the next 30 days for selected days
        await generateAvailabilitySlots(doctorId, availableDays, startTime, endTime, parseInt(slotDuration, 10));

        setLoading(false);
        if (isFeeChanged && existingProfile?.approvalStatus === 'approved') {
          // Don't show success alert if fee change request was created (already shown above)
          navigation.goBack();
          return;
        }
      } else {
        // For new profiles or non-fee changes, update normally
        const doctorData = {
          name,
          specialization,
          specialty: specialization, // Also save to legacy field for backward compatibility
          email,
          phone,
          experience: parseInt(experience, 10),
          qualifications: qualificationsArray,
          consultationFee: newFee, // Allow fee setting for new profiles or if fee not changed
          languages,
          availableDays,
          startTime,
          endTime,
          slotDuration: parseInt(slotDuration, 10),
          profileImage: imageUrl,
          rating: existingProfile?.rating || 0,
          totalConsultations: existingProfile?.totalConsultations || 0,
          verified: false,
          approvalStatus: existingProfile?.approvalStatus || 'pending',
          updatedAt: firestore.FieldValue.serverTimestamp(),
        };

        if (existingProfile) {
          // Update existing profile
          await firestore().collection('providers').doc(doctorId).set(doctorData, {merge: true});
        } else {
          // Create new profile
          doctorData.createdAt = firestore.FieldValue.serverTimestamp();
          const docRef = await firestore().collection('providers').add(doctorData);
          doctorId = docRef.id;
        }

        // Generate availability slots for the next 30 days for selected days
        await generateAvailabilitySlots(doctorId, availableDays, startTime, endTime, parseInt(slotDuration, 10));

        setLoading(false);
        Alert.alert(
          'Success',
          existingProfile
            ? 'Profile updated successfully!'
            : 'Profile created successfully!',
          [{text: 'OK', onPress: () => navigation.goBack()}],
        );
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const approvalStatus = existingProfile?.approvalStatus;
  const isPending = approvalStatus === 'pending';
  const isRejected = approvalStatus === 'rejected';

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        {/* Approval Status Banner */}
        {isPending && (
          <View style={[styles.statusBanner, styles.pendingBanner]}>
            <Icon name="hourglass-empty" size={24} color="#FF9500" />
            <Text style={styles.statusText}>
              Your profile is pending admin approval. You cannot perform doctor activities until approved.
            </Text>
          </View>
        )}

        {isRejected && (
          <View style={[styles.statusBanner, styles.rejectedBanner]}>
            <Icon name="cancel" size={24} color="#FF3B30" />
            <Text style={styles.statusText}>
              Your profile was rejected. {existingProfile?.rejectionReason && `Reason: ${existingProfile.rejectionReason}`}
            </Text>
          </View>
        )}

        {approvalStatus === 'approved' && (
          <View style={[styles.statusBanner, styles.approvedBanner]}>
            <Icon name="check-circle" size={24} color="#34C759" />
            <Text style={styles.statusText}>Your profile is approved! You can now perform doctor activities.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.photoContainer} onPress={pickImage} activeOpacity={0.8}>
          {profileImage && profileImage.trim() !== '' && !imageError ? (
            <View style={styles.imageContainer}>
              <Image
                source={{uri: profileImage}}
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

        <Text style={styles.label}>Specialization *</Text>
        <View style={styles.specialtyContainer}>
          {SPECIALTIES.map(spec => (
            <TouchableOpacity
              key={spec}
              style={[
                styles.specialtyChip,
                specialization === spec && styles.specialtyChipSelected,
              ]}
              onPress={() => setSpecialization(spec)}>
              <Text
                style={[
                  styles.specialtyText,
                  specialization === spec && styles.specialtyTextSelected,
                ]}>
                {spec}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Email *</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={email}
          editable={false}
          placeholder="doctor@example.com"
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

        <Text style={styles.label}>Qualifications *</Text>
        <TextInput
          style={styles.input}
          value={qualifications}
          onChangeText={setQualifications}
          placeholder="MBBS, MD (comma separated)"
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

        <Text style={styles.label}>Working Hours *</Text>
        <View style={styles.timeRow}>
          <View style={styles.timeInputContainer}>
            <Text style={styles.timeLabel}>Start Time</Text>
            <TextInput
              style={styles.timeInput}
              value={startTime}
              onChangeText={setStartTime}
              placeholder="09:00"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.timeInputContainer}>
            <Text style={styles.timeLabel}>End Time</Text>
            <TextInput
              style={styles.timeInput}
              value={endTime}
              onChangeText={setEndTime}
              placeholder="18:00"
              placeholderTextColor="#999"
            />
          </View>
          <View style={styles.timeInputContainer}>
            <Text style={styles.timeLabel}>Duration (min)</Text>
            <TextInput
              style={styles.timeInput}
              value={slotDuration}
              onChangeText={setSlotDuration}
              placeholder="30"
              keyboardType="numeric"
              placeholderTextColor="#999"
            />
          </View>
        </View>
        <Text style={styles.hintText}>
          Time slots will be automatically generated for your available days
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {existingProfile ? 'Update Profile' : 'Submit for Approval'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  form: {
    padding: 20,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  pendingBanner: {
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9500',
  },
  rejectedBanner: {
    backgroundColor: '#FFEBEE',
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  approvedBanner: {
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  statusText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imageContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#007AFF',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
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
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  photoText: {
    marginTop: 8,
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  photoSubtext: {
    marginTop: 4,
    color: '#999',
    fontSize: 11,
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
  disabledInput: {
    backgroundColor: '#f5f5f5',
    color: '#999',
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
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 15,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginRight: 8,
    marginBottom: 8,
  },
  languageChipSelected: {
    backgroundColor: '#007AFF',
  },
  languageText: {
    color: '#007AFF',
    fontSize: 12,
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
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 10,
  },
  timeInputContainer: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
    fontWeight: '500',
  },
  timeInput: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    textAlign: 'center',
  },
  hintText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginBottom: 15,
    marginTop: -5,
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
});

