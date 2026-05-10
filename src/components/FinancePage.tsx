'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db, type FinanceEntry, type Trade } from '@/lib/db';
import { 
  Wallet, TrendingUp, TrendingDown, Plus, X, ArrowUpRight, ArrowDownRight, 
  PieChart, LineChart, Calendar as CalendarIcon, CandlestickChart, 
  Activity, Shield, Target, ChevronLeft, ChevronRight, Filter, Search,
  AlertCircle, CheckCircle2, History, LayoutDashboard, Brain, Star,
  Users, Building2
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, PieChart as RPie, Pie, Cell, LineChart as RLine, Line,
  CartesianGrid
} from 'recharts';

const anim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };
const COLORS = ['#00d4ff', '#a855f7', '#ec4899', '#22c55e', '#f97316', '#3b82f6', '#eab308'];

function CT({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tooltip"><p className="text-xs text-[var(--text-tertiary)] mb-1">{label}</p><p className="text-sm font-semibold">₹{payload[0].value.toLocaleString()}</p></div>;
}

export default function FinancePage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [showAddTrade, setShowAddTrade] = useState(false);

  const loadData = async () => {
    const [t, s] = await Promise.all([
      db.trades.orderBy('entryTime').reverse().toArray(),
      db.settings.toArray()
    ]);
    setTrades(t);
    setSettings(s[0]);
  };

  useEffect(() => { loadData(); }, []);

  const updatePropFirmCount = async (count: number) => {
    if (!settings) return;
    await db.settings.update(settings.id!, { propFirmAccountsCount: count });
    loadData();
  };

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[rgba(168,85,247,0.1)]">
              <CandlestickChart className="w-5 h-5 text-[var(--accent-purple)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Day Trading</h1>
              <p className="text-xs text-[var(--text-tertiary)] font-mono">Real-time execution log & performance metrics</p>
            </div>
          </div>
        </div>

        <TradingJournal 
          trades={trades} 
          onAdd={() => setShowAddTrade(true)} 
          onUpdate={loadData}
          propFirmCount={settings?.propFirmAccountsCount || 1}
          onUpdatePropFirmCount={updatePropFirmCount}
        />
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showAddTrade && (
          <Modal onClose={() => setShowAddTrade(false)} title="Log Trade Protocol">
            <TradeForm 
              propFirmCount={settings?.propFirmAccountsCount || 1}
              onSave={async (e) => { await db.trades.add(e); loadData(); setShowAddTrade(false); }} 
            />
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}


// ─── Trading Journal Component ────────────────────────────
function TradingJournal({ trades, onAdd, onUpdate, propFirmCount, onUpdatePropFirmCount }: { 
  trades: Trade[]; 
  onAdd: () => void; 
  onUpdate: () => void; 
  propFirmCount: number;
  onUpdatePropFirmCount: (c: number) => void;
}) {
  const [journalTab, setJournalTab] = useState<'dashboard' | 'calendar' | 'trades'>('dashboard');
  const [filter, setFilter] = useState({ ticker: '', side: 'all', status: 'all' });

  const metrics = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'Closed');
    const winners = closedTrades.filter(t => t.pnl > 0);
    const losers = closedTrades.filter(t => t.pnl < 0);
    const totalPnl = closedTrades.reduce((s, t) => s + t.pnl, 0);
    const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0;
    
    const profitFactor = Math.abs(winners.reduce((s, t) => s + t.pnl, 0) / (losers.reduce((s, t) => s + t.pnl, 0) || 1));
    const avgRr = closedTrades.reduce((s, t) => s + (t.pnl / t.riskAmount || 0), 0) / (closedTrades.length || 1);

    return { 
      totalPnl, 
      winRate, 
      profitFactor, 
      avgRr, 
      tradeCount: trades.length,
      bestWin: Math.max(...closedTrades.map(t => t.pnl), 0),
      worstLoss: Math.min(...closedTrades.map(t => t.pnl), 0)
    };
  }, [trades]);

  const pnlCurve = useMemo(() => {
    let runningPnl = 0;
    return trades.slice().reverse().map(t => {
      runningPnl += t.pnl;
      return { 
        time: new Date(t.entryTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        pnl: runningPnl 
      };
    });
  }, [trades]);

  return (
    <motion.div variants={anim} initial="hidden" animate="show" className="space-y-6">
      <motion.div variants={fi} className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex p-0.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
            { id: 'trades', label: 'History', icon: History },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setJournalTab(t.id as any)}
              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-all ${journalTab === t.id ? 'bg-[var(--bg-elevated)] text-[var(--accent-purple)]' : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="glass-card-sm px-4 py-2 flex items-center gap-3 border-[var(--accent-cyan)]/20">
            <Building2 className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
            <div className="flex flex-col">
              <span className="text-[8px] font-bold text-[var(--text-tertiary)] uppercase tracking-tighter">Prop Nodes</span>
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={propFirmCount} 
                  onChange={(e) => onUpdatePropFirmCount(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-8 bg-transparent text-xs font-bold text-[var(--accent-cyan)] outline-none"
                />
              </div>
            </div>
          </div>
          <button onClick={onAdd} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-pink)] text-white text-sm font-bold shadow-lg shadow-purple-500/20">
            <Plus className="w-4 h-4" /> Log Trade
          </button>
        </div>
      </motion.div>

      {journalTab === 'dashboard' && (
        <div className="space-y-6">
          <motion.div variants={fi} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Net PnL" value={`₹${metrics.totalPnl.toLocaleString()}`} icon={TrendingUp} color={metrics.totalPnl >= 0 ? 'var(--accent-green)' : 'var(--accent-red)'} />
            <StatCard title="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} icon={Target} color="var(--accent-cyan)" />
            <StatCard title="Profit Factor" value={metrics.profitFactor.toFixed(2)} icon={Activity} color="var(--accent-purple)" />
            <StatCard title="Prop Multiplier" value={`x${propFirmCount}`} icon={Building2} color="var(--accent-blue)" />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={fi} className="lg:col-span-2 glass-card p-6">
              <h3 className="text-sm font-bold mb-6 flex items-center gap-2 uppercase tracking-wider">
                <LineChart className="w-4 h-4 text-[var(--accent-purple)]" /> Equity Curve (Aggregated)
              </h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={pnlCurve}>
                  <defs>
                    <linearGradient id="pnlColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-purple)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent-purple)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }} />
                  <Tooltip content={<CT />} cursor={{ stroke: 'var(--accent-purple)', strokeWidth: 1 }} />
                  <Area type="monotone" dataKey="pnl" stroke="var(--accent-purple)" fillOpacity={1} fill="url(#pnlColor)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>

            <motion.div variants={fi} className="glass-card p-6 space-y-6">
              <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
                <Brain className="w-4 h-4 text-[var(--accent-pink)]" /> Performance Insights
              </h3>
              <div className="space-y-4">
                <InsightRow label="Best Win (Total)" value={`+₹${metrics.bestWin.toLocaleString()}`} color="var(--accent-green)" />
                <InsightRow label="Worst Loss (Total)" value={`₹${metrics.worstLoss.toLocaleString()}`} color="var(--accent-red)" />
                <InsightRow label="Managed Accounts" value={propFirmCount.toString()} color="var(--accent-cyan)" />
                <InsightRow label="Avg RR achieved" value={metrics.avgRr.toFixed(2)} color="var(--text-secondary)" />
                <div className="pt-4 border-t border-[var(--border-subtle)] space-y-2">
                  <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Psychology Grade</p>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => <Star key={s} className={`w-3.5 h-3.5 ${s <= 4 ? 'text-yellow-400 fill-yellow-400' : 'text-[var(--text-muted)]'}`} />)}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {journalTab === 'calendar' && <TradingCalendar trades={trades} />}

      {journalTab === 'trades' && (
        <motion.div variants={fi} className="glass-card p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
            <h3 className="text-sm font-bold flex items-center gap-2 uppercase tracking-wider">
              <History className="w-4 h-4 text-[var(--accent-purple)]" /> Execution Log
            </h3>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                <input 
                  placeholder="Ticker..." 
                  className="pl-9 pr-4 py-1.5 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[10px] outline-none focus:border-[var(--accent-purple)]" 
                />
              </div>
              <select className="px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-[10px] outline-none">
                <option>All Strategy</option>
                <option>Breakout</option>
                <option>Mean Reversion</option>
              </select>
            </div>
          </div>
          <div className="space-y-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest border-b border-[var(--border-subtle)]">
                  <th className="pb-3 px-4">Asset</th>
                  <th className="pb-3">Market</th>
                  <th className="pb-3">Side</th>
                  <th className="pb-3">P&L (Total)</th>
                  <th className="pb-3">RR</th>
                  <th className="pb-3">Time</th>
                  <th className="pb-3 px-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {trades.map(t => (
                  <tr key={t.id} className="group hover:bg-[var(--bg-hover)]/30 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-cyan)]" />
                        <span className="font-bold text-[var(--text-primary)]">{t.ticker}</span>
                      </div>
                    </td>
                    <td>
                      <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold">{t.marketType}</span>
                    </td>
                    <td>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${t.side === 'Long' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                        {t.side}
                      </span>
                    </td>
                    <td className={`font-mono font-bold ${t.pnl >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                      {t.pnl >= 0 ? '+' : ''}₹{t.pnl.toLocaleString()}
                    </td>
                    <td className="text-[var(--text-secondary)] font-mono">{(t.pnl / t.riskAmount).toFixed(2)}R</td>
                    <td className="text-[var(--text-tertiary)]">{new Date(t.entryTime).toLocaleDateString()}</td>
                    <td className="px-4">
                      <button className="p-1.5 rounded-lg hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Sub-Components ───────────────────────────────────────
function StatCard({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: string }) {
  return (
    <div className="glass-card p-5 relative overflow-hidden group">
      <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="w-16 h-16" style={{ color }} />
      </div>
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-3.5 h-3.5" style={{ color }} />
        <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{title}</span>
      </div>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function InsightRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-[var(--text-secondary)]">{label}</span>
      <span className="font-bold font-mono" style={{ color }}>{value}</span>
    </div>
  );
}

function Modal({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="glass-card w-full max-w-xl p-8 space-y-6 shadow-2xl border-[var(--border-glow)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">{title}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}


function TradeForm({ onSave, propFirmCount }: { onSave: (e: Omit<Trade, 'id'>) => void; propFirmCount: number }) {
  const [form, setForm] = useState({
    ticker: '', marketType: 'Crypto', side: 'Long' as 'Long' | 'Short',
    entryPrice: '', exitPrice: '', positionSize: '', riskAmount: '',
    strategy: 'Breakout', setupType: 'Bull Flag', confidence: 3,
    notes: '', emotions: 'Neutral'
  });

  const handleSubmit = () => {
    const entry = Number(form.entryPrice);
    const exit = Number(form.exitPrice);
    const size = Number(form.positionSize);
    // Multiply profit/loss by number of prop firm accounts
    const pnl = (exit - entry) * size * (form.side === 'Long' ? 1 : -1) * propFirmCount;
    
    onSave({
      ...form,
      entryPrice: entry,
      exitPrice: exit,
      positionSize: size,
      riskAmount: (Number(form.riskAmount) || 1) * propFirmCount,
      pnl,
      pnlPercentage: ((exit - entry) / entry) * 100 * (form.side === 'Long' ? 1 : -1),
      entryTime: new Date(),
      status: 'Closed',
      mistakes: [],
      tags: [],
      confidence: form.confidence
    });
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Ticker" value={form.ticker} onChange={v => setForm({...form, ticker: v})} placeholder="BTCUSDT" />
        <FormSelect label="Market" value={form.marketType} onChange={v => setForm({...form, marketType: v})} options={['Crypto','Stocks','Forex','Options','Futures']} />
      </div>
      <div className="flex p-1 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
        {['Long', 'Short'].map(s => (
          <button 
            key={s} 
            onClick={() => setForm({...form, side: s as any})} 
            className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase transition-all ${form.side === s ? (s === 'Long' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400') : 'text-[var(--text-tertiary)]'}`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Entry Price" value={form.entryPrice} onChange={v => setForm({...form, entryPrice: v})} type="number" placeholder="0.00" />
        <FormInput label="Exit Price" value={form.exitPrice} onChange={v => setForm({...form, exitPrice: v})} type="number" placeholder="0.00" />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <FormInput label="Size (per account)" value={form.positionSize} onChange={v => setForm({...form, positionSize: v})} type="number" placeholder="1.0" />
        <FormInput label="Risk (₹ per account)" value={form.riskAmount} onChange={v => setForm({...form, riskAmount: v})} type="number" placeholder="1000" />
      </div>
      <div className="p-3 rounded-xl bg-[var(--accent-cyan)]/5 border border-[var(--accent-cyan)]/20">
        <p className="text-[10px] font-bold text-[var(--accent-cyan)] uppercase tracking-widest mb-1">Prop Multiplier Active</p>
        <p className="text-[9px] text-[var(--text-tertiary)] leading-tight">PNL will be multiplied by {propFirmCount} (Total Accounts). Risk will also be aggregated.</p>
      </div>
      <FormSelect label="Strategy" value={form.strategy} onChange={v => setForm({...form, strategy: v})} options={['Breakout','Mean Reversion','Scalping','Swing']} />
      <FormSelect label="Common Mistakes" value={form.emotions} onChange={v => setForm({...form, emotions: v})} options={['None','FOMO','Early Exit','Overleveraged','Hesitation','Rule Violation']} />
      <FormInput label="Notes" value={form.notes} onChange={v => setForm({...form, notes: v})} placeholder="Execution details..." />
      
      <button 
        onClick={handleSubmit}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--accent-purple)] to-[var(--accent-pink)] text-white font-bold text-sm shadow-lg shadow-purple-500/20"
      >
        Finalize Trade
      </button>
    </div>
  );
}

function TradingCalendar({ trades }: { trades: Trade[] }) {
  const [curr, setCurr] = useState(new Date());
  const daysInMonth = new Date(curr.getFullYear(), curr.getMonth() + 1, 0).getDate();
  const startDay = new Date(curr.getFullYear(), curr.getMonth(), 1).getDay();

  const dailyPnl = useMemo(() => {
    const res: Record<number, number> = {};
    trades.forEach(t => {
      const d = new Date(t.entryTime);
      if (d.getMonth() === curr.getMonth() && d.getFullYear() === curr.getFullYear()) {
        const date = d.getDate();
        res[date] = (res[date] || 0) + t.pnl;
      }
    });
    return res;
  }, [trades, curr]);

  return (
    <motion.div variants={fi} className="glass-card p-6">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
          <CalendarIcon className="w-4 h-4 text-[var(--accent-purple)]" /> Performance Calendar
        </h3>
        <div className="flex items-center gap-4">
          <button onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() - 1)))} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm font-bold text-[var(--text-primary)] w-32 text-center">{curr.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setCurr(new Date(curr.setMonth(curr.getMonth() + 1)))} className="p-1.5 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]"><ChevronRight className="w-5 h-5" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-2">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => <div key={d} className="text-center text-[10px] font-bold text-[var(--text-tertiary)] uppercase py-2">{d}</div>)}
        {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const pnl = dailyPnl[d];
          return (
            <div key={d} className="aspect-square glass-card-sm p-2 flex flex-col items-center justify-between group hover:border-[var(--accent-purple)] transition-all cursor-pointer">
              <span className="text-[10px] font-bold text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]">{d}</span>
              {pnl !== undefined && (
                <div className={`text-[10px] font-bold ${pnl >= 0 ? 'text-[var(--accent-green)]' : 'text-[var(--accent-red)]'}`}>
                  {pnl >= 0 ? '+' : ''}{Math.round(pnl / 1000)}k
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function FormInput({ label, value, onChange, type = 'text', placeholder }: { label: string; value: any; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">{label}</label>
      <input 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        type={type} 
        placeholder={placeholder}
        className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-purple)] transition-all" 
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">{label}</label>
      <select 
        value={value} 
        onChange={e => onChange(e.target.value)} 
        className="w-full px-4 py-3 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-purple)] appearance-none cursor-pointer"
      >
        {options.map(o => <option key={o} value={o} className="bg-[var(--bg-primary)]">{o}</option>)}
      </select>
    </div>
  );
}
