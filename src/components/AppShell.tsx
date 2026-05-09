'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { initializeDb } from '@/lib/db';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { SpotifyProvider } from '@/lib/SpotifyContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initializeDb().then(() => {
      setTimeout(() => setLoading(false), 1200);
    });
  }, []);

  return (
    <AnimatePresence mode="wait">
      {loading ? (
        <motion.div
          key="loader"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)]"
        >
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)] flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <motion.div
                className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--accent-cyan)] to-[var(--accent-purple)]"
                animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold gradient-text mb-1">LifeOS</h1>
              <p className="text-sm text-[var(--text-tertiary)] font-mono">Initializing system...</p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-2 h-2 rounded-full bg-[var(--accent-cyan)]"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : (
        <SpotifyProvider>
          <motion.div
            key="app"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="flex h-full w-full overflow-hidden relative z-10"
          >
            <Sidebar />
            <main className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth">
              <div className="min-h-full pb-[var(--safe-bottom)]">
                {children}
              </div>
            </main>
          </motion.div>
        </SpotifyProvider>
      )}
    </AnimatePresence>
  );
}
