import React, { useRef, useState } from 'react';
import { storage } from '../../services/storage';
import { ExamTest, Question } from '../../types';
import { downloadQuestionTemplate } from '../../services/questionImport';
import { importQuestionsFromAnyFile, SUPPORTED_ACCEPT } from '../../services/universalImport';

interface Props {
  test: ExamTest;
  onBack: () => void;
}

const OPTION_IDS: Array<'A' | 'B' | 'C' | 'D'> = ['A', 'B', 'C', 'D'];

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export const TestQuestionEditor: React.FC<Props> = ({ test, onBack }) => {
  const [draft, setDraft] = useState<ExamTest>(() => clone(test));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const questions: Question[] = Array.isArray(draft.questions) ? draft.questions : [];
  const submittedCount = storage
    .getSubmissions()
    .filter((s) => String(s.testId) === String(test.id)).length;

  const update = (change: (next: ExamTest) => void) => {
    setDraft((prev) => {
      const next = clone(prev);
      change(next);
      return next;
    });
    setDirty(true);
  };

  const setQuestionField = <K extends keyof Question>(index: number, key: K, value: Question[K]) =>
    update((next) => {
      next.questions[index][key] = value;
    });

  const setOptionText = (qIndex: number, oIndex: number, text: string) =>
    update((next) => {
      next.questions[qIndex].options[oIndex].text = text;
    });

  const addQuestion = () =>
    update((next) => {
      next.questions = next.questions || [];
      const first = next.questions[0];
      const maxId = next.questions.reduce((m, q) => Math.max(m, Number(q.id) || 0), 0);
      next.questions.push({
        id: maxId + 1,
        questionNumber: next.questions.length + 1,
        type: 'mcq_single',
        statement: '',
        options: OPTION_IDS.map((id) => ({ id, text: '' })),
        correctOption: 'A',
        marks: first?.marks ?? 1,
        negativeMarks: first?.negativeMarks ?? 0,
        section: first?.section || 'General',
        explanation: '',
      });
    });

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImporting(true);
    try {
      const existing = Array.isArray(draft.questions) ? draft.questions : [];
      const maxId = existing.reduce((m, q) => Math.max(m, Number(q.id) || 0), 0);
      const res = await importQuestionsFromAnyFile(file, existing[0]?.section || 'General');
      const list = res.questions.map((q, i) => ({ ...q, id: maxId + 1 + i, questionNumber: existing.length + 1 + i }));
      const errors = res.warnings;

      if (list.length === 0) {
        window.alert('Koi valid question nahi mila.\n\n' + errors.slice(0, 8).join('\n'));
        return;
      }

      const note = errors.length ? `\n\n${errors.length} row skip hui:\n` + errors.slice(0, 8).join('\n') : '';
      if (!window.confirm(`${list.length} questions import honge aur is test mein add ho jayenge.${note}\n\nContinue?`)) return;

      update((next) => {
        next.questions = [...(next.questions || []), ...list];
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'File read nahi ho payi.');
    } finally {
      setImporting(false);
    }
  };

  const deleteQuestion = (index: number) => {
    if (!window.confirm(`Delete question ${index + 1}?`)) return;
    update((next) => {
      next.questions.splice(index, 1);
    });
  };

  const goBack = () => {
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    onBack();
  };

  const save = async () => {
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!String(q.statement || '').trim()) {
        window.alert(`Question ${i + 1} has no text.`);
        return;
      }
      if (Array.isArray(q.options) && q.options.length > 0 && !q.options.some((o) => o.id === q.correctOption)) {
        window.alert(`Question ${i + 1}: please select the correct option.`);
        return;
      }
    }

    setSaving(true);
    try {
      const next = clone(draft);
      next.questions = (next.questions || []).map((q, i) => ({ ...q, questionNumber: i + 1 }));
      next.durationMinutes = Number(next.durationMinutes) || 60;
      next.passingPercentage = Number(next.passingPercentage) || 0;
      next.updatedAt = new Date().toISOString();

      await storage.saveTest(next);
      setDraft(next);
      setDirty(false);
      window.alert('Test saved. Students will see the updated questions.');
    } catch (error) {
      console.error('Unable to save test:', error);
      window.alert('Could not save the test. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white text-slate-900';
  const labelClass = 'block text-[11px] font-bold uppercase text-slate-500 mb-1';

  return (
    <section className="w-full p-5 md:p-6 bg-slate-50 text-slate-900">
      <div className="max-w-5xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={goBack}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50"
          >
            &larr; Back to Live Tests
          </button>
          <div className="flex gap-2">
            <input
              ref={fileRef}
              type="file"
              accept={SUPPORTED_ACCEPT}
              className="hidden"
              onChange={(e) => void handleExcelUpload(e)}
            />
            <button
              type="button"
              onClick={downloadQuestionTemplate}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-sm font-bold"
            >
              Template
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="px-4 py-2 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 text-sm font-bold disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Upload Excel'}
            </button>
            <button
              type="button"
              onClick={addQuestion}
              className="px-4 py-2 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 text-sm font-bold"
            >
              + Add Question
            </button>
            <button
              type="button"
              onClick={() => void save()}
              disabled={saving || !dirty}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {submittedCount > 0 && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3">
            {submittedCount} student(s) have already submitted this test. Changing correct answers will NOT
            re-calculate their saved marks.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className={labelClass}>Test Title</label>
              <input
                className={inputClass}
                value={draft.title || ''}
                onChange={(e) => update((n) => { n.title = e.target.value; })}
              />
            </div>
            <div>
              <label className={labelClass}>Duration (min)</label>
              <input
                type="number"
                className={inputClass}
                value={draft.durationMinutes ?? ''}
                onChange={(e) => update((n) => { n.durationMinutes = Number(e.target.value); })}
              />
            </div>
            <div>
              <label className={labelClass}>Passing %</label>
              <input
                type="number"
                className={inputClass}
                value={draft.passingPercentage ?? ''}
                onChange={(e) => update((n) => { n.passingPercentage = Number(e.target.value); })}
              />
            </div>
          </div>
        </div>

        <h3 className="text-lg font-extrabold">Questions ({questions.length})</h3>

        {questions.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-slate-500 text-sm">
            No questions in this test. Click &quot;+ Add Question&quot;.
          </div>
        )}

        {questions.map((q, i) => (
          <div key={`${q.id}-${i}`} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <strong className="text-sm">Q{i + 1}</strong>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Marks</span>
                <input
                  type="number"
                  className={`${inputClass} !w-20`}
                  value={q.marks ?? ''}
                  onChange={(e) => setQuestionField(i, 'marks', Number(e.target.value))}
                />
                <button
                  type="button"
                  onClick={() => deleteQuestion(i)}
                  className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold"
                >
                  Delete
                </button>
              </div>
            </div>

            <textarea
              className={`${inputClass} min-h-[70px]`}
              value={q.statement || ''}
              onChange={(e) => setQuestionField(i, 'statement', e.target.value)}
              placeholder="Question text"
            />

            <div className="space-y-2">
              {(q.options || []).map((option, j) => (
                <div key={option.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`correct-${i}`}
                    checked={q.correctOption === option.id}
                    onChange={() => setQuestionField(i, 'correctOption', option.id)}
                    title="Mark as correct answer"
                  />
                  <span className="font-bold w-5">{option.id}</span>
                  <input
                    className={inputClass}
                    value={option.text || ''}
                    onChange={(e) => setOptionText(i, j, e.target.value)}
                    placeholder={`Option ${option.id}`}
                  />
                </div>
              ))}
            </div>

            <div className="text-xs text-emerald-700">
              Correct answer: {q.correctOption || 'not set'} (select the radio button to change)
            </div>

            <div>
              <label className={labelClass}>Explanation (optional)</label>
              <textarea
                className={`${inputClass} min-h-[44px]`}
                value={q.explanation || ''}
                onChange={(e) => setQuestionField(i, 'explanation', e.target.value)}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
