import Dexie, { type EntityTable } from 'dexie';
import { hashPin, verifyPin, isValidPin } from './pin.browser';

export interface LocalAccount {
  id?: number;
  name: string;
  email: string;
  pinHash: string;
  createdAt: Date;
}

class LifeOSAuthDB extends Dexie {
  accounts!: EntityTable<LocalAccount, 'id'>;

  constructor() {
    super('LifeOSAuth');
    this.version(1).stores({
      accounts: '++id, &email, pinHash',
    });
  }
}

const authDb = new LifeOSAuthDB();

export async function registerLocalAccount(name: string, email: string, pin: string) {
  if (!isValidPin(pin)) throw new Error('PIN must be exactly 4 digits');

  // Lock local registration if an account already exists
  const count = await authDb.accounts.count();
  if (count > 0) {
    throw new Error('Registration is locked. Only the site owner can log in.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await authDb.accounts.where('email').equals(normalizedEmail).first();
  if (existing) throw new Error('An account with this email already exists');

  const pinHash = await hashPin(pin);
  const id = await authDb.accounts.add({
    name: name.trim(),
    email: normalizedEmail,
    pinHash,
    createdAt: new Date(),
  });
  return { id, name: name.trim(), email: normalizedEmail };
}

export async function findLocalAccountsByPin(pin: string) {
  if (!isValidPin(pin)) return [];
  const all = await authDb.accounts.toArray();
  const matches: LocalAccount[] = [];
  for (const account of all) {
    if (await verifyPin(pin, account.pinHash)) {
      matches.push(account);
    }
  }
  return matches;
}

export async function getLocalAccountById(id: number) {
  return authDb.accounts.get(id);
}

export async function getLocalAccountsCount() {
  return authDb.accounts.count();
}
