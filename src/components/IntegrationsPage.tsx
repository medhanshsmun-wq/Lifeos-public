'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plug, GitBranch, Calendar, Music, BookOpen, Heart, Check, ExternalLink, Download, X, Copy } from 'lucide-react';
import { db, type UserSettings } from '@/lib/db';
import { serverDb } from '@/lib/serverDb';
import { useSpotify } from '@/lib/SpotifyContext';
import { useAuth } from '@/components/auth/AuthContext';
import SystemModal from './SystemModal';

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

// ─── Apple Health Setup Modal ───────────────────────────────
interface HealthSyncGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  email: string;
  serverUrl: string;
}

function HealthSyncGuideModal({ isOpen, onClose, email, serverUrl }: HealthSyncGuideModalProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  if (!isOpen) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="glass-card w-full max-w-[650px] max-h-[85vh] overflow-y-auto p-6 relative space-y-6">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white/70 hover:text-white transition-all">
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[rgba(255,59,48,0.1)]">
            <Heart className="w-5 h-5 text-[#ff3b30]" />
          </div>
          <div>
            <h2 className="text-lg font-bold">iOS Apple Health Sync Guide</h2>
            <p className="text-xs text-[var(--text-tertiary)]">Step-by-step setup for your iPhone</p>
          </div>
        </div>

        <div className="space-y-4 text-xs text-[var(--text-secondary)] leading-relaxed">
          <p>
            LifeOS integrates with your iPhone's local health database using a custom iOS Shortcut. Once configured, your daily health stats will sync seamlessly to your central dashboard in the background!
          </p>

          <div className="border border-white/5 bg-black/40 rounded-xl p-4 space-y-3 font-mono">
            <h3 className="text-[11px] font-bold text-white uppercase tracking-wider">📋 Copy-Paste Details</h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-[9px] text-[var(--text-tertiary)] block">API ENDPOINT URL</span>
                  <span className="text-white text-xs select-all">{serverUrl}</span>
                </div>
                <button onClick={() => copyToClipboard(serverUrl, 'url')} className="shrink-0 p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-[var(--accent-cyan)] flex items-center gap-1 transition-all">
                  {copiedField === 'url' ? 'Copied!' : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>

              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/5">
                <div>
                  <span className="text-[9px] text-[var(--text-tertiary)] block">ACCOUNT EMAIL</span>
                  <span className="text-white text-xs select-all">{email}</span>
                </div>
                <button onClick={() => copyToClipboard(email, 'email')} className="shrink-0 p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-[10px] text-[var(--accent-cyan)] flex items-center gap-1 transition-all">
                  {copiedField === 'email' ? 'Copied!' : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold flex items-center gap-2 text-white">🛠️ Setup Instructions</h3>
            
            <div className="space-y-4 border-l border-white/10 pl-4 ml-2">
              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-[#ff3b30] shadow-[0_0_8px_rgba(255,59,48,0.6)]" />
                <span className="font-bold text-white block">Step 1: Open Shortcuts app</span>
                <span>Launch the **Shortcuts** app on your iPhone and create a new personal shortcut.</span>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-[#ff3b30]" />
                <span className="font-bold text-white block">Step 2: Collect Health Samples</span>
                <span>Add the **"Find Health Samples"** or **"Get Health Data"** actions for:</span>
                <ul className="list-disc pl-4 mt-1 text-[11px] text-[var(--text-tertiary)] space-y-1">
                  <li>**Steps**: Set Start Date to **Today** and Group By **Sum**</li>
                  <li>**Distance**: Set Start Date to **Today** and Group By **Sum**</li>
                  <li>**Active Energy (Calories)**: Set Start Date to **Today** and Group By **Sum**</li>
                  <li>**Active Minutes**: Set Start Date to **Today** and Group By **Sum**</li>
                </ul>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-[#ff3b30]" />
                <span className="font-bold text-white block">Step 3: Add URL Action</span>
                <span>Add the **"Get Contents of URL"** action and configure it:</span>
                <ul className="list-disc pl-4 mt-1 text-[11px] text-[var(--text-tertiary)] space-y-1">
                  <li>Set URL to the **API Endpoint URL** copied above.</li>
                  <li>Set Method to **POST**.</li>
                  <li>Under Request Body, select **JSON** and add these key-value pairs:
                    <ul className="list-none pl-2 mt-1 space-y-0.5 font-mono text-[10px] text-white/90">
                      <li>• `apiKey`: `[Your APPLE_HEALTH_SECRET]`</li>
                      <li>• `email`: `[Your Account Email copied above]`</li>
                      <li>• `steps`: Select the Steps Sample output (Sum)</li>
                      <li>• `distance`: Select the Distance Sample output (Sum)</li>
                      <li>• `caloriesBurned`: Select the Active Energy output (Sum)</li>
                      <li>• `activeMinutes`: Select the Active Minutes output (Sum)</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div className="relative">
                <div className="absolute -left-[21px] top-0.5 w-2 h-2 rounded-full bg-[#ff3b30]" />
                <span className="font-bold text-white block">Step 4: Enable Automation Trigger</span>
                <span>Go to the **Automation** tab in your iPhone's Shortcuts app:</span>
                <ul className="list-disc pl-4 mt-1 text-[11px] text-[var(--text-tertiary)] space-y-1">
                  <li>Create a **Personal Automation** (e.g., triggered at **Time of Day**: 10:00 PM, or every time you close your Fitness App).</li>
                  <li>Configure it to run the Shortcut in the background without asking.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white hover:opacity-90 font-medium text-xs transition-all">
            Done, Ready to Sync!
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasHealthData, setHasHealthData] = useState(false);
  const { forceFetch } = useSpotify();
  
  const { user } = useAuth();
  const [showHealthGuide, setShowHealthGuide] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [modal, setModal] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setServerUrl(window.location.origin + '/api/health-sync');
    }
  }, []);

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
        setModal({
          isOpen: true,
          type: 'alert',
          title: 'Spotify Setup Required',
          message: 'Please configure your Spotify Client ID in Settings first to authorize integration.',
          onConfirm: () => {
            setModal(null);
            router.push('/settings');
          }
        });
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
                {int.name === 'Apple Health' && int.connected && (
                  <button 
                    onClick={() => setShowHealthGuide(true)} 
                    className="mt-3 text-[10px] text-[var(--accent-cyan)] flex items-center gap-1 hover:underline font-mono uppercase tracking-wider font-bold"
                  >
                    <ExternalLink className="w-3 h-3" /> Get iOS Shortcut Guide
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <HealthSyncGuideModal 
        isOpen={showHealthGuide} 
        onClose={() => setShowHealthGuide(false)} 
        email={user?.email || ''} 
        serverUrl={serverUrl} 
      />

      <SystemModal 
        isOpen={!!modal?.isOpen} 
        type={modal?.type || 'alert'} 
        title={modal?.title || ''} 
        message={modal?.message || ''} 
        defaultValue={modal?.defaultValue} 
        onConfirm={modal?.onConfirm || (() => {})} 
        onCancel={() => setModal(null)} 
      />
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
