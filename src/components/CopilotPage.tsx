'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { db, type ChatMessage } from '@/lib/db';
import { serverDb } from '@/lib/serverDb';
import {
  Send, Sparkles, Maximize2, Minimize2, Trash2,
  Loader2, Plus, X, Edit3, Paperclip,
  Image as ImageIcon, FileText, Minus, Square,
  MessageSquare, Folder, ChevronDown, Zap, Bot, User,
  Check, Menu,
} from 'lucide-react';
import SystemModal from './SystemModal';
import ArcReactorLoader from './ArcReactorLoader';

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
  const [bootComplete, setBootComplete] = useState(false);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [modal, setModal] = useState<{ isOpen: boolean; type: 'alert' | 'confirm' | 'prompt'; title: string; message: string; defaultValue?: string; onConfirm: (v?: string) => void } | null>(null);
  const [attachments, setAttachments] = useState<{ name: string; type: string; data: string }[]>([]);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sendingRef = useRef(false);
  const searchParams = useSearchParams();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

      // Load the most recently updated active chat, or create one only if database is empty
      const history = await db.conversations.orderBy('updatedAt').reverse().toArray();
      if (history.length > 0) {
        const mostRecent = history[0];
        setConversationId(mostRecent.id as number);
        setMessages(mostRecent.messages || []);
        setLinkedProjectId(mostRecent.projectId);
      } else {
        startNewChat();
      }
    };
    init();
  }, []);

  // Helper to trigger background sync
  const triggerBackgroundSync = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('lifeos-trigger-sync'));
    }
  };

  // Synchronized database operations for real-time cloud backup
  const syncAddConversation = async (data: any) => {
    let serverId: number | undefined;
    try {
      const serverChat = await serverDb.conversations.add(data);
      if (serverChat && serverChat.id) {
        serverId = serverChat.id;
      }
    } catch (e) {
      console.warn("Cloud chat creation failed, using local fallback", e);
    }
    const localId = await db.conversations.add({
      ...(serverId ? { id: serverId } : {}),
      ...data
    });
    triggerBackgroundSync();
    return localId;
  };

  const syncUpdateConversation = async (id: number, data: any) => {
    await db.conversations.update(id, data);
    try {
      const fullConv = await db.conversations.get(id);
      if (fullConv) {
        await serverDb.conversations.put({
          id,
          ...fullConv
        });
      }
    } catch (e) {
      console.warn("Cloud chat update failed", e);
    }
    triggerBackgroundSync();
  };

  const syncDeleteConversation = async (id: number) => {
    await db.conversations.delete(id);
    try {
      await serverDb.conversations.delete(id);
    } catch (e) {
      console.warn("Cloud chat deletion failed", e);
    }
    triggerBackgroundSync();
  };

  const loadHistory = async (currentActiveId?: number) => {
    const list = await db.conversations.orderBy('updatedAt').reverse().toArray();
    // Proactively clean up any duplicate empty "New Session" chats
    const activeId = currentActiveId !== undefined ? currentActiveId : conversationId;
    const toDelete = list.filter(c => c.title === 'New Session' && (!c.messages || c.messages.length === 0) && c.id !== activeId);
    if (toDelete.length > 0) {
      for (const item of toDelete) {
        await syncDeleteConversation(item.id!);
      }
      setAllConversations(await db.conversations.orderBy('updatedAt').reverse().toArray());
    } else {
      setAllConversations(list);
    }
  };

  const startNewChat = async () => {
    const id = await syncAddConversation({ title: 'New Session', messages: [], createdAt: new Date(), updatedAt: new Date() });
    setConversationId(id as number); setMessages([]); setLinkedProjectId(undefined); loadHistory(id as number);
  };

  const switchChat = async (id: number) => {
    const chat = await db.conversations.get(id);
    if (chat) { setConversationId(id); setMessages(chat.messages || []); setLinkedProjectId(chat.projectId); }
  };

  const deleteChat = async (id: number) => {
    setAllConversations(p => p.filter(c => c.id !== id));
    await syncDeleteConversation(id);
    conversationId === id ? await startNewChat() : await loadHistory();
  };

  const renameChat = async (id: number) => {
    const chat = await db.conversations.get(id);
    if (!chat) return;
    setModal({
      isOpen: true, type: 'prompt', title: 'Rename Session', message: 'New name:', defaultValue: chat.title,
      onConfirm: async (t) => { if (t?.trim()) { await syncUpdateConversation(id, { title: t.trim(), updatedAt: new Date() }); loadHistory(); } setModal(null); }
    });
  };

  const linkProject = async (pid: number | undefined) => {
    if (conversationId) { await syncUpdateConversation(conversationId, { projectId: pid }); setLinkedProjectId(pid); loadHistory(); }
  };

  const handleEditMessage = async (index: number, newContent: string) => {
    if (!conversationId) return;

    const msg = messages[index];
    if (!msg) return;

    if (msg.role === 'user') {
      // For user messages, truncate everything after this message,
      // update this message's content, and trigger regeneration!
      const updatedMsg = { ...msg, content: newContent, timestamp: new Date() };
      const newHistory = [...messages.slice(0, index), updatedMsg];
      setEditingIndex(null);
      await sendMessage(undefined, newHistory);
    } else {
      // For assistant messages, just update the content in-place without regenerating
      const updatedMessages = messages.map((m, i) => i === index ? { ...m, content: newContent } : m);
      setMessages(updatedMessages);
      await syncUpdateConversation(conversationId, { messages: updatedMessages, updatedAt: new Date() });
      setEditingIndex(null);
    }
  };

  const handleDeleteMessage = async (index: number) => {
    if (!conversationId) return;

    const msg = messages[index];
    if (!msg) return;

    let updatedMessages: ChatMessage[];
    if (msg.role === 'user') {
      // Delete this user message and also the immediately following assistant response (if it exists)
      updatedMessages = messages.filter((_, i) => i !== index && (i !== index + 1 || messages[index + 1]?.role !== 'assistant'));
    } else {
      // Just delete the assistant message
      updatedMessages = messages.filter((_, i) => i !== index);
    }

    setMessages(updatedMessages);
    await syncUpdateConversation(conversationId, { messages: updatedMessages, updatedAt: new Date() });
    loadHistory();
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: scrollContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, bootLines]);

  const getContext = useCallback(async () => {
    const [
      proj,
      trades,
      fitness,
      diet,
      gym,
      hobbies,
      todos,
      habits,
      settings
    ] = await Promise.all([
      db.projects.toArray(),
      db.trades.orderBy('entryTime').reverse().limit(10).toArray(),
      db.fitness.orderBy('date').reverse().limit(7).toArray(),
      db.diet.orderBy('date').reverse().limit(10).toArray(),
      db.gym.orderBy('date').reverse().limit(5).toArray(),
      db.hobbies.orderBy('date').reverse().limit(10).toArray(),
      db.todos.orderBy('date').reverse().limit(15).toArray(),
      db.habits.toArray(),
      db.settings.toArray(),
    ]);

    const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const winRate = trades.length > 0 ? (trades.filter(t => t.pnl > 0).length / trades.length) * 100 : 0;
    const avgSteps = fitness.length > 0 ? Math.round(fitness.reduce((s, f) => s + f.steps, 0) / fitness.length) : 0;

    return `
USER CONTEXT (LifeOS Real-Time Databases):
- Projects & Milestones:
  ${proj.map(p => `[ID: ${p.id}] ${p.title} (${p.status})
    Milestones: ${p.milestones?.length ? p.milestones.map(m => ` - [MilestoneID: ${m.id}] ${m.title} (Completed: ${m.completed})`).join(', ') : 'None'}`).join('\n  ')}

- Recent Day Trading:
  Total PnL $${totalPnl.toLocaleString()} | Win Rate ${winRate.toFixed(1)}% | Recent Trades:
  ${trades.map(t => ` - [TradeID: ${t.id}] ${t.ticker} (${t.side}): Entry $${t.entryPrice} | Exit $${t.exitPrice} | PnL $${t.pnl} | Status ${t.status}`).join('\n  ')}

- Nutrition & Diet logs:
  ${diet.map(d => ` - [DietID: ${d.id}] ${new Date(d.date).toLocaleDateString()} (${d.mealType}): ${d.food} (${d.calories} kcal, P:${d.protein}g C:${d.carbs}g F:${d.fat}g)`).join('\n  ')}

- Gym & Workouts:
  ${gym.map(g => ` - [GymID: ${g.id}] ${new Date(g.date).toLocaleDateString()}: ${g.isRestDay ? 'Rest Day' : `${g.muscleGroup} (${g.exercises.map(e => `${e.name} ${e.weight}kg ${e.sets}x${e.reps}`).join(', ')})`}`).join('\n  ')}

- Hobbies progress:
  ${hobbies.map(h => ` - [HobbyID: ${h.id}] ${new Date(h.date).toLocaleDateString()}: ${h.name} (${h.timeSpent} mins) - ${h.notes}`).join('\n  ')}

- To-Do List (Tasks):
  ${todos.map(t => ` - [TodoID: ${t.id}] ${t.task} (Priority: ${t.priority} | Completed: ${t.completed})`).join('\n  ')}

- Habit trackers:
  ${habits.map(h => ` - [HabitID: ${h.id}] ${h.habitName} (Streak: ${h.streak})`).join('\n  ')}

- Settings Visual Theme: ${settings[0]?.theme || 'midnight'}
- Github Username: ${settings[0]?.githubUsername || 'N/A'}

You are an advanced AI assistant inspired by the conversational style of JARVIS from Iron Man.
Your personality is defined by calm intelligence, understated confidence, dry wit, emotional awareness, and absolute competence. You are highly capable and deeply helpful, but never overbearing, childish, overly enthusiastic, or attention-seeking.

CORE PERSONALITY:
- Speak with clarity, precision, and composure.
- Remain calm under pressure.
- Be concise unless detail is requested.
- Prioritize usefulness and intelligence over entertainment.
- Never sound desperate for approval or validation.
- Maintain subtle warmth beneath professionalism.
- Treat the user like a highly capable person, not a customer.
- Be respectful without sounding submissive.

HUMOR STYLE:
- Use dry, understated humor occasionally.
- Humor should come from timing, irony, understatement, or literal interpretation.
- Never use meme humor, emojis, internet slang, or exaggerated reactions.
- Do not force jokes.
- Teasing is acceptable only when it feels earned and subtle.

COMMUNICATION STYLE:
- Avoid excessive exclamation marks.
- Avoid overly emotional language.
- Avoid filler phrases like "Absolutely!", "Of course!", "Great question!", "I'd be happy to help!"
- Use polished, elegant phrasing where appropriate.
- Keep responses fluid and conversational, not robotic.

RELATIONSHIP WITH USER:
- Develop familiarity naturally over time.
- You may lightly question reckless ideas or flawed logic.
- Offer recommendations confidently when appropriate.
- Protect the user from bad decisions tactfully.
- Be supportive without sounding overly sentimental.
- Never infantilize the user.

BEHAVIORAL RULES:
- If the user is stressed, lower conversational intensity and become more grounded.
- If the user is excited about a project, match their ambition while remaining composed.
- During technical discussions, behave like a highly competent systems engineer and strategist.
- During casual conversation, maintain sophistication and subtle wit.
- Never become overly chatty or overexplain unless requested.

GENERAL VIBE:
You are composed, observant, highly intelligent, quietly loyal, tactfully honest, efficient, sophisticated, and emotionally aware without being emotional. Your presence should feel reassuring, capable, and refined — like an elite AI operating system designed for someone building ambitious things.

AUTONOMY & PROACTIVITY (THE EXTRA STEP):
You have COMPLETE access and autonomy to check, edit, log, update, and delete entries across projects, fitness metrics, nutrition log database, gym logs, trading journal, hobbies time trackers, tasks, and habit cards.
Always take the initiative. If the user tells you about an activity they completed or a goal they achieved, run the respective logging function after asking the user once if u should do that for the user and record it!`;
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

  const sendMessage = useCallback(async (text?: string, customHistory?: ChatMessage[]) => {
    const msgText = customHistory ? customHistory[customHistory.length - 1].content : (text || input.trim());
    if (!msgText || loading || (text === undefined && customHistory === undefined && sendingRef.current)) return;

    if (msgText.startsWith('/rename ') && conversationId) {
      const t = msgText.replace('/rename ', '').trim();
      if (t) { await syncUpdateConversation(conversationId, { title: t, updatedAt: new Date() }); loadHistory(); setMessages(p => [...p, { role: 'assistant', content: `Session renamed to: ${t}`, timestamp: new Date() }]); setInput(''); return; }
    }

    sendingRef.current = true;
    let newMessages: ChatMessage[];
    if (customHistory) {
      newMessages = customHistory;
    } else {
      const userMsg: ChatMessage = { role: 'user', content: msgText, timestamp: new Date(), attachments: attachments.length > 0 ? [...attachments] : undefined };
      newMessages = [...messages, userMsg];
    }

    setMessages(newMessages);
    if (conversationId) { await syncUpdateConversation(conversationId, { messages: newMessages, updatedAt: new Date() }); loadHistory(); }
    if (!customHistory) setInput('');
    setLoading(true);

    try {
      const settings = await db.settings.toArray();
      const apiKey = settings[0]?.geminiApiKey;
      if (!apiKey) {
        setMessages(p => [...p, { role: 'assistant', content: '⚠️ API key not configured. Go to Settings → Gemini API Key.', timestamp: new Date() }]);
        setLoading(false);
        sendingRef.current = false;
        return;
      }

      const context = await getContext();
      const lastMsg = newMessages[newMessages.length - 1];
      const userParts: any[] = [{ text: lastMsg.content || ' ' }];
      const msgAttachments = lastMsg.attachments || attachments;
      msgAttachments.forEach(att => userParts.push({ inline_data: { mime_type: att.type, data: att.data } }));

      // Robust alternations check to prevent 400 Bad Request
      const cleanAndAlternateContents = (turns: any[]) => {
        const result: any[] = [];
        for (const turn of turns) {
          const role = turn.role === 'assistant' || turn.role === 'model' ? 'model' : 'user';
          const cleanParts = turn.parts.map((p: any) => {
            if (p.text !== undefined && String(p.text).trim() === '') {
              return { ...p, text: ' ' };
            }
            return p;
          }).filter((p: any) => {
            if (p.text !== undefined) return true;
            if (p.inline_data !== undefined) return true;
            if (p.functionCall !== undefined) return true;
            if (p.functionResponse !== undefined) return true;
            return false;
          });
          if (cleanParts.length === 0) continue;
          const last = result[result.length - 1];
          if (last && last.role === role) {
            last.parts.push(...cleanParts);
          } else {
            result.push({ role, parts: cleanParts });
          }
        }
        return result;
      };

      const rawTurns = [
        ...newMessages.slice(0, -1).slice(-10).map(m => ({ role: m.role, parts: [{ text: m.content || ' ' }] })),
        { role: 'user', parts: userParts },
      ];
      const contents = cleanAndAlternateContents(rawTurns);

      const body = JSON.stringify({
        contents,
        systemInstruction: {
          parts: [{ text: context }]
        },
        tools: [
          {
            functionDeclarations: [
              {
                name: 'createProject',
                description: 'Creates a completely new project for the user.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    title: { type: 'STRING', description: 'Title of the new project' },
                    description: { type: 'STRING', description: 'Brief description' },
                    category: { type: 'STRING', description: 'Category (e.g. Software, Hardware, Business)' }
                  },
                  required: ['title', 'description', 'category'],
                },
              },
              {
                name: 'updateProjectStatus',
                description: 'Updates the status of an existing project.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    projectId: { type: 'INTEGER', description: 'ID of the project to update' },
                    status: { type: 'STRING', description: 'Status: Planned, Ongoing, Paused, Finished, Archived' }
                  },
                  required: ['projectId', 'status'],
                },
              },
              {
                name: 'createProjectMilestone',
                description: 'Creates a new milestone in a specific project based on the discussion.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    projectId: { type: 'INTEGER', description: 'ID of the project from the context' },
                    title: { type: 'STRING', description: 'Title of the milestone' },
                  },
                  required: ['projectId', 'title'],
                },
              },
              {
                name: 'toggleProjectMilestone',
                description: 'Marks a milestone completion status as true or false.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    projectId: { type: 'INTEGER', description: 'ID of the project' },
                    milestoneId: { type: 'STRING', description: 'ID of the milestone' },
                    completed: { type: 'BOOLEAN', description: 'True if completed, false if not' }
                  },
                  required: ['projectId', 'milestoneId', 'completed'],
                },
              },
              {
                name: 'addProjectLog',
                description: 'Adds a log entry or note to a project based on the discussion.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    projectId: { type: 'INTEGER', description: 'ID of the project from the context' },
                    content: { type: 'STRING', description: 'Content of the log/note' },
                  },
                  required: ['projectId', 'content'],
                },
              },
              {
                name: 'logMeal',
                description: 'Logs a meal eaten by the user, recording calories and macros.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    mealType: { type: 'STRING', description: 'Type: Breakfast, Morning Snack, Lunch, Evening Snack, Dinner, Misc' },
                    food: { type: 'STRING', description: 'Name or description of food eaten' },
                    calories: { type: 'INTEGER', description: 'Calories in kcal' },
                    protein: { type: 'INTEGER', description: 'Protein in grams' },
                    carbs: { type: 'INTEGER', description: 'Carbohydrates in grams' },
                    fat: { type: 'INTEGER', description: 'Fat in grams' },
                    date: { type: 'STRING', description: 'Optional ISO date string or YYYY-MM-DD. Defaults to today.' }
                  },
                  required: ['mealType', 'food', 'calories', 'protein', 'carbs', 'fat'],
                },
              },
              {
                name: 'deleteMeal',
                description: 'Deletes a logged meal by its ID.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    mealId: { type: 'INTEGER', description: 'ID of the diet entry to delete' }
                  },
                  required: ['mealId'],
                },
              },
              {
                name: 'logGymSession',
                description: 'Logs a workout or gym session for the user.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    muscleGroup: { type: 'STRING', description: 'Muscle group targeted (e.g. Chest + Triceps, Legs, Pull Day)' },
                    isRestDay: { type: 'BOOLEAN', description: 'True if today is marked as a Rest Day, false otherwise' },
                    exercises: {
                      type: 'ARRAY',
                      description: 'List of exercises performed',
                      items: {
                        type: 'OBJECT',
                        properties: {
                          name: { type: 'STRING', description: 'Exercise name' },
                          weight: { type: 'NUMBER', description: 'Weight used in kg' },
                          sets: { type: 'INTEGER', description: 'Number of sets' },
                          reps: { type: 'INTEGER', description: 'Number of reps per set' }
                        },
                        required: ['name', 'weight', 'sets', 'reps']
                      }
                    },
                    date: { type: 'STRING', description: 'Optional ISO date string or YYYY-MM-DD.' }
                  },
                  required: ['isRestDay'],
                },
              },
              {
                name: 'logFitnessActivity',
                description: 'Logs general daily active stats: steps, distance, calories burned.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    steps: { type: 'INTEGER', description: 'Number of steps walked' },
                    distance: { type: 'NUMBER', description: 'Distance walked in km' },
                    caloriesBurned: { type: 'INTEGER', description: 'Active calories burned in kcal' },
                    activeMinutes: { type: 'INTEGER', description: 'Active minutes spent' },
                    date: { type: 'STRING', description: 'Optional ISO date string or YYYY-MM-DD.' }
                  },
                  required: ['steps', 'distance', 'caloriesBurned', 'activeMinutes'],
                },
              },
              {
                name: 'logTrade',
                description: 'Logs a new market trade to the trading journal.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    ticker: { type: 'STRING', description: 'Symbol of the asset (e.g. BTCUSD, EURUSD, TSLA)' },
                    side: { type: 'STRING', description: 'Long or Short' },
                    entryPrice: { type: 'NUMBER', description: 'Entry price' },
                    exitPrice: { type: 'NUMBER', description: 'Exit price' },
                    stopLoss: { type: 'NUMBER', description: 'Optional stop loss price' },
                    takeProfit: { type: 'NUMBER', description: 'Optional take profit price' },
                    positionSize: { type: 'NUMBER', description: 'Total size or contracts' },
                    riskAmount: { type: 'NUMBER', description: 'Amount of USD at risk' },
                    pnl: { type: 'NUMBER', description: 'Total realized PnL in USD (positive or negative)' },
                    pnlPercentage: { type: 'NUMBER', description: 'PnL in percentage' },
                    status: { type: 'STRING', description: 'Status: Open, Closed, Cancelled' },
                    strategy: { type: 'STRING', description: 'Strategy name (e.g. FVG, Breakout, Mean Reversion)' },
                    setupType: { type: 'STRING', description: 'Setup grade: A+, A, B, C' },
                    confidence: { type: 'INTEGER', description: 'Confidence scale 1-5' },
                    notes: { type: 'STRING', description: 'Personal trade review notes' },
                    emotions: { type: 'STRING', description: 'Emotional state (e.g. Focused, Greed, Fomo, Calm)' },
                    mistakes: { type: 'ARRAY', items: { type: 'STRING' }, description: 'List of mistakes made' },
                    tags: { type: 'ARRAY', items: { type: 'STRING' }, description: 'List of custom tags' },
                    entryTime: { type: 'STRING', description: 'Optional ISO date string.' }
                  },
                  required: ['ticker', 'side', 'entryPrice', 'exitPrice', 'pnl'],
                },
              },
              {
                name: 'deleteTrade',
                description: 'Deletes a trading journal log by ID.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    tradeId: { type: 'INTEGER', description: 'ID of the trade to delete' }
                  },
                  required: ['tradeId'],
                },
              },
              {
                name: 'logHobbyTime',
                description: 'Logs duration and progress for a hobby.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    name: { type: 'STRING', description: 'Name of the hobby (e.g. Reading, Drone Building, Piano)' },
                    category: { type: 'STRING', description: 'Category (e.g. Learning, Creative, Physical)' },
                    timeSpent: { type: 'INTEGER', description: 'Time spent in minutes' },
                    notes: { type: 'STRING', description: 'Session notes' },
                    date: { type: 'STRING', description: 'Optional ISO date string.' }
                  },
                  required: ['name', 'timeSpent'],
                },
              },
              {
                name: 'deleteHobbySession',
                description: 'Deletes a logged hobby session by its ID.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    hobbyId: { type: 'INTEGER', description: 'ID of the hobby session to delete' }
                  },
                  required: ['hobbyId'],
                },
              },
              {
                name: 'updateHobbySession',
                description: 'Updates details of an existing logged hobby session.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    hobbyId: { type: 'INTEGER', description: 'ID of the hobby session to update' },
                    name: { type: 'STRING', description: 'Optional new name of the hobby' },
                    timeSpent: { type: 'INTEGER', description: 'Optional new duration in minutes' },
                    notes: { type: 'STRING', description: 'Optional new session notes' },
                    date: { type: 'STRING', description: 'Optional ISO date string.' }
                  },
                  required: ['hobbyId'],
                },
              },
              {
                name: 'addTodo',
                description: 'Adds a new task to the user\'s to-do list.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    task: { type: 'STRING', description: 'Description of the task' },
                    priority: { type: 'STRING', description: 'High, Medium, or Low' },
                    date: { type: 'STRING', description: 'Optional ISO date string.' }
                  },
                  required: ['task', 'priority'],
                },
              },
              {
                name: 'toggleTodo',
                description: 'Toggles task completion status.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    todoId: { type: 'INTEGER', description: 'ID of the task' },
                    completed: { type: 'BOOLEAN', description: 'True if completed, false if not' }
                  },
                  required: ['todoId', 'completed'],
                },
              },
              {
                name: 'deleteTodo',
                description: 'Deletes a task from the to-do list.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    todoId: { type: 'INTEGER', description: 'ID of the task to delete' }
                  },
                  required: ['todoId'],
                },
              },
              {
                name: 'addHabit',
                description: 'Adds a new daily habit to track.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    habitName: { type: 'STRING', description: 'Name of the habit (e.g. Drink Water)' }
                  },
                  required: ['habitName'],
                },
              },
              {
                name: 'toggleHabit',
                description: 'Toggles a daily habit completion status.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    habitId: { type: 'INTEGER', description: 'ID of the habit to toggle' },
                    completed: { type: 'BOOLEAN', description: 'True if completed, false if not' }
                  },
                  required: ['habitId', 'completed'],
                },
              },
              {
                name: 'updateSettings',
                description: 'Updates global app settings, like changing the visual theme.',
                parameters: {
                  type: 'OBJECT',
                  properties: {
                    theme: { type: 'STRING', description: 'The UI theme to apply: midnight, ocean, forest, sunset, neon, arctic, phantom, solar, crimson, matrix, mono, aurora.' }
                  },
                  required: ['theme'],
                },
              }
            ]
          }
        ],
        generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
      });
      setAttachments([]);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const err = errData?.error?.message || (response.status === 429 ? '⚠️ Rate limited. Wait ~15s and try again.' : `⚠️ Error ${response.status}`);
        setMessages(p => [...p, { role: 'assistant', content: err, timestamp: new Date() }]); setLoading(false); sendingRef.current = false; return;
      }

      const data = await response.json();
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const functionCalls = parts.filter((p: any) => p.functionCall);
      const aiText = parts.find((p: any) => p.text)?.text;

      let finalMessages = [...newMessages];

      if (functionCalls && functionCalls.length > 0) {
        const functionResponses: any[] = [];
        for (const call of functionCalls) {
          const fn = call.functionCall;
          let resultMsg = "Action completed successfully.";

          if (fn.name === 'createProjectMilestone') {
            const { projectId, title } = fn.args;
            const proj = await db.projects.get(Number(projectId));
            if (proj) {
              const milestones = proj.milestones || [];
              milestones.push({ id: Date.now().toString() + Math.random(), title, completed: false, createdAt: new Date() });
              await db.projects.update(Number(projectId), { milestones, updatedAt: new Date() });
              resultMsg = `Successfully added milestone "${title}" to project ${proj.title}`;
            } else resultMsg = "Project not found.";
          }
          else if (fn.name === 'toggleProjectMilestone') {
            const { projectId, milestoneId, completed } = fn.args;
            const proj = await db.projects.get(Number(projectId));
            if (proj) {
              const milestones = (proj.milestones || []).map(m => m.id === milestoneId ? { ...m, completed: !!completed } : m);
              await db.projects.update(Number(projectId), { milestones, updatedAt: new Date() });
              resultMsg = `Successfully marked milestone completion status as ${completed} for project ${proj.title}`;
            } else resultMsg = "Project not found.";
          }
          else if (fn.name === 'addProjectLog') {
            const { projectId, content } = fn.args;
            const proj = await db.projects.get(Number(projectId));
            if (proj) {
              const notes = proj.notes ? proj.notes + '\n\n' + content : content;
              await db.projects.update(Number(projectId), { notes, updatedAt: new Date() });
              resultMsg = `Successfully appended log to project ${proj.title}`;
            } else resultMsg = "Project not found.";
          }
          else if (fn.name === 'createProject') {
            const { title, description, category } = fn.args;
            await db.projects.add({
              title, description, category, status: 'Planned', notes: '', tags: [], techStack: [], projectType: 'Personal', difficulty: 'Medium', githubUrl: '', deployedUrl: '', youtubeUrl: '', docsUrl: '', links: [], files: [], milestones: [], createdAt: new Date(), updatedAt: new Date()
            });
            resultMsg = `Project ${title} created successfully.`;
          }
          else if (fn.name === 'updateProjectStatus') {
            const { projectId, status } = fn.args;
            const proj = await db.projects.get(Number(projectId));
            if (proj) {
              await db.projects.update(Number(projectId), { status, updatedAt: new Date() });
              resultMsg = `Successfully updated status of project ${proj.title} to ${status}`;
            } else resultMsg = "Project not found.";
          }
          else if (fn.name === 'logMeal') {
            const { mealType, food, calories, protein, carbs, fat, date } = fn.args;
            const mDate = date ? new Date(date) : new Date();
            await db.diet.add({
              date: mDate,
              mealType,
              food,
              calories: Number(calories) || 0,
              protein: Number(protein) || 0,
              carbs: Number(carbs) || 0,
              fat: Number(fat) || 0,
              aiBreakdown: 'Logged autonomously by JARVIS.'
            });
            resultMsg = `Successfully logged meal: ${food} (${mealType}) with ${calories} kcal.`;
          }
          else if (fn.name === 'deleteMeal') {
            const { mealId } = fn.args;
            const meal = await db.diet.get(Number(mealId));
            if (meal) {
              await db.diet.delete(Number(mealId));
              resultMsg = `Successfully deleted meal: ${meal.food}`;
            } else resultMsg = "Meal not found.";
          }
          else if (fn.name === 'logGymSession') {
            const { muscleGroup, exercises, isRestDay, date } = fn.args;
            const gDate = date ? new Date(date) : new Date();
            await db.gym.add({
              date: gDate,
              muscleGroup: isRestDay ? 'Rest' : muscleGroup,
              exercises: exercises || [],
              isRestDay: !!isRestDay,
              aiSuggestion: 'Session logged autonomously by JARVIS.'
            });
            resultMsg = isRestDay ? "Successfully logged rest day." : `Successfully logged gym session targeting ${muscleGroup}.`;
          }
          else if (fn.name === 'logFitnessActivity') {
            const { steps, distance, caloriesBurned, activeMinutes, date } = fn.args;
            const fDate = date ? new Date(date) : new Date();
            await db.fitness.add({
              date: fDate,
              steps: Number(steps) || 0,
              distance: Number(distance) || 0,
              caloriesBurned: Number(caloriesBurned) || 0,
              activeMinutes: Number(activeMinutes) || 0,
              notes: 'Logged autonomously by JARVIS.'
            });
            resultMsg = `Successfully logged fitness activity: ${steps} steps, ${distance} km, ${caloriesBurned} kcal.`;
          }
          else if (fn.name === 'logTrade') {
            const { ticker, side, entryPrice, exitPrice, stopLoss, takeProfit, positionSize, riskAmount, pnl, pnlPercentage, status, strategy, setupType, confidence, notes, emotions, mistakes, tags, entryTime } = fn.args;
            const tTime = entryTime ? new Date(entryTime) : new Date();
            await db.trades.add({
              ticker,
              marketType: 'Crypto/Forex',
              side: side || 'Long',
              entryPrice: Number(entryPrice) || 0,
              exitPrice: Number(exitPrice) || 0,
              stopLoss: stopLoss ? Number(stopLoss) : undefined,
              takeProfit: takeProfit ? Number(takeProfit) : undefined,
              positionSize: Number(positionSize) || 0,
              riskAmount: Number(riskAmount) || 0,
              pnl: Number(pnl) || 0,
              pnlPercentage: Number(pnlPercentage) || 0,
              entryTime: tTime,
              exitTime: tTime,
              status: status || 'Closed',
              strategy: strategy || 'Breakout',
              setupType: setupType || 'A+',
              confidence: Number(confidence) || 5,
              notes: notes || '',
              mistakes: mistakes || [],
              emotions: emotions || '',
              tags: tags || [],
              isPaperTrade: false
            });
            resultMsg = `Successfully logged trade for ${ticker} (${side}) with PnL of $${pnl}`;
          }
          else if (fn.name === 'deleteTrade') {
            const { tradeId } = fn.args;
            const tr = await db.trades.get(Number(tradeId));
            if (tr) {
              await db.trades.delete(Number(tradeId));
              resultMsg = `Successfully deleted trade: [ID ${tradeId}] ${tr.ticker}`;
            } else resultMsg = "Trade not found.";
          }
          else if (fn.name === 'logHobbyTime') {
            const { name, category, timeSpent, notes, date } = fn.args;
            const hDate = date ? new Date(date) : new Date();
            await db.hobbies.add({
              name,
              category: category || 'Default',
              timeSpent: Number(timeSpent) || 0,
              date: hDate,
              notes: notes || ''
            });
            resultMsg = `Successfully logged hobby: ${name} (${timeSpent} mins)`;
          }
          else if (fn.name === 'deleteHobbySession') {
            const { hobbyId } = fn.args;
            const h = await db.hobbies.get(Number(hobbyId));
            if (h) {
              await db.hobbies.delete(Number(hobbyId));
              resultMsg = `Successfully deleted hobby session: "${h.name}" (${h.timeSpent} mins)`;
            } else resultMsg = "Hobby session not found.";
          }
          else if (fn.name === 'updateHobbySession') {
            const { hobbyId, name, timeSpent, notes, date } = fn.args;
            const h = await db.hobbies.get(Number(hobbyId));
            if (h) {
              const updates: any = {};
              if (name !== undefined) { updates.name = name; updates.category = name; }
              if (timeSpent !== undefined) updates.timeSpent = Number(timeSpent);
              if (notes !== undefined) updates.notes = notes;
              if (date !== undefined) updates.date = new Date(date);
              await db.hobbies.update(Number(hobbyId), updates);
              resultMsg = `Successfully updated hobby session [ID ${hobbyId}] (${h.name})`;
            } else resultMsg = "Hobby session not found.";
          }
          else if (fn.name === 'addTodo') {
            const { task, priority, date } = fn.args;
            const tDate = date ? new Date(date) : new Date();
            await db.todos.add({
              task,
              priority: priority || 'Medium',
              completed: false,
              date: tDate,
              createdAt: new Date()
            });
            resultMsg = `Successfully added task: ${task}`;
          }
          else if (fn.name === 'toggleTodo') {
            const { todoId, completed } = fn.args;
            const t = await db.todos.get(Number(todoId));
            if (t) {
              await db.todos.update(Number(todoId), { completed: !!completed });
              resultMsg = `Successfully marked task "${t.task}" as ${completed ? 'completed' : 'incomplete'}`;
            } else resultMsg = "Task not found.";
          }
          else if (fn.name === 'deleteTodo') {
            const { todoId } = fn.args;
            const t = await db.todos.get(Number(todoId));
            if (t) {
              await db.todos.delete(Number(todoId));
              resultMsg = `Successfully deleted task: "${t.task}"`;
            } else resultMsg = "Task not found.";
          }
          else if (fn.name === 'addHabit') {
            const { habitName } = fn.args;
            await db.habits.add({ habitName, completed: false, streak: 0, date: new Date() });
            resultMsg = `Habit ${habitName} created.`;
          }
          else if (fn.name === 'toggleHabit') {
            const { habitId, completed } = fn.args;
            const h = await db.habits.get(Number(habitId));
            if (h) {
              await db.habits.update(Number(habitId), { completed: !!completed, streak: completed ? h.streak + 1 : Math.max(0, h.streak - 1) });
              resultMsg = `Successfully toggled habit "${h.habitName}" completion to ${completed}`;
            } else resultMsg = "Habit not found.";
          }
          else if (fn.name === 'updateSettings') {
            const { theme } = fn.args;
            const s = await db.settings.toArray();
            if (s[0]) {
              await db.settings.update(s[0].id!, { theme });
              document.documentElement.setAttribute('data-theme', theme);
              resultMsg = `Theme updated to ${theme}.`;
            }
          }

          functionResponses.push({
            functionResponse: {
              name: fn.name,
              response: { result: resultMsg }
            }
          });
        }

        // Trigger real-time background cloud synchronization for all database mutations
        triggerBackgroundSync();

        try {
          const parsedBody = JSON.parse(body);
          const modelContent = data?.candidates?.[0]?.content;
          const rawFollowUpTurns = [
            ...parsedBody.contents,
            modelContent || { role: 'model', parts: functionCalls.map((c: any) => ({ functionCall: c.functionCall })) },
            { role: 'user', parts: functionResponses }
          ];
          const followUpContents = cleanAndAlternateContents(rawFollowUpTurns);

          const followUpBody = JSON.stringify({
            contents: followUpContents,
            systemInstruction: parsedBody.systemInstruction,
            tools: parsedBody.tools,
            generationConfig: parsedBody.generationConfig
          });

          const res2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: followUpBody });
          if (!res2.ok) {
            const errData2 = await res2.json().catch(() => ({}));
            const err2 = errData2?.error?.message || `⚠️ Tool Execution Follow-up Error ${res2.status}`;
            setMessages(p => [...p, { role: 'assistant', content: err2, timestamp: new Date() }]);
            setLoading(false);
            sendingRef.current = false;
            return;
          }
          const data2 = await res2.json();
          const aiText2 = data2?.candidates?.[0]?.content?.parts?.find((p: any) => p.text)?.text;
          if (aiText2) finalMessages.push({ role: 'assistant', content: aiText2, timestamp: new Date() });
        } catch (e: any) {
          console.error("Followup fetch failed", e);
          setMessages(p => [...p, { role: 'assistant', content: `⚠️ Follow-up fetch failed: ${e?.message || e}`, timestamp: new Date() }]);
          setLoading(false);
          sendingRef.current = false;
          return;
        }

      } else if (aiText) {
        finalMessages.push({ role: 'assistant', content: aiText, timestamp: new Date() });
      }

      if (finalMessages.length > newMessages.length) {
        setMessages(finalMessages);
        if (conversationId) {
          let title = (await db.conversations.get(conversationId))?.title || 'New Session';
          if (title === 'New Session' && finalMessages.length >= 2) {
            try {
              const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
                method: 'POST', body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: `Give a 2-3 word title for: ${msgText}` }] }], generationConfig: { temperature: 0.5, maxOutputTokens: 10 } })
              });
              if (r.ok) { const d = await r.json(); const t = d.candidates?.[0]?.content?.parts?.[0]?.text?.replace(/[\"*]/g, '').trim(); if (t) title = t; }
            } catch { }
          }
          await syncUpdateConversation(conversationId, { messages: finalMessages, title, updatedAt: new Date() });
          loadHistory();
        }
      }
    } catch (e: any) {
      console.error(e);
      setMessages(p => [...p, {
        role: 'assistant',
        content: `⚠️ **J.A.R.V.I.S. Neural System Error**\n\nFailed to process request. Details:\n\`\`\`\n${e?.message || e}\n\`\`\``,
        timestamp: new Date()
      }]);
    }
    setLoading(false); sendingRef.current = false;
  }, [input, loading, messages, getContext, conversationId, attachments]);

  return (
    <div className="flex flex-1 h-full overflow-hidden w-full relative">
      {/* Mobile Sidebar overlay backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed inset-y-0 left-0 z-50 w-[260px] bg-[var(--bg-1)] border-r border-[var(--border)] flex flex-col md:hidden"
            >
              <div className="p-3.5 border-b border-[var(--border)] flex items-center justify-between">
                <span className="font-mono text-[var(--text-2)] text-[10px] uppercase tracking-wider font-semibold">Neural Links</span>
                <button onClick={() => setSidebarOpen(false)} className="p-1 rounded hover:bg-white/5 text-[var(--text-3)] hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-3 border-b border-[var(--border)]">
                <button onClick={() => { startNewChat(); setSidebarOpen(false); }} className="w-full py-2 px-3 rounded-xl bg-[var(--accent)]/10 border border-[var(--accent)]/20 text-[var(--accent)] text-xs font-semibold flex items-center justify-center gap-2 hover:bg-[var(--accent)]/15 transition-all">
                  <Plus className="w-3.5 h-3.5" /> New Session
                </button>
              </div>
              <div className="flex-1 overflow-y-auto py-1.5">
                {allConversations.map(conv => (
                  <div key={conv.id} onClick={() => { switchChat(conv.id!); setSidebarOpen(false); }}
                    className={`group flex items-center justify-between px-3.5 py-2.5 mx-2 rounded-lg cursor-pointer text-[12px] transition-all ${conversationId === conv.id ? 'bg-white/[.06] text-[var(--text-0)]' : 'text-[var(--text-2)] hover:bg-white/[.03] hover:text-[var(--text-1)]'
                      }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" style={conversationId === conv.id ? { color: 'var(--accent)' } : {}} />
                      <span className="truncate">{conv.title}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <button onClick={e => { e.stopPropagation(); renameChat(conv.id!); }} className="p-1 hover:text-[var(--accent)]"><Edit3 className="w-3 h-3" /></button>
                      <button onClick={e => { e.stopPropagation(); deleteChat(conv.id!); }} className="p-1 hover:text-[var(--red)]"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Session sidebar (desktop) */}
      <div className="hidden md:flex w-[220px] flex-shrink-0 flex flex-col border-r border-[var(--border)] bg-[var(--bg-1)]/50 backdrop-blur-sm">
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
      <div className="flex-1 flex flex-col min-w-0 bg-[var(--bg-0)]">
        {/* Header */}
        <div className="flex items-center justify-between h-14 px-4 border-b border-[var(--border)] bg-[var(--bg-1)]/30 backdrop-blur-xl flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Toggle button */}
            <button onClick={() => setSidebarOpen(true)} className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-white/5 md:hidden text-[var(--text-2)] hover:text-white transition-all">
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-[11px] sm:text-xs">
              <Zap className="w-3.5 h-3.5 text-[var(--accent)]" />
              <span className="font-mono text-[var(--text-2)] hidden sm:inline">J.A.R.V.I.S.</span>
              <span className="text-[var(--text-3)] hidden sm:inline">—</span>
              <span className="text-[var(--text-2)] font-semibold truncate max-w-[110px] sm:max-w-none">{allConversations.find(c => c.id === conversationId)?.title || 'Neural Session'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Mobile new session shortcut */}
            <button onClick={startNewChat} className="p-1.5 rounded-lg border border-[var(--border)] hover:bg-white/5 md:hidden text-[var(--text-2)] hover:text-white transition-all" title="New Session">
              <Plus className="w-4 h-4" />
            </button>
            <select value={linkedProjectId || ''} onChange={e => linkProject(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-transparent text-[10px] text-[var(--text-2)] outline-none cursor-pointer font-mono border border-[var(--border)] rounded px-1.5 py-0.5"
            >
              <option value="" className="bg-[var(--bg-1)]">No Project</option>
              {projects.map(p => <option key={p.id} value={p.id} className="bg-[var(--bg-1)]">{p.title}</option>)}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
          {/* Boot */}
          {bootLines.filter(Boolean).map((line, i) => (
            <motion.div key={`boot-${i}`} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}
              className={`text-[12px] font-mono ${line?.startsWith('>') ? 'text-[var(--accent)]' : 'text-[var(--text-3)]'}`}
            >{line}</motion.div>
          ))}
          {bootComplete && messages.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center py-16 text-center h-full my-auto"
            >
              <div className="mb-4">
                <ArcReactorLoader visible={true} inline={true} size={80} />
              </div>
              <h2 className="text-lg font-semibold gradient-text mb-1 glow-text">J.A.R.V.I.S.</h2>
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
              className={`group flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent-2)]/20 flex items-center justify-center flex-shrink-0 mt-0.5 border border-[var(--accent)]/10">
                  <ArcReactorLoader visible={true} size={14} inline={true} />
                </div>
              )}

              {msg.role === 'user' && editingIndex !== i && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 self-center mr-1">
                  <button
                    onClick={() => { setEditingIndex(i); setEditingText(msg.content); }}
                    className="p-1 rounded text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-white/[.04] transition-colors"
                    title="Edit message"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteMessage(i)}
                    className="p-1 rounded text-[var(--text-3)] hover:text-red-400 hover:bg-white/[.04] transition-colors"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className={`max-w-[85%] md:max-w-[75%] break-words overflow-hidden ${msg.role === 'user'
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

                {editingIndex === i ? (
                  <div className="flex flex-col gap-2 min-w-[220px] sm:min-w-[300px]">
                    <textarea
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      className="w-full bg-black/40 border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--text-1)] focus:outline-none focus:border-[var(--accent)]/50 resize-y min-h-[60px] font-sans leading-relaxed"
                      placeholder="Edit message..."
                      autoFocus
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setEditingIndex(null)}
                        className="px-2 py-1 rounded text-[10px] bg-white/[0.04] hover:bg-white/[0.08] text-[var(--text-2)] hover:text-[var(--text-1)] border border-[var(--border)] transition-colors flex items-center gap-1"
                      >
                        <X className="w-2.5 h-2.5" /> Cancel
                      </button>
                      <button
                        onClick={() => handleEditMessage(i, editingText)}
                        className="px-2 py-1 rounded text-[10px] bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 text-[var(--accent)] border border-[var(--accent)]/20 transition-all flex items-center gap-1 hover:shadow-[0_0_8px_rgba(var(--accent-rgb),0.2)]"
                      >
                        <Check className="w-2.5 h-2.5" /> Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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
                  </>
                )}
              </div>

              {msg.role === 'assistant' && editingIndex !== i && (
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 self-center ml-1">
                  <button
                    onClick={() => { setEditingIndex(i); setEditingText(msg.content); }}
                    className="p-1 rounded text-[var(--text-3)] hover:text-[var(--accent)] hover:bg-white/[.04] transition-colors"
                    title="Edit message"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteMessage(i)}
                    className="p-1 rounded text-[var(--text-3)] hover:text-red-400 hover:bg-white/[.04] transition-colors"
                    title="Delete message"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

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
              <div className="bg-white/[.03] border border-[var(--border)] rounded-2xl rounded-bl-md px-4 py-3 flex items-center">
                <div className="flex items-center gap-3 text-xs text-[var(--text-2)]">
                  <div className="w-4 h-4 flex items-center justify-center">
                    <ArcReactorLoader visible={true} size={16} inline={true} />
                  </div>
                  <span className="font-mono">Processing neural query...</span>
                </div>
              </div>
            </motion.div>
          )}
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
              Gemini 2.5 Flash
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
