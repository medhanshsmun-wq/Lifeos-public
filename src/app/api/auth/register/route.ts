import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isDatabaseConfigured } from '@/lib/config';
import { hashPin, isValidPin } from '@/lib/auth/pin.server';
import { createAccountWithSettings, toPublicAccount } from '@/lib/auth/account';
import { createSessionToken, sessionCookieOptions } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Server database required for account registration. Set DATABASE_URL.' },
      { status: 503 }
    );
  }

  try {
    const { name, email, pin } = await req.json();
    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    // Lock registration if an account already exists
    const accountCount = await prisma.account.count();
    if (accountCount > 0) {
      return NextResponse.json(
        { error: 'Registration is locked. Only the site owner can log in.' },
        { status: 403 }
      );
    }
    if (!isValidPin(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await prisma.account.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
    }

    const pinHash = await hashPin(pin);
    const account = await createAccountWithSettings(name, email, pinHash);

    const token = createSessionToken({ accountId: account.id, mode: 'server' });
    const res = NextResponse.json({
      user: toPublicAccount(account),
      mode: 'server',
    });
    res.cookies.set(sessionCookieOptions(token));
    return res;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
