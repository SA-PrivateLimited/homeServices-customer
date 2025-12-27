import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Image} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import type {Doctor} from '../types/consultation';
import StarRating from './StarRating';

interface DoctorCardProps {
  doctor: Doctor;
  onPress: () => void;
}

const DoctorCard: React.FC<DoctorCardProps> = ({doctor, onPress}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = (doctor.profileImage || doctor.photo || '').trim();
  
  // Reset image error when image URL changes
  useEffect(() => {
    setImageError(false);
  }, [imageUrl]);

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {backgroundColor: theme.card, borderColor: theme.border},
        commonStyles.shadowMedium,
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      {/* Doctor Image */}
      <View style={styles.imageContainer}>
        {(() => {
          const hasValidImage = imageUrl !== '' && !imageError && 
            (imageUrl.startsWith('http://') || imageUrl.startsWith('https://') || 
             imageUrl.startsWith('file://') || imageUrl.startsWith('content://'));
          
          if (hasValidImage) {
            return (
          <Image
                source={{uri: imageUrl}}
            style={styles.image}
            resizeMode="cover"
                onError={() => setImageError(true)}
          />
            );
          }
          
          return (
          <View
            style={[styles.imagePlaceholder, {backgroundColor: theme.primary}]}>
            <Icon name="person" size={40} color="#fff" />
          </View>
          );
        })()}
        {doctor.verified && (
          <View style={[styles.verifiedBadge, {backgroundColor: '#4CAF50'}]}>
            <Icon name="checkmark-circle" size={16} color="#fff" />
          </View>
        )}
      </View>

      {/* Doctor Info */}
      <View style={styles.info}>
        <Text style={[styles.name, {color: theme.text}]} numberOfLines={1}>
          Dr. {doctor.name}
        </Text>

        <Text
          style={[styles.specialization, {color: theme.textSecondary}]}
          numberOfLines={1}>
          {doctor.specialization}
        </Text>

        <View style={styles.detailsRow}>
          <Icon
            name="school-outline"
            size={14}
            color={theme.textSecondary}
            style={styles.icon}
          />
          <Text
            style={[styles.detailText, {color: theme.textSecondary}]}
            numberOfLines={1}>
            {doctor.experience} years exp
          </Text>
        </View>

        <View style={styles.ratingRow}>
          <StarRating rating={doctor.rating} size={14} />
          <Text style={[styles.ratingText, {color: theme.textSecondary}]}>
            {doctor.rating.toFixed(1)} ({doctor.totalConsultations})
          </Text>
        </View>

        <View style={styles.footer}>
          <View style={styles.feeContainer}>
            <Icon name="cash-outline" size={16} color={theme.primary} />
            <Text style={[styles.fee, {color: theme.primary}]}>
              ₹{doctor.consultationFee}
            </Text>
          </View>

          <View style={[styles.bookButton, {backgroundColor: theme.primary}]}>
            <Text style={styles.bookButtonText}>Book</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  imageContainer: {
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    borderRadius: 8,
    padding: 2,
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 13,
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  icon: {
    marginRight: 4,
  },
  detailText: {
    fontSize: 12,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingText: {
    fontSize: 12,
    marginLeft: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fee: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  bookButton: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});

export default DoctorCard;
