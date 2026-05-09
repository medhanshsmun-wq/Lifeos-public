import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { refreshToken, clientId, clientSecret } = await req.json();

    const authOptions = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(clientId + ':' + clientSecret).toString('base64'),
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    };

    const response = await fetch('https://accounts.spotify.com/api/token', authOptions);
    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json({ error: data }, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Spotify token refresh error:', error);
    return NextResponse.json({ error: 'Failed to refresh token' }, { status: 500 });
  }
}
