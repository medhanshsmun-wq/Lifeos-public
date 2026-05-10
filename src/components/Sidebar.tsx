'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Bot,
  FolderKanban,
  Heart,
  Dumbbell,
  Wallet,
  GraduationCap,
  BarChart3,
  FileText,
  Plug,
  Download,
  Settings,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Gamepad2,
  GitBranch,
  Music,
  Play,
  Pause,
  SkipForward,
  CandlestickChart,
} from 'lucide-react';
import { useSpotify } from '@/lib/SpotifyContext';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/', color: 'var(--accent-cyan)' },
  { label: 'AI Copilot', icon: Bot, href: '/copilot', color: 'var(--accent-purple)' },
  { label: 'Projects', icon: FolderKanban, href: '/projects', color: 'var(--accent-blue)' },
  { label: 'Hobbies', icon: Gamepad2, href: '/hobbies', color: 'var(--accent-pink)' },
  { label: 'Fitness', icon: Dumbbell, href: '/fitness', color: 'var(--accent-green)' },
  { label: 'Day Trading', icon: CandlestickChart, href: '/finance', color: 'var(--accent-purple)' },
  { label: 'Study', icon: GraduationCap, href: '/study', color: 'var(--accent-yellow)' },
  { label: 'Analytics', icon: BarChart3, href: '/analytics', color: 'var(--accent-cyan)' },
  { label: 'Reports', icon: FileText, href: '/reports', color: 'var(--accent-purple)' },
  { label: 'Integrations', icon: Plug, href: '/integrations', color: 'var(--accent-blue)' },
  { label: 'GitHub', icon: GitBranch, href: '/github', color: '#ffffff' },
  { label: 'Spotify', icon: Music, href: '/spotify', color: '#1db954' },
  { label: 'Exports', icon: Download, href: '/exports', color: 'var(--accent-pink)' },
  { label: 'Settings', icon: Settings, href: '/settings', color: 'var(--text-secondary)' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { playingData, handlePlayback, isConnected } = useSpotify();

  const track = playingData?.item;
  const isPlaying = playingData?.is_playing;

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex flex-col h-full border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/80 backdrop-blur-xl z-20 flex-shrink-0"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-[var(--header-height)] border-b border-[var(--border-subtle)] flex-shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-lg font-bold gradient-text tracking-tight">LifeOS</span>
              <span className="text-[10px] text-[var(--text-tertiary)] ml-1.5 font-mono">v1.0</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-3 px-2.5 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`
                group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative
                ${isActive
                  ? 'bg-[var(--bg-elevated)] text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-xl bg-[var(--bg-elevated)]"
                  style={{
                    boxShadow: `inset 0 0 0 1px ${item.color}20, 0 0 20px ${item.color}10`,
                  }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <div className="relative z-10 flex items-center gap-3">
                <Icon
                  className="w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200"
                  style={{ color: isActive ? item.color : undefined }}
                />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.2 }}
                      className="text-[13px] font-medium whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              {isActive && !collapsed && (
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                  style={{ background: item.color }}
                  layoutId="sidebar-indicator"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Mini Spotify Player */}
      {isConnected && track && (
        <div className="px-3 pb-2 border-t border-[var(--border-subtle)] pt-3 mt-auto">
          <div className="flex items-center gap-2 p-2 rounded-xl bg-[#1db954]/5 hover:bg-[#1db954]/10 transition-colors border border-[#1db954]/10">
            {collapsed ? (
              <div className="w-full flex justify-center">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isPlaying ? 'bg-[#1db954] text-black shadow-[0_0_10px_rgba(29,185,84,0.5)]' : 'bg-white/10 text-white'}`}>
                  <Music className="w-3 h-3" />
                </div>
              </div>
            ) : (
              <>
                <img src={track.album.images[0]?.url} alt="" className="w-8 h-8 rounded shadow-sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold text-white truncate">{track.name}</p>
                  <p className="text-[9px] text-[var(--text-tertiary)] truncate">{track.artists[0]?.name}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => handlePlayback(isPlaying ? 'pause' : 'play')} className="p-1 text-white hover:text-[#1db954] transition-colors">
                    {isPlaying ? <Pause className="w-3.5 h-3.5" fill="currentColor" /> : <Play className="w-3.5 h-3.5" fill="currentColor" />}
                  </button>
                  <button onClick={() => handlePlayback('next')} className="p-1 text-[var(--text-tertiary)] hover:text-white transition-colors">
                    <SkipForward className="w-3 h-3" fill="currentColor" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Collapse Button */}
      <div className={`px-3 pb-4 pt-2 ${!(isConnected && track) ? 'border-t border-[var(--border-subtle)]' : ''}`}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all duration-200"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}
