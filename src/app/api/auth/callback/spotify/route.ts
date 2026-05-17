import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // We redirect back to localhost so the macOS Web App (PWA) recognizes it as "in-scope"
  // and hides the external browser title bar. The token exchange will still use the 127.0.0.1 redirect_uri.
  const redirectUrl = new URL('/integrations', `http://localhost:${url.port || '3000'}`);
  
  if (code) redirectUrl.searchParams.set('code', code);
  if (error) redirectUrl.searchParams.set('error', error);

  return NextResponse.redirect(redirectUrl);
}
