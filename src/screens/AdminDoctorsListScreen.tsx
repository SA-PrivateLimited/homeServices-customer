import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';

interface Doctor {
  id: string;
  name: string;
  specialization?: string; // From Firestore (may be called 'specialty' in some docs)
  specialty?: string; // Alternative field name
  email: string;
  phone: string;
  experience: number;
  qualifications?: string[]; // From Firestore (array)
  qualification?: string; // Alternative field name (for admin-added doctors)
  profileImage?: string; // From Firestore
  photo?: string; // Alternative field name (for admin-added doctors)
  availableDays?: string[]; // May not exist in all documents
  consultationFee: number;
  rating?: number; // May not exist in all documents
  verified?: boolean; // From Firestore
}

export default function DoctorsListScreen({navigation}: any) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());

  useEffect(() => {
    // React Native Firebase auto-initializes from google-services.json
    // We'll retry if Firebase isn't ready yet
    let unsubscribe: (() => void) | null = null;
    let retryCount = 0;
    const maxRetries = 20; // 4 seconds total (20 × 200ms)
    let timeoutId: NodeJS.Timeout | null = null;

    const tryFetch = () => {
      try {
        // Try to create the Firestore reference
        // This will throw if Firebase isn't initialized
        const doctorsRef = firestore().collection('providers');
        
        // If we get here, Firebase is ready - set up the listener
        unsubscribe = doctorsRef.onSnapshot(
          snapshot => {
            const doctorsList = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })) as Doctor[];
            setDoctors(doctorsList);
            setLoading(false);
            setError(null);
          },
          error => {
            // If it's a Firebase initialization error, retry
            if (error.message?.includes('No Firebase App') && retryCount < maxRetries) {
              retryCount++;
              timeoutId = setTimeout(tryFetch, 200);
              return;
            }
            setError(error.message || 'Failed to load doctors');
            setLoading(false);
          },
        );
      } catch (error: any) {
        // Catch synchronous errors (Firebase not initialized)
        if (error.message?.includes('No Firebase App') && retryCount < maxRetries) {
          retryCount++;
          timeoutId = setTimeout(tryFetch, 200);
        } else {
          setError(error.message || 'Firebase not initialized');
          setLoading(false);
        }
      }
    };

    // Start trying after a delay to let native module initialize
    timeoutId = setTimeout(tryFetch, 500);

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const handleDelete = (doctorId: string, doctorName: string) => {
    Alert.alert(
      'Delete Doctor',
      `Are you sure you want to delete ${doctorName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await firestore().collection('providers').doc(doctorId).delete();
              Alert.alert('Success', 'Doctor deleted successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete doctor');
            }
          },
        },
      ],
    );
  };

  // Helper function to get initials from name
  const getInitials = (name: string): string => {
    if (!name || name.trim() === '') return '';
    
    const nameParts = name.trim().split(/\s+/);
    
    if (nameParts.length === 1) {
      // Only one name, return first letter
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      // Multiple names, return first letter of first name and last name
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
  };

  const renderDoctor = ({item}: {item: Doctor}) => {
    // Handle different field names from Firestore
    const specialty = item.specialization || item.specialty || 'General';
    const photo = item.profileImage || item.photo;
    const qualification = item.qualifications 
      ? item.qualifications.join(', ') 
      : item.qualification || 'N/A';
    const rating = item.rating || 0;
    
    // Check if image is valid and hasn't errored
    const hasValidImage = photo && 
      typeof photo === 'string' && 
      photo.trim() !== '' &&
      (photo.startsWith('http://') || photo.startsWith('https://')) &&
      !imageErrors.has(item.id);

    const handleImageError = () => {
      // Add doctor ID to error set to show placeholder on next render
      setImageErrors(prev => new Set(prev).add(item.id));
    };

    return (
      <View style={styles.doctorCard}>
        {hasValidImage ? (
          <Image 
            source={{uri: photo}} 
            style={styles.doctorImage}
            onError={handleImageError}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.doctorImage, styles.doctorImagePlaceholder]}>
            <Text style={styles.initialsText}>
              {getInitials(item.name)}
            </Text>
          </View>
        )}
        <View style={styles.doctorInfo}>
          <Text style={styles.doctorName}>{item.name}</Text>
          <Text style={styles.specialty}>{specialty}</Text>
          <Text style={styles.detail}>
            {item.experience} years experience
          </Text>
          <Text style={styles.detail}>{qualification}</Text>
          <Text style={styles.detail}>Fee: ₹{item.consultationFee}</Text>
          {rating > 0 && (
            <View style={styles.ratingContainer}>
              <Icon name="star" size={16} color="#FFD700" />
              <Text style={styles.rating}>{rating.toFixed(1)}</Text>
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditDoctor', {doctor: item})}
            style={styles.actionButton}>
            <Icon name="edit" size={24} color="#007AFF" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDelete(item.id, item.name)}
            style={styles.actionButton}>
            <Icon name="delete" size={24} color="#FF3B30" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading doctors...</Text>
      </View>
    );
  }

  const handleRetry = () => {
    setLoading(true);
    setError(null);
    // Force re-run useEffect by updating a dependency
    // We'll use a simple counter to trigger re-fetch
    setDoctors([]);
    // The useEffect will run again and try to fetch
    setTimeout(() => {
      try {
        const unsubscribe = firestore()
          .collection('providers')
          .onSnapshot(
            snapshot => {
              const doctorsList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
              })) as Doctor[];
              setDoctors(doctorsList);
              setLoading(false);
              setError(null);
            },
            error => {
              setError(error.message || 'Failed to load doctors');
              setLoading(false);
            },
          );
        return unsubscribe;
      } catch (error: any) {
        setError(error.message || 'Firebase not initialized');
        setLoading(false);
      }
    }, 500);
  };

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Error loading doctors</Text>
        <Text style={styles.errorSubtext}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={doctors}
        renderItem={renderDoctor}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="local-hospital" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No doctors added yet</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('AddDoctor')}>
        <Icon name="add" size={24} color="#fff" />
      </TouchableOpacity>
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
  listContainer: {
    padding: 15,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  doctorImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 15,
  },
  doctorImagePlaceholder: {
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  initialsText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#007AFF',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  specialty: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 5,
  },
  detail: {
    fontSize: 12,
    color: '#666',
    marginBottom: 3,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  rating: {
    marginLeft: 5,
    fontSize: 14,
    fontWeight: 'bold',
  },
  actions: {
    justifyContent: 'space-around',
  },
  actionButton: {
    padding: 5,
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
  loadingText: {
    fontSize: 14,
    color: '#666',
    marginTop: 10,
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
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});
