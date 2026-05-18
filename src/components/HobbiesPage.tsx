'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { db, type HobbyEntry } from '@/lib/db';
import { Gamepad2, Plus, X, Clock, TrendingUp, Trash2, Edit3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import SystemModal from './SystemModal';

const COLORS = ['#00d4ff', '#a855f7', '#ec4899', '#22c55e', '#f97316', '#3b82f6'];
const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function HobbiesPage() {
  const [hobbies, setHobbies] = useState<HobbyEntry[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingHobby, setEditingHobby] = useState<HobbyEntry | null>(null);
  const [modal, setModal] = useState<any>(null);

  const load = async () => { 
    setHobbies(await db.hobbies.orderBy('date').reverse().toArray()); 
  };
  
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
        <motion.div variants={fi} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[rgba(236,72,153,0.1)]">
              <Gamepad2 className="w-5 h-5 text-[var(--accent-pink)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Hobbies</h1>
              <p className="text-xs text-[var(--text-tertiary)] font-mono">Track your passions & creative pursuits</p>
            </div>
          </div>
          <button onClick={() => setShowAdd(true)} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-pink)] to-[var(--accent-purple)] text-white text-sm font-medium hover:brightness-110 transition-all w-full sm:w-auto">
            <Plus className="w-4 h-4" /> Log Session
          </button>
        </motion.div>

        <motion.div variants={fi} className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-[var(--accent-pink)]" />
              <span className="text-xs text-[var(--text-tertiary)]">Total Hours</span>
            </div>
            <p className="text-xl font-bold font-mono">{totalHours}h</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-[var(--accent-purple)]" />
              <span className="text-xs text-[var(--text-tertiary)]">Sessions</span>
            </div>
            <p className="text-xl font-bold font-mono">{sessions}</p>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <Gamepad2 className="w-4 h-4 text-[var(--accent-cyan)]" />
              <span className="text-xs text-[var(--text-tertiary)]">Unique Hobbies</span>
            </div>
            <p className="text-xl font-bold font-mono">{byCategory.length}</p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div variants={fi} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4 font-mono text-[var(--text-secondary)]">Time by Hobby</h3>
            {byCategory.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] font-mono py-12 text-center">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={byCategory} barSize={24} layout="vertical">
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)' }} />
                  <Bar dataKey="value" name="Minutes" radius={[0, 6, 6, 0]}>
                    {byCategory.map((e, i) => <Cell key={i} fill={e.fill} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>
          <motion.div variants={fi} className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4 font-mono text-[var(--text-secondary)]">Distribution</h3>
            {byCategory.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] font-mono py-12 text-center">No data available</p>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie data={byCategory} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={3} dataKey="value">
                      {byCategory.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1 mt-3 max-h-[120px] overflow-y-auto pr-1">
                  {byCategory.map(c => (
                    <div key={c.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: c.fill }} />
                        <span className="text-[var(--text-secondary)]">{c.name}</span>
                      </div>
                      <span className="text-[var(--text-tertiary)] font-mono">{Math.round(c.value / 60)}h</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </motion.div>
        </div>

        {/* Recent Sessions */}
        <motion.div variants={fi} className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4 font-mono text-[var(--text-secondary)]">Recent Sessions</h3>
          <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1">
            {hobbies.length === 0 ? (
              <p className="text-xs text-[var(--text-tertiary)] text-center py-8 font-mono">No creative sessions logged yet.</p>
            ) : (
              hobbies.map((h, i) => {
                const colorIndex = byCategory.findIndex(c => c.name.toLowerCase() === h.name.toLowerCase());
                const color = COLORS[colorIndex >= 0 ? colorIndex % COLORS.length : i % COLORS.length];
                return (
                  <div key={h.id ?? i} className="group flex items-center justify-between p-3 rounded-xl bg-[var(--bg-hover)] border border-transparent hover:border-[rgba(236,72,153,0.2)] transition-all">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold font-mono" 
                        style={{ background: `${color}15`, color: color }}
                      >
                        {h.name[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold">{h.name}</p>
                          {h.notes && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] text-[var(--text-muted)] font-sans border border-[var(--border-subtle)] truncate max-w-[200px]" title={h.notes}>
                              {h.notes}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--text-muted)] font-mono">{new Date(h.date).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--text-secondary)] font-mono mr-2">{h.timeSpent} min</span>
                      <button 
                        onClick={() => setEditingHobby(h)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[rgba(255,255,255,0.05)] text-[var(--text-tertiary)] hover:text-white transition-all"
                        title="Edit Session"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => {
                          setModal({
                            isOpen: true,
                            type: 'confirm',
                            title: 'Delete Session',
                            message: `Delete session for "${h.name}"?`,
                            onConfirm: async () => {
                              await db.hobbies.delete(h.id!);
                              load();
                              setModal(null);
                            }
                          });
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-[rgba(239,68,68,0.1)] text-[var(--text-tertiary)] hover:text-red-400 transition-all"
                        title="Delete Session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* Log Session Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setShowAdd(false)}>
          <div onClick={e => e.stopPropagation()} className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Log Hobby Session</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <HobbyForm 
              onCancel={() => setShowAdd(false)}
              onSave={async (e) => { 
                await db.hobbies.add(e); 
                load(); 
                setShowAdd(false); 
              }} 
            />
          </div>
        </div>
      )}

      {/* Edit Session Modal */}
      {editingHobby && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setEditingHobby(null)}>
          <div onClick={e => e.stopPropagation()} className="glass-card w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Edit Hobby Session</h2>
              <button onClick={() => setEditingHobby(null)} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <HobbyForm 
              initialData={editingHobby} 
              onCancel={() => setEditingHobby(null)}
              onSave={async (e) => { 
                await db.hobbies.update(e.id!, e); 
                load(); 
                setEditingHobby(null); 
              }} 
            />
          </div>
        </div>
      )}
      {/* System Modal Integration */}
      <SystemModal
        isOpen={!!modal?.isOpen}
        type={modal?.type || 'alert'}
        title={modal?.title || ''}
        message={modal?.message || ''}
        defaultValue={modal?.defaultValue}
        onConfirm={modal?.onConfirm || (() => {})}
        onCancel={() => setModal(null)}
      />
    </div>
  );
}

interface HobbyFormProps {
  initialData?: HobbyEntry | null;
  onSave: (data: Omit<HobbyEntry, 'id'> & { id?: number }) => void;
  onCancel: () => void;
}

function HobbyForm({ initialData, onSave, onCancel }: HobbyFormProps) {
  const [name, setName] = useState(initialData?.name || 'Coding');
  const [timeSpent, setTimeSpent] = useState(initialData?.timeSpent?.toString() || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [date, setDate] = useState(
    initialData?.date 
      ? new Date(initialData.date).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]
  );

  const PRESETS = ['Coding', 'Electronics', 'Gym', 'Reading', 'Gaming', 'Music', 'Design', 'Writing'];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData?.id,
      name: name.trim(),
      category: name.trim(),
      timeSpent: parseInt(timeSpent, 10) || 0,
      notes: notes.trim(),
      date: new Date(date)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block font-mono">Hobby Name</label>
        <input 
          value={name} 
          onChange={e => setName(e.target.value)} 
          type="text" 
          placeholder="e.g. Piano, Writing, Drone Building"
          className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[var(--accent-pink)] transition-all font-sans text-white" 
          required
        />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {PRESETS.map(preset => (
            <button
              key={preset}
              type="button"
              onClick={() => setName(preset)}
              className={`text-[10px] px-2 py-1 rounded-lg border font-mono transition-all ${
                name.toLowerCase() === preset.toLowerCase()
                  ? 'border-[var(--accent-pink)] bg-[rgba(236,72,153,0.1)] text-[var(--accent-pink)]'
                  : 'border-[var(--border-subtle)] bg-transparent text-[var(--text-tertiary)] hover:border-[var(--text-secondary)] text-[var(--text-secondary)]'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block font-mono">Duration (min)</label>
          <input 
            value={timeSpent} 
            onChange={e => setTimeSpent(e.target.value)} 
            type="number" 
            placeholder="Min"
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[var(--accent-pink)] transition-all text-white" 
            required
            min="1"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block font-mono">Date</label>
          <input 
            value={date} 
            onChange={e => setDate(e.target.value)} 
            type="date" 
            className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[var(--accent-pink)] transition-all font-mono text-white" 
            required
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-semibold text-[var(--text-secondary)] mb-1.5 block font-mono">Session Notes</label>
        <textarea 
          value={notes} 
          onChange={e => setNotes(e.target.value)} 
          placeholder="What did you work on or practice today?"
          rows={3}
          className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[var(--accent-pink)] transition-all font-sans resize-none text-white" 
        />
      </div>

      <div className="flex gap-2.5 pt-2">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-white font-medium text-sm transition-all"
        >
          Cancel
        </button>
        <button 
          type="submit"
          className="flex-1 py-3 rounded-xl bg-gradient-to-r from-[var(--accent-pink)] to-[var(--accent-purple)] text-white font-medium text-sm hover:brightness-110 active:scale-[0.98] transition-all"
        >
          {initialData ? 'Save Changes' : 'Log Session'}
        </button>
      </div>
    </form>
  );
}
