/**
 * Address Service
 * Manages saved addresses (home, office, etc.) for users
 */

import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import type {UserLocation} from '../types/common';

export interface SavedAddress extends UserLocation {
  id?: string;
  label: 'home' | 'office' | 'other';
  customLabel?: string; // For 'other' type
  isDefault?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTIONS = {
  USERS: 'users',
  SAVED_ADDRESSES: 'savedAddresses',
};

/**
 * Helper function to clean address data (remove undefined/null values)
 */
const cleanAddressData = (data: any): any => {
  const cleaned: any = {};
  Object.keys(data).forEach(key => {
    const value = data[key];
    // Only include non-undefined, non-null values (except for boolean false and number 0)
    if (value !== undefined && value !== null && value !== '') {
      cleaned[key] = value;
    }
  });
  return cleaned;
};

/**
 * Get all saved addresses for current user
 */
export const getSavedAddresses = async (): Promise<SavedAddress[]> => {
  try {
    const user = auth().currentUser;
    if (!user) {
      console.warn('⚠️ [ADDRESS] No authenticated user');
      return [];
    }

    console.log('📋 [ADDRESS] Fetching saved addresses for user:', user.uid);

    // Ensure user document exists before querying subcollection
    // This is REQUIRED - Firestore subcollection queries need the parent document to exist and be readable
    try {
      const userDocRef = firestore().collection(COLLECTIONS.USERS).doc(user.uid);
      const userDoc = await userDocRef.get();
      
      if (!userDoc.exists) {
        console.log('📝 [ADDRESS] User document does not exist, creating it...');
        // Create minimal user document if it doesn't exist
        // Use set() instead of merge to ensure document is created
        await userDocRef.set({
          uid: user.uid,
          email: user.email || null,
          phoneNumber: user.phoneNumber || null,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        console.log('✅ [ADDRESS] User document created');
        
        // Wait a moment for the document to be fully committed
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        console.log('✅ [ADDRESS] User document exists');
      }
    } catch (userDocError: any) {
      console.error('❌ [ADDRESS] Error checking/creating user document:', {
        code: userDocError.code,
        message: userDocError.message,
        error: userDocError,
      });
      
      // If we can't create the user document, the subcollection query will fail
      // Return empty array instead of continuing
      if (userDocError.code === 'permission-denied') {
        console.error('❌ [ADDRESS] Permission denied when creating user document');
        return [];
      }
    }

    // Query saved addresses - try simple query first to avoid index issues
    let snapshot;
    try {
      // Try simple query first (no orderBy) to avoid permission/index issues
      snapshot = await firestore()
        .collection(COLLECTIONS.USERS)
        .doc(user.uid)
        .collection(COLLECTIONS.SAVED_ADDRESSES)
        .get();
      
      console.log(`✅ [ADDRESS] Fetched ${snapshot.docs.length} addresses without orderBy`);
    } catch (queryError: any) {
      console.error('❌ [ADDRESS] Query failed:', {
        code: queryError.code,
        message: queryError.message,
      });
      
      // If query fails completely, return empty array
      if (queryError.code === 'permission-denied') {
        console.error('❌ [ADDRESS] Permission denied - check Firestore rules');
        console.error('💡 [ADDRESS] Ensure user is authenticated and rules allow reading savedAddresses');
        console.error('💡 [ADDRESS] User UID:', user.uid);
      }
      
      return [];
    }

    const addresses = snapshot.docs.map(doc => {
      const data = doc.data();
      const cleanedData = cleanAddressData({
        id: doc.id,
        ...data,
        createdAt: data?.createdAt?.toDate(),
        updatedAt: data?.updatedAt?.toDate(),
      });
      return cleanedData as SavedAddress;
    });

    // Sort manually if we couldn't use orderBy
    if (addresses.length > 0 && addresses[0].createdAt) {
      addresses.sort((a, b) => {
        const aTime = a.createdAt?.getTime() || 0;
        const bTime = b.createdAt?.getTime() || 0;
        return bTime - aTime; // Descending order
      });
    }

    console.log(`✅ [ADDRESS] Fetched ${addresses.length} saved addresses`);
    return addresses;
  } catch (error: any) {
    console.error('❌ [ADDRESS] Error fetching saved addresses:', {
      code: error.code,
      message: error.message,
      error,
    });
    
    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

/**
 * Save a new address
 */
export const saveAddress = async (address: Omit<SavedAddress, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');

    // If this is set as default, unset other defaults
    if (address.isDefault) {
      await unsetOtherDefaults(user.uid);
    }

    // Remove undefined values before saving
    const addressData: any = {
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    // Only include fields that are not undefined
    Object.keys(address).forEach(key => {
      const value = (address as any)[key];
      if (value !== undefined) {
        addressData[key] = value;
      }
    });

    const addressRef = firestore()
      .collection(COLLECTIONS.USERS)
      .doc(user.uid)
      .collection(COLLECTIONS.SAVED_ADDRESSES)
      .doc();

    await addressRef.set(addressData);

    return addressRef.id;
  } catch (error: any) {
    console.error('Error saving address:', error);
    throw new Error(error.message || 'Failed to save address');
  }
};

/**
 * Update an existing address
 * If the address doesn't exist, it will be created instead
 */
export const updateAddress = async (
  addressId: string,
  updates: Partial<SavedAddress>,
): Promise<void> => {
  try {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');

    const addressRef = firestore()
      .collection(COLLECTIONS.USERS)
      .doc(user.uid)
      .collection(COLLECTIONS.SAVED_ADDRESSES)
      .doc(addressId);

    // Check if document exists
    const docSnapshot = await addressRef.get();
    
    // Remove undefined values before updating/creating
    const updateData: any = {
      updatedAt: firestore.FieldValue.serverTimestamp(),
    };

    // Only include fields that are not undefined
    Object.keys(updates).forEach(key => {
      const value = (updates as any)[key];
      if (value !== undefined) {
        updateData[key] = value;
      }
    });

    if (docSnapshot.exists) {
      // Document exists - update it
      // If this is set as default, unset other defaults
      if (updates.isDefault) {
        await unsetOtherDefaults(user.uid, addressId);
      }
      await addressRef.update(updateData);
    } else {
      // Document doesn't exist - create it
      // If this is set as default, unset other defaults
      if (updates.isDefault) {
        await unsetOtherDefaults(user.uid, addressId);
      }
      await addressRef.set({
        ...updateData,
        createdAt: firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
    }
  } catch (error: any) {
    console.error('Error updating address:', error);
    throw new Error(error.message || 'Failed to update address');
  }
};

/**
 * Delete an address
 */
export const deleteAddress = async (addressId: string): Promise<void> => {
  try {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');

    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(user.uid)
      .collection(COLLECTIONS.SAVED_ADDRESSES)
      .doc(addressId)
      .delete();
  } catch (error: any) {
    console.error('Error deleting address:', error);
    throw new Error(error.message || 'Failed to delete address');
  }
};

/**
 * Set an address as default
 */
export const setDefaultAddress = async (addressId: string): Promise<void> => {
  try {
    const user = auth().currentUser;
    if (!user) throw new Error('User not authenticated');

    // Unset other defaults
    await unsetOtherDefaults(user.uid, addressId);

    // Set this as default
    await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(user.uid)
      .collection(COLLECTIONS.SAVED_ADDRESSES)
      .doc(addressId)
      .update({
        isDefault: true,
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
  } catch (error: any) {
    console.error('Error setting default address:', error);
    throw new Error(error.message || 'Failed to set default address');
  }
};

/**
 * Helper: Unset default flag from other addresses
 */
const unsetOtherDefaults = async (userId: string, excludeId?: string): Promise<void> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(userId)
      .collection(COLLECTIONS.SAVED_ADDRESSES)
      .where('isDefault', '==', true)
      .get();

    const batch = firestore().batch();
    snapshot.docs.forEach(doc => {
      if (doc.id !== excludeId) {
        batch.update(doc.ref, {
          isDefault: false,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
      }
    });

    if (!snapshot.empty) {
      await batch.commit();
    }
  } catch (error) {
    console.error('Error unsetting defaults:', error);
  }
};

/**
 * Get default address
 */
export const getDefaultAddress = async (): Promise<SavedAddress | null> => {
  try {
    const user = auth().currentUser;
    if (!user) return null;

    const snapshot = await firestore()
      .collection(COLLECTIONS.USERS)
      .doc(user.uid)
      .collection(COLLECTIONS.SAVED_ADDRESSES)
      .where('isDefault', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    } as SavedAddress;
  } catch (error) {
    console.error('Error fetching default address:', error);
    return null;
  }
};

