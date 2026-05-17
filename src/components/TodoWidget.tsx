'use client';

import { useState, useEffect } from 'react';
import { db, type Todo } from '@/lib/db';
import { Check, Plus, Trash2, CalendarClock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TodoWidget() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTask, setNewTask] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const loadTodos = async () => {
    const all = await db.todos.toArray();
    // Sort by createdAt descending conceptually, but let's do incomplete first, then complete, and sort by date
    all.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    const todayStr = new Date().toDateString();
    const relevant = all.filter(t => {
      if (!t.completed) return true;
      const tDate = new Date(t.date).toDateString();
      return tDate === todayStr;
    });
    setTodos(relevant);
  };

  useEffect(() => {
    loadTodos();
  }, []);

  const addTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    
    await db.todos.add({
      task: newTask.trim(),
      completed: false,
      date: new Date(),
      priority,
      createdAt: new Date(),
    });
    setNewTask('');
    setPriority('Medium');
    loadTodos();
  };

  const toggleTodo = async (id: number, currentStatus: boolean) => {
    await db.todos.update(id, { completed: !currentStatus });
    loadTodos();
  };

  const deleteTodo = async (id: number) => {
    await db.todos.delete(id);
    loadTodos();
  };

  return (
    <div className="glass-card p-5 h-[400px] flex flex-col">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <CalendarClock className="w-4 h-4 text-[#34d399]" />
        Daily To-Do
      </h3>
      
      <form onSubmit={addTodo} className="mb-4 flex gap-2">
        <input 
          type="text" 
          value={newTask} 
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="What needs to be done?"
          className="flex-1 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#34d399]"
        />
        <select 
          value={priority} 
          onChange={(e) => setPriority(e.target.value as any)}
          className="bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] rounded-lg px-2 py-2 text-xs text-white focus:outline-none"
        >
          <option value="High">High</option>
          <option value="Medium">Med</option>
          <option value="Low">Low</option>
        </select>
        <button type="submit" className="bg-[#34d399] text-black p-2 rounded-lg hover:bg-[#10b981] transition-colors">
          <Plus className="w-4 h-4" />
        </button>
      </form>

      <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        <AnimatePresence>
          {todos.map(todo => (
            <motion.div 
              key={todo.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`group flex items-center justify-between p-3 rounded-xl border transition-all ${
                todo.completed 
                  ? 'bg-[rgba(255,255,255,0.02)] border-transparent opacity-50' 
                  : 'bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.05)]'
              }`}
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <button 
                  onClick={() => toggleTodo(todo.id!, todo.completed)}
                  className={`w-5 h-5 rounded flex items-center justify-center border transition-colors flex-shrink-0 ${
                    todo.completed 
                      ? 'bg-[#34d399] border-[#34d399]' 
                      : 'border-[rgba(255,255,255,0.2)] hover:border-[#34d399]'
                  }`}
                >
                  {todo.completed && <Check className="w-3 h-3 text-black" />}
                </button>
                <span className={`text-sm truncate ${todo.completed ? 'line-through text-[rgba(255,255,255,0.5)]' : 'text-white'}`}>
                  {todo.task}
                </span>
                {!todo.completed && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                    todo.priority === 'High' ? 'bg-red-500/10 text-red-400' :
                    todo.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                    'bg-blue-500/10 text-blue-400'
                  }`}>
                    {todo.priority}
                  </span>
                )}
              </div>
              <button 
                onClick={() => deleteTodo(todo.id!)}
                className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 text-[rgba(255,255,255,0.3)] transition-all"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
          {todos.length === 0 && (
            <div className="text-center py-6">
              <p className="text-xs text-[rgba(255,255,255,0.3)]">All caught up for today!</p>
            </div>
          )}
        </AnimatePresence>
      </div>
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
      `}</style>
    </div>
  );
}
