'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Loader2, ListMusic, Heart, Activity, Shuffle, Repeat, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useSpotify } from '@/lib/SpotifyContext';

export default function SpotifyPage() {
  const { isConnected, getValidToken, deviceId, transferPlayback, loading: contextLoading, playingData, handlePlayback, setRepeatMode, setShuffle } = useSpotify();
  
  const [activeTab, setActiveTab] = useState<'playlists' | 'liked'>('playlists');
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [likedSongs, setLikedSongs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSpotifyData = async () => {
      if (!isConnected) return;
      
      setLoading(true);
      const token = await getValidToken();
      if (!token) return;

      try {
        const [playlistsRes, likedRes] = await Promise.all([
          fetch('https://api.spotify.com/v1/me/playlists?limit=50', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch('https://api.spotify.com/v1/me/tracks?limit=50', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        if (playlistsRes.ok) {
          const pData = await playlistsRes.json();
          setPlaylists(pData.items || []);
        } else {
          console.error('Playlists fetch failed', playlistsRes.status);
        }

        if (likedRes.ok) {
          const lData = await likedRes.json();
          setLikedSongs(lData.items || []);
        } else {
          console.error('Liked songs fetch failed', likedRes.status);
          // If 403, might be missing scopes
          if (likedRes.status === 403) {
            console.warn('Liked songs 403: Possible missing user-library-read scope');
          }
        }
      } catch (e) {
        console.error('Failed to fetch Spotify user data', e);
      } finally {
        setLoading(false);
      }
    };

    fetchSpotifyData();
  }, [isConnected, getValidToken]);

  const playItem = async (uri: string, isContext: boolean = false, index: number = 0) => {
    const token = await getValidToken();
    if (!token) return;
    
    if (deviceId) await transferPlayback();

    try {
      let body: any = {};
      if (isContext) {
        body.context_uri = uri;
        if (index > 0) body.offset = { position: index };
      } else {
        // If playing from liked songs, we play the list starting from this index
        body.uris = likedSongs.slice(index, index + 50).map(item => item.track.uri);
      }

      await fetch('https://api.spotify.com/v1/me/player/play', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
    } catch (e) {
      console.error('Failed to play item', e);
    }
  };

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
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      <div className="flex items-center justify-between">
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
              <button onClick={() => setShuffle(!playingData.shuffle_state)} className={`p-1.5 transition-colors ${playingData.shuffle_state ? 'text-[#1db954]' : 'text-[var(--text-tertiary)] hover:text-white'}`}><Shuffle className="w-4 h-4" /></button>
              <button onClick={() => handlePlayback('previous')} className="p-1.5 text-[var(--text-tertiary)] hover:text-white"><SkipBack className="w-4 h-4" /></button>
              <button onClick={() => handlePlayback(playingData.is_playing ? 'pause' : 'play')} className="p-2 bg-white text-black rounded-full hover:scale-105 transition-all">{playingData.is_playing ? <Pause className="w-4 h-4" fill="currentColor" /> : <Play className="w-4 h-4 ml-0.5" fill="currentColor" />}</button>
              <button onClick={() => handlePlayback('next')} className="p-1.5 text-[var(--text-tertiary)] hover:text-white"><SkipForward className="w-4 h-4" /></button>
              <button 
                onClick={() => {
                  const modes: ('off' | 'context' | 'track')[] = ['off', 'context', 'track'];
                  const nextMode = modes[(modes.indexOf(playingData.repeat_state) + 1) % modes.length];
                  setRepeatMode(nextMode);
                }} 
                className={`p-1.5 transition-colors relative ${playingData.repeat_state !== 'off' ? 'text-[#1db954]' : 'text-[var(--text-tertiary)] hover:text-white'}`}
              >
                <Repeat className="w-4 h-4" />
                {playingData.repeat_state === 'track' && <span className="absolute top-1 right-1 w-1 h-1 bg-[#1db954] rounded-full" />}
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

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#1db954] animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {activeTab === 'playlists' ? (
            <motion.div key="playlists" variants={container} initial="hidden" animate="show" exit="hidden" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {playlists.map((playlist) => (
                <motion.div key={playlist.id} variants={item} className="group glass-card p-4 rounded-2xl hover:bg-[var(--bg-hover)] transition-colors cursor-pointer relative" onClick={() => playItem(playlist.uri, true)}>
                  <div className="aspect-square w-full bg-[#1db954]/10 rounded-xl mb-4 overflow-hidden shadow-lg relative">
                    {playlist.images?.[0]?.url ? (
                      <img src={playlist.images[0].url} alt={playlist.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="w-12 h-12 text-[#1db954]/40" />
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-[#1db954] flex items-center justify-center shadow-[0_0_20px_rgba(29,185,84,0.4)] translate-y-4 group-hover:translate-y-0 transition-all duration-300">
                        <Play className="w-6 h-6 text-black ml-1" fill="currentColor" />
                      </div>
                    </div>
                  </div>
                  <h3 className="font-bold text-white text-sm truncate">{playlist.name}</h3>
                  <p className="text-xs text-[var(--text-tertiary)] mt-1 truncate">By {playlist.owner.display_name}</p>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div key="liked" variants={container} initial="hidden" animate="show" exit="hidden" className="space-y-2">
              {likedSongs.length > 0 ? (
                likedSongs.map((itemObj, index) => {
                  const track = itemObj?.track;
                  if (!track) return null;
                  
                  return (
                    <motion.div key={track.id || index} variants={item} className="group flex items-center gap-4 p-3 rounded-xl hover:bg-[var(--bg-elevated)] transition-colors cursor-pointer" onClick={() => playItem(track.uri, false, index)}>
                      <div className="w-8 text-center text-xs text-[var(--text-tertiary)] group-hover:hidden">{index + 1}</div>
                      <div className="w-8 hidden group-hover:flex justify-center text-[#1db954]">
                        <Play className="w-4 h-4" fill="currentColor" />
                      </div>
                      
                      <div className="w-10 h-10 rounded overflow-hidden bg-white/5 flex-shrink-0">
                        {track.album?.images?.[0]?.url ? (
                          <img src={track.album.images[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Music className="w-4 h-4 text-white/20" />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate group-hover:text-[#1db954] transition-colors">{track.name || 'Unknown Track'}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">
                          {track.artists?.map((a: any) => a.name).join(', ') || 'Unknown Artist'}
                        </p>
                      </div>
                      
                      <div className="hidden md:block w-1/3 min-w-0">
                        <p className="text-xs text-[var(--text-secondary)] truncate">{track.album?.name || 'Unknown Album'}</p>
                      </div>
                      
                      <div className="text-xs text-[var(--text-tertiary)] font-mono">
                        {track.duration_ms ? (
                          `${Math.floor(track.duration_ms / 60000)}:${(Math.floor((track.duration_ms % 60000) / 1000)).toString().padStart(2, '0')}`
                        ) : '--:--'}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white/20" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-white font-medium">No Liked Songs found</p>
                    <p className="text-sm text-[var(--text-tertiary)] max-w-xs">If you have liked songs on Spotify, they should appear here. Try reconnecting your account if they don't show up.</p>
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
