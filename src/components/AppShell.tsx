'use client';

import { useEffect, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import { initializeDb, db } from '@/lib/db';
import { serverDb } from '@/lib/serverDb';
import { motion, AnimatePresence } from 'framer-motion';
import { SpotifyProvider, useSpotify } from '@/lib/SpotifyContext';
import ArcReactorLoader from '@/components/ArcReactorLoader';
import { RefreshCw } from 'lucide-react';

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
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error'>('synced');

  useEffect(() => {
    let lastSyncTime = 0;
    let syncInProgress = false;

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

    const syncAllFromCloud = async (isManual = false) => {
      if (syncInProgress) {
        console.log('⏳ Cloud sync already in progress, skipping concurrent run...');
        return;
      }

      // Throttle non-manual syncs to once every 30 seconds to conserve API limits
      const now = Date.now();
      if (!isManual && now - lastSyncTime < 30000) {
        console.log('⚡ Cloud sync throttled (ran less than 30s ago), skipping...');
        return;
      }

      syncInProgress = true;
      setSyncStatus('syncing');
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
              widgetSizes: typeof sObj.widgetSizes === 'string' ? JSON.parse(sObj.widgetSizes) : (sObj.widgetSizes || undefined),
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
            const { widgetSizes, ...settingsToSync } = activeSettings;
            await serverDb.settings.put({
              id: 1,
              ...settingsToSync
            });
          }
        } else if (activeSettings) {
          console.log('📤 Uploading local settings to Supabase...');
          const { widgetSizes, ...settingsToSync } = activeSettings;
          await serverDb.settings.put({
            id: 1,
            ...settingsToSync
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

        await Promise.all(tables.map(async (table) => {
          try {
            const serverItems = await table.server.toArray();
            // @ts-ignore
            const localItems = await db[table.name].toArray();

            // A. Deduplicate server items before syncing
            let uniqueServerItems: any[] = [];
            const seen = new Set<string>();
            const duplicatesToDelete: any[] = [];

            if (serverItems && serverItems.length > 0) {
              // Sort server items by id descending, so we keep the latest one
              const sortedServer = [...serverItems].sort((a: any, b: any) => b.id - a.id);
              
              for (const item of sortedServer) {
                let key = '';
                if (table.name === 'projects') {
                  key = `${item.title.trim()}_${(item.description || '').trim()}`;
                } else if (table.name === 'hobbies') {
                  key = `${item.name.trim()}_${new Date(item.date).toDateString()}_${item.timeSpent}`;
                } else if (table.name === 'finance') {
                  key = `${item.description.trim()}_${item.amount}_${new Date(item.date).toDateString()}`;
                } else if (table.name === 'fitness') {
                  key = `${new Date(item.date).toDateString()}`;
                } else if (table.name === 'diet') {
                  key = `${item.mealType}_${item.food.trim()}_${new Date(item.date).toDateString()}`;
                } else if (table.name === 'gym') {
                  key = `${item.muscleGroup}_${new Date(item.date).toDateString()}`;
                } else if (table.name === 'study') {
                  key = `${item.subject}_${item.topic.trim()}_${new Date(item.date).toDateString()}`;
                } else if (table.name === 'habits') {
                  key = `${item.habitName.trim()}_${new Date(item.date).toDateString()}`;
                } else if (table.name === 'trades') {
                  key = `${item.ticker.trim()}_${new Date(item.entryTime).toDateString()}`;
                } else if (table.name === 'todos') {
                  key = `${item.task.trim()}_${new Date(item.date).toDateString()}`;
                } else if (table.name === 'conversations') {
                  key = `${item.title.trim()}_${new Date(item.createdAt).toDateString()}`;
                } else if (table.name === 'weeklyReports') {
                  key = `${new Date(item.weekStart).toDateString()}_${new Date(item.weekEnd).toDateString()}`;
                } else if (table.name === 'timeline') {
                  key = `${item.title.trim()}_${new Date(item.date).toDateString()}`;
                } else {
                  key = `${item.id}`;
                }

                if (seen.has(key)) {
                  duplicatesToDelete.push(item);
                } else {
                  seen.add(key);
                  uniqueServerItems.push(item);
                }
              }

              // Delete duplicates from server and local Dexie
              if (duplicatesToDelete.length > 0) {
                console.log(`🧼 Cleaning up ${duplicatesToDelete.length} duplicates from table "${table.name}"...`);
                for (const dup of duplicatesToDelete) {
                  try {
                    await table.server.delete(dup.id);
                    // @ts-ignore
                    await db[table.name].delete(dup.id);
                  } catch (delErr) {
                    console.warn(`Failed to delete duplicate for ${table.name}:`, delErr);
                  }
                }
              }
            }

            // B. Down-sync (Server -> Local)
            if (uniqueServerItems && uniqueServerItems.length > 0) {
              for (const item of uniqueServerItems) {
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

                // Parse JSON strings back to arrays/objects for Dexie
                if (table.name === 'projects') {
                  for (const f of ['tags', 'techStack', 'links', 'files']) {
                    if (typeof formattedItem[f] === 'string') {
                      try {
                        formattedItem[f] = JSON.parse(formattedItem[f]);
                      } catch {
                        formattedItem[f] = [];
                      }
                    }
                  }
                }
                if (table.name === 'weeklyReports') {
                  if (typeof formattedItem.highlights === 'string') {
                    try {
                      formattedItem.highlights = JSON.parse(formattedItem.highlights);
                    } catch {
                      formattedItem.highlights = [];
                    }
                  }
                }
                if (table.name === 'trades') {
                  for (const f of ['mistakes', 'tags']) {
                    if (typeof formattedItem[f] === 'string') {
                      try {
                        formattedItem[f] = JSON.parse(formattedItem[f]);
                      } catch {
                        formattedItem[f] = [];
                      }
                    }
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

            // C. Up-sync (Local -> Server)
            if (localItems && localItems.length > 0) {
              const uniqueLocalKeys = new Set<string>();
              for (const localItem of localItems) {
                // Determine a unique key for the local item to prevent uploading local duplicates
                let key = '';
                if (table.name === 'projects') {
                  key = `${localItem.title.trim()}_${(localItem.description || '').trim()}`;
                } else if (table.name === 'hobbies') {
                  key = `${localItem.name.trim()}_${new Date(localItem.date).toDateString()}_${localItem.timeSpent}`;
                } else if (table.name === 'finance') {
                  key = `${localItem.description.trim()}_${localItem.amount}_${new Date(localItem.date).toDateString()}`;
                } else if (table.name === 'fitness') {
                  key = `${new Date(localItem.date).toDateString()}`;
                } else if (table.name === 'diet') {
                  key = `${localItem.mealType}_${localItem.food.trim()}_${new Date(localItem.date).toDateString()}`;
                } else if (table.name === 'gym') {
                  key = `${localItem.muscleGroup}_${new Date(localItem.date).toDateString()}`;
                } else if (table.name === 'study') {
                  key = `${localItem.subject}_${localItem.topic.trim()}_${new Date(localItem.date).toDateString()}`;
                } else if (table.name === 'habits') {
                  key = `${localItem.habitName.trim()}_${new Date(localItem.date).toDateString()}`;
                } else if (table.name === 'trades') {
                  key = `${localItem.ticker.trim()}_${new Date(localItem.entryTime).toDateString()}`;
                } else if (table.name === 'todos') {
                  key = `${localItem.task.trim()}_${new Date(localItem.date).toDateString()}`;
                } else if (table.name === 'conversations') {
                  key = `${localItem.title.trim()}_${new Date(localItem.createdAt).toDateString()}`;
                } else if (table.name === 'weeklyReports') {
                  key = `${new Date(localItem.weekStart).toDateString()}_${new Date(localItem.weekEnd).toDateString()}`;
                } else if (table.name === 'timeline') {
                  key = `${localItem.title.trim()}_${new Date(localItem.date).toDateString()}`;
                } else {
                  key = `${localItem.id}`;
                }

                if (uniqueLocalKeys.has(key)) {
                  // Duplicate local item that hasn't been uploaded, just delete it locally
                  // @ts-ignore
                  await db[table.name].delete(localItem.id);
                  continue;
                }
                uniqueLocalKeys.add(key);

                // Check if it exists on the server
                const serverMatch = uniqueServerItems.find((si: any) => si.id === localItem.id);
                if (!serverMatch) {
                  try {
                    const savedServerItem = await table.server.add(localItem);
                    if (savedServerItem && savedServerItem.id && savedServerItem.id !== localItem.id) {
                      // Delete temporary local item and write the one with the server-assigned ID
                      // @ts-ignore
                      await db[table.name].delete(localItem.id);
                      
                      // Convert Date strings to objects if needed
                      const formattedSavedItem = { ...savedServerItem };
                      for (const key of Object.keys(formattedSavedItem)) {
                        const val = formattedSavedItem[key];
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
                          formattedSavedItem[key] = new Date(val);
                        }
                      }
                      
                      // Parse JSON strings back to arrays/objects for Dexie
                      if (table.name === 'projects') {
                        for (const f of ['tags', 'techStack', 'links', 'files']) {
                          if (typeof formattedSavedItem[f] === 'string') {
                            try { formattedSavedItem[f] = JSON.parse(formattedSavedItem[f]); } catch { formattedSavedItem[f] = []; }
                          }
                        }
                      }
                      if (table.name === 'weeklyReports') {
                        if (typeof formattedSavedItem.highlights === 'string') {
                          try { formattedSavedItem.highlights = JSON.parse(formattedSavedItem.highlights); } catch { formattedSavedItem.highlights = []; }
                        }
                      }
                      if (table.name === 'trades') {
                        for (const f of ['mistakes', 'tags']) {
                          if (typeof formattedSavedItem[f] === 'string') {
                            try { formattedSavedItem[f] = JSON.parse(formattedSavedItem[f]); } catch { formattedSavedItem[f] = []; }
                          }
                        }
                      }

                      // @ts-ignore
                      await db[table.name].add(formattedSavedItem);
                    }
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
        }));
      } catch (e) {
        console.error('Error during full bidirectional sync:', e);
        setSyncStatus('error');
      } finally {
        lastSyncTime = Date.now();
        syncInProgress = false;
        setSyncStatus(prev => prev === 'error' ? 'error' : 'synced');
      }
    };

    let active = true;
    initializeDb()
      .then(async () => {
        if (!active) return;

        // One-time emergency hard reset for local browser IndexedDB to start completely fresh from Supabase ground up
        const isWiped = localStorage.getItem('lifeos_v3_hard_wiped');
        if (!isWiped) {
          console.log("🧹 Wiping local browser database for database clean reset...");
          try {
            await Promise.all([
              db.projects.clear(),
              db.finance.clear(),
              db.fitness.clear(),
              db.diet.clear(),
              db.gym.clear(),
              db.hobbies.clear(),
              db.study.clear(),
              db.subjects.clear(),
              db.studyAssignments.clear(),
              db.habits.clear(),
              db.conversations.clear(),
              db.weeklyReports.clear(),
              db.timeline.clear(),
              db.trades.clear(),
              db.todos.clear(),
              db.settings.clear()
            ]);
            localStorage.setItem('lifeos_v3_hard_wiped', 'true');
            // Re-initialize settings row locally
            await initializeDb();
            console.log("✅ Local browser database hard wipe success!");
          } catch (wipeErr) {
            console.error("⚠️ Local database wipe failed:", wipeErr);
          }
        }

        autoRegisterNewDay();
        
        // Wait for cloud sync to finish so the user sees all their data instantly on first boot!
        // Timeout fallback of 3.5 seconds to guarantee page loads even on offline/poor networks.
        await Promise.race([
          syncAllFromCloud(),
          new Promise((resolve) => setTimeout(resolve, 3500))
        ]);
        
        setLoading(false);
      });

    const intervalId = setInterval(() => {
      if (active) autoRegisterNewDay();
    }, 30000);

    const handleFocusSync = () => {
      if (active) {
        console.log('🔄 Window focused, triggering automatic cloud sync...');
        syncAllFromCloud();
      }
    };
    window.addEventListener('focus', handleFocusSync);

    const handleTriggerSync = (e?: Event) => {
      if (active) {
        const isManual = (e as CustomEvent)?.detail?.isManual || false;
        console.log(`⚡ App mutation event, triggering cloud sync (isManual: ${isManual})...`);
        syncAllFromCloud(isManual);
      }
    };
    window.addEventListener('lifeos-trigger-sync', handleTriggerSync);

    const syncIntervalId = setInterval(() => {
      if (active) {
        console.log('🕒 Periodic background cloud sync...');
        syncAllFromCloud();
      }
    }, 15000);

    return () => {
      active = false;
      clearInterval(intervalId);
      clearInterval(syncIntervalId);
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('lifeos-trigger-sync', handleTriggerSync);
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
              {/* Premium Floating Manual Sync Action Button */}
              <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50">
                <button
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('lifeos-trigger-sync', { detail: { isManual: true } }));
                  }}
                  disabled={syncStatus === 'syncing'}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-mono tracking-tight transition-all backdrop-blur-xl border duration-300 active:scale-95 disabled:opacity-85 bg-black/40 border-white/[0.06] hover:border-[var(--accent)]/30 hover:bg-black/60 text-[var(--text-secondary)] shadow-lg shadow-black/40 group"
                  title="Force manual database sync between all devices"
                >
                  <RefreshCw className={`w-3 h-3 text-[var(--accent)] transition-transform duration-500 group-hover:rotate-180 ${syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
                  <span>
                    {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'error' ? 'Sync Failed' : 'Synced'}
                  </span>
                  <span className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                    syncStatus === 'syncing' 
                      ? 'bg-sky-400 animate-pulse shadow-[0_0_6px_rgba(56,189,248,0.6)]' 
                      : syncStatus === 'error' 
                        ? 'bg-red-500 animate-bounce shadow-[0_0_6px_rgba(239,68,68,0.6)]' 
                        : 'bg-[#6ee7b7] shadow-[0_0_6px_rgba(110,231,183,0.6)]'
                  }`} />
                </button>
              </div>

              <div className="flex-1 w-full flex flex-col">{children}</div>
            </main>
          </motion.div>
        </SpotifyProvider>
      )}
    </AnimatePresence>
  );
}
