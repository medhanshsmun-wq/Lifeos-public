'use client';

import { motion } from 'framer-motion';
import { Music, Play, Pause, SkipForward, SkipBack, Loader2, MonitorSpeaker } from 'lucide-react';
import { useSpotify } from '@/lib/SpotifyContext';

export default function SpotifyWidget() {
  const { playingData, topArtists, isConnected, deviceId, loading, transferPlayback, handlePlayback } = useSpotify();

  if (loading) {
    return (
      <div className="glass-card p-6 h-full min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#1db954] animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="glass-card p-6 h-full flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[#1db954]/10 flex items-center justify-center mb-2">
          <Music className="w-6 h-6 text-[#1db954]" />
        </div>
        <p className="text-sm font-semibold text-[var(--text-primary)]">Spotify Not Connected</p>
        <p className="text-xs text-[var(--text-tertiary)]">Connect in Settings to view stats and control playback.</p>
      </div>
    );
  }

  const track = playingData?.item;
  const isPlaying = playingData?.is_playing;
  const progressPercent = playingData ? (playingData.progress_ms / track?.duration_ms) * 100 : 0;

  return (
    <div className="glass-card p-5 space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-[#1db954]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.32 10.62C15.24 8.16 8.82 7.92 5.16 9.06c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.48-.959.66-1.319.48z"/></svg>
          <h3 className="text-sm font-bold uppercase tracking-wider">Now Playing</h3>
        </div>
        {isPlaying && (
          <div className="flex gap-1">
            <span className="w-1 h-3 bg-[#1db954] animate-[bounce_1s_infinite_0.1s]"></span>
            <span className="w-1 h-4 bg-[#1db954] animate-[bounce_1s_infinite_0.3s]"></span>
            <span className="w-1 h-2 bg-[#1db954] animate-[bounce_1s_infinite_0.5s]"></span>
          </div>
        )}
      </div>

      {track ? (
        <div className="flex-1 flex flex-col justify-center space-y-5">
          <div className="flex items-center gap-4">
            <img src={track.album.images[0]?.url} alt="Album Art" className="w-16 h-16 rounded-lg shadow-xl shadow-black/40 border border-white/10" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{track.name}</p>
              <p className="text-xs text-[var(--text-tertiary)] truncate">{track.artists.map((a: any) => a.name).join(', ')}</p>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#1db954] transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
            </div>
            <div className="flex justify-between text-[10px] text-[var(--text-muted)] font-mono">
              <span>{Math.floor(playingData.progress_ms / 60000)}:{(Math.floor((playingData.progress_ms % 60000) / 1000)).toString().padStart(2, '0')}</span>
              <span>{Math.floor(track.duration_ms / 60000)}:{(Math.floor((track.duration_ms % 60000) / 1000)).toString().padStart(2, '0')}</span>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 pt-2">
            <button onClick={() => handlePlayback('previous')} className="p-2 text-[var(--text-tertiary)] hover:text-white hover:bg-white/10 rounded-full transition-all"><SkipBack className="w-5 h-5" fill="currentColor" /></button>
            <button onClick={() => handlePlayback(isPlaying ? 'pause' : 'play')} className="p-3 bg-white text-black rounded-full hover:scale-105 transition-all shadow-lg shadow-white/10">
              {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
            </button>
            <button onClick={() => handlePlayback('next')} className="p-2 text-[var(--text-tertiary)] hover:text-white hover:bg-white/10 rounded-full transition-all"><SkipForward className="w-5 h-5" fill="currentColor" /></button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
          <p className="text-sm font-medium text-[var(--text-secondary)]">No active playback</p>
          {deviceId ? (
            <button onClick={transferPlayback} className="px-4 py-2 rounded-xl bg-[#1db954] text-black font-semibold text-xs hover:scale-105 transition-all flex items-center gap-2">
              <MonitorSpeaker className="w-4 h-4" /> Start Web Player
            </button>
          ) : (
            <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />
          )}
        </div>
      )}

      {topArtists.length > 0 && (
        <div className="border-t border-[var(--border-subtle)] pt-4 mt-auto">
          <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3">Top Artists This Month</h4>
          <div className="flex gap-3">
            {topArtists.map(artist => (
              <div key={artist.id} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                <img src={artist.images[0]?.url} alt={artist.name} className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                <span className="text-[9px] text-[var(--text-secondary)] text-center truncate w-full px-1">{artist.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
