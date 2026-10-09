import React, { useEffect, useState } from 'react';
import { Student, ExamTest } from '../../types';

interface StudentInstructionsProps {
  student: Student;
  activeTest: ExamTest;
  onStartExam: () => void;
  onLogout: () => void;
}

export const StudentInstructions: React.FC<StudentInstructionsProps> = ({
  student,
  activeTest,
  onStartExam,
  onLogout,
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [declarationChecked, setDeclarationChecked] = useState(false);

  const questionCount = activeTest?.questions?.length || 0;
  const durationMins = activeTest?.durationMinutes || 0;
  const passBenchmark = activeTest?.passingPercentage || 0;
  const correctMarks = activeTest?.markingScheme?.correct ?? 1;
  const incorrectMarks = activeTest?.markingScheme?.incorrect ?? 0;

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Intl.DateTimeFormat('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata',
        }).format(new Date())
      );
    };

    updateTime();
    const interval = window.setInterval(updateTime, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined">MCE</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-extrabold text-blue-900 truncate">MCE Examination Portal</h1>
              <p className="hidden sm:block text-[10px] text-slate-500 uppercase tracking-wider">Examination Portal</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3 min-w-0">
            <div className="text-right min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">{activeTest.title}</p>
              <p className="text-[11px] text-slate-500 font-mono truncate">
                {activeTest.code} • Roll {student.rollNumber}
              </p>
            </div>
            <div className="h-8 w-px bg-slate-200" />
            <div className="text-xs font-mono text-slate-600 whitespace-nowrap">{currentTime} IST</div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">
                {student.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden lg:flex flex-col">
                <span className="text-xs font-bold text-slate-900 leading-tight">{student.name}</span>
                <span className="text-[10px] text-slate-500">Roll: {student.rollNumber}</span>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title="Logout"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <section className="lg:col-span-4 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Candidate</span>
              </div>

              <div className="flex items-start gap-4">
                <div className="shrink-0">
                  <div className="w-20 h-24 rounded-xl bg-blue-50 border border-slate-200 flex items-center justify-center text-blue-700 text-2xl font-extrabold">
                    {student.name.slice(0, 2).toUpperCase()}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-slate-900 truncate">{student.name}</h2>
                  <p className="text-xs text-slate-500 mb-2">{student.department}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Registration</span>
                      <span className="font-mono font-semibold text-blue-700 truncate">{student.regNumber}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-400">Roll No.</span>
                      <span className="font-mono font-semibold text-slate-800">{student.rollNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Test Overview</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Details for this examination</p>
                </div>
              
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block">Duration</span>
                  <span className="font-bold text-slate-900">{durationMins} mins</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block">Questions</span>
                  <span className="font-bold text-slate-900">{questionCount}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block">Correct</span>
                  <span className="font-bold text-emerald-700">+{correctMarks}</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-400 block">Incorrect</span>
                  <span className="font-bold text-rose-700">-{incorrectMarks}</span>
                </div>
              </div>

              <div className="mt-3 p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-900">
                Passing percentage: <strong>{passBenchmark}%</strong>
              </div>
            </div>
          </section>

          <section className="lg:col-span-8">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-900">Exam Instructions</h2>
                <p className="text-xs text-slate-500 mt-1">Please read the instructions before starting the examination.</p>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    'The timer starts when you enter the examination.',
                    'You can move between questions using the navigation controls.',
                    'Selected answers can be changed before final submission.',
                    'Review your answers before submitting the examination.',
                  ].map((item, index) => (
                    <div key={item} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="leading-relaxed">{item}</span>
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
                  <span className="material-symbols-outlined text-amber-600">warning</span>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900">Exam conduct</h3>
                    <p className="text-xs text-amber-900/80 leading-relaxed mt-1">
                      Keep the examination window open and follow the instructions shown during the test. If the test has an automatic submission rule, it will be applied by the examination system.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={declarationChecked}
                    onChange={(e) => setDeclarationChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded text-blue-600"
                  />
                  <span className="text-xs text-slate-700 leading-relaxed select-none">
                    I have read and understood the examination instructions and agree to follow the examination rules.
                  </span>
                </label>
              </div>

              <div className="px-6 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={onLogout}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm"></span>
                  Exit to portal
                </button>

                <button
                  type="button"
                  disabled={!declarationChecked}
                  onClick={() => onStartExam()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-sm transition cursor-pointer"
                >
                  
                Click  Continue to Exam
                </button>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};
