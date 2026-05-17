'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Music, Play, Pause, SkipForward, SkipBack, Loader2, MonitorSpeaker, Repeat, Repeat1, Shuffle } from 'lucide-react';
import { useSpotify } from '@/lib/SpotifyContext';

// ─── Color Extraction ──────────────────────────────────────
function useDominantColor(imageUrl: string | undefined) {
  const [color, setColor] = useState<[number, number, number]>([29, 185, 84]); // Spotify green default
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  
  useEffect(() => {
    if (!imageUrl) return;
    
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
      canvasRef.current.width = 10;
      canvasRef.current.height = 10;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, 10, 10);
      const data = ctx.getImageData(0, 0, 10, 10).data;
      
      // Sample multiple pixels and find the most vibrant one
      let bestR = 29, bestG = 185, bestB = 84;
      let bestSaturation = 0;
      
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max === 0 ? 0 : (max - min) / max;
        const brightness = max / 255;
        
        // Prefer saturated, reasonably bright colors
        if (saturation * brightness > bestSaturation * 0.8 && brightness > 0.15) {
          bestR = r; bestG = g; bestB = b;
          bestSaturation = saturation;
        }
      }
      
      setColor([bestR, bestG, bestB]);
    };
  }, [imageUrl]);
  
  return color;
}

