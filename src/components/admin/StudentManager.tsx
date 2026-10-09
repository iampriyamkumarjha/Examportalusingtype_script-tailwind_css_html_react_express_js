import React, { useEffect, useState } from 'react';
import { storage } from '../../services/storage';
import { Student } from '../../types';
import {
  ParsedStudents,
  parseStudentFile,
  STUDENT_CSV_TEMPLATE,
} from '../../services/studentImport';

const BRANCHES = ['CSE (AI)', 'CSE', 'Mechanical', 'Civil', 'Civil with CA', 'EEE'];

interface Props {
  onNavigateTab?: (tab: any) => void;
}

export const StudentManager: React.FC<Props> = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [branch, setBranch] = useState(BRANCHES[0]);
  const [manualPassword, setManualPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [search, setSearch] = useState('');

  // Excel / CSV bulk upload
  const [importPreview, setImportPreview] = useState<(ParsedStudents & { fileName: string }) | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importMessage, setImportMessage] = useState('');
  const [importIsError, setImportIsError] = useState(false);

  const refresh = () => setStudents(storage.getStudents());

  // Edit student
  const [editing, setEditing] = useState<Student | null>(null);

  const saveEdit = () => {
    if (!editing) return;
    const n = editing.name.trim();
    const roll = editing.rollNumber.trim();
    const reg = editing.regNumber.trim();
    const pass = editing.password.trim();

    if (!n || !roll || !reg || !pass) {
      alert('Name, Roll Number, Registration Number aur Password khali nahi ho sakte.');
      return;
    }

    const clash = storage
      .getStudents()
      .find(
        (x) =>
          String(x.id) !== String(editing.id) &&
          (x.regNumber.trim().toLowerCase() === reg.toLowerCase() ||
            x.rollNumber.trim().toLowerCase() === roll.toLowerCase())
      );
    if (clash) {
      alert(`Ye Roll/Registration number "${clash.name}" ke paas pehle se hai.`);
      return;
    }

    storage.updateStudent(editing.id, {
      name: n,
      email: editing.email.trim(),
      rollNumber: roll,
      regNumber: reg,
      department: editing.department,
      password: pass,
    });
    setEditing(null);
    refresh();
  };

  useEffect(() => {
    refresh();
  }, []);

  const add = () => {
    if (!name.trim() || !rollNumber.trim() || !regNumber.trim()) {
      alert('Please fill Name, Roll Number and Registration Number.');
      return;
    }

    const finalPassword = manualPassword ? password : rollNumber;

    if (!finalPassword.trim()) {
      alert('Please enter a manual password.');
      return;
    }

    storage.addStudent({
      name: name.trim(),
      email: email.trim(), // Email is optional.
      rollNumber: rollNumber.trim(),
      regNumber: regNumber.trim(),
      department: branch,
      password: finalPassword.trim(),
    });

    setName('');
    setEmail('');
    setRollNumber('');
    setRegNumber('');
    setPassword('');
    setManualPassword(false);
    refresh();
  };

  const handleFileChosen = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setImportMessage('');
    setImportPreview(null);
    setImportBusy(true);
    try {
      const parsed = await parseStudentFile(file, storage.getStudents());
      setImportPreview({ ...parsed, fileName: file.name });
    } catch (error) {
      setImportIsError(true);
      setImportMessage(error instanceof Error ? error.message : 'Could not read this file.');
    } finally {
      setImportBusy(false);
    }
  };

  const confirmImport = async () => {
    if (!importPreview || importPreview.list.length === 0) return;
    setImportBusy(true);
    try {
      const created = await storage.addStudents(importPreview.list);
      setImportIsError(false);
      setImportMessage(`${created.length} students imported successfully.`);
      setImportPreview(null);
      refresh();
    } catch (error) {
      console.error('Student import failed:', error);
      setImportIsError(true);
      setImportMessage('Import failed while saving to the database. Please try again.');
      refresh();
    } finally {
      setImportBusy(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + STUDENT_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Student_Template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  };

  const query = search.trim().toLowerCase();
  const filteredStudents = query
    ? students.filter((s) =>
        [s.name, s.rollNumber, s.regNumber, s.department, s.email].some((value) =>
          (value || '').toLowerCase().includes(query)
        )
      )
    : students;

  const remove = (id: string) => {
    if (confirm('Delete this student account?')) {
      storage.deleteStudent(id);
      refresh();
    }
  };

  return (
    <section className="min-h-full p-5 md:p-7 bg-slate-50">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h2 className="text-3xl font-extrabold text-slate-900">Student Accounts</h2>
          <p className="text-sm text-slate-500 mt-1">
            Create student credentials and manage the six B.Tech branches.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-lg font-extrabold">Add Student</h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
              Roll No. → Password by default
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Student name"
              className="px-4 py-3 rounded-xl border border-slate-200"
            />

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email (Optional)"
              type="email"
              className="px-4 py-3 rounded-xl border border-slate-200"
            />

            <input
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              placeholder="Roll Number"
              className="px-4 py-3 rounded-xl border border-slate-200"
            />

            <input
              value={regNumber}
              onChange={(e) => setRegNumber(e.target.value)}
              placeholder="Registration Number"
              className="px-4 py-3 rounded-xl border border-slate-200"
            />

            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="px-4 py-3 rounded-xl border border-slate-200"
            >
              {BRANCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>

            <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                checked={manualPassword}
                onChange={(e) => setManualPassword(e.target.checked)}
              />
              <span className="text-sm font-semibold">Use manual password</span>
            </label>
          </div>

          {manualPassword ? (
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Manual password"
              className="w-full px-4 py-3 rounded-xl border border-slate-200"
            />
          ) : (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-600">
              Password will automatically be <strong>{rollNumber || 'the Roll Number'}</strong>.
            </div>
          )}

          <button
            type="button"
            onClick={add}
            className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold"
          >
            Create Student Account
          </button>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-extrabold">Bulk Upload Students (Excel)</h3>
              <p className="text-sm text-slate-500 mt-1">
                Columns: Name, Roll Number, Registration Number, Department, Email, Password. Leave Password
                blank to use the Roll Number.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadTemplate}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50"
              >
                Download CSV Template
              </button>
              <label
                className={`px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold cursor-pointer ${
                  importBusy ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {importBusy ? 'Please wait...' : 'Upload Excel / CSV'}
                <input
                  type="file"
                  accept=".xlsx,.xlsm,.csv"
                  className="hidden"
                  disabled={importBusy}
                  onChange={(e) => void handleFileChosen(e)}
                />
              </label>
            </div>
          </div>

          {importMessage && (
            <div
              className={`rounded-xl px-4 py-3 text-sm border ${
                importIsError
                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}
            >
              {importMessage}
            </div>
          )}

          {importPreview && (
            <div className="space-y-3">
              <div className="text-sm font-bold">
                {importPreview.fileName}:{' '}
                <span className="text-emerald-600">{importPreview.list.length} new</span>
                {' \u2022 '}
                <span className="text-amber-600">{importPreview.duplicates} already exist (skipped)</span>
                {' \u2022 '}
                <span className="text-rose-600">{importPreview.errors.length} problem(s)</span>
              </div>

              {importPreview.errors.length > 0 && (
                <ul className="list-disc pl-5 text-xs text-rose-700 max-h-28 overflow-auto">
                  {importPreview.errors.slice(0, 30).map((message, i) => (
                    <li key={i}>{message}</li>
                  ))}
                </ul>
              )}

              {importPreview.list.length > 0 && (
                <div className="overflow-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase">
                      <tr>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Roll</th>
                        <th className="text-left p-2">Registration</th>
                        <th className="text-left p-2">Branch</th>
                        <th className="text-left p-2">Email</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.list.slice(0, 8).map((s, i) => (
                        <tr key={i} className="border-t border-slate-100">
                          <td className="p-2 font-semibold">{s.name}</td>
                          <td className="p-2 font-mono">{s.rollNumber}</td>
                          <td className="p-2 font-mono">{s.regNumber}</td>
                          <td className="p-2">{s.department}</td>
                          <td className="p-2 text-slate-500">{s.email}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {importPreview.list.length > 8 && (
                <div className="text-xs text-slate-500">... and {importPreview.list.length - 8} more</div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={importBusy || importPreview.list.length === 0}
                  onClick={() => void confirmImport()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold"
                >
                  Import {importPreview.list.length} Students
                </button>
                <button
                  type="button"
                  onClick={() => setImportPreview(null)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-extrabold">
              Students ({query ? `${filteredStudents.length} of ${students.length}` : students.length})
            </h3>

            <div className="relative w-full sm:w-80">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">
                
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, roll, registration, branch or email"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  title="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <span className="material-symbols-outlined text-lg">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left p-4">Name</th>
                  <th className="text-left p-4">Roll</th>
                  <th className="text-left p-4">Registration</th>
                  <th className="text-left p-4">Branch</th>
                  <th className="text-left p-4">Email</th>
                  <th className="text-left p-4">Password</th>
                  <th className="p-4"></th>
                </tr>
              </thead>

              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} className="border-t border-slate-100">
                    <td className="p-4 font-semibold">{s.name}</td>
                    <td className="p-4 font-mono">{s.rollNumber}</td>
                    <td className="p-4 font-mono">{s.regNumber}</td>
                    <td className="p-4">{s.department}</td>
                    <td className="p-4 text-slate-500">{s.email || '—'}</td>
                    <td className="p-4 font-mono text-slate-500">{s.password}</td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setEditing({ ...s })}
                        className="text-blue-600 font-bold text-xs mr-4"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(s.id)}
                        className="text-rose-600 font-bold text-xs"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      {query ? `No student found for "${search.trim()}".` : 'No students added yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {editing && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-6 space-y-4">
            <h3 className="text-xl font-extrabold text-slate-900">Edit Student</h3>

            {([
              ['Name', 'name'],
              ['Roll Number', 'rollNumber'],
              ['Registration Number', 'regNumber'],
              ['Email (optional)', 'email'],
              ['Password', 'password'],
            ] as const).map(([label, key]) => (
              <label key={key} className="block text-sm font-semibold text-slate-600">
                {label}
                <input
                  value={editing[key] || ''}
                  onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                  className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
            ))}

            <label className="block text-sm font-semibold text-slate-600">
              Branch
              <select
                value={editing.department}
                onChange={(e) => setEditing({ ...editing, department: e.target.value })}
                className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm font-normal text-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              >
                {Array.from(new Set([...BRANCHES, editing.department])).map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveEdit}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
