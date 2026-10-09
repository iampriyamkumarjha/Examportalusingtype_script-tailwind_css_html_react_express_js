import React, { useState } from 'react';
import { storage, SAMPLE_MATH_QUESTIONS } from '../../services/storage';
import { ExamTest, Question, ProctorRules } from '../../types';
import { QuestionBankModal } from './QuestionBankModal';
import { PdfUploadModal } from './PdfUploadModal';

interface CreateTestWizardProps {
  onTestPublished: (test: ExamTest) => void;
  onPreviewStudentView?: () => void;
}

export const CreateTestWizard: React.FC<CreateTestWizardProps> = ({
  onTestPublished,
  onPreviewStudentView,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: Details
  const [title, setTitle] = useState('Mathematics & Sciences (Paper I)');
  const [code, setCode] = useState('MCE-MATH-2025-CBT');
  const [subject, setSubject] = useState('Mathematics & Logic');
  const [department, setDepartment] = useState('B.Sc. (Computer Science)');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [passingPercentage, setPassingPercentage] = useState(40);
  const [correctMarks, setCorrectMarks] = useState(1.0);
  const [incorrectMarks, setIncorrectMarks] = useState(0.0);

  // Step 2: Questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Question Bank & PDF Upload Modals
  const [showQuestionBankModal, setShowQuestionBankModal] = useState(false);
  const [showPdfUploadModal, setShowPdfUploadModal] = useState(false);
  const [initialBankCategory, setInitialBankCategory] = useState<'all' | 'java' | 'python' | 'os' | 'dsa'>('all');

  // Step 3: Proctoring & Security Rules
  const [proctorRules, setProctorRules] = useState<ProctorRules>({
    tabBlurAutoSubmit: true,
    toleranceThreshold: 'zero_tolerance',
    blurSensitivity: 'instantaneous',
    fullscreenLock: true,
    webcamProctoring: true,
    clipboardLock: true,
    dualMonitorBlocker: true,
    allowedSubnet: 'Campus Subnet Only (192.168.1.0/24) + Proctor VPN',
    securePasscode: 'MCE-MATH-9921',
  });

  const [startDate, setStartDate] = useState('Oct 15, 2026 - 09:00 AM IST');
  const [endDate, setEndDate] = useState('Oct 15, 2026 - 12:00 PM IST');
  const [eligibleCohort, setEligibleCohort] = useState('B.Sc. Computer Science (Semester 3)');

  // Modal State
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [confirmAuditCheck, setConfirmAuditCheck] = useState(true);
  const [chiefExaminerPin, setChiefExaminerPin] = useState('94827104');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Initialize with at least 1 question if empty
  const ensureInitialQuestion = () => {
    if (questions.length === 0) {
      setQuestions([
        {
          id: 1,
          questionNumber: 1,
          type: 'mcq_single',
          statement:
            'If set A = {1, 2, 3, 4}, then find the total number of functions on set A, which are NOT one-to-one (injective)?',
          options: [
            { id: 'A', text: '24 functions' },
            { id: 'B', text: '232 functions (256 - 24 = 232)' },
            { id: 'C', text: '256 functions' },
            { id: 'D', text: '216 functions' },
          ],
          correctOption: 'B',
          marks: 1.0,
          negativeMarks: 0.0,
          section: 'Mathematics & Logic',
          explanation:
            'Total possible functions from A to A = 4^4 = 256. Number of one-to-one (injective) functions = 4! = 24. Hence, functions which are NOT one-to-one = 256 - 24 = 232.',
        },
      ]);
    }
  };

  const loadSampleQuestions = () => {
    setQuestions(SAMPLE_MATH_QUESTIONS);
    setCurrentQuestionIndex(4); // Focus on Q5 as in reference
  };

  const handleOpenBank = (category: 'all' | 'java' | 'python' | 'os' | 'dsa' = 'all') => {
    setInitialBankCategory(category);
    setShowQuestionBankModal(true);
  };

  const handleImportFromBank = (imported: Question[]) => {
    setQuestions((prev) => {
      const isOnlyInitialBlank = prev.length === 1 && prev[0].statement.trim().length === 0;
      const base = isOnlyInitialBlank ? [] : prev;
      const startId = base.length;
      const renumbered = imported.map((q, idx) => ({
        ...q,
        id: startId + idx + 1,
        questionNumber: startId + idx + 1,
      }));
      return [...base, ...renumbered];
    });

    if (title === 'Mathematics & Sciences (Paper I)' || !title) {
      if (initialBankCategory === 'java') {
        setTitle('Java Programming & Object Oriented Architecture');
        setCode('MCE-JAVA-2026-CBT');
        setSubject('Java Programming & JVM');
      } else if (initialBankCategory === 'python') {
        setTitle('Python Core & Advanced Programming Exam');
        setCode('MCE-PY-2026-CBT');
        setSubject('Python Software Engineering');
      } else if (initialBankCategory === 'os') {
        setTitle('Operating Systems & Concurrency Assessment');
        setCode('MCE-OS-2026-CBT');
        setSubject('Operating Systems');
      } else if (initialBankCategory === 'dsa') {
        setTitle('Data Structures & Algorithms (DSA) Examination');
        setCode('MCE-DSA-2026-CBT');
        setSubject('Data Structures & Algorithms');
      }
    }
    setSaveSuccessMsg(`Successfully imported ${imported.length} question(s) from Question Bank into examination!`);
    setCurrentQuestionIndex((prev) => (questions.length === 0 ? 0 : prev));
  };

  const handleImportFromPdf = (imported: Question[]) => {
    setQuestions((prev) => {
      const isOnlyInitialBlank = prev.length === 1 && prev[0].statement.trim().length === 0;
      const base = isOnlyInitialBlank ? [] : prev;
      const startId = base.length;
      const renumbered = imported.map((q, idx) => ({
        ...q,
        id: startId + idx + 1,
        questionNumber: startId + idx + 1,
      }));
      return [...base, ...renumbered];
    });
    setSaveSuccessMsg(`Successfully extracted and uploaded ${imported.length} question(s) from PDF document!`);
    setCurrentQuestionIndex((prev) => (questions.length === 0 ? 0 : prev));
  };

  const activeQuestion: Question =
    questions[currentQuestionIndex] || {
      id: 1,
      questionNumber: 1,
      type: 'mcq_single',
      statement: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' },
      ],
      correctOption: 'A',
      marks: 1.0,
      negativeMarks: 0.0,
      section: 'Mathematics & Logic',
      explanation: '',
    };

  const handleUpdateCurrentQuestion = (updates: Partial<Question>) => {
    setQuestions((prev) => {
      const copy = [...prev];
      if (!copy[currentQuestionIndex]) {
        copy[currentQuestionIndex] = { ...activeQuestion, ...updates };
      } else {
        copy[currentQuestionIndex] = { ...copy[currentQuestionIndex], ...updates };
      }
      return copy;
    });
  };

  const handleAddQuestion = () => {
    const nextNum = questions.length + 1;
    const newQ: Question = {
      id: nextNum,
      questionNumber: nextNum,
      type: 'mcq_single',
      statement: `Question ${nextNum} Statement: Enter question details here...`,
      options: [
        { id: 'A', text: 'Option A' },
        { id: 'B', text: 'Option B' },
        { id: 'C', text: 'Option C' },
        { id: 'D', text: 'Option D' },
      ],
      correctOption: 'A',
      marks: correctMarks,
      negativeMarks: incorrectMarks,
      section: subject,
      explanation: '',
    };
    setQuestions([...questions, newQ]);
    setCurrentQuestionIndex(questions.length);
  };

  const handleDeleteQuestion = (idx: number) => {
    if (questions.length <= 1) {
      alert('Examination must contain at least one question.');
      return;
    }
    const filtered = questions.filter((_, i) => i !== idx);
    // renumber
    const renumbered = filtered.map((q, i) => ({
      ...q,
      questionNumber: i + 1,
      id: i + 1,
    }));
    setQuestions(renumbered);
    setCurrentQuestionIndex(Math.max(0, idx - 1));
  };

  const handlePublishTest = () => {
    if (questions.length === 0) {
      alert('Please add at least one question to the exam.');
      return;
    }

    const testId = `test_${Date.now()}`;
    const newTest: ExamTest = {
      id: testId,
      title,
      code,
      subject,
      paperRef: `CBT-ENG-${String(Math.floor(Math.random() * 90) + 10)}`,
      department,
      durationMinutes,
      passingPercentage,
      markingScheme: {
        correct: correctMarks,
        incorrect: incorrectMarks,
      },
      questions,
      proctorRules,
      status: 'published',
      publishedAt: new Date().toISOString(),
      startTime: startDate,
      endTime: endDate,
    };

    storage.addTest(newTest);
    setShowPublishModal(false);
    setSaveSuccessMsg(`Examination "${title}" has been successfully configured and published to candidate terminals!`);
    onTestPublished(newTest);
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto">
      {/* Top Banner Notice if test published */}
      {saveSuccessMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-800 flex items-center justify-between shadow-sm animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <span className="font-semibold text-sm">{saveSuccessMsg}</span>
          </div>
          <button
            onClick={() => setSaveSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header and Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-blue-50 text-blue-700 font-bold text-xs px-2.5 py-0.5 rounded-md uppercase tracking-wider border border-blue-100">
              Assessment Authoring
            </span>
            <span className="text-slate-500 text-xs">• Paper Code: {code}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {currentStep === 3
              ? 'Proctoring, Security & Publishing Configuration'
              : 'Create & Configure Examination'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Design assessment questions, set proctoring parameters, configure timers, and publish high-stakes exams.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              ensureInitialQuestion();
              alert('Draft state saved locally.');
            }}
            className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-xs md:text-sm text-slate-700 transition flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span className="material-symbols-outlined text-slate-500 text-base">save</span>
            <span>Save as Draft</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (onPreviewStudentView) onPreviewStudentView();
              else alert('Previewing student exam view...');
            }}
            className="px-4 py-2.5 rounded-xl border border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold text-xs md:text-sm transition flex items-center gap-2 cursor-pointer"
          >
            <span className="material-symbols-outlined text-base">visibility</span>
            <span>Preview Student View</span>
          </button>
        </div>
      </div>

      {/* Stepper Progress Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Step 1 */}
          <div
            onClick={() => setCurrentStep(1)}
            className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
              currentStep === 1
                ? 'bg-blue-50/70 border-2 border-blue-600 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                currentStep > 1
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 1
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {currentStep > 1 ? <span className="material-symbols-outlined text-base">check</span> : '1'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Step 1</span>
              <span className="text-xs font-bold text-slate-900 truncate">Test Details & Parameters</span>
            </div>
          </div>

          {/* Step 2 */}
          <div
            onClick={() => {
              ensureInitialQuestion();
              setCurrentStep(2);
            }}
            className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
              currentStep === 2
                ? 'bg-blue-50/70 border-2 border-blue-600 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                currentStep > 2
                  ? 'bg-emerald-600 text-white'
                  : currentStep === 2
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-200 text-slate-600'
              }`}
            >
              {currentStep > 2 ? <span className="material-symbols-outlined text-base">check</span> : '2'}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Step 2</span>
              <span className="text-xs font-bold text-slate-900 truncate">
                Add & Manage Questions ({questions.length})
              </span>
            </div>
          </div>

          {/* Step 3 */}
          <div
            onClick={() => {
              ensureInitialQuestion();
              setCurrentStep(3);
            }}
            className={`flex items-center gap-3 p-3 rounded-xl border transition cursor-pointer ${
              currentStep === 3
                ? 'bg-blue-50/70 border-2 border-blue-600 shadow-xs'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                currentStep === 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              3
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Step 3 (Final)</span>
              <span className="text-xs font-bold text-slate-900 truncate">Proctoring & Publishing</span>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* STEP 1: TEST DETAILS & PARAMETERS                        */}
      {/* ======================================================== */}
      {currentStep === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 md:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Step 1: Test Details & Subject Parameters</h2>
              <p className="text-xs text-slate-500">Configure title, paper code, time limits, and passing criteria.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleOpenBank('all')}
                className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">menu_book</span>
                <span>Question Bank (Java/Py/OS/DSA)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPdfUploadModal(true)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">upload_file</span>
                <span>Upload PDF Sheet</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  loadSampleQuestions();
                  alert('Pre-loaded 20 Standard Mathematics & Logic Examination Questions!');
                }}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                <span>Math Blueprint</span>
              </button>
            </div>
          </div>

          {/* Quick Preset Selector for Java, Python, OS, DSA, PDF */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm border border-slate-800">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">Quick Exam Setup</span>
                <span className="text-[10px] bg-indigo-800/70 text-indigo-200 px-2 py-0.5 rounded-full font-mono">Instant Presets</span>
              </div>
              <p className="text-xs text-slate-300">
                Populate subject parameters and instant questions from curated question banks or extract directly from a PDF question paper:
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleOpenBank('java')}
                className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>☕ Java Bank (15)</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenBank('python')}
                className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-400/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>🐍 Python Bank (15)</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenBank('os')}
                className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>💻 OS Bank (15)</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenBank('dsa')}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-400/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span>⚡ DSA Bank (15)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowPdfUploadModal(true)}
                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-400/40 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                <span>Upload PDF</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Examination / Subject Title <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g. Mathematics & Sciences (Paper I)"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Test Code / Course Identifier <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g. MCE-MATH-2025-CBT"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary Taxonomy / Section</label>
              <input
                type="text"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                placeholder="e.g. Mathematics & Logic"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Eligible Department / Batch</label>
              <select
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
              >
                <option value="B.Sc. (Computer Science)">B.Sc. (Computer Science)</option>
                <option value="BCA">Bachelor of Computer Applications (BCA)</option>
                <option value="B.Tech">B.Tech (Engineering)</option>
                <option value="B.Sc. (Mathematics)">B.Sc. (Mathematics)</option>
                <option value="All Registered Students">All Registered Students</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Duration (in Minutes) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  max="360"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                  Minutes
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Passing Benchmark Percentage (%)</label>
              <div className="relative">
                <input
                  type="number"
                  min="10"
                  max="100"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  value={passingPercentage}
                  onChange={(e) => setPassingPercentage(Number(e.target.value))}
                />
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">%</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Marks for Correct Answer</label>
              <input
                type="number"
                step="0.5"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={correctMarks}
                onChange={(e) => setCorrectMarks(Number(e.target.value))}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Negative Marking Penalty</label>
              <input
                type="number"
                step="0.25"
                className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={incorrectMarks}
                onChange={(e) => setIncorrectMarks(Number(e.target.value))}
              />
              <span className="text-[11px] text-slate-400 mt-1 block">Set to 0.0 for zero negative marking penalty.</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                ensureInitialQuestion();
                setCurrentStep(2);
              }}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs md:text-sm rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 transition cursor-pointer"
            >
              <span>Next: Add Questions ({questions.length || 1})</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* STEP 2: ADD & MANAGE QUESTIONS                           */}
      {/* ======================================================== */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {/* Question Sourcing Hub */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-100 text-indigo-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded tracking-wide uppercase">
                    Question Bank & Document Sourcing
                  </span>
                  <span className="text-xs text-slate-500 font-medium">• 60+ Curated Questions or Direct PDF Parsing</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  Import Questions from Computer Science Question Bank or PDF Document
                </h3>
                <p className="text-xs text-slate-500">
                  Select questions from Java, Python, Operating Systems, and DSA question banks or upload questions directly from a PDF file.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenBank('all')}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-indigo-600/20 flex items-center gap-2 transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">library_books</span>
                  <span>Browse Question Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfUploadModal(true)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-rose-600/20 flex items-center gap-2 transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">picture_as_pdf</span>
                  <span>Upload PDF Questions</span>
                </button>
              </div>
            </div>

            {/* Category Quick Badges */}
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500 mr-1">Direct Bank Access:</span>
              <button
                type="button"
                onClick={() => handleOpenBank('java')}
                className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>☕ Java Bank (15 Qs)</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenBank('python')}
                className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>🐍 Python Bank (15 Qs)</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenBank('os')}
                className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>💻 OS Bank (15 Qs)</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenBank('dsa')}
                className="px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span>⚡ DSA Bank (15 Qs)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  loadSampleQuestions();
                  alert('Loaded Mathematics 20-Question Blueprint');
                }}
                className="px-3 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-xs">auto_fix_high</span>
                <span>Math 20-Q Set</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Question Editor (Cols 8) */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              {/* Question Header Toolbar */}
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">Question No.</span>
                  <select
                    value={currentQuestionIndex}
                    onChange={(e) => setCurrentQuestionIndex(Number(e.target.value))}
                    className="rounded-xl border border-slate-200 bg-white text-slate-800 font-bold text-xs py-1.5 px-3 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  >
                    {questions.map((q, idx) => (
                      <option key={q.id} value={idx}>
                        Question {String(idx + 1).padStart(2, '0')} of {questions.length}
                      </option>
                    ))}
                  </select>
                  <span className="bg-blue-100 text-blue-800 text-[11px] font-bold px-2 py-0.5 rounded">
                    Multiple Choice (MCQ)
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-slate-600 text-xs font-semibold">
                    <span>Marks:</span>
                    <span className="text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded font-mono">
                      +{activeQuestion.marks || correctMarks}
                    </span>
                    <span className="text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded font-mono">
                      -{activeQuestion.negativeMarks || incorrectMarks} Neg
                    </span>
                  </div>
                  {questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleDeleteQuestion(currentQuestionIndex)}
                      className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition cursor-pointer"
                      title="Delete this question"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Form Content */}
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Question Type *</label>
                    <select
                      value={activeQuestion.type}
                      onChange={(e) => handleUpdateCurrentQuestion({ type: e.target.value as any })}
                      className="w-full rounded-xl border border-slate-200 text-xs py-2 px-3 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                    >
                      <option value="mcq_single">Multiple Choice (Single Correct)</option>
                      <option value="mcq_multi">Multiple Select (MSQ)</option>
                      <option value="numerical">Numerical Value Entry</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">Section & Taxonomy</label>
                    <input
                      type="text"
                      value={activeQuestion.section || subject}
                      onChange={(e) => handleUpdateCurrentQuestion({ section: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 text-xs py-2 px-3 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                      placeholder="e.g. Mathematics & Logic"
                    />
                  </div>
                </div>

                {/* Question Statement */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800">
                      Question Statement & Formulae *{' '}
                      <span className="text-slate-400 font-normal">(LaTeX/TeX supported)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">
                      Character count: {activeQuestion.statement.length}
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={activeQuestion.statement}
                    onChange={(e) => handleUpdateCurrentQuestion({ statement: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 text-sm text-slate-800 p-3.5 focus:ring-blue-500 focus:border-blue-500 outline-none leading-relaxed"
                    placeholder="Enter question statement, mathematical formula, or problem description..."
                  />
                </div>

                {/* MCQ Options with Correct Key Selection */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-800">Answer Options & Correct Key</span>
                      <p className="text-[11px] text-slate-500">
                        Select the radio button corresponding to the authoritative evaluation answer key.
                      </p>
                    </div>
                    <span className="text-[11px] font-bold text-blue-600">
                      Key Selected: Option {activeQuestion.correctOption}
                    </span>
                  </div>

                  {(['A', 'B', 'C', 'D'] as const).map((optKey) => {
                    const opt = activeQuestion.options.find((o) => o.id === optKey) || {
                      id: optKey,
                      text: '',
                    };
                    const isCorrect = activeQuestion.correctOption === optKey;

                    return (
                      <div
                        key={optKey}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition ${
                          isCorrect
                            ? 'border-2 border-emerald-500 bg-emerald-50/50 shadow-xs'
                            : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`correct_key_${activeQuestion.id}`}
                          checked={isCorrect}
                          onChange={() => handleUpdateCurrentQuestion({ correctOption: optKey })}
                          className="h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                        <span
                          className={`font-bold text-sm w-6 ${isCorrect ? 'text-emerald-700' : 'text-slate-500'}`}
                        >
                          {optKey}.
                        </span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => {
                            const newOptions = activeQuestion.options.map((o) =>
                              o.id === optKey ? { ...o, text: e.target.value } : o
                            );
                            handleUpdateCurrentQuestion({ options: newOptions });
                          }}
                          placeholder={`Enter choice ${optKey}...`}
                          className="flex-1 bg-transparent border-none text-slate-800 text-xs md:text-sm font-medium focus:ring-0 p-0 outline-none"
                        />
                        {isCorrect && (
                          <span className="bg-emerald-600 text-white px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">check</span>
                            <span>Correct Key</span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Solution Rationale & Academic Explanation */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-base">school</span>
                    <span className="text-xs font-bold text-slate-800">
                      Solution Rationale & Academic Explanation
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={activeQuestion.explanation}
                    onChange={(e) => handleUpdateCurrentQuestion({ explanation: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white text-xs text-slate-800 p-2.5 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    placeholder="Enter academic step-by-step solution shown to candidate during review..."
                  />
                </div>

                {/* Question Actions */}
                <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-blue-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    <span>Add Another Question</span>
                  </button>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-50 transition cursor-pointer"
                    >
                      ← Previous (Details)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep(3)}
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <span>Next: Proctoring & Rules (Step 3)</span>
                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Test Summary & Question Palette (Cols 4) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Test Summary Card */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 bg-[#1e60d5] text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-lg">assignment</span>
                  <span className="font-bold text-sm">Test Summary</span>
                </div>
                <span className="bg-white/20 text-white text-[11px] px-2 py-0.5 rounded-full font-bold">Paper I</span>
              </div>
              <div className="p-5 divide-y divide-slate-100 text-xs">
                <div className="py-2.5 first:pt-0">
                  <span className="text-slate-400 block mb-0.5">Subject Name</span>
                  <span className="font-bold text-slate-900">{title}</span>
                </div>
                <div className="py-2.5">
                  <span className="text-slate-400 block mb-0.5">Test Code</span>
                  <span className="font-mono font-semibold text-blue-600">{code}</span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Total Questions</span>
                    <span className="font-bold text-slate-900">{questions.length} Questions</span>
                  </div>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-bold">
                    {questions.filter((q) => q.statement.trim().length > 0).length} Ready
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Duration</span>
                    <span className="font-bold text-slate-900">{durationMinutes} Minutes</span>
                  </div>
                  <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-semibold">
                    Countdown
                  </span>
                </div>
                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Passing Marks</span>
                    <span className="font-bold text-emerald-600">{passingPercentage}%</span>
                  </div>
                  <span className="text-slate-400 text-[11px]">
                    Min {Math.ceil((passingPercentage / 100) * questions.length)} correct
                  </span>
                </div>
                <div className="py-2.5 last:pb-0 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-600 text-sm">lock</span>
                    <span className="font-semibold text-slate-700">Anti-Cheating Guard</span>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded text-[10px]">
                    Tab Blur Strict
                  </span>
                </div>
              </div>
            </div>

            {/* Question Palette Navigator */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Question Palette</h3>
                  <span className="text-[11px] text-slate-400">Click to jump into any item</span>
                </div>
                <span className="text-xs font-mono font-bold text-blue-600">
                  {currentQuestionIndex + 1} / {questions.length}
                </span>
              </div>

              <div className="grid grid-cols-5 gap-2 pt-1">
                {questions.map((q, idx) => {
                  const isActive = currentQuestionIndex === idx;
                  const isConfigured = q.statement.trim().length > 0;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-9 rounded-xl font-bold text-xs flex items-center justify-center transition cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 text-white ring-4 ring-blue-100 shadow'
                          : isConfigured
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                          : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between text-[11px] pt-2 border-t border-slate-100 text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-600"></span> Configured
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-600"></span> Current
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-slate-300"></span> Draft
                </span>
              </div>
            </div>

            {/* Question Bank & PDF Quick Actions */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-4 text-center space-y-2.5">
              <span className="material-symbols-outlined text-indigo-600 text-2xl">library_books</span>
              <h4 className="text-xs font-bold text-indigo-950">Add Questions Easily</h4>
              <p className="text-[11px] text-indigo-700 leading-snug">
                Browse our curated Question Bank (Java, Python, OS, DSA) or upload questions from a PDF sheet.
              </p>
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleOpenBank('all')}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">menu_book</span>
                  <span>Browse Question Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPdfUploadModal(true)}
                  className="w-full py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                  <span>Upload Questions from PDF</span>
                </button>
                <button
                  type="button"
                  onClick={loadSampleQuestions}
                  className="w-full py-1.5 text-slate-500 hover:text-slate-800 text-[11px] font-semibold transition cursor-pointer"
                >
                  Load 20-Q Mathematics Paper
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ======================================================== */}
      {/* STEP 3: PROCTORING, SECURITY & PUBLISHING (Screen 8)     */}
      {/* ======================================================== */}
      {currentStep === 3 && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
          {/* Left Security Rules (Cols 8) */}
          <div className="xl:col-span-8 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                    <span className="material-symbols-outlined">gavel</span>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Automated Anti-Cheating & Browser Guard Rules
                    </h2>
                    <p className="text-xs text-slate-500">
                      Enforce continuous behavioral tracking and instant automated penalties.
                    </p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center gap-1 uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-pulse"></span>
                  High Rigor
                </span>
              </div>

              {/* Crucial Tab Switch & Window-Blur Auto-Submission Guard */}
              <div className="p-4 rounded-xl border-2 border-blue-600/40 bg-blue-50/30 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-blue-600 text-white mt-0.5 shadow-sm">
                      <span className="material-symbols-outlined text-xl">tab_close</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          Tab Switch & Window-Blur Auto-Submission Guard
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white">
                          MANDATORY
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Automatic Exam Submission upon Window Inactivity / Window Switching
                      </p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input
                      type="checkbox"
                      checked={proctorRules.tabBlurAutoSubmit}
                      onChange={(e) =>
                        setProctorRules({ ...proctorRules, tabBlurAutoSubmit: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Violation Tolerance Threshold
                    </label>
                    <select
                      value={proctorRules.toleranceThreshold}
                      onChange={(e) =>
                        setProctorRules({
                          ...proctorRules,
                          toleranceThreshold: e.target.value as any,
                        })
                      }
                      className="w-full h-10 px-3 bg-white border-2 border-rose-300 rounded-xl text-xs font-bold text-slate-800 focus:border-rose-500 outline-none"
                    >
                      <option value="zero_tolerance">Zero Tolerance (Immediate Termination on 1st Tab Switch)</option>
                      <option value="1_warning">1 Warning (Submit on 2nd Focus Loss)</option>
                      <option value="2_warnings">2 Warnings (Submit on 3rd Focus Loss)</option>
                      <option value="audit_only">Audit Only (Flag for Proctor Review)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Blur Detection Sensitivity</label>
                    <select
                      value={proctorRules.blurSensitivity}
                      onChange={(e) =>
                        setProctorRules({
                          ...proctorRules,
                          blurSensitivity: e.target.value as any,
                        })
                      }
                      className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:border-blue-500 outline-none"
                    >
                      <option value="instantaneous">Instantaneous (&lt; 250ms DOM blur trigger)</option>
                      <option value="standard">Standard (500ms grace)</option>
                      <option value="relaxed">Relaxed (1.5s tolerance)</option>
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-blue-200 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
                  <span className="material-symbols-outlined text-blue-600 text-base shrink-0 mt-0.5">info</span>
                  <span>
                    <strong>Rule Enforcement Behavior:</strong> Students who minimize window, open a new browser tab,
                    trigger application switches (Alt+Tab / Cmd+Tab), or click outside the test viewport will be
                    forcefully submitted with audit timestamps recorded into the chief examiner’s tamper log.
                  </span>
                </div>

                <div className="px-3.5 py-2 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-between text-xs text-rose-800 font-semibold">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-rose-600 text-sm">warning</span>
                    Active Sentinel Rule: Immediate exam lock & score freeze on focus-loss.
                  </span>
                  <span className="bg-white px-2 py-0.5 rounded text-[10px] font-mono border border-rose-300">
                    STRICT KILLSWITCH
                  </span>
                </div>
              </div>

              {/* Other Toggles */}
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600">fullscreen</span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Fullscreen Lockdown Mode (HTML5 Kiosk)
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Enforces full-display immersion; triggers warning if ESC key is pressed.
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proctorRules.fullscreenLock}
                      onChange={(e) =>
                        setProctorRules({ ...proctorRules, fullscreenLock: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600">videocam</span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">Webcam AI Face Proctoring</span>
                      <span className="text-[11px] text-slate-400">
                        Continuous pupil gaze tracking, multiple face detection, and mic acoustic sampling.
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proctorRules.webcamProctoring}
                      onChange={(e) =>
                        setProctorRules({ ...proctorRules, webcamProctoring: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-blue-600">content_paste_off</span>
                    <div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Clipboard & Keystroke Hardware Lock
                      </span>
                      <span className="text-[11px] text-slate-400">
                        Blocks Ctrl+C, Ctrl+V, PrintScreen, right-click inspect, and DevTools shortcuts.
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={proctorRules.clipboardLock}
                      onChange={(e) =>
                        setProctorRules({ ...proctorRules, clipboardLock: e.target.checked })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {/* Schedule and Cohort */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Schedule & Access Passcode</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Window</label>
                    <input
                      type="text"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Secure Exam Passcode</label>
                    <input
                      type="text"
                      value={proctorRules.securePasscode}
                      onChange={(e) =>
                        setProctorRules({ ...proctorRules, securePasscode: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono font-bold text-blue-600 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
                >
                  ← Previous (Questions)
                </button>
                <button
                  type="button"
                  onClick={() => setShowPublishModal(true)}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-500/25 flex items-center gap-2 transition cursor-pointer"
                >
                  <span>Publish Examination</span>
                  <span className="material-symbols-outlined text-base">rocket_launch</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Checklist (Cols 4) */}
          <div className="xl:col-span-4 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-emerald-600">fact_check</span>
                  <h3 className="font-bold text-sm text-slate-900">Pre-Flight Audit Checklist</h3>
                </div>
                <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2 py-0.5 rounded-full">
                  Ready
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-lg">
                  <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                  <div>
                    <span className="font-bold text-slate-800">{questions.length} Questions Configured</span>
                    <span className="block text-[11px] text-slate-400">100% question payload assembled</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 bg-slate-50 rounded-lg">
                  <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                  <div>
                    <span className="font-bold text-slate-800">Answer Keys Verified</span>
                    <span className="block text-[11px] text-slate-400">All questions have authoritative keys</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 p-2 bg-emerald-50/70 border border-emerald-200 rounded-lg">
                  <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                  <div>
                    <span className="font-bold text-emerald-900">Tab-Blur Auto-Submit Active</span>
                    <span className="block text-[11px] text-emerald-700">Strict zero-tolerance monitor enabled</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-between font-mono">
                <span>SHA-256 Checksum:</span>
                <span className="text-slate-700 font-bold">d98f...b72e</span>
              </div>
            </div>

            {/* Live Student Simulation Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-600 text-base">devices</span>
                  Live Student View Preview
                </h4>
                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Simulation</span>
              </div>

              <div className="p-3 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> Proctoring Active
                  </span>
                  <span className="font-mono text-rose-400 font-bold">00:59:59</span>
                </div>
                <div className="p-2 bg-rose-900/60 border border-rose-500/50 rounded text-[11px] text-rose-200 font-medium">
                  Warning: Auto-submit on tab switch active!
                </div>
                <p className="text-[11px] text-slate-300">
                  {questions[0]?.statement || 'Sample question display inside lockdown kiosk'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* CONFIRM & PUBLISH MODAL (Screen 9)                       */}
      {/* ======================================================== */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-auto animate-in zoom-in duration-150">
            {/* Modal Header */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
              <div className="flex items-start gap-4">
                <div className="relative shrink-0 w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center border border-blue-200 shadow-sm text-blue-700">
                  <span className="material-symbols-outlined text-2xl">lock</span>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                    ✓
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">Publish High-Stakes Examination?</h2>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-wider">
                      Production Release
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Paper Ref: {code} • {title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPublishModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Pre-Flight Validation & Deployment Summary
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                    All Audits Cleared
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="font-bold text-slate-800">{questions.length} MCQs Validated</p>
                    <p className="text-slate-500 text-[11px]">Answer keys sealed & parity 100%</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="font-bold text-slate-800">Strict Sentinel Activated</p>
                    <p className="text-slate-500 text-[11px]">Zero-tolerance window blur auto-submit</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="font-bold text-slate-800">Cohort: {eligibleCohort}</p>
                    <p className="text-slate-500 text-[11px]">Department: {department}</p>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <p className="font-bold text-slate-800">Duration: {durationMinutes} Mins</p>
                    <p className="text-slate-500 text-[11px]">Countdown timer mode</p>
                  </div>
                </div>
              </div>

              {/* Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed flex items-start gap-2.5">
                <span className="material-symbols-outlined text-amber-600 text-lg shrink-0 mt-0.5">warning</span>
                <div>
                  <strong className="block font-bold">Irreversible High-Stakes Action Notice:</strong>
                  Once published, questions, answer keys, and auto-submission sentinel triggers become live for student
                  terminals.
                </div>
              </div>

              {/* Confirmation check */}
              <label className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmAuditCheck}
                  onChange={(e) => setConfirmAuditCheck(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-blue-600"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  I confirm that all <strong>{questions.length} questions, answer keys,</strong> and{' '}
                  <strong>strict window-blur proctoring rules</strong> have been thoroughly audited and approved for
                  live administration.
                </span>
              </label>

              {/* Chief Examiner Passcode */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700">Chief Examiner Digital Passcode</label>
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                    Examiner Verified
                  </span>
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={chiefExaminerPin}
                    onChange={(e) => setChiefExaminerPin(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-slate-200 font-mono tracking-widest outline-none"
                    placeholder="Enter PIN"
                  />
                  <span className="material-symbols-outlined text-emerald-600 absolute right-3 top-2 text-base">
                    check_circle
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel & Return
              </button>
              <button
                type="button"
                disabled={!confirmAuditCheck}
                onClick={handlePublishTest}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-sm">rocket_launch</span>
                <span>Confirm & Publish Examination</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Question Bank Modal */}
      <QuestionBankModal
        isOpen={showQuestionBankModal}
        onClose={() => setShowQuestionBankModal(false)}
        onImportQuestions={handleImportFromBank}
        initialCategory={initialBankCategory}
      />

      {/* PDF Upload Modal */}
      <PdfUploadModal
        isOpen={showPdfUploadModal}
        onClose={() => setShowPdfUploadModal(false)}
        onQuestionsImported={handleImportFromPdf}
      />
    </div>
  );
};
