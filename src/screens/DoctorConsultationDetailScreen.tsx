import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Clipboard,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';

export default function ConsultationDetailScreen({route, navigation}: any) {
  const {consultation} = route.params;

  // Normalize 'pending' to 'scheduled' for display
  const normalizeStatus = (statusValue: string) => {
    return statusValue === 'pending' ? 'scheduled' : statusValue;
  };

  const [status, setStatus] = useState(normalizeStatus(consultation.status));
  const [diagnosis, setDiagnosis] = useState(consultation.diagnosis || '');
  const [prescription, setPrescription] = useState(consultation.prescription || '');
  const [notes, setNotes] = useState(consultation.notes || '');
  const [googleMeetLink, setGoogleMeetLink] = useState(consultation.googleMeetLink || '');
  const [cancellationReason, setCancellationReason] = useState(consultation.cancellationReason || '');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Fetch latest consultation data from Firestore when screen loads
  useEffect(() => {
    const fetchConsultation = async () => {
      if (!consultation.id) {
        setInitialLoading(false);
        return;
      }

      try {
        const consultationDoc = await firestore()
          .collection('consultations')
          .doc(consultation.id)
          .get();

        if (consultationDoc.exists) {
          const data = consultationDoc.data();
          
          // Update all state with latest data from Firestore
          if (data?.status) setStatus(normalizeStatus(data.status));
          if (data?.diagnosis !== undefined) setDiagnosis(data.diagnosis || '');
          if (data?.prescription !== undefined) setPrescription(data.prescription || '');
          if (data?.notes !== undefined) setNotes(data.notes || '');
          if (data?.googleMeetLink !== undefined) setGoogleMeetLink(data.googleMeetLink || '');
          // Pre-fill cancellation reason if it exists (always load it, even if empty)
          setCancellationReason(data?.cancellationReason || '');
        }
      } catch (error) {
      } finally {
        setInitialLoading(false);
      }
    };

    fetchConsultation();
  }, [consultation.id]);

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
      case 'pending':
      case 'scheduled':
        return '#FF9500';
      case 'in-progress':
        return '#007AFF';
      case 'completed':
        return '#34C759';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  if (initialLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
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
          </View>
        </View>

        <View style={styles.appointmentInfo}>
          <View style={styles.infoRow}>
            <Icon name="calendar-today" size={20} color="#007AFF" />
            <Text style={styles.infoText}>{consultation.date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Icon name="access-time" size={20} color="#007AFF" />
            <Text style={styles.infoText}>{consultation.time}</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Status</Text>
        <View style={styles.statusButtons}>
          {['scheduled', 'in-progress', 'completed', 'cancelled'].map(statusOption => {
            // Doctors cannot change status to 'scheduled' (it's set automatically)
            // Doctors also cannot manually set status to 'in-progress' (it's set automatically when consultation time is within time frame)
            const isDisabled = statusOption === 'scheduled' || statusOption === 'in-progress';
            const isActive = status === statusOption;
            return (
            <TouchableOpacity
              key={statusOption}
              style={[
                styles.statusButton,
                  isActive && {
                  backgroundColor: getStatusColor(statusOption),
                },
                  isDisabled && !isActive && styles.statusButtonDisabled,
              ]}
                onPress={() => !isDisabled && setStatus(statusOption)}
                disabled={isDisabled}
                activeOpacity={isDisabled ? 1 : 0.7}>
              <Text
                style={[
                  styles.statusButtonText,
                    isActive && styles.statusButtonTextActive,
                    isDisabled && !isActive && styles.statusButtonTextDisabled,
                ]}>
                {statusOption.toUpperCase().replace('-', ' ')}
              </Text>
            </TouchableOpacity>
            );
          })}
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

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Patient Symptoms</Text>
        <View style={styles.readOnlyField}>
          <Text style={styles.fieldText}>{consultation.symptoms}</Text>
        </View>
      </View>

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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  statusButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginHorizontal: 5,
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
  statusButtonDisabled: {
    opacity: 0.5,
    backgroundColor: '#e0e0e0',
  },
  statusButtonTextDisabled: {
    color: '#999',
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
  sectionSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 10,
    fontStyle: 'italic',
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
    backgroundColor: '#007AFF',
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
