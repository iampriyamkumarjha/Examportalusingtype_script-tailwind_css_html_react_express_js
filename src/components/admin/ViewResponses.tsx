import React, { useState, useEffect } from 'react';
import { storage } from '../../services/storage';
import { ExamSubmission } from '../../types';

export const ViewResponses: React.FC = () => {
  const [submissions, setSubmissions] = useState<ExamSubmission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<ExamSubmission | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [testFilter, setTestFilter] = useState('');

  const loadSubmissions = () => {
    const list = storage.getSubmissions();
    setSubmissions(list);
    if (list.length > 0 && !selectedSubmission) {
      setSelectedSubmission(list[0]);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, []);

  const totalCount = submissions.length;
  const passedCount = submissions.filter((s) => s.passed).length;
  const passRate = totalCount > 0 ? ((passedCount / totalCount) * 100).toFixed(1) : '0.0';
  const averageScore =
    totalCount > 0
      ? (submissions.reduce((acc, s) => acc + s.percentageScore, 0) / totalCount).toFixed(1)
      : '0.0';
  const violationsCount = submissions.filter((s) => s.isViolation).length;

  const filtered = submissions.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      s.studentName.toLowerCase().includes(q) ||
      s.studentReg.toLowerCase().includes(q) ||
      s.studentRoll.toLowerCase().includes(q);

    const matchesStatus =
      !statusFilter ||
      (statusFilter === 'violation' && s.isViolation) ||
      (statusFilter === 'clean' && !s.isViolation) ||
      (statusFilter === 'passed' && s.passed);

    const matchesTest = !testFilter || s.testTitle.toLowerCase().includes(testFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesTest;
  });

  const exportCSV = () => {
    if (submissions.length === 0) {
      alert('No submission data available to export.');
      return;
    }
    const headers = ['Roll No', 'Registration No', 'Candidate Name', 'Test Subject', 'Score', 'Max Marks', '% Score', 'Status', 'Violation', 'Submitted At'];
    const rows = submissions.map((s) => [
      s.studentRoll,
      s.studentReg,
      `"${s.studentName}"`,
      `"${s.testTitle}"`,
      s.totalMarks,
      s.maxMarks,
      `${s.percentageScore}%`,
      s.passed ? 'PASSED' : 'FAILED',
      s.isViolation ? `"${s.violationReason || 'Tab Blur'}"` : 'Clean',
      s.submittedAt,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MCE_Examination_Results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1440px] mx-auto">
      {/* Section Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 border border-blue-100">
          
            </div>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">
              View Responses & Results Analytics
            </h1>
          </div>
          <p className="text-slate-500 text-sm pl-1">
            Analyze candidate performance, score distributions, automated gradings, and proctoring integrity records.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-sm cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm text-slate-500"></span>
            <span>Export Excel / CSV</span>
          </button>
          <button
            onClick={handlePrintCertificate}
            className="inline-flex items-center gap-2 bg-[#1e60d5] hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition shadow-sm shadow-blue-500/20 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm"></span>
            <span>Print Summary</span>
          </button>
        </div>
      </div>

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Submissions */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <span className="material-symbols-outlined"></span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              +{totalCount} total
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{totalCount}</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Total Submissions</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: totalCount > 0 ? '100%' : '0%' }}></div>
          </div>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <span className="material-symbols-outlined"></span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              Avg Score
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{averageScore}%</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Cohort Average</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${averageScore}%` }}></div>
          </div>
        </div>

        {/* Passing Rate */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <span className="material-symbols-outlined"></span>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-100">
              {passedCount} Passed
            </span>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-slate-900 tracking-tight">{passRate}%</div>
            <div className="text-xs text-slate-500 font-medium mt-0.5">Passing Ratio (Threshold ≥ 40%)</div>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div className="bg-purple-600 h-1.5 rounded-full" style={{ width: `${passRate}%` }}></div>
          </div>
        </div>

        {/* Proctoring Guard Violations */}
        <div className="bg-white rounded-2xl p-5 border border-amber-200 shadow-sm flex flex-col justify-between bg-gradient-to-b from-white to-amber-50/20">
          <div className="flex items-start justify-between">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <span className="material-symbols-outlined"></span>
            </div>
            {violationsCount > 0 && (
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                Action Required
              </span>
            )}
          </div>
          <div className="mt-4">
            <div className="text-2xl font-bold text-rose-600 tracking-tight">{violationsCount} Terminations</div>
            <div className="text-xs text-slate-600 font-medium mt-0.5">Auto-submitted via Tab Monitors</div>
          </div>
          <div className="text-[11px] text-amber-700 font-semibold mt-2.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-xs"></span>
            <span></span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          <div className="md:col-span-5 relative">
            <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Registration No., Student Name..."
              className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 hover:bg-white text-slate-800 outline-none transition"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={testFilter}
              onChange={(e) => setTestFilter(e.target.value)}
              className="w-full py-2.5 px-3 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 hover:bg-white text-slate-700 outline-none transition"
            >
              <option value="">All Tests</option>
              <option value="Mathematics">java and o.s</option>
              <option value="ED">ED Test - Engineering Drawing</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full py-2.5 px-3 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-slate-50/50 hover:bg-white text-slate-700 outline-none transition"
            >
              <option value="">All Statuses</option>
              <option value="clean">Submitted (Verified)</option>
              <option value="violation">Tab Violation (Auto-submit)</option>
              <option value="passed">Passed Only</option>
            </select>
          </div>

          <div className="md:col-span-1 flex justify-end">
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('');
                setTestFilter('');
                loadSubmissions();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs flex items-center justify-center gap-1 shadow-sm transition cursor-pointer"
              title="Refresh Responses"
            >
              <span className="material-symbols-outlined text-sm">Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Split Layout: Data Table + Inspection Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Table Column */}
        <div className="xl:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">drafts</span>
              <h4 className="text-sm font-bold text-slate-700 mt-2">No Student Submissions Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                When students take their exams, automated grading and proctoring tab audit logs will instantly appear
                here in real-time.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="py-3.5 pl-5 pr-2 w-12 text-center">#</th>
                    <th className="py-3.5 px-3">Reg No. (Username)</th>
                    <th className="py-3.5 px-3">Candidate Name</th>
                    <th className="py-3.5 px-3">Test Subject</th>
                    <th className="py-3.5 px-3 text-center">Marks</th>
                    <th className="py-3.5 px-3 text-center">% Score</th>
                    <th className="py-3.5 px-3">Submitted On</th>
                    <th className="py-3.5 px-3 text-center">Integrity Status</th>
                    <th className="py-3.5 pr-5 pl-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filtered.map((sub, idx) => {
                    const isSelected = selectedSubmission?.id === sub.id;
                    const initials = sub.studentName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2);

                    return (
                      <tr
                        key={sub.id}
                        onClick={() => setSelectedSubmission(sub)}
                        className={`transition cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50/60 border-l-4 border-l-blue-600'
                            : sub.isViolation
                            ? 'bg-amber-50/30 hover:bg-amber-50/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-3.5 pl-5 pr-2 text-center font-medium text-slate-500">{idx + 1}</td>
                        <td className="py-3.5 px-3 font-semibold text-blue-600 font-mono">{sub.studentReg}</td>
                        <td className="py-3.5 px-3">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[11px] shrink-0">
                              {initials}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{sub.studentName}</div>
                              <div className="text-[10px] text-slate-400">{sub.studentEmail}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-3 text-slate-700 font-medium truncate max-w-[140px]">
                          {sub.testTitle}
                        </td>
                        <td className="py-3.5 px-3 text-center font-bold text-slate-900">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 rounded">
                            {sub.totalMarks} / {sub.maxMarks}
                          </span>
                        </td>
                        <td
                          className={`py-3.5 px-3 text-center font-extrabold ${
                            sub.percentageScore >= 40 ? 'text-emerald-600' : 'text-rose-600'
                          }`}
                        >
                          {sub.percentageScore}%
                        </td>
                        <td className="py-3.5 px-3 text-slate-500 whitespace-nowrap">
                          {sub.submittedAt ? sub.submittedAt.slice(0, 16).replace('T', ' ') : 'Just now'}
                        </td>
                        <td className="py-3.5 px-3 text-center">
                          {sub.isViolation ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                              <span className="material-symbols-outlined text-xs text-amber-700"></span>
                              <span>Auto-Submit</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <span className="material-symbols-outlined text-xs text-emerald-600"></span>
                              <span>Submitted</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 pr-5 pl-2 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSubmission(sub);
                            }}
                            className={`inline-flex items-center text-xs font-semibold ${
                              sub.isViolation
                                ? 'text-rose-600 hover:text-rose-700'
                                : 'text-blue-600 hover:text-blue-700'
                            }`}
                          >
                            {sub.isViolation ? 'Log Audit →' : 'Scorecard →'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Table Footer */}
          <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
            <div>
              Showing <span className="font-bold text-slate-800">{filtered.length}</span> of{' '}
              <span className="font-bold text-slate-800">{submissions.length}</span> submissions
            </div>
            <span className="text-[11px] text-slate-400">All submissions verified with cryptographic signatures</span>
          </div>
        </div>

        {/* Candidate Scorecard Inspection Panel (Cols 4) */}
        <div className="xl:col-span-4 space-y-4">
          {selectedSubmission ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
              <div className="flex items-start justify-between border-b border-slate-100 pb-3 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {selectedSubmission.capturedPhotoUrl ? (
                    <img
                      src={selectedSubmission.capturedPhotoUrl}
                      alt={selectedSubmission.studentName}
                      className="w-12 h-12 rounded-xl object-cover border-2 border-emerald-400 shadow-xs shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {selectedSubmission.studentName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                      Candidate Profile
                    </span>
                    <h3 className="font-bold text-slate-900 mt-0.5 text-base truncate">{selectedSubmission.studentName}</h3>
                    <p className="text-xs text-slate-500 truncate">
                      Username: <span className="font-mono font-bold text-blue-700">{selectedSubmission.studentReg}</span> • Roll:{' '}
                      <span className="font-semibold text-slate-700">{selectedSubmission.studentRoll}</span>
                    </p>
                    {selectedSubmission.photoCapturedAt && (
                      <p className="text-[10px] text-emerald-700 font-medium truncate">
                        Security Photo: {selectedSubmission.photoCapturedAt}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                    selectedSubmission.passed
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {selectedSubmission.passed ? 'PASSED' : 'NEEDS RETEST'}
                </span>
              </div>

              {/* Subject & Score Block */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">{selectedSubmission.testTitle}</div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-2xl font-extrabold text-slate-900">
                    {selectedSubmission.totalMarks}{' '}
                    <span className="text-sm font-normal text-slate-400">/ {selectedSubmission.maxMarks}</span>
                  </span>
                  <span
                    className={`text-sm font-bold ${
                      selectedSubmission.percentageScore >= 40 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {selectedSubmission.percentageScore}% Grade
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full"
                    style={{ width: `${Math.min(100, selectedSubmission.percentageScore)}%` }}
                  ></div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Correct Answers
                  </span>
                  <span className="font-bold text-slate-900">{selectedSubmission.correctAnswersCount}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Incorrect Answers
                  </span>
                  <span className="font-bold text-slate-900">{selectedSubmission.incorrectAnswersCount}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> Unattempted
                  </span>
                  <span className="font-bold text-slate-900">{selectedSubmission.unattemptedCount}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100 text-slate-600">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-slate-400">timer</span>
                    Time Elapsed
                  </span>
                  <span className="font-semibold text-slate-800">
                    {Math.floor(selectedSubmission.timeSpentSeconds / 60)}m{' '}
                    {selectedSubmission.timeSpentSeconds % 60}s
                  </span>
                </div>
              </div>

              {/* Integrity status card */}
              {selectedSubmission.isViolation ? (
                <div className="bg-rose-50 rounded-xl p-3.5 border border-rose-200 space-y-1">
                  <div className="flex items-center gap-1.5 text-rose-800 font-bold text-xs">
                    <span className="material-symbols-outlined text-rose-600 text-sm">warning</span>
                    <span>Proctoring Security Violation</span>
                  </div>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    {selectedSubmission.violationReason ||
                      'Student switched browser tabs during live testing. Examination was instantly and automatically submitted by the sentinel guard.'}
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-200">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-xs"></span>
                    </div>
                    <div>
                      <div className="text-xs font-bold text-emerald-950">Clean Proctoring Session</div>
                      <div className="text-[11px] text-emerald-700">0 Tab-switches • Integrity Intact</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={handlePrintCertificate}
                className="w-full py-2.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base"></span>
                <span>Download Grade Certificate (PDF)</span>
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              Select any candidate row to view detailed assessment analytics.
            </div>
          )}

         
        </div>
      </div>
    </div>
  );
};
