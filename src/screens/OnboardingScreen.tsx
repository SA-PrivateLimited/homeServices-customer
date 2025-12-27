import React, {useState, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import {useStore} from '../store';
import {lightTheme, darkTheme} from '../utils/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

const {width, height} = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
}

const patientSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to HomeServices',
    description: 'Your trusted home services platform. Find verified service providers for plumbing, electrical work, carpentry, and more - all in one place.',
    icon: 'construct',
    iconColor: '#4A90E2',
  },
  {
    id: 2,
    title: 'Find Doctors',
    description: 'Browse through our list of verified doctors. Search by specialty, view ratings, experience, and consultation fees.',
    icon: 'search',
    iconColor: '#27AE60',
  },
  {
    id: 3,
    title: 'Book Consultations',
    description: 'Select a doctor, choose an available time slot, and book your consultation. Pay securely through the app.',
    icon: 'calendar',
    iconColor: '#E67E22',
  },
  {
    id: 4,
    title: 'Chat with Doctors',
    description: 'Once booked, you can chat with your doctor, share medical reports, and get prescriptions directly in the app.',
    icon: 'chatbubbles',
    iconColor: '#9B59B6',
  },
  {
    id: 5,
    title: 'View Prescriptions',
    description: 'Access all your prescriptions and consultation history anytime. Keep track of your health records securely.',
    icon: 'document-text',
    iconColor: '#E74C3C',
  },
];

const doctorSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome Service Provider',
    description: 'Thank you for joining HomeServices. Let us guide you through setting up your profile and managing service requests.',
    icon: 'construct',
    iconColor: '#4A90E2',
  },
  {
    id: 2,
    title: 'Complete Your Profile',
    description: 'Set up your professional profile with qualifications, specialties, experience, and consultation fees. Your profile will be reviewed by our admin team.',
    icon: 'person',
    iconColor: '#27AE60',
  },
  {
    id: 3,
    title: 'Set Your Availability',
    description: 'Manage your schedule by setting available time slots. Patients can book consultations during these slots.',
    icon: 'time',
    iconColor: '#E67E22',
  },
  {
    id: 4,
    title: 'Manage Appointments',
    description: 'View upcoming and past appointments. Chat with patients, share prescriptions, and provide medical advice.',
    icon: 'calendar',
    iconColor: '#9B59B6',
  },
  {
    id: 5,
    title: 'Create Prescriptions',
    description: 'Write digital prescriptions for your patients. They can access them anytime from their consultation history.',
    icon: 'create',
    iconColor: '#E74C3C',
  },
];

interface OnboardingScreenProps {
  navigation: any;
  route: {
    params: {
      userRole: 'patient' | 'doctor';
    };
  };
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({navigation, route}) => {
  const {userRole} = route.params;
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const steps = userRole === 'patient' ? patientSteps : doctorSteps;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({
        x: nextStep * width,
        animated: true,
      });
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      setCurrentStep(prevStep);
      scrollViewRef.current?.scrollTo({
        x: prevStep * width,
        animated: true,
      });
    }
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleComplete = async () => {
    try {
      const currentUser = auth().currentUser;
      if (currentUser) {
        await firestore()
          .collection('users')
          .doc(currentUser.uid)
          .update({
            hasCompletedOnboarding: true,
          });
      }

      // Navigate to appropriate main screen based on role
      if (userRole === 'patient') {
        navigation.replace('Main');
      } else if (userRole === 'doctor') {
        // Check if doctor has completed profile setup
        const doctorProfile = await firestore()
          .collection('providers')
          .where('email', '==', currentUser?.email)
          .get();

        if (doctorProfile.empty) {
          navigation.replace('DoctorProfileSetup');
        } else {
          navigation.replace('DoctorMain');
        }
      }
    } catch (error) {
      // Navigate anyway to not block the user
      if (userRole === 'patient') {
        navigation.replace('Main');
      } else {
        navigation.replace('DoctorMain');
      }
    }
  };

  const handleScroll = (event: any) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentStep(slideIndex);
  };

  return (
    <View style={[styles.container, {backgroundColor: theme.background}]}>
      {/* Skip button */}
      <TouchableOpacity
        style={styles.skipButton}
        onPress={handleSkip}>
        <Text style={[styles.skipText, {color: theme.primary}]}>Skip</Text>
      </TouchableOpacity>

      {/* Scrollable steps */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}>
        {steps.map((step, index) => (
          <View key={step.id} style={[styles.stepContainer, {width}]}>
            <View style={styles.stepContent}>
              {/* Icon */}
              <View style={[styles.iconContainer, {backgroundColor: step.iconColor + '20'}]}>
                <Icon name={step.icon} size={80} color={step.iconColor} />
              </View>

              {/* Title */}
              <Text style={[styles.title, {color: theme.text}]}>
                {step.title}
              </Text>

              {/* Description */}
              <Text style={[styles.description, {color: theme.textSecondary}]}>
                {step.description}
              </Text>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Pagination dots */}
      <View style={styles.pagination}>
        {steps.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: currentStep === index ? theme.primary : theme.border,
                width: currentStep === index ? 24 : 8,
              },
            ]}
          />
        ))}
      </View>

      {/* Navigation buttons */}
      <View style={styles.navigationContainer}>
        {currentStep > 0 && (
          <TouchableOpacity
            style={[styles.navButton, {backgroundColor: theme.card, borderColor: theme.border}]}
            onPress={handlePrevious}>
            <Icon name="arrow-back" size={24} color={theme.text} />
            <Text style={[styles.navButtonText, {color: theme.text}]}>Previous</Text>
          </TouchableOpacity>
        )}

        {currentStep === 0 && <View style={styles.navButton} />}

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton, {backgroundColor: theme.primary}]}
          onPress={handleNext}>
          <Text style={[styles.navButtonText, {color: '#fff'}]}>
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Icon
            name={currentStep === steps.length - 1 ? 'checkmark' : 'arrow-forward'}
            size={24}
            color="#fff"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  skipButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  stepContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  stepContent: {
    alignItems: 'center',
    maxWidth: 400,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    transition: 'all 0.3s ease',
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 15,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  nextButton: {
    borderWidth: 0,
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default OnboardingScreen;
