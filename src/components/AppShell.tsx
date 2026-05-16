'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { initializeDb, db } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { SpotifyProvider, useSpotify } from '@/lib/SpotifyContext';

// ─── Spotify Ambient Controller ─────────────────────────────
function AmbientController() {
  const { playingData } = useSpotify();

  useEffect(() => {
    const el = document.getElementById('spotify-orb');
    if (!el) return;

    const art = playingData?.item?.album?.images?.[0]?.url;
    const playing = playingData?.is_playing;

    if (art && playing) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = art;
      img.onload = () => {
        const c = document.createElement('canvas');
        c.width = 1; c.height = 1;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        el.style.background = `radial-gradient(circle, rgba(${r},${g},${b},0.14) 0%, transparent 70%)`;
        el.classList.add('active');
      };
    } else {
      el.classList.remove('active');
    }
  }, [playingData?.item?.album?.images, playingData?.is_playing]);

  return null;
}

// ─── Theme Manager ──────────────────────────────────────────
function ThemeManager() {
  useEffect(() => {
    const load = async () => {
      try {
        const s = await db.settings.toArray();
        if (s[0]?.theme) document.documentElement.setAttribute('data-theme', s[0].theme);
      } catch {}
    };
    load();
    const id = setInterval(async () => {
      try {
        const s = await db.settings.toArray();
        const t = s[0]?.theme;
        if (t && document.documentElement.getAttribute('data-theme') !== t) {
          document.documentElement.setAttribute('data-theme', t);
        }
      } catch {}
    }, 2000);
    return () => clearInterval(id);
  }, []);
  return null;
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDb().then(() => setTimeout(() => setLoading(false), 1000));
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="boot"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-0)]"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)] flex items-center justify-center shadow-lg" style={{ boxShadow: '0 0 60px var(--glow-accent)' }}>
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--accent)] to-[var(--accent-2)]"
                animate={{ scale: [1, 1.6, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold gradient-text mb-1">LifeOS</h1>
              <p className="text-xs text-[var(--text-2)] font-mono tracking-widest uppercase">Neural Interface Loading</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div key={i} className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]"
                  animate={{ opacity: [0.2, 1, 0.2] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <SpotifyProvider>
          <ThemeManager />
          <AmbientController />
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex h-full w-full overflow-hidden relative z-10"
          >
            <Sidebar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
              <div className="min-h-full">{children}</div>
            </main>
          </motion.div>
        </SpotifyProvider>
      )}
    </AnimatePresence>
  );
}
