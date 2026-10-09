import React, { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { auth, TeacherRecord } from '../../services/auth';

/** Random 8 akshar ka password (confusing letters jaise 0/O, 1/l nahi) */
const generatePassword = () => {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint32Array(8));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

const inputCls =
  'block w-full px-4 py-3 text-sm rounded-xl border border-slate-200 text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none';
const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5';

export const TeacherManager: React.FC = () => {
  const [teachers, setTeachers] = useState<TeacherRecord[] | null>(null);
  const [loadError, setLoadError] = useState('');

  // form (create + edit dono ke liye)
  const [editing, setEditing] = useState<TeacherRecord | null>(null);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState<{ name: string; username: string; password: string } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError('');
      setTeachers(await auth.admin.list());
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Teachers load nahi hue.');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setEditing(null);
    setName('');
    setUsername('');
    setPassword('');
    setShowPw(true);
    setError('');
  };

  const startEdit = (t: TeacherRecord) => {
    setSaved(null);
    setEditing(t);
    setName(t.name);
    setUsername(t.username);
    setPassword('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setBusy(true);
    try {
      if (editing) {
        await auth.admin.update(editing.id, {
          name: name.trim(),
          username: username.trim(),
          ...(password ? { password } : {}),
        });
        setSaved(
          password
            ? { name: name.trim(), username: username.trim(), password }
            : null
        );
      } else {
        await auth.admin.create({ name: name.trim(), username: username.trim(), password });
        setSaved({ name: name.trim(), username: username.trim(), password });
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save nahi ho paya.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (t: TeacherRecord) => {
    const extra = t.testCount > 0 ? `\n\nIn ${t.testCount} tests aur unke results delete NAHI honge.` : '';
    if (!window.confirm(`Teacher "${t.name}" ko hatana hai? Ye ab login nahi kar payenge.${extra}`)) return;
    try {
      await auth.admin.remove(t.id);
      if (editing?.id === t.id) resetForm();
      await load();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Delete nahi ho paya.');
    }
  };

  const copyCreds = async () => {
    if (!saved) return;
    const text = `MCE Examination Portal\nTeacher login\nUsername: ${saved.username}\nPassword: ${saved.password}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      window.prompt('Copy karo:', text);
    }
  };

  return (
    <section className="min-h-[calc(100vh-72px)] bg-slate-50 p-5 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">Teachers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Yahan jo username aur password set karoge, usi se teacher &quot;Teacher / Admin&quot; tab se login karega.
          </p>
        </div>

        {saved && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
            <div className="font-bold text-emerald-900">
              {saved.name} ke login details save ho gaye
            </div>
            <p className="text-sm text-emerald-800 mt-1">
              Password dobara dikhaya nahi jayega. Abhi teacher ko bhej do.
            </p>
            <div className="mt-3 inline-block rounded-xl bg-white border border-emerald-200 px-4 py-3 text-sm font-mono text-slate-800">
              <div>Username: <b>{saved.username}</b></div>
              <div>Password: <b>{saved.password}</b></div>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={copyCreds}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold cursor-pointer"
              >
                Copy details
              </button>
              <button
                type="button"
                onClick={() => setSaved(null)}
                className="px-4 py-2 rounded-lg border border-emerald-300 text-emerald-800 text-sm font-semibold hover:bg-emerald-100 cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* ---------- Form ---------- */}
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-bold text-slate-900">
            {editing ? `Edit teacher: ${editing.name}` : 'Add a teacher'}
          </h2>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Teacher name</label>
              <input
                className={inputCls}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Sir"
              />
            </div>
            <div>
              <label className={labelCls}>Username</label>
              <input
                className={inputCls}
                required
                autoComplete="off"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. ramesh01"
              />
            </div>
            <div>
              <label className={labelCls}>
                {editing ? 'New password (blank = no change)' : 'Password (min 6 characters)'}
              </label>
              <div className="relative">
                <input
                  className={`${inputCls} pr-11 font-mono`}
                  required={!editing}
                  minLength={editing && !password ? undefined : 6}
                  autoComplete="new-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPassword(generatePassword());
                  setShowPw(true);
                }}
                className="mt-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-900 cursor-pointer"
              >
                Generate a password
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={busy}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-bold cursor-pointer"
            >
              {busy ? 'Saving…' : editing ? 'Save changes' : 'Create teacher'}
            </button>
            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {/* ---------- List ---------- */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              All teachers{teachers ? ` (${teachers.length})` : ''}
            </h2>
          </div>

          {loadError && <div className="p-5 text-sm text-rose-700 bg-rose-50">{loadError}</div>}
          {!loadError && teachers === null && <div className="p-5 text-sm text-slate-500">Loading…</div>}
          {teachers && teachers.length === 0 && (
            <div className="p-8 text-center text-sm text-slate-500">
              Abhi koi teacher nahi hai. Upar form bharke pehla teacher add karo.
            </div>
          )}

          {teachers && teachers.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Name</th>
                    <th className="px-5 py-3 font-semibold">Username</th>
                    <th className="px-5 py-3 font-semibold">Tests</th>
                    <th className="px-5 py-3 font-semibold">Added</th>
                    <th className="px-5 py-3 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachers.map((t) => (
                    <tr key={t.id} className={editing?.id === t.id ? 'bg-emerald-50/60' : ''}>
                      <td className="px-5 py-3 font-semibold text-slate-900">{t.name}</td>
                      <td className="px-5 py-3 font-mono text-slate-700">{t.username}</td>
                      <td className="px-5 py-3 text-slate-700">{t.testCount}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {t.createdAt ? new Date(t.createdAt).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-5 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => startEdit(t)}
                          className="px-3 py-1.5 rounded-lg text-blue-700 hover:bg-blue-50 font-semibold cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => remove(t)}
                          className="px-3 py-1.5 rounded-lg text-rose-700 hover:bg-rose-50 font-semibold cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
