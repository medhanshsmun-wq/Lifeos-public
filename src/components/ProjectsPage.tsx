'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db, type Project, type Milestone } from '@/lib/db';
import { serverDb } from '@/lib/serverDb';
import SystemModal from './SystemModal';
import {
  FolderKanban, Plus, Search, Filter, ExternalLink, GitBranch,
  X, Calendar, Tag, Layers, ChevronDown, Check, Clock,
  Pause, Archive, AlertCircle, Sparkles, Globe, Video,
  Link as LinkIcon, FileText, MessageSquare, Settings, Trash2,
  Cpu, GraduationCap, Code2, Briefcase, Microscope, ChevronRight,
  MoreVertical, Save, Edit3, PlusCircle, Zap, ChevronLeft
} from 'lucide-react';

const STATUS_CONFIG = {
  Planned: { color: 'var(--accent-yellow)', icon: Clock, bg: 'rgba(234,179,8,0.1)' },
  Ongoing: { color: 'var(--accent-green)', icon: Check, bg: 'rgba(34,197,94,0.1)' },
  Paused: { color: 'var(--accent-orange)', icon: Pause, bg: 'rgba(249,115,22,0.1)' },
  Finished: { color: 'var(--accent-cyan)', icon: Sparkles, bg: 'rgba(0,212,255,0.1)' },
  Archived: { color: 'var(--text-tertiary)', icon: Archive, bg: 'rgba(85,85,112,0.1)' },
};

const CATEGORY_CONFIG = {
  Software: { icon: Code2, color: 'var(--accent-blue)' },
  Hardware: { icon: Cpu, color: 'var(--accent-orange)' },
  Electronics: { icon: Zap, color: 'var(--accent-yellow)' },
  University: { icon: GraduationCap, color: 'var(--accent-purple)' },
  Business: { icon: Briefcase, color: 'var(--accent-green)' },
  Research: { icon: Microscope, color: 'var(--accent-pink)' },
  Personal: { icon: Sparkles, color: 'var(--accent-cyan)' },
} as any;

