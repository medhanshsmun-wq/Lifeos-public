import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

export const SESSION_COOKIE = 'lifeos_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type SessionPayload = {
  accountId: number;
  mode: 'server' | 'local';
};

function getSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production');
    }
    return 'dev-session';
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export function createSessionToken(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(body);
  return `${body}.${signature}`;
}

export function verifySessionToken(token: string): SessionPayload | null {
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  const expected = sign(body);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as SessionPayload;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}

export async function getSessionFromCookies(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const LOCAL_SESSION_KEY = 'lifeos_session';

export function saveLocalSession(payload: SessionPayload) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_SESSION_KEY, createSessionToken(payload));
}

export function readLocalSession(): SessionPayload | null {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem(LOCAL_SESSION_KEY);
  if (!token) return null;
  return verifySessionToken(token);
}

export function clearLocalSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_SESSION_KEY);
}
