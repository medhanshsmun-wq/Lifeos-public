'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Bot, FolderKanban, Gamepad2, Dumbbell, CandlestickChart,
  GraduationCap, BarChart3, FileText, Plug, Download, Settings,
  GitBranch, Music, Play, Pause, SkipForward, Search, X, Menu, Flame,
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
    { label: 'Habits', icon: Flame, href: '/habits' },
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

// Unified 5 tabs for phone navigation
const MOBILE_TABS = [
  {
    id: 'core',
    label: 'Core',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/' },
      { label: 'Copilot', icon: Bot, href: '/copilot' },
    ]
  },
  {
    id: 'life',
    label: 'Life',
    items: [
      { label: 'Projects', icon: FolderKanban, href: '/projects' },
      { label: 'Hobbies', icon: Gamepad2, href: '/hobbies' },
      { label: 'Fitness', icon: Dumbbell, href: '/fitness' },
      { label: 'Study', icon: GraduationCap, href: '/study' },
      { label: 'Habits', icon: Flame, href: '/habits' },
    ]
  },
  {
    id: 'finance',
    label: 'Finance',
    items: [
      { label: 'Trading', icon: CandlestickChart, href: '/finance' },
    ]
  },
  {
    id: 'intel',
    label: 'Intel',
    items: [
      { label: 'Analytics', icon: BarChart3, href: '/analytics' },
      { label: 'Reports', icon: FileText, href: '/reports' },
    ]
  },
  {
    id: 'system',
    label: 'System',
    items: [
      { label: 'Integrations', icon: Plug, href: '/integrations' },
      { label: 'GitHub', icon: GitBranch, href: '/github' },
      { label: 'Spotify', icon: Music, href: '/spotify' },
      { label: 'Exports', icon: Download, href: '/exports' },
      { label: 'Settings', icon: Settings, href: '/settings' },
    ]
  }
];

