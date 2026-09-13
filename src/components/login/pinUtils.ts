/** Reject obviously weak 4-digit PINs (client-side hint only). Matches customer-web. */
export function isWeakPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return true;
  if (/^(\d)\1{3}$/.test(pin)) return true;
  const banned = new Set([
    '0123',
    '1234',
    '2345',
    '3456',
    '4567',
    '5678',
    '6789',
    '7890',
    '9876',
    '8765',
    '7654',
    '6543',
    '5432',
    '4321',
    '3210',
    '0000',
    '1111',
    '2222',
    '3333',
    '4444',
    '5555',
    '6666',
    '7777',
    '8888',
    '9999',
  ]);
  return banned.has(pin);
}

export const LOGIN_PIN_LENGTH = 4;
export const LOGIN_PIN_RE = /^\d{4}$/;
