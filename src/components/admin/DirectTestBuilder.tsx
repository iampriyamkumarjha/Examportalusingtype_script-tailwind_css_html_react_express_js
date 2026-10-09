import React, { useState } from 'react';
import { ExamTest, Question } from '../../types';
import { storage } from '../../services/storage';

const BRANCHES = ['CSE (AI)', 'CSE', 'Mechanical', 'Civil', 'Civil with CA', 'EEE'];

interface Props { onTestPublished: (test: ExamTest) => void; onPreviewStudentView: () => void; }

export const DirectTestBuilder: React.FC<Props> = ({ onTestPublished, onPreviewStudentView }) => {
  const [title, setTitle] = useState(''); const [code, setCode] = useState(''); const [branch, setBranch] = useState(BRANCHES[0]);
  const [duration, setDuration] = useState(60); const [passing, setPassing] = useState(40);
  const [statement, setStatement] = useState(''); const [options, setOptions] = useState(['', '', '', '']); const [correct, setCorrect] = useState('A');
  const [questions, setQuestions] = useState<Question[]>([]);

  const addQuestion = () => {
    if (!statement.trim() || options.some(x => !x.trim())) { alert('Please enter the question and all 4 options.'); return; }
    const q = { id: Date.now() + questions.length, questionNumber: questions.length + 1, type: 'mcq_single', statement: statement.trim(), options: options.map((text, i) => ({ id: String.fromCharCode(65 + i), text: text.trim() })), correctOption: correct, marks: 1, negativeMarks: 0, section: branch } as Question;
    setQuestions([...questions, q]); setStatement(''); setOptions(['','','','']); setCorrect('A');
  };
  const publish = () => {
    if (!title.trim() || !code.trim() || !questions.length) { alert('Add Test Name, Test Code and at least one question.'); return; }
    const test: ExamTest = { id: `test_${Date.now()}_${Math.random().toString(36).slice(2,7)}`, title: title.trim(), code: code.trim(), subject: title.trim(), paperRef: code.trim(), department: branch, durationMinutes: Number(duration), passingPercentage: Number(passing), markingScheme: { correct: 1, incorrect: 0 }, questions, proctorRules: { tabBlurAutoSubmit: true, toleranceThreshold: 'zero_tolerance', blurSensitivity: 'instantaneous', fullscreenLock: true, webcamProctoring: false, clipboardLock: true, dualMonitorBlocker: true, securePasscode: `SEC-${Date.now()}` }, status: 'published' };
    storage.addTest(test); onTestPublished(test); alert('Test created and published successfully.');
  };
  return <div className="space-y-5">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Test name" className="px-4 py-3 rounded-xl border border-slate-200"/><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Test code" className="px-4 py-3 rounded-xl border border-slate-200"/><select value={branch} onChange={e=>setBranch(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200">{BRANCHES.map(b=><option key={b}>{b}</option>)}</select><div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Time (minutes)</label><input type="number" min={1} value={duration} onChange={e=>setDuration(Number(e.target.value))} placeholder="Time in minutes" className="w-full px-4 py-3 rounded-xl border border-slate-200"/></div><div><label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">Passing Percentage (%)</label><input type="number" min={0} max={100} value={passing} onChange={e=>setPassing(Number(e.target.value))} placeholder="Passing %" className="w-full px-4 py-3 rounded-xl border border-slate-200"/></div></div>
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 space-y-4"><div className="flex items-center justify-between"><h4 className="font-extrabold">Question {questions.length + 1}</h4><span className="text-xs text-slate-500">{questions.length} added</span></div><textarea value={statement} onChange={e=>setStatement(e.target.value)} placeholder="Type question here..." className="w-full min-h-28 rounded-xl border border-slate-200 bg-white p-4"/><div className="grid grid-cols-1 md:grid-cols-2 gap-3">{options.map((value,i)=><div key={i} className="flex gap-2"><span className="w-9 h-11 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold">{String.fromCharCode(65+i)}</span><input value={value} onChange={e=>setOptions(options.map((x,j)=>j===i?e.target.value:x))} placeholder={`Option ${String.fromCharCode(65+i)}`} className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white"/></div>)}</div><div className="flex flex-wrap items-center gap-4"><label className="text-sm font-semibold">Correct answer<select value={correct} onChange={e=>setCorrect(e.target.value)} className="ml-2 px-3 py-2 rounded-lg border border-slate-200">{['A','B','C','D'].map(x=><option key={x}>{x}</option>)}</select></label><button type="button" onClick={addQuestion} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold">Add Question</button></div></div>
    {questions.length>0 && <div className="space-y-2 max-h-64 overflow-auto">{questions.map((q,i)=><div key={String(q.id)} className="p-3 rounded-xl bg-white border border-slate-200 text-sm"><span className="font-bold">Q{i+1}.</span> {q.statement}<span className="ml-2 text-emerald-600 font-bold">Ans: {q.correctOption}</span></div>)}</div>}
    <div className="flex flex-col sm:flex-row gap-3"><button type="button" onClick={publish} className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold">Create & Publish Test</button><button type="button" onClick={onPreviewStudentView} className="px-6 py-3 rounded-xl border border-blue-200 text-blue-700 font-bold">Preview Student View</button></div>
  </div>;
};
