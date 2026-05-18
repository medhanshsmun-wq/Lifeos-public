'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, type HabitEntry } from '@/lib/db';
import { Flame, Plus, Check, X, Sparkles, TrendingUp, Award, Calendar, BarChart2, Trash2 } from 'lucide-react';
import SystemModal from './SystemModal';

const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function HabitsPage() {
  const [entries, setEntries] = useState<HabitEntry[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [newHabitCategory, setNewHabitCategory] = useState('Productivity');
  const [modal, setModal] = useState<any>(null);

  const load = async () => {
    const data = await db.habits.toArray();
    setEntries(data);
  };

  useEffect(() => {
    load();
  }, []);

  // Format date to local date string (YYYY-MM-DD) to avoid timezone offsets
  const formatDateStr = (date: Date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Get past 7 days dates
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(d);
    }
    return dates;
  }, []);

  // Unique habits list based on all-time log entries
  const habitsList = useMemo(() => {
    const uniqueNames = Array.from(new Set(entries.map(e => e.habitName)));
    return uniqueNames.map(name => {
      const habitEntries = entries.filter(e => e.habitName === name);
      
      // Calculate active streak
      let streak = 0;
      const sortedEntries = [...habitEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      const todayStr = formatDateStr(new Date());
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = formatDateStr(yesterday);
      
      let checkDate = new Date();
      let hasStreakBreak = false;
      
      // If no entries or neither today nor yesterday is completed, streak is 0
      const hasToday = sortedEntries.some(e => formatDateStr(e.date) === todayStr && e.completed);
      const hasYesterday = sortedEntries.some(e => formatDateStr(e.date) === yesterdayStr && e.completed);
      
      if (hasToday || hasYesterday) {
        let currentCheck = hasToday ? new Date() : yesterday;
        while (!hasStreakBreak) {
          const checkStr = formatDateStr(currentCheck);
          const entry = sortedEntries.find(e => formatDateStr(e.date) === checkStr);
          if (entry && entry.completed) {
            streak++;
            currentCheck.setDate(currentCheck.getDate() - 1);
          } else {
            hasStreakBreak = true;
          }
        }
      }

      // Calculate total completion rate (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentEntries = habitEntries.filter(e => new Date(e.date).getTime() >= thirtyDaysAgo.getTime());
      const completedRecent = recentEntries.filter(e => e.completed).length;
      const completionRate = recentEntries.length > 0 ? Math.round((completedRecent / Math.max(1, recentEntries.length)) * 100) : 0;

      return {
        name: name,
        entries: habitEntries,
        streak,
        completionRate,
        totalCompleted: habitEntries.filter(e => e.completed).length
      };
    });
  }, [entries]);

  // Toggle completion for a specific date
  const toggleHabit = async (habitName: string, date: Date) => {
    const dateStr = formatDateStr(date);
    const existing = entries.find(e => e.habitName === habitName && formatDateStr(e.date) === dateStr);

    if (existing) {
      await db.habits.update(existing.id!, { completed: !existing.completed });
    } else {
      await db.habits.add({
        habitName,
        completed: true,
        date: new Date(date),
        streak: 0
      });
    }
    load();
  };

  // Add a new habit definition
  const addHabit = async () => {
    if (!newHabitName.trim()) return;
    
    // Check if habit already exists
    if (habitsList.some(h => h.name.toLowerCase() === newHabitName.trim().toLowerCase())) {
      alert('This habit already exists.');
      return;
    }

    // Initialize with a blank record for today
    await db.habits.add({
      habitName: newHabitName.trim(),
      completed: false,
      date: new Date(),
      streak: 0
    });

    setNewHabitName('');
    setShowAddModal(false);
    load();
  };

  // Delete all logs for a habit
  const deleteHabit = (habitName: string) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Delete Habit',
      message: `Are you sure you want to completely delete "${habitName}" and all of its streak history?`,
      onConfirm: async () => {
        const toDelete = entries.filter(e => e.habitName === habitName);
        await Promise.all(toDelete.map(e => db.habits.delete(e.id!)));
        setModal(null);
        load();
      }
    });
  };

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }} className="max-w-[1100px] mx-auto space-y-6">
        
        {/* Header */}
        <motion.div variants={fi} className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[rgba(244,114,182,0.1)]">
              <Flame className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Habit Tracker</h1>
              <p className="text-xs text-[var(--text-tertiary)] font-mono">Build consistency, master your routine</p>
            </div>
          </div>
          <button 
            onClick={() => setShowAddModal(true)} 
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all"
          >
            <Plus className="w-4 h-4" /> Add Habit
          </button>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={fi} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-pink-500/10 text-pink-400"><Flame className="w-5 h-5 animate-pulse" /></div>
            <div>
              <p className="text-xl font-bold text-white">
                {habitsList.reduce((max, h) => Math.max(max, h.streak), 0)} Days
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Best Current Streak</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400"><Award className="w-5 h-5" /></div>
            <div>
              <p className="text-xl font-bold text-white">{habitsList.length}</p>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Active Habits</p>
            </div>
          </div>
          <div className="glass-card p-4 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400"><TrendingUp className="w-5 h-5" /></div>
            <div>
              <p className="text-xl font-bold text-white">
                {habitsList.length > 0 
                  ? Math.round(habitsList.reduce((sum, h) => sum + h.completionRate, 0) / habitsList.length) 
                  : 0}%
              </p>
              <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider">Overall Consistency</p>
            </div>
          </div>
        </motion.div>

        {/* Habits List */}
        <motion.div variants={fi} className="space-y-4">
          {habitsList.map(habit => (
            <div key={habit.name} className="glass-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[rgba(244,114,182,0.15)] transition-all group">
              
              {/* Left Column: Info & Streaks */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-base font-semibold text-white">{habit.name}</h3>
                  <span className="flex items-center gap-1 text-xs text-pink-400 font-mono bg-pink-500/5 px-2.5 py-0.5 rounded-full border border-pink-500/10">
                    <Flame className="w-3.5 h-3.5" /> {habit.streak} day streak
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-[var(--text-tertiary)]">
                  <span>Consistency: <strong className="text-white">{habit.completionRate}%</strong></span>
                  <span>Total logs: <strong className="text-white">{habit.totalCompleted}</strong></span>
                </div>
              </div>

              {/* Right Column: Weekly Tracker */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] p-1.5 rounded-2xl">
                  {weekDates.map(date => {
                    const dateStr = formatDateStr(date);
                    const log = habit.entries.find(e => formatDateStr(e.date) === dateStr);
                    const isCompleted = !!log?.completed;
                    const isToday = dateStr === formatDateStr(new Date());

                    return (
                      <button
                        key={dateStr}
                        onClick={() => toggleHabit(habit.name, date)}
                        className={`flex flex-col items-center justify-between w-9 h-12 py-1.5 rounded-xl border transition-all ${
                          isCompleted
                            ? 'bg-pink-500 border-pink-500 text-white shadow-[0_0_12px_rgba(244,114,182,0.3)]'
                            : isToday
                              ? 'bg-white/5 border-pink-500/40 text-pink-400'
                              : 'bg-white/[.01] border-transparent text-[var(--text-secondary)] hover:bg-white/5'
                        }`}
                      >
                        <span className="text-[8px] font-mono font-bold uppercase">
                          {date.toLocaleDateString('en-US', { weekday: 'narrow' })}
                        </span>
                        <div className={`w-4 h-4 rounded-md flex items-center justify-center ${isCompleted ? 'bg-white/20' : 'bg-white/5'}`}>
                          {isCompleted && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                <button 
                  onClick={() => deleteHabit(habit.name)}
                  className="opacity-0 group-hover:opacity-100 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                  title="Delete habit"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

            </div>
          ))}

          {habitsList.length === 0 && (
            <div className="text-center py-16 bg-[var(--bg-secondary)]/30 rounded-2xl border border-dashed border-[var(--border-subtle)]">
              <Flame className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-semibold text-white">No habits set up yet</p>
              <p className="text-xs text-[var(--text-tertiary)] mt-1 mb-4">Add your first habit to start building streaks.</p>
              <button 
                onClick={() => setShowAddModal(true)} 
                className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all"
              >
                Create Habit
              </button>
            </div>
          )}
        </motion.div>

      </motion.div>

      {/* Add Habit Modal */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md glass p-6 rounded-2xl border border-[var(--border-subtle)] space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-pink-400" /> Create Habit
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-1 rounded-lg hover:bg-white/10 text-[var(--text-muted)] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono text-[var(--text-tertiary)] uppercase tracking-wider">Habit Name</label>
                  <input
                    type="text"
                    value={newHabitName}
                    onChange={(e) => setNewHabitName(e.target.value)}
                    placeholder="e.g. Read for 30 mins, Exercise, Meditate..."
                    className="w-full bg-white/[0.03] border border-[var(--border-subtle)] focus:border-pink-500/50 rounded-xl px-4 py-3 text-sm text-white placeholder:text-[var(--text-tertiary)] focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-xs font-semibold rounded-xl text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all">Cancel</button>
                <button onClick={addHabit} className="px-4 py-2 text-xs font-semibold rounded-xl bg-pink-500 text-white hover:bg-pink-400 transition-all shadow-[0_0_12px_rgba(244,114,182,0.3)]">Create</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <SystemModal isOpen={!!modal?.isOpen} type={modal?.type || 'alert'} title={modal?.title || ''} message={modal?.message || ''}
        defaultValue={modal?.defaultValue} onConfirm={modal?.onConfirm || (() => {})} onCancel={() => setModal(null)} />
    </div>
  );
}
