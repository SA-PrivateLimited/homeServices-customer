import {apiPost} from './api/apiClient';

export async function createPartnerContextHandoff(): Promise<string> {
  const data = await apiPost<unknown>('/auth/context/partner-handoff', {});
  if (typeof data === 'string' && data.trim()) return data.trim();
  if (data && typeof data === 'object' && 'code' in data) {
    const raw = (data as {code?: unknown}).code;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
  }
  throw new Error('Could not start Partner session.');
}

export async function exchangeContextHandoff(
  code: string,
): Promise<{user: Record<string, unknown>; token: string}> {
  const handoffCode = String(code || '').trim();
  if (!handoffCode) throw new Error('Invalid handoff code.');
  return apiPost('/auth/context/exchange', {code: handoffCode}, {skipAuth: true});
}

export const PARTNER_WEB_URL = 'https://partner.akanso.in';

export function partnerHandoffUrl(code: string): string {
  const safe = typeof code === 'string' ? code.trim() : '';
  if (!safe || safe === '[object Object]') {
    throw new Error('Invalid handoff code.');
  }
  return `${PARTNER_WEB_URL}/auth/handoff?code=${encodeURIComponent(safe)}`;
}
