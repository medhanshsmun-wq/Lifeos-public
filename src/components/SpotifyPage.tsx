'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Loader2, ListMusic, Heart, Activity, Shuffle, Repeat, Repeat1, Pause, SkipBack, SkipForward, Search, X } from 'lucide-react';
import { useSpotify } from '@/lib/SpotifyContext';

export default function SpotifyPage() {
  const { isConnected, getValidToken, deviceId, transferPlayback, loading: contextLoading, playingData, handlePlayback, setRepeatMode, setShuffle, rateLimited, rateLimitResetAt, forceFetch } = useSpotify();
  
  const [activeTab, setActiveTab] = useState<'playlists' | 'liked' | 'search'>('playlists');
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);
  const [countdown, setCountdown] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Countdown timer for rate limit display
  useEffect(() => {
    if (!rateLimitResetAt) {
      setCountdown(0);
      return;
    }
    const update = () => {
      const remaining = Math.max(0, Math.ceil((rateLimitResetAt - Date.now()) / 1000));
      setCountdown(remaining);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [rateLimitResetAt]);

  const fetchSpotifyData = useCallback(async () => {
    if (!isConnected || rateLimited) return;
    
    setLoading(true);
    setError(null);
    const token = await getValidToken();
    if (!token) {
      setError('Session expired. Please refresh or reconnect.');
      setLoading(false);
      return;
    }

    try {
      // Fetch playlists first
      const playlistsRes = await fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (playlistsRes.status === 429) {
        const retryAfter = parseInt(playlistsRes.headers.get('Retry-After') || '60', 10);
        setError(`Rate limited by Spotify. Try again in ~${retryAfter} seconds.`);
        setLoading(false);
        return; // Don't even try liked songs
      }

      if (playlistsRes.ok) {
        const pData = await playlistsRes.json();
        setPlaylists(pData.items || []);
      } else if (playlistsRes.status === 401) {
        setError('Spotify session expired.');
      }

      // Small delay between requests to be nice to the API
      await new Promise(r => setTimeout(r, 200));

      // Then fetch liked songs
      const likedRes = await fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (likedRes.ok) {
        const lData = await likedRes.json();
        setLikedSongs(lData.items || []);
      } else if (likedRes.status === 429) {
        setError('Rate limited. Your playlists loaded but liked songs will be available in a few minutes.');
      } else if (likedRes.status === 403) {
        setError('Missing "user-library-read" permission. Reconnect Spotify in Integrations.');
      } else if (likedRes.status === 401) {
        setError('Spotify session expired.');
      }
    } catch (e) {
      console.error('Failed to fetch Spotify user data', e);
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [isConnected, getValidToken, rateLimited]);

  useEffect(() => {
    if (isConnected && !hasFetchedRef.current && !rateLimited) {
      hasFetchedRef.current = true;
      fetchSpotifyData();
    }
  }, [isConnected, fetchSpotifyData, rateLimited]);

  // Search — debounced, 1 API call per submit
  const doSearch = useCallback(async (query: string) => {
    if (!query.trim() || rateLimited) return;
    setSearching(true);
    const token = await getValidToken();
    if (!token) { setSearching(false); return; }
    try {
      const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.tracks?.items || []);
        setActiveTab('search');
      }
    } catch (e) { console.error('Search failed', e); }
    setSearching(false);
  }, [getValidToken, rateLimited]);

  const handleSearchInput = (val: string) => {
    setSearchQuery(val);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (val.trim().length > 2) {
      searchTimeoutRef.current = setTimeout(() => doSearch(val), 800);
    }
  };

  // Play a specific track or playlist context
  const playItem = useCallback(async (uri: string, isContext: boolean = false, index: number = 0) => {
    const token = await getValidToken();
    if (!token) return;

    try {
      const body: any = {};
      if (isContext) {
        // Playlist/album — play from context at offset
        body.context_uri = uri;
        if (index > 0) body.offset = { position: index };
      } else {
        // Single track — play this exact track, queue up the next ones if from liked songs
        if (activeTab === 'liked' && likedSongs.length > 0) {
          // Build a queue: clicked song first, then the rest
          const uris = likedSongs
            .slice(index, Math.min(index + 50, likedSongs.length))
            .map(item => item.track?.uri)
            .filter(Boolean);
          body.uris = uris.length > 0 ? uris : [uri];
        } else {
          // Single track (from search or direct)
          body.uris = [uri];
        }
      }

      const endpoint = `https://api.spotify.com/v1/me/player/play${deviceId ? `?device_id=${deviceId}` : ''}`;
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (res.status === 404 && deviceId) {
        // Device not found — transfer first, then play
        await fetch('https://api.spotify.com/v1/me/player', {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ device_ids: [deviceId], play: false })
        });
        await new Promise(r => setTimeout(r, 500));
        await fetch(endpoint, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      // Force immediate UI update
      setTimeout(() => forceFetch(), 1000);
    } catch (e) {
      console.error('Failed to play item', e);
    }
  }, [getValidToken, deviceId, likedSongs, activeTab, forceFetch]);

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { stiffness: 300, damping: 24 } }
  };

  if (contextLoading) {
    return (
      <div className="p-8 h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#1db954] animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-[#1db954]/10 flex items-center justify-center mb-2">
          <Music className="w-8 h-8 text-[#1db954]" />
        </div>
        <h2 className="text-2xl font-bold text-white">Spotify Not Connected</h2>
        <p className="text-sm text-[var(--text-secondary)] max-w-md">Connect your Spotify account in the Integrations page to view your playlists and liked songs here.</p>
        <a href="/integrations" className="px-6 py-2.5 rounded-xl bg-[#1db954] text-black font-semibold text-sm hover:scale-105 transition-all">Go to Integrations</a>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24 page-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <Music className="w-8 h-8 text-[#1db954]" />
            Your Library
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">Manage and play your Spotify collections directly from LifeOS.</p>
        </div>
        
        <div className="flex items-center gap-4">
          {playingData && (
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 mr-2">
              <button onClick={() => setShuffle(!playingData.shuffle_state)} className={`p-1.5 rounded-md transition-all ${playingData.shuffle_state ? 'text-[#1db954] bg-[#1db954]/10' : 'text-[var(--text-tertiary)] hover:text-white'}`}><Shuffle className="w-4 h-4" /></button>
              <button onClick={() => handlePlayback('previous')} className="p-1.5 text-[var(--text-secondary)] hover:text-white transition-colors"><SkipBack className="w-4 h-4" fill="currentColor" /></button>
              <button onClick={() => handlePlayback(playingData.is_playing ? 'pause' : 'play')} className="p-2 bg-white text-black rounded-full hover:scale-105 transition-all">{playingData.is_playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}</button>
              <button onClick={() => handlePlayback('next')} className="p-1.5 text-[var(--text-secondary)] hover:text-white transition-colors"><SkipForward className="w-4 h-4" fill="currentColor" /></button>
              <button 
                onClick={() => {
                  const modes: ('off' | 'context' | 'track')[] = ['off', 'context', 'track'];
                  const nextMode = modes[(modes.indexOf(playingData.repeat_state || 'off') + 1) % modes.length];
                  setRepeatMode(nextMode);
                }} 
                className={`p-1.5 rounded-md transition-all relative ${
                  playingData.repeat_state === 'track' ? 'text-[#1db954] bg-[#1db954]/10' :
                  playingData.repeat_state === 'context' ? 'text-[#1db954]' :
                  'text-[var(--text-tertiary)] hover:text-white'
                }`}
                title={`Repeat: ${playingData.repeat_state || 'off'}`}
              >
                {playingData.repeat_state === 'track' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                {playingData.repeat_state !== 'off' && <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#1db954] rounded-full" />}
              </button>
            </div>
          )}

          <div className="glass-card p-1 rounded-xl flex gap-1">
            <button 
              onClick={() => setActiveTab('playlists')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'playlists' ? 'bg-[#1db954] text-black shadow-lg' : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'}`}
            >
              <ListMusic className="w-4 h-4" /> Playlists
            </button>
            <button 
              onClick={() => setActiveTab('liked')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'liked' ? 'bg-[#1db954] text-black shadow-lg' : 'text-[var(--text-secondary)] hover:text-white hover:bg-white/5'}`}
            >
              <Heart className="w-4 h-4" /> Liked Songs
            </button>
          </div>
        </div>
      </div>

      {/* Search bar */}
      <div className="relative max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => handleSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && doSearch(searchQuery)}
          placeholder="Search Spotify tracks..."
          className="w-full bg-[var(--bg-hover)] border border-[var(--border-subtle)] rounded-xl pl-11 pr-10 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#1db954]/40 transition-colors"
        />
        {searchQuery && (
          <button onClick={() => { setSearchQuery(''); setSearchResults([]); if (activeTab === 'search') setActiveTab('playlists'); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-white">
            <X className="w-4 h-4" />
          </button>
        )}
        {searching && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1db954] animate-spin" />}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#1db954] animate-spin" />
        </div>
      ) : error || rateLimited ? (
        <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
            <Activity className="w-8 h-8 text-amber-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-white">{rateLimited ? 'Rate Limited' : 'Sync Error'}</h3>
            <p className="text-sm text-[var(--text-secondary)] max-w-md">
              {rateLimited 
                ? `Spotify API is temporarily blocking requests. This resets automatically.${countdown > 0 ? ` Try again in ~${countdown}s.` : ''}`
                : error}
            </p>
            {rateLimited && countdown > 0 && (
              <div className="mt-3 w-48 mx-auto">
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-amber-500 transition-all duration-1000 ease-linear" style={{ width: `${Math.max(0, 100 - (countdown / 120) * 100)}%` }} />
                </div>
              </div>
            )}
          </div>
          <button 
            disabled={rateLimited && countdown > 0}
            onClick={() => { hasFetchedRef.current = false; fetchSpotifyData(); }} 
            className={`px-5 py-2 rounded-xl border text-sm transition-all ${rateLimited && countdown > 0 ? 'bg-white/5 border-white/5 text-[var(--text-muted)] cursor-not-allowed' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
          >
            {rateLimited && countdown > 0 ? `Wait ${countdown}s` : 'Retry'}
          </button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'search' && searchResults.length > 0 ? (
            <motion.div key="search" variants={container} initial="hidden" animate="show" exit="hidden" className="space-y-2">
              <p className="text-xs text-[var(--text-tertiary)] mb-3">{searchResults.length} results for "{searchQuery}"</p>
              {searchResults.map((track, index) => (
                <motion.div key={track.id} variants={item} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer" onClick={() => playItem(track.uri, false, index)}>
                  <div className="w-8 text-center text-xs text-[var(--text-tertiary)] group-hover:hidden">{index + 1}</div>
                  <div className="w-8 hidden group-hover:flex justify-center text-[#1db954]"><Play className="w-4 h-4" fill="currentColor" /></div>
                  <div className="w-10 h-10 rounded overflow-hidden bg-white/5 flex-shrink-0">
                    {track.album?.images?.[0]?.url ? <img src={track.album.images[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 text-white/20" /></div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate group-hover:text-[#1db954] transition-colors">{track.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)] truncate">{track.artists?.map((a: any) => a.name).join(', ')}</p>
                  </div>
                  <div className="hidden md:block w-1/4 min-w-0"><p className="text-xs text-[var(--text-secondary)] truncate">{track.album?.name}</p></div>
                  <div className="text-xs text-[var(--text-tertiary)] font-mono">{track.duration_ms ? `${Math.floor(track.duration_ms / 60000)}:${(Math.floor((track.duration_ms % 60000) / 1000)).toString().padStart(2, '0')}` : '--:--'}</div>
                </motion.div>
              ))}
            </motion.div>
          ) : activeTab === 'playlists' ? (
            <motion.div key="playlists" variants={container} initial="hidden" animate="show" exit="hidden" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {playlists.map((playlist) => (
                <motion.div key={playlist.id} variants={item} className="group glass-card p-4 rounded-2xl hover:bg-[var(--bg-hover)] transition-colors cursor-pointer relative" onClick={() => playItem(playlist.uri, true)}>
                  <div className="aspect-square w-full bg-[#1db954]/10 rounded-xl mb-4 overflow-hidden shadow-lg relative">
                    {playlist.images?.[0]?.url ? <img src={playlist.images[0].url} alt={playlist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <div className="w-full h-full flex items-center justify-center"><Music className="w-12 h-12 text-[#1db954]/40" /></div>}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center shadow-[0_0_20px_rgba(29,185,84,0.4)] translate-y-4 group-hover:translate-y-0 transition-all duration-300"><Play className="w-6 h-6 text-black ml-1" fill="currentColor" /></div>
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-sm truncate">{playlist.name}</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">By {playlist.owner?.display_name}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="liked" variants={container} initial="hidden" animate="show" exit="hidden" className="space-y-2">
              {likedSongs.length > 0 ? likedSongs.map((itemObj, index) => {
                const track = itemObj?.track;
                if (!track) return null;
                return (
                  <motion.div key={track.id || index} variants={item} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer" onClick={() => playItem(track.uri, false, index)}>
                    <div className="w-8 text-center text-xs text-[var(--text-tertiary)] group-hover:hidden">{index + 1}</div>
                    <div className="w-8 hidden group-hover:flex justify-center text-[#1db954]"><Play className="w-4 h-4" fill="currentColor" /></div>
                    <div className="w-10 h-10 rounded overflow-hidden bg-white/5 flex-shrink-0">
                      {track.album?.images?.[0]?.url ? <img src={track.album.images[0].url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Music className="w-4 h-4 text-white/20" /></div>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate group-hover:text-[#1db954] transition-colors">{track.name || 'Unknown Track'}</p>
                      <p className="text-xs text-[var(--text-tertiary)] truncate">{track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}</p>
                    </div>
                    <div className="hidden md:block w-1/3 min-w-0"><p className="text-xs text-[var(--text-secondary)] truncate">{track.album?.name || 'Unknown Album'}</p></div>
                    <div className="text-xs text-[var(--text-tertiary)] font-mono">{track.duration_ms ? `${Math.floor(track.duration_ms / 60000)}:${(Math.floor((track.duration_ms % 60000) / 1000)).toString().padStart(2, '0')}` : '--:--'}</div>
                  </motion.div>
                );
              }) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center"><Heart className="w-6 h-6 text-white/20" /></div>
                  <div className="space-y-1">
                    <p className="text-white font-medium">No Liked Songs found</p>
                    <p className="text-sm text-[var(--text-tertiary)] max-w-xs">Try reconnecting your Spotify account.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
