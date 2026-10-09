import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { storage } from '../services/storage';
import { Student } from '../types';
import { StaffUser } from '../services/auth';
import { StaffLogin } from './StaffLogin';

interface LoginPortalProps {
  onStudentLogin: (student: Student) => void;
  onStaffLogin: (user: StaffUser) => void;
}

export const LoginPortal: React.FC<LoginPortalProps> = ({ onStudentLogin, onStaffLogin }) => {
  const [activeTab, setActiveTab] = useState<'student' | 'admin'>('student');

  // Student form state
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);


 const handleStudentSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setStudentError(null);

  try {
    // Always get the latest shared data from Firebase
    await storage.syncFromFirebase();

    const student = storage.findStudentByRegOrRoll(studentId.trim());
    const allStudents = storage.getStudents();

    if (allStudents.length === 0) {
      setStudentError(
        'No student accounts are currently registered in the system. The Administrator must create student credentials in the Admin Portal before student login is possible.'
      );
      return;
    }

    if (!student) {
      setStudentError(
        `No candidate found with Registration Number: "${studentId}". Please enter your official Registration Number (which serves as your Student Username).`
      );
      return;
    }

    if (student.password !== studentPassword) {
      setStudentError(
        'Incorrect password entered. Please verify or ask the administrator for assistance.'
      );
      return;
    }

    storage.setCurrentStudent(student);
    onStudentLogin(student);

  } catch (error) {
    console.error('Student login Firebase sync failed:', error);

    setStudentError(
      'Unable to connect to the shared database. Please check your internet connection and try again.'
    );
  }
};
  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white relative bg-[#f1f5f9]">
      {/* Subtle decorative ambient backdrop shapes */}
      <div aria-hidden="true" className="bg-shape-left"></div>
      <div aria-hidden="true" className="bg-shape-right"></div>

      {/* Main Header */}
      <header className="relative z-10 bg-gradient-to-r from-[#1e60d5] via-[#1d57c9] to-[#184ebd] text-white shadow-lg border-b border-blue-400/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          {/* Upper Status Row */}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-blue-400/25 text-xs">
            <div className="flex items-center space-x-2 text-blue-100">
            </div>
            {/* Language & Help Link */}
            <div className="flex items-center space-x-4 text-xs text-blue-100 font-medium ml-auto">
              <div className="flex items-center space-x-1 cursor-pointer hover:text-white transition">
                <svg className="w-4 h-4 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                  ></path>
                </svg>
              
              </div>
              <span className="text-blue-300/60">•</span>
              <button
                onClick={() =>
                  alert(
                    'MCE Examination Portal Helpdesk\n• Students must have valid registration credentials issued by administrator.\n• Teachers and admin: use the Teacher / Admin tab.'
                  )
                }
                className="hover:text-white transition"
              >
                Support Desk
              </button>
            </div>
          </div>

          {/* Main Title Section */}
          <div className="pt-4 pb-2 text-center">
            <div className="inline-flex items-center justify-center p-2 mb-2 bg-white/10 rounded-2xl backdrop-blur-sm shadow-inner">
              <svg className="w-8 h-8 text-blue-100" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"></path>
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              MCE Examination Portal
            </h1>
            <p className="text-xs sm:text-sm font-medium text-blue-100 mt-1 max-w-xl mx-auto tracking-wide">
              Secure Examination Portal 
            </p>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 sm:px-6 py-8 md:py-12">
        <div className="w-full max-w-[560px]">
          {/* Quick Portal Switcher Pills */}
          <div className="mb-5 bg-slate-200/90 backdrop-blur p-1.5 rounded-2xl flex items-center shadow-inner gap-1 border border-slate-300/60">
            <button
              onClick={() => setActiveTab('student')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-200 ${
                activeTab === 'student'
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 3L1 9l11 6 9-4.91V17h2V9L12 3z M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z"></path>
              </svg>
              <span>Student Login</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-semibold flex items-center justify-center space-x-2 transition-all duration-200 ${
                activeTab === 'admin'
                  ? 'bg-white text-emerald-600 shadow-md'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              type="button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                ></path>
              </svg>
              <span>Teacher / Admin</span>
            </button>
          </div>

          {/* Main Login Container Card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 p-7 sm:p-10 relative overflow-hidden backdrop-blur-xl">
            {/* Ambient top card highlight line */}
            <div
              className={`absolute top-0 left-0 right-0 h-1.5 transition-all duration-300 ${
                activeTab === 'student'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600'
                  : 'bg-gradient-to-r from-emerald-500 to-teal-600'
              }`}
            ></div>

            {/* ============================================== */}
            {/* STUDENT LOGIN FORM SECTION                    */}
            {/* ============================================== */}
            {activeTab === 'student' && (
              <div className="animate-in fade-in duration-200">
                <div className="text-center mb-7">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-50 border-4 border-blue-100/70 flex items-center justify-center text-blue-600 shadow-inner">
                    <svg className="w-11 h-11" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2L1 7l11 5 9-4.09V17h2V7L12 2zm0 13c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"></path>
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Student Login</h2>
                  <p className="text-sm text-slate-500 mt-1">Please enter your credentials to continue</p>
                </div>

                {studentError && (
                  <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 leading-relaxed flex items-start space-x-2">
                    <span className="material-symbols-outlined text-rose-600 text-sm mt-0.5">error</span>
                    <div>{studentError}</div>
                  </div>
                )}

                <form className="space-y-4" onSubmit={handleStudentSubmit}>
                  {/* Registration Number (Student Username) */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Registration Number (Student Username) <span className="text-rose-500">*</span></span>
                      <span className="text-[10px] text-blue-600 font-bold lowercase">reg number = username</span>
                    </label>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          ></path>
                        </svg>
                      </div>
                      <input
                        className="block w-full pl-11 pr-4 py-3.5 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono transition duration-150 outline-none"
                        required
                        type="text"
                        value={studentId}
                        onChange={(e) => setStudentId(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Student Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Password <span className="text-rose-500">*</span>
                      </label>
                    </div>
                    <div className="relative rounded-xl shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          ></path>
                        </svg>
                      </div>
                      <input
                        className="block w-full pl-11 pr-11 py-3.5 text-sm rounded-xl border border-slate-200 text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150 outline-none"
                        required
                        type={showStudentPassword ? 'text' : 'password'}
                        value={studentPassword}
                        onChange={(e) => setStudentPassword(e.target.value)}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                        onClick={() => setShowStudentPassword(!showStudentPassword)}
                      >
                        {showStudentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  {/* Login Button */}
                  <div className="pt-2">
                    <button
                      className="w-full flex items-center justify-center space-x-2 py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/25 text-base font-bold text-white bg-[#1e60d5] hover:bg-[#184ebd] active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-all duration-150 cursor-pointer"
                      type="submit"
                    >
                      <span>Login</span>
                      <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"></path>
                      </svg>
                    </button>
                  </div>

                  {/* Switch to Admin prompt if empty */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('admin')}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline transition"
                    >
                      Are you a Teacher or Admin? Login here →
                    </button>
                  </div>

                </form>
              </div>
            )}

            {/* TEACHER / ADMIN LOGIN */}
            {activeTab === 'admin' && <StaffLogin onLoggedIn={onStaffLogin} />}
          </div>
        </div>
      </main>
    </div>
  );
};
