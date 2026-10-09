import React, { useMemo, useState } from 'react';
import { storage, SAMPLE_MATH_QUESTIONS } from '../../services/storage';
import { ExamTest, Question } from '../../types';
import { DirectTestBuilder } from './DirectTestBuilder';
import { downloadQuestionTemplate } from '../../services/questionImport';
import { importQuestionsFromAnyFile, SUPPORTED_ACCEPT } from '../../services/universalImport';
import { QuestionReviewEditor, questionProblems } from './QuestionReviewEditor';

interface Props { onTestPublished: (test: ExamTest) => void; onPreviewStudentView: () => void; }
const BRANCHES = ['CSE (AI)', 'CSE', 'Mechanical', 'Civil', 'Civil with CA', 'EEE'];
type Mode = 'direct' | 'bank' | 'file';

const buildTest = (title: string, code: string, branch: string, questions: Question[]): ExamTest => ({
  id: `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
  title: title || 'New Examination', code: code || `TEST-${Date.now()}`,
  subject: title || 'General', paperRef: code || 'AUTO', department: branch || 'CSE (AI)',
  durationMinutes: 60, passingPercentage: 40, markingScheme: { correct: 1, incorrect: 0 }, questions,
  proctorRules: { tabBlurAutoSubmit: true, toleranceThreshold: 'zero_tolerance', blurSensitivity: 'instantaneous', fullscreenLock: true, webcamProctoring: false, clipboardLock: true, dualMonitorBlocker: true, securePasscode: `SEC-${Math.random().toString(36).slice(2, 8).toUpperCase()}` },
  status: 'published',
});

export const CreateTestStudio: React.FC<Props> = ({ onTestPublished, onPreviewStudentView }) => {
  const [mode, setMode] = useState<Mode>('direct');
  const [refreshKey, setRefreshKey] = useState(0);
  const [title, setTitle] = useState(''); const [code, setCode] = useState(''); const [branch, setBranch] = useState(BRANCHES[0]);
  const [selected, setSelected] = useState<number[]>([]); const [excelQuestions, setExcelQuestions] = useState<Question[]>([]); const [excelName, setExcelName] = useState(''); const [excelBusy, setExcelBusy] = useState(false); const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const tests = useMemo(() => storage.getTests(), [refreshKey]);
  const bankQuestions = SAMPLE_MATH_QUESTIONS || [];
  const selectedQuestions = bankQuestions.filter(q => selected.includes(Number(q.id)));

  const publishFromSource = (questions: Question[]) => {
    if (!questions.length) { alert('Please select/import at least one question first.'); return; }
    const test = buildTest(title, code, branch, questions); storage.addTest(test); onTestPublished(test); setRefreshKey(v => v + 1); alert(`Test created and published successfully.\n\nStudent PIN: ${test.accessPin}\n\nShare this PIN with students. They need it to open the test. You can see or change it later in Live Tests.`);
  };
  const handleExcel = async (file?: File) => {
    if (!file) return;
    setExcelBusy(true);
    try {
      const { questions, warnings } = await importQuestionsFromAnyFile(file, branch);
      setExcelQuestions(questions); setExcelName(file.name); setImportWarnings(warnings);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
    } catch (e) { alert(e instanceof Error ? e.message : 'File read nahi ho payi.'); setExcelQuestions([]); setExcelName(''); setImportWarnings([]); }
    finally { setExcelBusy(false); }
  };
  const publishReviewed = () => {
    const bad = excelQuestions.map((q, i) => ({ i, p: questionProblems(q) })).filter(x => x.p.length);
    if (bad.length) { alert(`Pehle ye fix karein:\n\n` + bad.slice(0, 8).map(x => `Q${x.i + 1}: ${x.p.join(', ')}`).join('\n')); return; }
    if (!title.trim() || !code.trim()) { alert('Test name aur Test code bharein.'); return; }
    if (!window.confirm(`${excelQuestions.length} questions ke saath test publish karein?`)) return;
    publishFromSource(excelQuestions.map((q, i) => ({ ...q, questionNumber: i + 1 })));
    setExcelQuestions([]); setExcelName(''); setImportWarnings([]);
  };
  const cards: [Mode,string,string,string][] = [['direct','01','Direct Test','Type questions yourself'],['bank','02','Question Bank','Pick questions from your bank'],['file','03','Upload File','PDF / Word / Excel → preview → publish']];
  return <section className="min-h-full p-5 md:p-7 bg-gradient-to-br from-slate-50 via-white to-blue-50/40"><div className="max-w-7xl mx-auto space-y-6">
    <div className="rounded-3xl bg-slate-950 text-white p-6 md:p-8 shadow-xl"><div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5"><div><span className="inline-flex px-3 py-1 rounded-full bg-white/10 border border-white/10 text-xs font-semibold text-blue-200">Test Creation Studio</span><h2 className="mt-4 text-3xl md:text-4xl font-extrabold">Create a new examination</h2><p className="mt-2 max-w-2xl text-sm text-slate-300">Choose how you want to build the test. Each workspace stays focused and uncluttered.</p></div><div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-2xl bg-white/10 px-5 py-3"><div className="text-2xl font-extrabold">{tests.length}</div><div className="text-[11px] text-slate-300">All Tests</div></div><div className="rounded-2xl bg-emerald-400/10 px-5 py-3"><div className="text-2xl font-extrabold text-emerald-300">{tests.filter(t=>t.status==='published').length}</div><div className="text-[11px] text-slate-300">Published</div></div></div></div></div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{cards.map(([key,n,label,text]) => <button key={key} type="button" onClick={()=>setMode(key)} className={`text-left rounded-2xl border p-5 transition hover:-translate-y-0.5 hover:shadow-md ${mode===key?'border-blue-400 bg-blue-50 shadow-sm':'border-slate-200 bg-white'}`}><div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-widest text-slate-400">{n}</span></div><h3 className="mt-4 font-extrabold text-slate-900">{label}</h3><p className="mt-1 text-xs text-slate-500">{text}</p></button>)}</div>
    {mode==='direct' && <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden"><div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between"><div><h3 className="text-lg font-extrabold">Direct Test Builder</h3><p className="text-xs text-slate-500 mt-1">Type questions, options and correct answers directly.</p></div><button type="button" onClick={onPreviewStudentView} className="px-4 py-2 rounded-xl bg-blue-50 text-blue-700 text-xs font-bold">Preview</button></div><div className="p-3 md:p-5"><DirectTestBuilder onTestPublished={test=>{onTestPublished(test);setRefreshKey(v=>v+1);const pin=test.accessPin||storage.getTests().find(t=>String(t.id)===String(test.id))?.accessPin;if(pin)alert(`Test published.\n\nStudent PIN: ${pin}\n\nShare this PIN with students. You can see or change it later in Live Tests.`)}} onPreviewStudentView={onPreviewStudentView}/></div></div>}
    {mode==='bank' && <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-5"><div><h3 className="text-xl font-extrabold">Question Bank → Test</h3><p className="text-sm text-slate-500">Select questions, set the test identity and publish.</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Test name" className="px-4 py-3 rounded-xl border border-slate-200"/><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Test code" className="px-4 py-3 rounded-xl border border-slate-200"/><select value={branch} onChange={e=>setBranch(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200">{BRANCHES.map(b=><option key={b}>{b}</option>)}</select></div><div className="flex items-center justify-between"><h4 className="font-bold">Available questions: {bankQuestions.length}</h4><button type="button" onClick={()=>setSelected(bankQuestions.map(q=>Number(q.id)))} className="text-xs font-bold text-blue-600">Select All</button></div><div className="grid gap-3 max-h-[420px] overflow-auto">{bankQuestions.map((q,i)=>{const id=Number(q.id),checked=selected.includes(id);return <label key={String(q.id)} className={`flex gap-3 p-4 rounded-2xl border cursor-pointer ${checked?'border-emerald-300 bg-emerald-50/60':'border-slate-200'}`}><input type="checkbox" checked={checked} onChange={()=>setSelected(s=>checked?s.filter(x=>x!==id):[...s,id])} className="mt-1"/><div><div className="text-xs font-bold text-slate-400">Q{i+1}</div><div className="text-sm font-semibold text-slate-800">{q.statement}</div></div></label>})}</div><button type="button" onClick={()=>publishFromSource(selectedQuestions)} className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Create Test from Selected Questions ({selectedQuestions.length})</button></div>}
    {mode==='file' && <div className="rounded-3xl bg-white border border-slate-200 shadow-sm p-6 space-y-5">
      <div className="flex items-start justify-between gap-3"><div><h3 className="text-xl font-extrabold">Upload Questions → Preview → Publish</h3><p className="text-sm text-slate-500">Kisi bhi format ki file upload karein: PDF, Word (.docx), Excel, CSV, TXT, JSON. Upload ke baad aap preview mein sab kuch edit kar sakte hain, phir publish.</p></div><button type="button" onClick={downloadQuestionTemplate} className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold shrink-0">Download Template</button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Test name" className="px-4 py-3 rounded-xl border border-slate-200"/><input value={code} onChange={e=>setCode(e.target.value)} placeholder="Test code" className="px-4 py-3 rounded-xl border border-slate-200"/><select value={branch} onChange={e=>setBranch(e.target.value)} className="px-4 py-3 rounded-xl border border-slate-200">{BRANCHES.map(b=><option key={b}>{b}</option>)}</select></div>
      <label className="block rounded-2xl border-2 border-dashed border-emerald-300 bg-emerald-50/60 hover:bg-emerald-50 p-8 text-center cursor-pointer" onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();void handleExcel(e.dataTransfer.files?.[0]);}}>
        <div className="font-bold">{excelBusy?'Reading file...':excelName?'Upload a different file':'Click or drag & drop question file'}</div>
        <div className="text-xs text-slate-500 mt-1">{excelName?`${excelName} — ${excelQuestions.length} questions detected`:'.pdf, .docx, .xlsx, .csv, .txt, .json'}</div>
        <input type="file" accept={SUPPORTED_ACCEPT} className="hidden" onChange={e=>{void handleExcel(e.target.files?.[0]);e.target.value='';}}/>
      </label>
      {importWarnings.length>0 && <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900"><b>{importWarnings.length} cheezein check karein:</b><ul className="list-disc ml-5 mt-1">{importWarnings.slice(0,8).map((w,i)=><li key={i}>{w}</li>)}</ul></div>}
      {excelQuestions.length>0 && <>
        <div className="flex items-center justify-between"><h4 className="font-extrabold">Preview & Edit ({excelQuestions.length} questions)</h4><span className="text-xs text-slate-500">Green button = correct answer. Publish se pehle sab edit ho sakta hai.</span></div>
        <div className="max-h-[60vh] overflow-auto pr-1"><QuestionReviewEditor questions={excelQuestions} onChange={setExcelQuestions}/></div>
        <div className="flex flex-col sm:flex-row gap-3"><button type="button" onClick={publishReviewed} className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">Publish Test ({excelQuestions.length} questions)</button><button type="button" onClick={()=>{if(window.confirm('Preview discard karein?')){setExcelQuestions([]);setExcelName('');setImportWarnings([]);}}} className="px-6 py-3 rounded-xl border border-slate-300 text-slate-700 font-bold">Discard</button></div>
      </>}
    </div>}
  </div></section>;
};
