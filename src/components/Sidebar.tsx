'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bot, FolderKanban, Gamepad2, Dumbbell, CandlestickChart,
  GraduationCap, BarChart3, FileText, Plug, Download, Settings,
  GitBranch, Music, Play, Pause, SkipForward, Search, X, Menu,
} from 'lucide-react';
import { useSpotify } from '@/lib/SpotifyContext';

const NAV = [
  { section: 'Core', items: [
    { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
    { label: 'Copilot', icon: Bot, href: '/copilot' },
  ]},
  { section: 'Life', items: [
    { label: 'Projects', icon: FolderKanban, href: '/projects' },
    { label: 'Hobbies', icon: Gamepad2, href: '/hobbies' },
    { label: 'Fitness', icon: Dumbbell, href: '/fitness' },
    { label: 'Study', icon: GraduationCap, href: '/study' },
  ]},
  { section: 'Finance', items: [
    { label: 'Trading', icon: CandlestickChart, href: '/finance' },
  ]},
  { section: 'Intel', items: [
    { label: 'Analytics', icon: BarChart3, href: '/analytics' },
    { label: 'Reports', icon: FileText, href: '/reports' },
  ]},
  { section: 'Connect', items: [
    { label: 'Integrations', icon: Plug, href: '/integrations' },
    { label: 'GitHub', icon: GitBranch, href: '/github' },
    { label: 'Spotify', icon: Music, href: '/spotify' },
  ]},
  { section: 'System', items: [
    { label: 'Exports', icon: Download, href: '/exports' },
    { label: 'Settings', icon: Settings, href: '/settings' },
  ]},
];

export default function Sidebar() {
  const path = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    <>
    {/* Desktop Sidebar */}
    <motion.aside
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => { setExpanded(false); setQuery(''); }}
      initial={false}
      animate={{ width: expanded ? 220 : 60 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="hidden md:flex relative flex-col h-full z-30 flex-shrink-0"
      style={{
        background: '#060608',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0">
        <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
          <img src="/LOGO.png" alt="LifeOS" className="w-full h-full object-cover" />
        </div>
        <AnimatePresence>
          {expanded && (
            <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -6 }} transition={{ duration: 0.12 }}
              className="overflow-hidden whitespace-nowrap flex items-center gap-2"
            >
              <span className="text-sm font-semibold text-white tracking-tight">LifeOS</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Search */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="px-3 pb-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[rgba(255,255,255,0.25)]" />
              <input type="text" placeholder="Navigate..." value={query} onChange={e => setQuery(e.target.value)}
                className="w-full bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.06)] rounded-lg pl-8 pr-7 py-1.5 text-[11px] text-white placeholder:text-[rgba(255,255,255,0.25)] focus:outline-none focus:border-[rgba(110,231,183,0.25)] transition-colors"
              />
              {query && <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[rgba(255,255,255,0.25)] hover:text-white"><X className="w-3 h-3" /></button>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-1 px-2 space-y-0.5">
        {filtered.map(group => (
          <div key={group.section}>
            {expanded && (
              <div className="px-2 pt-4 pb-1.5">
                <span className="text-[9px] font-medium uppercase tracking-[.18em] text-[rgba(255,255,255,0.25)]">{group.section}</span>
              </div>
            )}
            {!expanded && <div className="h-2" />}
            {group.items.map(item => {
              const active = path === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href}
                  className={`group flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 relative ${
                    active
                      ? 'text-white'
                      : 'text-[rgba(255,255,255,0.40)] hover:text-[rgba(255,255,255,0.70)] hover:bg-[rgba(255,255,255,0.03)]'
                  }`}
                >
                  {active && (
                    <motion.div layoutId="nav-active" className="absolute inset-0 rounded-xl"
                      style={{
                        background: 'rgba(110,231,183,0.06)',
                        border: '1px solid rgba(110,231,183,0.12)',
                      }}
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-3 w-full">
                    <Icon className="w-[15px] h-[15px] flex-shrink-0 transition-colors" style={active ? { color: '#6ee7b7' } : {}} />
                    <AnimatePresence>
                      {expanded && (
                        <motion.span initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: 'auto' }} exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.12 }} className="text-[12px] font-medium whitespace-nowrap overflow-hidden"
                        >{item.label}</motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                  {active && <motion.div layoutId="nav-dot" className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r-full bg-[#6ee7b7]" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Mini Spotify */}
      {isConnected && track && (
        <div className="px-2 pb-1 border-t border-[rgba(255,255,255,0.06)] pt-2 mt-auto">
          <div className="flex items-center gap-2 p-2 rounded-xl" style={{ background: 'rgba(110,231,183,0.04)', border: '1px solid rgba(110,231,183,0.10)' }}>
            {!expanded ? (
              <div className="w-full flex justify-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${playing ? 'bg-[#6ee7b7] text-black' : 'bg-[rgba(255,255,255,0.08)] text-white'}`}>
                  <Music className="w-3 h-3" />
                </div>
              </div>
            ) : (
              <>
                <img src={track.album?.images?.[0]?.url} alt="" className="w-7 h-7 rounded shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-semibold text-white truncate">{track.name}</p>
                  <p className="text-[8px] text-[rgba(255,255,255,0.40)] truncate">{track.artists?.[0]?.name}</p>
                </div>
                <div className="flex items-center gap-0.5">
                  <button onClick={() => handlePlayback(playing ? 'pause' : 'play')} className="p-1 text-white hover:text-[#6ee7b7]">
                    {playing ? <Pause className="w-3 h-3" fill="currentColor" /> : <Play className="w-3 h-3" fill="currentColor" />}
                  </button>
                  <button onClick={() => handlePlayback('next')} className="p-1 text-[rgba(255,255,255,0.35)] hover:text-white">
                    <SkipForward className="w-2.5 h-2.5" fill="currentColor" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Status dot */}
      <div className="px-3 pb-3 pt-1">
        <div className={`flex items-center ${expanded ? 'gap-2' : 'justify-center'}`}>
          <div className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7]" style={{ boxShadow: '0 0 6px rgba(110,231,183,0.5)' }} />
          {expanded && <span className="text-[9px] text-[rgba(255,255,255,0.35)] font-mono">Online</span>}
        </div>
      </div>
    </motion.aside>

    {/* Mobile Bottom Navigation */}
    <aside className="md:hidden flex items-center justify-around h-16 w-full bg-[#060608] border-t border-[rgba(255,255,255,0.06)] z-40 flex-shrink-0">
      <Link href="/" className={`p-3 ${path === '/' ? 'text-[#6ee7b7]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}><LayoutDashboard className="w-5 h-5"/></Link>
      <Link href="/copilot" className={`p-3 ${path === '/copilot' ? 'text-[#6ee7b7]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}><Bot className="w-5 h-5"/></Link>
      <Link href="/projects" className={`p-3 ${path === '/projects' ? 'text-[#6ee7b7]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}><FolderKanban className="w-5 h-5"/></Link>
      {isConnected && track && (
        <button onClick={() => handlePlayback(playing ? 'pause' : 'play')} className={`p-3 ${playing ? 'text-[#6ee7b7]' : 'text-white'}`}>
          <Music className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => setMobileMenuOpen(true)} className="p-3 text-[rgba(255,255,255,0.4)] hover:text-white"><Menu className="w-5 h-5"/></button>
    </aside>

    {/* Mobile Full Menu Overlay */}
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="md:hidden fixed inset-0 z-50 bg-[#060608] flex flex-col"
        >
          <div className="flex items-center justify-between p-4 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg overflow-hidden flex items-center justify-center">
                <img src="/LOGO.png" alt="LifeOS" className="w-full h-full object-cover" />
              </div>
              <span className="text-sm font-semibold text-white">LifeOS Navigation</span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="p-2 text-[rgba(255,255,255,0.4)] hover:text-white bg-[rgba(255,255,255,0.05)] rounded-full">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-20">
            {NAV.map(group => (
              <div key={group.section}>
                <div className="mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[rgba(255,255,255,0.3)]">{group.section}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {group.items.map(item => {
                    const active = path === item.href;
                    const Icon = item.icon;
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                          active
                            ? 'bg-[rgba(110,231,183,0.1)] border border-[rgba(110,231,183,0.2)] text-white'
                            : 'bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white'
                        }`}
                      >
                        <Icon className="w-4 h-4" style={active ? { color: '#6ee7b7' } : {}} />
                        <span className="text-xs font-medium">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
