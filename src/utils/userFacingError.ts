/**
 * Map API/network errors to user-facing copy. Never show HTTP jargon.
 */

import i18n from '../i18n';
import {ApiError} from '../services/api/apiClient';
import {
  ACTIVE_SERVICE_REQUEST_EXISTS,
  activeRequestCopy,
} from './activeRequestUx';

export type ErrorContext =
  | 'login'
  | 'otp'
  | 'lookup'
  | 'upload'
  | 'profile'
  | 'browse'
  | 'request'
  | 'generic';

const TECHNICAL_EXACT = new Set(
  [
    'forbidden',
    'unauthorized',
    'unauthorized access',
    'bad request',
    'not found',
    'internal server error',
    'network error',
    'axioserror',
    'conflict',
    'too many requests',
    'request failed',
  ].map(s => s.toLowerCase()),
);

function translate(key: string, fallback: string): string {
  const value = i18n.t(key);
  return value === key ? fallback : String(value);
}

function normalizeText(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

export function isTechnicalErrorText(raw: string): boolean {
  const text = normalizeText(raw);
  if (!text) return true;
  const lower = text.toLowerCase();
  if (TECHNICAL_EXACT.has(lower)) return true;
  if (/^\d{3}\b/.test(text)) return true;
  if (/request failed \(\d{3}\)/i.test(text)) return true;
  if (/upload failed \(\d{3}\)/i.test(text)) return true;
  if (
    /\b(axios|graphql|apollo|mongodb|mongoose|aws|s3|jwt|econnrefused|enotfound)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

function descriptionFromStatus(status?: number): string {
  if (status === 401) {
    return translate(
      'errors.sessionExpired',
      'Your session has expired. Please sign in again.',
    );
  }
  if (status === 403) {
    return translate(
      'errors.forbidden',
      "You don't have permission to do that.",
    );
  }
  if (status === 404) {
    return translate('errors.notFound', "We couldn't find that.");
  }
  if (status === 409) {
    return translate(
      'errors.conflict',
      'This action could not be completed. Please try again.',
    );
  }
  if (status === 429) {
    return translate(
      'errors.tooManyAttempts',
      'Too many attempts. Please wait and try again.',
    );
  }
  if (status && status >= 500) {
    return translate(
      'errors.serverError',
      'Something went wrong on our side. Please try again in a moment.',
    );
  }
  return translate('errors.generic', 'Something went wrong. Please try again.');
}

export function getUserFacingErrorMessage(
  error: unknown,
  context: ErrorContext = 'generic',
): string {
  const status = error instanceof ApiError ? error.status : undefined;
  const code = error instanceof ApiError ? error.code : undefined;
  const rawMessage =
    error instanceof Error
      ? normalizeText(error.message)
      : typeof error === 'string'
        ? normalizeText(error)
        : '';

  if (
    code === ACTIVE_SERVICE_REQUEST_EXISTS ||
    (status === 409 && /active request/i.test(rawMessage))
  ) {
    const data =
      error instanceof ApiError && error.data && typeof error.data === 'object'
        ? (error.data as {serviceType?: string; status?: string})
        : {serviceType: '', status: ''};
    return activeRequestCopy(i18n.t.bind(i18n), {
      serviceType: data.serviceType || '',
      status: data.status || '',
    }).message;
  }

  if (/timeout|timed out|aborted/i.test(rawMessage)) {
    return translate(
      'errors.timeout',
      'The request is taking too long. Please try again.',
    );
  }

  if (
    /failed to fetch|network request failed|network error|internet|offline/i.test(
      rawMessage,
    )
  ) {
    return translate(
      'errors.network',
      'We could not connect. Please check your internet connection and try again.',
    );
  }

  if (context === 'upload' && /upload|storage|image/i.test(rawMessage)) {
    if (!isTechnicalErrorText(rawMessage)) {
      return rawMessage;
    }
    return translate(
      'errors.uploadFailed',
      'Could not upload the photo. Please try again.',
    );
  }

  const lang = (i18n.language || 'en').startsWith('hi') ? 'hi' : 'en';
  if (rawMessage && !isTechnicalErrorText(rawMessage) && lang === 'en') {
    return rawMessage;
  }

  if (context === 'profile') {
    return translate(
      'errors.unableToSaveProfile',
      'Could not save profile. Please try again.',
    );
  }
  if (context === 'upload') {
    return translate(
      'errors.uploadFailed',
      'Could not upload the photo. Please try again.',
    );
  }

  return descriptionFromStatus(status);
}
