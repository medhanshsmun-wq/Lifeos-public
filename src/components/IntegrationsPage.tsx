'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plug, GitBranch, Calendar, Music, BookOpen, Heart, Check, ExternalLink, Download } from 'lucide-react';
import { db, type UserSettings } from '@/lib/db';
import { serverDb } from '@/lib/serverDb';
import { useSpotify } from '@/lib/SpotifyContext';

const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

// Spotify requires 127.0.0.1 instead of localhost since 2025 security policy
// Dynamically computed to prevent any mismatch between auth request and token exchange
const getSpotifyRedirectUri = () => {
  if (typeof window !== 'undefined') {
    const origin = window.location.origin;
    if (origin.includes('localhost')) {
      return origin.replace('localhost', '127.0.0.1') + '/api/auth/callback/spotify';
    }
    return `${origin}/api/auth/callback/spotify`;
  }
  return 'http://127.0.0.1:3000/api/auth/callback/spotify';
};

function IntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasHealthData, setHasHealthData] = useState(false);
  const { forceFetch } = useSpotify();

  useEffect(() => {
    const init = async () => {
      const s = await db.settings.toArray();
      if (s.length > 0) setSettings(s[0]);

      const fitnessCount = await db.fitness.count();
      setHasHealthData(fitnessCount > 0);

      // Handle Spotify Callback
      const code = searchParams.get('code');
      if (code && s.length > 0 && s[0].spotifyClientId && s[0].spotifyClientSecret && !isConnecting) {
        setIsConnecting(true);
        try {
          const redirectUri = getSpotifyRedirectUri();
          const res = await fetch('/api/spotify/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code,
              clientId: s[0].spotifyClientId,
              clientSecret: s[0].spotifyClientSecret,
              redirectUri
            })
          });
          const data = await res.json();
          if (data.access_token) {
            const updated = {
              ...s[0],
              spotifyAccessToken: data.access_token,
              spotifyRefreshToken: data.refresh_token,
              spotifyExpiresAt: Date.now() + (data.expires_in * 1000)
            };
            await db.settings.put(updated);
            setSettings(updated);
            await forceFetch();
            router.replace('/integrations'); // Clean URL
          }
        } catch (e) {
          console.error('Spotify auth error', e);
        } finally {
          setIsConnecting(false);
        }
      }
    };
    init();
  }, [searchParams, router, isConnecting, forceFetch]);

  const handleConnect = async (name: string) => {
    if (name === 'Spotify') {
      if (!settings?.spotifyClientId) {
        alert('Please configure your Spotify Client ID in Settings first.');
        router.push('/settings');
        return;
      }
      const scope = 'user-read-private user-read-email user-top-read user-read-recently-played user-read-playback-state user-modify-playback-state streaming user-library-read playlist-read-private playlist-read-collaborative';
      const redirectUri = getSpotifyRedirectUri();
      const authUrl = `https://accounts.spotify.com/authorize?client_id=${settings.spotifyClientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
      window.location.href = authUrl;
    } else if (name === 'Apple Health' && settings?.id) {
      await db.settings.update(settings.id, { appleHealthEnabled: true });
      try {
        await serverDb.settings.update(settings.id, { appleHealthEnabled: true });
      } catch (err) {
        console.warn('Failed to sync Apple Health enabled connection to SQLite', err);
      }
      setSettings(prev => prev ? { ...prev, appleHealthEnabled: true } : prev);
    }
  };

  const handleDisconnect = async (name: string) => {
    if (name === 'Spotify' && settings?.id) {
      await db.settings.update(settings.id, {
        spotifyAccessToken: '',
        spotifyRefreshToken: '',
        spotifyExpiresAt: 0
      });
      setSettings(prev => prev ? { ...prev, spotifyAccessToken: '', spotifyRefreshToken: '', spotifyExpiresAt: 0 } : prev);
    } else if (name === 'Apple Health' && settings?.id) {
      await db.settings.update(settings.id, { appleHealthEnabled: false });
      try {
        await serverDb.settings.update(settings.id, { appleHealthEnabled: false });
      } catch (err) {
        console.warn('Failed to sync Apple Health disabled connection to SQLite', err);
      }
      setSettings(prev => prev ? { ...prev, appleHealthEnabled: false } : prev);
    }
  };

  const integrations = [
    { name: 'GitHub', desc: 'Track commits, repos, and coding streaks', icon: GitBranch, connected: !!settings?.githubToken, color: '#ffffff', available: true },
    { name: 'Apple Health', desc: 'Sync steps, distance, and activity data', icon: Heart, connected: !!settings?.appleHealthEnabled, color: '#ff3b30', available: true },
    { name: 'Google Calendar', desc: 'Import events and schedule analytics', icon: Calendar, connected: false, color: '#4285f4', available: false },
    { name: 'Spotify', desc: 'Track listening habits and focus music', icon: Music, connected: !!settings?.spotifyAccessToken, color: '#1db954', available: true },
    { name: 'Notion', desc: 'Import notes and knowledge base', icon: BookOpen, connected: false, color: '#ffffff', available: false },
  ];

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }} className="max-w-[1000px] mx-auto space-y-6">
        <motion.div variants={fi} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[rgba(59,130,246,0.1)]"><Plug className="w-5 h-5 text-[var(--accent-blue)]" /></div>
          <div className="flex-1"><h1 className="text-2xl font-bold">Integrations</h1><p className="text-xs text-[var(--text-tertiary)] font-mono">Modular, opt-in connections</p></div>
          <a href="/integrations-setup-guide.pdf" target="_blank" download className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all">
            <Download className="w-4 h-4" />
            Setup Guide
          </a>
        </motion.div>

        <motion.div variants={fi} className="p-3 rounded-xl bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.1)]">
          <p className="text-xs text-[var(--accent-green)]">🔒 All integrations are optional, modular, and revocable. Your data stays local-first.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations.map(int => (
            <motion.div key={int.name} variants={fi} className={`glass-card p-5 flex items-start gap-4 hover:border-[var(--border-glow)] transition-all ${!int.available ? 'opacity-60 grayscale-[0.5]' : ''}`}>
              <div className="p-3 rounded-xl bg-[var(--bg-hover)]"><int.icon className="w-5 h-5" style={{ color: int.color }} /></div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-semibold">{int.name}</h3>
                  {int.connected ? (
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[10px] text-[var(--accent-green)]"><Check className="w-3 h-3" /> Connected</span>
                      <button onClick={() => handleDisconnect(int.name)} className="px-2 py-1 rounded border border-red-500/20 text-[10px] text-red-400 hover:bg-red-500/10 transition-colors">Disconnect</button>
                    </div>
                  ) : int.available ? (
                    <button onClick={() => handleConnect(int.name)} className="px-3 py-1 rounded-lg text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] border border-[var(--border-subtle)] transition-colors">
                      {isConnecting && int.name === 'Spotify' ? 'Connecting...' : 'Connect'}
                    </button>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider font-bold">Coming in Future</span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-tertiary)]">{int.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsContent />
    </Suspense>
  );
}