export default function SpotifyWidget() {
  const { playingData, topArtists, isConnected, deviceId, loading, transferPlayback, handlePlayback, setRepeatMode, setShuffle } = useSpotify();

  // Real-time progress interpolation
  const [displayProgress, setDisplayProgress] = useState(0);
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<{ progress: number; timestamp: number; isPlaying: boolean }>({ progress: 0, timestamp: 0, isPlaying: false });

  const track = playingData?.item;
  const isPlaying = playingData?.is_playing;
  const albumArt = track?.album?.images?.[0]?.url;
  const dominantColor = useDominantColor(albumArt);
  const [r, g, b] = dominantColor;

  useEffect(() => {
    if (playingData?.progress_ms !== undefined) {
      lastSyncRef.current = {
        progress: playingData.progress_ms,
        timestamp: Date.now(),
        isPlaying: playingData.is_playing,
      };
      setDisplayProgress(playingData.progress_ms);
    }
  }, [playingData?.progress_ms, playingData?.is_playing]);

  useEffect(() => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (playingData?.is_playing && playingData?.item?.duration_ms) {
      const duration = playingData.item.duration_ms;
      progressTimerRef.current = setInterval(() => {
        const elapsed = Date.now() - lastSyncRef.current.timestamp;
        const interpolated = Math.min(lastSyncRef.current.progress + elapsed, duration);
        setDisplayProgress(interpolated);
      }, 1000);
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [playingData?.is_playing, playingData?.item?.duration_ms]);

  const progressPercent = track?.duration_ms ? (displayProgress / track.duration_ms) * 100 : 0;

  const formatTime = (ms: number) => {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="glass-card p-6 h-full min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#6ee7b7] animate-spin" />
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="glass-card p-6 h-full flex flex-col items-center justify-center text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-[rgba(110,231,183,0.06)] flex items-center justify-center mb-2">
          <Music className="w-6 h-6 text-[#6ee7b7]" />
        </div>
        <p className="text-sm font-semibold text-white">Spotify Not Connected</p>
        <p className="text-xs text-[rgba(255,255,255,0.40)]">Connect in Settings to view stats and control playback.</p>
      </div>
    );
  }

  return (
    <div 
      className="relative overflow-hidden rounded-[20px] h-full flex flex-col transition-all duration-1000"
      style={{
        background: track 
          ? `linear-gradient(135deg, rgba(${r},${g},${b},0.10) 0%, #0a0a0f 60%, #0a0a0f 100%)`
          : '#0a0a0f',
        border: `1px solid rgba(${r},${g},${b},${track ? 0.12 : 0.06})`,
      }}
    >
      {/* Dynamic glow behind album art */}
      {track && isPlaying && (
        <div 
          className="absolute top-0 left-0 w-40 h-40 rounded-full blur-[80px] transition-all duration-2000 pointer-events-none"
          style={{ background: `rgba(${r},${g},${b},0.2)` }}
        />
      )}

      <div className="relative z-10 p-5 space-y-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2" style={{ color: track ? `rgb(${r},${g},${b})` : '#1db954' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.32 10.62C15.24 8.16 8.82 7.92 5.16 9.06c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.48-.959.66-1.319.48z"/></svg>
            <h3 className="text-xs font-medium uppercase tracking-[0.22em]">Now Playing</h3>
          </div>
          {isPlaying && (
            <div className="flex items-end gap-[3px] h-4">
              {[0.1, 0.3, 0.5, 0.2].map((delay, i) => (
                <motion.span 
                  key={i}
                  className="w-[3px] rounded-full"
                  style={{ backgroundColor: `rgb(${r},${g},${b})` }}
                  animate={{ height: ['4px', '16px', '4px'] }}
                  transition={{ duration: 0.8, repeat: Infinity, delay, ease: 'easeInOut' }}
                />
              ))}
            </div>
          )}
        </div>

        {track ? (
          <div className="flex-1 flex flex-col justify-center space-y-5">
            {/* Album art + track info */}
            <div className="flex items-center gap-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={track.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="relative"
                >
                  <img 
                    src={albumArt} 
                    alt="Album Art" 
                    className="w-[72px] h-[72px] rounded-xl shadow-2xl border border-white/10" 
                    style={{ boxShadow: `0 8px 30px rgba(${r},${g},${b},0.3)` }}
                  />
                  {isPlaying && (
                    <motion.div 
                      className="absolute inset-0 rounded-xl"
                      style={{ boxShadow: `0 0 20px rgba(${r},${g},${b},0.4)` }}
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
              <div className="flex-1 min-w-0">
                <motion.p 
                  key={track.name + '_title'}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-sm font-bold text-white truncate"
                >
                  {track.name}
                </motion.p>
                <p className="text-xs text-[rgba(255,255,255,0.45)] truncate">{track.artists?.map((a: any) => a.name).join(', ')}</p>
                <p className="text-[10px] text-[rgba(255,255,255,0.25)] truncate mt-0.5">{track.album?.name}</p>
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="h-[5px] bg-white/8 rounded-full overflow-hidden relative group">
                <motion.div 
                  className="h-full rounded-full transition-all duration-1000 ease-linear"
                  style={{ 
                    width: `${Math.min(progressPercent, 100)}%`,
                    background: `linear-gradient(90deg, rgb(${r},${g},${b}), rgb(${Math.min(r+40,255)},${Math.min(g+40,255)},${Math.min(b+40,255)}))`,
                  }}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ 
                    left: `${Math.min(progressPercent, 100)}%`,
                    transform: `translate(-50%, -50%)`,
                    backgroundColor: `rgb(${r},${g},${b})`,
                    boxShadow: `0 0 6px rgba(${r},${g},${b},0.5)`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-[rgba(255,255,255,0.25)] font-mono">
                <span>{formatTime(displayProgress)}</span>
                <span>{formatTime(track.duration_ms)}</span>
              </div>
            </div>

            {/* Playback controls */}
            <div className="flex items-center justify-center gap-3">
              <button 
                onClick={() => setShuffle(!playingData?.shuffle_state)} 
                className={`p-2 rounded-full transition-all ${playingData?.shuffle_state ? '' : 'text-[var(--text-tertiary)] hover:text-white'}`}
                style={playingData?.shuffle_state ? { color: `rgb(${r},${g},${b})` } : {}}
              >
                <Shuffle className="w-4 h-4" />
              </button>
              <button onClick={() => handlePlayback('previous')} className="p-2 text-[var(--text-secondary)] hover:text-white transition-all"><SkipBack className="w-5 h-5" fill="currentColor" /></button>
              <button 
                onClick={() => handlePlayback(isPlaying ? 'pause' : 'play')} 
                className="p-3.5 rounded-full hover:scale-105 transition-all shadow-lg"
                style={{ 
                  background: `rgb(${r},${g},${b})`,
                  color: (r * 0.299 + g * 0.587 + b * 0.114) > 150 ? '#000' : '#fff',
                  boxShadow: `0 4px 15px rgba(${r},${g},${b},0.4)`,
                }}
              >
                {isPlaying ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
              </button>
              <button onClick={() => handlePlayback('next')} className="p-2 text-[var(--text-secondary)] hover:text-white transition-all"><SkipForward className="w-5 h-5" fill="currentColor" /></button>
              <button 
                onClick={() => {
                  const modes: ('off' | 'context' | 'track')[] = ['off', 'context', 'track'];
                  const currentIdx = modes.indexOf(playingData?.repeat_state || 'off');
                  const nextMode = modes[(currentIdx + 1) % modes.length];
                  setRepeatMode(nextMode);
                }} 
                className={`p-2 rounded-full transition-all relative ${
                  playingData?.repeat_state === 'track' ? 'bg-white/10' :
                  playingData?.repeat_state === 'context' ? '' :
                  'text-[var(--text-tertiary)] hover:text-white'
                }`}
                style={playingData?.repeat_state !== 'off' ? { color: `rgb(${r},${g},${b})` } : {}}
                title={`Repeat: ${playingData?.repeat_state || 'off'}`}
              >
                {playingData?.repeat_state === 'track' ? <Repeat1 className="w-4 h-4" /> : <Repeat className="w-4 h-4" />}
                {playingData?.repeat_state !== 'off' && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ backgroundColor: `rgb(${r},${g},${b})` }} />
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center space-y-4">
            <p className="text-sm font-medium text-[var(--text-secondary)]">No active playback</p>
            {deviceId ? (
              <button onClick={transferPlayback} className="px-4 py-2 rounded-xl bg-[#6ee7b7] text-black font-semibold text-xs hover:scale-105 transition-all flex items-center gap-2">
                <MonitorSpeaker className="w-4 h-4" /> Start Web Player
              </button>
            ) : (
              <Loader2 className="w-4 h-4 animate-spin text-[var(--text-tertiary)]" />
            )}
          </div>
        )}

        {/* Top Artists */}
        {topArtists.length > 0 && (
          <div className="border-t border-[rgba(255,255,255,0.06)] pt-4 mt-auto">
            <h4 className="text-[10px] font-medium text-[rgba(255,255,255,0.35)] uppercase tracking-[0.22em] mb-3">Top Artists</h4>
            <div className="flex gap-3">
              {topArtists.map(artist => (
                <div key={artist.id} className="flex flex-col items-center gap-1.5 flex-1 min-w-0">
                  <img src={artist.images?.[0]?.url} alt={artist.name} className="w-8 h-8 rounded-full border border-white/10 object-cover" />
                  <span className="text-[9px] text-[var(--text-secondary)] text-center truncate w-full px-1">{artist.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