const DIFFICULTY_COLORS = {
  Easy: 'badge-green',
  Medium: 'badge-cyan',
  Hard: 'badge-orange',
  Expert: 'badge-pink',
};

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAdd, setShowAdd] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [modal, setModal] = useState<any>(null);

  const load = useCallback(async () => {
    const p = await db.projects.orderBy('updatedAt').reverse().toArray();
    setProjects(p);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = (id: number) => {
    setModal({
      isOpen: true,
      type: 'confirm',
      title: 'Terminate Project',
      message: 'Are you sure you want to delete this project? This will also unlink all associated chats from the neural graph.',
      onConfirm: async () => {
        await db.projects.delete(id);
        
        // Sync delete to server
        try {
          await serverDb.projects.delete(id);
        } catch (err) {
          console.warn('Failed to sync project deletion to server:', err);
        }
        
        load();
        setModal(null);
      }
    });
  };

  const filtered = projects.filter(p => {
    const matchSearch = p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = filterStatus === 'all' || p.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 lg:p-8 min-h-full">
      <motion.div variants={container} initial="hidden" animate="show" className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <motion.div variants={item} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[rgba(59,130,246,0.1)]">
              <FolderKanban className="w-5 h-5 text-[var(--accent-blue)]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Projects</h1>
              <p className="text-xs text-[var(--text-tertiary)] font-mono">{projects.length} projects • Intelligent lifecycle tracking</p>
            </div>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-blue)] text-white text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            Launch Project
          </button>
        </motion.div>

        {/* Filters and Search */}
        <motion.div variants={item} className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1 glass-card-sm flex items-center gap-3 px-4 py-3 border border-[var(--border-subtle)] focus-within:border-[var(--accent-cyan)] transition-colors">
            <Search className="w-4 h-4 text-[var(--text-tertiary)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search projects, components, tags..."
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {['all', ...Object.keys(STATUS_CONFIG)].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${filterStatus === status ? 'bg-[var(--bg-elevated)] border-[var(--accent-cyan)] text-[var(--accent-cyan)]' : 'bg-[var(--bg-glass)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--text-muted)]'}`}
              >
                {status}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Projects Grid */}
        <motion.div variants={container} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((proj) => (
            <ProjectCard
              key={proj.id}
              project={proj}
              onClick={() => router.push(`/projects/${proj.id}`)}
              onEdit={() => setProjectToEdit(proj)}
              onDelete={() => handleDelete(proj.id!)}
            />
          ))}
        </motion.div>

        {filtered.length === 0 && (
          <div className="text-center py-20 bg-[var(--bg-secondary)]/30 rounded-3xl border border-dashed border-[var(--border-subtle)]">
            <AlertCircle className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)] font-medium">No projects found in this sector</p>
            <p className="text-xs text-[var(--text-tertiary)] mt-1">Adjust your filters or initialize a new neural node.</p>
          </div>
        )}
      </motion.div>

      {/* Overlays */}
      <AnimatePresence>
        {showAdd && <AddProjectOverlay onClose={() => setShowAdd(false)} onSaved={load} />}
        {projectToEdit && (
          <AddProjectOverlay
            projectToEdit={projectToEdit}
            onClose={() => setProjectToEdit(null)}
            onSaved={load}
          />
        )}
      </AnimatePresence>

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

// ─── Project Card Component ──────────────────────────────
function ProjectCard({ project, onClick, onEdit, onDelete }: { project: Project; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const statusConf = STATUS_CONFIG[project.status];
  const StatusIcon = statusConf.icon;
  const categoryIcon = CATEGORY_CONFIG[project.category]?.icon || Code2;
  const CategoryIcon = categoryIcon;
  const completedMilestones = project.milestones.filter(m => m.completed).length;
  const progressPct = project.milestones.length > 0 ? (completedMilestones / project.milestones.length) * 100 : 0;

  return (
    <motion.div
      variants={item}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className="glass-card p-6 cursor-pointer hover:border-[var(--border-glow)] transition-all duration-300 shine-hover group relative overflow-hidden"
    >
      {/* Hover Action Bar */}
      <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="p-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)]/30 transition-all shadow-md"
          title="Edit Project"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:text-red-400 hover:border-red-400/30 transition-all shadow-md"
          title="Delete Project"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <CategoryIcon className="w-16 h-16" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-1.5 rounded-lg bg-[var(--bg-hover)]">
            <CategoryIcon className="w-4 h-4 text-[var(--accent-cyan)]" />
          </div>
          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest">{project.category}</span>
        </div>

        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2 group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-1">
          {project.title}
        </h3>
        <p className="text-xs text-[var(--text-tertiary)] mb-5 line-clamp-2 leading-relaxed h-8">
          {project.description}
        </p>

        {/* Progress Section */}
        <div className="space-y-2 mb-6">
          <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
            <span className="text-[var(--text-tertiary)]">Neural Progress</span>
            <span className="text-[var(--text-secondary)]">{Math.round(progressPct)}%</span>
          </div>
          <div className="h-1.5 w-full bg-[var(--bg-hover)] rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${statusConf.color}, var(--accent-purple))` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold" style={{ background: statusConf.bg, color: statusConf.color }}>
            <StatusIcon className="w-3 h-3" />
            {project.status.toUpperCase()}
          </div>
          <div className="flex items-center gap-3">
            {project.githubUrl && <GitBranch className="w-3.5 h-3.5 text-[var(--text-tertiary)] hover:text-[var(--accent-cyan)]" />}
            {project.youtubeUrl && <Video className="w-3.5 h-3.5 text-[var(--text-tertiary)] hover:text-red-400" />}
            <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Project Dashboard Overlay ──────────────────────────
function ProjectDashboard({ project, onClose, onUpdate, setGlobalModal }: { project: Project; onClose: () => void; onUpdate: () => void; setGlobalModal: any }) {
  const [activeTab, setActiveTab] = useState<'overview' | 'chats' | 'resources' | 'milestones'>('overview');
  const [relatedChats, setRelatedChats] = useState<any[]>([]);
  const [notes, setNotes] = useState(project.notes || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchChats = async () => {
      const chats = await db.conversations.where('projectId').equals(project.id!).toArray();
      setRelatedChats(chats);
    };
    fetchChats();
  }, [project.id]);

  const saveNotes = async () => {
    setIsSaving(true);
    await db.projects.update(project.id!, { notes, updatedAt: new Date() });
    onUpdate();
    setTimeout(() => setIsSaving(false), 500);
  };

  const deleteProject = async () => {
    setGlobalModal({
      isOpen: true,
      type: 'confirm',
      title: 'Terminate Project',
      message: 'Are you sure you want to delete this project? This will also unlink all associated chats from the neural graph.',
      onConfirm: async () => {
        await db.projects.delete(project.id!);
        const chats = await db.conversations.where('projectId').equals(project.id!).toArray();
        for (const chat of chats) {
          await db.conversations.update(chat.id!, { projectId: undefined });
        }
        onUpdate();
        onClose();
        setGlobalModal(null);
      }
    });
  };

  const statusConf = STATUS_CONFIG[project.status];
  const StatusIcon = statusConf.icon;

  const addMilestone = async () => {
    setGlobalModal({
      isOpen: true,
      type: 'prompt',
      title: 'New Milestone',
      message: 'Enter the objective title for this milestone:',
      onConfirm: async (title: string) => {
        if (!title) return;
        const newMilestone: Milestone = {
          id: Math.random().toString(36).substr(2, 9),
          title,
          completed: false,
          createdAt: new Date(),
        };
        const updated = [...(project.milestones || []), newMilestone];
        await db.projects.update(project.id!, { milestones: updated, updatedAt: new Date() });
        onUpdate();
        setGlobalModal(null);
      }
    });
  };

  const addLink = async () => {
    setGlobalModal({
      isOpen: true,
      type: 'prompt',
      title: 'Resource Label',
      message: 'Enter the title for this resource link:',
      onConfirm: (title: string) => {
        if (!title) return;
        setGlobalModal({
          isOpen: true,
          type: 'prompt',
          title: 'Resource URL',
          message: `Enter the URL for "${title}":`,
          onConfirm: async (url: string) => {
            if (!url) return;
            const updated = [...(project.links || []), { title, url }];
            await db.projects.update(project.id!, { links: updated, updatedAt: new Date() });
            onUpdate();
            setGlobalModal(null);
          }
        });
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md overflow-hidden"
    >
      <motion.div
        initial={{ y: 50, scale: 0.95 }}
        animate={{ y: 0, scale: 1 }}
        exit={{ y: 50, scale: 0.95 }}
        className="w-[95%] h-[90%] glass-card flex flex-col md:flex-row overflow-hidden shadow-2xl border-[var(--border-glow)]"
      >
        {/* Sidebar Info */}
        <AnimatePresence initial={false}>
          {isSidebarOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="w-full md:w-80 border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 p-8 flex flex-col justify-between overflow-hidden whitespace-nowrap relative"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-8">
                  <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                  <button onClick={() => setIsSidebarOpen(false)} className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)] transition-colors">
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <StatusIcon className="w-4 h-4" style={{ color: statusConf.color }} />
                      <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: statusConf.color }}>{project.status}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] leading-tight truncate">{project.title}</h2>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className={`badge ${DIFFICULTY_COLORS[project.difficulty]}`}>{project.difficulty}</span>
                      <span className="badge badge-purple">{project.category}</span>
                    </div>
                  </div>

                  <div className="space-y-4 pt-6 border-t border-[var(--border-subtle)]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-tertiary)]">Tech Node</span>
                      <span className="text-[var(--text-secondary)]">{project.projectType}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-tertiary)]">Initialize Date</span>
                      <span className="text-[var(--text-secondary)]">{new Date(project.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-tertiary)]">Last Sync</span>
                      <span className="text-[var(--text-secondary)]">{new Date(project.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={deleteProject}
                className="w-full py-3 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2 relative z-10"
              >
                <Trash2 className="w-4 h-4" /> Terminate Node
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-primary)]/40">
          {/* Header/Tabs */}
          <div className="px-8 pt-8 border-b border-[var(--border-subtle)] flex items-center gap-4">
            {!isSidebarOpen && (
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -mt-8 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
            <div className="flex gap-8">
              {[
                { id: 'overview', label: 'Overview', icon: FileText },
                { id: 'chats', label: 'Conversations', icon: MessageSquare },
                { id: 'resources', label: 'Resources', icon: LinkIcon },
                { id: 'milestones', label: 'Milestones', icon: Check },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`pb-4 text-xs font-bold uppercase tracking-widest flex items-center gap-2 transition-all border-b-2 ${activeTab === tab.id ? 'border-[var(--accent-cyan)] text-[var(--accent-cyan)]' : 'border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]'}`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
            {!isSidebarOpen && (
              <div className="ml-auto -mt-8 flex items-center gap-3">
                 <h2 className="text-sm font-bold text-[var(--text-primary)]">{project.title}</h2>
                 <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-red-500/10 text-red-400"><X className="w-4 h-4"/></button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === 'overview' && (
              <div className="max-w-4xl space-y-8">
                <section>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <AlertCircle className="w-4 h-4 text-[var(--accent-cyan)]" /> Abstract
                  </h3>
                  <div className="glass-card-sm p-6 text-sm text-[var(--text-secondary)] leading-relaxed bg-[var(--bg-secondary)]/30">
                    {project.description}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wider">
                      <Edit3 className="w-4 h-4 text-[var(--accent-purple)]" /> Project Lab Notes
                    </h3>
                    <button
                      onClick={saveNotes}
                      className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-2 ${isSaving ? 'bg-[var(--accent-green)] text-white' : 'bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'}`}
                    >
                      {isSaving ? <Check className="w-3 h-3" /> : <Save className="w-3 h-3" />}
                      {isSaving ? 'Synced' : 'Sync Notes'}
                    </button>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Log technical details, brainstorms, or current status..."
                    className="w-full h-64 glass-card-sm p-6 bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] focus:border-[var(--accent-purple)] outline-none text-sm text-[var(--text-primary)] font-mono leading-relaxed custom-scrollbar"
                  />
                </section>
              </div>
            )}

            {activeTab === 'chats' && (
              <div className="max-w-4xl space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2 uppercase tracking-wider">
                  <MessageSquare className="w-4 h-4 text-[var(--accent-purple)]" /> Neural Links
                </h3>
                {relatedChats.length > 0 ? (
                  relatedChats.map(chat => (
                    <div
                      key={chat.id}
                      className="glass-card-sm p-4 flex items-center justify-between hover:border-[var(--accent-cyan)]/30 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 rounded-xl bg-[rgba(168,85,247,0.1)]">
                          <MessageSquare className="w-4 h-4 text-[var(--accent-purple)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{chat.title}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] font-mono">{new Date(chat.updatedAt).toLocaleDateString()} • {chat.messages?.length || 0} signals</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-[var(--bg-secondary)]/30 rounded-2xl border border-dashed border-[var(--border-subtle)]">
                    <MessageSquare className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-xs text-[var(--text-tertiary)]">No conversations linked to this project node.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'resources' && (
              <div className="max-w-4xl space-y-8">
                <section>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <GitBranch className="w-4 h-4 text-[var(--accent-blue)]" /> Core Repositories
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.githubUrl && (
                      <a href={project.githubUrl} target="_blank" rel="noreferrer" className="glass-card-sm p-4 flex items-center gap-4 hover:bg-[var(--bg-hover)] transition-all">
                        <GitBranch className="w-5 h-5 text-[var(--text-secondary)]" />
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">Main GitHub</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[200px]">{project.githubUrl}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 ml-auto text-[var(--text-muted)]" />
                      </a>
                    )}
                    {project.deployedUrl && (
                      <a href={project.deployedUrl} target="_blank" rel="noreferrer" className="glass-card-sm p-4 flex items-center gap-4 hover:bg-[var(--bg-hover)] transition-all">
                        <Globe className="w-5 h-5 text-[var(--accent-cyan)]" />
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">Deployment</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] truncate max-w-[200px]">{project.deployedUrl}</p>
                        </div>
                        <ExternalLink className="w-3 h-3 ml-auto text-[var(--text-muted)]" />
                      </a>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2 uppercase tracking-wider">
                    <LinkIcon className="w-4 h-4 text-[var(--accent-cyan)]" /> External Nodes
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.youtubeUrl && (
                      <a href={project.youtubeUrl} target="_blank" rel="noreferrer" className="glass-card-sm p-4 flex items-center gap-4 hover:bg-[var(--bg-hover)] transition-all">
                        <Video className="w-5 h-5 text-red-500" />
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">Reference Media</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">Watch implementation</p>
                        </div>
                        <ExternalLink className="w-3 h-3 ml-auto text-[var(--text-muted)]" />
                      </a>
                    )}
                    {project.docsUrl && (
                      <a href={project.docsUrl} target="_blank" rel="noreferrer" className="glass-card-sm p-4 flex items-center gap-4 hover:bg-[var(--bg-hover)] transition-all">
                        <FileText className="w-5 h-5 text-[var(--accent-blue)]" />
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">Documentation</p>
                          <p className="text-[10px] text-[var(--text-tertiary)]">Technical specs</p>
                        </div>
                        <ExternalLink className="w-3 h-3 ml-auto text-[var(--text-muted)]" />
                      </a>
                    )}
                  </div>
                </section>
                
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2 uppercase tracking-wider">
                      <PlusCircle className="w-4 h-4 text-[var(--text-muted)]" /> Additional Links
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.links?.map((link, idx) => (
                      <a key={idx} href={link.url} target="_blank" rel="noreferrer" className="glass-card-sm p-4 flex items-center gap-4 hover:bg-[var(--bg-hover)] transition-all">
                        <LinkIcon className="w-5 h-5 text-[var(--text-muted)]" />
                        <div>
                          <p className="text-sm font-bold text-[var(--text-primary)]">{link.title}</p>
                          <p className="text-[10px] text-[var(--text-tertiary)] truncate">{link.url}</p>
                        </div>
                      </a>
                    ))}
                    <button 
                      onClick={addLink}
                      className="glass-card-sm p-4 flex items-center justify-center gap-3 border-dashed border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]/30 group transition-all"
                    >
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
                  <button 
                    onClick={addMilestone}
                    className="text-[10px] font-bold text-[var(--accent-cyan)] hover:underline uppercase tracking-widest"
                  >
                    + Add Milestone
                  </button>
                </div>
                <div className="space-y-3">
                  {project.milestones.map(m => (
                    <div
                      key={m.id}
                      onClick={async () => {
                        const updated = project.milestones.map(x => x.id === m.id ? { ...x, completed: !x.completed } : x);
                        await db.projects.update(project.id!, { milestones: updated, updatedAt: new Date() });
                        onUpdate();
                      }}
                      className={`group flex items-center gap-4 p-5 rounded-2xl border transition-all cursor-pointer ${m.completed ? 'bg-[var(--bg-hover)]/30 border-transparent' : 'bg-[var(--bg-secondary)]/50 border-[var(--border-subtle)] hover:border-[var(--accent-cyan)]/30'}`}
                    >
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${m.completed ? 'bg-[var(--accent-green)] border-[var(--accent-green)]' : 'border-[var(--text-muted)] group-hover:border-[var(--accent-cyan)]'}`}>
                        {m.completed && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${m.completed ? 'text-[var(--text-tertiary)] line-through' : 'text-[var(--text-primary)]'}`}>{m.title}</p>
                        {m.dueDate && <p className="text-[10px] text-[var(--text-muted)] mt-1 font-mono">Target: {new Date(m.dueDate).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Add Project Overlay (Dynamic Logging) ────────────────
function AddProjectOverlay({ onClose, onSaved, projectToEdit }: { onClose: () => void; onSaved: () => void; projectToEdit?: Project }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: projectToEdit?.title || '',
    description: projectToEdit?.description || '',
    notes: projectToEdit?.notes || '',
    tags: projectToEdit?.tags?.join(', ') || '',
    category: projectToEdit?.category || 'Software',
    techStack: projectToEdit?.techStack?.join(', ') || '',
    projectType: projectToEdit?.projectType || 'Individual',
    difficulty: projectToEdit?.difficulty || 'Medium' as Project['difficulty'],
    status: projectToEdit?.status || 'Planned' as Project['status'],
    githubUrl: projectToEdit?.githubUrl || '',
    deployedUrl: projectToEdit?.deployedUrl || '',
    youtubeUrl: projectToEdit?.youtubeUrl || '',
    docsUrl: projectToEdit?.docsUrl || '',
  });

  const save = async () => {
    if (!form.title) return;
    const projectData = {
      title: form.title,
      description: form.description,
      notes: form.notes,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      category: form.category,
      techStack: form.techStack.split(',').map(t => t.trim()).filter(Boolean),
      projectType: form.projectType,
      difficulty: form.difficulty,
      status: form.status,
      githubUrl: form.githubUrl,
      deployedUrl: form.deployedUrl,
      youtubeUrl: form.youtubeUrl,
      docsUrl: form.docsUrl,
      updatedAt: new Date(),
    };

    if (projectToEdit) {
      await db.projects.update(projectToEdit.id!, projectData);
      
      // Sync update to server
      try {
        const fullProject = await db.projects.get(projectToEdit.id!);
        if (fullProject) {
          await serverDb.projects.put(fullProject);
        }
      } catch (err) {
        console.warn('Failed to sync project update to server:', err);
      }
    } else {
      const newId = await db.projects.add({
        ...projectData,
        links: [],
        files: [],
        milestones: [],
        createdAt: new Date(),
      });
      
      // Sync add to server
      try {
        const fullProject = await db.projects.get(newId);
        if (fullProject) {
          await serverDb.projects.add(fullProject);
        }
      } catch (err) {
        console.warn('Failed to sync project creation to server:', err);
      }
    }
    onSaved();
    onClose();
  };

  const categories = Object.keys(CATEGORY_CONFIG);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-3xl overflow-hidden shadow-2xl"
      >
        <div className="h-1.5 w-full bg-[var(--bg-hover)]">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)]"
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>

        <div className="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <span className="text-[10px] font-bold text-[var(--accent-cyan)] uppercase tracking-widest">Step {step} of 3</span>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">
                {step === 1 ? 'Core Parameters' : step === 2 ? 'Technical Specs' : 'Resources & Links'}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl hover:bg-[var(--bg-hover)] text-[var(--text-tertiary)]">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6 min-h-[300px]">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <ModalInput label="Neural Node Title" value={form.title} onChange={v => setForm({...form, title: v})} placeholder="Ex: Project Phoenix" />
                <ModalInput label="Abstract / Description" value={form.description} onChange={v => setForm({...form, description: v})} placeholder="What is the mission objective?" />
                <div>
                  <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 block">Node Sector</label>
                  <div className="grid grid-cols-4 gap-2">
                    {categories.map(cat => {
                      const Icon = CATEGORY_CONFIG[cat].icon;
                      return (
                        <button
                          key={cat}
                          onClick={() => setForm({...form, category: cat})}
                          className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${form.category === cat ? 'bg-[var(--accent-cyan)]/10 border-[var(--accent-cyan)] text-[var(--accent-cyan)] shadow-lg shadow-cyan-500/10' : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-tertiary)] hover:border-[var(--text-muted)]'}`}
                        >
                          <Icon className="w-5 h-5" />
                          <span className="text-[10px] font-bold uppercase">{cat}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <ModalInput label="Tech Components" value={form.techStack} onChange={v => setForm({...form, techStack: v})} placeholder="Next.js, Arduino, Rust... (comma separated)" />
                <ModalInput label="Classification Tags" value={form.tags} onChange={v => setForm({...form, tags: v})} placeholder="AI, Robotics, Open Source... (comma separated)" />
                <div className="grid grid-cols-2 gap-4">
                  <ModalSelect label="Initial Status" value={form.status} onChange={v => setForm({...form, status: v as Project['status']})} options={['Planned','Ongoing','Paused','Finished','Archived']} />
                  <ModalSelect label="Computational Difficulty" value={form.difficulty} onChange={v => setForm({...form, difficulty: v as Project['difficulty']})} options={['Easy','Medium','Hard','Expert']} />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                <ModalInput label="Repository Link (GitHub)" value={form.githubUrl} onChange={v => setForm({...form, githubUrl: v})} placeholder="https://github.com/..." />
                <ModalInput label="Live Node (URL)" value={form.deployedUrl} onChange={v => setForm({...form, deployedUrl: v})} placeholder="https://..." />
                <ModalInput label="Intelligence Documentation" value={form.docsUrl} onChange={v => setForm({...form, docsUrl: v})} placeholder="Link to spec or docs" />
                <ModalInput label="Media Evidence (YouTube)" value={form.youtubeUrl} onChange={v => setForm({...form, youtubeUrl: v})} placeholder="Demo or tutorial link" />
              </motion.div>
            )}
          </div>

          <div className="flex items-center justify-between mt-12">
            <button
              onClick={() => setStep(s => Math.max(1, s - 1))}
              disabled={step === 1}
              className="px-6 py-3 rounded-2xl bg-[var(--bg-hover)] text-[var(--text-secondary)] font-bold text-xs uppercase tracking-widest hover:bg-[var(--bg-elevated)] disabled:opacity-0 transition-all"
            >
              Back
            </button>
            <button
              onClick={() => step === 3 ? save() : setStep(s => s + 1)}
              className="px-8 py-3 rounded-2xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-blue)] text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-all shadow-lg shadow-blue-500/20"
            >
              {step === 3 ? (projectToEdit ? 'Update Project' : 'Initialize Project') : 'Next Protocol'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Helper Components ──────────────────────────────────
function ModalInput({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-5 py-3 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-cyan)] focus:ring-1 focus:ring-[var(--accent-cyan)]/20 transition-all"
      />
    </div>
  );
}

function ModalSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2 block">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-5 py-3 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-subtle)] text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent-cyan)] transition-all appearance-none cursor-pointer"
        >
          {options.map(o => <option key={o} value={o} className="bg-[var(--bg-primary)]">{o}</option>)}
        </select>
        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)] pointer-events-none" />
      </div>
    </div>
  );
}
