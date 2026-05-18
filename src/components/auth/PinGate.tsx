'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, UserPlus, LogIn, ChevronLeft, Mail, User } from 'lucide-react';
import { maskEmail } from '@/lib/auth/pin.shared';
import {
  registerLocalAccount,
  findLocalAccountsByPin,
} from '@/lib/auth/localAccounts';
import { saveLocalSession } from '@/lib/auth/clientSession';
import { isCloudAvailable } from '@/lib/cloudSync';

type Mode = 'login' | 'register';
type Step = 'form' | 'pin' | 'select';

type Candidate = { id: number; name: string; emailMasked: string };

export default function PinGate({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<Mode>('login');
  const [step, setStep] = useState<Step>('pin');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [serverAuth, setServerAuth] = useState(false);

  useEffect(() => {
    isCloudAvailable().then(setServerAuth);
  }, []);

  const resetPin = () => setPin('');

  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 4 && mode === 'login' && step === 'pin') {
      void submitPin(next);
    }
  };

  const handleBackspace = () => {
    setPin((p) => p.slice(0, -1));
    setError('');
  };

  const completeAuth = useCallback(
    (user: { id: number; name: string; email: string }, authMode: 'server' | 'local') => {
      if (authMode === 'local') {
        saveLocalSession({ accountId: user.id, mode: 'local' });
      }
      onAuthenticated();
    },
    [onAuthenticated]
  );

  const submitPin = async (pinValue: string) => {
    setLoading(true);
    setError('');
    try {
      if (serverAuth) {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: pinValue }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Login failed');
          resetPin();
          return;
        }
        if (data.requiresSelection) {
          setCandidates(data.candidates);
          setStep('select');
          return;
        }
        completeAuth(data.user, 'server');
        return;
      }

      const matches = await findLocalAccountsByPin(pinValue);
      if (matches.length === 0) {
        setError('Invalid PIN');
        resetPin();
        return;
      }
      if (matches.length === 1) {
        const u = matches[0];
        completeAuth({ id: u.id!, name: u.name, email: u.email }, 'local');
        return;
      }
      setCandidates(
        matches.map((u) => ({
          id: u.id!,
          name: u.name,
          emailMasked: maskEmail(u.email),
        }))
      );
      setStep('select');
    } catch {
      setError('Something went wrong. Try again.');
      resetPin();
    } finally {
      setLoading(false);
    }
  };

  const selectAccount = async (accountId: number) => {
    setLoading(true);
    setError('');
    try {
      if (serverAuth) {
        const res = await fetch('/api/auth/login/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin, accountId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Login failed');
          return;
        }
        completeAuth(data.user, 'server');
        return;
      }

      const matches = await findLocalAccountsByPin(pin);
      const match = matches.find((m) => m.id === accountId);
      if (!match) {
        setError('Invalid selection');
        return;
      }
      completeAuth({ id: match.id!, name: match.name, email: match.email }, 'local');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !email.trim()) {
      setError('Name and email are required');
      return;
    }
    if (pin.length !== 4) {
      setError('Choose a 4-digit PIN on the keypad');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (serverAuth) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, pin }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Registration failed');
          return;
        }
        completeAuth(data.user, 'server');
        return;
      }

      const account = await registerLocalAccount(name, email, pin);
      completeAuth(
        { id: account.id!, name: account.name, email: account.email },
        'local'
      );
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const startRegister = () => {
    setMode('register');
    setStep('form');
    resetPin();
    setError('');
    setCandidates([]);
  };

  const startLogin = () => {
    setMode('login');
    setStep('pin');
    resetPin();
    setError('');
    setCandidates([]);
  };

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl"
    >
      <div className="w-full max-w-md glass-card p-6 lg:p-8 border border-white/10 shadow-2xl">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center mb-6"
        >
          <motion.div
            className="w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, rgba(0,245,255,0.15), rgba(139,92,246,0.15))',
              border: '1px solid rgba(0,245,255,0.2)',
            }}
          >
            <Lock className="w-6 h-6 text-[var(--accent-cyan)]" />
          </motion.div>
          <h1 className="text-xl font-bold tracking-tight">LifeOS</h1>
          <p className="text-xs text-[var(--text-tertiary)] mt-1 font-mono">
            {step === 'select'
              ? 'Multiple accounts use this PIN — pick yours'
              : mode === 'register'
                ? 'Create your account'
                : 'Enter your 4-digit PIN'}
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {step === 'form' && mode === 'register' && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-3 mb-5"
            >
              <motion.div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
                  <User className="w-3 h-3" /> Name
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[var(--accent-cyan)]"
                />
              </motion.div>
              <motion.div>
                <label className="text-[10px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1 flex items-center gap-1">
                  <Mail className="w-3 h-3" /> Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-hover)] border border-[var(--border-subtle)] text-sm outline-none focus:border-[var(--accent-cyan)]"
                />
              </motion.div>
              <p className="text-[10px] text-[var(--text-muted)]">
                Then choose a 4-digit PIN below. If someone else uses the same PIN, you&apos;ll pick your account by name and email.
              </p>
              <button
                type="button"
                onClick={() => setStep('pin')}
                className="w-full py-2.5 rounded-xl text-sm font-medium bg-white/5 border border-white/10 hover:bg-white/10"
              >
                Continue to PIN
              </button>
            </motion.div>
          )}

          {step === 'select' && (
            <motion.div
              key="select"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              className="space-y-2 mb-5"
            >
              {candidates.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={loading}
                  onClick={() => selectAccount(c.id)}
                  className="w-full p-4 rounded-xl text-left border border-white/10 bg-white/[0.03] hover:border-[var(--accent-cyan)]/40 hover:bg-[var(--accent-cyan)]/5 transition-all"
                >
                  <p className="font-semibold text-sm">{c.name}</p>
                  <p className="text-xs text-[var(--text-tertiary)] font-mono mt-0.5">{c.emailMasked}</p>
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setStep('pin');
                  resetPin();
                  setCandidates([]);
                }}
                className="w-full py-2 text-xs text-[var(--text-tertiary)] flex items-center justify-center gap-1 hover:text-white"
              >
                <ChevronLeft className="w-3 h-3" /> Use a different PIN
              </button>
            </motion.div>
          )}

          {(step === 'pin' || (step === 'form' && mode === 'login')) && (
            <motion.div key="pin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex justify-center gap-3 mb-6">
                {[0, 1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all duration-200 ${
                      pin.length > i
                        ? 'bg-[var(--accent-cyan)] scale-110 shadow-[0_0_12px_rgba(0,245,255,0.5)]'
                        : 'bg-white/10 border border-white/20'
                    }`}
                  />
                ))}
              </div>

              <motion.div className="grid grid-cols-3 gap-2 mb-4">
                {digits.map((d, i) =>
                  d === '' ? (
                    <motion.div key={i} />
                  ) : (
                    <button
                      key={d + i}
                      type="button"
                      disabled={loading}
                      onClick={() => (d === '⌫' ? handleBackspace() : handleDigit(d))}
                      className="h-14 rounded-xl text-lg font-mono font-medium bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] hover:border-[var(--accent-cyan)]/30 active:scale-95 transition-all disabled:opacity-50"
                    >
                      {d}
                    </button>
                  )
                )}
              </motion.div>

              {mode === 'register' && step === 'pin' && (
                <button
                  type="button"
                  disabled={loading || pin.length !== 4}
                  onClick={handleRegister}
                  className="w-full py-3 mb-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-[var(--accent-cyan)] to-[var(--accent-purple)] text-white disabled:opacity-40"
                >
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <p className="text-xs text-red-400 text-center mb-3 font-mono">{error}</p>
        )}

        <div className="flex gap-2 pt-2 border-t border-white/5">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={startRegister}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
            >
              <UserPlus className="w-3.5 h-3.5" /> New account
            </button>
          ) : (
            <button
              type="button"
              onClick={startLogin}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 text-[var(--text-secondary)] hover:text-white hover:bg-white/5"
            >
              <LogIn className="w-3.5 h-3.5" /> Sign in
            </button>
          )}
        </div>

        {!serverAuth && (
          <p className="text-[10px] text-center text-[var(--text-muted)] mt-3 font-mono">
            Local accounts · add DATABASE_URL on server for cloud auth
          </p>
        )}
      </div>
    </motion.div>
  );
}
