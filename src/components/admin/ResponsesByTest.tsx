import React, { useEffect, useMemo, useState } from 'react';
import { storage } from '../../services/storage';
import { ExamSubmission, ExamTest } from '../../types';

const testName = (t: ExamTest) => t.title || t.subject || `Test ${t.id}`;

const optionText = (q: ExamTest['questions'][number], id: string | null | undefined) => {
  if (!id) return '';
  const option = (q.options || []).find((o) => o.id === id);
  return option ? `${id}) ${option.text || ''}` : id;
};

const csvCell = (value: unknown) => {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

const ResponseDetail: React.FC<{ submission: ExamSubmission; test?: ExamTest }> = ({ submission, test }) => {
  const answers = (submission.answers || {}) as Record<string, { selectedOption?: string | null }>;
  const questions =
    test && Array.isArray(test.questions) && test.questions.length > 0
      ? test.questions
      : [];

  if (questions.length === 0) {
    return (
      <div className="p-4 text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
        Questions of this test are no longer available, so answers cannot be shown.
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
      {questions.map((q, i) => {
        const selected = answers[String(q.id)]?.selectedOption || null;
        const attempted = !!selected;
        const correct = attempted && !!q.correctOption && selected === q.correctOption;
        const badge = !attempted
          ? { label: 'Not attempted', cls: 'bg-slate-100 text-slate-600' }
          : correct
            ? { label: 'Correct', cls: 'bg-emerald-100 text-emerald-800' }
            : { label: 'Wrong', cls: 'bg-rose-100 text-rose-800' };

        return (
          <div key={`${q.id}-${i}`} className="py-2.5 border-b border-slate-200 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div className="text-sm font-semibold text-slate-900">
                Q{i + 1}. {q.statement}
              </div>
              <span className={`text-[11px] font-extrabold px-2 py-0.5 rounded-full whitespace-nowrap ${badge.cls}`}>
                {badge.label}
              </span>
            </div>
            <div className="text-xs mt-1 text-slate-700">
              Student answer: <b>{attempted ? optionText(q, selected) : '\u2014'}</b>
            </div>
            {q.correctOption && (
              <div className="text-xs text-emerald-700">
                Correct answer: <b>{optionText(q, q.correctOption)}</b>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export const ResponsesByTest: React.FC = () => {
  const [tests, setTests] = useState<ExamTest[]>([]);
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [testId, setTestId] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      await storage.syncFromFirebase();
    } catch (error) {
      console.error(error);
    }
    setTests(storage.getTests());
    setSubmissions(storage.getSubmissions());
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  // Test dropdown: every known test, plus tests that only exist in old submissions.
  const options = useMemo(() => {
    const map = new Map<string, string>();
    tests.forEach((t) => map.set(String(t.id), testName(t)));
    submissions.forEach((s) => {
      if (!map.has(String(s.testId))) map.set(String(s.testId), s.testTitle || `Test ${s.testId}`);
    });
    return Array.from(map.entries());
  }, [tests, submissions]);

  useEffect(() => {
    if (!testId && options.length > 0) {
      const withData = options.find(([id]) => submissions.some((s) => String(s.testId) === id));
      setTestId((withData || options[0])[0]);
    }
  }, [options, submissions, testId]);

  const test = tests.find((t) => String(t.id) === testId);
  const all = submissions.filter((s) => String(s.testId) === testId);
  const q = query.trim().toLowerCase();
  const list = all
    .filter(
      (s) =>
        !q ||
        [s.studentName, s.studentReg, s.studentRoll].some((v) => String(v || '').toLowerCase().includes(q))
    )
    .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));

  const exportCsv = () => {
    if (all.length === 0) {
      alert('No responses for this test yet.');
      return;
    }
    const questions = test && Array.isArray(test.questions) ? test.questions : [];
    const header = ['Reg No', 'Roll No', 'Name', 'Department', 'Marks', 'Max Marks', '%', 'Submitted At'].concat(
      questions.map((_q, i) => `Q${i + 1}`)
    );
    const rows = all.map((s) => {
      const answers = (s.answers || {}) as Record<string, { selectedOption?: string | null }>;
      return [
        s.studentReg,
        s.studentRoll,
        s.studentName,
        s.studentDepartment,
        s.totalMarks,
        s.maxMarks,
        s.percentageScore,
        s.submittedAt,
      ].concat(questions.map((qq) => answers[String(qq.id)]?.selectedOption || '-'));
    });

    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Responses_${(test ? testName(test) : testId).replace(/[^a-z0-9]+/gi, '_')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(link.href), 1500);
  };

  const esc = (v: unknown) =>
    String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // jspdf ki zarurat nahi: browser ka print dialog khulta hai -> "Save as PDF" chuno.
  const exportPdf = (subs: ExamSubmission[], single = false) => {
    if (subs.length === 0) {
      alert('No responses for this test yet.');
      return;
    }
    const title = test ? testName(test) : subs[0].testTitle || `Test ${testId}`;
    const questions = test && Array.isArray(test.questions) ? test.questions : [];
    const sorted = [...subs].sort((a, b) => String(a.studentReg || '').localeCompare(String(b.studentReg || '')));

    const summary = single
      ? ''
      : `<h1>Test: ${esc(title)}</h1>
         <p class="muted">Total responses: ${sorted.length} &nbsp;|&nbsp; Generated: ${esc(new Date().toLocaleString())}</p>
         <table><thead><tr><th>#</th><th>Reg No</th><th>Roll No</th><th>Name</th><th>Marks</th><th>%</th><th>Result</th><th>Submitted</th></tr></thead><tbody>
         ${sorted
           .map(
             (s, i) => `<tr><td>${i + 1}</td><td>${esc(s.studentReg)}</td><td>${esc(s.studentRoll)}</td><td>${esc(s.studentName)}</td>
             <td>${esc(s.totalMarks)} / ${esc(s.maxMarks)}</td><td>${esc(s.percentageScore)}%</td>
             <td>${s.passed ? 'Pass' : 'Fail'}</td><td>${esc(s.submittedAt ? s.submittedAt.slice(0, 16).replace('T', ' ') : '-')}</td></tr>`
           )
           .join('')}
         </tbody></table>`;

    const details = sorted
      .map((s, idx) => {
        const answers = (s.answers || {}) as Record<string, { selectedOption?: string | null }>;
        const rows = questions
          .map((q, i) => {
            const sel = answers[String(q.id)]?.selectedOption || null;
            const status = !sel ? 'Not attempted' : sel === q.correctOption ? 'Correct' : 'Wrong';
            const cls = status === 'Correct' ? 'ok' : status === 'Wrong' ? 'bad' : 'muted';
            return `<tr><td>${i + 1}</td><td>${esc(sel || '-')}</td><td>${esc(q.correctOption || '-')}</td><td class="${cls}">${status}</td></tr>`;
          })
          .join('');
        const breakCls = single && idx === 0 ? '' : 'pb';
        return `<div class="${breakCls}">
          <h2>${esc(s.studentName || '-')} (${esc(s.studentReg || '-')})</h2>
          <p class="muted">${esc(title)} &nbsp;|&nbsp; Roll: ${esc(s.studentRoll || '-')} &nbsp;|&nbsp; Dept: ${esc(s.studentDepartment || '-')}</p>
          <p class="muted">Marks: ${esc(s.totalMarks)}/${esc(s.maxMarks)} (${esc(s.percentageScore)}%) &nbsp; Correct: ${esc(s.correctAnswersCount)} &nbsp; Wrong: ${esc(s.incorrectAnswersCount)} &nbsp; Skipped: ${esc(s.unattemptedCount)}</p>
          ${
            rows
              ? `<table><thead><tr><th>Q</th><th>Student Answer</th><th>Correct Answer</th><th>Result</th></tr></thead><tbody>${rows}</tbody></table>`
              : '<p class="muted">Questions of this test are no longer available.</p>'
          }</div>`;
      })
      .join('');

    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
      <style>
        body{font-family:Arial,sans-serif;color:#0f172a;padding:20px;font-size:12px}
        h1{font-size:18px;margin:0 0 4px} h2{font-size:15px;margin:0 0 4px}
        table{border-collapse:collapse;width:100%;margin:10px 0}
        th,td{border:1px solid #cbd5e1;padding:5px 7px;text-align:left}
        th{background:#e2e8f0} .muted{color:#64748b} .ok{color:#16a34a;font-weight:bold} .bad{color:#dc2626;font-weight:bold}
        .pb{page-break-before:always}
        @media print{body{padding:0}}
      </style></head><body>${summary}${details}</body></html>`;

    const w = window.open('', '_blank');
    if (!w) {
      alert('Popup block ho gaya. Browser mein is site ke liye popups allow karo.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm bg-white text-slate-900';

  return (
    <div className="max-w-[1440px] mx-auto px-6 pt-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">Submitted Responses by Test</h2>
            <p className="text-sm text-slate-500 mt-1">
              Select a test to see every student&apos;s submitted answers.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50"
            >
              {loading ? 'Loading...' : 'Refresh'}
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold"
            >
              Export this test (CSV)
            </button>
            <button
              type="button"
              onClick={() => exportPdf(all)}
              className="px-4 py-2 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 text-sm font-bold"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <select
            value={testId}
            onChange={(e) => {
              setTestId(e.target.value);
              setOpenId(null);
            }}
            className={inputClass}
          >
            {options.length === 0 && <option value="">No tests found</option>}
            {options.map(([id, name]) => (
              <option key={id} value={id}>
                {name} ({submissions.filter((s) => String(s.testId) === id).length} submitted)
              </option>
            ))}
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name / reg no / roll no"
            className={inputClass}
          />
        </div>

        {all.length === 0 ? (
          <div className="py-8 text-center text-sm text-slate-500">
            No responses submitted for this test yet.
          </div>
        ) : (
          <div className="overflow-auto border border-slate-200 rounded-xl">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                <tr>
                  <th className="text-left p-3">#</th>
                  <th className="text-left p-3">Reg No.</th>
                  <th className="text-left p-3">Name</th>
                  <th className="text-left p-3">Marks</th>
                  <th className="text-left p-3">%</th>
                  <th className="text-left p-3">Submitted</th>
                  <th className="text-left p-3">Response</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s, i) => {
                  const open = openId === s.id;
                  return (
                    <React.Fragment key={`${s.id}-${i}`}>
                      <tr className={`border-t border-slate-100 ${open ? 'bg-blue-50' : ''}`}>
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3 font-mono font-bold text-blue-600">{s.studentReg}</td>
                        <td className="p-3 font-bold">{s.studentName}</td>
                        <td className="p-3">
                          {s.totalMarks} / {s.maxMarks}
                        </td>
                        <td
                          className={`p-3 font-extrabold ${
                            s.percentageScore >= 40 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {s.percentageScore}%
                        </td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">
                          {s.submittedAt ? s.submittedAt.slice(0, 16).replace('T', ' ') : '\u2014'}
                        </td>
                        <td className="p-3">
                          <button
                            type="button"
                            onClick={() => setOpenId(open ? null : s.id)}
                            className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                              open
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-white text-blue-600 border-blue-200'
                            }`}
                          >
                            {open ? 'Hide' : 'View Response'}
                          </button>
                          <button
                            type="button"
                            onClick={() => exportPdf([s], true)}
                            className="ml-2 px-3 py-1.5 rounded-lg border border-rose-200 bg-white text-rose-600 text-xs font-bold"
                          >
                            PDF
                          </button>
                        </td>
                      </tr>
                      {open && (
                        <tr>
                          <td colSpan={7} className="p-0">
                            <ResponseDetail submission={s} test={test} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
