import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Doctor,
  User,
  Consultation,
  ChatMessage,
  Prescription,
} from '../types/consultation';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'consultation' | 'prescription' | 'reminder' | 'system';
  consultationId?: string;
  prescriptionId?: string;
  userId: string; // User ID who should receive this notification (customerId or providerId)
  read: boolean;
  createdAt: Date;
}

interface AppState {
  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;

  // Language
  language: 'en' | 'hi';
  setLanguage: (language: 'en' | 'hi') => Promise<void>;

  // Loading states
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Location & Pincode
  currentPincode: string | null;
  setCurrentPincode: (pincode: string | null) => void;

  // Consultation - User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Redirect after login
  redirectAfterLogin: {route: string; params?: any} | null;
  setRedirectAfterLogin: (redirect: {route: string; params?: any} | null) => void;

  // Consultation - Doctors
  doctors: Doctor[];
  setDoctors: (doctors: Doctor[]) => void;

  // Consultation - Consultations
  consultations: Consultation[];
  setConsultations: (consultations: Consultation[]) => void;
  addConsultation: (consultation: Consultation) => void;
  updateConsultation: (id: string, updates: Partial<Consultation>) => void;
  activeConsultation: Consultation | null;
  setActiveConsultation: (consultation: Consultation | null) => void;

  // Consultation - Chat
  chatMessages: {[consultationId: string]: ChatMessage[]};
  setChatMessages: (consultationId: string, messages: ChatMessage[]) => void;
  addChatMessage: (consultationId: string, message: ChatMessage) => void;

  // Consultation - Prescriptions
  prescriptions: Prescription[];
  setPrescriptions: (prescriptions: Prescription[]) => void;
  addPrescription: (prescription: Prescription) => void;

  // Notifications
  notifications: AppNotification[];
  addNotification: (notification: AppNotification) => void;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: (userId?: string) => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: (userId?: string) => void;
  getUnreadCount: (userId?: string) => number;
  getUserNotifications: (userId: string) => AppNotification[];

  // Hydration
  hydrate: () => Promise<void>;
}

