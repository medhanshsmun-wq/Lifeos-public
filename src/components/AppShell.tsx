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
    const autoRegisterNewDay = async () => {
      try {
        const todayStr = new Date().toDateString();
        
        // 1. Auto-register habits for today
        const habits = await db.habits.toArray();
        const uniqueNames = Array.from(new Set(habits.map(h => h.habitName)));
        for (const name of uniqueNames) {
          const hasToday = habits.some(h => h.habitName === name && new Date(h.date).toDateString() === todayStr);
          if (!hasToday) {
            await db.habits.add({
              habitName: name,
              completed: false,
              date: new Date(),
              streak: 0
            });
          }
        }

        // 2. Auto-register fitness entry for today (with 0 steps initialized)
        const fitness = await db.fitness.toArray();
        const hasTodayFitness = fitness.some(f => new Date(f.date).toDateString() === todayStr);
        if (!hasTodayFitness) {
          await db.fitness.add({
            steps: 0,
            distance: 0,
            caloriesBurned: 0,
            activeMinutes: 0,
            date: new Date(),
            notes: 'Auto-registered for the day'
          });
        }

        // 3. Auto-sync settings to server SQLite
        const settingsList = await db.settings.toArray();
        if (settingsList.length > 0) {
          const sObj = settingsList[0];
          try {
            await serverDb.settings.put({
              id: 1, // Target settings row #1 in SQLite
              geminiApiKey: sObj.geminiApiKey || '',
              githubToken: sObj.githubToken || '',
              githubUsername: sObj.githubUsername || '',
              cloudBackupEnabled: !!sObj.cloudBackupEnabled,
              theme: sObj.theme || 'dark',
              accentColor: sObj.accentColor || '#00F5FF',
              dashboardWidgets: sObj.dashboardWidgets || [],
              name: sObj.name || 'User',
              avatar: sObj.avatar || '',
              propFirmAccountsCount: sObj.propFirmAccountsCount || 1,
              propFirmName: sObj.propFirmName || null,
              propFirmSize: sObj.propFirmSize || null,
              spotifyClientId: sObj.spotifyClientId || null,
              spotifyClientSecret: sObj.spotifyClientSecret || null,
              spotifyAccessToken: sObj.spotifyAccessToken || null,
              spotifyRefreshToken: sObj.spotifyRefreshToken || null,
              spotifyExpiresAt: sObj.spotifyExpiresAt ? Number(sObj.spotifyExpiresAt) : null,
              summerBreakMode: !!sObj.summerBreakMode,
              appleHealthEnabled: !!sObj.appleHealthEnabled,
            });
          } catch (err) {
            console.warn('Settings sync to SQLite failed', err);
          }
        }
      } catch (e) {
        console.warn('Auto-registering new day failed', e);
      }
    };

    const syncAllFromCloud = async () => {
      try {
        console.log('🔄 Initiating full cloud sync from Supabase...');
        
        // 1. First sync Settings (with restore priority on blank devices)
        const serverSettingsList = await serverDb.settings.toArray();
        const localSettingsList = await db.settings.toArray();
        let activeSettings = localSettingsList[0];
        
        if (serverSettingsList && serverSettingsList.length > 0) {
          const sObj = serverSettingsList[0];
          const localIsBlank = !activeSettings || (!activeSettings.geminiApiKey && !activeSettings.githubToken && activeSettings.name === 'User');
          
          if (localIsBlank) {
            console.log('📥 Restoring user credentials & settings from Supabase...');
            const parsedSObj = {
              ...sObj,
              dashboardWidgets: typeof sObj.dashboardWidgets === 'string' ? JSON.parse(sObj.dashboardWidgets) : (sObj.dashboardWidgets || []),
              spotifyExpiresAt: sObj.spotifyExpiresAt ? Number(sObj.spotifyExpiresAt) : undefined,
              cloudBackupEnabled: !!sObj.cloudBackupEnabled,
              summerBreakMode: !!sObj.summerBreakMode,
              appleHealthEnabled: !!sObj.appleHealthEnabled
            };
            if (activeSettings) {
              await db.settings.update(activeSettings.id!, parsedSObj);
            } else {
              await db.settings.add(parsedSObj);
            }
            activeSettings = parsedSObj;
          } else {
            console.log('📤 Syncing local settings to Supabase...');
            await serverDb.settings.put({
              id: 1,
              ...activeSettings
            });
          }
        } else if (activeSettings) {
          console.log('📤 Uploading local settings to Supabase...');
          await serverDb.settings.put({
            id: 1,
            ...activeSettings
          });
        }

        // 2. Define all tables to sync
        const tables = [
          { name: 'projects', server: serverDb.projects },
          { name: 'finance', server: serverDb.finance },
          { name: 'fitness', server: serverDb.fitness },
          { name: 'diet', server: serverDb.diet },
          { name: 'gym', server: serverDb.gym },
          { name: 'hobbies', server: serverDb.hobbies },
          { name: 'subjects', server: serverDb.subjects },
          { name: 'studyAssignments', server: serverDb.studyAssignments },
          { name: 'study', server: serverDb.study },
          { name: 'habits', server: serverDb.habits },
          { name: 'conversations', server: serverDb.conversations },
          { name: 'weeklyReports', server: serverDb.weeklyReports },
          { name: 'timeline', server: serverDb.timeline },
          { name: 'trades', server: serverDb.trades }
        ];

        for (const table of tables) {
          try {
            const serverItems = await table.server.toArray();
            // @ts-ignore
            const localItems = await db[table.name].toArray();

            // A. Down-sync (Server -> Local)
            if (serverItems && serverItems.length > 0) {
              for (const item of serverItems) {
                const formattedItem = { ...item };
                
                // Convert date fields
                for (const key of Object.keys(formattedItem)) {
                  const val = formattedItem[key];
                  if (typeof val === 'string' && (
                    key === 'date' || 
                    key === 'dueDate' || 
                    key === 'createdAt' || 
                    key === 'updatedAt' || 
                    key === 'entryTime' || 
                    key === 'exitTime' || 
                    key === 'timestamp' || 
                    key === 'weekStart' || 
                    key === 'weekEnd'
                  )) {
                    formattedItem[key] = new Date(val);
                  }
                }

                // Handle project milestones array
                if (table.name === 'projects' && formattedItem.milestones) {
                  formattedItem.milestones = formattedItem.milestones.map((m: any) => ({
                    ...m,
                    createdAt: m.createdAt ? new Date(m.createdAt) : new Date()
                  }));
                }

                // Handle conversation messages array
                if (table.name === 'conversations' && formattedItem.messages) {
                  formattedItem.messages = formattedItem.messages.map((m: any) => ({
                    ...m,
                    timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
                  }));
                }

                // Check if it exists locally
                // @ts-ignore
                const localMatch = localItems.find(li => li.id === formattedItem.id);
                if (!localMatch) {
                  // @ts-ignore
                  await db[table.name].add(formattedItem);
                } else {
                  // If it has changed, update it
                  const isDifferent = JSON.stringify(localMatch) !== JSON.stringify(formattedItem);
                  if (isDifferent) {
                    // @ts-ignore
                    await db[table.name].put(formattedItem);
                  }
                }
              }
            }

            // B. Up-sync (Local -> Server)
            if (localItems && localItems.length > 0) {
              for (const localItem of localItems) {
                // Check if it exists on the server
                const serverMatch = serverItems.find((si: any) => si.id === localItem.id);
                if (!serverMatch) {
                  try {
                    await table.server.add(localItem);
                  } catch (addErr) {
                    console.warn(`Up-sync failed for ${table.name} item ID ${localItem.id}:`, addErr);
                  }
                }
              }
            }

            console.log(`✅ Table "${table.name}" bidirectional sync complete.`);
          } catch (tableErr) {
            console.warn(`Sync failed for table ${table.name}:`, tableErr);
          }
        }
      } catch (e) {
        console.error('Error during full bidirectional sync:', e);
      }
    };

    let active = true;
    initializeDb()
      .then(() => {
        if (!active) return;
        return autoRegisterNewDay();
      })
      .then(() => {
        if (!active) return;
        return syncAllFromCloud();
      })
      .then(() => {
        if (!active) return;
        setTimeout(() => setLoading(false), 800);
      });

    const intervalId = setInterval(() => {
      if (active) autoRegisterNewDay();
    }, 30000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
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
