import { NextRequest } from 'next/server';
import { verifySessionToken, SESSION_COOKIE } from './session';

export function getAccountIdFromRequest(request: NextRequest): number | null {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = verifySessionToken(token);
  if (!session || session.mode !== 'server') return null;
  return session.accountId;
}
