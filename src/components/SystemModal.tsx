'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertCircle, HelpCircle, CheckCircle2, Info } from 'lucide-react';
import { useState, useEffect } from 'react';

export type ModalType = 'alert' | 'confirm' | 'prompt';

interface SystemModalProps {
  isOpen: boolean;
  type: ModalType;
  title: string;
  message: string;
  defaultValue?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value?: string) => void;
  onCancel: () => void;
}

export default function SystemModal({
  isOpen,
  type,
  title,
  message,
  defaultValue = '',
  confirmText = 'OK',
  cancelText = 'CANCEL',
  onConfirm,
  onCancel,
}: SystemModalProps) {
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    if (isOpen) setInputValue(defaultValue);
  }, [isOpen, defaultValue]);

  const handleConfirm = () => {
    onConfirm(type === 'prompt' ? inputValue : undefined);
  };

  const getIcon = () => {
    switch (type) {
      case 'alert': return <AlertCircle className="w-5 h-5 text-[var(--accent-cyan)]" />;
      case 'confirm': return <HelpCircle className="w-5 h-5 text-[var(--accent-purple)]" />;
      case 'prompt': return <Info className="w-5 h-5 text-[var(--accent-cyan)]" />;
      default: return <Info className="w-5 h-5 text-[var(--accent-cyan)]" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm glass-card border border-white/10 p-6 shadow-2xl overflow-hidden relative space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-white/5 border border-white/10">
                  {getIcon()}
                </div>
                <span className="text-xs font-bold tracking-wider text-[var(--text-secondary)] uppercase">{title}</span>
              </div>
              <button onClick={onCancel} className="p-1.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--text-secondary)] hover:text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-sans">
                {message}
              </p>

              {type === 'prompt' && (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[var(--accent-cyan)] text-white focus:shadow-[0_0_12px_rgba(0,245,255,0.2)] transition-all font-sans"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                {type !== 'alert' && (
                  <button
                    onClick={onCancel}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)] hover:text-white hover:bg-white/5 transition-all"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white hover:opacity-90 active:scale-[0.98] text-xs font-semibold uppercase tracking-wider transition-all shadow-lg shadow-[var(--accent-cyan)]/15"
                >
                  {confirmText}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
