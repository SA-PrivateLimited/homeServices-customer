import {apiGet, apiPost} from './apiClient';
import {isUsableMediaUrl} from '../../utils/mediaUrl';

export type GreetingState = 'LAUNCH' | 'NORMAL';
export type GreetingCloseMode = 'GLOBAL' | 'PER_PERSON';

export type GreetingConfig = {
  state: GreetingState;
  closeMode: GreetingCloseMode;
  waveId: string;
  greeting: string;
  message: string;
  icon: string;
  logoAccentUrl: string;
  doodleEnabled: boolean;
  doodleEndsAt: string | null;
  doodleActive: boolean;
};

function normalizeIconName(raw: string | undefined): string {
  const value = String(raw || '').trim();
  if (/^[a-z][a-z0-9_]{0,63}$/.test(value)) return value;
  return '';
}

function normalizeLogoAccentUrl(raw: string | undefined): string {
  const value = String(raw || '').trim();
  if (!value || !isUsableMediaUrl(value)) return '';
  return value;
}

function normalizeGreetingConfig(
  raw: Partial<GreetingConfig> | null | undefined,
): GreetingConfig {
  const state =
    String(raw?.state || '')
      .trim()
      .toUpperCase() === 'LAUNCH'
      ? 'LAUNCH'
      : 'NORMAL';
  const closeMode =
    String(raw?.closeMode || '')
      .trim()
      .toUpperCase() === 'GLOBAL'
      ? 'GLOBAL'
      : 'PER_PERSON';
  const doodleEndsRaw = String(raw?.doodleEndsAt || '').trim();
  const doodleEndsMs = doodleEndsRaw ? Date.parse(doodleEndsRaw) : NaN;
  const doodleEndsAt = Number.isFinite(doodleEndsMs)
    ? new Date(doodleEndsMs).toISOString()
    : null;
  const doodleEnabled = raw?.doodleEnabled === true;
  const doodleActive =
    raw?.doodleActive === true ||
    (doodleEnabled &&
      doodleEndsAt != null &&
      Date.parse(doodleEndsAt) > Date.now());

  return {
    state,
    closeMode,
    waveId: String(raw?.waveId || '').trim() || 'default',
    greeting: String(raw?.greeting || '').trim() || 'Akansho',
    message: String(raw?.message || '').trim(),
    icon: normalizeIconName(raw?.icon),
    logoAccentUrl: normalizeLogoAccentUrl(raw?.logoAccentUrl),
    doodleEnabled,
    doodleEndsAt,
    doodleActive,
  };
}

export async function getGreetingStatus(): Promise<GreetingConfig> {
  const data = await apiGet<GreetingConfig>('/greeting', {timeout: 4000});
  return normalizeGreetingConfig(data);
}

export async function completeGreeting(): Promise<GreetingConfig> {
  const data = await apiPost<GreetingConfig>('/greeting/complete', {});
  return normalizeGreetingConfig(data);
}
