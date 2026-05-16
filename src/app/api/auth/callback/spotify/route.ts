import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // IMPORTANT: Always redirect to 127.0.0.1, never localhost
  // Spotify requires 127.0.0.1 since their 2025 security policy,
  // and using localhost would break the OAuth flow.
  const redirectUrl = new URL('/integrations', `http://127.0.0.1:${url.port || '3000'}`);
  
  if (code) redirectUrl.searchParams.set('code', code);
  if (error) redirectUrl.searchParams.set('error', error);

  return NextResponse.redirect(redirectUrl);
}