export const useStore = create<AppState>((set, get) => ({
  isDarkMode: false,
  isLoading: false,
  language: 'en',

  // Consultation initial state
  currentUser: null,
  redirectAfterLogin: null,
  doctors: [],
  consultations: [],
  activeConsultation: null,
  chatMessages: {},
  prescriptions: [],
  notifications: [],
  currentPincode: null,

  toggleTheme: async () => {
    const newTheme = !get().isDarkMode;
    set({isDarkMode: newTheme});
    await AsyncStorage.setItem('theme', JSON.stringify(newTheme));
  },

  setLanguage: async (language: 'en' | 'hi') => {
    set({language});
    await AsyncStorage.setItem('language', language);
    // Change i18n language
    const {changeLanguage} = await import('../i18n');
    await changeLanguage(language);
  },

  setIsLoading: (loading: boolean) => set({isLoading: loading}),

  // Location & Pincode
  setCurrentPincode: (pincode: string | null) => set({currentPincode: pincode}),

  // Consultation actions
  setCurrentUser: async (user: User | null) => {
    set({currentUser: user});
    if (user) {
      await AsyncStorage.setItem('currentUser', JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem('currentUser');
    }
  },

  setRedirectAfterLogin: (redirect: {route: string; params?: any} | null) => {
    set({redirectAfterLogin: redirect});
  },

  setDoctors: async (doctors: Doctor[]) => {
    set({doctors});
    await AsyncStorage.setItem('doctors', JSON.stringify(doctors));
    await AsyncStorage.setItem('doctorsCachedAt', new Date().toISOString());
  },

  setConsultations: async (consultations: Consultation[]) => {
    set({consultations});
    await AsyncStorage.setItem('consultations', JSON.stringify(consultations));
  },

  addConsultation: async (consultation: Consultation) => {
    const consultations = [...get().consultations, consultation];
    set({consultations});
    await AsyncStorage.setItem('consultations', JSON.stringify(consultations));
  },

  updateConsultation: async (id: string, updates: Partial<Consultation>) => {
    const consultations = get().consultations.map(c =>
      c.id === id ? {...c, ...updates} : c,
    );
    set({consultations});
    await AsyncStorage.setItem('consultations', JSON.stringify(consultations));
  },

  setActiveConsultation: (consultation: Consultation | null) => {
    set({activeConsultation: consultation});
  },

  setChatMessages: (consultationId: string, messages: ChatMessage[]) => {
    set({
      chatMessages: {
        ...get().chatMessages,
        [consultationId]: messages,
      },
    });
  },

  addChatMessage: (consultationId: string, message: ChatMessage) => {
    const existingMessages = get().chatMessages[consultationId] || [];
    set({
      chatMessages: {
        ...get().chatMessages,
        [consultationId]: [...existingMessages, message],
      },
    });
  },

  setPrescriptions: async (prescriptions: Prescription[]) => {
    set({prescriptions});
    await AsyncStorage.setItem('prescriptions', JSON.stringify(prescriptions));
  },

  addPrescription: async (prescription: Prescription) => {
    const prescriptions = [...get().prescriptions, prescription];
    set({prescriptions});
    await AsyncStorage.setItem('prescriptions', JSON.stringify(prescriptions));
  },

  // Notification actions
  addNotification: async (notification: AppNotification) => {
    const notifications = [notification, ...get().notifications].slice(0, 100); // Keep last 100
    set({notifications});
    await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
  },

  markNotificationAsRead: async (id: string) => {
    const notifications = get().notifications.map(n =>
      n.id === id ? {...n, read: true} : n,
    );
    set({notifications});
    await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
  },

  markAllNotificationsAsRead: async (userId?: string) => {
    const notifications = get().notifications.map(n => {
      if (userId && n.userId !== userId) return n;
      return {...n, read: true};
    });
    set({notifications});
    await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
  },

  deleteNotification: async (id: string) => {
    const notifications = get().notifications.filter(n => n.id !== id);
    set({notifications});
    await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
  },

  clearAllNotifications: async (userId?: string) => {
    if (userId) {
      const notifications = get().notifications.filter(n => n.userId !== userId);
      set({notifications});
      await AsyncStorage.setItem('notifications', JSON.stringify(notifications));
    } else {
      set({notifications: []});
      await AsyncStorage.removeItem('notifications');
    }
  },

  getUnreadCount: (userId?: string) => {
    const notifications = userId 
      ? get().notifications.filter(n => n.userId === userId)
      : get().notifications;
    return notifications.filter(n => !n.read).length;
  },

  getUserNotifications: (userId: string) => {
    return get().notifications
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  },

  hydrate: async () => {
    try {
      const [
        theme,
        language,
        currentUser,
        doctors,
        consultations,
        prescriptions,
        notifications,
      ] = await Promise.all([
        AsyncStorage.getItem('theme'),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('currentUser'),
        AsyncStorage.getItem('doctors'),
        AsyncStorage.getItem('consultations'),
        AsyncStorage.getItem('prescriptions'),
        AsyncStorage.getItem('notifications'),
      ]);

      const storedLanguage = (language || 'en') as 'en' | 'hi';
      
      // Initialize i18n with stored language
      const {changeLanguage} = await import('../i18n');
      await changeLanguage(storedLanguage);

      set({
        isDarkMode: theme ? JSON.parse(theme) : false,
        language: storedLanguage,
        currentUser: currentUser ? JSON.parse(currentUser) : null,
        doctors: doctors ? JSON.parse(doctors) : [],
        consultations: consultations ? JSON.parse(consultations) : [],
        prescriptions: prescriptions ? JSON.parse(prescriptions) : [],
        notifications: notifications ? JSON.parse(notifications).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        })) : [],
      });
    } catch (error) {
    }
  },
}));
