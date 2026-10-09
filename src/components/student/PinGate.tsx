import React, { useEffect, useRef, useState } from 'react';
import { ExamTest } from '../../types';
import { storage } from '../../services/storage';
import { pinMatches } from '../../services/testPin';

interface Props {
  test: ExamTest;
  onVerified: (test: ExamTest) => void;
  onCancel: () => void;
}

const MAX_ATTEMPTS = 5;
const LOCK_SECONDS = 30;

export const PinGate: React.FC<Props> = ({ test, onVerified, onCancel }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockLeft, setLockLeft] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    if (lockLeft <= 0) return;
    const id = window.setTimeout(() => setLockLeft((n) => n - 1), 1000);
    return () => window.clearTimeout(id);
  }, [lockLeft]);

  const submit = async () => {
    if (lockLeft > 0 || checking) return;
    if (!pin.trim()) {
      setError('Please enter the PIN given by your teacher.');
      return;
    }
    setChecking(true);
    setError('');

    // Admin ne PIN badla ho to latest test data lo
    let fresh = test;
    try {
      const sync = (storage as unknown as { syncFromFirebase?: () => Promise<void> }).syncFromFirebase;
      if (sync) await sync.call(storage);
      fresh = storage.getTests().find((t) => String(t.id) === String(test.id)) || test;
    } catch {
      /* purana data use karo */
    }

    if (pinMatches(pin, fresh.accessPin)) {
      onVerified(fresh);
      return;
    }

    const used = attempts + 1;
    setAttempts(used);
    setPin('');
    if (used >= MAX_ATTEMPTS) {
      setAttempts(0);
      setLockLeft(LOCK_SECONDS);
      setError(`Too many wrong attempts. Try again in ${LOCK_SECONDS} seconds.`);
    } else {
      setError(`Wrong PIN. ${MAX_ATTEMPTS - used} attempt(s) left.`);
    }
    setChecking(false);
    inputRef.current?.focus();
  };

  return (
    <div className="fixed inset-0 z-[9000] bg-slate-900/70 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7 space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-3xl">key</span>
        </div>
        <div className="text-center">
          <h2 className="text-xl font-extrabold text-slate-900">Enter Test PIN</h2>
          <p className="mt-1 text-xs text-slate-500">
            {test.title || 'Examination'} — ask your teacher for the PIN.
          </p>
        </div>

        <input
          ref={inputRef}
          value={pin}
          onChange={(e) => {
            setPin(e.target.value);
            setError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          disabled={lockLeft > 0}
          inputMode="numeric"
          autoComplete="off"
          placeholder="••••••"
          className="w-full text-center text-2xl tracking-[0.4em] font-bold px-4 py-3 rounded-xl border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
        />

        {(error || lockLeft > 0) && (
          <p className="text-center text-xs font-semibold text-red-600">
            {lockLeft > 0 ? `Locked. Try again in ${lockLeft}s.` : error}
          </p>
        )}

        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={checking || lockLeft > 0}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold disabled:opacity-50"
          >
            {checking ? 'Checking...' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
};
