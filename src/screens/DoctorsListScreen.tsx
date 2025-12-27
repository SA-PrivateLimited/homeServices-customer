import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import type {Doctor} from '../types/consultation';
import consultationService from '../services/consultationService';
import DoctorCard from '../components/DoctorCard';
import EmptyState from '../components/EmptyState';
import {serializeDoctorForNavigation} from '../utils/helpers';
import GuideTooltip, {GuideStep} from '../components/GuideTooltip';
import {useAppGuide} from '../hooks/useAppGuide';

const {height} = Dimensions.get('window');

interface DoctorsListScreenProps {
  navigation: any;
}

// Guide steps for patient users
const patientGuideSteps: GuideStep[] = [
  {
    id: 'search',
    title: 'Search Doctors',
    message: 'Use the search bar to quickly find doctors by name or specialty.',
    position: {top: 70, left: 20},
    arrowDirection: 'top',
  },
  {
    id: 'filter',
    title: 'Filter by Specialty',
    message: 'Filter doctors by their medical specialty to find the right expert for your needs.',
    position: {top: 140, left: 20},
    arrowDirection: 'top',
  },
  {
    id: 'doctor-card',
    title: 'Doctor Information',
    message: 'Tap on any doctor card to view their full profile, experience, ratings, and availability.',
    position: {top: height / 2 - 100, left: 20},
    arrowDirection: 'top',
  },
  {
    id: 'consultations',
    title: 'View Your Consultations',
    message: 'Access your consultation history by tapping the calendar icon in the top right.',
    position: {top: 70, right: 20},
    arrowDirection: 'top',
  },
];

const DoctorsListScreen: React.FC<DoctorsListScreenProps> = ({navigation}) => {
  const {isDarkMode, doctors, setDoctors, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('All');
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);

  // Initialize guide
  const guide = useAppGuide('doctors_list', patientGuideSteps, 'patient');

  const specializations = [
    'All',
    'General Physician',
    'Cardiologist',
    'Dermatologist',
    'Pediatrician',
    'Orthopedic',
    'Neurologist',
    'Gynecologist',
    'Psychiatrist',
  ];

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [doctors, searchQuery, selectedSpecialization]);

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const doctorsList = await consultationService.fetchDoctors();
      await setDoctors(doctorsList);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const doctorsList = await consultationService.fetchDoctors();
      await setDoctors(doctorsList);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setRefreshing(false);
    }
  };

  const filterDoctors = () => {
    let filtered = doctors;

    // Filter by specialization
    if (selectedSpecialization !== 'All') {
      filtered = filtered.filter(
        doc => doc.specialization === selectedSpecialization,
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        doc =>
          doc.name.toLowerCase().includes(query) ||
          doc.specialization.toLowerCase().includes(query),
      );
    }

    setFilteredDoctors(filtered);
  };

  const handleDoctorPress = (doctor: Doctor) => {
    // Remove Date objects that are not serializable for navigation
    const serializableDoctor = serializeDoctorForNavigation(doctor);
    navigation.navigate('DoctorDetails', {doctor: serializableDoctor});
  };

  const renderDoctor = ({item}: {item: Doctor}) => (
    <DoctorCard doctor={item} onPress={() => handleDoctorPress(item)} />
  );

  const renderSpecialization = ({item}: {item: string}) => {
    const isSelected = item === selectedSpecialization;
    return (
      <TouchableOpacity
        style={[
          styles.specializationChip,
          {
            backgroundColor: isSelected ? theme.primary : theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
          },
        ]}
        onPress={() => setSelectedSpecialization(item)}>
        <Text
          style={[
            styles.specializationText,
            {color: isSelected ? '#fff' : theme.text},
          ]}>
          {item}
        </Text>
      </TouchableOpacity>
    );
  };

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
          Loading doctors...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Search Bar */}
      <View
        style={[
          styles.searchContainer,
          {backgroundColor: theme.card, borderColor: theme.border},
        ]}>
        <Icon name="search-outline" size={20} color={theme.textSecondary} />
        <TextInput
          style={[styles.searchInput, {color: theme.text}]}
          placeholder="Search doctors..."
          placeholderTextColor={theme.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Icon name="close-circle" size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Specializations Filter */}
      <View style={styles.specializationsContainer}>
        <FlatList
          horizontal
          data={specializations}
          renderItem={renderSpecialization}
          keyExtractor={item => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.specializationsList}
        />
      </View>

      {/* Doctors List */}
      {filteredDoctors.length === 0 ? (
        <EmptyState
          icon="medical-outline"
          title="No doctors found"
          message={
            searchQuery || selectedSpecialization !== 'All'
              ? 'Try adjusting your filters'
              : 'No doctors available at the moment'
          }
        />
      ) : (
        <FlatList
          data={filteredDoctors}
          renderItem={renderDoctor}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.primary}
            />
          }
          ListHeaderComponent={() => (
            <View style={styles.listHeader}>
              <Text style={[styles.resultCount, {color: theme.textSecondary}]}>
                {filteredDoctors.length} doctor
                {filteredDoctors.length !== 1 ? 's' : ''} found
              </Text>
            </View>
          )}
        />
      )}

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
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    paddingHorizontal: 15,
    borderRadius: 10,
    borderWidth: 1,
    height: 50,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
  },
  specializationsContainer: {
    marginBottom: 12,
  },
  specializationsList: {
    paddingHorizontal: 16,
  },
  specializationChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  specializationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  listHeader: {
    marginBottom: 8,
  },
  resultCount: {
    fontSize: 14,
  },
});

export default DoctorsListScreen;
