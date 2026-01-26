import {create} from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {User} from '../services/api/usersApi';
import type {ServiceRequest} from '../services/api/serviceRequestsApi';
import {changeLanguage} from '../i18n';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'consultation' | 'reminder' | 'system';
  consultationId?: string;
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

  // User
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;

  // Redirect after login
  redirectAfterLogin: {route: string; params?: any} | null;
  setRedirectAfterLogin: (redirect: {route: string; params?: any} | null) => void;

  // Service Requests
  serviceRequests: ServiceRequest[];
  setServiceRequests: (serviceRequests: ServiceRequest[]) => void;
  addServiceRequest: (serviceRequest: ServiceRequest) => void;
  updateServiceRequest: (id: string, updates: Partial<ServiceRequest>) => void;
  activeServiceRequest: ServiceRequest | null;
  setActiveServiceRequest: (serviceRequest: ServiceRequest | null) => void;

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

  // Service Request initial state
  currentUser: null,
  redirectAfterLogin: null,
  serviceRequests: [],
  activeServiceRequest: null,
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
    await changeLanguage(language);
  },

  setIsLoading: (loading: boolean) => set({isLoading: loading}),

  // Location & Pincode
  setCurrentPincode: (pincode: string | null) => set({currentPincode: pincode}),

  // Service Request actions
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

  setServiceRequests: async (serviceRequests: ServiceRequest[]) => {
    set({serviceRequests});
    await AsyncStorage.setItem('serviceRequests', JSON.stringify(serviceRequests));
  },

  addServiceRequest: async (serviceRequest: ServiceRequest) => {
    const serviceRequests = [...get().serviceRequests, serviceRequest];
    set({serviceRequests});
    await AsyncStorage.setItem('serviceRequests', JSON.stringify(serviceRequests));
  },

  updateServiceRequest: async (id: string, updates: Partial<ServiceRequest>) => {
    const serviceRequests = get().serviceRequests.map(sr =>
      (sr.id === id || sr._id === id) ? {...sr, ...updates} : sr,
    );
    set({serviceRequests});
    await AsyncStorage.setItem('serviceRequests', JSON.stringify(serviceRequests));
  },

  setActiveServiceRequest: (serviceRequest: ServiceRequest | null) => {
    set({activeServiceRequest: serviceRequest});
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
        serviceRequests,
        notifications,
      ] = await Promise.all([
        AsyncStorage.getItem('theme'),
        AsyncStorage.getItem('language'),
        AsyncStorage.getItem('currentUser'),
        AsyncStorage.getItem('serviceRequests'),
        AsyncStorage.getItem('notifications'),
      ]);

      const storedLanguage = (language || 'en') as 'en' | 'hi';
      
      // Initialize i18n with stored language
      await changeLanguage(storedLanguage);

      set({
        isDarkMode: theme ? JSON.parse(theme) : false,
        language: storedLanguage,
        currentUser: currentUser ? JSON.parse(currentUser) : null,
        serviceRequests: serviceRequests ? JSON.parse(serviceRequests) : [],
        notifications: notifications ? JSON.parse(notifications).map((n: any) => ({
          ...n,
          createdAt: new Date(n.createdAt),
        })) : [],
      });
    } catch (error) {
    }
  },
}));
