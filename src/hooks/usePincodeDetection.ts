import {useEffect, useState} from 'react';
import {useStore} from '../store';
import GeolocationService, {LocationData} from '../services/geolocationService';
import {getStoredJwt} from '../services/session';
import {usersApi} from '../services/api/usersApi';

/**
 * Detect / refresh customer pincode via Mongo profile + device location.
 */
export const usePincodeDetection = () => {
  const {setCurrentPincode, currentPincode, currentUser} = useStore();
  const [isDetecting, setIsDetecting] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout | null = null;

    const detectPincode = async () => {
      try {
        const jwt = await getStoredJwt();
        if (!jwt || !isMounted) {
          return;
        }

        setIsDetecting(true);
        timeoutId = setTimeout(() => {
          if (isMounted) setIsDetecting(false);
        }, 20000);

        const saved =
          currentUser?.location?.pincode ||
          (await usersApi.getMe())?.location?.pincode;

        if (saved && isMounted) {
          setCurrentPincode(saved);
          if (timeoutId) clearTimeout(timeoutId);
          setIsDetecting(false);
          return;
        }

        const permissionStatus =
          await GeolocationService.checkLocationPermission();

        if (
          permissionStatus === 'denied' ||
          permissionStatus === 'never_ask_again'
        ) {
          setIsDetecting(false);
          return;
        }

        if (permissionStatus === 'not_determined') {
          const requestResult =
            await GeolocationService.requestLocationPermission();
          if (requestResult !== 'granted') {
            setIsDetecting(false);
            return;
          }
        }

        try {
          const finalPermissionCheck =
            await GeolocationService.checkLocationPermission();
          if (finalPermissionCheck !== 'granted') {
            if (isMounted) setIsDetecting(false);
            return;
          }

          const locationPromise = GeolocationService.getCurrentLocation();
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Location detection timeout')),
              15000,
            ),
          );

          const location = (await Promise.race([
            locationPromise,
            timeoutPromise,
          ])) as LocationData;

          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }

          if (location?.pincode && isMounted) {
            setCurrentPincode(location.pincode);
            try {
              await usersApi.updateMe({
                location: {
                  latitude: location.latitude,
                  longitude: location.longitude,
                  pincode: location.pincode,
                  address: location.address,
                  city: location.city,
                  state: location.state,
                },
              });
            } catch {
              // non-blocking
            }
          }
        } catch {
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
        }
      } catch {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
        if (isMounted) setIsDetecting(false);
      }
    };

    const boot = async () => {
      const jwt = await getStoredJwt();
      if (!currentPincode && jwt && !hasAttempted) {
        setHasAttempted(true);
        detectPincode();
      } else {
        setIsDetecting(false);
      }
    };

    void boot();

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [currentPincode, setCurrentPincode, currentUser, hasAttempted]);

  return {
    currentPincode,
    isDetecting,
    refreshPincode: async () => {
      setCurrentPincode(null);
    },
  };
};
