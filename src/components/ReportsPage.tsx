'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, Calendar, TrendingUp, Sparkles, Download } from 'lucide-react';
import { db, type WeeklyReport } from '@/lib/db';

const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);

  useEffect(() => {
    db.weeklyReports.orderBy('createdAt').reverse().toArray().then(setReports);
  }, []);

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }} className="max-w-[1000px] mx-auto space-y-6">
        <motion.div variants={fi} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[rgba(168,85,247,0.1)]"><FileText className="w-5 h-5 text-[var(--accent-purple)]" /></div>
          <div><h1 className="text-2xl font-bold">Weekly Reports</h1><p className="text-xs text-[var(--text-tertiary)] font-mono">AI-generated weekly summaries & insights</p></div>
        </motion.div>

        {reports.length === 0 && (
          <div className="text-center text-[var(--text-secondary)] mt-10">No reports generated yet. Reports are automatically generated at the end of the week.</div>
        )}

        <div className="space-y-4">
          {reports.map((r, i) => (
            <motion.div key={r.id || i} variants={fi} className="glass-card p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3"><Calendar className="w-4 h-4 text-[var(--accent-purple)]" /><span className="text-sm font-semibold">{new Date(r.weekStart).toLocaleDateString()} – {new Date(r.weekEnd).toLocaleDateString()}</span></div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[rgba(0,212,255,0.1)] text-[var(--accent-cyan)]"><TrendingUp className="w-3.5 h-3.5" /><span className="text-sm font-bold">{r.productivityScore}</span><span className="text-[10px]">/100</span></div>
                  <button className="p-2 rounded-lg hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]"><Download className="w-4 h-4" /></button>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{r.summary}</p>
              <div><h4 className="text-xs font-semibold text-[var(--text-tertiary)] mb-2 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Highlights</h4>
                <div className="grid grid-cols-2 gap-2">{r.highlights.map((h, j) => (<div key={j} className="flex items-center gap-2 p-2 rounded-lg bg-[var(--bg-hover)] text-xs text-[var(--text-secondary)]"><div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-purple)]" />{h}</div>))}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
