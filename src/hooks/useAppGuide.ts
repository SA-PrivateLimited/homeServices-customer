import {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import {GuideStep} from '../components/GuideTooltip';

const GUIDE_STORAGE_KEY = '@homeservices_guide_completed';

interface UseAppGuideReturn {
  showGuide: boolean;
  currentStep: number;
  currentGuideStep: GuideStep | null;
  totalSteps: number;
  nextStep: () => void;
  previousStep: () => void;
  skipGuide: () => void;
  startGuide: () => void;
}

export const useAppGuide = (
  screenName: string,
  steps: GuideStep[],
  userRole?: 'patient' | 'doctor' | 'admin'
): UseAppGuideReturn => {
  const [showGuide, setShowGuide] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    checkIfShouldShowGuide();
  }, [screenName, userRole]);

  const checkIfShouldShowGuide = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser || !userRole) return;

      // Check in Firestore first
      const userDoc = await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .get();

      if (userDoc.exists) {
        const userData = userDoc.data();
        const hasCompletedGuide = userData?.hasCompletedGuide?.[screenName];

        if (!hasCompletedGuide) {
          setShowGuide(true);
          setCurrentStep(0);
        }
      } else {
        // Fallback to AsyncStorage
        const completed = await AsyncStorage.getItem(
          `${GUIDE_STORAGE_KEY}_${screenName}_${currentUser.uid}`
        );

        if (!completed) {
          setShowGuide(true);
          setCurrentStep(0);
        }
      }
    } catch (error) {
    }
  };

  const markGuideAsCompleted = async () => {
    try {
      const currentUser = auth().currentUser;
      if (!currentUser) return;

      // Save to Firestore
      await firestore()
        .collection('users')
        .doc(currentUser.uid)
        .set(
          {
            hasCompletedGuide: {
              [screenName]: true,
            },
          },
          {merge: true}
        );

      // Also save to AsyncStorage as backup
      await AsyncStorage.setItem(
        `${GUIDE_STORAGE_KEY}_${screenName}_${currentUser.uid}`,
        'true'
      );
    } catch (error) {
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Last step, complete the guide
      completeGuide();
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipGuide = async () => {
    setShowGuide(false);
    await markGuideAsCompleted();
  };

  const completeGuide = async () => {
    setShowGuide(false);
    await markGuideAsCompleted();
  };

  const startGuide = () => {
    setCurrentStep(0);
    setShowGuide(true);
  };

  return {
    showGuide,
    currentStep,
    currentGuideStep: steps[currentStep] || null,
    totalSteps: steps.length,
    nextStep,
    previousStep,
    skipGuide,
    startGuide,
  };
};
