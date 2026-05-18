import prisma from '@/lib/prisma';
import { defaultUserSettings } from './defaults';

export type PublicAccount = {
  id: number;
  name: string;
  email: string;
};

export function toPublicAccount(account: { id: number; name: string; email: string }): PublicAccount {
  return { id: account.id, name: account.name, email: account.email };
}

export async function createAccountWithSettings(name: string, email: string, pinHash: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const account = await prisma.account.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      pinHash,
    },
  });
  await prisma.userSettings.create({
    data: {
      accountId: account.id,
      ...defaultUserSettings(name.trim()),
    },
  });
  return account;
}

export async function findAccountsByPin(
  pin: string,
  verify: (pin: string, hash: string) => Promise<boolean>
) {
  const accounts = await prisma.account.findMany({
    select: { id: true, name: true, email: true, pinHash: true },
  });
  const matches: PublicAccount[] = [];
  for (const account of accounts) {
    if (await verify(pin, account.pinHash)) {
      matches.push(toPublicAccount(account));
    }
  }
  return matches;
}
