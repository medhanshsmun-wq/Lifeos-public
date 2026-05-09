'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, type StudySession, type Subject, type StudyAssignment, type UserSettings } from '@/lib/db';
import { GraduationCap, Plus, X, Clock, BookOpen, Star, TrendingUp, Play, Pause, Square, ListTodo, Sun, CheckCircle2, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from 'recharts';

const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function StudyPage() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<StudyAssignment[]>([]);
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'subjects' | 'focus'>('dashboard');
  const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
  const [isImmersive, setIsImmersive] = useState(false);
  
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<Subject | null>(null);
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);

  const load = async () => {
    const [sess, subs, asts, sets] = await Promise.all([
      db.study.orderBy('date').reverse().toArray(),
      db.subjects.toArray(),
      db.studyAssignments.toArray(),
      db.settings.toArray()
    ]);
    setSessions(sess);
    setSubjects(subs);
    setAssignments(asts);
    if (sets.length) setSettings(sets[0]);
  };

  useEffect(() => { load(); }, []);

  if (settings?.summerBreakMode) {
    return (
      <div className="p-8 h-full flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 mb-4">
          <Sun className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-bold text-white">Summer Break Mode Active</h2>
        <p className="text-[var(--text-secondary)] max-w-lg">
          Academic tracking and study analytics are paused. Take this time to recharge, focus on personal projects, and enjoy the break.
        </p>
        <button onClick={async () => {
          if (settings.id) {
            await db.settings.update(settings.id, { summerBreakMode: false });
            load();
          }
        }} className="px-6 py-2 mt-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors">
          Resume Academic Mode
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 grid-bg min-h-full">
      <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }} className="max-w-[1400px] mx-auto space-y-6 pb-24">
        
        {/* Header */}
        <motion.div variants={fi} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[rgba(234,179,8,0.1)]">
              <GraduationCap className="w-6 h-6 text-[var(--accent-yellow)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Study OS</h1>
              <p className="text-xs text-[var(--text-tertiary)] font-mono">Academic tracking & focus analytics</p>
            </div>
          </div>

          <div className="flex bg-[var(--bg-elevated)] p-1 rounded-xl border border-[var(--border-subtle)]">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-[var(--accent-yellow)] text-black' : 'text-[var(--text-secondary)] hover:text-white'}`}>Overview</button>
            <button onClick={() => setActiveTab('subjects')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'subjects' ? 'bg-[var(--accent-yellow)] text-black' : 'text-[var(--text-secondary)] hover:text-white'}`}>Subjects</button>
            <button onClick={() => setActiveTab('focus')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'focus' ? 'bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-blue)] text-white shadow-lg' : 'text-[var(--text-secondary)] hover:text-white'}`}>Focus Mode</button>
          </div>
        </motion.div>

        <AnimatePresence mode="wait">
          {selectedSubjectId ? (
            <SubjectDetailView 
              key="detail"
              subject={subjects.find(s => s.id === selectedSubjectId)!} 
              sessions={sessions.filter(s => s.subjectId === selectedSubjectId || s.subject === subjects.find(sub => sub.id === selectedSubjectId)?.name)}
              assignments={assignments.filter(a => a.subjectId === selectedSubjectId)}
              onBack={() => setSelectedSubjectId(null)}
              onEdit={(s: Subject) => { setSubjectToEdit(s); setShowSubjectModal(true); }}
              onDelete={async (id: number) => { 
                if (confirm('Are you sure you want to delete this subject and all its assignments?')) {
                  await Promise.all([
                    db.subjects.delete(id),
                    db.studyAssignments.where('subjectId').equals(id).delete()
                  ]);
                  setSelectedSubjectId(null);
                  load();
                }
              }}
              load={load}
            />
          ) : (
            <>
              {activeTab === 'dashboard' && <DashboardTab key="dashboard" sessions={sessions} subjects={subjects} assignments={assignments} load={load} />}
              {activeTab === 'subjects' && <SubjectsTab key="subjects" subjects={subjects} load={load} setShowSubjectModal={setShowSubjectModal} setShowAssignmentModal={setShowAssignmentModal} onSelectSubject={setSelectedSubjectId} />}
              {activeTab === 'focus' && <FocusTab key="focus" subjects={subjects} load={load} isImmersive={isImmersive} setIsImmersive={setIsImmersive} />}
            </>
          )}
        </AnimatePresence>

      </motion.div>

      {/* Modals */}
      {showSubjectModal && (
        <SubjectModal 
          initialData={subjectToEdit}
          onClose={() => { setShowSubjectModal(false); setSubjectToEdit(null); }} 
          onSave={async (s: Subject) => { 
            if (subjectToEdit?.id) {
              await db.subjects.update(subjectToEdit.id, s);
            } else {
              await db.subjects.add(s);
            }
            load(); 
            setShowSubjectModal(false); 
            setSubjectToEdit(null);
          }} 
        />
      )}
      {showAssignmentModal && <AssignmentModal subjects={subjects} onClose={() => setShowAssignmentModal(false)} onSave={async (a: StudyAssignment) => { await db.studyAssignments.add(a); load(); setShowAssignmentModal(false); }} />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD TAB
// ─────────────────────────────────────────────────────────────────
function DashboardTab({ sessions, subjects, assignments, load }: { sessions: StudySession[], subjects: Subject[], assignments: StudyAssignment[], load: () => void }) {
  const totalHours = Math.round(sessions.reduce((s, ss) => s + ss.duration, 0) / 60);
  const avgFocus = sessions.length ? (sessions.reduce((s, ss) => s + (ss.focusLevel || ss.quality), 0) / sessions.length).toFixed(1) : '0';
  const pendingAssignments = assignments.filter(a => !a.completed).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const bySubject = useMemo(() => {
    const subs: Record<string, number> = {};
    sessions.forEach(s => { subs[s.subject] = (subs[s.subject] || 0) + s.duration; });
    return Object.entries(subs).sort((a, b) => b[1] - a[1]).map(([subject, value]) => ({ subject, value, fullMark: Math.max(...Object.values(subs)) }));
  }, [sessions]);

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="space-y-6">
      
      <motion.div variants={fi} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4"><div className="flex items-center gap-2 mb-2"><Clock className="w-4 h-4 text-[var(--accent-yellow)]" /><span className="text-xs text-[var(--text-tertiary)]">Total Study Hours</span></div><p className="text-2xl font-bold">{totalHours}h</p></div>
        <div className="glass-card p-4"><div className="flex items-center gap-2 mb-2"><BookOpen className="w-4 h-4 text-[var(--accent-blue)]" /><span className="text-xs text-[var(--text-tertiary)]">Total Sessions</span></div><p className="text-2xl font-bold">{sessions.length}</p></div>
        <div className="glass-card p-4"><div className="flex items-center gap-2 mb-2"><Star className="w-4 h-4 text-[var(--accent-orange)]" /><span className="text-xs text-[var(--text-tertiary)]">Avg Focus Level</span></div><p className="text-2xl font-bold">{avgFocus}<span className="text-sm text-[var(--text-tertiary)]">/5</span></p></div>
        <div className="glass-card p-4"><div className="flex items-center gap-2 mb-2"><ListTodo className="w-4 h-4 text-[var(--accent-green)]" /><span className="text-xs text-[var(--text-tertiary)]">Active Subjects</span></div><p className="text-2xl font-bold">{subjects.length}</p></div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={fi} className="lg:col-span-2 glass-card p-5">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-[var(--accent-yellow)]" /> Time per Subject (Minutes)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={bySubject} barSize={40}>
              <defs><linearGradient id="studyGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--accent-yellow)" stopOpacity={0.9} /><stop offset="100%" stopColor="var(--accent-orange)" stopOpacity={0.3} /></linearGradient></defs>
              <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
              <YAxis axisLine={false} tickLine={false} width={40} tick={{ fontSize: 11, fill: 'var(--text-tertiary)' }} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)', borderRadius: '8px' }} />
              <Bar dataKey="value" fill="url(#studyGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div variants={fi} className="glass-card p-5 flex flex-col">
          <h3 className="text-sm font-semibold mb-4 flex items-center gap-2"><Clock className="w-4 h-4 text-[var(--accent-orange)]" /> Upcoming Deadlines</h3>
          {pendingAssignments.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-[var(--text-tertiary)] text-sm">No upcoming deadlines.</div>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-1">
              {pendingAssignments.slice(0, 5).map(a => {
                const sub = subjects.find(s => s.id === a.subjectId);
                const isUrgent = new Date(a.dueDate).getTime() - Date.now() < 86400000 * 2; // < 2 days
                return (
                  <div key={a.id} className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] flex items-start gap-3">
                    <button onClick={async () => { await db.studyAssignments.update(a.id!, { completed: true }); load(); }} className="mt-0.5 text-[var(--text-tertiary)] hover:text-[var(--accent-green)] transition-colors"><div className="w-4 h-4 rounded-full border-2 border-current" /></button>
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="text-xs text-[var(--text-tertiary)] mt-1">{sub?.name || 'Unknown'} • {a.type}</p>
                      <p className={`text-[10px] mt-2 font-mono ${isUrgent ? 'text-red-400' : 'text-[var(--text-secondary)]'}`}>{new Date(a.dueDate).toLocaleDateString()}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIInsights sessions={sessions} subjects={subjects} assignments={assignments} />
        <ConsistencyStreak sessions={sessions} />
      </div>

      <motion.div variants={fi} className="glass-card p-5">
        <h3 className="text-sm font-semibold mb-4">Recent Sessions</h3>

        {sessions.length === 0 ? (
          <p className="text-sm text-[var(--text-tertiary)]">No sessions logged yet. Head to Focus Mode to start.</p>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
            {sessions.slice(0, 10).map((s, i) => (
              <div key={s.id ?? i} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-hover)] hover:bg-[var(--bg-elevated)] transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-[rgba(234,179,8,0.1)] flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-[var(--accent-yellow)]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{s.subject}</p>
                    <p className="text-xs text-[var(--text-secondary)]">{s.topic} • {new Date(s.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold text-white">{s.duration} min</span>
                  <div className="flex gap-0.5 mt-1 justify-end">
                    {Array.from({ length: 5 }, (_, j) => (<div key={j} className={`w-1.5 h-1.5 rounded-full ${j < (s.focusLevel || s.quality) ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--bg-hover)]'}`} />))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>

    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// SUBJECTS TAB
// ─────────────────────────────────────────────────────────────────
function SubjectsTab({ subjects, load, setShowSubjectModal, setShowAssignmentModal, onSelectSubject }: any) {
  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="space-y-6">
      <motion.div variants={fi} className="flex items-center justify-end gap-3">
        <button onClick={() => setShowAssignmentModal(true)} className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-white border border-[var(--border-subtle)] text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Assignment
        </button>
        <button onClick={() => setShowSubjectModal(true)} className="px-4 py-2 rounded-xl bg-gradient-to-r from-[var(--accent-yellow)] to-[var(--accent-orange)] text-white text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Subject
        </button>
      </motion.div>

      {subjects.length === 0 ? (
        <div className="text-center py-20 text-[var(--text-tertiary)]">No subjects added yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {subjects.map((sub: Subject) => (
            <motion.div 
              key={sub.id} 
              variants={fi} 
              onClick={() => onSelectSubject(sub.id)}
              className="glass-card p-5 relative overflow-hidden group cursor-pointer hover:border-[var(--accent-yellow)]/30 transition-all"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BookOpen className="w-24 h-24" style={{ color: sub.color }} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: sub.color }} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${sub.priority === 'High' ? 'text-red-400' : sub.priority === 'Medium' ? 'text-yellow-400' : 'text-blue-400'}`}>{sub.priority} Priority</span>
                </div>
                <h3 className="text-xl font-bold mb-1">{sub.name}</h3>
                <p className="text-xs text-[var(--text-secondary)] mb-6">{sub.instructor} • Sem {sub.semester} • {sub.credits} Credits</p>
                
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--text-tertiary)]">Syllabus Progress</span>
                    <span className="font-mono">{sub.syllabusProgress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--bg-hover)] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${sub.syllabusProgress}%`, backgroundColor: sub.color }} />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FOCUS MODE TAB
// ─────────────────────────────────────────────────────────────────
function FocusTab({ subjects, load, isImmersive, setIsImmersive }: any) {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [subjectId, setSubjectId] = useState<string>('');
  const [topic, setTopic] = useState('');
  const [showSummary, setShowSummary] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (active) {
      timerRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    } else if (!active && timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [active]);

  const formatTime = (totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h > 0 ? `${h.toString().padStart(2, '0')}:` : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const endSession = () => {
    setActive(false);
    if (seconds > 60) {
      setShowSummary(true);
    } else {
      setSeconds(0);
      setTopic('');
    }
  };

  return (
    <motion.div initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.1 } } }} className="flex flex-col items-center justify-center min-h-[60vh]">
      
      {isImmersive && (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex flex-col items-center justify-center space-y-12 p-8 overflow-hidden">
          <div className="absolute inset-0 noise-bg opacity-40 pointer-events-none" />
          <div className="orb-1 opacity-20" />
          <div className="orb-2 opacity-20" />
          
          <div className="text-center relative z-10">
            <p className="text-[var(--accent-cyan)] font-mono tracking-[0.3em] uppercase text-xs mb-4">Deep Focus Active</p>
            <div className="text-[10rem] md:text-[15rem] font-black tracking-tighter text-white font-mono leading-none drop-shadow-[0_0_50px_rgba(255,255,255,0.15)]">
              {formatTime(seconds)}
            </div>
            <p className="text-xl text-[var(--text-secondary)] mt-8 font-medium">
              {subjects.find((s: Subject) => s.id?.toString() === subjectId)?.name || 'General Study'}
              <span className="mx-3 text-[var(--text-tertiary)]">•</span>
              {topic || 'Deep Work'}
            </p>
          </div>

          <div className="flex items-center gap-6 relative z-10">
            <button onClick={() => setActive(!active)} className="w-20 h-20 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-xl shadow-white/10">
              {active ? <Pause className="w-8 h-8" fill="currentColor" /> : <Play className="w-8 h-8 ml-1" fill="currentColor" />}
            </button>
            <button onClick={() => { setIsImmersive(false); if (!active) endSession(); }} className="px-8 py-3 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-white font-medium hover:bg-[var(--bg-hover)] transition-colors">
              Exit Immersive
            </button>
          </div>
        </div>
      )}

      {!showSummary ? (
        <motion.div variants={fi} className="glass-card p-12 rounded-3xl w-full max-w-2xl flex flex-col items-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-[rgba(56,189,248,0.03)] to-transparent pointer-events-none" />
          
          <div className="absolute top-6 right-6">
            <button onClick={() => setIsImmersive(true)} className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-white transition-colors flex items-center gap-2 text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5" /> Immersive
            </button>
          </div>

          <h2 className="text-lg font-medium text-[var(--text-secondary)] mb-8 tracking-widest uppercase">Deep Work Environment</h2>
          
          <div className="text-[6rem] md:text-[8rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white via-white to-white/40 font-mono leading-none mb-10 drop-shadow-[0_0_30px_rgba(255,255,255,0.1)] select-none">
            {formatTime(seconds)}
          </div>

          {!active && seconds === 0 ? (
            <div className="w-full max-w-md space-y-4 mb-8">
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block ml-1">Subject</label>
                <select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm outline-none appearance-none">
                  <option value="">Select a Subject...</option>
                  {subjects.map((s: Subject) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  <option value="General">General Study</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block ml-1">Topic / Goal</label>
                <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. Chapter 4 Practice Problems" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm outline-none placeholder:text-[var(--text-tertiary)]" />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-md text-center mb-8">
              <p className="text-[var(--accent-cyan)] font-medium mb-1">{subjects.find((s: Subject) => s.id?.toString() === subjectId)?.name || subjectId || 'General Study'}</p>
              <p className="text-sm text-[var(--text-tertiary)]">{topic || 'Deep Focus'}</p>
            </div>
          )}

          <div className="flex items-center gap-4">
            <button
              onClick={() => setActive(!active)}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${active ? 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-white hover:bg-[var(--bg-hover)]' : 'bg-white text-black hover:scale-105 shadow-[0_0_30px_rgba(255,255,255,0.3)]'}`}
            >
              {active ? <Pause className="w-6 h-6" fill="currentColor" /> : <Play className="w-6 h-6 ml-1" fill="currentColor" />}
            </button>
            
            {(active || seconds > 0) && (
              <button onClick={endSession} className="w-16 h-16 rounded-full flex items-center justify-center bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20">
                <Square className="w-5 h-5" fill="currentColor" />
              </button>
            )}
          </div>
        </motion.div>
      ) : (
        <SessionSummaryModal 
          seconds={seconds} 
          subjectId={subjectId} 
          topic={topic} 
          subjects={subjects} 
          onSave={async (sessionData: any) => {
            await db.study.add(sessionData);
            load();
            setSeconds(0);
            setTopic('');
            setShowSummary(false);
          }} 
        />
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────
// MODALS
// ─────────────────────────────────────────────────────────────────

function SessionSummaryModal({ seconds, subjectId, topic, subjects, onSave }: any) {
  const [focusLevel, setFocusLevel] = useState(4);
  const [notes, setNotes] = useState('');
  const duration = Math.round(seconds / 60);

  const subName = subjects.find((s: Subject) => s.id?.toString() === subjectId)?.name || subjectId || 'General Study';

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 rounded-3xl w-full max-w-md relative">
      <div className="absolute top-0 right-0 p-6 opacity-5"><CheckCircle2 className="w-24 h-24" /></div>
      <h2 className="text-2xl font-bold mb-2">Session Complete</h2>
      <p className="text-sm text-[var(--text-secondary)] mb-6">You focused for <strong className="text-white">{duration} minutes</strong>.</p>

      <div className="space-y-5 relative z-10">
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Topic Studied</label>
          <input disabled value={`${subName} - ${topic || 'General'}`} className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm opacity-60" />
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Focus Quality ({focusLevel}/5)</label>
          <input type="range" min="1" max="5" value={focusLevel} onChange={e => setFocusLevel(+e.target.value)} className="w-full accent-[var(--accent-cyan)]" />
          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)] mt-1"><span>Distracted</span><span>Deep Work</span></div>
        </div>
        <div>
          <label className="text-xs font-medium text-[var(--text-secondary)] mb-1.5 block">Session Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="What did you learn? Any blockers?" className="w-full px-4 py-3 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-sm outline-none placeholder:text-[var(--text-tertiary)] resize-none" />
        </div>
        <button onClick={() => onSave({ subject: subName, subjectId: parseInt(subjectId) || undefined, topic: topic || 'General', duration, date: new Date(), notes, quality: focusLevel as any, focusLevel: focusLevel as any })} className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-blue)] text-white font-medium text-sm shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-transform">Save Session Logs</button>
      </div>
    </motion.div>
  );
}

function SubjectModal({ initialData, onClose, onSave }: any) {
  const [name, setName] = useState(initialData?.name || '');
  const [instructor, setInstructor] = useState(initialData?.instructor || '');
  const [credits, setCredits] = useState(initialData?.credits || '3');
  const [priority, setPriority] = useState(initialData?.priority || 'Medium');
  const [color, setColor] = useState(initialData?.color || '#3b82f6');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="glass-card w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">{initialData ? 'Edit Subject' : 'Add Subject'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Subject Name</label><input autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Data Structures" className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Instructor</label><input value={instructor} onChange={e => setInstructor(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none" /></div>
            <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Credits</label><input type="number" value={credits} onChange={e => setCredits(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Priority</label><select value={priority} onChange={e => setPriority(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none appearance-none"><option>High</option><option>Medium</option><option>Low</option></select></div>
            <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Color</label><input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-full h-10 p-1 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] outline-none cursor-pointer" /></div>
          </div>
          <button onClick={() => onSave({ name, instructor, credits: +credits, priority, color, syllabusProgress: initialData?.syllabusProgress || 0, createdAt: initialData?.createdAt || new Date() })} disabled={!name} className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent-yellow)] to-[var(--accent-orange)] text-white font-medium text-sm disabled:opacity-50 mt-2">
            {initialData ? 'Update Subject' : 'Create Subject'}
          </button>
        </div>
      </div>
    </div>
  );
}


function AssignmentModal({ subjects, onClose, onSave }: any) {
  const [subjectId, setSubjectId] = useState('');
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Assignment');
  const [dueDate, setDueDate] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div onClick={e => e.stopPropagation()} className="glass-card w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Add Deadline</h2><button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]"><X className="w-4 h-4" /></button></div>
        <div className="space-y-4">
          <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Subject</label><select value={subjectId} onChange={e => setSubjectId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none appearance-none"><option value="">Select...</option>{subjects.map((s: Subject) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Title</label><input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Lab Report 3" className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Type</label><select value={type} onChange={e => setType(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none appearance-none">{['Assignment','Quiz','Lab','Project','Exam','Viva'].map(t => <option key={t}>{t}</option>)}</select></div>
            <div><label className="text-xs font-medium text-[var(--text-secondary)] mb-1 block">Due Date</label><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none" /></div>
          </div>
          <button onClick={() => onSave({ subjectId: +subjectId, title, type, dueDate: new Date(dueDate), completed: false })} disabled={!subjectId || !title || !dueDate} className="w-full py-3 rounded-xl bg-gradient-to-r from-[var(--accent-blue)] to-[var(--accent-cyan)] text-white font-medium text-sm disabled:opacity-50 mt-2">Add Deadline</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// NEW COMPONENTS & VIEWS
// ─────────────────────────────────────────────────────────────────

function AIInsights({ sessions, subjects, assignments }: { sessions: StudySession[], subjects: Subject[], assignments: StudyAssignment[] }) {
  const insights = useMemo(() => {
    const list: string[] = [];
    if (sessions.length < 3) return ["Log more sessions for personalized AI insights."];

    // Consistency check
    const last7Days = sessions.filter(s => new Date(s.date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (last7Days.length < 3) list.push("Study consistency has dropped this week. Try to re-establish your routine.");

    // Focus levels
    const avgFocus = sessions.reduce((a, b) => a + (b.focusLevel || b.quality), 0) / sessions.length;
    if (avgFocus > 4.2) list.push("Your focus quality is exceptional lately. Keep utilizing these deep work blocks!");
    else if (avgFocus < 3) list.push("Focus levels are slightly lower than usual. Consider shorter sessions with more breaks.");

    // Neglected subjects
    subjects.forEach(sub => {
      const subSessions = sessions.filter(s => s.subjectId === sub.id || s.subject === sub.name);
      const totalTime = subSessions.reduce((a, b) => a + b.duration, 0);
      if (totalTime < 60 && sessions.length > 5) {
        list.push(`${sub.name} has received less than 1 hour of attention. Consider a review session.`);
      }
    });

    // Urgency check
    const pending = assignments.filter(a => !a.completed);
    const urgent = pending.filter(a => new Date(a.dueDate).getTime() - Date.now() < 86400000 * 3);
    if (urgent.length > 0) list.push(`You have ${urgent.length} deadlines approaching. Re-prioritize your upcoming sessions.`);

    return list.slice(0, 3);
  }, [sessions, subjects, assignments]);

  return (
    <motion.div variants={fi} className="glass-card p-5">
      <h3 className="text-sm font-semibold mb-4 flex items-center gap-2 text-[var(--accent-cyan)]">
        <Star className="w-4 h-4" /> AI Study Insights
      </h3>
      <div className="space-y-3">
        {insights.map((insight, i) => (
          <div key={i} className="flex gap-3 text-sm text-[var(--text-secondary)] bg-[var(--bg-hover)] p-3 rounded-xl border border-[var(--border-subtle)]">
            <div className="mt-0.5 text-[var(--accent-cyan)]">•</div>
            <p>{insight}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function ConsistencyStreak({ sessions }: { sessions: StudySession[] }) {
  const streak = useMemo(() => {
    let count = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const daySession = sessions.find(s => {
        const sd = new Date(s.date);
        return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
      });
      if (daySession) count++;
      else if (i > 0) break; // Break streak if not today
    }
    return count;
  }, [sessions]);

  // Last 14 days activity
  const activity = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const hasSession = sessions.some(s => {
        const sd = new Date(s.date);
        return sd.getDate() === d.getDate() && sd.getMonth() === d.getMonth();
      });
      days.push({ day: d.toLocaleDateString('en-US', { weekday: 'narrow' }), active: hasSession });
    }
    return days;
  }, [sessions]);

  return (
    <motion.div variants={fi} className="glass-card p-5">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[var(--accent-green)]" /> Consistency Streak
        </h3>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[rgba(34,197,94,0.1)] text-[var(--accent-green)] text-xs font-bold border border-[var(--accent-green)]/20">
          <CheckCircle2 className="w-3 h-3" /> {streak} Day Streak
        </div>
      </div>
      
      <div className="flex justify-between items-end h-16 px-2">
        {activity.map((day, i) => (
          <div key={i} className="flex flex-col items-center gap-2 group">
            <div className={`w-3 h-3 rounded-full transition-all ${day.active ? 'bg-[var(--accent-green)] shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-[var(--bg-hover)]'}`} />
            <span className="text-[10px] text-[var(--text-tertiary)] font-mono group-hover:text-white transition-colors">{day.day}</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-[var(--text-tertiary)] mt-4 text-center italic">Focus on consistency over intensity. Every session counts.</p>
    </motion.div>
  );
}

function SubjectDetailView({ subject, sessions, assignments, onBack, onEdit, onDelete, load }: any) {
  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]">
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: subject.color }} />
              {subject.name}
            </h2>
            <p className="text-sm text-[var(--text-secondary)]">{subject.instructor} • Sem {subject.semester}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(subject)} className="p-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-white transition-colors" title="Edit Subject">
            <TrendingUp className="w-4 h-4 rotate-90" /> {/* Using TrendingUp as a generic edit icon since I don't want to import Edit if not here */}
          </button>
          <button onClick={() => onDelete(subject.id)} className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500/20 transition-colors" title="Delete Subject">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Syllabus Progress</h3>
            <div className="flex items-center gap-4">
              <input 
                type="range" min="0" max="100" value={subject.syllabusProgress} 
                onChange={async (e) => { await db.subjects.update(subject.id, { syllabusProgress: +e.target.value }); load(); }}
                className="flex-1 accent-[var(--accent-yellow)]"
              />
              <span className="text-xl font-bold font-mono">{subject.syllabusProgress}%</span>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold mb-4">Subject Assignments</h3>
            <div className="space-y-2">
              {assignments.length === 0 ? <p className="text-sm text-[var(--text-tertiary)]">No assignments for this subject.</p> : 
                assignments.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-hover)]">
                    <div className="flex items-center gap-3">
                      <button onClick={async () => { await db.studyAssignments.update(a.id, { completed: !a.completed }); load(); }} className={`transition-colors ${a.completed ? 'text-[var(--accent-green)]' : 'text-[var(--text-tertiary)]'}`}>
                        <CheckCircle2 className="w-5 h-5" fill={a.completed ? 'currentColor' : 'none'} />
                      </button>
                      <span className={`text-sm ${a.completed ? 'line-through text-[var(--text-muted)]' : 'text-white'}`}>{a.title}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{new Date(a.dueDate).toLocaleDateString()}</span>
                  </div>
                ))
              }
            </div>
          </div>
        </div>

        <div className="glass-card p-5">
          <h3 className="text-sm font-semibold mb-4">Session History</h3>
          <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
            {sessions.map((s: any) => (
              <div key={s.id} className="p-3 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)]">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-medium text-white">{s.topic}</p>
                  <span className="text-[10px] text-[var(--text-tertiary)]">{s.duration}m</span>
                </div>
                <p className="text-[10px] text-[var(--text-muted)]">{new Date(s.date).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
