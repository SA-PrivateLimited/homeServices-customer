import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import type {Doctor} from '../types/consultation';
import StarRating from '../components/StarRating';
import {serializeDoctorForNavigation} from '../utils/helpers';

interface DoctorDetailsScreenProps {
  navigation: any;
  route: {
    params: {
      doctor: Doctor;
    };
  };
}

const DoctorDetailsScreen: React.FC<DoctorDetailsScreenProps> = ({
  navigation,
  route,
}) => {
  const {doctor} = route.params;
  const {isDarkMode, currentUser, setRedirectAfterLogin} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [imageError, setImageError] = React.useState(false);

  // Helper function to get initials from name
  const getInitials = (name: string): string => {
    if (!name || name.trim() === '') return '';
    
    const nameParts = name.trim().split(/\s+/);
    
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      const firstName = nameParts[0];
      const lastName = nameParts[nameParts.length - 1];
      return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    }
  };

  // Check if doctor is approved (safety check)
  const isApproved = doctor.approvalStatus === 'approved' || 
                     (!doctor.approvalStatus && doctor.verified === true);

  const handleBookConsultation = () => {
    // Prevent booking if doctor is not approved
    if (!isApproved) {
      Alert.alert(
        'Doctor Not Available',
        'This doctor is not currently available for consultations. Please select another doctor.',
        [{text: 'OK', onPress: () => navigation.goBack()}],
      );
      return;
    }
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
              setRedirectAfterLogin({route: 'DoctorDetails', params: {doctor: serializableDoctor}});
              navigation.navigate('Login');
            },
          },
        ],
      );
      return;
    }

    const serializableDoctor = serializeDoctorForNavigation(doctor);
    navigation.navigate('Booking', {doctor: serializableDoctor});
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Doctor Header */}
        <View
          style={[
            styles.headerCard,
            {backgroundColor: theme.card},
            commonStyles.shadowMedium,
          ]}>
          <View style={styles.imageContainer}>
            {(() => {
              const imageUrl = (doctor.profileImage || doctor.photo || '').trim();
              const hasValidImage = imageUrl !== '' && !imageError && 
                (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || 
                 imageUrl.startsWith('file://') || imageUrl.startsWith('content://'));
              
              if (hasValidImage) {
                return (
              <Image
                    source={{uri: imageUrl}}
                style={styles.image}
                    onError={() => setImageError(true)}
                resizeMode="cover"
              />
                );
              }
              
              return (
              <View
                style={[
                  styles.imagePlaceholder,
                  {backgroundColor: theme.primary},
                ]}>
                <Icon name="person" size={60} color="#fff" />
              </View>
              );
            })()}
            {doctor.verified && (
              <View
                style={[styles.verifiedBadge, {backgroundColor: '#4CAF50'}]}>
                <Icon name="checkmark-circle" size={20} color="#fff" />
              </View>
            )}
          </View>

          <View style={styles.headerInfo}>
            <Text style={[styles.name, {color: theme.text}]}>
              Dr. {doctor.name}
            </Text>
            <Text style={[styles.specialization, {color: theme.textSecondary}]}>
              {doctor.specialization}
            </Text>

            <View style={styles.ratingRow}>
              <StarRating rating={doctor.rating} size={18} />
              <Text style={[styles.ratingText, {color: theme.textSecondary}]}>
                {doctor.rating.toFixed(1)} ({doctor.totalConsultations}{' '}
                consultations)
              </Text>
            </View>

            <View style={styles.contactRow}>
              <Icon name="mail-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.contactText, {color: theme.textSecondary}]}>
                {doctor.email}
              </Text>
            </View>

            <View style={styles.contactRow}>
              <Icon name="call-outline" size={16} color={theme.textSecondary} />
              <Text style={[styles.contactText, {color: theme.textSecondary}]}>
                {doctor.phone}
              </Text>
            </View>
          </View>
        </View>

        {/* Details Section */}
        <View
          style={[
            styles.section,
            {backgroundColor: theme.card},
            commonStyles.shadowSmall,
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            About Doctor
          </Text>

          <View style={styles.detailRow}>
            <Icon name="school-outline" size={20} color={theme.primary} />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                Qualifications
              </Text>
              <Text style={[styles.detailValue, {color: theme.text}]}>
                {doctor.qualifications.join(', ')}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="time-outline" size={20} color={theme.primary} />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                Experience
              </Text>
              <Text style={[styles.detailValue, {color: theme.text}]}>
                {doctor.experience} years
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="language-outline" size={20} color={theme.primary} />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                Languages
              </Text>
              <Text style={[styles.detailValue, {color: theme.text}]}>
                {doctor.languages.join(', ')}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Icon name="cash-outline" size={20} color={theme.primary} />
            <View style={styles.detailInfo}>
              <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>
                Consultation Fee
              </Text>
              <Text
                style={[
                  styles.detailValue,
                  styles.feeText,
                  {color: theme.primary},
                ]}>
                ₹{doctor.consultationFee}
              </Text>
            </View>
          </View>
        </View>

        {/* Reviews Section (Placeholder) */}
        <View
          style={[
            styles.section,
            {backgroundColor: theme.card},
            commonStyles.shadowSmall,
          ]}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            Patient Reviews
          </Text>
          <Text style={[styles.comingSoonText, {color: theme.textSecondary}]}>
            Reviews coming soon
          </Text>
        </View>
      </ScrollView>

      {/* Book Button */}
      <View style={[styles.footer, {backgroundColor: theme.card}]}>
        <View style={styles.feeInfo}>
          <Text style={[styles.feeLabel, {color: theme.textSecondary}]}>
            Consultation Fee
          </Text>
          <Text style={[styles.feeAmount, {color: theme.primary}]}>
            ₹{doctor.consultationFee}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.bookButton, {backgroundColor: theme.primary}]}
          onPress={handleBookConsultation}>
          <Text style={styles.bookButtonText}>Book Consultation</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 100,
  },
  headerCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#fff',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderRadius: 12,
    padding: 4,
  },
  headerInfo: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  specialization: {
    fontSize: 16,
    marginBottom: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ratingText: {
    fontSize: 14,
    marginLeft: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  contactText: {
    fontSize: 14,
    marginLeft: 8,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailInfo: {
    flex: 1,
    marginLeft: 12,
  },
  detailLabel: {
    fontSize: 13,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  feeText: {
    fontSize: 18,
    fontWeight: '600',
  },
  comingSoonText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  feeInfo: {
    flex: 1,
  },
  feeLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  feeAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  bookButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 10,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default DoctorDetailsScreen;
