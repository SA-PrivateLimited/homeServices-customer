import {apiPost} from './apiClient';

export type FeedbackSource =
  | 'partner_login'
  | 'partner_app'
  | 'customer_login'
  | 'customer_app'
  | 'other';

export async function submitFeedback(input: {
  message: string;
  phone?: string;
  source?: FeedbackSource;
  app?: 'partner' | 'customer' | 'unknown';
}): Promise<{id: string}> {
  const data = await apiPost<{id: string; status: string}>(
    '/feedback',
    {
      message: input.message,
      phone: input.phone || '',
      source: input.source || 'other',
      app: input.app || 'customer',
    },
    {skipAuth: true},
  );
  return {id: String(data?.id || '')};
}
