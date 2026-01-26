/**
 * Service Categories API Service
 * Handles service category operations via backend API
 */

import {apiGet} from './apiClient';

export interface QuestionnaireQuestion {
  id: string;
  question: string;
  questionHi?: string;
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean';
  options?: string[];
  optionsHi?: string[];
  required: boolean;
  placeholder?: string;
  placeholderHi?: string;
}

export interface ServiceCategory {
  _id?: string;
  id?: string;
  name: string;
  description?: string;
  descriptionHi?: string;
  icon?: string;
  color?: string;
  order?: number;
  isActive?: boolean;
  requiresVehicle?: boolean;
  questionnaire?: QuestionnaireQuestion[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
  _migratedAt?: string | Date;
  _migratedFrom?: string;
}

/**
 * Get all service categories
 */
export async function getServiceCategories(): Promise<ServiceCategory[]> {
  try {
    const response = await apiGet<{data: ServiceCategory[]; count: number}>('/serviceCategories');
    if (Array.isArray(response)) {
      return response;
    }
    return (response as any).data || [];
  } catch (error) {
    console.error('Error fetching service categories:', error);
    throw error;
  }
}

/**
 * Get service category by ID
 */
export async function getServiceCategoryById(categoryId: string): Promise<ServiceCategory | null> {
  try {
    return await apiGet<ServiceCategory>(`/serviceCategories/${categoryId}`);
  } catch (error: any) {
    if (error.message?.includes('not found') || error.message?.includes('404')) {
      return null;
    }
    throw error;
  }
}

export const serviceCategoriesApi = {
  getAll: getServiceCategories,
  getById: getServiceCategoryById,
};
