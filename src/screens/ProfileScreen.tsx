import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';
import {lightTheme, darkTheme, commonStyles} from '../utils/theme';
import authService from '../services/authService';
import LogoutConfirmationModal from '../components/LogoutConfirmationModal';
import type {User} from '../types/consultation';

interface ProfileScreenProps {
  navigation: any;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({navigation}) => {
  const {isDarkMode, currentUser, setCurrentUser} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);
  const [name, setName] = useState(currentUser?.name || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [secondaryPhone, setSecondaryPhone] = useState(currentUser?.secondaryPhone || '');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [showSecondaryPhoneVerification, setShowSecondaryPhoneVerification] = useState(false);

  // Load customer profile from Firestore if not in store
  useEffect(() => {
    const loadCustomerProfile = async () => {
      const authUser = auth().currentUser;
      if (!authUser) {
        setProfileLoading(false);
        return;
      }

      // If currentUser is already loaded, use it
      if (currentUser && currentUser.id === authUser.uid) {
        setName(currentUser.name || '');
        setEmail(currentUser.email || authUser.email || '');
        setPhone(currentUser.phone || authUser.phoneNumber || '');
        setSecondaryPhone(currentUser.secondaryPhone || '');
        setDateOfBirth(
          currentUser.dateOfBirth?.toLocaleDateString() || '',
        );
        setGender(currentUser.gender || '');
        setBloodGroup(currentUser.bloodGroup || '');
        setProfileLoading(false);
        return;
      }

      // Otherwise, fetch from Firestore
      try {
        const userDoc = await firestore().collection('users').doc(authUser.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data() as User;
          const user: User = {
            id: userDoc.id,
            ...userData,
            createdAt: userData.createdAt?.toDate(),
            dateOfBirth: userData.dateOfBirth?.toDate(),
          };
          
          setName(user.name || authUser.displayName || '');
          setEmail(user.email || authUser.email || '');
          setPhone(user.phone || authUser.phoneNumber || '');
          setSecondaryPhone(user.secondaryPhone || '');
          setDateOfBirth(
            user.dateOfBirth?.toLocaleDateString() || '',
          );
          setGender(user.gender || '');
          setBloodGroup(user.bloodGroup || '');
          
          // Update store with fetched user
          await setCurrentUser(user);
        } else {
          // User document doesn't exist, use auth user data
          setName(authUser.displayName || '');
          setEmail(authUser.email || '');
          setPhone(authUser.phoneNumber || '');
        }
      } catch (error) {
        console.error('Error loading customer profile:', error);
        // Fallback to auth user data
        setName(authUser.displayName || '');
        setEmail(authUser.email || '');
        setPhone(authUser.phoneNumber || '');
      } finally {
        setProfileLoading(false);
      }
    };

    loadCustomerProfile();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name || '');
      setEmail(currentUser.email || '');
      setPhone(currentUser.phone || '');
      setSecondaryPhone(currentUser.secondaryPhone || '');
      setDateOfBirth(
        currentUser.dateOfBirth?.toLocaleDateString() || '',
      );
      setGender(currentUser.gender || '');
      setBloodGroup(currentUser.bloodGroup || '');
    }
  }, [currentUser]);

  const handleSaveProfile = async () => {
    const authUser = auth().currentUser;
    if (!authUser) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Error', 'Please enter your name');
      return;
    }

    // Check if user logged in with phone number
    // If phoneVerified is true and user has phoneNumber in Firebase Auth, phone cannot be changed
    const loggedInWithPhone = authUser.phoneNumber && currentUser?.phoneVerified;

    setLoading(true);
    try {
      const userId = currentUser?.id || authUser.uid;
      const updates: any = {
        name,
        email: email || authUser.email || '',
        gender,
        bloodGroup,
      };

      // Only update phone if user didn't log in with phone
      // Primary phone from phone login is verified and cannot be changed
      if (!loggedInWithPhone && phone) {
        updates.phone = phone || authUser.phoneNumber || '';
        // If phone changed, mark as unverified (user needs to verify new number)
        if (phone !== currentUser?.phone) {
          updates.phoneVerified = false;
        }
      }

      const updatedUser = await authService.updateUserProfile(
        userId,
        updates,
      );
      await setCurrentUser(updatedUser);
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error: any) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const [showLogoutModal, setShowLogoutModal] = React.useState(false);

  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const handleConfirmLogout = async () => {
    setShowLogoutModal(false);
    try {
      await authService.logout();
      await setCurrentUser(null);
      // Navigate to Login screen
      navigation.reset({
        index: 0,
        routes: [{name: 'Login'}],
      });
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleChangeRole = () => {
    // SECURITY: Users cannot change their own role
    // Only admins can change user roles via Admin Panel
    Alert.alert(
      'Role Change Restricted',
      'You cannot change your own role. Please contact an administrator if you need to change your role.',
      [{text: 'OK'}],
    );
  };

  if (profileLoading) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {backgroundColor: theme.background},
        ]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.notLoggedInText, {color: theme.textSecondary, marginTop: 20}]}>
          Loading profile...
        </Text>
      </View>
    );
  }

  const authUser = auth().currentUser;
  if (!authUser && !currentUser) {
    return (
      <View
        style={[
          styles.container,
          styles.centerContent,
          {backgroundColor: theme.background},
        ]}>
        <Icon name="person-circle-outline" size={80} color={theme.textSecondary} />
        <Text style={[styles.notLoggedInText, {color: theme.textSecondary}]}>
          Please login to view your profile
        </Text>
        <TouchableOpacity
          style={[styles.button, {backgroundColor: theme.primary}]}
          onPress={() => navigation.navigate('Login')}>
          <Text style={styles.buttonText}>Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, {backgroundColor: theme.background}]}
      contentContainerStyle={styles.scrollContent}>
      {/* Header */}
      <View style={styles.header}>
        <View
          style={[styles.avatarContainer, {backgroundColor: theme.primary}]}>
          <Text style={styles.avatarText}>
            {name && name.trim() ? name.charAt(0).toUpperCase() : (authUser?.displayName?.charAt(0) || authUser?.email?.charAt(0) || 'U')}
          </Text>
        </View>
        <Text style={[styles.userName, {color: theme.text}]}>
          {name || authUser?.displayName || authUser?.email || 'User'}
        </Text>
        <Text style={[styles.userEmail, {color: theme.textSecondary}]}>
          {email || authUser?.email || 'Not available'}
        </Text>
      </View>

      {/* Profile Info */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, {color: theme.text}]}>
            Personal Information
          </Text>
          <TouchableOpacity
            onPress={() => setIsEditing(!isEditing)}
            disabled={loading}>
            <Icon
              name={isEditing ? 'close' : 'create-outline'}
              size={24}
              color={theme.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Name */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="person-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              Full Name
            </Text>
          </View>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>{name}</Text>
          )}
        </View>

        {/* Email */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="mail-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              Email
            </Text>
          </View>
          <Text style={[styles.infoValue, {color: theme.textSecondary}]}>
            {email}
          </Text>
        </View>

        {/* Primary Phone - Not editable if logged in with phone */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="call-outline" size={20} color={theme.textSecondary} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={[styles.labelText, {color: theme.textSecondary}]}>
                Primary Phone
              </Text>
              {currentUser?.phoneVerified && (
                <Icon name="checkmark-circle" size={16} color="#4CAF50" />
              )}
            </View>
          </View>
          <View style={{flex: 1, alignItems: 'flex-end'}}>
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 6}}>
              <Text style={[styles.infoValue, {color: phone ? theme.text : theme.textSecondary}]}>
                {phone || 'Not set'}
              </Text>
              {(() => {
                const currentAuthUser = auth().currentUser;
                const loggedInWithPhone = currentAuthUser?.phoneNumber && currentUser?.phoneVerified;
                if (loggedInWithPhone) {
                  return <Icon name="lock-closed" size={16} color={theme.textSecondary} />;
                }
                return null;
              })()}
            </View>
            {currentUser?.phoneVerified && (
              <Text style={[styles.verifiedBadge, {color: '#4CAF50'}]}>
                Verified {(() => {
                  const currentAuthUser = auth().currentUser;
                  const loggedInWithPhone = currentAuthUser?.phoneNumber && currentUser?.phoneVerified;
                  return loggedInWithPhone ? '(Cannot be changed)' : '';
                })()}
              </Text>
            )}
            {!currentUser?.phoneVerified && phone && (
              <Text style={[styles.verifiedBadge, {color: theme.textSecondary}]}>
                Not Verified
              </Text>
            )}
          </View>
        </View>

        {/* Secondary Phone */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="call-outline" size={20} color={theme.textSecondary} />
            <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
              <Text style={[styles.labelText, {color: theme.textSecondary}]}>
                Secondary Phone
              </Text>
              {currentUser?.secondaryPhoneVerified && (
                <Icon name="checkmark-circle" size={16} color="#4CAF50" />
              )}
            </View>
          </View>
          {isEditing ? (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              {secondaryPhone ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 8}}>
                  <Text style={[styles.infoValue, {color: theme.text}]}>
                    {secondaryPhone}
                  </Text>
                  {currentUser?.secondaryPhoneVerified ? (
                    <Icon name="checkmark-circle" size={20} color="#4CAF50" />
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        // Navigate to secondary phone verification
                        navigation.navigate('PhoneVerification', {
                          mode: 'secondary',
                          phoneNumber: secondaryPhone,
                        });
                      }}
                      style={{padding: 4}}>
                      <Text style={[styles.verifyLink, {color: theme.primary}]}>
                        Verify
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    onPress={async () => {
                      try {
                        setLoading(true);
                        await authService.removeSecondaryPhone();
                        setSecondaryPhone('');
                        const updatedUser = await authService.getCurrentUser();
                        if (updatedUser) {
                          await setCurrentUser(updatedUser);
                        }
                        Alert.alert('Success', 'Secondary phone removed');
                      } catch (error: any) {
                        Alert.alert('Error', error.message);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    style={{padding: 4}}>
                    <Icon name="trash-outline" size={20} color="#ff4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => {
                    // Navigate to add secondary phone
                    navigation.navigate('PhoneVerification', {
                      mode: 'secondary',
                    });
                  }}
                  style={[styles.addButton, {borderColor: theme.primary}]}>
                  <Icon name="add-circle-outline" size={20} color={theme.primary} />
                  <Text style={[styles.addButtonText, {color: theme.primary}]}>
                    Add Secondary Phone
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={{flex: 1, alignItems: 'flex-end'}}>
              {secondaryPhone ? (
                <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                  <Text style={[styles.infoValue, {color: theme.text}]}>
                    {secondaryPhone}
                  </Text>
                  {currentUser?.secondaryPhoneVerified ? (
                    <>
                      <Icon name="checkmark-circle" size={16} color="#4CAF50" />
                      <Text style={[styles.verifiedBadge, {color: '#4CAF50'}]}>
                        Verified
                      </Text>
                    </>
                  ) : (
                    <Text style={[styles.verifiedBadge, {color: theme.textSecondary}]}>
                      Not Verified
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.infoValue, {color: theme.textSecondary}]}>
                  Not set
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Gender */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="male-female-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              Gender
            </Text>
          </View>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              value={gender}
              onChangeText={setGender}
              placeholder="Male/Female/Other"
              placeholderTextColor={theme.textSecondary}
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>
              {gender || 'Not set'}
            </Text>
          )}
        </View>

        {/* Blood Group */}
        <View style={styles.infoRow}>
          <View style={styles.infoLabel}>
            <Icon name="water-outline" size={20} color={theme.textSecondary} />
            <Text style={[styles.labelText, {color: theme.textSecondary}]}>
              Blood Group
            </Text>
          </View>
          {isEditing ? (
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.text,
                  backgroundColor: theme.card,
                  borderColor: theme.border,
                },
              ]}
              value={bloodGroup}
              onChangeText={setBloodGroup}
              placeholder="A+, B+, O+, etc."
              placeholderTextColor={theme.textSecondary}
              editable={!loading}
            />
          ) : (
            <Text style={[styles.infoValue, {color: theme.text}]}>
              {bloodGroup || 'Not set'}
            </Text>
          )}
        </View>

        {/* Save Button */}
        {isEditing && (
          <TouchableOpacity
            style={[
              styles.button,
              {backgroundColor: theme.primary},
              loading && styles.buttonDisabled,
            ]}
            onPress={handleSaveProfile}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, {color: theme.text}]}>
          Account
        </Text>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={handleChangeRole}>
          <Icon name="swap-horizontal-outline" size={20} color={theme.primary} />
          <Text style={[styles.actionButtonText, {color: theme.primary}]}>
            Change Role {currentUser.role && `(Current: ${currentUser.role})`}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, {backgroundColor: theme.card}]}
          onPress={handleLogout}>
          <Icon name="log-out-outline" size={20} color="#ff4444" />
          <Text style={[styles.actionButtonText, {color: '#ff4444'}]}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>

      {/* Version Info */}
      <Text style={[styles.versionText, {color: theme.textSecondary}]}>
        Version 1.0.0
      </Text>
      
      <LogoutConfirmationModal
        visible={showLogoutModal}
        onConfirm={handleConfirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 14,
  },
  section: {
    marginBottom: 30,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  infoRow: {
    marginBottom: 20,
  },
  infoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  labelText: {
    fontSize: 14,
    marginLeft: 8,
  },
  infoValue: {
    fontSize: 16,
    marginLeft: 28,
  },
  input: {
    height: 40,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    marginLeft: 28,
  },
  button: {
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  actionButtonText: {
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  notLoggedInText: {
    fontSize: 16,
    marginTop: 20,
    marginBottom: 30,
    textAlign: 'center',
  },
  versionText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
});

export default ProfileScreen;
