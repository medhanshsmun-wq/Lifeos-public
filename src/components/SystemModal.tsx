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
      case 'alert': return <AlertCircle className="w-5 h-5 text-amber-400" />;
      case 'confirm': return <HelpCircle className="w-5 h-5 text-blue-400" />;
      case 'prompt': return <Info className="w-5 h-5 text-purple-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.95, y: 10 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.95, y: 10 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-[#1e1e1e] border border-[#3c3c3c] rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="bg-[#252526] px-4 py-2.5 flex items-center justify-between border-b border-[#2b2b2b]">
              <div className="flex items-center gap-2">
                {getIcon()}
                <span className="text-[11px] font-bold text-[#858585] uppercase tracking-wider">{title}</span>
              </div>
              <button onClick={onCancel} className="text-[#858585] hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <p className="text-[13px] text-[#dcdcdc] leading-relaxed">
                {message}
              </p>

              {type === 'prompt' && (
                <div className="space-y-2">
                  <input
                    autoFocus
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
                    className="w-full bg-[#0c0c0c] border border-[#3c3c3c] rounded px-3 py-2.5 text-[13px] text-[#dcdcdc] outline-none focus:border-[#007acc] transition-all"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                {type !== 'alert' && (
                  <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg text-[11px] font-bold text-[#858585] hover:text-[#cccccc] hover:bg-[#2a2d2e] transition-all"
                  >
                    {cancelText.toUpperCase()}
                  </button>
                )}
                <button
                  onClick={handleConfirm}
                  className="px-6 py-2 rounded-lg bg-[#007acc] hover:bg-[#0062a3] text-white text-[11px] font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                  {confirmText.toUpperCase()}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
