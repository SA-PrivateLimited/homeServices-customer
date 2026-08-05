/**
 * API Client — JWT from backend session (phone + PIN / MongoDB).
 * Firebase is fully disabled on the customer critical path.
 */

import {API_BASE_URL, API_TIMEOUT} from '../../config/api';
import {forceLogoutExpiredSession, getStoredJwt} from '../session';

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

let handlingUnauthorized = false;

async function handleUnauthorized(): Promise<void> {
  if (handlingUnauthorized) return;
  handlingUnauthorized = true;
  try {
    await forceLogoutExpiredSession();
  } catch (e) {
    console.warn('[API] failed to logout after 401', e);
  } finally {
    setTimeout(() => {
      handlingUnauthorized = false;
    }, 1500);
  }
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await getStoredJwt();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

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

  let authToken: string | null = null;
  if (!skipAuth) {
    authToken = await getAuthToken();
    if (!authToken) {
      throw new Error('User not authenticated. Please login.');
    }
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };

  if (authToken && !skipAuth) {
    requestHeaders.Authorization = `Bearer ${authToken}`;
  }

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  if (__DEV__) {
    console.log('[API]', method, url);
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('Request timeout')), timeout);
  });

  const fetchPromise = fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  try {
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      let errorData: any = {};
      try {
        errorData = await response.json();
      } catch {
        errorData = {message: response.statusText};
      }

      if (response.status === 401 && !skipAuth && authToken) {
        void handleUnauthorized();
        throw new Error(
          errorData.message ||
            errorData.error ||
            'Session expired. Please sign in again.',
        );
      }

      throw new Error(
        errorData.message ||
          errorData.error ||
          `HTTP ${response.status}: ${response.statusText}`,
      );
    }

    const data: ApiResponse<T> = await response.json();

    if (!data.success) {
      throw new Error(data.message || data.error || 'API request failed');
    }

    return data.data as T;
  } catch (error: any) {
    if (error.message === 'Request timeout') {
      throw new Error(
        'Request timed out. Please check your connection and try again.',
      );
    }

    if (
      error.message?.includes('Failed to fetch') ||
      error.message?.includes('Network request failed')
    ) {
      if (__DEV__) {
        console.warn(
          '[API] Network request failed. URL was:',
          url,
          '| Original error:',
          error.message,
        );
      }
      throw new Error('Network error. Please check your internet connection.');
    }

    throw error;
  }
}

export async function apiGet<T>(
  endpoint: string,
  options?: Omit<RequestOptions, 'method' | 'body'>,
): Promise<T> {
  return apiRequest<T>(endpoint, {...options, method: 'GET'});
}

export async function apiPost<T>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method' | 'body'>,
): Promise<T> {
  return apiRequest<T>(endpoint, {...options, method: 'POST', body});
}

export async function apiPut<T>(
  endpoint: string,
  body?: any,
  options?: Omit<RequestOptions, 'method' | 'body'>,
): Promise<T> {
  return apiRequest<T>(endpoint, {...options, method: 'PUT', body});
}

export async function apiDelete<T>(
  endpoint: string,
  options?: Omit<RequestOptions, 'method' | 'body'>,
): Promise<T> {
  return apiRequest<T>(endpoint, {...options, method: 'DELETE'});
}
