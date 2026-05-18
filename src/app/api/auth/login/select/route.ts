import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isDatabaseConfigured } from '@/lib/config';
import { isValidPin, verifyPin } from '@/lib/auth/pin.server';
import { toPublicAccount } from '@/lib/auth/account';
import { createSessionToken, sessionCookieOptions } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: 'Server database not configured' }, { status: 503 });
  }

  try {
    const { pin, accountId } = await req.json();
    if (!isValidPin(pin) || !accountId) {
      return NextResponse.json({ error: 'PIN and account selection are required' }, { status: 400 });
    }

    const account = await prisma.account.findUnique({ where: { id: Number(accountId) } });
    if (!account || !(await verifyPin(pin, account.pinHash))) {
      return NextResponse.json({ error: 'Invalid PIN for this account' }, { status: 401 });
    }

    const token = createSessionToken({ accountId: account.id, mode: 'server' });
    const res = NextResponse.json({ user: toPublicAccount(account), mode: 'server' });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
