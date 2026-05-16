'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bot, FolderKanban, Gamepad2, Dumbbell, CandlestickChart,
  GraduationCap, BarChart3, FileText, Plug, Download, Settings,
  GitBranch, Music, Play, Pause, SkipForward, Search, X, Zap, ChevronRight,
} from 'lucide-react';
import { useSpotify } from '@/lib/SpotifyContext';

const NAV = [
  { section: 'Core', items: [
    { label: 'Command', icon: LayoutDashboard, href: '/', accent: 'var(--accent)' },
    { label: 'Copilot', icon: Bot, href: '/copilot', accent: 'var(--accent-2)' },
  ]},
  { section: 'Life', items: [
    { label: 'Projects', icon: FolderKanban, href: '/projects', accent: 'var(--blue)' },
    { label: 'Hobbies', icon: Gamepad2, href: '/hobbies', accent: 'var(--accent-3,#ec4899)' },
    { label: 'Fitness', icon: Dumbbell, href: '/fitness', accent: 'var(--green)' },
    { label: 'Study', icon: GraduationCap, href: '/study', accent: 'var(--yellow)' },
  ]},
  { section: 'Finance', items: [
    { label: 'Trading', icon: CandlestickChart, href: '/finance', accent: 'var(--orange)' },
  ]},
  { section: 'Intel', items: [
    { label: 'Analytics', icon: BarChart3, href: '/analytics', accent: 'var(--accent)' },
    { label: 'Reports', icon: FileText, href: '/reports', accent: 'var(--accent-2)' },
  ]},
  { section: 'Connect', items: [
    { label: 'Integrations', icon: Plug, href: '/integrations', accent: 'var(--blue)' },
    { label: 'GitHub', icon: GitBranch, href: '/github', accent: '#fff' },
    { label: 'Spotify', icon: Music, href: '/spotify', accent: '#1db954' },
  ]},
  { section: 'System', items: [
    { label: 'Exports', icon: Download, href: '/exports', accent: 'var(--accent-3,#ec4899)' },
    { label: 'Settings', icon: Settings, href: '/settings', accent: 'var(--text-1)' },
  ]},
];

export default function Sidebar() {
  const path = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState('');
  const { playingData, handlePlayback, isConnected } = useSpotify();

  const track = playingData?.item;
  const playing = playingData?.is_playing;

  const filtered = useMemo(() => {
    if (!query.trim()) return NAV;
    const q = query.toLowerCase();
    return NAV.map(g => ({ ...g, items: g.items.filter(i => i.label.toLowerCase().includes(q)) })).filter(g => g.items.length > 0);
  }, [query]);

  return (
    <motion.aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { setExpanded(false); setQuery(''); }}
      initial={false}
      animate={{ width: expanded ? 240 : 64 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full z-30 flex-shrink-0 m-2 rounded-2xl glass-heavy"
      style={{ marginRight: 0, borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
    >
      {/* Logo + AI pulse */}
      <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0 relative">
          <img src="/LOGO.png" alt="LifeOS" className="w-full h-full object-cover" />
          <motion.div
            className="absolute inset-0 rounded-xl"
            animate={{ boxShadow: ['0 0 0px var(--glow-accent)', '0 0 12px var(--glow-accent)', '0 0 0px var(--glow-accent)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap flex items-center gap-2"
            >
              <span className="text-base font-bold gradient-text tracking-tight">LifeOS</span>
              <span className="text-[8px] text-[var(--text-3)] font-mono bg-white/5 px-1.5 py-0.5 rounded uppercase tracking-widest">v3</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-3 pb-1">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-3)]" />
              <input type="text" placeholder="Navigate..." value={query} onChange={e => setQuery(e.target.value)}
                className="w-full bg-white/[.03] border border-[var(--border)] rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-[var(--text-0)] placeholder:text-[var(--text-3)] focus:outline-none focus:border-[var(--accent)]/20 transition-colors"
              />
              {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-3)] hover:text-white"><X className="w-3 h-3" /></button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5">
        {filtered.map(group => (
          <div key={group.section}>
            {expanded && (
              <div className="px-2 pt-3 pb-1">
                <span className="text-[9px] font-semibold uppercase tracking-[.14em] text-[var(--text-3)]">{group.section}</span>
              </div>
            )}
            {!expanded && <div className="h-1.5" />}
            {group.items.map(item => {
              const active = path === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className={`group flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-200 relative ${
                    active ? 'text-[var(--text-0)]' : 'text-[var(--text-2)] hover:text-[var(--text-0)] hover:bg-white/[.03]'
                  }`}
                >
                  {active && (
                    <motion.div layoutId="nav-active" className="absolute inset-0 rounded-xl bg-white/[.05]"
                      style={{ boxShadow: `inset 0 0 0 1px ${item.accent}15, 0 0 20px ${item.accent}08` }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-3 w-full">
                    <Icon className="w-[16px] h-[16px] flex-shrink-0 transition-colors" style={active ? { color: item.accent } : {}} />
                    <AnimatePresence>
                      {expanded && (
                        <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.15 }} className="text-[12px] font-medium whitespace-nowrap overflow-hidden"
                        >{item.label}</motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  {active && <motion.div layoutId="nav-dot" className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full" style={{ background: item.accent }} />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Mini Spotify */}
      {isConnected && track && (
        <div className="px-2 pb-1 border-t border-[var(--border)] pt-2 mt-auto">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#1db954]/[.04] border border-[#1db954]/10">
            {!expanded ? (
              <div className="w-full flex justify-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${playing ? 'bg-[#1db954] text-black' : 'bg-white/10 text-white'}`}>
                  <Music className="w-3 h-3" />
                </div>
              </div>
            ) : (
              <>
                <img src={track.album?.images?.[0]?.url} alt="" className="w-7 h-7 rounded shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold text-white truncate">{track.name}</p>
                  <p className="text-[8px] text-[var(--text-2)] truncate">{track.artists?.[0]?.name}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handlePlayback(playing ? 'pause' : 'play')} className="p-1 text-white hover:text-[#1db954]">
                    {playing ? <Pause className="w-3 h-3" fill="currentColor" /> : <Play className="w-3 h-3" fill="currentColor" />}
                  </button>
                  <button onClick={() => handlePlayback('next')} className="p-1 text-[var(--text-2)] hover:text-white">
                    <SkipForward className="w-2.5 h-2.5" fill="currentColor" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* AI Status */}
      <div className="px-3 pb-3 pt-1">
        <div className={`flex items-center ${expanded ? 'gap-2' : 'justify-center'}`}>
          <div className="relative">
            <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
            <motion.div className="absolute inset-0" animate={{ opacity: [0.3, 0.8, 0.3] }} transition={{ duration: 2, repeat: Infinity }}>
              <Zap className="w-3.5 h-3.5 text-[var(--accent)]" style={{ filter: 'blur(4px)' }} />
            </motion.div>
          </div>
          {expanded && <span className="text-[9px] text-[var(--text-2)] font-mono">AI Online</span>}
        </div>
      </div>
    </motion.aside>
  );
}
