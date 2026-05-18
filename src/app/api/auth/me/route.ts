import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isDatabaseConfigured } from '@/lib/config';
import { getSessionFromCookies } from '@/lib/auth/session';
import { toPublicAccount } from '@/lib/auth/account';

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  if (session.mode === 'local') {
    return NextResponse.json({
      user: { id: session.accountId, name: '', email: '' },
      mode: 'local',
    });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ user: null });
  }

  const account = await prisma.account.findUnique({
    where: { id: session.accountId },
    select: { id: true, name: true, email: true },
  });

  if (!account) {
    return NextResponse.json({ user: null });
  }

  return NextResponse.json({ user: toPublicAccount(account), mode: 'server' });
}
