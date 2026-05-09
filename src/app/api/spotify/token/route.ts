import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { code, clientId, clientSecret, redirectUri, refreshToken } = await req.json();

    const authOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: new URLSearchParams(
        refreshToken 
          ? {
              grant_type: 'refresh_token',
              refresh_token: refreshToken,
            }
          : {
              code: code,
              redirect_uri: redirectUri,
              grant_type: 'authorization_code',
            }
      ),
    };

    const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Spotify token exchange error:', error);
    return NextResponse.json({ error: 'Failed to exchange token' }, { status: 500 });
  }
}
