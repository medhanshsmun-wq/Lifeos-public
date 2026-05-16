'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { db } from '@/lib/db';

interface SpotifyContextProps {
  playingData: any;
  topArtists: any[];
  isConnected: boolean;
  deviceId: string | null;
  loading: boolean;
  rateLimited: boolean;
  rateLimitResetAt: number | null;
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
  rateLimited: false,
  rateLimitResetAt: null,
  forceFetch: async () => {},
  getValidToken: async () => null,
  transferPlayback: async () => {},
  handlePlayback: async () => {},
  setRepeatMode: async () => {},
  setShuffle: async () => {},
  playUri: async () => {},
});

export const useSpotify = () => useContext(SpotifyContext);

// ─── Rate Limit Manager ────────────────────────────────────────
// Global rate limit state — shared across all Spotify API calls
let globalBackoffUntil = 0;
let consecutiveFailures = 0;

function isRateLimited(): boolean {
  return Date.now() < globalBackoffUntil;
}

function handleRateLimitResponse(res: Response): boolean {
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get('Retry-After') || '60', 10);
    // Use Retry-After header, minimum 30s, with exponential backoff on consecutive failures
    consecutiveFailures++;
    const backoffSeconds = Math.max(retryAfter, 30) * Math.min(consecutiveFailures, 4);
    globalBackoffUntil = Date.now() + (backoffSeconds * 1000);
    console.warn(`[Spotify] Rate limited. Backing off for ${backoffSeconds}s (failure #${consecutiveFailures})`);
    return true;
  }
  if (res.ok) {
    consecutiveFailures = 0; // Reset on success
  }
  return false;
}

async function spotifyFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
  if (isRateLimited()) {
    const waitSec = Math.ceil((globalBackoffUntil - Date.now()) / 1000);
    console.log(`[Spotify] Skipping request (rate limited, ${waitSec}s remaining): ${url.split('?')[0]}`);
    return null;
  }
  
  try {
    const res = await fetch(url, options);
    handleRateLimitResponse(res);
    return res;
  } catch (e) {
    console.error('[Spotify] Fetch error:', e);
    return null;
  }
}

