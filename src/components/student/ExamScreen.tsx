import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Student, ExamTest, ExamSubmission, ExamAnswer } from '../../types';
import { storage } from '../../services/storage';

interface ExamScreenProps {
  student: Student;
  test: ExamTest;
  onExamCompleted: (submission: ExamSubmission) => void;
}

export const ExamScreen: React.FC<ExamScreenProps> = ({
  student,
  test,
  onExamCompleted,
}) => {
  const questions = test.questions && test.questions.length > 0 ? test.questions : [];
  const totalQuestions = questions.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<number, ExamAnswer>>({});
  const [secondsRemaining, setSecondsRemaining] = useState((test.durationMinutes || 60) * 60);
  const [showFinishConfirmModal, setShowFinishConfirmModal] = useState(false);
  const [selectedSection, setSelectedSection] = useState('All');

  // Track if exam has already finalized to prevent duplicate submissions
  const isFinalizedRef = useRef(false);
  const startTimeRef = useRef(Date.now());

  // Initialize answer state
  useEffect(() => {
    const initialAnswers: Record<number, ExamAnswer> = {};
    questions.forEach((q, idx) => {
      initialAnswers[q.id] = {
        questionId: q.id,
        selectedOption: null,
        status: idx === 0 ? 'not_answered' : 'not_visited',
        timeSpentSeconds: 0,
      };
    });
    setAnswers(initialAnswers);
  }, [questions]);

  // Evaluate & finalize submission
  const finalizeSubmission = useCallback(
    async (isViolation = false, violationReason = '') => {
      if (isFinalizedRef.current) return;
      isFinalizedRef.current = true;

      const elapsedSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
      let totalMarks = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let unattemptedCount = 0;

      const correctMark = test.markingScheme?.correct || 1.0;
      const incorrectPenalty = test.markingScheme?.incorrect || 0.0;

      questions.forEach((q) => {
        const ans = answers[q.id];
        if (ans && ans.selectedOption) {
          if (ans.selectedOption === q.correctOption) {
            correctCount++;
            totalMarks += correctMark;
          } else {
            incorrectCount++;
            totalMarks -= incorrectPenalty;
          }
        } else {
          unattemptedCount++;
        }
      });

      const maxMarks = questions.length * correctMark;
      const percentageScore = maxMarks > 0 ? Math.round((Math.max(0, totalMarks) / maxMarks) * 100) : 0;
      const passed = percentageScore >= (test.passingPercentage || 40);

      const submission: ExamSubmission = {
        id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        testId: test.id,
        testTitle: test.title,
        testCode: test.code,
        studentId: student.id,
        studentName: student.name,
        studentEmail: student.email,
        studentRoll: student.rollNumber,
        studentReg: student.regNumber,
        studentDepartment: student.department,
        totalMarks: Math.max(0, Number(totalMarks.toFixed(1))),
        maxMarks,
        percentageScore,
        passed,
        correctAnswersCount: correctCount,
        incorrectAnswersCount: incorrectCount,
        unattemptedCount,
        timeSpentSeconds: elapsedSeconds,
        submittedAt: new Date().toISOString(),
        isViolation,
        violationReason,
        tabSwitchCount: isViolation ? 1 : 0,
        answers,
        capturedPhotoUrl: student.capturedPhotoUrl,
        photoCapturedAt: student.photoCapturedAt,
      };

      try {
        await storage.addSubmission(submission);
        onExamCompleted(submission);
      } catch (error) {
        console.error('Failed to save submission:', error);
        // Keep the finalized lock active so the candidate cannot create a second attempt.
        alert('Your submission could not be saved to the central database. Please keep this page open and contact the administrator.');
      }
    },
    [answers, onExamCompleted, questions, student, test]
  );

  // =========================================================================
  // CRITICAL STRICT WINDOW LOCK & TAB SWITCH AUTO-SUBMISSION SENTINEL
  // =========================================================================
  useEffect(() => {
    // Only arm if test rules mandate or by default strict
    const isStrict = test.proctorRules?.tabBlurAutoSubmit !== false;
    if (!isStrict) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !isFinalizedRef.current) {
        // Audio alert beep
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = ctx.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.3);
        } catch {
          // ignore audio failure
        }

        finalizeSubmission(
          true,
          'AUTOMATIC SUBMISSION TRIGGERED: Candidate switched browser tab or minimized window during examination (Strict Proctor Guard Zero-Tolerance)'
        );
      }
    };

    const handleWindowBlur = () => {
      // Small timeout to avoid false positives on quick modal clicks within the page
      setTimeout(() => {
        if (!document.hasFocus() && !isFinalizedRef.current) {
          finalizeSubmission(
            true,
            'AUTOMATIC SUBMISSION TRIGGERED: Window lost focus (Candidate clicked outside examination screen or Alt+Tabbed)'
          );
        }
      }, 300);
    };

    const handlePageHide = () => {
      if (!isFinalizedRef.current) {
        finalizeSubmission(
          true,
          'AUTOMATIC SUBMISSION TRIGGERED: Browser page hide event detected.'
        );
      }
    };

    // Block context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Block Copy / Paste / PrintScreen
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === 'c' || e.key === 'v' || e.key === 'p' || e.key === 'u' || e.key === 's')
      ) {
        e.preventDefault();
        return false;
      }
      if (e.key === 'PrintScreen' || e.key === 'F12') {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [finalizeSubmission, test]);

  // Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finalizeSubmission(false, 'Exam time limit elapsed (Auto-submitted on 00:00)');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finalizeSubmission]);

  const formatTimer = (totalSec: number) => {
    const hours = String(Math.floor(totalSec / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSec % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const currentQ = questions[currentIdx] || {
    id: 1,
    questionNumber: 1,
    statement: 'No questions available.',
    options: [],
    correctOption: 'A',
    marks: 1.0,
    negativeMarks: 0.0,
    section: 'Mathematics',
    explanation: '',
  };

  const currentAnswer = answers[currentQ.id] || {
    questionId: currentQ.id,
    selectedOption: null,
    status: 'not_answered',
    timeSpentSeconds: 0,
  };

  const handleSelectOption = (optId: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => {
      const existing = prev[currentQ.id];
      const isMarked = existing?.status === 'marked_review' || existing?.status === 'answered_marked_review';
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          selectedOption: optId,
          status: isMarked ? 'answered_marked_review' : 'answered',
        },
      };
    });
  };

  const handleClearResponse = () => {
    setAnswers((prev) => {
      const existing = prev[currentQ.id];
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          selectedOption: null,
          status: 'not_answered',
        },
      };
    });
  };

  const handleMarkForReviewAndNext = () => {
    setAnswers((prev) => {
      const existing = prev[currentQ.id];
      const hasAnswer = !!existing?.selectedOption;
      return {
        ...prev,
        [currentQ.id]: {
          ...existing,
          status: hasAnswer ? 'answered_marked_review' : 'marked_review',
        },
      };
    });

    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handleSaveAndNext = () => {
    // If not answered yet, set to not_answered
    setAnswers((prev) => {
      const existing = prev[currentQ.id];
      if (!existing?.selectedOption && existing?.status === 'not_visited') {
        return {
          ...prev,
          [currentQ.id]: {
            ...existing,
            status: 'not_answered',
          },
        };
      }
      return prev;
    });

    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const jumpToQuestion = (idx: number) => {
    setCurrentIdx(idx);
  };

  // Status counts for palette legend
  const answeredCount = Object.values(answers).filter(
    (a) => a.status === 'answered' || a.status === 'answered_marked_review'
  ).length;
  const notAnsweredCount = Object.values(answers).filter((a) => a.status === 'not_answered').length;
  const markedReviewCount = Object.values(answers).filter((a) => a.status === 'marked_review').length;
  const answeredMarkedCount = Object.values(answers).filter((a) => a.status === 'answered_marked_review').length;
  const notVisitedCount = totalQuestions - (answeredCount + notAnsweredCount + markedReviewCount);

  return (
    <div className="bg-[#faf8ff] text-[#131b2e] antialiased min-h-screen flex flex-col font-sans select-none relative">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30 flex justify-between items-center px-4 sm:px-6 h-16 w-full">
        {/* Brand / Paper Identifiers */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-blue-700">
            <span className="material-symbols-outlined text-blue-600 text-2xl">security</span>
            <span className="text-base font-extrabold text-blue-900 hidden sm:inline">MCE Examination Portal</span>
          </div>
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200 text-xs text-slate-500">
            <span className="text-blue-600 font-bold">{test.title}</span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-700">Roll: {student.rollNumber}</span>
          </div>
        </div>

        {/* Center Timer Pill */}
        <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3.5 py-1.5 rounded-full shadow-inner">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
          </span>
          <span className="material-symbols-outlined text-blue-600 text-base"></span>
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">
            Remaining Time:
          </span>
          <span className="font-mono text-sm md:text-base text-blue-700 font-bold tabular-nums">
            {formatTimer(secondsRemaining)}
          </span>
        </div>

        {/* Trailing Actions & Profile */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-emerald-200">
            <span className="material-symbols-outlined text-emerald-600 text-sm"></span>
            <span>Proctoring: Active • Strict Window Lock</span>
          </div>

          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
              {student.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-bold text-slate-900 leading-tight">{student.name}</span>
              <span className="text-[10px] text-blue-700 font-mono font-semibold">Username: {student.regNumber}</span>
            </div>
          </div>

          <button
            onClick={() => setShowFinishConfirmModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-xl font-bold text-xs shadow-sm transition cursor-pointer"
          >
            Submit Exam
          </button>
        </div>
      </header>

      {/* Sentinel Warning Alert Banner (Crucial Visual from reference) */}
      <div className="bg-rose-50 text-rose-900 px-4 sm:px-6 py-2 flex items-center justify-between text-xs border-b border-rose-200">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-600 text-base">warning</span>
          <span>
            <strong>Anti-Cheating Policy Active:</strong> Switching browser tabs, minimizing the window, or losing window
            focus will result in <strong className="text-rose-700 uppercase">AUTOMATIC SUBMISSION</strong> of your
            examination immediately.
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-[11px] uppercase tracking-wider text-rose-600 font-bold">
          <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
          Security Monitor Operational
        </div>
      </div>

      {/* Main CBT Workspace: Split View */}
      <div className="flex-1 flex w-full relative overflow-hidden">
        {/* Left & Center Main Question Section */}
        <main className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-[calc(100%-20rem)] min-h-[calc(100vh-8rem)]">
          {/* Section Tabs Navigation Bar */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-sm">
                <span className="material-symbols-outlined text-base">calculate</span>
                <span>Section 1: {test.subject || 'Mathematics'} ({totalQuestions} Questions)</span>
              </button>
            </div>
            <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                Marking: +{test.markingScheme?.correct || 1.0}
              </span>
              <span className="bg-slate-100 px-2.5 py-1 rounded border border-slate-200">
                Negative: -{test.markingScheme?.incorrect || 0.0}
              </span>
            </div>
          </div>

          {/* Question Box */}
          <div className="max-w-[920px] w-full mx-auto flex-1 flex flex-col justify-between">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              {/* Question Header */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 font-bold text-sm rounded-lg border border-blue-100">
                    Question {String(currentIdx + 1).padStart(2, '0')}
                  </span>
                  <span className="text-xs text-slate-400">Single Choice Type (MCQ)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
                    +{test.markingScheme?.correct || 1.0} / -{test.markingScheme?.incorrect || 0.0} Marks
                  </span>
                </div>
              </div>

              {/* Mathematical Question Statement */}
              <div className="py-2 text-slate-800 space-y-3">
                <p className="text-base sm:text-lg font-bold text-slate-900 leading-relaxed font-sans">
                  {currentQ.statement}
                </p>
                {currentQ.hint && (
                  <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs text-blue-900 flex items-center gap-2">
                    <span className="material-symbols-outlined text-blue-600 text-sm">info</span>
                    <span>{currentQ.hint}</span>
                  </div>
                )}
              </div>

              {/* MCQ Options Grid */}
              <div className="space-y-3">
                {currentQ.options.map((option) => {
                  const isSelected = currentAnswer.selectedOption === option.id;
                  return (
                    <label
                      key={option.id}
                      onClick={() => handleSelectOption(option.id)}
                      className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${
                        isSelected
                          ? 'bg-blue-50/70 border-2 border-blue-600 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'border border-slate-300 text-slate-600 bg-slate-50'
                          }`}
                        >
                          {option.id}
                        </span>
                        <span
                          className={`text-sm md:text-base ${
                            isSelected ? 'font-bold text-blue-900' : 'text-slate-800'
                          }`}
                        >
                          {option.text}
                        </span>
                        {option.annotation && isSelected && (
                          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
                            ({option.annotation})
                          </span>
                        )}
                      </div>
                      <input
                        type="radio"
                        name={`question_option_${currentQ.id}`}
                        checked={isSelected}
                        onChange={() => handleSelectOption(option.id)}
                        className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Bottom Question Actions Toolbar */}
            <div className="mt-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 bg-[#faf8ff]">
              {/* Left Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleMarkForReviewAndNext}
                  className="px-4 py-2.5 rounded-xl border border-amber-500 text-amber-700 hover:bg-amber-50 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  
                  <span>Mark for Review & Next</span>
                </button>
                <button
                  type="button"
                  onClick={handleClearResponse}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-rose-600 font-semibold text-xs transition cursor-pointer"
                >
                  Clear Response
                </button>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={currentIdx === 0}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 font-semibold text-xs transition flex items-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm"></span>
                  <span>Previous</span>
                </button>
                {currentIdx === totalQuestions - 1 ? (
  <button
    type="button"
    onClick={() => setShowFinishConfirmModal(true)}
    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer"
  >
    <span>Submit</span>
    <span className="material-symbols-outlined text-sm"></span>
  </button>
) : (
  <button
    type="button"
    onClick={handleSaveAndNext}
    className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition cursor-pointer"
  >
    <span>Save & Next</span>
    <span className="material-symbols-outlined text-sm"></span>
  </button>
)}
              </div>
            </div>
          </div>
        </main>

        {/* Right Sidebar: Question Palette & Candidate Panel */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col justify-between h-[calc(100vh-6.5rem)] sticky top-24 p-4 overflow-y-auto">
          <div className="space-y-4">
            {/* Question Index Filter */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-800">Question Index</span>
                <span className="text-[11px] text-slate-400">{totalQuestions} Total Questions</span>
              </div>
              <div className="grid grid-cols-2 gap-1 pt-1">
                <button
                  onClick={() => setSelectedSection('All')}
                  className={`rounded-lg font-bold px-2 py-1.5 text-xs flex items-center gap-1.5 justify-center cursor-pointer ${
                    selectedSection === 'All' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600'
                  }`}
                >
                  
                  <span>All Sections</span>
                </button>
                <button
                  onClick={() => setSelectedSection('Maths')}
                  className={`rounded-lg font-bold px-2 py-1.5 text-xs flex items-center gap-1.5 justify-center cursor-pointer ${
                    selectedSection === 'Maths' ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">calculate</span>
                  <span>{test.subject || 'Maths'}</span>
                </button>
              </div>
            </div>

            {/* Question Palette Status Legend */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200 pb-1">
                Palette Status Legend
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-emerald-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {answeredCount}
                  </span>
                  <span className="text-slate-600">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-rose-500 text-white font-bold flex items-center justify-center text-[10px]">
                    {notAnsweredCount}
                  </span>
                  <span className="text-slate-600">Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px]">
                    {Math.max(0, notVisitedCount)}
                  </span>
                  <span className="text-slate-600">Not Visited</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-amber-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {markedReviewCount}
                  </span>
                  <span className="text-slate-600">Marked Review</span>
                </div>
                <div className="flex items-center gap-2 col-span-2 pt-1 border-t border-slate-200">
                  <span className="relative w-5 h-5 rounded bg-amber-600 text-white font-bold flex items-center justify-center text-[10px]">
                    {answeredMarkedCount}
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full border border-white"></span>
                  </span>
                  <span className="text-slate-600">Ans & Marked for Review</span>
                </div>
              </div>
            </div>

            {/* Question Palette Number Grid */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800">Questions</span>
                <span className="text-[11px] text-blue-600 font-bold">{totalQuestions} MCQs</span>
              </div>

              <div className="grid grid-cols-5 gap-1.5 text-center">
                {questions.map((q, idx) => {
                  const ans = answers[q.id];
                  const isCurrent = currentIdx === idx;
                  const isAnswered = ans?.status === 'answered';
                  const isAnsMarked = ans?.status === 'answered_marked_review';
                  const isMarked = ans?.status === 'marked_review';
                  const isNotAnswered = ans?.status === 'not_answered';

                  let btnBg = 'bg-slate-200 text-slate-700'; // not visited
                  if (isAnswered) btnBg = 'bg-emerald-600 text-white';
                  else if (isAnsMarked) btnBg = 'bg-amber-600 text-white';
                  else if (isMarked) btnBg = 'bg-amber-600 text-white';
                  else if (isNotAnswered) btnBg = 'bg-rose-500 text-white';

                  return (
                    <button
                      key={q.id}
                      onClick={() => jumpToQuestion(idx)}
                      className={`relative h-8 rounded-lg font-bold text-xs flex items-center justify-center transition cursor-pointer ${btnBg} ${
                        isCurrent ? 'ring-2 ring-blue-600 ring-offset-1 scale-105 z-10' : 'hover:opacity-90'
                      }`}
                    >
                      {String(idx + 1).padStart(2, '0')}
                      {isAnsMarked && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full border border-white"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Bottom Palette Actions & Finish Button */}
          <div className="pt-3 border-t border-slate-200 space-y-2.5">
            <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200 flex items-center gap-2 text-[11px] font-semibold text-slate-700">
              
              <span>Anti-Cheating Status: Strict Lockdown</span>
            </div>

            <button
              onClick={() => setShowFinishConfirmModal(true)}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-base"></span>
              <span>Finish & Submit Test</span>
            </button>
          </div>
        </aside>
      </div>

      {/* Finish Confirmation Modal */}
      {showFinishConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in zoom-in duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <span className="material-symbols-outlined text-2xl">help_outline</span>
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Confirm Exam Submission</h3>
                <p className="text-xs text-slate-500">Are you sure you want to finalize your examination?</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Total Questions:</span>
                <strong className="text-slate-900">{totalQuestions}</strong>
              </div>
              <div className="flex justify-between text-emerald-700">
                <span>Questions Answered:</span>
                <strong>{answeredCount}</strong>
              </div>
              <div className="flex justify-between text-rose-700">
                <span>Unanswered / Skipped:</span>
                <strong>{totalQuestions - answeredCount}</strong>
              </div>
              <div className="flex justify-between text-blue-700">
                <span>Remaining Time:</span>
                <strong>{formatTimer(secondsRemaining)}</strong>
              </div>
            </div>

            <p className="text-[11px] text-slate-400">
              Once submitted, your answers cannot be modified. Your grade will be generated immediately.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowFinishConfirmModal(false)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Continue Test
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowFinishConfirmModal(false);
                  finalizeSubmission(false, 'Candidate voluntarily completed and submitted examination.');
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                Yes, Finalize & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
