/**
 * API Client
 * Base client for making HTTP requests to the backend API
 * Handles authentication, error handling, and request formatting
 */

import auth from '@react-native-firebase/auth';
import {API_BASE_URL, API_TIMEOUT} from '../../config/api';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number;
  skipAuth?: boolean;
}

/**
 * Get Firebase Auth token for API requests
 */
async function getAuthToken(): Promise<string | null> {
  try {
    const user = auth().currentUser;
    if (!user) {
      return null;
    }
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

/**
 * Make API request with authentication
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const {
    method = 'GET',
    body,
    headers = {},
    timeout = API_TIMEOUT,
    skipAuth = false,
  } = options;

  // Get auth token unless skipping auth
  let authToken: string | null = null;
  if (!skipAuth) {
    authToken = await getAuthToken();
    if (!authToken) {
      throw new Error('User not authenticated. Please login.');
    }
  }

  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (authToken && !skipAuth) {
    requestHeaders['Authorization'] = `Bearer ${authToken}`;
  }

  // Build URL
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  // Create timeout promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeout);
  });

  // Create fetch promise
  const fetchPromise = fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  try {
    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    // Check if response is ok
    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        // If JSON parsing fails, use status text
        errorData = {message: response.statusText};
      }

      throw new Error(
        errorData.message || errorData.error || `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    // Parse response
    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.message || data.error || 'API request failed');
    }

    return data.data as T;
  } catch (error: any) {
    // Handle network errors
    if (error.message === 'Request timeout') {
      throw new Error('Request timed out. Please check your connection and try again.');
    }

    if (error.message?.includes('Failed to fetch') || error.message?.includes('Network request failed')) {
      throw new Error('Network error. Please check your internet connection.');
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * GET request helper
 */
export async function apiGet<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
  return apiRequest<T>(endpoint, {...options, method: 'GET'});
}

/**
 * POST request helper
 */
export async function apiPost<T>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method' | 'body'>,
): Promise<T> {
  return apiRequest<T>(endpoint, {...options, method: 'POST', body});
}

/**
 * PUT request helper
 */
export async function apiPut<T>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method' | 'body'>,
): Promise<T> {
  return apiRequest<T>(endpoint, {...options, method: 'PUT', body});
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(
  endpoint: string,
  options?: Omit<RequestOptions, 'method' | 'body'>,
): Promise<T> {
  return apiRequest<T>(endpoint, {...options, method: 'DELETE'});
}
