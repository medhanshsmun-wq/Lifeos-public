import { NextRequest, NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/lib/config';
import { isValidPin, maskEmail, verifyPin } from '@/lib/auth/pin.server';
import { findAccountsByPin } from '@/lib/auth/account';
import { createSessionToken, sessionCookieOptions } from '@/lib/auth/session';

export async function POST(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { error: 'Server database required for login. Set DATABASE_URL.' },
      { status: 503 }
    );
  }

  try {
    const { pin } = await req.json();
    if (!isValidPin(pin)) {
      return NextResponse.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 });
    }

    const matches = await findAccountsByPin(pin, verifyPin);

    if (matches.length === 0) {
      return NextResponse.json({ error: 'Invalid PIN' }, { status: 401 });
    }

    if (matches.length === 1) {
      const user = matches[0];
      const token = createSessionToken({ accountId: user.id, mode: 'server' });
      const res = NextResponse.json({ user, mode: 'server' });
      res.cookies.set(sessionCookieOptions(token));
      return res;
    }

    return NextResponse.json({
      requiresSelection: true,
      candidates: matches.map((u) => ({
        id: u.id,
        name: u.name,
        emailMasked: maskEmail(u.email),
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
