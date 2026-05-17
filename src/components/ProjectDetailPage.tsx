'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { db, type Project, type Milestone } from '@/lib/db';
import {
  ArrowLeft, FileText, MessageSquare, Check, Save, Trash2, Plus,
  ExternalLink, GitBranch, Globe, Video, Edit3, PlusCircle, Clock,
  Pause, Archive, Sparkles, Code2, Cpu, Zap, GraduationCap,
  Briefcase, Microscope, ChevronRight, ChevronDown, Tag, Layers,
  Link as LinkIcon, X, AlertCircle, User, Bot
} from 'lucide-react';
import SystemModal from './SystemModal';

const STATUS_CONFIG: any = {
  Planned: { color: 'var(--accent-yellow)', icon: Clock, bg: 'rgba(234,179,8,0.1)' },
  Ongoing: { color: 'var(--accent-green)', icon: Check, bg: 'rgba(34,197,94,0.1)' },
  Paused: { color: 'var(--accent-orange)', icon: Pause, bg: 'rgba(249,115,22,0.1)' },
  Finished: { color: 'var(--accent-cyan)', icon: Sparkles, bg: 'rgba(0,212,255,0.1)' },
  Archived: { color: 'var(--text-tertiary)', icon: Archive, bg: 'rgba(85,85,112,0.1)' },
};

const CATEGORY_CONFIG: any = {
  Software: { icon: Code2 }, Hardware: { icon: Cpu }, Electronics: { icon: Zap },
  University: { icon: GraduationCap }, Business: { icon: Briefcase },
  Research: { icon: Microscope }, Personal: { icon: Sparkles },
};

const DIFFICULTY_COLORS: any = { Easy: 'badge-green', Medium: 'badge-cyan', Hard: 'badge-orange', Expert: 'badge-pink' };

