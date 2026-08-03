import {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {GuideStep} from '../components/GuideTooltip';
import {getStoredJwt, readStoredUser} from '../services/session';

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
  userRole?: 'patient' | 'doctor' | 'admin',
): UseAppGuideReturn => {
  const [showGuide, setShowGuide] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    checkIfShouldShowGuide();
  }, [screenName, userRole]);

  const getGuideKey = async (): Promise<string | null> => {
    const user = await readStoredUser();
    const userId = user?.id || user?._id;
    if (!userId) return null;
    return `${GUIDE_STORAGE_KEY}_${screenName}_${userId}`;
  };

  const checkIfShouldShowGuide = async () => {
    try {
      if (!(await getStoredJwt()) || !userRole) return;
      const key = await getGuideKey();
      if (!key) return;
      const completed = await AsyncStorage.getItem(key);
      if (!completed) {
        setShowGuide(true);
        setCurrentStep(0);
      }
    } catch {
      // ignore
    }
  };

  const markGuideAsCompleted = async () => {
    try {
      const key = await getGuideKey();
      if (!key) return;
      await AsyncStorage.setItem(key, 'true');
    } catch {
      // ignore
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
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
