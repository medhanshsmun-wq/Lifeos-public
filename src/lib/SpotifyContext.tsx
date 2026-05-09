'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db } from '@/lib/db';

interface SpotifyContextProps {
  playingData: any;
  topArtists: any[];
  isConnected: boolean;
  deviceId: string | null;
  loading: boolean;
  forceFetch: () => Promise<void>;
  getValidToken: () => Promise<string | null>;
  transferPlayback: () => Promise<void>;
  handlePlayback: (action: 'play' | 'pause' | 'next' | 'previous') => Promise<void>;
}

const SpotifyContext = createContext<SpotifyContextProps>({
  playingData: null,
  topArtists: [],
  isConnected: false,
  deviceId: null,
  loading: true,
  forceFetch: async () => {},
  getValidToken: async () => null,
  transferPlayback: async () => {},
  handlePlayback: async () => {},
});

export const useSpotify = () => useContext(SpotifyContext);

export const SpotifyProvider = ({ children }: { children: React.ReactNode }) => {
  const [playingData, setPlayingData] = useState<any>(null);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const playerRef = useRef<any>(null);

  const getValidToken = async () => {
    const settings = await db.settings.toArray();
    if (!settings.length || !settings[0].spotifyAccessToken) return null;

    let { spotifyAccessToken, spotifyRefreshToken, spotifyExpiresAt, spotifyClientId, spotifyClientSecret } = settings[0];

    if (spotifyExpiresAt && Date.now() > spotifyExpiresAt - 60000) {
      if (!spotifyRefreshToken || !spotifyClientId || !spotifyClientSecret) return null;
      try {
        const res = await fetch('/api/spotify/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: spotifyRefreshToken, clientId: spotifyClientId, clientSecret: spotifyClientSecret })
        });
        const data = await res.json();
        if (data.access_token) {
          spotifyAccessToken = data.access_token;
          await db.settings.update(settings[0].id!, {
            spotifyAccessToken,
            spotifyExpiresAt: Date.now() + (data.expires_in * 1000)
          });
        } else {
          return null;
        }
      } catch (e) {
        console.error('Failed to refresh Spotify token', e);
        return null;
      }
    }
    return spotifyAccessToken;
  };

  const fetchData = async () => {
    const token = await getValidToken();
    if (!token) {
      setIsConnected(false);
      setLoading(false);
      return;
    }
    setIsConnected(true);

    try {
      const [playingRes, artistsRes] = await Promise.all([
        fetch('https://api.spotify.com/v1/me/player/currently-playing', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('https://api.spotify.com/v1/me/top/artists?limit=3&time_range=short_term', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (playingRes.status === 200) {
        const playing = await playingRes.json();
        setPlayingData(playing);
      } else {
        setPlayingData(null);
      }

      if (artistsRes.status === 200) {
        const artists = await artistsRes.json();
        setTopArtists(artists.items);
      }
    } catch (error) {
      console.error('Failed to fetch Spotify data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Web Playback SDK globally
  useEffect(() => {
    const initSDK = async () => {
      const token = await getValidToken();
      if (!token) return;

      if (!document.querySelector('script[src="https://sdk.scdn.co/spotify-player.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://sdk.scdn.co/spotify-player.js';
        script.async = true;
        document.body.appendChild(script);
      }

      (window as any).onSpotifyWebPlaybackSDKReady = () => {
        const player = new (window as any).Spotify.Player({
          name: 'LifeOS Web Player',
          getOAuthToken: (cb: (token: string) => void) => { cb(token); },
          volume: 0.5
        });

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          console.log('Ready with Device ID', device_id);
          setDeviceId(device_id);
        });

        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('Device ID has gone offline', device_id);
        });

        player.addListener('player_state_changed', (state: any) => {
          if (!state) return;
          fetchData(); // Sync data when state changes internally via SDK
        });

        player.connect();
        playerRef.current = player;
      };
    };

    if (isConnected && !playerRef.current) {
      initSDK();
    }

    // Do NOT disconnect on unmount unless we explicitly want to destroy the persistent player
  }, [isConnected]);

  const transferPlayback = async () => {
    if (!deviceId) return;
    const token = await getValidToken();
    if (!token) return;
    try {
      await fetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [deviceId], play: true })
      });
      setTimeout(fetchData, 1000);
    } catch (e) {
      console.error('Failed to transfer playback', e);
    }
  };

  const handlePlayback = async (action: 'play' | 'pause' | 'next' | 'previous') => {
    const token = await getValidToken();
    if (!token) return;

    try {
      if (action === 'play' && !playingData && deviceId) {
        await transferPlayback();
        return;
      }

      await fetch(`https://api.spotify.com/v1/me/player/${action}`, {
        method: action === 'next' || action === 'previous' ? 'POST' : 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setTimeout(fetchData, 500);
    } catch (e) {
      console.error(`Failed to ${action}`, e);
    }
  };

  return (
    <SpotifyContext.Provider value={{ playingData, topArtists, isConnected, deviceId, loading, forceFetch: fetchData, getValidToken, transferPlayback, handlePlayback }}>
      {children}
    </SpotifyContext.Provider>
  );
};
