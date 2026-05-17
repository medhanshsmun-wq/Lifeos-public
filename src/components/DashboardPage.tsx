'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { db, type Project, type FitnessEntry, type TimelineEvent, type StudySession, type UserSettings, type Trade, type Todo } from '@/lib/db';
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
  'activity-overview': 'large',
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
      const [p, t, fit, timelineData, s, study, todoData] = await Promise.all([
        db.projects.toArray(),
        db.trades.toArray(),
        db.fitness.orderBy('date').reverse().limit(14).toArray(),
        db.timeline.orderBy('date').reverse().limit(6).toArray(),
        db.settings.toArray(),
        db.study.toArray(),
        db.todos.toArray(),
      ]);
      setProjects(p);
      setTrades(t);
      setFitness(fit.reverse());
      setTimeline(timelineData);
      setStudySessions(study);
      setTodos(todoData);
      if (s[0]) {
        setSettings(s[0]);
        if (s[0].githubToken) setGithubLive(true);
        
        let w = s[0].dashboardWidgets || ['todos', 'productivity', 'recent-activity', 'integrations'];
        const wideWidgets = ['activity-overview', 'trading-equity', 'active-projects'];
        const missing = wideWidgets.filter(ww => !w.includes(ww));
        if (missing.length > 0) {
          w = [...missing, ...w];
        }
        if (!w.includes('spotify')) {
          w.push('spotify');
        }
        w = w.filter(id => id !== 'ai-insights' && id !== 'habits');
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

    const todaySteps = fitness.length > 0 ? fitness[fitness.length - 1]?.steps || 0 : 0;
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

    // Productivity score (composite — habits removed, points redistributed)
    let productivityScore = 0;
    
    if (settings?.summerBreakMode) {
      const projectScore = Math.min((activeProjects + finishedProjects) * 7, 30);
      const fitnessScore = Math.min(avgSteps / 250, 35);
      const todoScore = Math.min(todoRate * 0.35, 35);
      productivityScore = Math.min(Math.round(projectScore + fitnessScore + todoScore), 100);
    } else {
      // eslint-disable-next-line react-hooks/purity
      const now = Date.now();
      const last7DaysStudy = studySessions.filter(s => new Date(s.date).getTime() > now - 7 * 24 * 60 * 60 * 1000);
      const recentStudyMinutes = last7DaysStudy.reduce((sum, s) => sum + s.duration, 0);
      
      const projectScore = Math.min((activeProjects + finishedProjects) * 5, 25);
      const fitnessScore = Math.min(avgSteps / 350, 25);
      const studyScore = Math.min((recentStudyMinutes / 60) * 10, 25);
      const todoScore = Math.min(todoRate * 0.25, 25);
      
      productivityScore = Math.min(Math.round(projectScore + fitnessScore + studyScore + todoScore), 100);
    }

    return {
      activeProjects, finishedProjects, totalPnl, winRate,
      todaySteps, avgSteps, totalCalories, productivityScore,
    };
  }, [projects, trades, fitness, studySessions, settings, todos, tradingMode]);

  // Chart data
  const stepsChartData = useMemo(() => fitness.map((f, i) => ({
    day: `D${i + 1}`,
    steps: f.steps,
    calories: f.caloriesBurned,
  })), [fitness]);

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

  const renderWidget = (id: string) => {
    switch (id) {
      case 'activity-overview': {
        const isSmall = widgetSizes[id] === 'small';
        return (
          <div className="glass-card p-5 h-full cursor-grab active:cursor-grabbing">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#6ee7b7]" />
                <h3 className="text-sm font-semibold text-white">Activity Overview</h3>
              </div>
              <span className="text-[10px] font-medium text-[rgba(255,255,255,0.35)] tracking-[0.15em] uppercase">14 days</span>
            </div>
            <ResponsiveContainer width="100%" height={isSmall ? 150 : 220}>
              <AreaChart data={stepsChartData}>
                <defs>
                  <linearGradient id="stepsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6ee7b7" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6ee7b7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: isSmall ? 9 : 11 }} />
                <YAxis axisLine={false} tickLine={false} width={isSmall ? 30 : 40} tick={{ fontSize: isSmall ? 9 : 11 }} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="steps" stroke="#6ee7b7" strokeWidth={2} fill="url(#stepsGrad)" />
              </AreaChart>
            </ResponsiveContainer>
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
                {greeting}, <span className="gradient-text">Medhansh</span>
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
            sub={`${stats.avgSteps.toLocaleString()} avg`}
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
