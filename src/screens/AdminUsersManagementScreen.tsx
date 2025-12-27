import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import {useStore} from '../store';
import type {User, UserRole} from '../types/consultation';

interface UserWithRole extends User {
  role?: UserRole;
}

export default function AdminUsersManagementScreen({navigation}: any) {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<UserRole | 'all'>('all');
  const {currentUser} = useStore();

  useEffect(() => {
    // SECURITY: Verify current user is admin
    if (currentUser?.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can access this screen.');
      navigation.goBack();
      return;
    }

    const unsubscribe = firestore()
      .collection('users')
      .onSnapshot(
        snapshot => {
          const usersList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate(),
          })) as UserWithRole[];

          setUsers(usersList);
          setLoading(false);
        },
        error => {
          Alert.alert('Error', 'Failed to load users. Please try again.');
          setLoading(false);
        },
      );

    return () => unsubscribe();
  }, [currentUser, navigation]);

  const handleChangeUserRole = async (userId: string, currentRole: UserRole | undefined, newRole: UserRole) => {
    // SECURITY: Double-check admin access
    if (currentUser?.role !== 'admin') {
      Alert.alert('Access Denied', 'Only administrators can change user roles.');
      return;
    }

    // Prevent changing your own role (security measure)
    if (userId === currentUser?.id) {
      Alert.alert(
        'Cannot Change Own Role',
        'You cannot change your own role. Ask another admin to do it for you.',
      );
      return;
    }

    Alert.alert(
      'Change User Role',
      `Change user role from "${currentRole || 'Not set'}" to "${newRole}"?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Change',
          style: 'destructive',
          onPress: async () => {
            try {
              // Update user role
              await firestore().collection('users').doc(userId).update({
                role: newRole,
                updatedAt: firestore.FieldValue.serverTimestamp(),
                roleChangedBy: currentUser?.id,
                roleChangedAt: firestore.FieldValue.serverTimestamp(),
              });

              // Log the role change for audit
              await firestore().collection('roleChangeLogs').add({
                userId,
                oldRole: currentRole || 'none',
                newRole,
                changedBy: currentUser?.id,
                changedByName: currentUser?.name,
                changedAt: firestore.FieldValue.serverTimestamp(),
              });

              Alert.alert('Success', `User role changed to ${newRole} successfully.`);
            } catch (error) {
              Alert.alert('Error', 'Failed to change user role. Please try again.');
            }
          },
        },
      ],
    );
  };

  const getRoleColor = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return '#FF9500';
      case 'doctor':
        return '#34C759';
      case 'patient':
        return '#4A90E2';
      default:
        return '#8E8E93';
    }
  };

  const getRoleIcon = (role?: UserRole) => {
    switch (role) {
      case 'admin':
        return 'admin-panel-settings';
      case 'doctor':
        return 'medical-services';
      case 'patient':
        return 'person';
      default:
        return 'help-outline';
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone?.includes(searchQuery);

    const matchesRole = selectedRoleFilter === 'all' || user.role === selectedRoleFilter;

    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#FF9500" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>User Management</Text>
        <Text style={styles.headerSubtitle}>{users.length} total users</Text>
      </View>

      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <Icon name="search" size={20} color="#8E8E93" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#8E8E93"
          />
        </View>

        {/* Role Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
          {(['all', 'patient', 'doctor', 'admin'] as const).map(filter => (
            <TouchableOpacity
              key={filter}
              style={[
                styles.filterChip,
                selectedRoleFilter === filter && styles.filterChipActive,
              ]}
              onPress={() => setSelectedRoleFilter(filter)}>
              <Text
                style={[
                  styles.filterChipText,
                  selectedRoleFilter === filter && styles.filterChipTextActive,
                ]}>
                {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Users List */}
      <ScrollView style={styles.usersList}>
        {filteredUsers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No users found</Text>
          </View>
        ) : (
          filteredUsers.map(user => (
            <View key={user.id} style={styles.userCard}>
              <View style={styles.userInfo}>
                <View
                  style={[
                    styles.roleBadge,
                    {backgroundColor: getRoleColor(user.role) + '20'},
                  ]}>
                  <Icon
                    name={getRoleIcon(user.role)}
                    size={20}
                    color={getRoleColor(user.role)}
                  />
                </View>
                <View style={styles.userDetails}>
                  <Text style={styles.userName}>{user.name || 'No name'}</Text>
                  <Text style={styles.userEmail}>{user.email}</Text>
                  <Text style={styles.userPhone}>{user.phone || 'No phone'}</Text>
                  <View style={styles.roleContainer}>
                    <Text style={styles.roleLabel}>Role: </Text>
                    <Text
                      style={[
                        styles.roleValue,
                        {color: getRoleColor(user.role)},
                      ]}>
                      {user.role || 'Not set'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Change Role Dropdown */}
              <View style={styles.roleActions}>
                <Text style={styles.changeRoleLabel}>Change to:</Text>
                <View style={styles.roleButtons}>
                  {(['patient', 'doctor', 'admin'] as UserRole[]).map(role => (
                    <TouchableOpacity
                      key={role}
                      style={[
                        styles.roleButton,
                        user.role === role && styles.roleButtonActive,
                        {borderColor: getRoleColor(role)},
                      ]}
                      onPress={() => handleChangeUserRole(user.id, user.role, role)}
                      disabled={user.role === role || user.id === currentUser?.id}>
                      <Text
                        style={[
                          styles.roleButtonText,
                          {color: getRoleColor(role)},
                          user.role === role && styles.roleButtonTextActive,
                        ]}>
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  searchContainer: {
    backgroundColor: '#fff',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 10,
    marginBottom: 15,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: '#1a1a1a',
  },
  filterContainer: {
    marginTop: 5,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
  },
  filterChipActive: {
    backgroundColor: '#FF9500',
  },
  filterChipText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  usersList: {
    flex: 1,
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
    color: '#8E8E93',
  },
  userCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  roleBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  roleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  roleValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleActions: {
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingTop: 15,
  },
  changeRoleLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 10,
    fontWeight: '600',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  roleButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  roleButtonActive: {
    backgroundColor: '#f5f5f5',
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    opacity: 0.5,
  },
});

