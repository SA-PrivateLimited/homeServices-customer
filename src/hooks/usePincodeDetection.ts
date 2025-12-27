import {useEffect, useState} from 'react';
import {useStore} from '../store';
import GeolocationService, {LocationData} from '../services/geolocationService';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

/**
 * Hook to detect and update pincode for current user (doctor or patient)
 * This will:
 * 1. Try to get pincode from user's saved location in Firestore
 * 2. If not available, detect current location and extract pincode
 * 3. Update the store with the pincode
 */
export const usePincodeDetection = () => {
  const {setCurrentPincode, currentPincode} = useStore();
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const detectPincode = async () => {
      try {
        const currentUser = auth().currentUser;
        if (!currentUser || !isMounted) {
          return;
        }

        setIsDetecting(true);

        // Set a maximum timeout for the entire detection process
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setIsDetecting(false);
          }
        }, 20000); // 20 second max timeout

        // First, try to get pincode from user's saved location (with timeout)
        const userDocPromise = firestore()
          .collection('users')
          .doc(currentUser.uid)
          .get();
        
        const userDocTimeout = new Promise((resolve) => 
          setTimeout(() => resolve(null), 5000)
        );
        
        const userDoc = await Promise.race([userDocPromise, userDocTimeout]) as any;

        if (userDoc?.exists) {
          const userData = userDoc.data();
          const savedPincode = userData?.location?.pincode;

          if (savedPincode && isMounted) {
            setCurrentPincode(savedPincode);
            if (timeoutId) clearTimeout(timeoutId);
            setIsDetecting(false);
            return;
          }
        }

        // Check permission status first (don't request if already denied)
        const permissionStatus = await GeolocationService.checkLocationPermission();
        
        // If permission was denied or "never ask again", skip automatic detection
        if (permissionStatus === 'denied' || permissionStatus === 'never_ask_again') {
          setIsDetecting(false);
          return;
        }

        // If permission not determined, request it once
        if (permissionStatus === 'not_determined') {
          const requestResult = await GeolocationService.requestLocationPermission();
          if (requestResult !== 'granted') {
            setIsDetecting(false);
            return;
          }
        }

        // Permission is granted, proceed with location detection
        try {
          // Double-check permission before proceeding (extra safety check)
          const finalPermissionCheck = await GeolocationService.checkLocationPermission();
          if (finalPermissionCheck !== 'granted') {
            if (isMounted) {
              setIsDetecting(false);
            }
            return;
          }

          // Wrap in Promise.race with timeout to prevent hanging
          const locationPromise = GeolocationService.getCurrentLocation();
          const timeoutPromise = new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error('Location detection timeout')), 15000)
          );

          const location = await Promise.race([locationPromise, timeoutPromise]) as LocationData;
          
          // Clear the overall timeout if location detection succeeded
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          if (location?.pincode && isMounted) {
            setCurrentPincode(location.pincode);

            // Optionally save to user's profile
            try {
              await firestore()
                .collection('users')
                .doc(currentUser.uid)
                .set(
                  {
                    location: {
                      latitude: location.latitude,
                      longitude: location.longitude,
                      pincode: location.pincode,
                      address: location.address,
                      city: location.city,
                      state: location.state,
                      country: location.country,
                    },
                    updatedAt: firestore.FieldValue.serverTimestamp(),
                  },
                  {merge: true},
                );
            } catch (saveError) {
            }
          }
        } catch (locationError: any) {
          // Handle location errors gracefully (common on emulators or when Google Play Services fails)
          const errorMessage = locationError?.message || String(locationError) || '';
          
          // Clear timeout on error
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          // Don't crash the app - just log and continue
          // The pincode will remain null, and user can set it manually
          // Suppress error logging to prevent console spam - location is optional
          if (errorMessage.includes('RNFusedLocation') || 
              errorMessage.includes('FusedLocationProviderClient') ||
              errorMessage.includes('Could not invoke') ||
              errorMessage.includes('emulator') ||
              errorMessage.includes('Google Play Services') ||
              (errorMessage.includes('interface') && errorMessage.includes('class was expected')) ||
              errorMessage.includes('unavailable') ||
              errorMessage.includes('timeout') ||
              errorMessage.includes('permission') ||
              errorMessage.includes('denied')) {
            // Location is optional - app continues normally
            if (__DEV__) {
            }
          } else if (__DEV__) {
          }
        }
      } catch (error) {
        // Clear timeout on any error
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } finally {
        // Always clear timeout and reset loading state
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (isMounted) {
          setIsDetecting(false);
        }
      }
    };

    // Only detect once if pincode is not already set and user is logged in
    if (!currentPincode && auth().currentUser && !hasAttempted) {
      setHasAttempted(true);
      detectPincode();
    } else {
      // If pincode already set, no user, or already attempted, ensure loading is false
      if (currentPincode || !auth().currentUser || hasAttempted) {
        setIsDetecting(false);
      }
    }

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [currentPincode, setCurrentPincode]);

  return {
    currentPincode,
    isDetecting,
    refreshPincode: async () => {
      setCurrentPincode(null);
      // Trigger detection again by clearing pincode
    },
  };
};


