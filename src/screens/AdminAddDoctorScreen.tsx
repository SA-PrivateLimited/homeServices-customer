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
} from 'react-native';
import firestore from '@react-native-firebase/firestore';
import storage from '@react-native-firebase/storage';
import firebaseApp from '@react-native-firebase/app';
import {launchImageLibrary} from 'react-native-image-picker';

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

export default function AddDoctorScreen({navigation}: any) {
  const [name, setName] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [experience, setExperience] = useState('');
  const [qualification, setQualification] = useState('');
  const [consultationFee, setConsultationFee] = useState('');
  const [availableDays, setAvailableDays] = useState<string[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleDay = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter(d => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const pickImage = () => {
    launchImageLibrary({mediaType: 'photo', quality: 0.8}, response => {
      if (response.assets && response.assets[0].uri) {
        setPhoto(response.assets[0].uri);
      }
    });
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

  const handleAddDoctor = async () => {
    if (!isFirebaseInitialized()) {
      Alert.alert('Error', 'Firebase is not initialized. Please restart the app.');
      return;
    }

    if (!name || !specialty || !email || !phone || !experience || !qualification || !consultationFee) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (availableDays.length === 0) {
      Alert.alert('Error', 'Please select at least one available day');
      return;
    }

    setLoading(true);
    try {
      let photoUrl = '';
      if (photo) {
        try {
          photoUrl = await uploadImage(photo);
        } catch (error) {
        }
      }

      await firestore().collection('providers').add({
        name,
        specialty,
        email,
        phone,
        experience: parseInt(experience, 10),
        qualification,
        consultationFee: parseFloat(consultationFee),
        availableDays,
        photo: photoUrl,
        rating: 4.5,
        createdAt: firestore.FieldValue.serverTimestamp(),
        isActive: true,
      });

      Alert.alert('Success', 'Doctor added successfully', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add doctor');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <TouchableOpacity style={styles.photoContainer} onPress={pickImage}>
          {photo ? (
            <Image source={{uri: photo}} style={styles.photo} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Text style={styles.photoText}>Add Photo</Text>
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

        <TouchableOpacity
          style={styles.button}
          onPress={handleAddDoctor}
          disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Add Doctor</Text>
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
  photoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
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
});
