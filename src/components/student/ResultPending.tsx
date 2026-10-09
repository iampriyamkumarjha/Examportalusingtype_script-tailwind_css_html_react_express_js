import React, { useState } from 'react';
import { ExamSubmission } from '../../types';

interface Props {
  submission: ExamSubmission;
  /** Re-checks Firestore. Resolves true if the result has been published. */
  onCheck: () => Promise<boolean>;
  onLogout: () => void;
}

export const ResultPending: React.FC<Props> = ({ submission, onCheck, onLogout }) => {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const check  = async () => {
    setBusy(true);
    setMessage('');
    try {
      const published = await onCheck();
      if (!published) setMessage('Result has not been published yet. Please check again later.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white rounded-3xl border border-emerald-200 shadow-xl p-8 text-center">
        <div className="w-[72px] h-[72px] mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-4">
          <span className="material-symbols-outlined text-4xl"></span>
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900">Test Submitted Successfully</h2>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Your responses for <strong className="text-slate-800">{submission.testTitle}</strong> have been
          recorded. Your result will be shown here once the administrator publishes it.
        </p>

        {message && (
          <div className="mt-4 rounded-xl px-4 py-3 text-sm bg-amber-50 text-amber-800 border border-amber-200">
            {message}
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={() => void check()}
            disabled={busy}
            className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold transition"
          >
            {busy ? 'Checking...' : 'Check Result'}
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition"
          >
            Logout
          </button>
        </div>
      </div>
    </div>
  );
};
