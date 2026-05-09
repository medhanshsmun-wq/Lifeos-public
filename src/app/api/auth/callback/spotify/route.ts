import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');

  // Redirect back to the frontend integrations page to handle the Dexie DB operations
  const redirectUrl = new URL('/integrations', req.url);
  
  if (code) redirectUrl.searchParams.set('code', code);
  if (error) redirectUrl.searchParams.set('error', error);

  return NextResponse.redirect(redirectUrl);
}
