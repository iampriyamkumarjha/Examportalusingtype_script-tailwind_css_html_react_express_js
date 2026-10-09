import React, { useMemo } from 'react';
import { ExamTest, ExamSubmission, Student } from '../../types';

interface StudentTestDashboardProps {
  student: Student;
  tests: ExamTest[];
  submissions: ExamSubmission[];
  onSelectTest: (test: ExamTest) => void;
  onLogout: () => void;
}

export const StudentTestDashboard: React.FC<StudentTestDashboardProps> = ({
  student,
  tests,
  submissions,
  onSelectTest,
  onLogout,
}) => {
  const publishedTests = useMemo(
    () => tests.filter((test) => test.status === 'published'),
    [tests]
  );

  const hasSubmitted = (test: ExamTest) => {
    const studentKeys = [student.id, student.regNumber, student.rollNumber]
      .filter(Boolean)
      .map(String);

    return submissions.some((submission) => {
      const submissionStudentKeys = [
        submission.studentId,
        submission.studentReg,
        submission.studentRoll,
      ]
        .filter(Boolean)
        .map(String);

      return (
        String(submission.testId) === String(test.id) &&
        submissionStudentKeys.some((key) => studentKeys.includes(key))
      );
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-blue-900">
              Examination Portal
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Welcome, {student.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="mb-7">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            Available Tests
          </h2>
          <p className="text-sm text-slate-500 mt-2">
            Select an examination to view its instructions and begin when you are ready.
          </p>
        </div>

        {publishedTests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500">
              <span className="material-symbols-outlined text-3xl">event_busy</span>
            </div>
            <h3 className="mt-4 text-lg font-bold text-slate-900">
              No tests are currently available
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Please check again later or contact your examination administrator.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {publishedTests.map((test) => {
              const submitted = hasSubmitted(test);
              const questionCount = test.questions?.length || 0;
              const correctMarks = test.markingScheme?.correct ?? 1;
              const incorrectMarks = test.markingScheme?.incorrect ?? 0;

              return (
                <article
                  key={String(test.id)}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition overflow-hidden"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100 text-[11px] font-bold">
                        AVAILABLE
                      </span>
                      {submitted && (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-bold">
                          SUBMITTED
                        </span>
                      )}
                    </div>

                    <h3 className="mt-4 text-lg font-extrabold text-slate-900 leading-snug">
                      {test.title}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500 font-mono">
                      {test.code}
                    </p>

                    <div className="grid grid-cols-2 gap-2 mt-5">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-bold">
                          Questions
                        </span>
                        <span className="block mt-1 font-bold text-slate-900">
                          {questionCount}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-bold">
                          Duration
                        </span>
                        <span className="block mt-1 font-bold text-slate-900">
                          {test.durationMinutes} min
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-bold">
                          Passing
                        </span>
                        <span className="block mt-1 font-bold text-slate-900">
                          {test.passingPercentage}%
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                        <span className="block text-[10px] uppercase tracking-wide text-slate-400 font-bold">
                          Marking
                        </span>
                        <span className="block mt-1 font-bold text-slate-900">
                          +{correctMarks} / -{incorrectMarks}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onSelectTest(test)}
                      className={`w-full mt-5 py-3 rounded-xl text-sm font-bold transition ${
                        submitted
                          ? 'bg-slate-100 text-slate-500 border border-slate-200'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                      }`}
                    >
                      {submitted ? 'View Submission Status' : 'View Instructions & Start'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};
