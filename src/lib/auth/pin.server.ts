import 'server-only';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { isValidPin } from './pin.shared';

const scryptAsync = promisify(scrypt);

export { isValidPin } from './pin.shared';
export { maskEmail } from './pin.shared';

export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const derived = (await scryptAsync(pin, salt, 64)) as Buffer;
  return `${salt}:${derived.toString('hex')}`;
}

export async function verifyPin(pin: string, pinHash: string): Promise<boolean> {
  const [salt, hash] = pinHash.split(':');
  if (!salt || !hash) return false;
  const derived = (await scryptAsync(pin, salt, 64)) as Buffer;
  const hashBuf = Buffer.from(hash, 'hex');
  if (hashBuf.length !== derived.length) return false;
  return timingSafeEqual(hashBuf, derived);
}
