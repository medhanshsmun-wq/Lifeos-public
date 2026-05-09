'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db, type ChatMessage } from '@/lib/db';
import {
  Terminal,
  Send,
  Sparkles,
  Maximize2,
  Minimize2,
  Trash2,
  ChevronRight,
  Loader2,
  Bot,
  User,
  Zap,
  Plus,
  MessageSquare,
  Folder,
  History,
  MoreVertical,
  X,
  ChevronLeft,
  Command,
  Monitor,
  Split,
  Square,
  ChevronDown,
  Edit3
} from 'lucide-react';
import SystemModal from './SystemModal';
import Link from 'next/link';

const SYSTEM_BOOT = [
  '> LifeOS Neural Shell v2.1.0-stable',
  '> Initializing localized inference core...',
  '> Connecting to IndexedDB vector store...',
  '> System status: NOMINAL',
  '',
  'Welcome to the LifeOS Terminal.',
  'Current workspace: /Users/medhansh/lifeos/copilot',
  '',
  'Type /help for command list or start a conversation.',
];

const SUGGESTIONS = [
  'analyze --spending --month',
  'show --productivity --trends',
  'summarize --week',
  'list --inactive-projects',
  'fetch --fitness-metrics',
];

export default function CopilotPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [projects, setAllProjects] = useState<any[]>([]);
  const [linkedProjectId, setLinkedProjectId] = useState<number | undefined>(undefined);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bootComplete, setBootComplete] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [modal, setModal] = useState<{ isOpen: boolean, type: 'alert' | 'confirm' | 'prompt', title: string, message: string, defaultValue?: string, onConfirm: (v?: string) => void } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const searchParams = useSearchParams();

  // Boot sequence
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < SYSTEM_BOOT.length) {
        setBootLines(prev => [...prev, SYSTEM_BOOT[i]]);
        i++;
      } else {
        clearInterval(interval);
        setBootComplete(true);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  // Load initial data
  useEffect(() => {
    const init = async () => {
      const p = await db.projects.toArray();
      setAllProjects(p);
      await loadHistory();
      const chatId = searchParams.get('chat');
      if (chatId) {
        const id = parseInt(chatId);
        if (!isNaN(id)) {
          const chat = await db.conversations.get(id);
          if (chat) {
            setConversationId(id);
            setMessages(chat.messages || []);
            setLinkedProjectId(chat.projectId);
            return;
          }
        }
      }
      startNewChat();
    };
    init();
  }, []);

  const loadHistory = async () => {
    const convs = await db.conversations.orderBy('updatedAt').reverse().toArray();
    setAllConversations(convs);
  };

  const startNewChat = async () => {
    const id = await db.conversations.add({
      title: 'bash',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    setConversationId(id as number);
    setMessages([]);
    setLinkedProjectId(undefined);
    loadHistory();
  };

  const switchChat = async (id: number) => {
    const chat = await db.conversations.get(id);
    if (chat) {
      setConversationId(id);
      setMessages(chat.messages || []);
      setLinkedProjectId(chat.projectId);
    }
  };

  const deleteChat = async (id: number) => {
    // Optimistic UI update
    setAllConversations(prev => prev.filter(c => c.id !== id));
    
    await db.conversations.delete(id);
    if (conversationId === id) {
      await startNewChat();
    } else {
      await loadHistory();
    }
  };

  const renameChat = async (id: number) => {
    const chat = await db.conversations.get(id);
    if (!chat) return;

    setModal({
      isOpen: true,
      type: 'prompt',
      title: 'Rename Terminal',
      message: 'Enter a new label for this neural session:',
      defaultValue: chat.title,
      onConfirm: async (newTitle) => {
        if (newTitle && newTitle.trim()) {
          await db.conversations.update(id, { title: newTitle.trim(), updatedAt: new Date() });
          loadHistory();
        }
        setModal(null);
      }
    });
  };

  const linkProject = async (projectId: number | undefined) => {
    if (conversationId) {
      await db.conversations.update(conversationId, { projectId });
      setLinkedProjectId(projectId);
      loadHistory();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, bootLines]);

  const getContext = useCallback(async () => {
    const [projects, finance, fitness, study, habits, settings] = await Promise.all([
      db.projects.toArray(),
      db.finance.toArray(),
      db.fitness.orderBy('date').reverse().limit(7).toArray(),
      db.study.orderBy('date').reverse().limit(10).toArray(),
      db.habits.toArray(),
      db.settings.toArray(),
    ]);

    const totalExpenses = finance.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0);
    const totalIncome = finance.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0);
    const avgSteps = fitness.length > 0 ? Math.round(fitness.reduce((s, f) => s + f.steps, 0) / fitness.length) : 0;
    const totalStudy = study.reduce((s, ss) => s + ss.duration, 0);
    const githubUser = settings[0]?.githubUsername;
    const githubToken = settings[0]?.githubToken;

    return `
USER CONTEXT (LifeOS Data):
- Projects: ${projects.map(p => `${p.title} (${p.status})`).join(', ')}
- Finance: Balance ₹${(totalIncome - totalExpenses).toLocaleString()}
- Fitness: Avg Steps ${avgSteps}
- GitHub: ${githubUser || 'Not integrated'}

You are the LifeOS Neural Shell. Response must be strictly professional, data-dense, and formatted for a VS Code terminal. Use markdown tables, code blocks, and bold text. If a command looks like a CLI flag (e.g. --spending), interpret it correctly.`;
  }, []);

  const sendMessage = useCallback(async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || loading || (text === undefined && sendingRef.current)) return;

    // Handle internal commands
    if (msgText.startsWith('/rename ') && conversationId) {
      const newTitle = msgText.replace('/rename ', '').trim();
      if (newTitle) {
        await db.conversations.update(conversationId, { title: newTitle, updatedAt: new Date() });
        loadHistory();
        setMessages(prev => [...prev, { role: 'assistant', content: `[SYSTEM] Terminal renamed to: ${newTitle}`, timestamp: new Date() }]);
        setInput('');
        return;
      }
    }

    sendingRef.current = true;

    const userMsg: ChatMessage = { role: 'user', content: msgText, timestamp: new Date() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    
    if (conversationId) {
      await db.conversations.update(conversationId, { messages: newMessages, updatedAt: new Date() });
      loadHistory();
    }
    setInput('');
    setLoading(true);

    try {
      const settings = await db.settings.toArray();
      const apiKey = settings[0]?.geminiApiKey;

      if (!apiKey) {
        const assistantMsg: ChatMessage = {
          role: 'assistant',
          content: 'ERR: GEMINI_API_KEY_NOT_FOUND. Please configure in settings.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setLoading(false);
        return;
      }

      const context = await getContext();
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;
      const body = JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: context }] },
          ...messages.slice(-10).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          { role: 'user', parts: [{ text: msgText }] },
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      });

      const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      
      if (!response.ok) {
        let errorMsg = `ERR: KERNEL_HALT (Status ${response.status})`;
        if (response.status === 429) {
          errorMsg = 'ERR: RATE_LIMIT_EXCEEDED. The Gemini Neural Core is currently rate-limited by Google. Please wait ~15 seconds for the next cycle.';
        }
        setMessages(prev => [...prev, { role: 'assistant', content: errorMsg, timestamp: new Date() }]);
        setLoading(false);
        sendingRef.current = false;
        return;
      }

      const data = await response.json();
      const aiText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (aiText) {
        const assistantMsg: ChatMessage = { role: 'assistant', content: aiText, timestamp: new Date() };
        const finalMessages = [...newMessages, assistantMsg];
        setMessages(finalMessages);
        
        if (conversationId) {
          const conv = await db.conversations.get(conversationId);
          let newTitle = conv?.title || 'bash';

          if (newTitle === 'bash' && finalMessages.length >= 2) {
            try {
              const nameBody = JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: `Give a 1-2 word title for this chat (e.g. node, git, py). User said: ${msgText}` }] }],
                generationConfig: { temperature: 0.5, maxOutputTokens: 10 }
              });
              const nameRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, { method: 'POST', body: nameBody });
              if (nameRes.ok) {
                const nameData = await nameRes.json();
                const suggestedTitle = nameData.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/["*]/g, '').trim().toLowerCase();
                if (suggestedTitle) newTitle = suggestedTitle;
              }
            } catch (e) {}
          }

          await db.conversations.update(conversationId, { messages: finalMessages, title: newTitle, updatedAt: new Date() });
          loadHistory();
        }
      }
    } catch (e) { console.error(e); }
    setLoading(false);
    sendingRef.current = false;
  }, [input, loading, messages, getContext, conversationId]);

  return (
    <div className={`flex min-h-full h-[calc(100vh-64px)] overflow-hidden bg-[#0c0c0c] text-[#cccccc] font-mono ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* VS Code Style Sidebar (Terminal List) */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: 240 }}
            exit={{ width: 0 }}
            className="border-r border-[#2b2b2b] bg-[#181818] flex flex-col z-20 overflow-hidden"
          >
            <div className="p-3 flex items-center justify-between text-[11px] font-bold text-[#858585] uppercase tracking-wider bg-[#252526]">
              <span>Terminal Sessions</span>
              <button onClick={() => setIsSidebarOpen(false)} className="hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-2">
              {allConversations.map(conv => (
                <div
                  key={conv.id}
                  onClick={() => switchChat(conv.id!)}
                  className={`group flex items-center justify-between px-4 py-1.5 cursor-pointer text-[13px] border-l-2 transition-all ${conversationId === conv.id ? 'bg-[#2a2d2e] border-[#007acc] text-[#ffffff]' : 'border-transparent text-[#858585] hover:bg-[#2a2d2e] hover:text-[#cccccc]'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Terminal className={`w-3.5 h-3.5 ${conversationId === conv.id ? 'text-[#007acc]' : 'text-[#858585]'}`} />
                    <span onDoubleClick={() => renameChat(conv.id!)} className="truncate">{conv.title}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); renameChat(conv.id!); }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-[#007acc]"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteChat(conv.id!); }}
                      className="opacity-0 group-hover:opacity-100 p-2 rounded-md hover:bg-red-500/10 text-red-400 transition-all"
                      title="Delete Session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-2 border-t border-[#2b2b2b]">
              <button
                onClick={startNewChat}
                className="w-full py-1.5 rounded bg-[#007acc] hover:bg-[#0062a3] text-white text-[11px] font-bold flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> New Terminal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Terminal Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0c0c0c] relative">
        {/* Terminal Tabs / Toolbar */}
        <div className="flex items-center justify-between h-9 bg-[#1e1e1e] border-b border-[#2b2b2b] px-4">
          <div className="flex items-center gap-4 h-full">
            {!isSidebarOpen && (
              <button onClick={() => setIsSidebarOpen(true)} className="text-[#858585] hover:text-[#cccccc]"><ChevronRight className="w-4 h-4" /></button>
            )}
            <div className="flex items-center gap-2 h-full border-b-2 border-[#007acc] px-2">
              <span className="text-[11px] text-[#ffffff] font-medium uppercase tracking-tight">Terminal</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#858585] hover:text-[#cccccc] cursor-pointer px-2">
              <span>Output</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-[#858585] hover:text-[#cccccc] cursor-pointer px-2">
              <span>Debug Console</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 border-r border-[#2b2b2b] pr-3 mr-1 group relative">
                <Folder className="w-3.5 h-3.5 text-[#858585]" />
                <select 
                  value={linkedProjectId || ''} 
                  onChange={(e) => linkProject(e.target.value ? Number(e.target.value) : undefined)}
                  className="bg-transparent text-[11px] text-[#858585] outline-none hover:text-[#cccccc] cursor-pointer max-w-[120px] truncate appearance-none"
                >
                  <option value="" className="bg-[#1e1e1e]">Link Project...</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id} className="bg-[#1e1e1e]">{p.title}</option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-[#858585] pointer-events-none" />
             </div>

             <div className="flex items-center gap-1 border-r border-[#2b2b2b] pr-3 mr-1">
                <button onClick={startNewChat} className="p-1.5 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded"><Plus className="w-3.5 h-3.5" /></button>
                <button className="p-1.5 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded"><Split className="w-3.5 h-3.5" /></button>
                <button onClick={() => conversationId && deleteChat(conversationId)} className="p-1.5 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded"><Trash2 className="w-3.5 h-3.5" /></button>
             </div>
             <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-1.5 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded">
               {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
             </button>
             <button className="p-1.5 text-[#858585] hover:text-white hover:bg-[#2a2d2e] rounded"><X className="w-3.5 h-3.5" /></button>
          </div>
        </div>

        {/* Console / Output */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar-terminal leading-relaxed selection:bg-[#264f78]">
          {/* Boot Sequence */}
          <div className="mb-6">
            {bootLines.map((line, i) => (
              <div key={i} className={`text-[13px] ${line?.startsWith('>') ? 'text-[#00d4ff]' : 'text-[#858585]'}`}>
                {line || '\u00A0'}
              </div>
            ))}
          </div>

          {/* Chat History */}
          {messages.map((msg, i) => (
            <div key={i} className="mb-6 animate-in fade-in slide-in-from-left-2 duration-200">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#4ec9b0] text-[13px] font-bold">medhansh@lifeos</span>
                <span className="text-[#cccccc] text-[13px]">:</span>
                <span className="text-[#569cd6] text-[13px]">~/copilot</span>
                <span className="text-[#cccccc] text-[13px] font-bold">$</span>
                {msg.role === 'user' && <span className="text-[#dcdcdc] text-[13px]">{msg.content}</span>}
              </div>
              
              {msg.role === 'assistant' && (
                <div className="pl-4 border-l border-[#333333] mt-2 text-[13px] text-[#dcdcdc] prose prose-invert max-w-none prose-p:my-1 prose-pre:bg-[#1e1e1e] prose-pre:border-[#333333]">
                  <div dangerouslySetInnerHTML={{ __html: formatTerminalOutput(msg.content) }} />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-[#858585] text-[13px]">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>executing kernel process...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar - VS Code Terminal Style */}
        <div className="border-t border-[#2b2b2b] bg-[#1e1e1e] p-2 flex items-center gap-3">
          <div className="flex-1 flex items-center gap-2 bg-[#0c0c0c] border border-[#3c3c3c] rounded px-3 py-1.5 focus-within:border-[#007acc] transition-colors group">
             <div className="flex items-center gap-1.5">
                <span className="text-[#4ec9b0] text-[13px] font-bold">medhansh@lifeos</span>
                <span className="text-[#569cd6] text-[13px]">~/copilot$</span>
             </div>
             <input
               ref={inputRef}
               autoFocus
               type="text"
               value={input}
               onChange={(e) => setInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
               className="flex-1 bg-transparent border-none outline-none text-[13px] text-[#dcdcdc] placeholder:text-[#555555]"
               placeholder="..."
             />
             <button onClick={() => sendMessage()} disabled={loading || !input.trim()} className="text-[#858585] hover:text-white disabled:opacity-30">
               <Send className="w-3.5 h-3.5" />
             </button>
          </div>
          
          <div className="flex items-center gap-4 px-2">
             <div className="flex items-center gap-1.5 text-[10px] text-[#858585] uppercase tracking-tighter">
                <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
                <span>3.1_FLASH_LITE</span>
             </div>
             <div className="flex items-center gap-1.5 text-[10px] text-[#858585] uppercase tracking-tighter">
                <Square className="w-2.5 h-2.5" />
                <span>UTF-8</span>
             </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .custom-scrollbar-terminal::-webkit-scrollbar { width: 10px; }
        .custom-scrollbar-terminal::-webkit-scrollbar-track { background: #0c0c0c; }
        .custom-scrollbar-terminal::-webkit-scrollbar-thumb { background: #333333; border-radius: 0; }
        .custom-scrollbar-terminal::-webkit-scrollbar-thumb:hover { background: #444444; }
      `}</style>
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

// Simple helper to format bold and tables for terminal-like display
function formatTerminalOutput(text: string) {
  if (!text) return '';
  // Replace **text** with bold span
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<span class="font-bold text-[#569cd6]">$1</span>');
  // Replace markdown tables (very basic)
  if (formatted.includes('|')) {
    const lines = formatted.split('\n');
    formatted = lines.map(line => {
      if (line.trim().startsWith('|')) {
        return `<div class="grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] border-b border-[#2b2b2b] py-1 text-[#4ec9b0]">${line.split('|').filter(Boolean).map(cell => `<div class="px-2 truncate">${cell.trim()}</div>`).join('')}</div>`;
      }
      return line;
    }).join('\n');
  }
  // Replace newlines with <br/> or wrap in paragraphs
  return formatted.split('\n').map(l => `<p class="mb-1">${l}</p>`).join('');
}
