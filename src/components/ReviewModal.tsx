/**
 * Review Modal Component
 * Shown to customers after job completion
 * Allows customers to rate and review the service
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary} from 'react-native-image-picker';
import storage from '@react-native-firebase/storage';
import {createReview} from '../services/reviewService';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';

interface ReviewModalProps {
  visible: boolean;
  jobCardId: string;
  providerName: string;
  serviceType: string;
  onReviewSubmitted: () => void;
  onSkip: () => void;
}

export default function ReviewModal({
  visible,
  jobCardId,
  providerName,
  serviceType,
  onReviewSubmitted,
  onSkip,
}: ReviewModalProps) {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Rating suggestions based on rating
  const getSuggestions = (): string[] => {
    if (rating >= 4) {
      // Positive suggestions for good ratings
      return [
        'Professional',
        'On Time',
        'Clean & Tidy',
        'Good Communication',
        'Quality Work',
        'Friendly',
        'Well Equipped',
        'Solved Problem',
      ];
    } else if (rating === 3) {
      // Neutral suggestions
      return [
        'Average Service',
        'Could Be Better',
        'Room for Improvement',
        'Satisfactory',
      ];
    } else if (rating >= 1 && rating <= 2) {
      // Negative suggestions for poor ratings
      return [
        'Late Arrival',
        'Poor Quality',
        'Unprofessional',
        'Not Clean',
        'Poor Communication',
        'Did Not Complete',
        'Overcharged',
        'Rude Behavior',
      ];
    }
    return [];
  };

  const handleStarPress = (star: number) => {
    setRating(star);
    // Clear suggestions when rating changes
    setSelectedSuggestions([]);
  };

  const handleSuggestionPress = (suggestion: string) => {
    if (selectedSuggestions.includes(suggestion)) {
      // Remove if already selected
      setSelectedSuggestions(selectedSuggestions.filter(s => s !== suggestion));
    } else {
      // Add if not selected
      setSelectedSuggestions([...selectedSuggestions, suggestion]);
    }
  };

  const handleAddPhoto = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 3 - photos.length,
      });

      if (result.didCancel || !result.assets || result.assets.length === 0) {
        return;
      }

      setUploading(true);
      const uploadedUrls: string[] = [];

      for (const asset of result.assets) {
        if (asset.uri) {
          const filename = `review_photos/${jobCardId}/${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
          const reference = storage().ref(filename);
          await reference.putFile(asset.uri);
          const url = await reference.getDownloadURL();
          uploadedUrls.push(url);
        }
      }

      setPhotos([...photos, ...uploadedUrls]);
      setUploading(false);
    } catch (error: any) {
      setUploading(false);
      Alert.alert('Error', 'Failed to upload photo. Please try again.');
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a rating');
      return;
    }

    try {
      setSubmitting(true);
      
      // Combine suggestions and comment
      let finalComment = comment.trim();
      if (selectedSuggestions.length > 0) {
        const suggestionsText = selectedSuggestions.join(', ');
        if (finalComment) {
          finalComment = `${suggestionsText}. ${finalComment}`;
        } else {
          finalComment = suggestionsText;
        }
      }
      
      await createReview(
        jobCardId, 
        rating, 
        finalComment || undefined, 
        photos.length > 0 ? photos : undefined
      );
      Alert.alert('Thank You!', 'Your review has been submitted.');
      onReviewSubmitted();
      // Reset form
      setRating(0);
      setComment('');
      setSelectedSuggestions([]);
      setPhotos([]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    Alert.alert(
      'Skip Review?',
      'You can review this service later from your history.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Skip',
          style: 'destructive',
            onPress: () => {
            setRating(0);
            setComment('');
            setSelectedSuggestions([]);
            setPhotos([]);
            onSkip();
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleSkip}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={[styles.title, {color: theme.text}]}>
                How was your service?
              </Text>
              <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
                {serviceType} by {providerName}
              </Text>
            </View>

            {/* Rating Stars */}
            <View style={styles.ratingContainer}>
              <Text style={[styles.ratingLabel, {color: theme.text}]}>
                Rate your experience
              </Text>
              <View style={styles.starsContainer}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => handleStarPress(star)}
                    style={styles.starButton}>
                    <Icon
                      name={star <= rating ? 'star' : 'star-border'}
                      size={48}
                      color={star <= rating ? '#FFD700' : '#CCCCCC'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              {rating > 0 && (
                <Text style={[styles.ratingText, {color: theme.textSecondary}]}>
                  {rating === 5
                    ? 'Excellent!'
                    : rating === 4
                    ? 'Great!'
                    : rating === 3
                    ? 'Good'
                    : rating === 2
                    ? 'Fair'
                    : 'Poor'}
                </Text>
              )}
            </View>

            {/* Rating Suggestions */}
            {rating > 0 && getSuggestions().length > 0 && (
              <View style={styles.suggestionsContainer}>
                <Text style={[styles.suggestionsLabel, {color: theme.text}]}>
                  What made it {rating >= 4 ? 'great' : rating === 3 ? 'average' : 'poor'}?
                </Text>
                <View style={styles.suggestionsGrid}>
                  {getSuggestions().map((suggestion, index) => {
                    const isSelected = selectedSuggestions.includes(suggestion);
                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.suggestionChip,
                          {
                            backgroundColor: isSelected ? theme.primary : theme.background,
                            borderColor: isSelected ? theme.primary : theme.border,
                          },
                        ]}
                        onPress={() => handleSuggestionPress(suggestion)}>
                        <Text
                          style={[
                            styles.suggestionText,
                            {
                              color: isSelected ? '#fff' : theme.text,
                            },
                          ]}>
                          {suggestion}
                        </Text>
                        {isSelected && (
                          <Icon name="check" size={16} color="#fff" style={styles.checkIcon} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Comment Input */}
            <View style={styles.commentContainer}>
              <Text style={[styles.commentLabel, {color: theme.text}]}>
                Tell us more (optional)
              </Text>
              <TextInput
                style={[
                  styles.commentInput,
                  {
                    backgroundColor: theme.background,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={comment}
                onChangeText={setComment}
                placeholder="Share your experience..."
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={[styles.charCount, {color: theme.textSecondary}]}>
                {comment.length}/500
              </Text>
            </View>

            {/* Photos */}
            {photos.length < 3 && (
              <TouchableOpacity
                style={[styles.addPhotoButton, {borderColor: theme.border}]}
                onPress={handleAddPhoto}
                disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <>
                    <Icon name="add-photo-alternate" size={24} color={theme.primary} />
                    <Text style={[styles.addPhotoText, {color: theme.primary}]}>
                      Add Photo ({photos.length}/3)
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Photo Preview */}
            {photos.length > 0 && (
              <View style={styles.photosContainer}>
                {photos.map((photo, index) => (
                  <View key={index} style={styles.photoWrapper}>
                    <Image source={{uri: photo}} style={styles.photo} />
                    <TouchableOpacity
                      style={styles.removePhotoButton}
                      onPress={() => handleRemovePhoto(index)}>
                      <Icon name="close" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.skipButton, {borderColor: theme.border}]}
                onPress={handleSkip}
                disabled={submitting}>
                <Text style={[styles.skipButtonText, {color: theme.textSecondary}]}>
                  Skip
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  {
                    backgroundColor: rating > 0 ? theme.primary : theme.border,
                    opacity: rating > 0 ? 1 : 0.5,
                  },
                ]}
                onPress={handleSubmit}
                disabled={rating === 0 || submitting}>
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Review</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
  },
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  ratingLabel: {
    fontSize: 16,
    marginBottom: 16,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  suggestionsContainer: {
    marginBottom: 24,
  },
  suggestionsLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 2,
  },
  commentContainer: {
    marginBottom: 20,
  },
  commentLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  commentInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    marginTop: 4,
    textAlign: 'right',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    gap: 8,
  },
  addPhotoText: {
    fontSize: 16,
    fontWeight: '500',
  },
  photosContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  photoWrapper: {
    position: 'relative',
    width: 100,
    height: 100,
    borderRadius: 8,
    overflow: 'hidden',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  removePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  skipButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  submitButton: {
    flex: 2,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