export default function ProjectDetailPage({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'chats' | 'resources' | 'milestones'>('overview');
  const [relatedChats, setRelatedChats] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [modal, setModal] = useState<any>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedChatId, setExpandedChatId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const id = parseInt(projectId);
    if (isNaN(id)) return;
    const p = await db.projects.get(id);
    if (p) {
      setProject(p);
      setNotes(p.notes || '');
      const chats = await db.conversations.where('projectId').equals(id).toArray();
      setRelatedChats(chats);
    }
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  if (!project) return (
    <div className="flex items-center justify-center min-h-full">
      <div className="text-center space-y-3">
        <AlertCircle className="w-10 h-10 text-[var(--text-muted)] mx-auto" />
        <p className="text-[var(--text-secondary)]">Loading project node...</p>
      </div>
    </div>
  );

  const saveNotes = async () => {
    setIsSaving(true);
    await db.projects.update(project.id!, { notes, updatedAt: new Date() });
    load();
    setTimeout(() => setIsSaving(false), 500);
  };

  const deleteProject = () => {
    setModal({
      isOpen: true, type: 'confirm', title: 'Terminate Project',
      message: 'Are you sure you want to delete this project? This will also unlink all associated chats.',
      onConfirm: async () => {
        await db.projects.delete(project.id!);
        const chats = await db.conversations.where('projectId').equals(project.id!).toArray();
        for (const c of chats) await db.conversations.update(c.id!, { projectId: undefined });
        setModal(null);
        router.push('/projects');
      }
    });
  };

  const addMilestone = () => {
    setModal({
      isOpen: true, type: 'prompt', title: 'New Milestone',
      message: 'Enter the objective title for this milestone:',
      onConfirm: async (title?: string) => {
        if (!title) return;
        const ms: Milestone = { id: Math.random().toString(36).substr(2, 9), title, completed: false, createdAt: new Date() };
        await db.projects.update(project.id!, { milestones: [...(project.milestones || []), ms], updatedAt: new Date() });
        load(); setModal(null);
      }
    });
  };

  const addLink = () => {
    setModal({
      isOpen: true, type: 'prompt', title: 'Resource Label',
      message: 'Enter the title for this resource link:',
      onConfirm: (title?: string) => {
        if (!title) return;
        setModal({
          isOpen: true, type: 'prompt', title: 'Resource URL',
          message: `Enter the URL for "${title}":`,
          onConfirm: async (url?: string) => {
            if (!url) return;
            await db.projects.update(project.id!, { links: [...(project.links || []), { title, url }], updatedAt: new Date() });
            load(); setModal(null);
          }
        });
      }
    });
  };

  const updateField = async (field: string, value: string) => {
    const update: any = { [field]: value, updatedAt: new Date() };
    await db.projects.update(project.id!, update);
    load();
    setEditingField(null);
  };

  const updateStatus = async (status: string) => {
    await db.projects.update(project.id!, { status: status as Project['status'], updatedAt: new Date() });
    load();
  };

  const removeLink = async (idx: number) => {
    const updated = [...(project.links || [])];
    updated.splice(idx, 1);
    await db.projects.update(project.id!, { links: updated, updatedAt: new Date() });
    load();
  };

  const statusConf = STATUS_CONFIG[project.status] || STATUS_CONFIG.Planned;
  const StatusIcon = statusConf.icon;
  const CatIcon = CATEGORY_CONFIG[project.category]?.icon || Code2;
  const completedMs = project.milestones.filter(m => m.completed).length;
  const progressPct = project.milestones.length > 0 ? (completedMs / project.milestones.length) * 100 : 0;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FileText },
    { id: 'chats', label: 'Conversations', icon: MessageSquare },
    { id: 'resources', label: 'Resources', icon: LinkIcon },
    { id: 'milestones', label: 'Milestones', icon: Check },
  ];

  const InlineEdit = ({ field, value, label }: { field: string; value: string; label: string }) => (
    editingField === field ? (
      <div className="flex items-center gap-2">
        <input autoFocus value={editValue} onChange={e => setEditValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') updateField(field, editValue); if (e.key === 'Escape') setEditingField(null); }}
          className="flex-1 px-3 py-1.5 rounded-lg bg-[var(--bg-hover)] border border-[var(--accent-cyan)] text-sm outline-none" />
        <button onClick={() => updateField(field, editValue)} className="p-1 text-[var(--accent-green)]"><Check className="w-4 h-4" /></button>
        <button onClick={() => setEditingField(null)} className="p-1 text-[var(--text-muted)]"><X className="w-4 h-4" /></button>
      </div>
    ) : (
      <div className="group flex items-center gap-2 cursor-pointer" onClick={() => { setEditingField(field); setEditValue(value || ''); }}>
        <span className="text-sm text-[var(--text-secondary)]">{value || <span className="italic text-[var(--text-muted)]">Click to add {label.toLowerCase()}</span>}</span>
        <Edit3 className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    )
  );

  return (
    <div className="min-h-full">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push('/projects')} className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl" style={{ background: statusConf.bg }}>
                <CatIcon className="w-5 h-5" style={{ color: statusConf.color }} />
              </div>
              <div>
                <h1 className="text-lg font-bold text-[var(--text-primary)]">{project.title}</h1>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`badge ${DIFFICULTY_COLORS[project.difficulty]}`}>{project.difficulty}</span>
                  <span className="badge badge-purple">{project.category}</span>
                  <span className="text-[10px] text-[var(--text-muted)]">•</span>
                  <span className="text-[10px] text-[var(--text-tertiary)]">{project.projectType}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select value={project.status} onChange={e => updateStatus(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border cursor-pointer outline-none transition-all appearance-none"
              style={{ background: statusConf.bg, color: statusConf.color, borderColor: statusConf.color + '40' }}>
              {Object.keys(STATUS_CONFIG).map(s => <option key={s} value={s} className="bg-[var(--bg-primary)]">{s}</option>)}
            </select>
            <button onClick={deleteProject} className="p-2 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors" title="Delete Project">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-8 flex gap-8">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`pb-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 ${activeTab === tab.id ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}>
              <tab.icon className="w-3.5 h-3.5" />{tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-8 py-8">
        {/* Progress Bar */}
        <div className="mb-8 glass-card p-5">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter mb-2">
            <span className="text-[var(--text-tertiary)]">Neural Progress</span>
            <span className="text-[var(--text-secondary)]">{completedMs}/{project.milestones.length} milestones • {Math.round(progressPct)}%</span>
          </div>
          <div className="h-2 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
            <motion.div animate={{ width: `${progressPct}%` }} className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${statusConf.color}, var(--accent-purple))` }} />
          </div>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              <section className="glass-card p-6">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-[var(--accent-cyan)]" /> Abstract
                </h3>
                <InlineEdit field="description" value={project.description} label="Description" />
              </section>

              <section className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wider">
                    <Edit3 className="w-4 h-4 text-[var(--accent-purple)]" /> Lab Notes
                  </h3>
                  <button onClick={saveNotes}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${isSaving ? 'bg-[var(--accent-green)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}>
                    {isSaving ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                    {isSaving ? 'Synced' : 'Sync Notes'}
                  </button>
                </div>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="Log technical details, brainstorms, or current status..."
                  className="w-full h-64 bg-[var(--bg-secondary)]/50 rounded-xl p-5 border border-[var(--border-subtle)] focus:border-[var(--accent-purple)] outline-none text-sm text-[var(--text-primary)] font-mono leading-relaxed custom-scrollbar" />
              </section>
            </div>

            {/* Sidebar Info */}
            <div className="space-y-6">
              <div className="glass-card p-5 space-y-4">
                <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Project Info</h4>
                {[
                  { label: 'Created', value: new Date(project.createdAt).toLocaleDateString() },
                  { label: 'Updated', value: new Date(project.updatedAt).toLocaleDateString() },
                  { label: 'Type', value: project.projectType },
                  { label: 'Category', value: project.category },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between text-xs">
                    <span className="text-[var(--text-tertiary)]">{item.label}</span>
                    <span className="text-[var(--text-secondary)]">{item.value}</span>
                  </div>
                ))}
              </div>

              <div className="glass-card p-5 space-y-3">
                <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Tags</h4>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[var(--bg-hover)] text-[var(--text-secondary)] border border-[var(--border-subtle)]">{tag}</span>
                  ))}
                  {project.tags.length === 0 && <span className="text-[10px] text-[var(--text-muted)] italic">No tags</span>}
                </div>
              </div>

              <div className="glass-card p-5 space-y-3">
                <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Tech Stack</h4>
                <div className="flex flex-wrap gap-2">
                  {project.techStack.map(t => (
                    <span key={t} className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[rgba(0,212,255,0.06)] text-[var(--accent-cyan)] border border-[rgba(0,212,255,0.15)]">{t}</span>
                  ))}
                  {project.techStack.length === 0 && <span className="text-[10px] text-[var(--text-muted)] italic">No tech listed</span>}
                </div>
              </div>

              <div className="glass-card p-5 space-y-3">
                <h4 className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Quick Links</h4>
                {project.githubUrl && <a href={project.githubUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors"><GitBranch className="w-3.5 h-3.5" /> GitHub</a>}
                {project.deployedUrl && <a href={project.deployedUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors"><Globe className="w-3.5 h-3.5" /> Live Site</a>}
                {project.youtubeUrl && <a href={project.youtubeUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-red-400 transition-colors"><Video className="w-3.5 h-3.5" /> YouTube</a>}
                {project.docsUrl && <a href={project.docsUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-[var(--text-secondary)] hover:text-[var(--accent-blue)] transition-colors"><FileText className="w-3.5 h-3.5" /> Docs</a>}
                {!project.githubUrl && !project.deployedUrl && !project.youtubeUrl && !project.docsUrl && (
                  <p className="text-[10px] text-[var(--text-muted)] italic">No links yet — add them in Resources tab</p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="max-w-4xl space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2 uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-[var(--accent-purple)]" /> Linked Conversations
            </h3>
            {relatedChats.length > 0 ? relatedChats.map(chat => (
              <div
                key={chat.id}
                onClick={() => router.push(`/copilot?chat=${chat.id}`)}
                className="glass-card p-4 flex items-center justify-between hover:border-[var(--accent-cyan)]/30 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-[rgba(168,85,247,0.1)]"><MessageSquare className="w-4 h-4 text-[var(--accent-purple)]" /></div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{chat.title}</p>
                    <p className="text-[10px] text-[var(--text-tertiary)] font-mono">{new Date(chat.updatedAt).toLocaleDateString()} • {chat.messages?.length || 0} signals</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
              </div>
            )) : (
              <div className="text-center py-12 bg-[var(--bg-secondary)]/30 rounded-2xl border border-dashed border-[var(--border-subtle)]">
                <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                <p className="text-xs text-[var(--text-tertiary)]">No conversations linked. Link them from the AI Copilot terminal.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'resources' && (
          <div className="max-w-4xl space-y-8">
            {/* Editable Core Links */}
            <section className="glass-card p-6 space-y-5">
              <h3 className="text-sm font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2 uppercase tracking-wider">
                <GitBranch className="w-4 h-4 text-[var(--accent-blue)]" /> Core Links
              </h3>
              {[
                { field: 'githubUrl', label: 'GitHub Repository', icon: GitBranch, color: 'var(--text-secondary)' },
                { field: 'deployedUrl', label: 'Live Deployment', icon: Globe, color: 'var(--accent-cyan)' },
                { field: 'youtubeUrl', label: 'YouTube / Media', icon: Video, color: '#ef4444' },
                { field: 'docsUrl', label: 'Documentation', icon: FileText, color: 'var(--accent-blue)' },
              ].map(item => (
                <div key={item.field} className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-[var(--bg-hover)] mt-0.5"><item.icon className="w-4 h-4" style={{ color: item.color }} /></div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-1">{item.label}</p>
                    <InlineEdit field={item.field} value={(project as any)[item.field]} label={item.label} />
                  </div>
                </div>
              ))}
            </section>

            {/* Additional Links */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wider">
                  <PlusCircle className="w-4 h-4 text-[var(--text-muted)]" /> Additional Resources
                </h3>
                <button onClick={addLink} className="text-[10px] font-bold text-[var(--accent-cyan)] hover:underline uppercase tracking-widest">+ Add Link</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.links?.map((link, idx) => (
                  <div key={idx} className="glass-card p-4 flex items-center gap-4 group">
                    <LinkIcon className="w-5 h-5 text-[var(--text-muted)]" />
                    <a href={link.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent-cyan)] transition-colors">{link.title}</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] truncate">{link.url}</p>
                    </a>
                    <button onClick={() => removeLink(idx)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/10 text-red-400 transition-all">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button onClick={addLink} className="glass-card p-4 flex items-center justify-center gap-3 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]/30 group transition-all">
                  <Plus className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)]" />
                  <span className="text-xs font-bold text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]">Append Resource</span>
                </button>
              </div>
            </section>
          </div>
        )}

        {activeTab === 'milestones' && (
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wider">
                <Check className="w-4 h-4 text-[var(--accent-green)]" /> Mission Milestones
              </h3>
              <button onClick={addMilestone} className="text-[10px] font-bold text-[var(--accent-cyan)] hover:underline uppercase tracking-widest">+ Add Milestone</button>
            </div>
            <div className="space-y-3">
              {project.milestones.map(m => (
                <div key={m.id}
                  onClick={async () => {
                    const updated = project.milestones.map(x => x.id === m.id ? { ...x, completed: !x.completed } : x);
                    await db.projects.update(project.id!, { milestones: updated, updatedAt: new Date() });
                    load();
                  }}
                  className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${m.completed ? 'bg-[var(--bg-hover)]/30 border-transparent' : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]/30'}`}>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${m.completed ? 'bg-[var(--accent-green)] border-[var(--accent-green)]' : 'border-[var(--text-muted)] group-hover:border-[var(--accent-cyan)]'}`}>
                    {m.completed && <Check className="w-4 h-4 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${m.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{m.title}</p>
                    {m.dueDate && <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">Target: {new Date(m.dueDate).toLocaleDateString()}</p>}
                  </div>
                  <button 
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setModal({
                        isOpen: true,
                        type: 'confirm',
                        title: 'Delete Milestone',
                        message: 'Are you sure you want to delete this milestone?',
                        onConfirm: async () => {
                          const updated = project.milestones.filter(x => x.id !== m.id);
                          await db.projects.update(project.id!, { milestones: updated, updatedAt: new Date() });
                          load();
                          setModal(null);
                        }
                      });
                    }} 
                    className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {project.milestones.length === 0 && (
                <div className="text-center py-12 bg-[var(--bg-secondary)]/30 rounded-2xl border border-dashed border-[var(--border-subtle)]">
                  <Check className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-xs text-[var(--text-tertiary)]">No milestones yet. Add one to track your progress.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <SystemModal isOpen={!!modal?.isOpen} type={modal?.type || 'alert'} title={modal?.title || ''} message={modal?.message || ''}
        defaultValue={modal?.defaultValue} onConfirm={modal?.onConfirm || (() => {})} onCancel={() => setModal(null)} />
    </div>
  );
}
