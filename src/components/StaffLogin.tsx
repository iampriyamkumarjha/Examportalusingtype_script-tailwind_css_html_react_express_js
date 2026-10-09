import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { auth, StaffUser } from '../services/auth';

interface StaffLoginProps {
  onLoggedIn: (user: StaffUser) => void;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({ onLoggedIn }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);

    const uname = username.trim();

    try {
      // 1) Pehle admin login try karo
      try {
        const adminUser = await auth.login('admin', uname, password);
        onLoggedIn(adminUser);
        return;
      } catch {
        // admin nahi hai, ab teacher try karte hain
      }

      // 2) Teachers ki list le kar har teacher ke against try karo
      let teachers: Awaited<ReturnType<typeof auth.listTeachers>> = [];
      try {
        teachers = await auth.listTeachers();
      } catch {
        setError('Server se connect nahi ho paya. Server chalu hai ya nahi check karo.');
        return;
      }

      for (const t of teachers) {
        try {
          const teacherUser = await auth.login('teacher', uname, password, t.id);
          onLoggedIn(teacherUser);
          return;
        } catch {
          // is teacher se match nahi hua, agla try karo
        }
      }

      setError('Galat username ya password. Dobara try karo.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-in fade-in duration-200">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-emerald-50 border-4 border-emerald-100/70 flex items-center justify-center text-emerald-600">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
            />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Teacher / Admin Login</h2>
        <p className="text-sm text-slate-500 mt-1">Enter your username and password to continue</p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-relaxed">
          {error}
        </div>
      )}

      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Username <span className="text-rose-500">*</span>
          </label>
          <input
            className="block w-full px-4 py-3.5 text-sm rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            required
            autoFocus
            autoComplete="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
            Password <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              className="block w-full px-4 pr-11 py-3.5 text-sm rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              required
              autoComplete="current-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full py-3.5 rounded-xl shadow-lg shadow-emerald-600/20 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition cursor-pointer"
        >
          {busy ? 'Signing in…' : 'Login'}
        </button>
      </form>
    </div>
  );
};
