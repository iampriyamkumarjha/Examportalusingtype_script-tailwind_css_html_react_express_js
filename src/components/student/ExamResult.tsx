import React, { useState, useEffect } from 'react';
import { ExamSubmission, ExamTest } from '../../types';
import confetti from 'canvas-confetti';

interface ExamResultProps {
  submission: ExamSubmission;
  test: ExamTest;
  onReturnToDashboard: () => void;
}

export const ExamResult: React.FC<ExamResultProps> = ({
  submission,
  test,
  onReturnToDashboard,
}) => {
  const [selectedQuestionId, setSelectedQuestionId] = useState<number>(() => {
    return test.questions && test.questions.length > 0 ? test.questions[0].id : 1;
  });

  useEffect(() => {
    // If student passed and no violation, celebrate with confetti
    if (submission.passed && !submission.isViolation) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore
      }
    }
  }, [submission]);

  const questions = test.questions || [];
  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId) || questions[0];
  const selectedAnswer = submission.answers ? submission.answers[selectedQuestion?.id] : null;
  const isSelectedCorrect = selectedAnswer?.selectedOption === selectedQuestion?.correctOption;
  const isSelectedAttempted = !!selectedAnswer?.selectedOption;

  const currentQIndex = questions.findIndex((q) => q.id === selectedQuestionId);

  const handlePrint = () => {
    window.print();
  };

  const minutesSpent = Math.floor(submission.timeSpentSeconds / 60);
  const secondsSpent = submission.timeSpentSeconds % 60;

  return (
    <div className="bg-[#faf8ff] text-[#131b2e] antialiased min-h-screen flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto flex justify-between items-center px-4 sm:px-6 py-3 w-full">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <span className="material-symbols-outlined text-2xl">Mce</span>
            </div>
            <div>
              <span className="text-base sm:text-lg font-extrabold text-blue-900 block leading-tight">
                MCE Examination Portal
              </span>
              <span className="text-[11px] text-slate-400 block">
                Central Evaluation & Institutional Assessment Engine
              </span>
            </div>
          </div>

          {/* Submission status pill */}
          <div className="hidden lg:flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-full border border-slate-200">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                submission.isViolation ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
              }`}
            ></span>
            <span
              className={`text-xs font-bold flex items-center gap-1 ${
                submission.isViolation ? 'text-rose-700' : 'text-emerald-700'
              }`}
            >
              <span className="material-symbols-outlined ">
                {submission.isViolation ? 'warning' : ''}
              </span>
              {submission.isViolation
                ? 'Exam Auto-Submitted (Tab Violation Detected)'
                : 'Exam Completed & Safely Submitted'}
            </span>
          </div>

          {/* Candidate identity & exit */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                {submission.studentName.slice(0, 2).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-800 leading-tight">{submission.studentName}</p>
                <p className="text-[10px] text-slate-400 leading-tight font-mono">
                  Roll: {submission.studentRoll} • Reg: {submission.studentReg}
                </p>
              </div>
            </div>

            <button
              onClick={onReturnToDashboard}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="Return to Student Portal"
            >
              <span className="material-symbols-outlined text-lg">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Canvas */}
      <main className="flex-1 max-w-[1440px] mx-auto w-full px-4 sm:px-6 md:px-8 py-6 space-y-6">
        {/* 1. HERO BANNER: SUBMISSION VERIFICATION & PROCTOR AUDIT */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden">
          <div className="flex items-start sm:items-center gap-4 relative z-10">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border ${
                submission.isViolation
                  ? 'bg-rose-100 text-rose-700 border-rose-200'
                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
            >
              <span className="material-symbols-outlined text-5xl font-sm">
                {submission.isViolation ? 'warning' : '  '}
              </span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
                  {submission.isViolation
                    ? 'Examination Terminated & Auto-Submitted by Tab switching'
                    : 'Examination Successfully Submitted & Verified'}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    submission.isViolation
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}
                >
                  {submission.isViolation ? 'Flagged Tab Violation' : 'Official Result Certified'}
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <strong className="text-slate-700">Test:</strong> {submission.testTitle}
                </span>
                <span>•</span>
                <span>
                  <strong className="text-slate-700">Submission Time:</strong>{' '}
                  {submission.submittedAt ? submission.submittedAt.slice(0, 19).replace('T', ' ') : 'Just now'}
                </span>
                <span>•</span>
                <span>
                  <strong className="text-slate-700">Duration Utilized:</strong> {minutesSpent}m {secondsSpent}s of{' '}
                  {test.durationMinutes || 60}m 00s
                </span>
              </p>
            </div>
          </div>

          {/* Proctoring Clearance Chip */}
          <div
            className={`rounded-xl p-4 border flex items-center gap-3 shrink-0 relative z-10 ${
              submission.isViolation ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                submission.isViolation ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              
            </div>
            <div>
              <div
                className={`text-xs font-bold flex items-center gap-1 ${
                  submission.isViolation ? 'text-rose-800' : 'text-emerald-800'
                }`}
              >
              {/* <span className="material-symbols-outlined text-sm">
                  {submission.isViolation ? 'Switch' : ''}
                </span>
                
                <span>{submission.isViolation ? ' the tab during examination' : 'Anti-Cheating Guard Cleared'}</span>
*/}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {submission.isViolation
                  ? submission.violationReason || 'Window lost focus during examination'
                  : '0 Flagged Tab Switches • AI Stream Validated'}
              </p>
            </div>
          </div>
        </div>

        {/* Candidate & Security Verification Dossier Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              {submission.capturedPhotoUrl ? (
                <img
                  src={submission.capturedPhotoUrl}
                  alt={submission.studentName}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover border-2 border-emerald-400 shadow-sm"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
                  {submission.studentName.slice(0, 2).toUpperCase()}
                </div>
              )}
              
              
              
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900">{submission.studentName}</h3>
                <span className="bg-blue-50 text-blue-700 font-bold text-[10px] px-2 py-0.5 rounded-full border border-blue-200">
                  Candidate Record
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                <span>
                  <strong className="text-slate-700">Username (Reg):</strong>{' '}
                  <span className="font-mono text-blue-700 font-bold">{submission.studentReg}</span>
                </span>
                <span>•</span>
                <span>
                  <strong className="text-slate-700">Roll No:</strong>{' '}
                  <span className="font-mono text-slate-800 font-semibold">{submission.studentRoll}</span>
                </span>
                <span>•</span>
                <span className="text-slate-600">{submission.studentDepartment}</span>
              </div>
              
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 text-xs">
            <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 text-right">
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Exam Paper Status</span>
              <span className="font-mono font-bold text-slate-800">{submission.testCode}</span>
            </div>
          </div>
        </div>

        {/* 2. FOUR-COLUMN SCORECARD & PERFORMANCE METRICS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Score & Grade */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Marks Scored</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  submission.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                }`}
              >
                {submission.passed ? 'PASSED' : 'NEEDS IMPROVEMENT'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-extrabold text-blue-700 leading-none">{submission.totalMarks}</span>
              <span className="text-base text-slate-400">/ {submission.maxMarks}</span>
              <span
                className={`text-sm font-bold ml-auto ${
                  submission.percentageScore >= 40 ? 'text-emerald-600' : 'text-rose-600'
                }`}
              >
                {submission.percentageScore}%
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${submission.passed ? 'bg-blue-600' : 'bg-rose-500'}`}
                style={{ width: `${Math.min(100, submission.percentageScore)}%` }}
              ></div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>Benchmark: {test.passingPercentage || 40}%</span>
              <span className={submission.passed ? 'text-emerald-600 font-semibold' : 'text-rose-600'}>
                {submission.passed ? `+${submission.percentageScore - (test.passingPercentage || 40)}% over req.` : 'Below cutoff'}
              </span>
            </div>
          </div>

          {/* Card 2: Accuracy */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accuracy Rate</span>
             
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-extrabold text-slate-900 leading-none">
                {submission.correctAnswersCount + submission.incorrectAnswersCount > 0
                  ? Math.round(
                      (submission.correctAnswersCount /
                        (submission.correctAnswersCount + submission.incorrectAnswersCount)) *
                        100
                    )
                  : 0}
                %
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full"
                style={{
                  width: `${(submission.correctAnswersCount / (questions.length || 1)) * 100}%`,
                }}
              ></div>
              <div
                className="bg-rose-500 h-full"
                style={{
                  width: `${(submission.incorrectAnswersCount / (questions.length || 1)) * 100}%`,
                }}
              ></div>
            </div>
            <div className="mt-2 flex justify-between text-xs">
              <span className="text-emerald-600 font-semibold">{submission.correctAnswersCount} Correct</span>
              <span className="text-rose-600 font-semibold">{submission.incorrectAnswersCount} Incorrect</span>
            </div>
          </div>

          {/* Card 3: Speed & Pacing */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Time Spent</span>
             
            </div>
            <div className="flex items-baseline gap-1 mb-2">
              <span className="text-4xl font-extrabold text-slate-900 leading-none">
                {minutesSpent}
                <span className="text-base font-normal text-slate-400">m</span> {secondsSpent}
                <span className="text-base font-normal text-slate-400">s</span>
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{
                  width: `${Math.min(
                    100,
                    Math.round((submission.timeSpentSeconds / ((test.durationMinutes || 60) * 60)) * 100)
                  )}%`,
                }}
              ></div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>Avg Pace: {(submission.timeSpentSeconds / (questions.length || 1)).toFixed(0)}s / Q</span>
              <span className="text-emerald-600 font-semibold">Clock Verified</span>
            </div>
          </div>

          {/* Card 4: Cohort Standings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cohort Percentile</span>
              
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-extrabold text-blue-600 leading-none">
                {submission.percentageScore >= 90
                  ? 'Top 5%'
                  : submission.percentageScore >= 75
                  ? 'Top 15%'
                  : submission.percentageScore >= 50
                  ? 'Top 40%'
                  : 'Group Normal'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div
                className="bg-blue-600 h-full rounded-full"
                style={{ width: `${Math.max(10, submission.percentageScore)}%` }}
              ></div>
            </div>
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>Roll: {submission.studentRoll}</span>
              <span className="text-blue-600 font-semibold">Institutional Grade</span>
            </div>
          </div>
        </div>

        {/* 3. SECTION BREAKDOWN & PERFORMANCE TABLE */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900">Subject & Sectional Evaluation</h2>
              <p className="text-xs text-slate-500"></p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-600"></span> {submission.correctAnswersCount} Correct
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-rose-600"></span> {submission.incorrectAnswersCount} Incorrect
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                <span className="w-2 h-2 rounded-full bg-slate-400"></span> {submission.unattemptedCount} Unattempted
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <th className="py-3 px-6">Section Name</th>
                  <th className="py-3 px-4 text-center">Total Questions</th>
                  <th className="py-3 px-4 text-center">Attempted</th>
                  <th className="py-3 px-4 text-center text-emerald-700">Correct</th>
                  <th className="py-3 px-4 text-center text-rose-700">Incorrect</th>
                  <th className="py-3 px-4 text-center">Avg Time / Q</th>
                  <th className="py-3 px-4 text-right">Accuracy</th>
                  <th className="py-3 px-6 text-right">Net Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-4 px-6 font-semibold text-slate-900 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    {test.subject || 'Section 1: Mathematics & Logic'}
                  </td>
                  <td className="py-4 px-4 text-center tabular-nums">{questions.length}</td>
                  <td className="py-4 px-4 text-center tabular-nums">
                    {submission.correctAnswersCount + submission.incorrectAnswersCount} (
                    {Math.round(
                      ((submission.correctAnswersCount + submission.incorrectAnswersCount) / (questions.length || 1)) *
                        100
                    )}
                    %)
                  </td>
                  <td className="py-4 px-4 text-center tabular-nums font-bold text-emerald-600">
                    {submission.correctAnswersCount}
                  </td>
                  <td className="py-4 px-4 text-center tabular-nums font-bold text-rose-600">
                    {submission.incorrectAnswersCount}
                  </td>
                  <td className="py-4 px-4 text-center tabular-nums text-slate-500">
                    {(submission.timeSpentSeconds / (questions.length || 1)).toFixed(0)}s
                  </td>
                  <td className="py-4 px-4 text-right font-semibold text-slate-800">
                    {submission.percentageScore}%
                  </td>
                  <td className="py-4 px-6 text-right font-extrabold text-blue-700 tabular-nums">
                    {submission.totalMarks} / {submission.maxMarks}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. QUESTION MATRIX & DETAILED AUDIT / PREVIEW (1..20) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Question Palette (Cols 4) */}
          <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Question List</h3>
                  <p className="text-[11px] text-slate-400">Click any number to inspect audit verification</p>
                </div>
                <span className="material-symbols-outlined text-blue-600"></span>
              </div>

              {/* Matrix Grid */}
              <div className="grid grid-cols-5 gap-2 my-2">
                {questions.map((q, idx) => {
                  const ans = submission.answers ? submission.answers[q.id] : null;
                  const isCorrect = ans?.selectedOption === q.correctOption;
                  const isAttempted = !!ans?.selectedOption;
                  const isSelected = selectedQuestionId === q.id;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setSelectedQuestionId(q.id)}
                      className={`h-11 rounded-xl font-bold text-xs flex flex-col items-center justify-center transition cursor-pointer ${
                        isSelected ? 'ring-4 ring-blue-200 scale-105 z-10 shadow' : 'hover:scale-102'
                      } ${
                        !isAttempted
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : isCorrect
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-rose-100 text-rose-800 border border-rose-300'
                      }`}
                    >
                      <span>{String(idx + 1).padStart(2, '0')}</span>
                      <span className="material-symbols-outlined text-[12px] -mt-1 font-bold">
                        {!isAttempted ? '' : isCorrect ? '' : ''}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 text-xs flex justify-between text-slate-500">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-100 border border-emerald-300"></span> Correct (
                {submission.correctAnswersCount})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-md bg-rose-100 border border-rose-300"></span> Incorrect (
                {submission.incorrectAnswersCount})
              </span>
            </div>
          </div>

          {/* Right Column: Question Audit & Verified Explanation (Cols 8) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col justify-between">
            {selectedQuestion ? (
              <div>
                {/* Question Header Strip */}
                <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-bold text-xs">
                      Question {String(currentQIndex + 1).padStart(2, '0')} of {questions.length}
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                        !isSelectedAttempted
                          ? 'bg-slate-100 text-slate-600'
                          : isSelectedCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      <span className="material-symbols-outlined text-xs">
                        {!isSelectedAttempted ? '' : isSelectedCorrect ? '' : ''}
                      </span>
                      {!isSelectedAttempted
                        ? 'Unattempted (0.0 marks)'
                        : isSelectedCorrect
                        ? 'Correct Response (+1.0 marks)'
                        : 'Incorrect Response (-0.0 marks)'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Section: <strong className="text-slate-700">{selectedQuestion.section}</strong>
                  </div>
                </div>

                {/* Prompt */}
                <div className="mb-6">
                  <h4 className="text-base md:text-lg font-bold text-slate-900 leading-relaxed">
                    {selectedQuestion.statement}
                  </h4>
                </div>

                {/* Options List */}
                <div className="space-y-3 mb-6">
                  {selectedQuestion.options.map((opt) => {
                    const isCandidateChoice = selectedAnswer?.selectedOption === opt.id;
                    const isOfficialCorrect = selectedQuestion.correctOption === opt.id;

                    let optClass = 'border-slate-200 bg-white';
                    if (isOfficialCorrect) {
                      optClass = 'border-2 border-emerald-500 bg-emerald-50/50 shadow-xs';
                    } else if (isCandidateChoice && !isOfficialCorrect) {
                      optClass = 'border-2 border-rose-500 bg-rose-50/50 shadow-xs';
                    }

                    return (
                      <div
                        key={opt.id}
                        className={`p-3.5 rounded-xl border flex items-center justify-between ${optClass}`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                              isOfficialCorrect
                                ? 'bg-emerald-600 text-white'
                                : isCandidateChoice
                                ? 'bg-rose-600 text-white'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {opt.id}
                          </span>
                          <div>
                            <span className="text-sm font-semibold text-slate-900">{opt.text}</span>
                            {isOfficialCorrect && (
                              <span className="block text-[11px] text-emerald-700 font-bold">
                                Official Correct Answer
                              </span>
                            )}
                            {isCandidateChoice && !isOfficialCorrect && (
                              <span className="block text-[11px] text-rose-700 font-bold">
                                Your Marked Selection (Candidate Response)
                              </span>
                            )}
                          </div>
                        </div>

                        {isOfficialCorrect && (
                          <span className="material-symbols-outlined text-emerald-600 font-bold text-xl">
                            
                          </span>
                        )}
                        {isCandidateChoice && !isOfficialCorrect && (
                          <span className="material-symbols-outlined text-rose-600 font-bold text-xl">
                            cancel
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Academic Solution & Rationale Box */}
                {selectedQuestion.explanation && (
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-1.5 text-blue-700 font-bold text-xs">
                      <span className="material-symbols-outlined text-base">lightbulb</span>
                      <span>Academic Methodology & Solution Rationale</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{selectedQuestion.explanation}</p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Pagination between questions */}
            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                disabled={currentQIndex <= 0}
                onClick={() => {
                  if (currentQIndex > 0) {
                    setSelectedQuestionId(questions[currentQIndex - 1].id);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm"></span> Prev Question
              </button>
              <span className="text-xs text-slate-400">
                Viewing Question {currentQIndex + 1} of {questions.length}
              </span>
              <button
                type="button"
                disabled={currentQIndex >= questions.length - 1}
                onClick={() => {
                  if (currentQIndex < questions.length - 1) {
                    setSelectedQuestionId(questions[currentQIndex + 1].id);
                  }
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer flex items-center gap-1"
              >
                Next Question <span className="material-symbols-outlined text-sm"></span>
              </button>
            </div>
          </div>
        </div>

        {/* 5. ACTIONS, OFFICIAL TRANSCRIPT & CERTIFICATE DOWNLOAD SECTION */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h3 className="text-base font-bold text-slate-900 flex items-center justify-center md:justify-start gap-2">
              <span className="material-symbols-outlined text-blue-600"></span>
              Official Certified Evaluation Documentation
            </h3>
            <p className="text-xs text-slate-500">
              
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 w-full md:w-auto">
            <button
              onClick={handlePrint}
              className="h-11 px-5 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-md hover:bg-blue-700 transition flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base"></span>
              <span>Download Official Grade Card (PDF)</span>
            </button>
            <button
              onClick={onReturnToDashboard}
              className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold hover:bg-slate-50 transition flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base"></span>
              <span>Return to Portal</span>
            </button>
          </div>
        </div>

        {/* Footer */}
       
      </main>
    </div>
  );
};
