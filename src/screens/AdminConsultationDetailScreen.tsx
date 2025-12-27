import React, {useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';

export default function AdminConsultationDetailScreen({route, navigation}: any) {
  const {consultation} = route.params;

  const [status, setStatus] = useState(consultation.status);
  const [diagnosis, setDiagnosis] = useState(consultation.diagnosis || '');
  const [prescription, setPrescription] = useState(consultation.prescription || '');
  const [notes, setNotes] = useState(consultation.notes || '');
  const [googleMeetLink, setGoogleMeetLink] = useState(consultation.googleMeetLink || '');
  const [cancellationReason, setCancellationReason] = useState(consultation.cancellationReason || '');
  const [loading, setLoading] = useState(false);

  const handleCreateMeetLink = () => {
    Linking.openURL('https://meet.google.com/landing').catch(() => {
      Alert.alert('Error', 'Could not open Google Meet. Please try again.');
    });
  };

  const handleUpdateConsultation = async () => {
    if (status === 'completed' && (!diagnosis || !prescription)) {
      Alert.alert('Error', 'Please provide diagnosis and prescription to complete the consultation');
      return;
    }

    if (status === 'cancelled' && !cancellationReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for cancellation');
      return;
    }

    setLoading(true);
    try {
      const updateData: any = {
        status,
        diagnosis,
        prescription,
        notes,
        googleMeetLink: googleMeetLink.trim() || null,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      };

      // Add cancellation reason if status is cancelled
      if (status === 'cancelled') {
        updateData.cancellationReason = cancellationReason.trim();
      } else {
        // Clear cancellation reason if status is not cancelled
        updateData.cancellationReason = null;
      }

      await firestore().collection('consultations').doc(consultation.id).update(updateData);

      Alert.alert('Success', 'Consultation updated successfully', [
        {text: 'OK', onPress: () => navigation.goBack()},
      ]);
    } catch (error) {
      Alert.alert('Error', 'Failed to update consultation');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (statusValue: string) => {
    switch (statusValue) {
      case 'scheduled':
        return '#FF9500';
      case 'ongoing':
        return '#007AFF';
      case 'completed':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return {date: 'N/A', time: 'N/A'};
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return {
      date: date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const {date, time} = formatDateTime(consultation.scheduledTime);

  return (
    <ScrollView style={styles.container}>
      {/* Patient Card */}
      <View style={styles.patientCard}>
        <View style={styles.patientHeader}>
          <View style={styles.avatar}>
            <Icon name="person" size={40} color="#007AFF" />
          </View>
          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{consultation.patientName}</Text>
            {consultation.patientAge ? (
              <Text style={styles.patientDetail}>{consultation.patientAge} years old</Text>
            ) : (
              <Text style={styles.patientDetail}>Age not specified</Text>
            )}
            {consultation.patientPhone && (
              <Text style={styles.patientDetail}>{consultation.patientPhone}</Text>
            )}
            <Text style={styles.patientDetail}>Patient ID: {consultation.patientId}</Text>
          </View>
        </View>

        {/* Doctor Info */}
        <View style={styles.divider} />
        <View style={styles.doctorSection}>
          <Icon name="medical-services" size={20} color="#34C759" style={styles.sectionIcon} />
          <View style={styles.sectionContent}>
            <Text style={styles.doctorName}>Dr. {consultation.doctorName}</Text>
            <Text style={styles.specialty}>{consultation.doctorSpecialization}</Text>
          </View>
        </View>

        {/* Appointment Info */}
        <View style={styles.appointmentInfo}>
          <View style={styles.infoRow}>
            <Icon name="calendar-today" size={20} color="#007AFF" />
            <Text style={styles.infoText}>{date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="access-time" size={20} color="#007AFF" />
            <Text style={styles.infoText}>{time}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="attach-money" size={20} color="#007AFF" />
            <Text style={styles.infoText}>₹{consultation.consultationFee}</Text>
          </View>
        </View>
      </View>

      {/* Status Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusButtons}>
          {['scheduled', 'ongoing', 'completed', 'cancelled'].map(statusOption => (
            <TouchableOpacity
              key={statusOption}
              style={[
                styles.statusButton,
                status === statusOption && {
                  backgroundColor: getStatusColor(statusOption),
                },
              ]}
              onPress={() => setStatus(statusOption)}>
              <Text
                style={[
                  styles.statusButtonText,
                  status === statusOption && styles.statusButtonTextActive,
                ]}>
                {statusOption.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Cancellation Reason Section - Only show when status is cancelled */}
      {status === 'cancelled' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cancellation Reason *</Text>
          <Text style={styles.sectionSubtitle}>
            Please provide a reason for cancelling this consultation. This will be visible to the patient.
          </Text>
          <TextInput
            style={styles.textArea}
            value={cancellationReason}
            onChangeText={setCancellationReason}
            placeholder="Enter reason for cancellation..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      )}

      {/* Symptoms Section */}
      {consultation.symptoms && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Symptoms</Text>
          <View style={styles.readOnlyField}>
            <Text style={styles.fieldText}>{consultation.symptoms}</Text>
          </View>
        </View>
      )}

      {/* Diagnosis Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Diagnosis *</Text>
        <TextInput
          style={styles.textArea}
          value={diagnosis}
          onChangeText={setDiagnosis}
          placeholder="Enter diagnosis..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Prescription Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prescription *</Text>
        <TextInput
          style={styles.textArea}
          value={prescription}
          onChangeText={setPrescription}
          placeholder="Enter prescription details..."
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>

      {/* Additional Notes Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Additional Notes</Text>
        <TextInput
          style={styles.textArea}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any additional notes..."
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>

      {/* Google Meet Link Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Google Meet Link</Text>
        <Text style={styles.sectionSubtitle}>
          Create a Google Meet link and paste it here. This will be visible to the patient.
        </Text>

        {/* Create/Update Meet Link Button */}
        <TouchableOpacity
          style={styles.createMeetButton}
          onPress={handleCreateMeetLink}
          activeOpacity={0.7}>
          <Icon name="add-circle-outline" size={16} color="#007AFF" />
          <Text style={styles.createMeetButtonText}>
            {googleMeetLink ? 'Update Google Meet Link' : 'Create Google Meet Link'}
          </Text>
        </TouchableOpacity>

        <TextInput
          style={styles.textInput}
          value={googleMeetLink}
          onChangeText={setGoogleMeetLink}
          placeholder="https://meet.google.com/xxx-yyyy-zzz"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        {googleMeetLink && (
          <View style={styles.linkPreview}>
            <Icon name="videocam" size={16} color="#34C759" />
            <Text style={styles.linkPreviewText} numberOfLines={1}>
              {googleMeetLink}
            </Text>
          </View>
        )}
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleUpdateConsultation}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Icon name="save" size={20} color="#fff" />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </>
        )}
      </TouchableOpacity>

      <View style={{height: 30}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  patientCard: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
  },
  patientHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  patientInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  patientName: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  patientDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 15,
  },
  doctorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionContent: {
    flex: 1,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 3,
  },
  specialty: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  appointmentInfo: {
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 15,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  section: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
  },
  statusButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    minWidth: '22%',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  statusButtonText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  readOnlyField: {
    backgroundColor: '#f8f8f8',
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  fieldText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  textArea: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
    minHeight: 100,
  },
  textInput: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  linkPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#f0f9ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  linkPreviewText: {
    fontSize: 12,
    color: '#0369a1',
    marginLeft: 8,
    flex: 1,
  },
  saveButton: {
    backgroundColor: '#FF9500',
    padding: 15,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 20,
    marginTop: 10,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  createMeetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F8FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#007AFF',
    alignSelf: 'flex-start',
  },
  createMeetButtonText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
});

