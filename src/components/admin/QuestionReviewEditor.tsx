import React from 'react';
import { Question } from '../../types';

interface Props {
  questions: Question[];
  onChange: (next: Question[]) => void;
}

const IDS = ['A', 'B', 'C', 'D'] as const;

const renumber = (list: Question[]): Question[] => list.map((q, i) => ({ ...q, questionNumber: i + 1 }));

/** Question ke saath kya problem hai (publish se pehle dikhane ke liye) */
export const questionProblems = (q: Question): string[] => {
  const p: string[] = [];
  if (!q.statement.trim()) p.push('Question text khali hai');
  q.options.forEach((o) => { if (!o.text.trim()) p.push(`Option ${o.id} khali hai`); });
  return p;
};

export const QuestionReviewEditor: React.FC<Props> = ({ questions, onChange }) => {
  const patch = (i: number, part: Partial<Question>) =>
    onChange(questions.map((q, idx) => (idx === i ? { ...q, ...part } : q)));

  const setOption = (i: number, k: number, text: string) =>
    onChange(questions.map((q, idx) => (idx === i ? { ...q, options: q.options.map((o, j) => (j === k ? { ...o, text } : o)) } : q)));

  const remove = (i: number) => onChange(renumber(questions.filter((_, idx) => idx !== i)));

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= questions.length) return;
    const next = [...questions];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(renumber(next));
  };

  const add = () =>
    onChange(renumber([
      ...questions,
      {
        id: Date.now() + questions.length, questionNumber: questions.length + 1, type: 'mcq_single', statement: '',
        options: IDS.map((id) => ({ id, text: '' })), correctOption: 'A', marks: 1, negativeMarks: 0,
        section: questions[questions.length - 1]?.section || 'General', explanation: '',
      },
    ]));

  return (
    <div className="space-y-4">
      {questions.map((q, i) => {
        const problems = questionProblems(q);
        return (
          <div key={q.id} className={`rounded-2xl border p-4 space-y-3 bg-white ${problems.length ? 'border-amber-300' : 'border-slate-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-extrabold">Q{i + 1}</span>
              <div className="flex items-center gap-2 text-xs">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-30">↑</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === questions.length - 1} className="px-2 py-1 rounded-lg border border-slate-200 disabled:opacity-30">↓</button>
                <button type="button" onClick={() => remove(i)} className="px-3 py-1 rounded-lg border border-red-200 text-red-600 font-bold">Delete</button>
              </div>
            </div>

            {problems.length > 0 && (
              <div className="text-[11px] rounded-lg bg-amber-50 border border-amber-200 text-amber-900 px-3 py-1.5">⚠ {problems.join(' • ')}</div>
            )}

            <textarea value={q.statement} onChange={(e) => patch(i, { statement: e.target.value })} placeholder="Question text"
              className="w-full min-h-20 rounded-xl border border-slate-200 p-3 text-sm" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {q.options.map((o, k) => {
                const right = q.correctOption === o.id;
                return (
                  <div key={o.id} className="flex items-center gap-2">
                    <button type="button" title="Mark as correct answer" onClick={() => patch(i, { correctOption: o.id })}
                      className={`w-9 h-10 shrink-0 rounded-lg border text-sm font-bold ${right ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-200 text-slate-600'}`}>
                      {o.id}
                    </button>
                    <input value={o.text} onChange={(e) => setOption(i, k, e.target.value)} placeholder={`Option ${o.id}`}
                      className={`flex-1 px-3 py-2 rounded-xl border text-sm ${right ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200'}`} />
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <label className="block">Marks
                <input type="number" min={0} step="0.25" value={q.marks} onChange={(e) => patch(i, { marks: Number(e.target.value) })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
              <label className="block">Negative
                <input type="number" min={0} step="0.25" value={q.negativeMarks} onChange={(e) => patch(i, { negativeMarks: Math.abs(Number(e.target.value)) })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
              <label className="block md:col-span-2">Section
                <input value={q.section} onChange={(e) => patch(i, { section: e.target.value })} className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-200" /></label>
            </div>

            <input value={q.explanation || ''} onChange={(e) => patch(i, { explanation: e.target.value })} placeholder="Explanation (optional)"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs" />
          </div>
        );
      })}
      <button type="button" onClick={add} className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-600 font-bold text-sm hover:bg-slate-50">+ Add question</button>
    </div>
  );
};
