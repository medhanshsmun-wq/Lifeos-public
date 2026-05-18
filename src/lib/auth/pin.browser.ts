import { isValidPin } from './pin.shared';

export { isValidPin, maskEmail } from './pin.shared';

async function deriveKey(pin: string, salt: Uint8Array): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  return crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt as any, iterations: 120000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
}

function bufferToHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const derived = await deriveKey(pin, salt);
  return `pbkdf2:${bufferToHex(salt.buffer)}:${bufferToHex(derived)}`;
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  const [algo, saltHex, hashHex] = pinHash.split(':');
  if (algo !== 'pbkdf2' || !saltHex || !hashHex) return false;
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)));
  const derived = await deriveKey(pin, salt);
  return bufferToHex(derived) === hashHex;
}
