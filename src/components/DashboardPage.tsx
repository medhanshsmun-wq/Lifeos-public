'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { db, type Project, type FitnessEntry, type TimelineEvent, type StudySession, type UserSettings, type Trade, type Todo, type HabitEntry } from '@/lib/db';
import {
  Activity,
  TrendingUp,
  Footprints,
  FolderKanban,
  Clock,
  Zap,
  GitBranch,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Link as LinkIcon,
  CandlestickChart,
  ChevronRight,
  Maximize2,
  Minimize2,
  Flame,
  Check,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import SpotifyWidget from './SpotifyWidget';
import TodoWidget from './TodoWidget';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// Custom Tooltip
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="text-xs text-[rgba(255,255,255,0.4)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold text-white">
          {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

const DEFAULT_WIDGET_SIZES: Record<string, 'small' | 'large'> = {
  'trading-equity': 'large',
  'active-projects': 'large',
  'spotify': 'small',
  'todos': 'small',
  'productivity': 'small',
  'recent-activity': 'small',
  'integrations': 'small',
};

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [fitness, setFitness] = useState<FitnessEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [habits, setHabits] = useState<HabitEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [githubLive, setGithubLive] = useState(false);
  const [widgetSizes, setWidgetSizes] = useState<Record<string, 'small' | 'large'>>(DEFAULT_WIDGET_SIZES);
  const [greeting] = useState(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });
  const [activeWidgets, setActiveWidgets] = useState<string[]>(['todos', 'productivity', 'recent-activity', 'integrations']);
  const [tradingMode, setTradingMode] = useState<'Real' | 'Paper' | 'Prop'>('Real');

  useEffect(() => {
    const load = async () => {
      const [p, t, fit, timelineData, s, study, todoData, habitData] = await Promise.all([
        db.projects.toArray(),
        db.trades.toArray(),
        db.fitness.orderBy('date').reverse().limit(14).toArray(),
        db.timeline.orderBy('date').reverse().limit(6).toArray(),
        db.settings.toArray(),
        db.study.toArray(),
        db.todos.toArray(),
        db.habits.toArray(),
      ]);
      setProjects(p);
      setTrades(t);
      setFitness(fit.reverse());
      setTimeline(timelineData);
      setStudySessions(study);
      setTodos(todoData);
      setHabits(habitData);
      if (s[0]) {
        setSettings(s[0]);
        if (s[0].githubToken) setGithubLive(true);
        
        let w = s[0].dashboardWidgets || ['todos', 'productivity', 'recent-activity', 'integrations'];
        w = w.filter(id => id !== 'activity-overview' && id !== 'ai-insights');
        const wideWidgets = ['trading-equity', 'active-projects'];
        const missing = wideWidgets.filter(ww => !w.includes(ww));
        if (missing.length > 0) {
          w = [...missing, ...w];
        }
        if (!w.includes('spotify')) {
          w.push('spotify');
        }
        setActiveWidgets(w);

        // Load persisted widget sizes
        if (s[0].widgetSizes) {
          setWidgetSizes(prev => ({ ...prev, ...s[0].widgetSizes }));
        }
      }
    };
    load();
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'Ongoing').length;
    const finishedProjects = projects.filter(p => p.status === 'Finished').length;

    const activeTrades = trades.filter(t => {
      if (tradingMode === 'Real') return !t.isPaperTrade && !t.propFirm;
      if (tradingMode === 'Paper') return t.isPaperTrade;
      if (tradingMode === 'Prop') return !!t.propFirm;
      return true;
    });
    const totalPnl = activeTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const winRate = activeTrades.length > 0 ? (activeTrades.filter(t => t.pnl > 0).length / activeTrades.length) * 100 : 0;

    const todayStr = new Date().toDateString();
    const todayFitness = fitness.find(f => new Date(f.date).toDateString() === todayStr);
    const todaySteps = todayFitness ? todayFitness.steps : 0;
    const totalSteps = fitness.reduce((s, f) => s + f.steps, 0);
    const avgSteps = fitness.length > 0 ? Math.round(totalSteps / fitness.length) : 0;
    const totalCalories = fitness.reduce((s, f) => s + f.caloriesBurned, 0);

    const todayTodos = todos.filter(t => {
      const d = new Date(t.date);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    });
    const completedTodos = todayTodos.filter(t => t.completed).length;
    const totalTodos = todayTodos.length;
    const todoRate = totalTodos > 0 ? (completedTodos / totalTodos) * 100 : 0;

    // Habits statistics
    const uniqueNames = Array.from(new Set(habits.map(h => h.habitName)));
    const todayHabitLogs = habits.filter(h => new Date(h.date).toDateString() === todayStr);
    
    const completedToday = todayHabitLogs.filter(h => h.completed).length;
    const totalToday = uniqueNames.length;
    const habitRate = totalToday > 0 ? (completedToday / totalToday) * 100 : 0;

    // Productivity score (composite — includes habits)
    let productivityScore = 0;
    
    if (settings?.summerBreakMode) {
      const projectScore = Math.min((activeProjects + finishedProjects) * 6, 25);
      const fitnessScore = Math.min(avgSteps / 300, 25);
      const todoScore = Math.min(todoRate * 0.25, 25);
      const habitScore = Math.min(habitRate * 0.25, 25);
      productivityScore = Math.min(Math.round(projectScore + fitnessScore + todoScore + habitScore), 100);
    } else {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      const last7DaysStudy = studySessions.filter(s => new Date(s.date).getTime() > now - 7 * 24 * 60 * 60 * 1000);
      const recentStudyMinutes = last7DaysStudy.reduce((sum, s) => sum + s.duration, 0);
      
      const projectScore = Math.min((activeProjects + finishedProjects) * 4, 20);
      const fitnessScore = Math.min(avgSteps / 400, 20);
      const studyScore = Math.min((recentStudyMinutes / 60) * 8, 20);
      const todoScore = Math.min(todoRate * 0.20, 20);
      const habitScore = Math.min(habitRate * 0.20, 20);
      
      productivityScore = Math.min(Math.round(projectScore + fitnessScore + studyScore + todoScore + habitScore), 100);
    }

    return {
      activeProjects, finishedProjects, totalPnl, winRate,
      todaySteps, todayFitness, avgSteps, totalCalories, productivityScore,
      completedToday, totalToday, habitRate,
    };
  }, [projects, trades, fitness, studySessions, settings, todos, habits, tradingMode]);

  // Steps chart data moved to Analytics page

  const pnlCurveData = useMemo(() => {
    const activeTrades = trades.filter(t => {
      if (tradingMode === 'Real') return !t.isPaperTrade && !t.propFirm;
      if (tradingMode === 'Paper') return t.isPaperTrade;
      if (tradingMode === 'Prop') return !!t.propFirm;
      return true;
    });

    let running = 0;
    return activeTrades.slice(-14).map((t, i) => {
      running += (t.pnl || 0);
      return { day: `T${i+1}`, pnl: running };
    });
  }, [trades, tradingMode]);

  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to allow the drag image to be generated before we potentially style the original item
    setTimeout(() => {
      // Optional: set dragging state
    }, 0);
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItem === null || draggedItem === index) return;
    
    const newOrder = [...activeWidgets];
    const item = newOrder[draggedItem];
    newOrder.splice(draggedItem, 1);
    newOrder.splice(index, 0, item);
    
    setActiveWidgets(newOrder);
    setDraggedItem(index);
  };

  const handleDragEnd = async () => {
    setDraggedItem(null);
    if (settings?.id) {
      await db.settings.update(settings.id, { dashboardWidgets: activeWidgets, widgetSizes });
    }
  };

  const toggleWidgetSize = async (widgetId: string) => {
    const current = widgetSizes[widgetId] || 'small';
    const next = current === 'large' ? 'small' : 'large';
    const newSizes: Record<string, 'small' | 'large'> = { ...widgetSizes, [widgetId]: next };
    setWidgetSizes(newSizes);
    if (settings?.id) {
      await db.settings.update(settings.id, { widgetSizes: newSizes as Record<string, 'small' | 'large'> });
    }
  };

  // Unique habits list based on all-time log entries
  const habitsList = useMemo(() => {
    const uniqueNames = Array.from(new Set(habits.map(e => e.habitName)));
    return uniqueNames.map(name => {
      const habitEntries = habits.filter(e => e.habitName === name);
      return {
        name,
        entries: habitEntries,
      };
    });
  }, [habits]);

  const renderWidget = (id: string) => {
    switch (id) {
      case 'habits': {
        const isSmall = widgetSizes[id] === 'small';
        return (
          <div className="glass-card p-5 h-full cursor-grab active:cursor-grabbing flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
                <Flame className="w-4 h-4 text-pink-400" />
                Today&apos;s Habits
              </h3>
              
              {!isSmall ? (
                /* Habits Inline List */
                <div className="space-y-2 mt-3 overflow-y-auto max-h-[140px] pr-1">
                  {habitsList.map(habit => {
                    const todayStr = new Date().toDateString();
                    const todayLog = habit.entries.find(e => new Date(e.date).toDateString() === todayStr);
                    const isCompleted = !!todayLog?.completed;
                    
                    return (
                      <div key={habit.name} className="flex items-center justify-between p-2 rounded-xl bg-white/[.02] border border-white/[.04] hover:bg-white/[.04] transition-all">
                        <span className={`text-xs ${isCompleted ? 'line-through text-[rgba(255,255,255,0.3)]' : 'text-white'} truncate flex-1 pr-2`}>
                          {habit.name}
                        </span>
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            const today = new Date();
                            const existingLog = habits.find(h => h.habitName === habit.name && new Date(h.date).toDateString() === today.toDateString());
                            if (existingLog) {
                              await db.habits.update(existingLog.id!, { completed: !existingLog.completed });
                            } else {
                              await db.habits.add({
                                habitName: habit.name,
                                completed: true,
                                date: today,
                                streak: 0
                              });
                            }
                            const updated = await db.habits.toArray();
                            setHabits(updated);
                          }}
                          className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                            isCompleted
                              ? 'bg-pink-500 border-pink-500 text-white'
                              : 'border-white/20 text-transparent hover:border-pink-500/50'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                  {habitsList.length === 0 && (
                    <p className="text-[11px] text-[rgba(255,255,255,0.35)] italic py-4 text-center">No habits added yet. Add in the Habits tab!</p>
                  )}
                </div>
              ) : (
                /* Condensed stats */
                <div className="flex items-center justify-between py-3">
                  <div className="text-2xl font-bold text-white">{stats.completedToday}/{stats.totalToday}</div>
                  <span className="text-[10px] font-semibold text-pink-400 bg-pink-500/5 border border-pink-500/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                    {stats.habitRate}% done
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Progress Bar */}
            <div className="mt-3">
              {isSmall && (
                <div className="flex items-center justify-between text-[8px] font-mono text-[rgba(255,255,255,0.35)] mb-1">
                  <span>PROGRESS</span>
                </div>
              )}
              {!isSmall && (
                <div className="flex items-center justify-between text-[10px] font-mono text-[rgba(255,255,255,0.35)] mb-1.5 border-t border-white/[0.04] pt-2">
                  <span>STREAK SUMMARY</span>
                  <span className="text-pink-400 font-bold">{stats.completedToday}/{stats.totalToday} completed</span>
                </div>
              )}
              <div className="w-full h-1.5 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.habitRate}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                />
              </div>
            </div>
          </div>
        );
      }

      case 'trading-equity': {
        const isSmall = widgetSizes[id] === 'small';
        return (
          <div className="glass-card p-5 h-full cursor-grab active:cursor-grabbing">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CandlestickChart className="w-4 h-4 text-[#a78bfa]" />
                <h3 className="text-sm font-semibold text-white">Trading Equity Curve</h3>
              </div>
              <div className="flex bg-[rgba(255,255,255,0.04)] rounded-md p-0.5">
                {(['Real', 'Paper', 'Prop'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={(e) => { e.stopPropagation(); setTradingMode(mode); }}
                    className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${tradingMode === mode ? 'bg-[#a78bfa] text-black' : 'text-[rgba(255,255,255,0.4)] hover:text-white'}`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={isSmall ? 150 : 200}>
              <AreaChart data={pnlCurveData}>
                <defs>
                  <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#a78bfa" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: isSmall ? 9 : 11 }} />
                <YAxis axisLine={false} tickLine={false} width={isSmall ? 35 : 50} tick={{ fontSize: isSmall ? 9 : 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="pnl" stroke="#a78bfa" strokeWidth={2} fill="url(#pnlGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      }
      case 'active-projects':
        return (
          <div className="glass-card p-5 h-full cursor-grab active:cursor-grabbing">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-[#60a5fa]" />
                <h3 className="text-sm font-semibold text-white">Active Projects</h3>
              </div>
              <Link href="/projects" className="text-xs text-[#6ee7b7] hover:underline flex items-center gap-1">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="space-y-2">
              {projects.filter(p => p.status === 'Ongoing' || p.status === 'Planned').slice(0, 4).map((proj, i) => (
                <div key={proj.id ?? i} className="flex items-center justify-between p-3 rounded-[14px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)] transition-colors border border-[rgba(255,255,255,0.04)]">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        background: proj.status === 'Ongoing' ? '#6ee7b7' : '#fbbf24',
                        boxShadow: proj.status === 'Ongoing' ? '0 0 6px rgba(110,231,183,0.4)' : '0 0 6px rgba(251,191,36,0.4)',
                      }}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{proj.title}</p>
                      <p className="text-[10px] text-[rgba(255,255,255,0.30)] truncate">{proj.techStack.join(', ')}</p>
                    </div>
                  </div>
                  <span className="text-[10px] font-medium px-2.5 py-1 rounded-full" style={{
                    background: proj.status === 'Ongoing' ? 'rgba(110,231,183,0.08)' : 'rgba(251,191,36,0.08)',
                    color: proj.status === 'Ongoing' ? '#6ee7b7' : '#fbbf24',
                  }}>
                    {proj.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      case 'spotify':
        return <div className="h-full min-h-[200px] cursor-grab active:cursor-grabbing"><SpotifyWidget /></div>;
      case 'todos':
        return <div className="h-full cursor-grab active:cursor-grabbing"><TodoWidget /></div>;
      case 'productivity':
        return (
          <div className="glass-card p-5 h-full cursor-grab active:cursor-grabbing flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#6ee7b7]" />
              Productivity Score
            </h3>
            <div className="flex flex-1 items-center justify-center py-4">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#6ee7b7" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - stats.productivityScore / 100)}`}
                    style={{ transition: 'stroke-dashoffset 1s ease-out' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-white">{stats.productivityScore}</span>
                  <span className="text-[10px] text-[rgba(255,255,255,0.35)]">/ 100</span>
                </div>
              </div>
            </div>
          </div>
        );
      case 'recent-activity':
        return (
          <div className="glass-card p-5 h-full cursor-grab active:cursor-grabbing">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#6ee7b7]" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {timeline.map((event, i) => (
                <div key={event.id ?? i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-1.5 h-1.5 rounded-full mt-1.5"
                      style={{
                        background: event.category === 'project' ? '#60a5fa' : event.category === 'fitness' ? '#6ee7b7' : event.category === 'study' ? '#fbbf24' : '#a78bfa',
                      }}
                    />
                    {i < timeline.length - 1 && <div className="w-px flex-1 bg-[rgba(255,255,255,0.06)] mt-1" />}
                  </div>
                  <div className="pb-3">
                    <p className="text-xs font-medium text-white">{event.title}</p>
                    <p className="text-[10px] text-[rgba(255,255,255,0.30)] mt-0.5">
                      {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case 'integrations':
        return (
          <div className="glass-card p-5 h-full cursor-grab active:cursor-grabbing">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <LinkIcon className="w-4 h-4 text-[#6ee7b7]" />
              Integrations
            </h3>
            <Link href="/github" draggable={false} className="flex items-center justify-between p-3 rounded-[14px] bg-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.05)] transition-colors border border-[rgba(255,255,255,0.04)] group">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.04)]">
                  <GitBranch className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">GitHub</p>
                  <p className="text-[10px] text-[rgba(255,255,255,0.30)]">Commit & Repo Sync</p>
                </div>
              </div>
              {githubLive ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(110,231,183,0.08)] text-[#6ee7b7]">Live</span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(251,191,36,0.08)] text-[#fbbf24]">Standby</span>
              )}
            </Link>

            <div className="flex items-center justify-between p-3 rounded-[14px] bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.04)] mt-3">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-[rgba(255,255,255,0.04)]">
                  <Activity className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">Apple Health</p>
                  <p className="text-[10px] text-[rgba(255,255,255,0.30)]">
                    {stats.todaySteps > 0 ? `Synced today (${stats.todaySteps.toLocaleString()} steps)` : 'Awaiting data sync'}
                  </p>
                </div>
              </div>
              {stats.todaySteps > 0 ? (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(110,231,183,0.08)] text-[#6ee7b7]">Live</span>
              ) : (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[rgba(251,191,36,0.08)] text-[#fbbf24]">Standby</span>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <motion.div variants={item}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h1 className="text-2xl lg:text-3xl font-semibold text-white tracking-tight">
                {greeting}, <span className="gradient-text">{settings?.name?.trim() || 'there'}</span>
              </h1>
              <p className="text-xs text-[rgba(255,255,255,0.35)] font-mono mt-1">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: 'rgba(110,231,183,0.06)', border: '1px solid rgba(110,231,183,0.12)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#6ee7b7]" style={{ boxShadow: '0 0 6px rgba(110,231,183,0.5)' }} />
              <span className="text-[10px] text-[rgba(255,255,255,0.55)] font-mono">Online</span>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Zap className="w-4 h-4" />}
            label="Productivity"
            value={`${stats.productivityScore}%`}
            color="#6ee7b7"
          />
          <StatCard
            icon={<FolderKanban className="w-4 h-4" />}
            label="Active Projects"
            value={stats.activeProjects.toString()}
            sub={`${stats.finishedProjects} finished`}
            color="#60a5fa"
          />
          <StatCard
            icon={<Footprints className="w-4 h-4" />}
            label="Steps Today"
            value={stats.todaySteps.toLocaleString()}
            sub={stats.todayFitness ? `${stats.todayFitness.distance.toFixed(1)} km · ${stats.todayFitness.caloriesBurned} kcal` : '0.0 km · 0 kcal'}
            color="#6ee7b7"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Trading P&L"
            value={`$${stats.totalPnl.toLocaleString()}`}
            sub={`${stats.winRate.toFixed(1)}% Win Rate`}
            color="#a78bfa"
          />
        </motion.div>

        {/* Drag-and-Drop Masonry/Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 grid-flow-dense pb-12">
          {activeWidgets.map((widgetId, index) => {
            const size = widgetSizes[widgetId] || 'small';
            const isWide = size === 'large';
            return (
              <motion.div
                key={widgetId}
                layout
                draggable
                onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent, index)}
                onDragEnter={(e) => handleDragEnter(e as unknown as React.DragEvent, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`relative group ${isWide ? 'md:col-span-2 lg:col-span-2' : 'col-span-1'} ${draggedItem === index ? 'opacity-50 z-50 scale-[1.02]' : 'opacity-100'}`}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                {renderWidget(widgetId)}
                <button
                  onClick={(e) => { e.stopPropagation(); toggleWidgetSize(widgetId); }}
                  draggable={false}
                  className="absolute top-3 right-3 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                  title={isWide ? 'Shrink widget' : 'Expand widget'}
                >
                  {isWide ? <Minimize2 className="w-3 h-3 text-[rgba(255,255,255,0.5)]" /> : <Maximize2 className="w-3 h-3 text-[rgba(255,255,255,0.5)]" />}
                </button>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// ─── Stat Card Component ─────────────────────────────────────
function StatCard({
  icon, label, value, trend, sub, color,
}: {
  icon: React.ReactNode; label: string; value: string;
  trend?: number; sub?: string; color: string;
}) {
  return (
    <div className="glass-card p-4 hover:border-[rgba(110,231,183,0.20)] transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: `${color}12` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-medium ${trend >= 0 ? 'text-[#6ee7b7]' : 'text-[#f87171]'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-[10px] text-[rgba(255,255,255,0.35)] mt-0.5">{sub || label}</p>
    </div>
  );
}
