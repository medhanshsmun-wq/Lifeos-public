'use client';

import { motion } from 'framer-motion';
import { Download, FileText, FolderKanban, BarChart3, Briefcase } from 'lucide-react';

const fi = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } };

const exports = [
  { title: 'Project Portfolio PDF', desc: 'Generate a polished portfolio document with all project summaries, tech stacks, and links', icon: Briefcase, color: 'var(--accent-cyan)' },
  { title: 'Weekly Report PDF', desc: 'Export weekly productivity reports with charts and AI insights', icon: FileText, color: 'var(--accent-purple)' },
  { title: 'Analytics Summary', desc: 'Export behavioral analytics data and life balance metrics', icon: BarChart3, color: 'var(--accent-green)' },
  { title: 'Project Documentation', desc: 'Generate technical documentation for individual projects', icon: FolderKanban, color: 'var(--accent-blue)' },
];

export default function ExportsPage() {
  return (
    <div className="p-6 lg:p-8 grid-bg min-h-full">
      <motion.div initial="hidden" animate="show" variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } }} className="max-w-[1000px] mx-auto space-y-6">
        <motion.div variants={fi} className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[rgba(236,72,153,0.1)]"><Download className="w-5 h-5 text-[var(--accent-pink)]" /></div>
          <div><h1 className="text-2xl font-bold">Exports</h1><p className="text-xs text-[var(--text-tertiary)] font-mono">Generate polished documents & PDFs</p></div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {exports.map(ex => (
            <motion.div key={ex.title} variants={fi} className="glass-card p-6 hover:border-[var(--border-glow)] transition-all group cursor-pointer">
              <div className="p-3 rounded-xl w-fit mb-4" style={{ background: `${ex.color}15` }}><ex.icon className="w-6 h-6" style={{ color: ex.color }} /></div>
              <h3 className="text-sm font-semibold mb-1 group-hover:text-[var(--accent-cyan)] transition-colors">{ex.title}</h3>
              <p className="text-xs text-[var(--text-tertiary)] mb-4 leading-relaxed">{ex.desc}</p>
              <button className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] border border-[var(--border-subtle)] transition-colors">
                <Download className="w-3.5 h-3.5" /> Generate
              </button>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
