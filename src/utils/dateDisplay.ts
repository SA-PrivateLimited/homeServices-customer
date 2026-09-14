export const JOB_DISPLAY_TIME_ZONE = 'Asia/Kolkata';

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

function localeTag(lang?: string): string {
  return lang?.startsWith('hi') ? 'hi-IN' : 'en-IN';
}

/** Date-only strings stay calendar days. Instants keep a real timestamp. */
export function parseDisplayDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  const dateOnly = DATE_ONLY.exec(String(date).trim());
  if (dateOnly) {
    return new Date(
      Number(dateOnly[1]),
      Number(dateOnly[2]) - 1,
      Number(dateOnly[3]),
    );
  }
  return new Date(date);
}

function formatParts(date: Date, locale: string, timeZone?: string): string {
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...(timeZone ? {timeZone} : {}),
  });
}

/**
 * Job / request dates: date-only as that calendar day; timestamps in Asia/Kolkata.
 */
export function formatJobCalendarDate(
  date?: string | Date | null,
  lang?: string,
  fallback = '',
): string {
  if (!date) return fallback;
  const locale = localeTag(lang);
  if (typeof date === 'string') {
    const dateOnly = DATE_ONLY.exec(date.trim());
    if (dateOnly) {
      const local = new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3]),
      );
      if (Number.isNaN(local.getTime())) return fallback;
      return formatParts(local, locale);
    }
  }
  const d = parseDisplayDate(date);
  if (Number.isNaN(d.getTime())) return fallback;
  return formatParts(d, locale, JOB_DISPLAY_TIME_ZONE);
}

/** Customer-facing "5 Sep 2026 · 11:02 PM" for request timestamps. */
export function formatJobDateTime(
  date?: string | Date | null,
  lang?: string,
  fallback = '',
): string {
  if (!date) return fallback;
  if (typeof date === 'string' && DATE_ONLY.test(date.trim())) {
    return formatJobCalendarDate(date, lang, fallback);
  }
  const d = parseDisplayDate(date);
  if (Number.isNaN(d.getTime())) return fallback;
  const locale = localeTag(lang);
  try {
    const day = d.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: JOB_DISPLAY_TIME_ZONE,
    });
    const time = d.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: JOB_DISPLAY_TIME_ZONE,
    });
    return `${day} · ${time}`;
  } catch {
    return formatJobCalendarDate(date, lang, fallback);
  }
}
