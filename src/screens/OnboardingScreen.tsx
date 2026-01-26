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
import auth from '@react-native-firebase/auth';

const {width, height} = Dimensions.get('window');

interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
}

const customerSteps: OnboardingStep[] = [
  {
    id: 1,
    title: 'Welcome to HomeServices',
    description: 'Your trusted home services platform. Find verified service providers for plumbing, electrical work, carpentry, and more - all in one place.',
    icon: 'construct',
    iconColor: '#4A90E2',
  },
  {
    id: 2,
    title: 'Find Service Providers',
    description: 'Browse through our list of verified service providers. Search by service type, view ratings, experience, and service fees.',
    icon: 'search',
    iconColor: '#27AE60',
  },
  {
    id: 3,
    title: 'Request Services',
    description: 'Select a provider, choose an available time slot, and request your service. Pay securely through the app.',
    icon: 'calendar',
    iconColor: '#E67E22',
  },
  {
    id: 4,
    title: 'Track Your Service',
    description: 'Once requested, you can track your service in real-time, chat with your provider, and get updates directly in the app.',
    icon: 'chatbubbles',
    iconColor: '#9B59B6',
  },
  {
    id: 5,
    title: 'View Service History',
    description: 'Access all your service requests and history anytime. Keep track of your service records securely.',
    icon: 'document-text',
    iconColor: '#E74C3C',
  },
];

const providerSteps: OnboardingStep[] = [
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
    description: 'Set up your professional profile with qualifications, specialties, experience, and service fees. Your profile will be reviewed by our admin team.',
    icon: 'person',
    iconColor: '#27AE60',
  },
  {
    id: 3,
    title: 'Set Your Availability',
    description: 'Manage your schedule by setting available time slots. Customers can request services during these slots.',
    icon: 'time',
    iconColor: '#E67E22',
  },
  {
    id: 4,
    title: 'Manage Service Requests',
    description: 'View upcoming and past service requests. Chat with customers and provide service updates.',
    icon: 'calendar',
    iconColor: '#9B59B6',
  },
  {
    id: 5,
    title: 'Track Your Services',
    description: 'Manage all your service requests and track your service history. Customers can access their service records anytime.',
    icon: 'create',
    iconColor: '#E74C3C',
  },
];

interface OnboardingScreenProps {
  navigation: any;
  route: {
    params: {
      userRole: 'customer' | 'provider';
    };
  };
}

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({navigation, route}) => {
  const {userRole} = route.params;
  const {isDarkMode} = useStore();
  const theme = isDarkMode ? darkTheme : lightTheme;
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);

  const steps = userRole === 'customer' ? customerSteps : providerSteps;

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
      // Note: Onboarding completion is now handled by the backend API
      // The user will be redirected to the main screen

      // Navigate to appropriate main screen based on role
      if (userRole === 'customer') {
        navigation.replace('Main');
      } else if (userRole === 'provider') {
        // Navigate to provider main screen
        // Profile setup will be handled by the provider app
        navigation.replace('Main');
      }
    } catch (error) {
      // Navigate anyway to not block the user
      if (userRole === 'customer') {
        navigation.replace('Main');
      } else {
        navigation.replace('Main');
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
