'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { db } from '@/lib/db';
import { BarChart3, TrendingUp, Brain, Zap, Target, Activity } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function AnalyticsPage() {
  const [data, setData] = useState<{ weeklyProd: { week: string; score: number }[]; lifeBalance: { area: string; value: number; fullMark: number }[]; trends: { day: string; fitness: number; study: number; coding: number }[] }>({ weeklyProd: [], lifeBalance: [], trends: [] });

  useEffect(() => {
    const load = async () => {
      const [fitness, study, hobbies, habits, projects, trades] = await Promise.all([
        db.fitness.orderBy('date').toArray(),
        db.study.orderBy('date').toArray(),
        db.hobbies.toArray(),
        db.habits.toArray(),
        db.projects.toArray(),
        db.trades.toArray(),
      ]);

      // Weekly productivity scores (mock removed, calculating basic weekly entry counts)
      const weeklyProd = Array.from({ length: 8 }, (_, i) => {
        const week = `W${i + 1}`;
        const score = Math.min(100, Math.floor(fitness.length * 2 + study.length * 3 + projects.length * 5 + trades.length * 4) || 0);
        return { week, score };
      });

      // Life balance radar
      const fitScore = Math.min(100, fitness.length * 3);
      const studyScore = Math.min(100, study.length * 3);
      const hobbyScore = Math.min(100, hobbies.length * 2);
      const habitScore = Math.min(100, habits.length ? (habits.filter(h => h.completed).length / Math.max(1, habits.length)) * 100 : 0);
      const projScore = Math.min(100, projects.length * 15);
      const tradingScore = Math.min(100, trades.length * 10);
      
      const lifeBalance = [
        { area: 'Fitness', value: fitScore, fullMark: 100 },
        { area: 'Study', value: studyScore, fullMark: 100 },
        { area: 'Hobbies', value: hobbyScore, fullMark: 100 },
        { area: 'Habits', value: habitScore, fullMark: 100 },
        { area: 'Projects', value: projScore, fullMark: 100 },
        { area: 'Trading', value: tradingScore, fullMark: 100 },
      ];

      // Daily trends (derived from actual data)
      const trends = Array.from({ length: 7 }, (_, i) => {
        const day = `D${i + 1}`;
        const f = fitness[i];
        const s = study[i];
        const h = hobbies.filter(hx => hx.name === 'Coding')[i];
        return {
          day,
          fitness: f ? Math.round(f.steps / 100) : 0,
          study: s?.duration || 0,
          coding: h?.timeSpent || 0,
        };
      });

      setData({ weeklyProd, lifeBalance, trends });
    };
    load();
  }, []);

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }} className="max-w-[1400px] mx-auto space-y-6">
        <motion.div variants={fi} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[rgba(0,212,255,0.1)]"><BarChart3 className="w-5 h-5 text-[var(--accent-cyan)]" /></div>
          <div><h1 className="text-2xl font-bold">Analytics</h1><p className="text-xs text-[var(--text-tertiary)] font-mono">Behavioral intelligence & life metrics</p></div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={fi} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[var(--accent-cyan)]" /> Weekly Productivity</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.weeklyProd}><defs><linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent-cyan)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--accent-cyan)" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="week" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} width={40} domain={[0, 100]} /><Tooltip /><Area type="monotone" dataKey="score" stroke="var(--accent-cyan)" strokeWidth={2} fill="url(#prodGrad)" /></AreaChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div variants={fi} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Brain className="w-4 h-4 text-[var(--accent-purple)]" /> Life Balance</h3>
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={data.lifeBalance}><PolarGrid stroke="rgba(255,255,255,0.06)" /><PolarAngleAxis dataKey="area" tick={{ fill: 'var(--text-tertiary)', fontSize: 11 }} /><PolarRadiusAxis tick={false} axisLine={false} domain={[0, 100]} /><Radar dataKey="value" stroke="var(--accent-purple)" fill="var(--accent-purple)" fillOpacity={0.15} strokeWidth={2} /></RadarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div variants={fi} className="glass-card p-5 lg:col-span-2">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-[var(--accent-green)]" /> Multi-Domain Trends</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={data.trends}><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} width={40} /><Tooltip /><Line type="monotone" dataKey="fitness" stroke="var(--accent-green)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="study" stroke="var(--accent-yellow)" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="coding" stroke="var(--accent-cyan)" strokeWidth={2} dot={false} /></LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-6 mt-3 justify-center">{[{ l: 'Fitness', c: 'var(--accent-green)' }, { l: 'Study', c: 'var(--accent-yellow)' }, { l: 'Coding', c: 'var(--accent-cyan)' }].map(x => (<div key={x.l} className="flex items-center gap-2 text-xs text-[var(--text-tertiary)]"><div className="w-3 h-0.5 rounded-full" style={{ background: x.c }} />{x.l}</div>))}</div>
          </motion.div>
        </div>


      </motion.div>
    </div>
  );
}
