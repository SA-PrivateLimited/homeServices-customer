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
  ActivityIndicator,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import {launchImageLibrary} from 'react-native-image-picker';
import {createReview} from '../services/reviewService';
import {lightTheme, darkTheme} from '../utils/theme';
import {useStore} from '../store';
import AlertModal from './AlertModal';
import ConfirmationModal from './ConfirmationModal';
import useTranslation from '../hooks/useTranslation';

interface ReviewModalProps {
  visible: boolean;
  jobCardId: string;
  providerName: string;
  serviceType: string;
  onReviewSubmitted: () => void;
  onSkip: () => void;
}

const POSITIVE_KEYS = [
  'professional',
  'onTime',
  'cleanTidy',
  'goodCommunication',
  'qualityWork',
  'friendly',
  'wellEquipped',
  'solvedProblem',
] as const;

const NEUTRAL_KEYS = [
  'averageService',
  'couldBeBetter',
  'roomForImprovement',
  'satisfactory',
] as const;

const NEGATIVE_KEYS = [
  'lateArrival',
  'poorQuality',
  'unprofessional',
  'notClean',
  'poorCommunication',
  'didNotComplete',
  'overcharged',
  'rudeBehavior',
] as const;

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
  const {t} = useTranslation();

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedSuggestions, setSelectedSuggestions] = useState<string[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [alertModal, setAlertModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [showSkipModal, setShowSkipModal] = useState(false);

  const getSuggestionKeys = (): readonly string[] => {
    if (rating >= 4) return POSITIVE_KEYS;
    if (rating === 3) return NEUTRAL_KEYS;
    if (rating >= 1 && rating <= 2) return NEGATIVE_KEYS;
    return [];
  };

  const handleStarPress = (star: number) => {
    setRating(star);
    setSelectedSuggestions([]);
  };

  const handleSuggestionPress = (key: string) => {
    if (selectedSuggestions.includes(key)) {
      setSelectedSuggestions(selectedSuggestions.filter(s => s !== key));
    } else {
      setSelectedSuggestions([...selectedSuggestions, key]);
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

      const localUris = result.assets
        .map(a => a.uri)
        .filter((uri): uri is string => !!uri);
      setPhotos([...photos, ...localUris].slice(0, 3));
    } catch {
      setAlertModal({
        visible: true,
        title: String(t('review.error')),
        message: String(t('review.photoError')),
        type: 'error',
      });
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      setAlertModal({
        visible: true,
        title: String(t('review.ratingRequiredTitle')),
        message: String(t('review.ratingRequiredMessage')),
        type: 'warning',
      });
      return;
    }

    try {
      setSubmitting(true);

      let finalComment = comment.trim();
      if (selectedSuggestions.length > 0) {
        const suggestionsText = selectedSuggestions
          .map(key => String(t(`review.suggestion.${key}`)))
          .join(', ');
        if (finalComment) {
          finalComment = `${suggestionsText}. ${finalComment}`;
        } else {
          finalComment = suggestionsText;
        }
      }

      const remotePhotos = photos.filter(
        p => p.startsWith('http://') || p.startsWith('https://'),
      );
      await createReview(
        jobCardId,
        rating,
        finalComment || undefined,
        remotePhotos.length > 0 ? remotePhotos : undefined,
      );
      setAlertModal({
        visible: true,
        title: String(t('review.thankYouTitle')),
        message: String(t('review.thankYouMessage')),
        type: 'success',
      });
      setTimeout(() => {
        onReviewSubmitted();
        setRating(0);
        setComment('');
        setSelectedSuggestions([]);
        setPhotos([]);
      }, 1500);
    } catch (error: any) {
      setAlertModal({
        visible: true,
        title: String(t('review.error')),
        message: error.message || String(t('review.submitError')),
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSkip = () => {
    setShowSkipModal(true);
  };

  const ratingLabel =
    rating === 5
      ? t('review.excellent')
      : rating === 4
        ? t('review.great')
        : rating === 3
          ? t('review.good')
          : rating === 2
            ? t('review.fair')
            : t('review.poor');

  const suggestionPrompt =
    rating >= 4
      ? t('review.whatMadeItGreat')
      : rating === 3
        ? t('review.whatMadeItAverage')
        : t('review.whatMadeItPoor');

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleSkip}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <Text style={[styles.title, {color: theme.text}]}>
                {t('review.title')}
              </Text>
              <Text style={[styles.subtitle, {color: theme.textSecondary}]}>
                {String(t('review.subtitle'))
                  .replace('{{service}}', serviceType)
                  .replace('{{name}}', providerName)}
              </Text>
            </View>

            <View style={styles.ratingContainer}>
              <Text style={[styles.ratingLabel, {color: theme.text}]}>
                {t('review.rateExperience')}
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
              {rating > 0 ? (
                <Text style={[styles.ratingText, {color: theme.textSecondary}]}>
                  {ratingLabel}
                </Text>
              ) : null}
            </View>

            {rating > 0 && getSuggestionKeys().length > 0 ? (
              <View style={styles.suggestionsContainer}>
                <Text style={[styles.suggestionsLabel, {color: theme.text}]}>
                  {suggestionPrompt}
                </Text>
                <View style={styles.suggestionsGrid}>
                  {getSuggestionKeys().map(key => {
                    const isSelected = selectedSuggestions.includes(key);
                    return (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.suggestionChip,
                          {
                            backgroundColor: isSelected
                              ? theme.primary
                              : theme.background,
                            borderColor: isSelected
                              ? theme.primary
                              : theme.border,
                          },
                        ]}
                        onPress={() => handleSuggestionPress(key)}>
                        <Text
                          style={[
                            styles.suggestionText,
                            {color: isSelected ? '#fff' : theme.text},
                          ]}>
                          {t(`review.suggestion.${key}`)}
                        </Text>
                        {isSelected ? (
                          <Icon
                            name="check"
                            size={16}
                            color="#fff"
                            style={styles.checkIcon}
                          />
                        ) : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View style={styles.commentContainer}>
              <Text style={[styles.commentLabel, {color: theme.text}]}>
                {t('review.tellUsMore')}
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
                placeholder={String(t('review.commentPlaceholder'))}
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                maxLength={500}
              />
              <Text style={[styles.charCount, {color: theme.textSecondary}]}>
                {comment.length}/500
              </Text>
            </View>

            {photos.length < 3 ? (
              <TouchableOpacity
                style={[styles.addPhotoButton, {borderColor: theme.border}]}
                onPress={handleAddPhoto}
                disabled={uploading}>
                {uploading ? (
                  <ActivityIndicator color={theme.primary} />
                ) : (
                  <>
                    <Icon
                      name="add-photo-alternate"
                      size={24}
                      color={theme.primary}
                    />
                    <Text style={[styles.addPhotoText, {color: theme.primary}]}>
                      {String(t('review.addPhoto')).replace(
                        '{{count}}',
                        String(photos.length),
                      )}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}

            {photos.length > 0 ? (
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
            ) : null}

            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.skipButton, {borderColor: theme.border}]}
                onPress={handleSkip}
                disabled={submitting}>
                <Text
                  style={[styles.skipButtonText, {color: theme.textSecondary}]}>
                  {t('review.skip')}
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
                  <Text style={styles.submitButtonText}>
                    {t('review.submitReview')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      <AlertModal
        visible={alertModal.visible}
        title={alertModal.title}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal({...alertModal, visible: false})}
      />

      <ConfirmationModal
        visible={showSkipModal}
        title={String(t('review.skipTitle'))}
        message={String(t('review.skipMessage'))}
        confirmText={String(t('review.skipConfirm'))}
        cancelText={String(t('common.cancel'))}
        type="info"
        onConfirm={() => {
          setShowSkipModal(false);
          onSkip();
        }}
        onCancel={() => setShowSkipModal(false)}
      />
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
