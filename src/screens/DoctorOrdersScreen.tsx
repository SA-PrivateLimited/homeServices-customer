import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

interface Payment {
  id: string;
  consultationId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  paymentMethod?: 'cod' | 'razorpay' | 'upi';
  amount: number; // in paise
  amountInRupees?: number;
  status: 'completed' | 'pending' | 'failed';
  paidAt?: any;
  createdAt: any;
  // Joined consultation data
  consultation?: {
    patientName: string;
    scheduledTime?: any;
  };
}

export default function DoctorOrdersScreen({navigation}: any) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const currentUser = auth().currentUser;

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    // First, get the doctor ID from the doctors collection
    const getDoctorId = async () => {
      try {
        const doctorSnapshot = await firestore()
          .collection('providers')
          .where('email', '==', currentUser.email)
          .limit(1)
          .get();

        if (doctorSnapshot.empty) {
          setLoading(false);
          return;
        }

        const doctorId = doctorSnapshot.docs[0].id;

        // Fetch consultations for this doctor
        const consultationsSnapshot = await firestore()
          .collection('consultations')
          .where('doctorId', '==', doctorId)
          .get();

        const consultationIds = consultationsSnapshot.docs.map(doc => doc.id);
        
        if (consultationIds.length === 0) {
          setPayments([]);
          setLoading(false);
          return;
        }

        // Create a map of consultation IDs for filtering
        const consultationIdSet = new Set(consultationIds);
        
        // Set up real-time listener on all payments and filter client-side
        // This approach works better than batching 'in' queries
        const unsubscribe = firestore()
          .collection('payments')
          .orderBy('createdAt', 'desc')
          .onSnapshot(
            async snapshot => {
              
              // Filter payments to only include those for this doctor's consultations
              const filteredDocs = snapshot.docs.filter(doc => {
                const consultationId = doc.data().consultationId;
                return consultationIdSet.has(consultationId);
              });

              // Fetch consultation details for each payment
              const paymentsWithConsultations = await Promise.all(
                filteredDocs.map(async doc => {
                  const paymentData = doc.data();
                  const payment: Payment = {
                    id: doc.id,
                    consultationId: paymentData.consultationId,
                    razorpayPaymentId: paymentData.razorpayPaymentId,
                    razorpayOrderId: paymentData.razorpayOrderId,
                    razorpaySignature: paymentData.razorpaySignature,
                    paymentMethod: paymentData.paymentMethod || 'razorpay',
                    amount: paymentData.amount || 0,
                    amountInRupees: paymentData.amountInRupees,
                    status: paymentData.status || 'pending',
                    paidAt: paymentData.paidAt,
                    createdAt: paymentData.createdAt,
                  };

                  // Fetch consultation details
                  try {
                    const consultationDoc = await firestore()
                      .collection('consultations')
                      .doc(payment.consultationId)
                      .get();

                    if (consultationDoc.exists) {
                      const consultationData = consultationDoc.data();
                      payment.consultation = {
                        patientName: consultationData?.patientName || 'Unknown',
                        scheduledTime: consultationData?.scheduledTime,
                      };
                    }
                  } catch (error) {
                  }

                  return payment;
                })
              );

              // Sort by createdAt descending
              paymentsWithConsultations.sort((a, b) => {
                const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                return dateB - dateA;
              });

              setPayments(paymentsWithConsultations);
              setLoading(false);
            },
            error => {
              setLoading(false);
            },
          );

        return () => unsubscribe();
      } catch (error: any) {
        setLoading(false);
      }
    };

    getDoctorId();
  }, [currentUser]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'pending':
        return '#FF9500';
      case 'failed':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const formatDateTime = (timestamp: any) => {
    if (!timestamp) return {date: 'N/A', time: 'N/A'};

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const dateStr = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    const timeStr = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    return {date: dateStr, time: timeStr};
  };

  const formatAmount = (amountInPaise: number, amountInRupees?: number) => {
    if (amountInRupees) {
      return `₹${amountInRupees.toFixed(2)}`;
    }
    return `₹${(amountInPaise / 100).toFixed(2)}`;
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
      case 'cod':
        return 'Cash on Delivery';
      case 'razorpay':
        return 'Razorpay';
      case 'upi':
        return 'UPI';
      default:
        return 'Online Payment';
    }
  };

  const filteredPayments = payments.filter(payment =>
    filter === 'all' ? true : payment.status === filter
  );

  // Calculate counts
  const allCount = payments.length;
  const completedCount = payments.filter(p => p.status === 'completed').length;
  const pendingCount = payments.filter(p => p.status === 'pending').length;
  const failedCount = payments.filter(p => p.status === 'failed').length;

  const renderPayment = ({item}: {item: Payment}) => {
    const {date, time} = formatDateTime(item.createdAt);
    const paidDate = item.paidAt ? formatDateTime(item.paidAt) : null;

    return (
      <TouchableOpacity style={styles.paymentCard}>
        <View style={styles.cardTopSection}>
          <View style={[styles.statusBadge, {backgroundColor: getStatusColor(item.status)}]}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
          <Text style={styles.paymentMethod}>{getPaymentMethodLabel(item.paymentMethod)}</Text>
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.amountLabel}>Amount</Text>
          <Text style={styles.amountValue}>{formatAmount(item.amount, item.amountInRupees)}</Text>
        </View>

        {item.consultation && (
          <>
            <View style={styles.divider} />
            <View style={styles.patientSection}>
              <Icon name="person" size={20} color="#007AFF" style={styles.sectionIcon} />
              <View style={styles.sectionContent}>
                <Text style={styles.patientName}>{item.consultation.patientName}</Text>
                <Text style={styles.consultationLabel}>Patient</Text>
              </View>
            </View>
          </>
        )}

        <View style={styles.divider} />
        <View style={styles.paymentDetails}>
          <View style={styles.detailRow}>
            <Icon name="calendar-today" size={18} color="#FF9500" />
            <Text style={styles.detailText}>Created: {date} {time}</Text>
          </View>
          {paidDate && (
            <View style={styles.detailRow}>
              <Icon name="check-circle" size={18} color="#34C759" />
              <Text style={styles.detailText}>Paid: {paidDate.date} {paidDate.time}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#34C759" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[
            {key: 'all', label: 'All', count: allCount},
            {key: 'completed', label: 'Completed', count: completedCount},
            {key: 'pending', label: 'Pending', count: pendingCount},
            {key: 'failed', label: 'Failed', count: failedCount},
          ].map(filterOption => (
            <TouchableOpacity
              key={filterOption.key}
              style={[
                styles.filterButton,
                filter === filterOption.key && styles.filterButtonActive,
              ]}
              onPress={() => setFilter(filterOption.key as any)}>
              <Text
                style={[
                  styles.filterButtonText,
                  filter === filterOption.key && styles.filterButtonTextActive,
                ]}>
                {filterOption.label} ({filterOption.count})
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {filteredPayments.length === 0 ? (
        <View style={styles.centerContainer}>
          <Icon name="receipt-long" size={64} color="#8E8E93" />
          <Text style={styles.emptyText}>No orders found</Text>
          <Text style={styles.emptySubtext}>
            {filter === 'all'
              ? 'No payment orders have been created yet'
              : `No ${filter} orders found`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredPayments}
          renderItem={renderPayment}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  filterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
    backgroundColor: '#F5F5F5',
  },
  filterButtonActive: {
    backgroundColor: '#34C759',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  paymentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  cardTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  paymentMethod: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  amountSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#34C759',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  patientSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionIcon: {
    marginRight: 12,
  },
  sectionContent: {
    flex: 1,
  },
  patientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  consultationLabel: {
    fontSize: 12,
    color: '#666',
  },
  paymentDetails: {
    marginTop: 4,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
});

