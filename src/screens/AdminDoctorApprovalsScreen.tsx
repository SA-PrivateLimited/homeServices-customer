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
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import type {Doctor, DoctorApprovalStatus} from '../types/consultation';

interface DoctorWithStatus extends Doctor {
  approvalStatus?: DoctorApprovalStatus;
  rejectionReason?: string;
}

export default function AdminDoctorApprovalsScreen({navigation}: any) {
  const [doctors, setDoctors] = useState<DoctorWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<DoctorWithStatus | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const {currentUser} = useStore();

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('providers')
      .onSnapshot(
        snapshot => {
          const doctorsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
            updatedAt: doc.data().updatedAt?.toDate(),
            approvedAt: doc.data().approvedAt?.toDate(),
          })) as DoctorWithStatus[];

          setDoctors(doctorsList);
          setLoading(false);
        },
        error => {
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, []);

  const handleApprove = async (doctorId: string, doctorName: string) => {
    Alert.alert(
      'Approve Doctor',
      `Approve ${doctorName}? They will be able to perform doctor activities.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const adminId = auth().currentUser?.uid || currentUser?.id;
              await firestore().collection('providers').doc(doctorId).update({
                approvalStatus: 'approved',
                verified: true,
                approvedBy: adminId,
                approvedAt: firestore.FieldValue.serverTimestamp(),
                updatedAt: firestore.FieldValue.serverTimestamp(),
              });

              Alert.alert('Success', 'Doctor approved successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve doctor');
            }
          },
        },
      ],
    );
  };

  const handleReject = (doctor: DoctorWithStatus) => {
    setSelectedDoctor(doctor);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!selectedDoctor) return;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      const adminId = auth().currentUser?.uid || currentUser?.id;
      await firestore().collection('providers').doc(selectedDoctor.id).update({
        approvalStatus: 'rejected',
        rejectionReason: rejectionReason.trim(),
        verified: false,
        approvedBy: adminId,
        approvedAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });

      Alert.alert('Success', 'Doctor rejected');
      setRejectModalVisible(false);
      setSelectedDoctor(null);
      setRejectionReason('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject doctor');
    }
  };

  const getStatusColor = (status?: DoctorApprovalStatus) => {
    switch (status) {
      case 'approved':
        return '#34C759';
      case 'rejected':
        return '#FF3B30';
      case 'pending':
      default:
        return '#FF9500';
    }
  };

  const getStatusIcon = (status?: DoctorApprovalStatus) => {
    switch (status) {
      case 'approved':
        return 'check-circle';
      case 'rejected':
        return 'cancel';
      case 'pending':
      default:
        return 'hourglass-empty';
    }
  };

  const filteredDoctors = doctors.filter(doctor => {
    if (filter === 'all') return true;
    return doctor.approvalStatus === filter || (!doctor.approvalStatus && filter === 'pending');
  });

  const renderDoctor = ({item}: {item: DoctorWithStatus}) => {
    const status = item.approvalStatus || 'pending';
    const statusColor = getStatusColor(status);
    const statusIcon = getStatusIcon(status);

    return (
      <View style={styles.doctorCard}>
        <View style={styles.doctorHeader}>
          {item.profileImage ? (
            <Image source={{uri: item.profileImage}} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Icon name="person" size={30} color="#666" />
            </View>
          )}
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{item.name}</Text>
            <Text style={styles.doctorSpecialty}>{item.specialization}</Text>
            <Text style={styles.doctorEmail}>{item.email}</Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
            <Icon name={statusIcon} size={20} color={statusColor} />
            <Text style={[styles.statusText, {color: statusColor}]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Icon name="phone" size={16} color="#666" />
            <Text style={styles.detailText}>{item.phone}</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="school" size={16} color="#666" />
            <Text style={styles.detailText}>
              {Array.isArray(item.qualifications) ? item.qualifications.join(', ') : item.qualifications}
            </Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="work" size={16} color="#666" />
            <Text style={styles.detailText}>{item.experience} years experience</Text>
          </View>
          <View style={styles.detailRow}>
            <Icon name="attach-money" size={16} color="#666" />
            <Text style={styles.detailText}>₹{item.consultationFee} consultation fee</Text>
          </View>
        </View>

        {status === 'rejected' && item.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Icon name="info" size={16} color="#FF3B30" />
            <Text style={styles.rejectionText}>Reason: {item.rejectionReason}</Text>
          </View>
        )}

        {status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item.id, item.name)}>
              <Icon name="check" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.rejectButton]}
              onPress={() => handleReject(item)}>
              <Icon name="close" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Reject</Text>
            </TouchableOpacity>
          </View>
        )}

        {status === 'rejected' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.approveButton, styles.fullWidth]}
            onPress={() => handleApprove(item.id, item.name)}>
            <Icon name="refresh" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Re-approve</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>Loading doctor approvals...</Text>
      </View>
    );
  }

  const pendingCount = doctors.filter(d => !d.approvalStatus || d.approvalStatus === 'pending').length;
  const approvedCount = doctors.filter(d => d.approvalStatus === 'approved').length;
  const rejectedCount = doctors.filter(d => d.approvalStatus === 'rejected').length;

  return (
    <View style={styles.container}>
      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(['all', 'pending', 'approved', 'rejected'] as const).map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
              onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
                {f === 'pending' && ` (${pendingCount})`}
                {f === 'approved' && ` (${approvedCount})`}
                {f === 'rejected' && ` (${rejectedCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Doctors List */}
      {filteredDoctors.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="people-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {filter === 'pending' ? 'No pending approvals' : `No ${filter} doctors`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredDoctors}
          renderItem={renderDoctor}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Rejection Reason Modal */}
      <Modal
        visible={rejectModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setRejectModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Reject Doctor
              </Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter reason for rejecting {selectedDoctor?.name}:
            </Text>

            <TextInput
              style={styles.reasonInput}
              placeholder="Enter rejection reason..."
              placeholderTextColor="#999"
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setRejectModalVisible(false);
                  setSelectedDoctor(null);
                  setRejectionReason('');
                }}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalRejectButton]}
                onPress={confirmReject}>
                <Text style={styles.modalRejectButtonText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginHorizontal: 5,
  },
  filterChipActive: {
    backgroundColor: '#FF9500',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 15,
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  doctorSpecialty: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  doctorEmail: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  details: {
    marginBottom: 15,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    padding: 10,
    borderRadius: 8,
    marginBottom: 15,
    gap: 8,
  },
  rejectionText: {
    flex: 1,
    fontSize: 12,
    color: '#FF3B30',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  fullWidth: {
    flex: 1,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 15,
    fontSize: 16,
    color: '#999',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
  },
  reasonInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  modalRejectButton: {
    backgroundColor: '#FF3B30',
  },
  modalRejectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

