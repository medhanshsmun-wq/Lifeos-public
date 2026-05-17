'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { initializeDb, db } from '@/lib/db';
import { serverDb } from '@/lib/serverDb';
import { motion, AnimatePresence } from 'framer-motion';
import { SpotifyProvider, useSpotify } from '@/lib/SpotifyContext';
import ArcReactorLoader from '@/components/ArcReactorLoader';

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
        el.style.background = `radial-gradient(circle, rgba(${r},${g},${b},0.10) 0%, transparent 70%)`;
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
    const syncHealth = async () => {
      try {
        const serverFitness = await serverDb.fitness.toArray();
        const localFitness = await db.fitness.toArray();
        for (const sf of serverFitness) {
          const dStr = new Date(sf.date).toDateString();
          const existing = localFitness.find(lf => new Date(lf.date).toDateString() === dStr);
          if (existing) {
            if (sf.steps > existing.steps || sf.activeMinutes > existing.activeMinutes) {
              await db.fitness.update(existing.id!, {
                steps: Math.max(existing.steps, sf.steps),
                distance: Math.max(existing.distance, sf.distance),
                caloriesBurned: Math.max(existing.caloriesBurned, sf.caloriesBurned),
                activeMinutes: Math.max(existing.activeMinutes, sf.activeMinutes),
                date: new Date(sf.date)
              });
            }
          } else {
            await db.fitness.add({
              steps: sf.steps, distance: sf.distance, caloriesBurned: sf.caloriesBurned,
              activeMinutes: sf.activeMinutes, date: new Date(sf.date), notes: sf.notes || 'Auto-synced'
            });
          }
        }
      } catch (e) {
        console.warn('Health sync failed', e);
      }
    };

    initializeDb()
      .then(() => syncHealth())
      .then(() => setTimeout(() => setLoading(false), 800));
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div key="boot" exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
          <ArcReactorLoader visible={true} />
        </motion.div>
      ) : (
        <SpotifyProvider>
          <ThemeManager />
          <AmbientController />
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col-reverse md:flex-row h-full w-full overflow-hidden relative z-10"
          >
            <Sidebar />
            <main className="flex-1 flex flex-col overflow-y-auto overflow-x-hidden scroll-smooth relative">
              <div className="flex-1 w-full flex flex-col">{children}</div>
            </main>
          </motion.div>
        </SpotifyProvider>
      )}
    </AnimatePresence>
  );
}
