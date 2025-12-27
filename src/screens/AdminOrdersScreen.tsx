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
import firebaseApp from '@react-native-firebase/app';

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
    doctorName: string;
    doctorSpecialization?: string;
    scheduledTime?: any;
  };
}

// Helper function to check if Firebase is initialized
const isFirebaseInitialized = (): boolean => {
  try {
    firebaseApp.app();
    return true;
  } catch (error) {
    return false;
  }
};

interface AdminOrdersScreenProps {
  navigation?: any;
}

export default function AdminOrdersScreen({navigation}: AdminOrdersScreenProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'failed'>('all');
  const [firebaseError, setFirebaseError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!isFirebaseInitialized()) {
      setFirebaseError(true);
      setErrorMessage('Firebase not initialized. Please check your Firebase configuration.');
      setLoading(false);
      return;
    }

    try {
      const unsubscribe = firestore()
        .collection('payments')
        .orderBy('createdAt', 'desc')
        .onSnapshot(
          async snapshot => {
            
            // Fetch consultation details for each payment
            const paymentsWithConsultations = await Promise.all(
              snapshot.docs.map(async doc => {
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
                      doctorName: consultationData?.doctorName || 'Unknown',
                      doctorSpecialization: consultationData?.doctorSpecialization,
                      scheduledTime: consultationData?.scheduledTime,
                    };
                  }
                } catch (error) {
                }

                return payment;
              })
            );

            setPayments(paymentsWithConsultations);
            setLoading(false);
            setFirebaseError(false);
          },
          error => {
            setFirebaseError(true);
            if (error.code === 'permission-denied') {
              setErrorMessage('Permission Denied: Please update Firestore rules to allow admin access to payments.');
            } else {
              setErrorMessage(`Error: ${error.message || 'Failed to fetch payments'}`);
            }
            setLoading(false);
          },
        );

      return () => unsubscribe();
    } catch (error: any) {
      setFirebaseError(true);
      setErrorMessage(error.message || 'An error occurred while fetching payments');
      setLoading(false);
    }
  }, []);

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

            <View style={styles.divider} />
            <View style={styles.doctorSection}>
              <Icon name="medical-services" size={18} color="#34C759" style={styles.sectionIcon} />
              <View style={styles.sectionContent}>
                <Text style={styles.doctorName}>Dr. {item.consultation.doctorName}</Text>
                {item.consultation.doctorSpecialization && (
                  <Text style={styles.specialty}>{item.consultation.doctorSpecialization}</Text>
                )}
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
          {item.razorpayPaymentId && (
            <View style={styles.detailRow}>
              <Icon name="receipt" size={18} color="#007AFF" />
              <Text style={styles.detailText}>Payment ID: {item.razorpayPaymentId.substring(0, 20)}...</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
      </View>
    );
  }

  if (firebaseError) {
    return (
      <View style={styles.centerContainer}>
        <Icon name="error-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorText}>Error Loading Orders</Text>
        <Text style={styles.errorSubtext}>
          {errorMessage || 'Please check your Firebase configuration'}
        </Text>
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
    backgroundColor: '#FF9500',
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
  doctorSection: {
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
  doctorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  specialty: {
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
  errorText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FF3B30',
    marginTop: 16,
  },
  errorSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
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