export const SpotifyProvider = ({ children }: { children: React.ReactNode }) => {
  const [playingData, setPlayingData] = useState<any>(null);
  const [topArtists, setTopArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [rateLimitResetAt, setRateLimitResetAt] = useState<number | null>(null);
  const playerRef = useRef<any>(null);
  const lastFetchRef = useRef<number>(0);
  const stateChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const topArtistsCachedRef = useRef<boolean>(false); // Cache top artists — they rarely change

  const getValidToken = useCallback(async () => {
    const settings = await db.settings.toArray();
    if (!settings.length || !settings[0].spotifyAccessToken) return null;

    const { spotifyAccessToken, spotifyRefreshToken, spotifyExpiresAt, spotifyClientId, spotifyClientSecret } = settings[0];

    // Token is still valid
    if (!spotifyExpiresAt || Date.now() <= spotifyExpiresAt - 60000) {
      return spotifyAccessToken;
    }

    // Token expired — refresh it
    if (!spotifyRefreshToken || !spotifyClientId || !spotifyClientSecret) return null;
    try {
      const res = await fetch('/api/spotify/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: spotifyRefreshToken, clientId: spotifyClientId, clientSecret: spotifyClientSecret })
      });
      const data = await res.json();
      if (data.access_token) {
        const newToken = data.access_token;
        await db.settings.update(settings[0].id!, {
          spotifyAccessToken: newToken,
          spotifyExpiresAt: Date.now() + (data.expires_in * 1000)
        });
        return newToken;
      } else {
        return null;
      }
    } catch (e) {
      console.error('Failed to refresh Spotify token', e);
      return null;
    }
  }, []);

  const fetchData = useCallback(async (force = false) => {
    // Rate limit protection
    if (isRateLimited()) {
      setRateLimited(true);
      setRateLimitResetAt(globalBackoffUntil);
      setLoading(false);
      return;
    }

    // Debounce: skip if fetched less than 10s ago (unless forced)
    const now = Date.now();
    if (!force && now - lastFetchRef.current < 10000) return;
    lastFetchRef.current = now;

    const token = await getValidToken();
    if (!token) {
      setIsConnected(false);
      setLoading(false);
      return;
    }
    setIsConnected(true);
    setRateLimited(false);
    setRateLimitResetAt(null);

    // Fetch currently playing (this is the most important — do it first)
    const playingRes = await spotifyFetch(
      'https://api.spotify.com/v1/me/player/currently-playing',
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (playingRes) {
      if (playingRes.status === 200) {
        const playing = await playingRes.json();
        setPlayingData(playing);
      } else if (playingRes.status === 204) {
        setPlayingData(null);
      } else if (playingRes.status === 429) {
        setRateLimited(true);
        setRateLimitResetAt(globalBackoffUntil);
      }
    }

    // Fetch top artists only once per session (they barely change)
    if (!topArtistsCachedRef.current && !isRateLimited()) {
      const artistsRes = await spotifyFetch(
        'https://api.spotify.com/v1/me/top/artists?limit=3&time_range=short_term',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (artistsRes?.status === 200) {
        const artists = await artistsRes.json();
        setTopArtists(artists.items);
        topArtistsCachedRef.current = true;
      }
    }

    // Update rate limit UI state
    if (isRateLimited()) {
      setRateLimited(true);
      setRateLimitResetAt(globalBackoffUntil);
    }

    setLoading(false);
  }, [getValidToken]);

  // Smart polling: only fetch when not rate limited
  useEffect(() => {
    const init = async () => {
      await fetchData(true);
    };
    init();

    // Poll every 30s but respect rate limits
    const interval = setInterval(() => {
      if (!isRateLimited()) {
        fetchData();
      } else {
        // Check if rate limit has expired
        if (Date.now() >= globalBackoffUntil) {
          setRateLimited(false);
          setRateLimitResetAt(null);
          fetchData(true); // Try again
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchData]);

  // Initialize Web Playback SDK
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
          getOAuthToken: async (cb: (token: string) => void) => {
            const freshToken = await getValidToken();
            if (freshToken) cb(freshToken);
          },
          volume: 0.5
        });

        player.addListener('ready', ({ device_id }: { device_id: string }) => {
          console.log('Ready with Device ID', device_id);
          setDeviceId(device_id);
        });

        player.addListener('not_ready', ({ device_id }: { device_id: string }) => {
          console.log('Device ID has gone offline', device_id);
        });

        // Debounced state change — update from SDK locally, sync via API later
        player.addListener('player_state_changed', (state: any) => {
          if (!state) return;

          // Update local state from SDK (no API call)
          setPlayingData((prev: any) => {
            if (!prev && !state.track_window?.current_track) return prev;
            const currentTrack = state.track_window?.current_track;
            return {
              ...(prev || {}),
              is_playing: !state.paused,
              progress_ms: state.position,
              item: currentTrack ? {
                ...(prev?.item || {}),
                name: currentTrack.name,
                duration_ms: state.duration,
                artists: currentTrack.artists,
                album: {
                  ...(prev?.item?.album || {}),
                  name: currentTrack.album?.name,
                  images: currentTrack.album?.images?.map((img: any) => ({ url: img.url })) || prev?.item?.album?.images,
                }
              } : prev?.item,
              shuffle_state: state.shuffle,
              repeat_state: state.repeat_mode === 0 ? 'off' : state.repeat_mode === 1 ? 'context' : 'track',
            };
          });

          // Debounced full sync — only if not rate limited, 3s after last state change
          if (stateChangeTimeoutRef.current) {
            clearTimeout(stateChangeTimeoutRef.current);
          }
          stateChangeTimeoutRef.current = setTimeout(() => {
            if (!isRateLimited()) {
              fetchData(true);
            }
          }, 3000);
        });

        player.connect();
        playerRef.current = player;
      };
    };

    if (isConnected && !playerRef.current) {
      initSDK();
    }

    return () => {
      if (stateChangeTimeoutRef.current) {
        clearTimeout(stateChangeTimeoutRef.current);
      }
    };
  }, [isConnected, getValidToken, fetchData]);

  const transferPlayback = useCallback(async () => {
    if (!deviceId || isRateLimited()) return;
    const token = await getValidToken();
    if (!token) return;
    try {
      await spotifyFetch('https://api.spotify.com/v1/me/player', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ids: [deviceId], play: true })
      });
      setTimeout(() => fetchData(true), 1500);
    } catch (e) {
      console.error('Failed to transfer playback', e);
    }
  }, [deviceId, getValidToken, fetchData]);

  const handlePlayback = useCallback(async (action: 'play' | 'pause' | 'next' | 'previous') => {
    if (isRateLimited()) return;
    const token = await getValidToken();
    if (!token) return;

    try {
      // If no active playback and trying to play, transfer to device first
      if (action === 'play' && !playingData && deviceId) {
        await transferPlayback();
        return;
      }

      // Use SDK player directly for instant play/pause (no API call needed)
      if (playerRef.current && (action === 'play' || action === 'pause')) {
        if (action === 'pause') await playerRef.current.pause();
        else await playerRef.current.resume();
        return; // SDK listener will update state
      }

      // For next/previous — use API with device_id
      const url = deviceId 
        ? `https://api.spotify.com/v1/me/player/${action}?device_id=${deviceId}`
        : `https://api.spotify.com/v1/me/player/${action}`;
      
      await spotifyFetch(url, {
        method: action === 'next' || action === 'previous' ? 'POST' : 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Force sync after skip to get the new track info
      setTimeout(() => fetchData(true), 500);
    } catch (e) {
      console.error(`Failed to ${action}`, e);
    }
  }, [deviceId, getValidToken, fetchData, playingData, transferPlayback]);

  const setRepeatMode = useCallback(async (mode: 'track' | 'context' | 'off') => {
    if (isRateLimited()) return;
    // Instant local update for UI
    setPlayingData((prev: any) => prev ? { ...prev, repeat_state: mode } : prev);
    const token = await getValidToken();
    if (!token) return;
    try {
      await spotifyFetch(`https://api.spotify.com/v1/me/player/repeat?state=${mode}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to set repeat mode', e);
    }
  }, [getValidToken]);

  const setShuffle = useCallback(async (state: boolean) => {
    if (isRateLimited()) return;
    // Instant local update for UI
    setPlayingData((prev: any) => prev ? { ...prev, shuffle_state: state } : prev);
    const token = await getValidToken();
    if (!token) return;
    try {
      await spotifyFetch(`https://api.spotify.com/v1/me/player/shuffle?state=${state}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Failed to set shuffle', e);
    }
  }, [getValidToken]);

  const playUri = useCallback(async (uri: string, offset: number = 0) => {
    if (isRateLimited()) return;
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

      await spotifyFetch(`https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ''}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      setTimeout(() => fetchData(true), 1500);
    } catch (e) {
      console.error('Failed to play URI', e);
    }
  }, [deviceId, getValidToken, fetchData]);

  return (
    <SpotifyContext.Provider value={{ 
      playingData, topArtists, isConnected, deviceId, loading, 
      rateLimited, rateLimitResetAt,
      forceFetch: () => fetchData(true), getValidToken, transferPlayback, 
      handlePlayback, setRepeatMode, setShuffle, playUri 
    }}>
      {children}
    </SpotifyContext.Provider>
  );
};
