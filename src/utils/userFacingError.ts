/**
 * Map API/network errors to user-facing copy. Never show HTTP jargon.
 */

import i18n from '../i18n';

export type ErrorContext = 'login' | 'otp' | 'pin' | 'browse' | 'generic';

export type ConnectionFailureKind = 'send' | 'load' | 'refresh';

export function isConnectionFailure(error: unknown): boolean {
  const raw =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  return /failed to fetch|networkerror|network request failed|load failed|network error|\binternet\b|\boffline\b|econnrefused|timed out|timeout/i.test(
    raw,
  );
}

export function connectionFailureMessage(
  kind: ConnectionFailureKind = 'load',
): string {
  if (kind === 'send') {
    return translate(
      'errors.couldNotSend',
      "Couldn't send. Try again.",
    );
  }
  if (kind === 'refresh') {
    return translate(
      'errors.couldNotRefresh',
      "Couldn't refresh. Try again.",
    );
  }
  return translate('errors.couldNotLoad', "Couldn't load. Try again.");
}

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
    'api request failed',
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
  if (/^http \d{3}/i.test(text)) return true;
  if (/request failed \(\d{3}\)/i.test(text)) return true;
  if (
    /\b(axios|graphql|apollo|mongodb|mongoose|aws|s3|jwt|econnrefused|enotfound)\b/i.test(
      text,
    )
  ) {
    return true;
  }
  return false;
}

function statusFromMessage(raw: string): number | undefined {
  const match = raw.match(/\bHTTP\s+(\d{3})\b/i) || raw.match(/^(\d{3})\b/);
  if (!match) return undefined;
  return Number(match[1]);
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
  const rawMessage =
    error instanceof Error
      ? normalizeText(error.message)
      : typeof error === 'string'
        ? normalizeText(error)
        : '';
  const status = statusFromMessage(rawMessage);

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

  if (
    context === 'pin' ||
    /verification pin|invalid pin|does not match/i.test(rawMessage)
  ) {
    if (rawMessage && !isTechnicalErrorText(rawMessage)) {
      if (/does not match|invalid pin/i.test(rawMessage)) {
        return translate('errors.invalidPin', 'Invalid PIN. Please try again.');
      }
      return rawMessage;
    }
    return translate('errors.invalidPin', 'Invalid PIN. Please try again.');
  }

  const lang = (i18n.language || 'en').startsWith('hi') ? 'hi' : 'en';
  if (rawMessage && !isTechnicalErrorText(rawMessage) && lang === 'en') {
    return rawMessage;
  }

  return descriptionFromStatus(status);
}
