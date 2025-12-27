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

interface FeeChangeRequest {
  id: string;
  doctorId: string;
  doctorEmail: string;
  doctorName: string;
  currentFee: number;
  requestedFee: number;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  rejectionReason?: string;
  requestedAt?: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  approvedBy?: string;
  rejectedBy?: string;
  createdAt?: Date;
}

export default function AdminFeeChangeRequestsScreen({navigation}: any) {
  const [requests, setRequests] = useState<FeeChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<FeeChangeRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const {currentUser} = useStore();

  useEffect(() => {
    const unsubscribe = firestore()
      .collection('feeChangeRequests')
      .orderBy('requestedAt', 'desc')
      .onSnapshot(
        snapshot => {
          const requestsList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            requestedAt: doc.data().requestedAt?.toDate(),
            approvedAt: doc.data().approvedAt?.toDate(),
            rejectedAt: doc.data().rejectedAt?.toDate(),
            createdAt: doc.data().createdAt?.toDate(),
          })) as FeeChangeRequest[];

          setRequests(requestsList);
          setLoading(false);
        },
        error => {
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, []);

  const handleApprove = async (request: FeeChangeRequest) => {
    Alert.alert(
      'Approve Fee Change',
      `Approve fee change from ₹${request.currentFee} to ₹${request.requestedFee} for ${request.doctorName}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Approve',
          onPress: async () => {
            try {
              const adminId = auth().currentUser?.uid || currentUser?.id;
              
              // Update the fee change request status
              await firestore()
                .collection('feeChangeRequests')
                .doc(request.id)
                .update({
                  status: 'approved',
                  approvedBy: adminId,
                  approvedAt: firestore.FieldValue.serverTimestamp(),
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });

              // Update the doctor's consultation fee
              await firestore()
                .collection('providers')
                .doc(request.doctorId)
                .update({
                  consultationFee: request.requestedFee,
                  updatedAt: firestore.FieldValue.serverTimestamp(),
                });

              Alert.alert('Success', 'Fee change approved successfully');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to approve fee change');
            }
          },
        },
      ],
    );
  };

  const handleReject = (request: FeeChangeRequest) => {
    setSelectedRequest(request);
    setRejectionReason('');
    setRejectModalVisible(true);
  };

  const confirmReject = async () => {
    if (!selectedRequest) return;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      Alert.alert('Error', 'Please provide a rejection reason');
      return;
    }

    try {
      const adminId = auth().currentUser?.uid || currentUser?.id;
      await firestore()
        .collection('feeChangeRequests')
        .doc(selectedRequest.id)
        .update({
          status: 'rejected',
          rejectionReason: rejectionReason.trim(),
          rejectedBy: adminId,
          rejectedAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });

      Alert.alert('Success', 'Fee change rejected');
      setRejectModalVisible(false);
      setSelectedRequest(null);
      setRejectionReason('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to reject fee change');
    }
  };

  const getStatusColor = (status: string) => {
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

  const getStatusIcon = (status: string) => {
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

  const filteredRequests = requests.filter(request => {
    if (filter === 'all') return true;
    return request.status === filter;
  });

  const renderRequest = ({item}: {item: FeeChangeRequest}) => {
    const statusColor = getStatusColor(item.status);
    const statusIcon = getStatusIcon(item.status);
    const feeChange = item.requestedFee - item.currentFee;
    const feeChangePercent = ((feeChange / item.currentFee) * 100).toFixed(1);

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{item.doctorName}</Text>
            <Text style={styles.doctorEmail}>{item.doctorEmail}</Text>
          </View>
          <View style={[styles.statusBadge, {backgroundColor: statusColor + '20'}]}>
            <Icon name={statusIcon} size={20} color={statusColor} />
            <Text style={[styles.statusText, {color: statusColor}]}>
              {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.feeDetails}>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Current Fee:</Text>
            <Text style={styles.feeValue}>₹{item.currentFee}</Text>
          </View>
          <View style={styles.feeRow}>
            <Text style={styles.feeLabel}>Requested Fee:</Text>
            <Text style={[styles.feeValue, styles.requestedFee]}>₹{item.requestedFee}</Text>
          </View>
          <View style={styles.feeChangeRow}>
            <Icon 
              name={feeChange > 0 ? 'trending-up' : 'trending-down'} 
              size={20} 
              color={feeChange > 0 ? '#34C759' : '#FF3B30'} 
            />
            <Text style={[
              styles.feeChangeText, 
              {color: feeChange > 0 ? '#34C759' : '#FF3B30'}
            ]}>
              {feeChange > 0 ? '+' : ''}₹{Math.abs(feeChange)} ({feeChangePercent}%)
            </Text>
          </View>
        </View>

        {item.requestedAt && (
          <View style={styles.detailRow}>
            <Icon name="schedule" size={16} color="#666" />
            <Text style={styles.detailText}>
              Requested: {item.requestedAt.toLocaleDateString()} {item.requestedAt.toLocaleTimeString()}
            </Text>
          </View>
        )}

        {item.status === 'rejected' && item.rejectionReason && (
          <View style={styles.rejectionBox}>
            <Icon name="info" size={16} color="#FF3B30" />
            <Text style={styles.rejectionText}>Reason: {item.rejectionReason}</Text>
          </View>
        )}

        {item.status === 'approved' && item.approvedAt && (
          <View style={styles.detailRow}>
            <Icon name="check-circle" size={16} color="#34C759" />
            <Text style={styles.detailText}>
              Approved: {item.approvedAt.toLocaleDateString()} {item.approvedAt.toLocaleTimeString()}
            </Text>
          </View>
        )}

        {item.status === 'pending' && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => handleApprove(item)}>
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
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>Loading fee change requests...</Text>
      </View>
    );
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

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

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="attach-money" size={64} color="#ccc" />
          <Text style={styles.emptyText}>
            {filter === 'pending' ? 'No pending fee change requests' : `No ${filter} requests`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRequests}
          renderItem={renderRequest}
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
              <Text style={styles.modalTitle}>Reject Fee Change Request</Text>
              <TouchableOpacity onPress={() => setRejectModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Enter reason for rejecting fee change request from ₹{selectedRequest?.currentFee} to ₹{selectedRequest?.requestedFee}:
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
                  setSelectedRequest(null);
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
  requestCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
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
  feeDetails: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  feeLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  feeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  requestedFee: {
    color: '#FF9500',
  },
  feeChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  feeChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 12,
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
    marginTop: 10,
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

