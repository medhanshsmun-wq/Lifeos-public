'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db, type UserSettings } from '@/lib/db';
import { serverDb } from '@/lib/serverDb';
import { Settings as SettingsIcon, Key, GitBranch, Shield, Palette, User, Save, Check, Database, ArrowRight, Loader2 } from 'lucide-react';
import SystemModal from './SystemModal';

const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({ geminiApiKey: '', githubToken: '', githubUsername: '', cloudBackupEnabled: false, theme: 'dark', accentColor: '#00F5FF', dashboardWidgets: ['todos', 'productivity', 'habits', 'ai-insights', 'recent-activity', 'integrations'], name: '', avatar: '', propFirmAccountsCount: 1, spotifyClientId: '', spotifyClientSecret: '' });
  const [saved, setSaved] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [migrationStatus, setMigrationStatus] = useState<string | null>(null);
  const [modal, setModal] = useState<{ isOpen: boolean, type: 'alert' | 'confirm' | 'prompt', title: string, message: string, defaultValue?: string, onConfirm: (v?: string) => void } | null>(null);
  const [spotifyRedirectUri, setSpotifyRedirectUri] = useState('http://127.0.0.1:3000/api/auth/callback/spotify');

  useEffect(() => {
    db.settings.toArray().then(s => { 
      if (s.length) {
        setSettings({
          ...s[0],
          dashboardWidgets: s[0].dashboardWidgets || ['todos', 'productivity', 'habits', 'ai-insights', 'recent-activity', 'integrations'],
          accentColor: s[0].accentColor || '#00F5FF'
        });
      } 
    });

    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('localhost')) {
        setSpotifyRedirectUri(origin.replace('localhost', '127.0.0.1') + '/api/auth/callback/spotify');
      } else {
        setSpotifyRedirectUri(`${origin}/api/auth/callback/spotify`);
      }
    }
  }, []);

  const save = async () => {
    await db.settings.put(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const migrateToBackend = async () => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Migrate to Proper Backend',
      message: 'This will move all your local browser data to the server-side SQLite database. Existing backend data may be overwritten. Proceed?',
      onConfirm: async () => {
        setModal(null);
        setMigrating(true);
        const errors: string[] = [];
        let totalMigrated = 0;
        try {
          // Map of Dexie table names → serverDb table names
          const tables: Array<{ dexie: string; server: string }> = [
            { dexie: 'settings', server: 'settings' },
            { dexie: 'projects', server: 'projects' },
            { dexie: 'finance', server: 'finance' },
            { dexie: 'fitness', server: 'fitness' },
            { dexie: 'diet', server: 'diet' },
            { dexie: 'gym', server: 'gym' },
            { dexie: 'hobbies', server: 'hobbies' },
            { dexie: 'subjects', server: 'subjects' },
            { dexie: 'study', server: 'study' },
            { dexie: 'studyAssignments', server: 'studyAssignments' },
            { dexie: 'habits', server: 'habits' },
            { dexie: 'conversations', server: 'conversations' },
            { dexie: 'weeklyReports', server: 'weeklyReports' },
            { dexie: 'timeline', server: 'timeline' },
            { dexie: 'trades', server: 'trades' },
          ];
          
          for (const { dexie: tableName, server: serverName } of tables) {
            setMigrationStatus(`Migrating ${tableName}...`);
            try {
              // @ts-ignore
              const items = await db[tableName].toArray();
              let tableCount = 0;
              for (const item of items) {
                try {
                  // The API route now handles all data transformation
                  // (stripping IDs, serializing arrays to JSON, converting relations)
                  // @ts-ignore
                  await serverDb[serverName].add(item);
                  tableCount++;
                } catch (itemErr: any) {
                  console.warn(`Failed to migrate ${tableName} item:`, itemErr);
                  errors.push(`${tableName} item: ${itemErr.message?.slice(0, 80)}`);
                }
              }
              totalMigrated += tableCount;
              setMigrationStatus(`Migrated ${tableName}: ${tableCount}/${items.length} items`);
            } catch (tableErr: any) {
              console.error(`Failed to migrate table ${tableName}:`, tableErr);
              errors.push(`${tableName} table: ${tableErr.message?.slice(0, 80)}`);
            }
          }
          
          if (errors.length > 0) {
            setMigrationStatus(`Migration done with ${errors.length} warnings. ${totalMigrated} items migrated.\n\nWarnings:\n${errors.slice(0, 5).join('\n')}${errors.length > 5 ? `\n...and ${errors.length - 5} more` : ''}`);
          } else {
            setMigrationStatus(`Migration complete! ${totalMigrated} items migrated. Refreshing page...`);
            setTimeout(() => window.location.reload(), 2000);
          }
        } catch (e: any) {
          console.error(e);
          setMigrationStatus(`Error: ${e.message}`);
        } finally {
          setMigrating(false);
        }
      }
    });
  };

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }} className="max-w-[800px] mx-auto space-y-6">
        <motion.div variants={fi} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[rgba(136,136,170,0.1)]"><SettingsIcon className="w-5 h-5 text-[var(--text-secondary)]" /></div>
          <div><h1 className="text-2xl font-bold">Settings</h1><p className="text-xs text-[var(--text-tertiary)] font-mono">System configuration & API keys</p></div>
        </motion.div>

        {/* Profile */}
        <motion.div variants={fi} className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><User className="w-4 h-4 text-[var(--accent-cyan)]" /> Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Name</label><input value={settings.name} onChange={e => setSettings({...settings, name: e.target.value})} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[var(--accent-cyan)]" /></div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Prop Firm Accounts</label>
              <input 
                type="number" 
                value={settings.propFirmAccountsCount} 
                onChange={e => setSettings({...settings, propFirmAccountsCount: Math.max(1, parseInt(e.target.value) || 1)})} 
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[var(--accent-cyan)]" 
              />
            </div>
          </div>
        </motion.div>

        {/* API Keys */}
        <motion.div variants={fi} className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Key className="w-4 h-4 text-[var(--accent-purple)]" /> API Configuration</h3>
          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Gemini API Key</label>
            <input type="password" value={settings.geminiApiKey} onChange={e => setSettings({...settings, geminiApiKey: e.target.value})} placeholder="Enter your Gemini API key" className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[var(--accent-purple)]" />
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Get your free API key from <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="text-[var(--accent-cyan)] hover:underline">Google AI Studio</a></p>
          </div>
        </motion.div>

        {/* GitHub */}
        <motion.div variants={fi} className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><GitBranch className="w-4 h-4" /> GitHub Integration</h3>
          <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Username</label><input value={settings.githubUsername} onChange={e => setSettings({...settings, githubUsername: e.target.value})} placeholder="your-username" className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none" /></div>
          <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Personal Access Token</label><input type="password" value={settings.githubToken} onChange={e => setSettings({...settings, githubToken: e.target.value})} placeholder="ghp_..." className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none" /></div>
        </motion.div>

        {/* Spotify */}
        <motion.div variants={fi} className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-[#1db954]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.84.241 1.2zM19.32 10.62C15.24 8.16 8.82 7.92 5.16 9.06c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.26-1.26 11.28-1.02 15.72 1.62.539.3.719 1.02.419 1.56-.239.48-.959.66-1.319.48z"/></svg>
            Spotify Integration
          </h3>
          <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Client ID</label><input value={settings.spotifyClientId || ''} onChange={e => setSettings({...settings, spotifyClientId: e.target.value})} placeholder="Spotify Client ID" className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[#1db954]" /></div>
          <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Client Secret</label><input type="password" value={settings.spotifyClientSecret || ''} onChange={e => setSettings({...settings, spotifyClientSecret: e.target.value})} placeholder="Spotify Client Secret" className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[#1db954]" /></div>
          <p className="text-[10px] text-[var(--text-muted)]">Set redirect URI to <code className="text-[var(--accent-cyan)] font-mono">{spotifyRedirectUri}</code> in your <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-[var(--accent-cyan)] hover:underline">Spotify Developer Dashboard</a>.</p>
        </motion.div>

        {/* System Configuration */}
        <motion.div variants={fi} className="glass p-5 space-y-5">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-[var(--accent)]" /> Appearance</h3>
          
          <div>
            <label className="text-xs font-medium text-[var(--text-1)] mb-3 block">Theme</label>
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {[
                { id: 'midnight', label: 'Midnight', colors: ['#020208','#08081a','#00d4ff'] },
                { id: 'ocean', label: 'Ocean', colors: ['#010c18','#041a30','#06b6d4'] },
                { id: 'forest', label: 'Forest', colors: ['#020d06','#061a0e','#34d399'] },
                { id: 'sunset', label: 'Sunset', colors: ['#0a0304','#1a080a','#f97316'] },
                { id: 'neon', label: 'Neon', colors: ['#06010c','#10041c','#00ff88'] },
                { id: 'arctic', label: 'Arctic', colors: ['#060a10','#0c1520','#7dd3fc'] },
                { id: 'phantom', label: 'Phantom', colors: ['#08040c','#140a1c','#c084fc'] },
                { id: 'solar', label: 'Solar', colors: ['#0c0802','#1a1004','#fbbf24'] },
                { id: 'crimson', label: 'Crimson', colors: ['#0c0204','#1c040a','#fb7185'] },
                { id: 'matrix', label: 'Matrix', colors: ['#000800','#001000','#00ff41'] },
                { id: 'mono', label: 'Mono', colors: ['#0a0a0a','#141414','#a0a0a0'] },
                { id: 'aurora', label: 'Aurora', colors: ['#040810','#081020','#34d399'] },
              ].map(theme => (
                <button key={theme.id}
                  onClick={() => { setSettings({...settings, theme: theme.id}); document.documentElement.setAttribute('data-theme', theme.id); }}
                  className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${settings.theme === theme.id ? 'border-[var(--accent)] bg-[var(--accent)]/5 scale-105' : 'border-[var(--border)] bg-white/[.02] opacity-50 hover:opacity-100'}`}
                >
                  <div className="flex gap-px rounded-md overflow-hidden w-full h-5">
                    {theme.colors.map((c, i) => <div key={i} className="flex-1" style={{ backgroundColor: c }} />)}
                  </div>
                  <span className="text-[9px] font-medium">{theme.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-3 block">Accent Color</label>
            <div className="flex flex-wrap gap-3">
              {['#00F5FF', '#A855F7', '#EC4899', '#22C55E', '#EAB308', '#F97316', '#3B82F6'].map(color => (
                <button
                  key={color}
                  onClick={() => setSettings({...settings, accentColor: color})}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${settings.accentColor === color ? 'border-white scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="pt-2">
            <label className="text-xs font-medium text-[var(--text-secondary)] mb-3 block">Visible Widgets</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { id: 'todos', label: 'Daily To-Do List' },
                { id: 'productivity', label: 'Productivity Score' },
                { id: 'habits', label: 'Habit Tracker' },
                { id: 'ai-insights', label: 'AI Insights' },
                { id: 'recent-activity', label: 'Recent Activity' },
                { id: 'integrations', label: 'Integrations' }
              ].map(widget => (
                <button
                  key={widget.id}
                  onClick={() => {
                    const current = settings.dashboardWidgets || [];
                    const next = current.includes(widget.id)
                      ? current.filter(w => w !== widget.id)
                      : [...current, widget.id];
                    setSettings({...settings, dashboardWidgets: next});
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${(settings.dashboardWidgets || []).includes(widget.id) ? 'bg-[rgba(0,245,255,0.05)] border-[var(--accent-cyan)] text-[var(--text-primary)]' : 'bg-[var(--bg-hover)] border-[var(--border-subtle)] text-[var(--text-tertiary)]'}`}
                >
                  <span className="text-xs font-medium">{widget.label}</span>
                  {(settings.dashboardWidgets || []).includes(widget.id) && <Check className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Backend Migration */}
        <motion.div variants={fi} className="glass-card p-5 border border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold flex items-center gap-2 text-amber-500">
                <Database className="w-4 h-4" /> 
                Backend Migration
              </h3>
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                You are currently using browser-based storage (IndexedDB). Click below to migrate your data to the 
                <strong> proper server-side SQLite database</strong> for permanent persistence and multi-device readiness.
              </p>
            </div>
            <button 
              onClick={migrateToBackend}
              disabled={migrating}
              className="shrink-0 px-4 py-2 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {migrating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowRight className="w-3.5 h-3.5" />}
              {migrating ? 'Migrating...' : 'Migrate Now'}
            </button>
          </div>
          {migrationStatus && (
            <div className="mt-4 p-3 rounded-lg bg-black/40 border border-white/5 font-mono text-[10px] text-amber-200">
              {migrationStatus}
            </div>
          )}
        </motion.div>

        {/* Save */}
        <motion.div variants={fi}>
          <button onClick={save} className={`w-full py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${saved ? 'bg-[var(--accent-green)] text-white' : 'bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white hover:opacity-90'}`}>
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : <><Save className="w-4 h-4" /> Save Settings</>}
          </button>
        </motion.div>

        {/* Danger Zone */}
        <motion.div variants={fi} className="glass-card p-5 mt-8 border border-red-500/20">
          <h3 className="text-sm font-semibold text-red-400 mb-2">Danger Zone</h3>
          <p className="text-xs text-[var(--text-secondary)] mb-4">Permanently delete all your local LifeOS data. This action cannot be undone.</p>
          <button 
            onClick={() => {
              setModal({
                isOpen: true,
                type: 'confirm',
                title: 'Terminate Data Store',
                message: 'Are you absolutely sure? This will permanently delete all your projects, logs, and settings across the entire LifeOS core.',
                onConfirm: async () => {
                  await Promise.all([
                    db.projects.clear(), db.finance.clear(), db.fitness.clear(), 
                    db.diet.clear(), db.gym.clear(), db.hobbies.clear(), 
                    db.study.clear(), db.subjects.clear(), db.studyAssignments.clear(),
                    db.habits.clear(), db.conversations.clear(), db.weeklyReports.clear(), 
                    db.timeline.clear(), db.settings.clear(), db.trades.clear(), db.todos.clear()
                  ]);
                  setModal({
                    isOpen: true,
                    type: 'alert',
                    title: 'Wipe Complete',
                    message: 'All local data clusters have been purged successfully.',
                    onConfirm: () => window.location.reload()
                  });
                }
              });
            }} 
            className="px-4 py-2 rounded-lg text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
          >
            Clear All Local Data
          </button>
        </motion.div>
      </motion.div>

      <SystemModal
        isOpen={!!modal?.isOpen}
        type={modal?.type || 'alert'}
        title={modal?.title || ''}
        message={modal?.message || ''}
        onConfirm={modal?.onConfirm || (() => {})}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}
