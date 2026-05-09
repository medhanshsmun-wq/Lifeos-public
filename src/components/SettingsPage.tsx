'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { db, type UserSettings } from '@/lib/db';
import { Settings as SettingsIcon, Key, GitBranch, Shield, Palette, User, Save, Check } from 'lucide-react';
import SystemModal from './SystemModal';

const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings>({ geminiApiKey: '', githubToken: '', githubUsername: '', cloudBackupEnabled: false, theme: 'dark', accentColor: '#00F5FF', dashboardWidgets: ['productivity', 'habits', 'ai-insights', 'recent-activity', 'integrations'], name: '', avatar: '', propFirmAccountsCount: 1, spotifyClientId: '', spotifyClientSecret: '' });
  const [saved, setSaved] = useState(false);
  const [modal, setModal] = useState<{ isOpen: boolean, type: 'alert' | 'confirm' | 'prompt', title: string, message: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    db.settings.toArray().then(s => { 
      if (s.length) {
        setSettings({
          ...s[0],
          dashboardWidgets: s[0].dashboardWidgets || ['productivity', 'habits', 'ai-insights', 'recent-activity', 'integrations'],
          accentColor: s[0].accentColor || '#00F5FF'
        });
      } 
    });
  }, []);

  const save = async () => {
    await db.settings.put(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 lg:p-8 grid-bg min-h-full">
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
          <p className="text-[10px] text-[var(--text-muted)]">Set redirect URI to <code className="text-[var(--accent-cyan)] font-mono">http://127.0.0.1:3000/api/auth/callback/spotify</code> in your <a href="https://developer.spotify.com/dashboard" target="_blank" rel="noreferrer" className="text-[var(--accent-cyan)] hover:underline">Spotify Developer Dashboard</a>.</p>
        </motion.div>

        {/* Customization */}
        <motion.div variants={fi} className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Palette className="w-4 h-4 text-[var(--accent-cyan)]" /> Customization</h3>
          
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

        {/* Privacy */}
        <motion.div variants={fi} className="glass-card p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-[var(--accent-green)]" /> Privacy & Data</h3>
          <div className="flex items-center justify-between">
            <div><p className="text-sm text-[var(--text-primary)]">Enable Cloud Backup</p><p className="text-xs text-[var(--text-muted)]">Encrypted optional sync to cloud</p></div>
            <button onClick={() => setSettings({...settings, cloudBackupEnabled: !settings.cloudBackupEnabled})} className={`w-12 h-6 rounded-full transition-colors duration-200 ${settings.cloudBackupEnabled ? 'bg-[var(--accent-green)]' : 'bg-[var(--bg-hover)]'} relative`}>
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200 ${settings.cloudBackupEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
          <div className="p-3 rounded-xl bg-[rgba(34,197,94,0.05)] border border-[rgba(34,197,94,0.1)]">
            <p className="text-xs text-[var(--accent-green)] font-medium mb-1">🔒 Privacy First</p>
            <p className="text-[10px] text-[var(--text-tertiary)] leading-relaxed">All data is stored locally in your browser using IndexedDB. Nothing leaves your device unless you explicitly enable cloud backup. All integrations are opt-in and revocable.</p>
          </div>
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
                    db.hobbies.clear(), db.study.clear(), db.habits.clear(), 
                    db.conversations.clear(), db.weeklyReports.clear(), db.timeline.clear()
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
