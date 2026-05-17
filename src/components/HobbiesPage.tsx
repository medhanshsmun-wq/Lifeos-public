'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { db, type HobbyEntry } from '@/lib/db';
import { Gamepad2, Plus, X, Clock, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#00d4ff', '#a855f7', '#ec4899', '#22c55e', '#f97316', '#3b82f6'];
const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function HobbiesPage() {
  const [hobbies, setHobbies] = useState<HobbyEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const load = async () => { setHobbies(await db.hobbies.orderBy('date').reverse().toArray()); };
  useEffect(() => { load(); }, []);

  const byCategory = useMemo(() => {
    const cats: Record<string, number> = {};
    hobbies.forEach(h => { cats[h.name] = (cats[h.name] || 0) + h.timeSpent; });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([name, value], i) => ({ name, value, fill: COLORS[i % COLORS.length] }));
  }, [hobbies]);

  const totalHours = Math.round(hobbies.reduce((s, h) => s + h.timeSpent, 0) / 60);
  const sessions = hobbies.length;

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }} className="max-w-[1400px] mx-auto space-y-6">
        <motion.div variants={fi} className="flex items-center justify-between">
          <div className="flex items-center gap-3"><div className="p-2.5 rounded-xl bg-[rgba(236,72,153,0.1)]"><Gamepad2 className="w-5 h-5 text-[var(--accent-pink)]" /></div><div><h1 className="text-2xl font-bold">Hobbies</h1><p className="text-xs text-[var(--text-tertiary)] font-mono">Track your passions & creative pursuits</p></div></div>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-pink)] to-[var(--accent-purple)] text-white text-sm font-medium"><Plus className="w-4 h-4" /> Log</button>
        </motion.div>

        <motion.div variants={fi} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="glass-card p-4"><div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-[var(--accent-pink)]" /><span className="text-xs text-[var(--text-tertiary)]">Total Hours</span></div><p className="text-xl font-bold">{totalHours}h</p></div>
          <div className="glass-card p-4"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-[var(--accent-purple)]" /><span className="text-xs text-[var(--text-tertiary)]">Sessions</span></div><p className="text-xl font-bold">{sessions}</p></div>
          <div className="glass-card p-4"><div className="flex items-center gap-2 mb-2"><Gamepad2 className="w-4 h-4 text-[var(--accent-cyan)]" /><span className="text-xs text-[var(--text-tertiary)]">Hobbies</span></div><p className="text-xl font-bold">{byCategory.length}</p></div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={fi} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Time by Hobby</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={byCategory} barSize={32} layout="vertical"><XAxis type="number" axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" axisLine={false} tickLine={false} width={80} /><Tooltip /><Bar dataKey="value" radius={[0, 6, 6, 0]}>{byCategory.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart>
            </ResponsiveContainer>
          </motion.div>
          <motion.div variants={fi} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Distribution</h3>
            <ResponsiveContainer width="100%" height={200}><PieChart><Pie data={byCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">{byCategory.map((e, i) => <Cell key={i} fill={e.fill} />)}</Pie></PieChart></ResponsiveContainer>
            <div className="space-y-1 mt-3">{byCategory.map(c => (<div key={c.name} className="flex items-center justify-between text-xs"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full" style={{ background: c.fill }} /><span className="text-[var(--text-secondary)]">{c.name}</span></div><span className="text-[var(--text-tertiary)]">{Math.round(c.value / 60)}h</span></div>))}</div>
          </motion.div>
        </div>

        {/* Recent Sessions */}
        <motion.div variants={fi} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Recent Sessions</h3>
          <div className="space-y-2 max-h-[300px] overflow-y-auto">{hobbies.slice(0, 15).map((h, i) => (
            <div key={h.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-hover)]">
              <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: `${COLORS[byCategory.findIndex(c => c.name === h.name) % COLORS.length]}20`, color: COLORS[byCategory.findIndex(c => c.name === h.name) % COLORS.length] }}>{h.name[0]}</div><div><p className="text-xs font-medium">{h.name}</p><p className="text-[10px] text-[var(--text-muted)]">{new Date(h.date).toLocaleDateString()}</p></div></div>
              <span className="text-xs text-[var(--text-secondary)]">{h.timeSpent} min</span>
            </div>
          ))}</div>
        </motion.div>
      </motion.div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Log Hobby</h2><button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]"><X className="w-4 h-4" /></button></div>
            <HobbyForm onSave={async (e) => { await db.hobbies.add(e); load(); setShowAdd(false); }} />
          </div>
        </div>
      )}
    </div>
  );
}

function HobbyForm({ onSave }: { onSave: (e: Omit<HobbyEntry, 'id'>) => void }) {
  const [name, setName] = useState('Coding'); const [time, setTime] = useState('');
  return (<div className="space-y-3">
    <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Hobby</label><select value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none appearance-none">{['Coding','Electronics','Gym','Reading','Gaming','Music'].map(o => <option key={o}>{o}</option>)}</select></div>
    <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Time (min)</label><input value={time} onChange={e => setTime(e.target.value)} type="number" className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none" /></div>
    <button onClick={() => onSave({ name, category: name, timeSpent: +time || 0, date: new Date(), notes: '' })} className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent-pink)] to-[var(--accent-purple)] text-white font-medium text-sm">Save</button>
  </div>);
}
