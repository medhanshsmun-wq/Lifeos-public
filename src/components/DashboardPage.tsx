'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { db, type Project, type FinanceEntry, type FitnessEntry, type HabitEntry, type TimelineEvent } from '@/lib/db';
import {
  Activity,
  TrendingUp,
  Footprints,
  Flame,
  Wallet,
  FolderKanban,
  Clock,
  Zap,
  GitBranch,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Brain,
  Link as LinkIcon,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from 'recharts';
import SpotifyWidget from './SpotifyWidget';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeInOut' as const } },
};

// Custom Tooltip
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="text-xs text-[var(--text-tertiary)] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-sm font-semibold text-[var(--text-primary)]">
          {typeof p.value === 'number' ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [finance, setFinance] = useState<FinanceEntry[]>([]);
  const [fitness, setFitness] = useState<FitnessEntry[]>([]);
  const [habits, setHabits] = useState<HabitEntry[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [githubLive, setGithubLive] = useState(false);
  const [greeting, setGreeting] = useState('');
  const [activeWidgets, setActiveWidgets] = useState<string[]>(['productivity', 'habits', 'ai-insights', 'recent-activity', 'integrations']);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 17) setGreeting('Good afternoon');
    else setGreeting('Good evening');

    const load = async () => {
      const [p, f, fit, h, t, s] = await Promise.all([
        db.projects.toArray(),
        db.finance.toArray(),
        db.fitness.orderBy('date').reverse().limit(14).toArray(),
        db.habits.toArray(),
        db.timeline.orderBy('date').reverse().limit(6).toArray(),
        db.settings.toArray(),
      ]);
      setProjects(p);
      setFinance(f);
      setFitness(fit.reverse());
      setHabits(h);
      setTimeline(t);
      if (s[0]) {
        if (s[0].githubToken) setGithubLive(true);
        if (s[0].dashboardWidgets) setActiveWidgets(s[0].dashboardWidgets);
        if (s[0].accentColor) {
          document.documentElement.style.setProperty('--accent-cyan', s[0].accentColor);
        }
      }
    };
    load();
  }, []);

  // Compute stats
  const stats = useMemo(() => {
    const activeProjects = projects.filter(p => p.status === 'Ongoing').length;
    const finishedProjects = projects.filter(p => p.status === 'Finished').length;

    const totalExpenses = finance.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0);
    const totalIncome = finance.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0);

    const todaySteps = fitness.length > 0 ? fitness[fitness.length - 1]?.steps || 0 : 0;
    const totalSteps = fitness.reduce((s, f) => s + f.steps, 0);
    const avgSteps = fitness.length > 0 ? Math.round(totalSteps / fitness.length) : 0;
    const totalCalories = fitness.reduce((s, f) => s + f.caloriesBurned, 0);

    const todayHabits = habits.filter(h => {
      const d = new Date(h.date);
      const today = new Date();
      return d.toDateString() === today.toDateString();
    });
    const completedToday = todayHabits.filter(h => h.completed).length;
    const totalToday = todayHabits.length;
    const habitRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

    // Productivity score (composite)
    const projectScore = Math.min((activeProjects + finishedProjects) * 10, 30);
    const habitScore = Math.min(habitRate * 0.4, 40);
    const fitnessScore = Math.min(avgSteps / 250, 30);
    const productivityScore = Math.min(Math.round(projectScore + habitScore + fitnessScore), 100);

    return {
      activeProjects, finishedProjects, totalExpenses, totalIncome,
      todaySteps, avgSteps, totalCalories, habitRate, productivityScore,
      completedToday, totalToday,
    };
  }, [projects, finance, fitness, habits]);

  // Chart data
  const stepsChartData = fitness.map((f, i) => ({
    day: `D${i + 1}`,
    steps: f.steps,
    calories: f.caloriesBurned,
  }));

  const spendingByCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    finance.filter(f => f.type === 'expense').forEach(f => {
      cats[f.category] = (cats[f.category] || 0) + f.amount;
    });
    return Object.entries(cats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [finance]);

  const productivityRadial = [
    { name: 'score', value: stats.productivityScore, fill: 'url(#gradientRadial)' },
  ];

  const aiRecommendations = [
    { icon: Brain, text: 'AI insights are generating based on your current data patterns...', color: 'var(--accent-purple)' }
  ];

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-[var(--text-primary)]">
              {greeting}, <span className="gradient-text">Medhansh</span>
            </h1>
            <p className="text-sm text-[var(--text-tertiary)] mt-1 font-mono">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="glass-card-sm px-4 py-2 flex items-center gap-2">
              <div className="status-dot status-active" />
              <span className="text-xs text-[var(--text-secondary)] font-mono">System Online</span>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats Row */}
        <motion.div variants={item} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Zap className="w-4 h-4" />}
            label="Productivity"
            value={`${stats.productivityScore}%`}
            trend={+12}
            color="var(--accent-cyan)"
          />
          <StatCard
            icon={<FolderKanban className="w-4 h-4" />}
            label="Active Projects"
            value={stats.activeProjects.toString()}
            sub={`${stats.finishedProjects} finished`}
            color="var(--accent-blue)"
          />
          <StatCard
            icon={<Footprints className="w-4 h-4" />}
            label="Steps Today"
            value={stats.todaySteps.toLocaleString()}
            sub={`${stats.avgSteps.toLocaleString()} avg`}
            color="var(--accent-green)"
          />
          <StatCard
            icon={<Wallet className="w-4 h-4" />}
            label="Balance"
            value={`₹${(stats.totalIncome - stats.totalExpenses).toLocaleString()}`}
            trend={stats.totalIncome > stats.totalExpenses ? +8 : -5}
            color="var(--accent-orange)"
          />
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Charts */}
          <motion.div variants={item} className="lg:col-span-2 space-y-6">
            {/* Steps Chart */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[var(--accent-green)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Activity Overview</h3>
                </div>
                <span className="badge badge-green">14 days</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={stepsChartData}>
                  <defs>
                    <linearGradient id="stepsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={40} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="steps" stroke="var(--accent-green)" strokeWidth={2} fill="url(#stepsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Spending Chart */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-[var(--accent-orange)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Spending by Category</h3>
                </div>
                <span className="badge badge-orange">This month</span>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={spendingByCategory} barSize={32}>
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--accent-orange)" stopOpacity={0.8} />
                      <stop offset="100%" stopColor="var(--accent-pink)" stopOpacity={0.4} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} width={50} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="value" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Active Projects */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-[var(--accent-blue)]" />
                  <h3 className="text-sm font-semibold text-[var(--text-primary)]">Active Projects</h3>
                </div>
                <a href="/projects" className="text-xs text-[var(--accent-cyan)] hover:underline flex items-center gap-1">
                  View all <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
              <div className="space-y-3">
                {projects.filter(p => p.status === 'Ongoing' || p.status === 'Planned').slice(0, 4).map((proj, i) => (
                  <div key={proj.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-elevated)] transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div
                        className="status-dot flex-shrink-0"
                        style={{
                          background: proj.status === 'Ongoing' ? 'var(--accent-green)' : 'var(--accent-yellow)',
                          boxShadow: proj.status === 'Ongoing' ? '0 0 8px rgba(34,197,94,0.5)' : '0 0 8px rgba(234,179,8,0.5)',
                        }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--text-primary)] truncate">{proj.title}</p>
                        <p className="text-xs text-[var(--text-tertiary)] truncate">{proj.techStack.join(', ')}</p>
                      </div>
                    </div>
                    <span className={`badge ${proj.status === 'Ongoing' ? 'badge-green' : 'badge-orange'}`}>
                      {proj.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column */}
          <motion.div variants={item} className="space-y-6">
            {/* Spotify Widget */}
            {activeWidgets.includes('integrations') && (
              <div className="min-h-[200px]">
                <SpotifyWidget />
              </div>
            )}
            {/* Productivity Score */}
            {activeWidgets.includes('productivity') && (
              <div className="glass-card p-5 flex flex-col items-center">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 self-start flex items-center gap-2">
                  <Target className="w-4 h-4 text-[var(--accent-cyan)]" />
                  Productivity Score
                </h3>
                <div className="relative">
                  <ResponsiveContainer width={180} height={180}>
                    <RadialBarChart innerRadius="75%" outerRadius="100%" data={productivityRadial} startAngle={90} endAngle={-270}>
                      <defs>
                        <linearGradient id="gradientRadial" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="var(--accent-cyan)" />
                          <stop offset="100%" stopColor="var(--accent-purple)" />
                        </linearGradient>
                      </defs>
                      <RadialBar
                        dataKey="value"
                        cornerRadius={12}
                        background={{ fill: 'rgba(255,255,255,0.04)' }}
                      />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold gradient-text">{stats.productivityScore}</span>
                    <span className="text-xs text-[var(--text-tertiary)]">/ 100</span>
                  </div>
                </div>
              </div>
            )}

            {/* Habit Tracker */}
            {activeWidgets.includes('habits') && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[var(--accent-pink)]" />
                  Today&apos;s Habits
                </h3>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl font-bold text-[var(--text-primary)]">{stats.completedToday}/{stats.totalToday}</span>
                  <span className={`badge ${stats.habitRate >= 70 ? 'badge-green' : 'badge-orange'}`}>{stats.habitRate}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-[rgba(255,255,255,0.04)] overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent-pink)] to-[var(--accent-purple)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.habitRate}%` }}
                    transition={{ duration: 1, delay: 0.5 }}
                  />
                </div>
              </div>
            )}

            {/* AI Recommendations */}
            {activeWidgets.includes('ai-insights') && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[var(--accent-purple)]" />
                  AI Insights
                </h3>
                <div className="space-y-3">
                  {aiRecommendations.map((rec, i) => {
                    const Icon = rec.icon;
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.8 + i * 0.15 }}
                        className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[var(--bg-hover)] transition-colors"
                      >
                        <Icon className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: rec.color }} />
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{rec.text}</p>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Timeline */}
            {activeWidgets.includes('recent-activity') && (
              <div className="glass-card p-5">
                <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[var(--accent-cyan)]" />
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {timeline.map((event, i) => (
                    <div key={event.id ?? i} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-2 h-2 rounded-full mt-1.5"
                          style={{
                            background: event.category === 'project' ? 'var(--accent-blue)' : event.category === 'fitness' ? 'var(--accent-green)' : event.category === 'study' ? 'var(--accent-yellow)' : 'var(--accent-purple)',
                          }}
                        />
                        {i < timeline.length - 1 && <div className="w-px flex-1 bg-[var(--border-subtle)] mt-1" />}
                      </div>
                      <div className="pb-3">
                        <p className="text-xs font-medium text-[var(--text-primary)]">{event.title}</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                          {new Date(event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Integrations Standby / Active */}
            {activeWidgets.includes('integrations') && (
              <div className="space-y-6">
                <div className="glass-card p-5">
                  <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-[var(--accent-cyan)]" />
                    Integrations
                  </h3>
                  <div className="space-y-3">
                    {/* GitHub Integration */}
                    <Link href="/github" className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[rgba(255,255,255,0.05)] transition-colors group cursor-pointer border border-transparent hover:border-[var(--border-glow)]">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[rgba(255,255,255,0.05)] group-hover:bg-[rgba(255,255,255,0.1)] transition-colors">
                          <GitBranch className="w-4 h-4 text-[var(--text-primary)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">GitHub</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">Commit & Repo Sync</p>
                        </div>
                      </div>
                      {githubLive ? (
                        <span className="badge badge-green flex items-center gap-1">Live</span>
                      ) : (
                        <span className="badge badge-orange flex items-center gap-1">Standby</span>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
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
    <div className="glass-card p-4 shine-hover hover:border-[var(--border-glow)] transition-all duration-300">
      <div className="flex items-center justify-between mb-2">
        <div className="p-2 rounded-lg" style={{ background: `${color}15` }}>
          <div style={{ color }}>{icon}</div>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-xs ${trend >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
            {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </div>
        )}
      </div>
      <p className="text-xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{sub || label}</p>
    </div>
  );
}
