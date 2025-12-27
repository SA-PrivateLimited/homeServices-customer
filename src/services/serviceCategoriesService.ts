/**
 * Service Categories Service
 * Manages service types/categories for home services
 */

import firestore from '@react-native-firebase/firestore';

export interface ServiceCategory {
  id: string;
  name: string;
  icon: string; // Material icon name
  color: string; // Hex color code
  description?: string;
  isActive: boolean;
  order: number; // Display order
  createdAt?: Date;
  updatedAt?: Date;
}

const COLLECTIONS = {
  SERVICE_CATEGORIES: 'serviceCategories',
};

/**
 * Default service categories for home services
 */
export const DEFAULT_SERVICE_CATEGORIES: Omit<ServiceCategory, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Plumber',
    icon: 'plumbing',
    color: '#3498db',
    description: 'Plumbing repairs and installations',
    isActive: true,
    order: 1,
  },
  {
    name: 'Electrician',
    icon: 'electrical-services',
    color: '#f39c12',
    description: 'Electrical repairs and installations',
    isActive: true,
    order: 2,
  },
  {
    name: 'Carpenter',
    icon: 'carpenter',
    color: '#95a5a6',
    description: 'Carpentry and woodwork',
    isActive: true,
    order: 3,
  },
  {
    name: 'AC Repair',
    icon: 'ac-unit',
    color: '#1abc9c',
    description: 'Air conditioning repair and service',
    isActive: true,
    order: 4,
  },
  {
    name: 'Appliance Repair',
    icon: 'kitchen',
    color: '#9b59b6',
    description: 'Home appliance repairs',
    isActive: true,
    order: 5,
  },
  {
    name: 'Painter',
    icon: 'format-paint',
    color: '#e74c3c',
    description: 'Painting services',
    isActive: true,
    order: 6,
  },
  {
    name: 'Cleaning Service',
    icon: 'cleaning-services',
    color: '#16a085',
    description: 'Home and office cleaning',
    isActive: true,
    order: 7,
  },
  {
    name: 'Pest Control',
    icon: 'bug-report',
    color: '#c0392b',
    description: 'Pest control and extermination',
    isActive: true,
    order: 8,
  },
  {
    name: 'Mason',
    icon: 'construction',
    color: '#7f8c8d',
    description: 'Masonry and construction work',
    isActive: true,
    order: 9,
  },
  {
    name: 'Welder',
    icon: 'build',
    color: '#34495e',
    description: 'Welding services',
    isActive: true,
    order: 10,
  },
];

/**
 * Fetch all active service categories
 */
export const fetchServiceCategories = async (): Promise<ServiceCategory[]> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.SERVICE_CATEGORIES)
      .where('isActive', '==', true)
      .orderBy('order', 'asc')
      .get();

    if (snapshot.empty) {
      // If no categories exist, return defaults
      return DEFAULT_SERVICE_CATEGORIES.map((cat, index) => ({
        ...cat,
        id: `default_${index}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    }

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    })) as ServiceCategory[];
  } catch (error) {
    console.error('Error fetching service categories:', error);
    // Return defaults on error
    return DEFAULT_SERVICE_CATEGORIES.map((cat, index) => ({
      ...cat,
      id: `default_${index}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
};

/**
 * Initialize service categories in Firestore (Admin only)
 */
export const initializeServiceCategories = async (): Promise<void> => {
  try {
    const batch = firestore().batch();
    
    DEFAULT_SERVICE_CATEGORIES.forEach((category, index) => {
      const docRef = firestore()
        .collection(COLLECTIONS.SERVICE_CATEGORIES)
        .doc();
      
      batch.set(docRef, {
        ...category,
        createdAt: firestore.FieldValue.serverTimestamp(),
        updatedAt: firestore.FieldValue.serverTimestamp(),
      });
    });

    await batch.commit();
    console.log('Service categories initialized successfully');
  } catch (error) {
    console.error('Error initializing service categories:', error);
    throw new Error('Failed to initialize service categories');
  }
};

/**
 * Get service category by name
 */
export const getServiceCategoryByName = async (
  name: string,
): Promise<ServiceCategory | null> => {
  try {
    const snapshot = await firestore()
      .collection(COLLECTIONS.SERVICE_CATEGORIES)
      .where('name', '==', name)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Check defaults
      const defaultCat = DEFAULT_SERVICE_CATEGORIES.find(cat => cat.name === name);
      if (defaultCat) {
        return {
          ...defaultCat,
          id: `default_${DEFAULT_SERVICE_CATEGORIES.indexOf(defaultCat)}`,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data()?.createdAt?.toDate(),
      updatedAt: doc.data()?.updatedAt?.toDate(),
    } as ServiceCategory;
  } catch (error) {
    console.error('Error fetching service category:', error);
    return null;
  }
};