export default function Sidebar() {
  const path = usePathname();
  const [expanded, setExpanded] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { playingData, handlePlayback, isConnected } = useSpotify();

  // Swipable mobile tabs logic
  const activeTabIdxFromPath = useMemo(() => {
    if (['/', '/copilot'].includes(path)) return 0;
    if (['/projects', '/hobbies', '/fitness', '/study', '/habits'].includes(path)) return 1;
    if (['/finance'].includes(path)) return 2;
    if (['/analytics', '/reports'].includes(path)) return 3;
    return 4; // default to System tab
  }, [path]);

  const [activeTabIdx, setActiveTabIdx] = useState(activeTabIdxFromPath);

  useEffect(() => {
    setActiveTabIdx(activeTabIdxFromPath);
  }, [activeTabIdxFromPath]);

  // Touch Swipe Gesture Detection
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 60;
    const isRightSwipe = distance < -60;

    if (isLeftSwipe && activeTabIdx < MOBILE_TABS.length - 1) {
      setActiveTabIdx(p => p + 1);
    } else if (isRightSwipe && activeTabIdx > 0) {
      setActiveTabIdx(p => p - 1);
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

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

    {/* Mobile Bottom Navigation Bar */}
    <aside className="md:hidden flex items-center justify-around h-16 w-full bg-[#060608]/90 backdrop-blur-md border-t border-[rgba(255,255,255,0.06)] z-40 flex-shrink-0">
      <Link href="/" className={`p-3 transition-colors ${path === '/' ? 'text-[#6ee7b7]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}>
        <LayoutDashboard className="w-5 h-5"/>
      </Link>
      <Link href="/copilot" className={`p-3 transition-colors ${path === '/copilot' ? 'text-[#6ee7b7]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}>
        <Bot className="w-5 h-5"/>
      </Link>
      <Link href="/projects" className={`p-3 transition-colors ${path === '/projects' ? 'text-[#6ee7b7]' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}>
        <FolderKanban className="w-5 h-5"/>
      </Link>
      {isConnected && track && (
        <button onClick={() => handlePlayback(playing ? 'pause' : 'play')} className={`p-3 transition-colors ${playing ? 'text-[#6ee7b7]' : 'text-[rgba(255,255,255,0.4)]'}`}>
          <Music className="w-5 h-5" />
        </button>
      )}
      <button onClick={() => setMobileMenuOpen(true)} className="p-3 text-[rgba(255,255,255,0.4)] hover:text-white transition-colors relative">
        <Menu className="w-5 h-5"/>
        <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-[#6ee7b7]" />
      </button>
    </aside>

    {/* Backdrop Tint */}
    {mobileMenuOpen && (
      <div 
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
        onClick={() => setMobileMenuOpen(false)}
      />
    )}

    {/* Mobile Full Swipable Menu Drawer Sheet */}
    <AnimatePresence>
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 220 }}
          className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-[#060608]/95 backdrop-blur-xl border-t border-[rgba(255,255,255,0.08)] flex flex-col rounded-t-[24px] max-h-[80vh] overflow-hidden"
          style={{ boxShadow: '0 -10px 25px -5px rgba(0, 0, 0, 0.6)' }}
        >
          {/* Grabber Drag Handle */}
          <div className="w-full flex justify-center py-3 flex-shrink-0" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-12 h-1 rounded-full bg-[rgba(255,255,255,0.15)] hover:bg-[rgba(255,255,255,0.3)] transition-colors" />
          </div>

          <div className="flex items-center justify-between px-5 pb-3 border-b border-[rgba(255,255,255,0.05)] flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg overflow-hidden flex items-center justify-center bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)]">
                <img src="/LOGO.png" alt="Logo" className="w-4 h-4 object-cover" />
              </div>
              <span className="text-xs font-bold text-white font-mono uppercase tracking-wider">Neural Navigator</span>
            </div>
            <button 
              onClick={() => setMobileMenuOpen(false)} 
              className="p-1.5 text-[rgba(255,255,255,0.4)] hover:text-white bg-[rgba(255,255,255,0.05)] rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrolling Tab Bar */}
          <div className="flex overflow-x-auto scrollbar-none px-4 py-3 bg-[rgba(255,255,255,0.01)] border-b border-[rgba(255,255,255,0.04)] flex-shrink-0 gap-2">
            {MOBILE_TABS.map((tab, idx) => {
              const active = idx === activeTabIdx;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabIdx(idx)}
                  className={`relative px-4 py-2 text-xs font-semibold rounded-xl transition-all flex-shrink-0 ${
                    active 
                      ? 'text-white bg-[rgba(110,231,183,0.08)] border border-[rgba(110,231,183,0.15)]' 
                      : 'text-[rgba(255,255,255,0.40)] border border-transparent hover:text-white'
                  }`}
                >
                  {tab.label}
                  {active && (
                    <motion.div 
                      layoutId="mobile-tab-indicator" 
                      className="absolute bottom-0 inset-x-4 h-[2px] bg-[#6ee7b7] rounded-full" 
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Swipeable Grid Panel */}
          <div className="flex-1 overflow-y-auto p-5 pb-6">
            <div 
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              className="grid grid-cols-2 gap-3 min-h-[220px]"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTabIdx}
                  initial={{ opacity: 0, x: 25 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -25 }}
                  transition={{ duration: 0.16 }}
                  className="col-span-2 grid grid-cols-2 gap-3"
                >
                  {MOBILE_TABS[activeTabIdx].items.map(item => {
                    const active = path === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all border ${
                          active
                            ? 'bg-[rgba(110,231,183,0.06)] border-[rgba(110,231,183,0.20)] text-white shadow-[0_0_15px_rgba(110,231,183,0.03)]'
                            : 'bg-[rgba(255,255,255,0.02)] border-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.6)] hover:bg-[rgba(255,255,255,0.04)] hover:text-white'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl mb-2.5 transition-all ${
                          active ? 'bg-[rgba(110,231,183,0.12)] text-[#6ee7b7]' : 'bg-[rgba(255,255,255,0.03)] text-[rgba(255,255,255,0.35)]'
                        }`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className="text-xs font-semibold tracking-tight">{item.label}</span>
                      </Link>
                    );
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Premium Pagination iOS-style Dots */}
            <div className="flex justify-center gap-1.5 mt-6 flex-shrink-0">
              {MOBILE_TABS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTabIdx(idx)}
                  className={`h-1 rounded-full transition-all duration-200 ${
                    idx === activeTabIdx ? 'w-3.5 bg-[#6ee7b7]' : 'w-1 bg-[rgba(255,255,255,0.15)]'
                  }`}
                />
              ))}
            </div>
            
            <p className="text-[10px] text-center text-[rgba(255,255,255,0.25)] font-mono mt-4">
              Swipe content left/right to change category
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
