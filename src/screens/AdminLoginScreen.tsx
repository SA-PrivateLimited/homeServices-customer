import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {useStore} from '../store';

export default function AdminLoginScreen({navigation}: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const {setCurrentUser} = useStore();

  const handleLogin = async () => {
    setError('');

    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    try {
      // Authenticate with Firebase
      const userCredential = await auth().signInWithEmailAndPassword(email, password);

      // Get user data from Firestore
      const userDoc = await firestore()
        .collection('users')
        .doc(userCredential.user.uid)
        .get();

      let userData: any = {
        id: userCredential.user.uid,
        email: userCredential.user.email || email,
        name: userCredential.user.displayName || 'Admin',
        phone: userCredential.user.phoneNumber || '',
        role: 'admin' as const,
      };

      if (userDoc.exists) {
        userData = {
          ...userData,
          ...userDoc.data(),
          role: userDoc.data()?.role || 'admin',
        };
      } else {
        // Create admin user document if it doesn't exist
        await firestore()
          .collection('users')
          .doc(userCredential.user.uid)
          .set({
            ...userData,
            createdAt: firestore.FieldValue.serverTimestamp(),
          }, {merge: true});
      }

      await setCurrentUser(userData);

      // Navigate to AdminMain
      navigation.replace('AdminMain');
    } catch (firebaseError: any) {

      // Provide helpful error messages
      let errorMessage = 'Login failed. Please try again.';

      if (firebaseError.code === 'auth/user-not-found') {
        errorMessage = 'User not found. Please create an admin account in Firebase Console.';
      } else if (firebaseError.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (firebaseError.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email format.';
      } else if (firebaseError.message) {
        errorMessage = firebaseError.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>MediAdmin</Text>
      <Text style={styles.subtitle}>Admin Portal</Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
    color: '#666',
  },
  errorText: {
    backgroundColor: '#ffebee',
    color: '#c62828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#ef9a9a',
  },
  input: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
