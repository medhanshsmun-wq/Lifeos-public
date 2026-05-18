'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, type FitnessEntry, type DietEntry, type GymEntry } from '@/lib/db';
import { Dumbbell, Footprints, Flame, Timer, TrendingUp, Plus, X, Target, Utensils, Activity, Brain } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import SystemModal from './SystemModal';

const anim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

function CT({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><p className="text-xs text-[var(--text-tertiary)] mb-1">{label}</p><p className="text-sm font-semibold text-[var(--text-primary)]">{payload[0].value.toLocaleString()}</p></div>;
}

export default function FitnessPage() {
  const [tab, setTab] = useState<'activity' | 'diet' | 'gym'>('activity');

  // Selected Date for historical logging
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Activity Data
  const [fitness, setFitness] = useState<FitnessEntry[]>([]);
  // Diet Data
  const [diet, setDiet] = useState<DietEntry[]>([]);
  const [showAddDiet, setShowAddDiet] = useState(false);
  const [editingDiet, setEditingDiet] = useState<DietEntry | null>(null);
  // Gym Data
  const [gym, setGym] = useState<GymEntry[]>([]);
  const [showAddGym, setShowAddGym] = useState(false);
  const [gymSuggestion, setGymSuggestion] = useState('');
  const [modal, setModal] = useState<any>(null);

  const load = async () => { 
    setFitness(await db.fitness.orderBy('date').toArray()); 
    setDiet(await db.diet.orderBy('date').toArray());
    setGym(await db.gym.orderBy('date').toArray());
  };
  useEffect(() => { load(); }, []);

  // --- Activity Stats ---
  const stats = useMemo(() => {
    if (!fitness.length) return { totalSteps: 0, avgSteps: 0, totalCalories: 0, totalDistance: 0, totalActive: 0 };
    const totalSteps = fitness.reduce((s, f) => s + f.steps, 0);
    return { totalSteps, avgSteps: Math.round(totalSteps / fitness.length), totalCalories: fitness.reduce((s, f) => s + f.caloriesBurned, 0), totalDistance: parseFloat(fitness.reduce((s, f) => s + f.distance, 0).toFixed(1)), totalActive: fitness.reduce((s, f) => s + f.activeMinutes, 0) };
  }, [fitness]);
  const chartData = fitness.slice(-14).map((f, i) => ({ day: `D${i + 1}`, steps: f.steps, calories: f.caloriesBurned, active: f.activeMinutes }));

  // --- Diet Stats ---
  const selectedDiet = useMemo(() => {
    return diet.filter(d => new Date(d.date).toDateString() === selectedDate.toDateString());
  }, [diet, selectedDate]);

  const selectedMacros = useMemo(() => {
    return selectedDiet.reduce((acc, curr) => ({
      calories: acc.calories + curr.calories,
      protein: acc.protein + curr.protein,
      carbs: acc.carbs + curr.carbs,
      fat: acc.fat + curr.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [selectedDiet]);

  // --- Gym Stats ---
  const todayGym = useMemo(() => gym.filter(g => new Date(g.date).toDateString() === new Date().toDateString()), [gym]);

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <motion.div variants={anim} initial="hidden" animate="show" className="max-w-[1400px] mx-auto space-y-6">
        <motion.div variants={fi} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[rgba(34,197,94,0.1)]"><Activity className="w-5 h-5 text-[var(--accent-green)]" /></div>
            <div><h1 className="text-2xl font-bold">Health & Fitness</h1><p className="text-xs text-[var(--text-tertiary)] font-mono">Activity, Diet, and Gym tracking</p></div>
          </div>
          <div className="flex gap-2 p-1 bg-[var(--bg-hover)] rounded-xl border border-[var(--border-subtle)] w-full sm:w-auto overflow-x-auto">
            {(['activity', 'diet', 'gym'] as const).map(t => (
              <button 
                key={t} onClick={() => setTab(t)} 
                className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all text-center whitespace-nowrap ${tab === t ? 'bg-[var(--bg-elevated)] text-[var(--accent-green)] shadow-md' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </motion.div>

        {/* === ACTIVITY TAB === */}
        {tab === 'activity' && (
          <motion.div variants={anim} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={fi} className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[{ icon: Footprints, l: 'Total Steps', v: stats.totalSteps.toLocaleString(), c: 'var(--accent-green)' }, { icon: Target, l: 'Avg Steps', v: stats.avgSteps.toLocaleString(), c: 'var(--accent-cyan)' }, { icon: Flame, l: 'Calories', v: stats.totalCalories.toLocaleString(), c: 'var(--accent-orange)' }, { icon: TrendingUp, l: 'Distance', v: `${stats.totalDistance} km`, c: 'var(--accent-blue)' }, { icon: Timer, l: 'Active Min', v: stats.totalActive.toString(), c: 'var(--accent-purple)' }].map(s => (
                <div key={s.l} className="glass-card p-4"><div className="flex items-center gap-2 mb-2"><s.icon className="w-4 h-4" style={{ color: s.c }} /><span className="text-xs text-[var(--text-tertiary)]">{s.l}</span></div><p className="text-xl font-bold">{s.v}</p></div>
              ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div variants={fi} className="glass-card p-5">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Footprints className="w-4 h-4 text-[var(--accent-green)]" /> Steps</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData}><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent-green)" stopOpacity={0.3} /><stop offset="100%" stopColor="var(--accent-green)" stopOpacity={0} /></linearGradient></defs><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} width={40} /><Tooltip content={<CT />} /><Area type="monotone" dataKey="steps" stroke="var(--accent-green)" strokeWidth={2} fill="url(#sg)" /></AreaChart>
                </ResponsiveContainer>
              </motion.div>
              <motion.div variants={fi} className="glass-card p-5 lg:col-span-1">
                <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Timer className="w-4 h-4 text-[var(--accent-purple)]" /> Active Minutes</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData}><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} width={40} /><Tooltip content={<CT />} /><Line type="monotone" dataKey="active" stroke="var(--accent-purple)" strokeWidth={2} dot={{ fill: 'var(--accent-purple)', r: 3 }} /></LineChart>
                </ResponsiveContainer>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* === DIET TAB === */}
        {tab === 'diet' && (
          <motion.div variants={anim} initial="hidden" animate="show" className="space-y-6">
            {/* Date Selector Banner */}
            <motion.div variants={fi} className="flex flex-col sm:flex-row items-center justify-between bg-white/[0.01] border border-white/[0.04] p-3 rounded-2xl gap-3">
              <button 
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() - 1);
                  setSelectedDate(newDate);
                }}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all"
              >
                ← Previous Day
              </button>
              
              <div className="flex items-center gap-3 font-medium">
                <span className="text-sm font-bold text-white tracking-wide">
                  {selectedDate.toDateString() === new Date().toDateString() 
                    ? 'Today' 
                    : selectedDate.toDateString() === new Date(Date.now() - 86400000).toDateString()
                      ? 'Yesterday'
                      : selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
                <input 
                  type="date" 
                  value={selectedDate.toISOString().split('T')[0]} 
                  onChange={(e) => {
                    if (e.target.value) setSelectedDate(new Date(e.target.value));
                  }}
                  className="bg-[var(--bg-elevated)] border border-white/[0.08] rounded-xl px-2 py-1 text-xs text-white outline-none cursor-pointer hover:border-white/[0.15] transition-all font-mono"
                />
              </div>

              <button 
                onClick={() => {
                  const newDate = new Date(selectedDate);
                  newDate.setDate(newDate.getDate() + 1);
                  setSelectedDate(newDate);
                }}
                disabled={selectedDate.toDateString() === new Date().toDateString()}
                className="w-full sm:w-auto px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-white hover:bg-[var(--bg-hover)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next Day →
              </button>
            </motion.div>

            {/* Horizontal Timeline Jump Bar */}
            <motion.div variants={fi} className="grid grid-cols-7 gap-2">
              {Array.from({ length: 7 }, (_, idx) => {
                const d = new Date();
                d.setDate(d.getDate() - (6 - idx));
                const isSelected = d.toDateString() === selectedDate.toDateString();
                
                // Calculate calories for this day
                const dayDiet = diet.filter(item => new Date(item.date).toDateString() === d.toDateString());
                const dayCals = dayDiet.reduce((sum, item) => sum + item.calories, 0);

                return (
                  <button
                    key={idx}
                    onClick={() => setSelectedDate(d)}
                    className={`flex flex-col items-center justify-between p-2.5 rounded-2xl border transition-all ${
                      isSelected 
                        ? 'bg-[rgba(249,115,22,0.15)] border-[var(--accent-orange)] text-white shadow-[0_0_12px_rgba(249,115,22,0.1)]' 
                        : 'bg-white/[0.01] border-white/[0.04] text-[var(--text-secondary)] hover:bg-white/[0.04] hover:border-white/[0.08]'
                    }`}
                  >
                    <span className="text-[9px] font-mono uppercase tracking-wider">
                      {d.toLocaleDateString('en-US', { weekday: 'short' })}
                    </span>
                    <span className="text-sm font-bold my-1">{d.getDate()}</span>
                    <span className="text-[9px] font-semibold text-[rgba(255,255,255,0.45)]">
                      {dayCals > 0 ? `${dayCals} kcal` : '-'}
                    </span>
                  </button>
                );
              })}
            </motion.div>

            {/* Macros Summary for selected date */}
            <motion.div variants={fi} className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="glass-card p-5 border-l-4 border-l-[var(--accent-orange)]"><h3 className="text-xs text-[var(--text-tertiary)]">Calories</h3><p className="text-2xl font-bold mt-1">{selectedMacros.calories} <span className="text-xs font-normal text-[var(--text-muted)]">kcal</span></p></div>
              <div className="glass-card p-5 border-l-4 border-l-[var(--accent-cyan)]"><h3 className="text-xs text-[var(--text-tertiary)]">Protein</h3><p className="text-2xl font-bold mt-1">{selectedMacros.protein} <span className="text-xs font-normal text-[var(--text-muted)]">g</span></p></div>
              <div className="glass-card p-5 border-l-4 border-l-[var(--accent-green)]"><h3 className="text-xs text-[var(--text-tertiary)]">Carbs</h3><p className="text-2xl font-bold mt-1">{selectedMacros.carbs} <span className="text-xs font-normal text-[var(--text-muted)]">g</span></p></div>
              <div className="glass-card p-5 border-l-4 border-l-[var(--accent-yellow)]"><h3 className="text-xs text-[var(--text-tertiary)]">Fat</h3><p className="text-2xl font-bold mt-1">{selectedMacros.fat} <span className="text-xs font-normal text-[var(--text-muted)]">g</span></p></div>
            </motion.div>

            {/* Diet list */}
            <motion.div variants={fi} className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-[var(--accent-orange)]" /> 
                  Diet Log for {selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </h3>
                <button onClick={() => { setEditingDiet(null); setShowAddDiet(true); }} className="px-3 py-1.5 rounded-lg bg-[rgba(249,115,22,0.1)] text-[var(--accent-orange)] text-xs font-medium hover:bg-[rgba(249,115,22,0.2)] transition-colors flex items-center gap-1"><Plus className="w-3 h-3" /> Add Meal</button>
              </div>
              <div className="space-y-3">
                {selectedDiet.length === 0 ? (
                  <div className="text-center py-6">
                    <Utensils className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-2 opacity-30" />
                    <p className="text-xs text-[var(--text-muted)]">No meals logged for this day.</p>
                  </div>
                ) : selectedDiet.map(d => (
                  <div key={d.id} className="p-4 rounded-xl bg-[var(--bg-hover)] border border-white/[0.01] hover:border-white/[0.04] flex justify-between items-center group transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--accent-orange)] font-bold uppercase font-mono tracking-wide">{d.mealType}</span>
                        <span className="text-[10px] text-[var(--text-tertiary)] font-mono">• {new Date(d.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-sm font-semibold text-white mt-1">{d.food}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-bold text-[var(--text-primary)]">{d.calories} kcal</p>
                        <p className="text-[10px] text-[var(--text-tertiary)] font-mono">P: {d.protein}g | C: {d.carbs}g | F: {d.fat}g</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={() => { setEditingDiet(d); setShowAddDiet(true); }} 
                          className="px-2 py-1 rounded bg-white/[0.05] border border-white/[0.05] text-[10px] font-bold text-[var(--text-secondary)] hover:text-[var(--accent-orange)] hover:bg-white/10 transition-all"
                        >
                          EDIT
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setModal({ 
                              isOpen: true, 
                              type: 'confirm', 
                              title: 'Delete Meal', 
                              message: 'Are you sure you want to delete this meal log?', 
                              onConfirm: async () => { 
                                await db.diet.delete(d.id!); 
                                load(); 
                                setModal(null); 
                              } 
                            }); 
                          }} 
                          className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* === GYM TAB === */}
        {tab === 'gym' && (
          <motion.div variants={anim} initial="hidden" animate="show" className="space-y-6">
            <motion.div variants={fi} className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Dumbbell className="w-4 h-4 text-[var(--accent-blue)]" /> Today's Workout</h3>
                <button onClick={() => setShowAddGym(true)} className="px-3 py-1.5 rounded-lg bg-[rgba(59,130,246,0.1)] text-[var(--accent-blue)] text-xs font-medium hover:bg-[rgba(59,130,246,0.2)] transition-colors flex items-center gap-1"><Plus className="w-3 h-3" /> Add Workout</button>
              </div>
              {todayGym.length === 0 ? <p className="text-xs text-[var(--text-muted)] text-center py-4">No workout logged today.</p> : todayGym.map(g => (
                <div key={g.id} className="space-y-4 relative group">
                  <button onClick={(e) => { e.stopPropagation(); setModal({ isOpen: true, type: 'confirm', title: 'Delete Workout', message: 'Are you sure you want to delete this gym session?', onConfirm: async () => { await db.gym.delete(g.id!); load(); setModal(null); } }); }} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-all z-10"><X className="w-4 h-4" /></button>
                  <div className="p-4 rounded-xl bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.1)]">
                    <p className="text-sm font-bold text-[var(--accent-blue)]">{g.isRestDay ? 'Rest Day' : g.muscleGroup}</p>
                  </div>
                  {!g.isRestDay && g.exercises.map((e, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-[var(--bg-hover)]">
                      <p className="text-sm font-medium">{e.name}</p>
                      <p className="text-xs text-[var(--text-secondary)] font-mono">{e.weight}kg • {e.sets} sets × {e.reps} reps</p>
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
            
            <motion.div variants={fi} className="glass-card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold flex items-center gap-2"><Brain className="w-4 h-4 text-[var(--accent-purple)]" /> AI Progressive Overload Insights</h3>
                <button 
                  onClick={async () => {
                    setGymSuggestion('Analyzing logs...');
                    const settings = await db.settings.toArray();
                    const key = settings[0]?.geminiApiKey;
                    if (!key) { setGymSuggestion('API Key missing. Add in Settings.'); return; }
                    try {
                      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${key}`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Analyze my recent gym logs and give a short 3-sentence suggestion for progressive overload for next week: ${JSON.stringify(gym.slice(-7))}` }] }] })
                      });
                      const data = await res.json();
                      setGymSuggestion(data.candidates?.[0]?.content?.parts?.[0]?.text || data?.error?.message || 'No suggestion.');
                    } catch { setGymSuggestion('Failed to fetch AI insights.'); }
                  }}
                  className="px-3 py-1 text-[10px] rounded hover:bg-[var(--bg-hover)] text-[var(--accent-purple)] border border-[rgba(168,85,247,0.2)]"
                >
                  Generate Sunday Report
                </button>
              </div>
              <div className="p-4 rounded-xl bg-[rgba(168,85,247,0.05)] text-sm text-[var(--text-secondary)] leading-relaxed min-h-[80px]">
                {gymSuggestion || 'Click "Generate" on Sunday evening to get AI-powered progressive overload tips based on your past week.'}
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>

      {/* DIET MODAL */}
      {showAddDiet && (
        <DietForm 
          selectedDate={selectedDate}
          initialMeal={editingDiet}
          onClose={() => { setShowAddDiet(false); setEditingDiet(null); }} 
          onSave={async (d) => { 
            if (editingDiet) {
              await db.diet.update(editingDiet.id!, d);
            } else {
              await db.diet.add(d);
            }
            load(); 
            setShowAddDiet(false); 
            setEditingDiet(null);
          }} 
        />
      )}
      
      {/* GYM MODAL */}
      {showAddGym && (
        <GymForm onClose={() => setShowAddGym(false)} onSave={async (g) => { await db.gym.add(g); load(); setShowAddGym(false); }} />
      )}

      <SystemModal isOpen={!!modal?.isOpen} type={modal?.type || 'alert'} title={modal?.title || ''} message={modal?.message || ''}
        defaultValue={modal?.defaultValue} onConfirm={modal?.onConfirm || (() => {})} onCancel={() => setModal(null)} />
    </div>
  );
}

// --- DIET FORM WITH GEMINI API & MANUAL METRICS ENTRY ---
function DietForm({ 
  onClose, 
  onSave, 
  initialMeal, 
  selectedDate 
}: { 
  onClose: () => void; 
  onSave: (d: Omit<DietEntry, 'id'>) => void; 
  initialMeal?: DietEntry | null; 
  selectedDate: Date;
}) {
  const [mealType, setMealType] = useState<DietEntry['mealType']>(initialMeal?.mealType || 'Lunch');
  const [food, setFood] = useState(initialMeal?.food || '');
  const [calories, setCalories] = useState<string>(initialMeal?.calories?.toString() || '');
  const [protein, setProtein] = useState<string>(initialMeal?.protein?.toString() || '');
  const [carbs, setCarbs] = useState<string>(initialMeal?.carbs?.toString() || '');
  const [fat, setFat] = useState<string>(initialMeal?.fat?.toString() || '');
  
  const [manualMode, setManualMode] = useState(initialMeal ? true : false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!food.trim()) return;
    setLoading(true);
    
    let macros = { 
      calories: manualMode ? (Number(calories) || 0) : 0, 
      protein: manualMode ? (Number(protein) || 0) : 0, 
      carbs: manualMode ? (Number(carbs) || 0) : 0, 
      fat: manualMode ? (Number(fat) || 0) : 0 
    };
    let aiBreakdown = initialMeal?.aiBreakdown || 'Manual Entry.';

    if (!manualMode) {
      try {
        const settings = await db.settings.toArray();
        const key = settings[0]?.geminiApiKey;
        if (key) {
          const prompt = `Provide the estimated macronutrients for this food: "${food}". Return ONLY a strict JSON object with no markdown formatting: {"calories": number, "protein": number, "carbs": number, "fat": number}`;
          const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${key}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] })
          });
          const data = await res.json();
          if (data?.error?.message) {
            console.error("AI estimation error", data.error.message);
          } else {
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
            const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanJson);
            macros = {
              calories: parsed.calories || 0,
              protein: parsed.protein || 0,
              carbs: parsed.carbs || 0,
              fat: parsed.fat || 0
            };
            aiBreakdown = `AI Estimated: ${macros.calories}kcal (P:${macros.protein} C:${macros.carbs} F:${macros.fat})`;
          }
        }
      } catch (e) { 
        console.error('AI Macro fail', e); 
      }
    }

    // Keep original timestamp if editing, otherwise assign selectedDate with current hours/minutes
    let finalDate = new Date(selectedDate);
    if (initialMeal?.date) {
      finalDate = new Date(initialMeal.date);
    } else {
      const now = new Date();
      finalDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }
    
    onSave({
      date: finalDate,
      mealType,
      food,
      calories: macros.calories,
      protein: macros.protein,
      carbs: macros.carbs,
      fat: macros.fat,
      aiBreakdown
    });
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="glass-card w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold">{initialMeal ? 'Edit Meal' : 'Log Meal'}</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-[var(--text-tertiary)]" /></button>
        </div>
        
        {/* Manual Input Toggle */}
        <div className="flex rounded-xl p-1 bg-[var(--bg-hover)] border border-[var(--border-subtle)]">
          <button 
            type="button"
            onClick={() => setManualMode(false)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!manualMode ? 'bg-[var(--bg-elevated)] text-[var(--accent-orange)] shadow-sm' : 'text-[var(--text-tertiary)] hover:text-white'}`}
          >
            🤖 AI Estimates
          </button>
          <button 
            type="button"
            onClick={() => setManualMode(true)}
            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${manualMode ? 'bg-[var(--bg-elevated)] text-[var(--accent-orange)] shadow-sm' : 'text-[var(--text-tertiary)] hover:text-white'}`}
          >
            ✍️ Manual Entry
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Meal Category</label>
          <select value={mealType} onChange={e => setMealType(e.target.value as any)} className="w-full px-3 py-2 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none">
            {['Breakfast', 'Morning Snack', 'Lunch', 'Evening Snack', 'Dinner', 'Misc'].map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">What did you eat?</label>
          <textarea value={food} onChange={e => setFood(e.target.value)} rows={3} placeholder="e.g. 2 scrambled eggs, 1 slice whole wheat toast, black coffee" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none resize-none" />
        </div>

        {/* Manual Macros Fields */}
        {manualMode && (
          <div className="grid grid-cols-4 gap-2 pt-1 animate-fadeIn">
            <div>
              <label className="text-[10px] font-medium text-[var(--text-tertiary)] mb-1 block text-center">Calories</label>
              <input type="number" placeholder="kcal" value={calories} onChange={e => setCalories(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs text-white text-center outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--text-tertiary)] mb-1 block text-center">Protein (g)</label>
              <input type="number" placeholder="g" value={protein} onChange={e => setProtein(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs text-white text-center outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--text-tertiary)] mb-1 block text-center">Carbs (g)</label>
              <input type="number" placeholder="g" value={carbs} onChange={e => setCarbs(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs text-white text-center outline-none" />
            </div>
            <div>
              <label className="text-[10px] font-medium text-[var(--text-tertiary)] mb-1 block text-center">Fat (g)</label>
              <input type="number" placeholder="g" value={fat} onChange={e => setFat(e.target.value)} className="w-full px-2 py-1.5 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-xs text-white text-center outline-none" />
            </div>
          </div>
        )}

        <button onClick={handleSave} disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-pink)] text-white font-medium text-sm flex justify-center items-center gap-2 disabled:opacity-50 transition-all hover:brightness-110">
          {loading ? (
            <span className="animate-pulse">{manualMode ? 'Saving Meal...' : 'Analyzing Macros with AI...'}</span>
          ) : (
            <span>{initialMeal ? 'Update Meal' : 'Save Meal'}</span>
          )}
        </button>
      </div>
    </div>
  );
}

// --- GYM FORM ---
function GymForm({ onClose, onSave }: { onClose: () => void, onSave: (g: Omit<GymEntry, 'id'>) => void }) {
  const [isRest, setIsRest] = useState(false);
  const [muscle, setMuscle] = useState('Chest + Triceps');
  const [exercises, setExercises] = useState([{ name: '', weight: 0, sets: 0, reps: 0 }]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="glass-card w-full max-w-md p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center"><h2 className="text-lg font-bold">Log Gym Session</h2><button onClick={onClose}><X className="w-4 h-4 text-[var(--text-tertiary)]" /></button></div>
        
        <div className="flex items-center gap-2">
          <input type="checkbox" id="rest" checked={isRest} onChange={e => setIsRest(e.target.checked)} className="accent-[var(--accent-blue)]" />
          <label htmlFor="rest" className="text-sm font-medium text-[var(--accent-blue)]">Mark as Rest Day</label>
        </div>

        {!isRest && (
          <>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Muscle Group</label>
              <input value={muscle} onChange={e => setMuscle(e.target.value)} placeholder="e.g. Pull Day, Legs, Back" className="w-full px-3 py-2 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-[var(--text-secondary)] mb-2 block flex justify-between">
                <span>Exercises</span>
                <button onClick={() => setExercises([...exercises, {name:'', weight:0, sets:0, reps:0}])} className="text-[var(--accent-cyan)]">+ Add</button>
              </label>
              <div className="space-y-3">
                {exercises.map((ex, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input placeholder="Name" value={ex.name} onChange={e => { const n = [...exercises]; n[i].name = e.target.value; setExercises(n); }} className="w-2/5 px-2 py-1.5 rounded-lg bg-[var(--bg-hover)] text-xs border border-[var(--border-subtle)]" />
                    <input placeholder="kg" type="number" value={ex.weight || ''} onChange={e => { const n = [...exercises]; n[i].weight = +e.target.value; setExercises(n); }} className="w-1/5 px-2 py-1.5 rounded-lg bg-[var(--bg-hover)] text-xs border border-[var(--border-subtle)]" />
                    <input placeholder="Sets" type="number" value={ex.sets || ''} onChange={e => { const n = [...exercises]; n[i].sets = +e.target.value; setExercises(n); }} className="w-1/5 px-2 py-1.5 rounded-lg bg-[var(--bg-hover)] text-xs border border-[var(--border-subtle)]" />
                    <input placeholder="Reps" type="number" value={ex.reps || ''} onChange={e => { const n = [...exercises]; n[i].reps = +e.target.value; setExercises(n); }} className="w-1/5 px-2 py-1.5 rounded-lg bg-[var(--bg-hover)] text-xs border border-[var(--border-subtle)]" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        <button onClick={() => onSave({ date: new Date(), isRestDay: isRest, muscleGroup: isRest ? 'Rest' : muscle, exercises: isRest ? [] : exercises })} className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-cyan)] text-white font-medium text-sm">Save Session</button>
      </div>
    </div>
  );
}
