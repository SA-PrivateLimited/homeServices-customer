import React, {useEffect, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Clipboard,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Share from 'react-native-share';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import type {Consultation} from '../types/consultation';
import {PDFService} from '../services/pdfService';
import {GoogleMeetService} from '../services/googleMeetService';

interface ConsultationDetailsModalProps {
  visible: boolean;
  consultation: Consultation | null;
  onClose: () => void;
  onJoinCall?: (consultation: Consultation) => void;
  onViewPrescription?: (consultation: Consultation) => void;
  onPayNow?: (consultation: Consultation) => void;
}

const ConsultationDetailsModal: React.FC<ConsultationDetailsModalProps> = ({
  visible,
  consultation,
  onClose,
  onJoinCall,
  onViewPrescription,
  onPayNow,
}) => {
  const {isDarkMode, currentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [currentStatus, setCurrentStatus] = useState<string>(consultation?.status || 'scheduled');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isCreatingMeetLink, setIsCreatingMeetLink] = useState(false);
  const [meetLink, setMeetLink] = useState<string | undefined>(consultation?.googleMeetLink);
  // Check if consultation time is within time frame and auto-update status to in-progress
  useEffect(() => {
    if (!consultation?.id || !visible) return;

    const checkAndUpdateStatus = async () => {
      try {
        const now = new Date();
        let scheduledTime: Date | null = null;
        
        if (consultation.scheduledTime) {
          if (consultation.scheduledTime instanceof Date) {
            scheduledTime = consultation.scheduledTime;
          } else if (typeof consultation.scheduledTime === 'object' && 'toDate' in consultation.scheduledTime) {
            scheduledTime = (consultation.scheduledTime as any).toDate();
          } else {
            scheduledTime = new Date(consultation.scheduledTime);
          }
        }

        if (!scheduledTime || isNaN(scheduledTime.getTime())) return;

        const timeDiff = scheduledTime.getTime() - now.getTime();
        const isWithinTimeFrame = timeDiff <= 15 * 60 * 1000 && timeDiff > -30 * 60 * 1000;

        // If within time frame and status is 'scheduled', update to 'in-progress'
        if (isWithinTimeFrame && consultation.status === 'scheduled') {
          try {
            await firestore()
              .collection('consultations')
              .doc(consultation.id)
              .update({
                status: 'in-progress',
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });
            
            setCurrentStatus('in-progress');
          } catch (error) {
          }
        }
      } catch (error) {
      }
    };

    checkAndUpdateStatus();
  }, [consultation?.id, consultation?.scheduledTime, consultation?.status, visible]);

  // Update current status when consultation prop changes
  useEffect(() => {
    if (consultation?.status) {
      setCurrentStatus(consultation.status);
    }
  }, [consultation?.status]);

  // Update meet link when consultation changes
  useEffect(() => {
    if (consultation?.googleMeetLink) {
      setMeetLink(consultation.googleMeetLink);
    }
  }, [consultation?.googleMeetLink]);

  // Debug: Log consultation data when modal opens
  useEffect(() => {
    if (consultation && visible) {
    }
  }, [consultation, visible]);

  if (!consultation) {
    return null;
  }

  const formatDate = (date: Date | any) => {
    try {
      if (!date) return 'Not set';
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatTime = (date: Date | any) => {
    try {
      if (!date) return 'Not set';
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid time';
      return dateObj.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid time';
    }
  };

  const formatDateTime = (date: Date | any) => {
    try {
      if (!date) return 'Not set';
      const dateObj = date?.toDate ? date.toDate() : (date instanceof Date ? date : new Date(date));
      if (isNaN(dateObj.getTime())) return 'Invalid date';
      return dateObj.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#2196F3'; // Blue - matches ConsultationCard
      case 'ongoing':
        return '#FF9800'; // Orange - matches ConsultationCard
      case 'completed':
        return '#4CAF50'; // Green - matches ConsultationCard
      case 'cancelled':
        return '#F44336'; // Red - matches ConsultationCard
      default:
        return theme.textSecondary;
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatShareText = () => {
    let shareText = `📋 Consultation Details\n\n`;
    shareText += `👨‍⚕️ Doctor: Dr. ${consultation.doctorName || 'Not available'}\n`;
    shareText += `🏥 Specialization: ${consultation.doctorSpecialization || 'Not specified'}\n`;
    shareText += `👤 Patient: ${consultation.patientName || 'Not available'}\n`;
    if (consultation.patientAge) {
      shareText += `🎂 Age: ${consultation.patientAge} years\n`;
    }
    shareText += `📅 Date: ${formatDate(consultation.scheduledTime)}\n`;
    shareText += `⏰ Time: ${formatTime(consultation.scheduledTime)}\n`;
    shareText += `⏱️ Duration: ${consultation.duration || 30} minutes\n`;
    shareText += `💰 Fee: ₹${consultation.consultationFee || 0}\n`;
    shareText += `📊 Status: ${getStatusLabel(currentStatus)}\n`;
    
    if (consultation.symptoms && consultation.symptoms.trim()) {
      shareText += `\n🩺 Symptoms:\n${consultation.symptoms}\n`;
    }
    
    if (consultation.notes && consultation.notes.trim()) {
      shareText += `\n📝 Patient Notes:\n${consultation.notes}\n`;
    }
    
    if (consultation.diagnosis && consultation.diagnosis.trim()) {
      shareText += `\n🔍 Diagnosis:\n${consultation.diagnosis}\n`;
    }
    
    if (consultation.prescription && consultation.prescription.trim()) {
      shareText += `\n💊 Prescription:\n${consultation.prescription}\n`;
    }
    
    if (consultation.doctorNotes && consultation.doctorNotes.trim()) {
      shareText += `\n📝 Doctor's Notes:\n${consultation.doctorNotes}\n`;
    }
    
    if (consultation.googleMeetLink) {
      shareText += `\n🔗 Google Meet Link:\n${consultation.googleMeetLink}\n`;
    }
    
    shareText += `\n🆔 Consultation ID: ${consultation.id}\n`;
    
    return shareText;
  };

  const handleShareConsultation = async () => {
    try {
      setIsGeneratingPDF(true);

      // Generate PDF
      const pdfPath = await PDFService.generateConsultationPDF(consultation);

      // Share PDF along with text
      const shareText = formatShareText();
      await Share.open({
        message: shareText,
        title: 'Consultation Details',
        url: `file://${pdfPath}`,
        type: 'application/pdf',
        subject: `Consultation - Dr. ${consultation.doctorName}`,
      });
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share consultation details');
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleCreateMeetLink = async () => {
    if (!consultation?.id) return;

    try {
      setIsCreatingMeetLink(true);

      const newMeetLink = await GoogleMeetService.createMeetLinkForConsultation(
        consultation.id
      );

      setMeetLink(newMeetLink);

      Alert.alert(
        'Success',
        'Google Meet link has been created and added to the consultation.',
        [
          {
            text: 'Copy Link',
            onPress: () => {
              Clipboard.setString(newMeetLink);
              Alert.alert('Copied', 'Google Meet link copied to clipboard');
            },
          },
          {text: 'OK'},
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to create Google Meet link. Please try again.');
    } finally {
      setIsCreatingMeetLink(false);
    }
  };

  // Check if user is provider or admin
  const canManageMeetLink = () => {
    return currentUser?.role === 'provider' || currentUser?.role === 'admin';
  };

  // Get payment status label and color
  const getPaymentStatusLabel = (status?: string) => {
    switch (status) {
      case 'paid':
        return 'Paid';
      case 'cod':
        return 'Cash on Delivery';
      case 'pending':
        return 'Pending';
      case 'failed':
        return 'Failed';
      default:
        return 'Not Paid';
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'paid':
        return '#34C759'; // Green
      case 'cod':
        return '#FF9500'; // Orange
      case 'pending':
        return '#FF9500'; // Orange
      case 'failed':
        return '#FF3B30'; // Red
      default:
        return '#8E8E93'; // Gray
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'cod':
        return 'Cash on Delivery';
      case 'razorpay':
        return 'Razorpay';
      case 'upi':
        return 'UPI';
      case 'upi_qr':
        return 'UPI QR Code';
      case 'razorpay_checkout':
        return 'Razorpay Checkout';
      default:
        return method ? method.charAt(0).toUpperCase() + method.slice(1) : 'Not specified';
    }
  };

  const canJoinCall = () => {
    // Don't show join call button if Google Meet link is not available
    if (!consultation.googleMeetLink || consultation.googleMeetLink.trim() === '') {
      return false;
    }
    // Allow join call if status is 'scheduled' or 'in-progress'
    if (currentStatus !== 'scheduled' && currentStatus !== 'in-progress') return false;
    const now = new Date();
    let scheduledTime: Date | null = null;
    
    if (consultation.scheduledTime) {
      if (consultation.scheduledTime instanceof Date) {
        scheduledTime = consultation.scheduledTime;
      } else if (typeof consultation.scheduledTime === 'object' && 'toDate' in consultation.scheduledTime) {
        scheduledTime = (consultation.scheduledTime as any).toDate();
      } else {
        scheduledTime = new Date(consultation.scheduledTime);
      }
    }
    
    if (!scheduledTime || isNaN(scheduledTime.getTime())) return false;
    const timeDiff = scheduledTime.getTime() - now.getTime();
    return timeDiff <= 15 * 60 * 1000 && timeDiff > -30 * 60 * 1000;
  };

  const DetailRow = ({
    icon,
    label,
    value,
    valueColor,
  }: {
    icon: string;
    label: string;
    value: string;
    valueColor?: string;
  }) => (
    <View style={styles.detailRow}>
      <View style={[styles.iconContainer, {backgroundColor: theme.primary + '20'}]}>
        <Icon name={icon} size={18} color={theme.primary} />
      </View>
      <View style={styles.detailContent}>
        <Text style={[styles.detailLabel, {color: theme.textSecondary}]}>{label}</Text>
        <Text style={[styles.detailValue, {color: valueColor || theme.text}]}>
          {value}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, {backgroundColor: theme.card}]}>
          {/* Header */}
          <View style={[styles.header, {borderBottomColor: theme.border}]}>
            <Text style={[styles.title, {color: theme.text}]}>Consultation Details</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={handleShareConsultation}
                disabled={isGeneratingPDF}
                style={[styles.headerIconButton, {backgroundColor: theme.background}]}
                activeOpacity={0.7}>
                {isGeneratingPDF ? (
                  <ActivityIndicator size="small" color={theme.primary} />
                ) : (
                  <Icon name="share-outline" size={24} color={theme.primary} />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={[styles.closeIconButton, {backgroundColor: theme.background}]}
                activeOpacity={0.7}>
                <Icon name="close-circle" size={28} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            nestedScrollEnabled={true}>
            {/* Status Badge */}
            <View style={styles.statusContainer}>
              <View
                style={[
                  styles.statusBadge,
                  {backgroundColor: getStatusColor(currentStatus) + '20'},
                ]}>
                <View
                  style={[
                    styles.statusDot,
                    {backgroundColor: getStatusColor(currentStatus)},
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    {color: getStatusColor(currentStatus)},
                  ]}>
                  {getStatusLabel(currentStatus)}
                </Text>
              </View>
            </View>

            {/* Patient Information */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>Patient Information</Text>
              <DetailRow
                icon="person"
                label="Patient Name"
                value={consultation.patientName || 'Not available'}
              />
              {consultation.patientAge && (
                <DetailRow
                  icon="calendar"
                  label="Age"
                  value={`${consultation.patientAge} years old`}
                />
              )}
              {consultation.patientPhone && (
                <DetailRow
                  icon="call"
                  label="Phone"
                  value={consultation.patientPhone}
                />
              )}
            </View>

            {/* Doctor Information */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>Doctor Information</Text>
              <DetailRow
                icon="person"
                label="Doctor Name"
                value={consultation.doctorName ? `Dr. ${consultation.doctorName}` : 'Not available'}
              />
              <DetailRow
                icon="medical"
                label="Specialization"
                value={consultation.doctorSpecialization || 'Not specified'}
              />
            </View>

            {/* Appointment Details */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>
                Appointment Details
              </Text>
              <DetailRow
                icon="calendar"
                label="Date"
                value={formatDate(consultation.scheduledTime)}
              />
              <DetailRow
                icon="time"
                label="Time"
                value={formatTime(consultation.scheduledTime)}
              />
              <DetailRow
                icon="hourglass"
                label="Duration"
                value={consultation.duration ? `${consultation.duration} minutes` : '30 minutes'}
              />
              <DetailRow
                icon="cash"
                label="Consultation Fee"
                value={consultation.consultationFee ? `₹${consultation.consultationFee}` : 'Not set'}
                valueColor={theme.primary}
              />
              {/* Payment Status */}
              <View style={styles.paymentStatusRow}>
                <View style={styles.paymentStatusLabel}>
                  <Icon name="card" size={18} color={theme.textSecondary} />
                  <Text style={[styles.paymentStatusLabelText, {color: theme.textSecondary}]}>
                    Payment Status
                  </Text>
                </View>
                <View
                  style={[
                    styles.paymentStatusBadge,
                    {
                      backgroundColor: getPaymentStatusColor(consultation.paymentStatus) + '20',
                    },
                  ]}>
                  <View
                    style={[
                      styles.paymentStatusDot,
                      {backgroundColor: getPaymentStatusColor(consultation.paymentStatus)},
                    ]}
                  />
                  <Text
                    style={[
                      styles.paymentStatusText,
                      {color: getPaymentStatusColor(consultation.paymentStatus)},
                    ]}>
                    {getPaymentStatusLabel(consultation.paymentStatus)}
                  </Text>
                </View>
              </View>
              {/* Payment Method */}
              {(consultation.paymentMethod || consultation.paymentStatus) && (
                <DetailRow
                  icon="wallet"
                  label="Payment Method"
                  value={consultation.paymentMethod ? getPaymentMethodLabel(consultation.paymentMethod) : 'Not specified'}
                  valueColor={consultation.paymentStatus === 'paid' ? getPaymentStatusColor('paid') : theme.text}
                />
              )}
            </View>

            {/* Google Meet Link */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>
                Video Consultation Link
              </Text>
              {meetLink ? (
                <View style={[styles.meetLinkContainer, {backgroundColor: theme.card}]}>
                  <View style={styles.meetLinkContent}>
                    <Icon name="videocam" size={20} color={theme.primary} />
                    <Text style={[styles.meetLinkText, {color: theme.text}]} numberOfLines={1}>
                      {meetLink}
                    </Text>
                  </View>
                  <View style={styles.meetLinkActions}>
                    <TouchableOpacity
                      style={[
                        styles.meetLinkButton, 
                        {backgroundColor: theme.primary + '20'},
                        currentStatus === 'completed' && {opacity: 0.5}
                      ]}
                      onPress={async () => {
                        if (currentStatus === 'completed') return;
                        try {
                          if (meetLink) {
                            Clipboard.setString(meetLink);
                            Alert.alert('Copied', 'Google Meet link copied to clipboard');
                          }
                        } catch (error) {
                          Alert.alert('Error', 'Failed to copy link');
                        }
                      }}
                      disabled={currentStatus === 'completed'}
                      activeOpacity={0.7}>
                      <Icon name="copy-outline" size={18} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.meetLinkButton, {backgroundColor: theme.primary + '20'}]}
                      onPress={async () => {
                        try {
                          await Share.open({
                            message: `Join my consultation on Google Meet:\n\n${meetLink}\n\nDate: ${formatDate(consultation.scheduledTime)} at ${formatTime(consultation.scheduledTime)}\nDoctor: Dr. ${consultation.doctorName}`,
                            title: 'Consultation Google Meet Link',
                          });
                        } catch (error: any) {
                          if (error?.message !== 'User did not share') {
                            Alert.alert('Error', 'Failed to share link');
                          }
                        }
                      }}
                      activeOpacity={0.7}>
                      <Icon name="share-outline" size={18} color={theme.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.meetLinkButton, 
                        styles.joinButton, 
                        {backgroundColor: theme.primary},
                        !canJoinCall() && {opacity: 0.5}
                      ]}
                      onPress={() => {
                        if (meetLink && canJoinCall()) {
                          Linking.openURL(meetLink).catch(() => {
                            Alert.alert('Error', 'Could not open Google Meet link');
                          });
                        }
                      }}
                      disabled={!canJoinCall()}
                      activeOpacity={0.8}>
                      <Icon name="videocam" size={18} color="#fff" />
                      <Text style={styles.joinButtonText}>Join Call</Text>
                    </TouchableOpacity>
                  </View>
                  {canManageMeetLink() && (
                    <TouchableOpacity
                      style={[styles.regenerateMeetButton, {backgroundColor: theme.background, borderColor: theme.border}]}
                      onPress={handleCreateMeetLink}
                      disabled={isCreatingMeetLink}
                      activeOpacity={0.7}>
                      {isCreatingMeetLink ? (
                        <ActivityIndicator size="small" color={theme.primary} />
                      ) : (
                        <>
                          <Icon name="refresh-outline" size={16} color={theme.textSecondary} />
                          <Text style={[styles.regenerateMeetText, {color: theme.textSecondary}]}>
                            Regenerate Link
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <>
                  {canManageMeetLink() ? (
                    <TouchableOpacity
                      style={[styles.createMeetButton, {backgroundColor: theme.primary}]}
                      onPress={handleCreateMeetLink}
                      disabled={isCreatingMeetLink}
                      activeOpacity={0.8}>
                      {isCreatingMeetLink ? (
                        <>
                          <ActivityIndicator size="small" color="#fff" />
                          <Text style={styles.createMeetButtonText}>Creating Meet Link...</Text>
                        </>
                      ) : (
                        <>
                          <Icon name="videocam" size={20} color="#fff" />
                          <Text style={styles.createMeetButtonText}>Create Google Meet Link</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.noMeetLinkContainer, {backgroundColor: theme.card, borderColor: theme.border}]}>
                      <Icon name="videocam-off-outline" size={24} color={theme.textSecondary} />
                      <Text style={[styles.noMeetLinkText, {color: theme.textSecondary}]}>
                        No Google Meet link has been created yet
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Patient Symptoms */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>
                Symptoms
              </Text>
              <View style={styles.textBlock}>
                <Text style={[styles.textBlockValue, {color: consultation.symptoms && consultation.symptoms.trim() ? theme.text : theme.textSecondary, fontStyle: consultation.symptoms && consultation.symptoms.trim() ? 'normal' : 'italic'}]}>
                  {consultation.symptoms && consultation.symptoms.trim() ? consultation.symptoms : 'No symptoms provided'}
                </Text>
              </View>
            </View>

            {/* Patient Notes (before consultation) */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>
                Patient Notes
              </Text>
              <View style={styles.textBlock}>
                <Text style={[styles.textBlockValue, {color: consultation.notes && consultation.notes.trim() ? theme.text : theme.textSecondary, fontStyle: consultation.notes && consultation.notes.trim() ? 'normal' : 'italic'}]}>
                  {consultation.notes && consultation.notes.trim() ? consultation.notes : 'No notes provided'}
                </Text>
              </View>
            </View>

            {/* Diagnosis */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>Diagnosis</Text>
              <View style={styles.textBlock}>
                <Text style={[styles.textBlockValue, {color: consultation.diagnosis && consultation.diagnosis.trim() ? theme.text : theme.textSecondary, fontStyle: consultation.diagnosis && consultation.diagnosis.trim() ? 'normal' : 'italic'}]}>
                  {consultation.diagnosis && consultation.diagnosis.trim() ? consultation.diagnosis : 'Not provided yet'}
                </Text>
              </View>
            </View>

            {/* Prescription */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>Prescription</Text>
              <View style={styles.textBlock}>
                <Text style={[styles.textBlockValue, {color: consultation.prescription && consultation.prescription.trim() ? theme.text : theme.textSecondary, fontStyle: consultation.prescription && consultation.prescription.trim() ? 'normal' : 'italic'}]}>
                  {consultation.prescription && consultation.prescription.trim() ? consultation.prescription : 'Not provided yet'}
                </Text>
              </View>
            </View>

            {/* Doctor's Notes */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>Doctor's Notes</Text>
              <View style={styles.textBlock}>
                <Text style={[styles.textBlockValue, {color: consultation.doctorNotes && consultation.doctorNotes.trim() ? theme.text : theme.textSecondary, fontStyle: consultation.doctorNotes && consultation.doctorNotes.trim() ? 'normal' : 'italic'}]}>
                  {consultation.doctorNotes && consultation.doctorNotes.trim() ? consultation.doctorNotes : 'No notes added yet'}
                </Text>
              </View>
            </View>

            {/* Cancellation Reason (if exists) */}
            {consultation.cancellationReason && consultation.cancellationReason.trim() && (
              <View style={[styles.section, {backgroundColor: theme.background}]}>
                <Text style={[styles.sectionTitle, {color: theme.text}]}>
                  Cancellation Reason
                </Text>
                <View style={[styles.textBlock, {backgroundColor: '#FEF2F2', borderLeftWidth: 3, borderLeftColor: '#EF4444', padding: 12}]}>
                  <Text style={[styles.textBlockValue, {color: '#991B1B'}]}>
                    {consultation.cancellationReason}
                  </Text>
                </View>
              </View>
            )}

            {/* Consultation ID */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>Consultation ID</Text>
              <View style={styles.idContainer}>
                <Text style={[styles.idText, {color: theme.textSecondary}]}>
                  {consultation.id}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    Clipboard.setString(consultation.id);
                    Alert.alert('Copied', 'Consultation ID copied to clipboard');
                  }}>
                  <Icon name="copy-outline" size={18} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Timestamps */}
            <View style={[styles.section, {backgroundColor: theme.background}]}>
              <Text style={[styles.sectionTitle, {color: theme.text}]}>Timestamps</Text>
              {consultation.createdAt && (
                <DetailRow
                  icon="time-outline"
                  label="Created"
                  value={formatDateTime(consultation.createdAt)}
                />
              )}
              {consultation.updatedAt && (
                <DetailRow
                  icon="refresh-outline"
                  label="Last Updated"
                  value={formatDateTime(consultation.updatedAt)}
                />
              )}
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={[styles.actions, {borderTopColor: theme.border}]}>
            <View style={styles.actionRow}>
              {/* Payment Button - Show for pending or COD payments */}
              {(consultation.paymentStatus === 'pending' || consultation.paymentStatus === 'cod' || consultation.paymentMethod === 'cod') && onPayNow && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton, {backgroundColor: theme.primary}]}
                  onPress={() => onPayNow(consultation)}
                  activeOpacity={0.8}>
                  <Icon name="card" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Pay Now</Text>
                </TouchableOpacity>
              )}

              {canJoinCall() && onJoinCall && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.primaryButton, {backgroundColor: theme.primary}]}
                  onPress={() => onJoinCall(consultation)}
                  activeOpacity={0.8}>
                  <Icon name="videocam" size={20} color="#fff" />
                  <Text style={styles.primaryButtonText}>Join Call</Text>
                </TouchableOpacity>
              )}

              {consultation.prescriptionId && onViewPrescription && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.secondaryButton,
                    {borderColor: theme.primary},
                  ]}
                  onPress={() => onViewPrescription(consultation)}
                  activeOpacity={0.8}>
                  <Icon name="document-text" size={20} color={theme.primary} />
                  <Text style={[styles.secondaryButtonText, {color: theme.primary}]}>
                    Prescription
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[styles.closeButton, {borderColor: theme.border, backgroundColor: theme.background}]}
              onPress={onClose}
              activeOpacity={0.8}>
              <Text style={[styles.closeButtonText, {color: theme.text}]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    height: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  closeIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
  statusContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  paymentStatusLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentStatusLabelText: {
    fontSize: 12,
    marginLeft: 8,
  },
  paymentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paymentStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  paymentStatusText: {
    fontSize: 13,
    fontWeight: '600',
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
  detailRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '500',
  },
  textBlock: {
    marginBottom: 16,
  },
  textBlockLabel: {
    fontSize: 12,
    marginBottom: 6,
  },
  textBlockValue: {
    fontSize: 14,
    lineHeight: 20,
  },
  idContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  idText: {
    fontSize: 12,
    fontFamily: 'monospace',
    flex: 1,
    marginRight: 8,
  },
  actions: {
    padding: 20,
    borderTopWidth: 1,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flex: 1,
    minWidth: 120,
    marginRight: 10,
    marginBottom: 8,
  },
  primaryButton: {
    // backgroundColor set inline
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  closeButton: {
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  meetLinkContainer: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  meetLinkContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  meetLinkText: {
    fontSize: 14,
    flex: 1,
    fontWeight: '500',
    marginLeft: 10,
  },
  meetLinkActions: {
    flexDirection: 'row',
  },
  meetLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  joinButton: {
    flex: 1,
  },
  joinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  createMeetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginTop: 10,
  },
  createMeetButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  noMeetLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 10,
  },
  noMeetLinkText: {
    fontSize: 14,
    marginLeft: 10,
    textAlign: 'center',
  },
  regenerateMeetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 10,
  },
  regenerateMeetText: {
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
});

export default ConsultationDetailsModal;

