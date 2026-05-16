'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db, type ChatMessage } from '@/lib/db';
import {
  Send, Sparkles, Maximize2, Minimize2, Trash2,
  Loader2, Plus, X, Edit3, Paperclip,
  Image as ImageIcon, FileText, Minus, Square,
  MessageSquare, Folder, ChevronDown, Zap, Bot, User,
} from 'lucide-react';
import SystemModal from './SystemModal';

const BOOT_LINES = [
  '> J.A.R.V.I.S. Neural Core v3.0',
  '> Establishing neural link...',
  '> Context engine: READY',
  '> System: ONLINE',
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [projects, setAllProjects] = useState<any[]>([]);
  const [linkedProjectId, setLinkedProjectId] = useState<number | undefined>(undefined);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [modal, setModal] = useState<{ isOpen: boolean; type: 'alert' | 'confirm' | 'prompt'; title: string; message: string; defaultValue?: string; onConfirm: (v?: string) => void } | null>(null);
  const [attachments, setAttachments] = useState<{ name: string; type: string; data: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const searchParams = useSearchParams();

  // Boot
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      if (i < BOOT_LINES.length) { setBootLines(p => [...p, BOOT_LINES[i]]); i++; }
      else { clearInterval(iv); setBootComplete(true); }
    }, 60);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const init = async () => {
      setAllProjects(await db.projects.toArray());
      await loadHistory();
      const chatId = searchParams.get('chat');
      if (chatId) {
        const id = parseInt(chatId);
        const chat = !isNaN(id) ? await db.conversations.get(id) : null;
        if (chat) { setConversationId(id); setMessages(chat.messages || []); setLinkedProjectId(chat.projectId); return; }
      }
      startNewChat();
    };
    init();
  }, []);

  const loadHistory = async () => setAllConversations(await db.conversations.orderBy('updatedAt').reverse().toArray());

  const startNewChat = async () => {
    const id = await db.conversations.add({ title: 'New Session', messages: [], createdAt: new Date(), updatedAt: new Date() });
    setConversationId(id as number); setMessages([]); setLinkedProjectId(undefined); loadHistory();
  };

  const switchChat = async (id: number) => {
    const chat = await db.conversations.get(id);
    if (chat) { setConversationId(id); setMessages(chat.messages || []); setLinkedProjectId(chat.projectId); }
  };

  const deleteChat = async (id: number) => {
    setAllConversations(p => p.filter(c => c.id !== id));
    await db.conversations.delete(id);
    conversationId === id ? await startNewChat() : await loadHistory();
  };

  const renameChat = async (id: number) => {
    const chat = await db.conversations.get(id);
    if (!chat) return;
    setModal({
      isOpen: true, type: 'prompt', title: 'Rename Session', message: 'New name:', defaultValue: chat.title,
      onConfirm: async (t) => { if (t?.trim()) { await db.conversations.update(id, { title: t.trim(), updatedAt: new Date() }); loadHistory(); } setModal(null); }
    });
  };

  const linkProject = async (pid: number | undefined) => {
    if (conversationId) { await db.conversations.update(conversationId, { projectId: pid }); setLinkedProjectId(pid); loadHistory(); }
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, bootLines]);

  const getContext = useCallback(async () => {
    const [proj, trades, fitness, study, habits, settings] = await Promise.all([
      db.projects.toArray(), db.trades.toArray(), db.fitness.orderBy('date').reverse().limit(7).toArray(),
      db.study.orderBy('date').reverse().limit(10).toArray(), db.habits.toArray(), db.settings.toArray(),
    ]);
    const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const winRate = trades.length > 0 ? (trades.filter(t => t.pnl > 0).length / trades.length) * 100 : 0;
    const avgSteps = fitness.length > 0 ? Math.round(fitness.reduce((s, f) => s + f.steps, 0) / fitness.length) : 0;
    return `
USER CONTEXT (LifeOS Data):
- Projects: ${proj.map(p => `${p.title} (${p.status})`).join(', ')}
- Day Trading: Total PnL $${totalPnl.toLocaleString()}, Win Rate ${winRate.toFixed(1)}%
- Fitness: Avg Steps ${avgSteps}
- GitHub: ${settings[0]?.githubUsername || 'N/A'}

You are J.A.R.V.I.S., the LifeOS AI assistant. Be professional, data-dense, strategic. Format with markdown. Analyze any images or documents in context.`;
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64Data = (reader.result as string).split(',')[1];
        setAttachments(p => [...p, { name: file.name, type: file.type, data: base64Data }]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = useCallback(async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || loading || (text === undefined && sendingRef.current)) return;

    if (msgText.startsWith('/rename ') && conversationId) {
      const t = msgText.replace('/rename ', '').trim();
      if (t) { await db.conversations.update(conversationId, { title: t, updatedAt: new Date() }); loadHistory(); setMessages(p => [...p, { role: 'assistant', content: `Session renamed to: ${t}`, timestamp: new Date() }]); setInput(''); return; }
    }

    sendingRef.current = true;
    const userMsg: ChatMessage = { role: 'user', content: msgText, timestamp: new Date(), attachments: attachments.length > 0 ? [...attachments] : undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    if (conversationId) { await db.conversations.update(conversationId, { messages: newMessages, updatedAt: new Date() }); loadHistory(); }
    setInput(''); setLoading(true);

    try {
      const settings = await db.settings.toArray();
      const apiKey = settings[0]?.geminiApiKey;
      if (!apiKey) { setMessages(p => [...p, { role: 'assistant', content: '⚠️ API key not configured. Go to Settings → Gemini API Key.', timestamp: new Date() }]); setLoading(false); return; }

      const context = await getContext();
      const userParts: any[] = [{ text: msgText }];
      attachments.forEach(att => userParts.push({ inline_data: { mime_type: att.type, data: att.data } }));

      const body = JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: context }] },
          ...messages.slice(-10).map(m => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
          { role: 'user', parts: userParts },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      });
      setAttachments([]);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

      if (!response.ok) {
        const err = response.status === 429 ? '⚠️ Rate limited. Wait ~15s and try again.' : `⚠️ Error ${response.status}`;
        setMessages(p => [...p, { role: 'assistant', content: err, timestamp: new Date() }]); setLoading(false); sendingRef.current = false; return;
      }

      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (aiText) {
        const assistantMsg: ChatMessage = { role: 'assistant', content: aiText, timestamp: new Date() };
        const final = [...newMessages, assistantMsg];
        setMessages(final);
        if (conversationId) {
          let title = (await db.conversations.get(conversationId))?.title || 'New Session';
          if (title === 'New Session' && final.length >= 2) {
            try {
              const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
                method: 'POST', body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Give a 2-3 word title for: ${msgText}` }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 10 } })
              });
              if (r.ok) { const d = await r.json(); const t = d.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/[\"*]/g, '').trim(); if (t) title = t; }
            } catch { }
          }
          await db.conversations.update(conversationId, { messages: final, title, updatedAt: new Date() });
          loadHistory();
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false); sendingRef.current = false;
  }, [input, loading, messages, getContext, conversationId, attachments]);

  return (
    <div className={`flex h-full overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50 bg-[var(--bg-0)]' : ''}`}>
      {/* Session sidebar */}
      <div className="w-[220px] flex-shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-1)]/50 backdrop-blur-sm">
        <div className="p-3 border-b border-[var(--border)]">
          <button onClick={startNewChat} className="w-full py-2 px-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[var(--accent)]/15 transition-all">
            <Plus className="w-3.5 h-3.5" /> New Session
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {allConversations.map(conv => (
            <div key={conv.id} onClick={() => switchChat(conv.id!)}
              className={`group flex items-center justify-between px-3 py-2 mx-1.5 rounded-lg cursor-pointer text-[12px] transition-all ${conversationId === conv.id ? 'bg-white/[.06] text-[var(--text-0)]' : 'text-[var(--text-2)] hover:bg-white/[.03] hover:text-[var(--text-1)]'
                }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <MessageSquare className="w-3 h-3 flex-shrink-0" style={conversationId === conv.id ? { color: 'var(--accent)' } : {}} />
                <span className="truncate">{conv.title}</span>
              </div>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <button onClick={e => { e.stopPropagation(); renameChat(conv.id!); }} className="p-1 hover:text-[var(--accent)]"><Edit3 className="w-2.5 h-2.5" /></button>
                <button onClick={e => { e.stopPropagation(); deleteChat(conv.id!); }} className="p-1 hover:text-[var(--red)]"><Trash2 className="w-2.5 h-2.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Chat */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* macOS Title Bar */}
        <div className="flex items-center justify-between h-10 px-4 border-b border-[var(--border)] bg-[var(--bg-1)]/30 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-90 cursor-pointer" />
              <div className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-90 cursor-pointer" onClick={() => setIsFullscreen(false)} />
              <div className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-90 cursor-pointer" onClick={() => setIsFullscreen(!isFullscreen)} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <Zap className="w-3 h-3 text-[var(--accent)]" />
            <span className="font-mono text-[var(--text-2)]">J.A.R.V.I.S.</span>
            <span className="text-[var(--text-3)]">—</span>
            <span className="text-[var(--text-2)]">{allConversations.find(c => c.id === conversationId)?.title || 'Neural Session'}</span>
          </div>
          <div className="flex items-center gap-2">
            <select value={linkedProjectId || ''} onChange={e => linkProject(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-transparent text-[10px] text-[var(--text-2)] outline-none cursor-pointer font-mono"
            >
              <option value="" className="bg-[var(--bg-1)]">No Project</option>
              {projects.map(p => <option key={p.id} value={p.id} className="bg-[var(--bg-1)]">{p.title}</option>)}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {/* Boot */}
          {bootLines.filter(Boolean).map((line, i) => (
            <motion.div key={`boot-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}
              className={`text-[12px] font-mono ${line?.startsWith('>') ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}
            >{line}</motion.div>
          ))}
          {bootComplete && messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-2)]/20 flex items-center justify-center mb-4 border border-[var(--accent)]/10">
                <Bot className="w-8 h-8 text-[var(--accent)]" />
              </div>
              <h2 className="text-lg font-semibold gradient-text mb-1">J.A.R.V.I.S.</h2>
              <p className="text-xs text-[var(--text-2)] mb-6 max-w-sm">Your AI neural assistant. Ask anything about your projects, trading, fitness, or let me analyze documents.</p>
              <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                {['Analyze my trading performance', 'Show productivity trends', 'Summarize this week', 'What should I focus on?'].map(s => (
                  <button key={s} onClick={() => sendMessage(s)}
                    className="px-3 py-1.5 rounded-lg text-[11px] text-[var(--text-1)] bg-white/[.03] border border-[var(--border)] hover:bg-white/[.06] hover:border-[var(--accent)]/20 transition-all"
                  >{s}</button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Chat messages */}
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-2)]/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--accent)]/10">
                  <Bot className="w-3.5 h-3.5 text-[var(--accent)]" />
                </div>
              )}
              <div className={`max-w-[75%] ${msg.role === 'user'
                  ? 'bg-[var(--accent)]/10 border border-[var(--accent)]/15 rounded-2xl rounded-br-md px-4 py-2.5'
                  : 'bg-white/[.03] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3'
                }`}>
                {msg.attachments?.map((att, j) => (
                  <div key={j} className="mb-2">
                    {att.type.startsWith('image/') ? (
                      <img src={`data:${att.type};base64,${att.data}`} alt={att.name} className="max-w-[200px] rounded-lg" />
                    ) : (
                      <div className="flex items-center gap-2 text-[11px] text-[var(--accent)]"><FileText className="w-3 h-3" />{att.name}</div>
                    )}
                  </div>
                ))}
                <div className={`text-[13px] leading-relaxed ${msg.role === 'user' ? 'text-[var(--text-0)]' : 'text-[var(--text-1)]'}`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-1 prose-pre:bg-[var(--bg-2)] prose-pre:border prose-pre:border-[var(--border)] prose-pre:rounded-lg prose-code:text-[var(--accent)] prose-headings:gradient-text"
                      dangerouslySetInnerHTML={{ __html: formatOutput(msg.content) }}
                    />
                  ) : msg.content}
                </div>
                <div className="text-[9px] text-[var(--text-3)] mt-1.5 font-mono">
                  {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-[var(--accent-2)]/15 flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--accent-2)]/10">
                  <User className="w-3.5 h-3.5 text-[var(--accent-2)]" />
                </div>
              )}
            </motion.div>
          ))}

          {loading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-2)]/20 flex items-center justify-center flex-shrink-0 border border-[var(--accent)]/10">
                <Sparkles className="w-3.5 h-3.5 text-[var(--accent)] animate-pulse" />
              </div>
              <div className="bg-white/[.03] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-[var(--text-2)]">
                  <Loader2 className="w-3 h-3 animate-spin text-[var(--accent)]" />
                  <span className="font-mono">Processing neural query...</span>
                </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-[var(--border)] bg-[var(--bg-1)]/30 backdrop-blur-xl p-3 flex-shrink-0">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/[.03] border border-[var(--border)] rounded-lg px-2.5 py-1 text-[11px]">
                  {att.type.startsWith('image/') ? <ImageIcon className="w-3 h-3 text-[var(--accent)]" /> : <FileText className="w-3 h-3 text-[var(--accent-2)]" />}
                  <span className="max-w-[80px] truncate text-[var(--text-1)]">{att.name}</span>
                  <button onClick={() => setAttachments(p => p.filter((_, j) => j !== i))} className="text-[var(--text-3)] hover:text-[var(--red)]"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 bg-white/[.03] border border-[var(--border)] rounded-xl px-4 py-2.5 focus-within:border-[var(--accent)]/30 transition-all">
              <input ref={inputRef} autoFocus type="text" value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text-0)] placeholder:text-[var(--text-3)]"
                placeholder="Ask J.A.R.V.I.S. anything..."
              />
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" multiple accept="image/*,application/pdf" />
              <button onClick={() => fileInputRef.current?.click()} className="p-1 text-[var(--text-3)] hover:text-[var(--accent)] transition-colors"><Paperclip className="w-4 h-4" /></button>
            </div>
            <button onClick={() => sendMessage()} disabled={loading || (!input.trim() && attachments.length === 0)}
              className="p-2.5 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] hover:bg-[var(--accent)]/20 disabled:opacity-30 transition-all"
            ><Send className="w-4 h-4" /></button>
          </div>
          <div className="flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-1.5 text-[9px] text-[var(--text-3)] font-mono">
              <span className="dot dot-active" style={{ width: 5, height: 5 }} />
              Gemini 3.1 Flash
            </div>
            <span className="text-[9px] text-[var(--text-3)] font-mono">{messages.length} messages</span>
          </div>
        </div>
      </div>

      <SystemModal
        isOpen={!!modal?.isOpen} type={modal?.type || 'alert'} title={modal?.title || ''}
        message={modal?.message || ''} defaultValue={modal?.defaultValue}
        onConfirm={modal?.onConfirm || (() => { })} onCancel={() => setModal(null)}
      />
    </div>
  );
}

function formatOutput(text: string) {
  if (!text) return '';
  let f = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-[var(--accent)]">$1</strong>');
  f = f.replace(/`([^`]+)`/g, '<code class="bg-white/5 px-1.5 py-0.5 rounded text-[var(--accent)] text-[12px] font-mono">$1</code>');
  if (f.includes('|')) {
    const lines = f.split('\n');
    f = lines.map(line => {
      if (line.trim().startsWith('|') && !line.match(/^\|[\s-|]+\|$/)) {
        return `<div class="flex border-b border-[var(--border)] py-1">${line.split('|').filter(Boolean).map(cell => `<div class="flex-1 px-2 text-[12px]">${cell.trim()}</div>`).join('')}</div>`;
      }
      if (line.match(/^\|[\s-|]+\|$/)) return '';
      return line;
    }).join('\n');
  }
  return f.split('\n').map(l => `<p class="mb-1">${l}</p>`).join('');
}
