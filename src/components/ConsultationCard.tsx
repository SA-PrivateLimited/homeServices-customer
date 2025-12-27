import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Clipboard, ActivityIndicator} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import Share from 'react-native-share';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import type {Consultation} from '../types/consultation';
import StatusBadge from './StatusBadge';
import {PDFService} from '../services/pdfService';

interface ConsultationCardProps {
  consultation: Consultation;
  onPress: () => void;
  onJoinCall?: () => void;
  onViewPrescription?: () => void;
  onShare?: () => void;
  onPayNow?: () => void;
}

const ConsultationCard: React.FC<ConsultationCardProps> = ({
  consultation,
  onPress,
  onJoinCall,
  onViewPrescription,
  onShare,
  onPayNow,
}) => {
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const formatDate = (date: Date | any) => {
    // Convert Firestore Timestamp to Date if needed
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date | any) => {
    // Convert Firestore Timestamp to Date if needed
    const dateObj = date?.toDate ? date.toDate() : new Date(date);
    return dateObj.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatShareText = () => {
    const dateStr = formatDate(consultation.scheduledTime);
    const timeStr = formatTime(consultation.scheduledTime);
    
    let shareText = `📋 Consultation Details\n\n`;
    shareText += `👨‍⚕️ Doctor: Dr. ${consultation.doctorName}\n`;
    shareText += `🏥 Specialization: ${consultation.doctorSpecialization || 'Not specified'}\n`;
    shareText += `📅 Date: ${dateStr}\n`;
    shareText += `⏰ Time: ${timeStr}\n`;
    shareText += `💰 Fee: ₹${consultation.consultationFee}\n`;
    shareText += `📊 Status: ${consultation.status.charAt(0).toUpperCase() + consultation.status.slice(1)}\n`;
    
    if (consultation.symptoms) {
      shareText += `\n🩺 Symptoms:\n${consultation.symptoms}\n`;
    }
    
    if (consultation.diagnosis) {
      shareText += `\n🔍 Diagnosis:\n${consultation.diagnosis}\n`;
    }
    
    if (consultation.prescription) {
      shareText += `\n💊 Prescription:\n${consultation.prescription}\n`;
    }
    
    if (consultation.doctorNotes) {
      shareText += `\n📝 Doctor's Notes:\n${consultation.doctorNotes}\n`;
    }
    
    if (consultation.googleMeetLink) {
      shareText += `\n🔗 Google Meet Link:\n${consultation.googleMeetLink}\n`;
    }
    
    shareText += `\n🆔 Consultation ID: ${consultation.id}\n`;
    
    return shareText;
  };

  const handleShare = async () => {
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

      if (onShare) {
        onShare();
      }
    } catch (error: any) {
      if (error?.message !== 'User did not share') {
        Alert.alert('Error', 'Failed to share consultation details');
      }
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const canJoinCall = () => {
    // Don't allow join call for completed or cancelled consultations
    if (consultation.status === 'completed' || consultation.status === 'cancelled') return false;
    if (consultation.status !== 'scheduled') return false;
    const now = new Date();
    const scheduledTime = new Date(consultation.scheduledTime);
    const timeDiff = scheduledTime.getTime() - now.getTime();
    // Can join 15 minutes before scheduled time
    return timeDiff <= 15 * 60 * 1000 && timeDiff > -30 * 60 * 1000;
  };

  return (
    <TouchableOpacity
      style={[
        styles.card,
        {backgroundColor: theme.card, borderColor: theme.border},
        commonStyles.shadowMedium,
      ]}
      onPress={onPress}
      activeOpacity={0.7}>
      {/* Header with Doctor Info */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.doctorInfoContainer}>
            <View style={[styles.doctorIconContainer, {backgroundColor: theme.primary + '15'}]}>
              <Icon name="medical" size={20} color={theme.primary} />
            </View>
            <View style={styles.doctorTextContainer}>
              <Text style={[styles.doctorName, {color: theme.text}]} numberOfLines={1}>
            Dr. {consultation.doctorName}
          </Text>
              <Text style={[styles.specialization, {color: theme.textSecondary}]} numberOfLines={1}>
            {consultation.doctorSpecialization}
          </Text>
            </View>
          </View>
        </View>
        <StatusBadge status={consultation.status} />
      </View>

      {/* Divider */}
      <View style={[styles.divider, {backgroundColor: theme.border}]} />

      {/* Date & Time Row */}
      <View style={styles.infoRow}>
        <View style={[styles.infoItem, {backgroundColor: theme.background}]}>
          <Icon name="calendar-outline" size={18} color={theme.primary} />
          <Text style={[styles.infoText, {color: theme.text}]} numberOfLines={1}>
            {formatDate(consultation.scheduledTime)}
          </Text>
        </View>
        <View style={[styles.infoItem, {backgroundColor: theme.background}]}>
          <Icon name="time-outline" size={18} color={theme.primary} />
          <Text style={[styles.infoText, {color: theme.text}]}>
            {formatTime(consultation.scheduledTime)}
          </Text>
        </View>
      </View>

      {/* Fee Row */}
      <View style={[styles.feeContainer, {backgroundColor: theme.primary + '10'}]}>
        <Icon name="cash-outline" size={18} color={theme.primary} />
        <Text style={[styles.feeText, {color: theme.primary}]}>
          ₹{consultation.consultationFee}
        </Text>
      </View>

      {/* Google Meet Link */}
      {consultation.googleMeetLink && (
        <View style={[styles.meetLinkContainer, {backgroundColor: theme.background, borderColor: theme.border}]}>
          <View style={styles.meetLinkHeader}>
            <Icon name="videocam-outline" size={18} color={theme.primary} />
            <Text style={[styles.meetLinkLabel, {color: theme.textSecondary}]}>
              Google Meet Link
            </Text>
          </View>
          <Text style={[styles.meetLinkText, {color: theme.text}]} numberOfLines={1}>
            {consultation.googleMeetLink}
          </Text>
          <View style={styles.meetLinkActions}>
            <TouchableOpacity
              style={[
                styles.meetActionButton, 
                {backgroundColor: theme.primary + '20', marginRight: 8},
                consultation.status === 'completed' && {opacity: 0.5}
              ]}
              onPress={() => {
                if (consultation.googleMeetLink && consultation.status !== 'completed') {
                  Clipboard.setString(consultation.googleMeetLink);
                  Alert.alert('Copied', 'Google Meet link copied to clipboard');
                }
              }}
              disabled={consultation.status === 'completed'}
              activeOpacity={0.7}>
              <Icon name="copy-outline" size={16} color={theme.primary} />
              <Text style={[styles.meetActionText, {color: theme.primary}]}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.meetActionButton, 
                styles.joinCallButton, 
                {backgroundColor: theme.primary},
                consultation.status === 'completed' && {opacity: 0.5}
              ]}
              onPress={() => {
                if (consultation.googleMeetLink && consultation.status !== 'completed') {
                  Linking.openURL(consultation.googleMeetLink).catch(() => {
                    Alert.alert('Error', 'Could not open Google Meet link');
                  });
                }
              }}
              disabled={consultation.status === 'completed'}
              activeOpacity={0.8}>
              <Icon name="videocam" size={16} color="#fff" />
              <Text style={styles.joinCallText}>Join Call</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <View style={styles.primaryActions}>
          {/* Payment Button - Show for pending or COD payments */}
          {(consultation.paymentStatus === 'pending' || consultation.paymentStatus === 'cod' || consultation.paymentMethod === 'cod') && onPayNow && (
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: theme.primary}]}
              onPress={onPayNow}
              activeOpacity={0.8}>
              <Icon name="card" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Pay Now</Text>
            </TouchableOpacity>
          )}

          {canJoinCall() && onJoinCall && (
            <TouchableOpacity
              style={[styles.actionButton, {backgroundColor: theme.primary}]}
              onPress={onJoinCall}
              activeOpacity={0.8}>
              <Icon name="videocam" size={18} color="#fff" />
              <Text style={styles.actionButtonText}>Join Call</Text>
            </TouchableOpacity>
          )}

          {consultation.prescriptionId && onViewPrescription && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.secondaryButton,
                {borderColor: theme.primary},
              ]}
              onPress={onViewPrescription}
              activeOpacity={0.8}>
              <Icon name="document-text-outline" size={18} color={theme.primary} />
              <Text style={[styles.secondaryButtonText, {color: theme.primary}]}>
                Prescription
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {/* Share Button - Always visible */}
        <TouchableOpacity
          style={[
            styles.shareButton,
            {borderColor: theme.border, backgroundColor: theme.background},
          ]}
          onPress={handleShare}
          disabled={isGeneratingPDF}
          activeOpacity={0.8}>
          {isGeneratingPDF ? (
            <>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.shareButtonText, {color: theme.primary, marginLeft: 8}]}>
                Generating PDF...
              </Text>
            </>
          ) : (
            <>
              <Icon name="share-outline" size={18} color={theme.primary} />
              <Text style={[styles.shareButtonText, {color: theme.primary}]}>Share</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  doctorInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorTextContainer: {
    flex: 1,
  },
  doctorName: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  specialization: {
    fontSize: 14,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    marginBottom: 14,
    opacity: 0.2,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  infoItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 10,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    marginLeft: 8,
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  feeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  actions: {
    marginTop: 4,
  },
  primaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 100,
    marginRight: 10,
    marginBottom: 8,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  iconOnlyButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    width: '100%',
  },
  shareButtonText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  meetLinkContainer: {
    borderRadius: 12,
    padding: 14,
    borderWidth: 1.5,
    marginBottom: 12,
    marginTop: 4,
  },
  meetLinkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  meetLinkLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  meetLinkText: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
    fontFamily: 'monospace',
  },
  meetLinkActions: {
    flexDirection: 'row',
  },
  meetActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
  },
  joinCallButton: {
    flex: 1.5,
  },
  meetActionText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  joinCallText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});

export default ConsultationCard;
