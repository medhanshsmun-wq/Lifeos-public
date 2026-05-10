'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
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
  setRepeatMode: (mode: 'track' | 'context' | 'off') => Promise<void>;
  setShuffle: (state: boolean) => Promise<void>;
  playUri: (uri: string, offset?: number) => Promise<void>;
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
  setRepeatMode: async () => {},
  setShuffle: async () => {},
  playUri: async () => {},
});

export const useSpotify = () => useContext(SpotifyContext);

export const SpotifyProvider = ({ children }: { children: React.ReactNode }) => {
  const [playingData, setPlayingData] = useState<any>(null);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const playerRef = useRef<any>(null);

  const getValidToken = useCallback(async () => {
    const settings = await db.settings.toArray();
    if (!settings.length || !settings[0].spotifyAccessToken) return null;

    const { spotifyAccessToken, spotifyRefreshToken, spotifyExpiresAt, spotifyClientId, spotifyClientSecret } = settings[0];
    let currentToken = spotifyAccessToken;

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
          currentToken = data.access_token;
          await db.settings.update(settings[0].id!, {
            spotifyAccessToken: currentToken,
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
  }, []);

  const fetchData = useCallback(async () => {
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
  }, [getValidToken]);

  useEffect(() => {
    const init = async () => {
      await fetchData();
    };
    init();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

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
  }, [isConnected, getValidToken, fetchData]);

  const transferPlayback = useCallback(async () => {
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
  }, [deviceId, getValidToken, fetchData]);

  const handlePlayback = useCallback(async (action: 'play' | 'pause' | 'next' | 'previous') => {
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
  }, [deviceId, getValidToken, fetchData, playingData, transferPlayback]);

  const setRepeatMode = useCallback(async (mode: 'track' | 'context' | 'off') => {
    const token = await getValidToken();
    if (!token) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/repeat?state=${mode}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setTimeout(fetchData, 500);
    } catch (e) {
      console.error('Failed to set repeat mode', e);
    }
  }, [getValidToken, fetchData]);

  const setShuffle = useCallback(async (state: boolean) => {
    const token = await getValidToken();
    if (!token) return;
    try {
      await fetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setTimeout(fetchData, 500);
    } catch (e) {
      console.error('Failed to set shuffle', e);
    }
  }, [getValidToken, fetchData]);

  const playUri = useCallback(async (uri: string, offset: number = 0) => {
    const token = await getValidToken();
    if (!token) return;
    try {
      const isCollection = uri.includes(':playlist:') || uri.includes(':album:') || uri.includes(':artist:');
      const body: any = {};
      if (isCollection) {
        body.context_uri = uri;
        if (offset > 0) body.offset = { position: offset };
      } else {
        body.uris = [uri];
      }

      await fetch(`https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ''}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      setTimeout(fetchData, 1000);
    } catch (e) {
      console.error('Failed to play URI', e);
    }
  }, [deviceId, getValidToken, fetchData]);

  return (
    <SpotifyContext.Provider value={{ 
      playingData, topArtists, isConnected, deviceId, loading, 
      forceFetch: fetchData, getValidToken, transferPlayback, 
      handlePlayback, setRepeatMode, setShuffle, playUri 
    }}>
      {children}
    </SpotifyContext.Provider>
  );
};
