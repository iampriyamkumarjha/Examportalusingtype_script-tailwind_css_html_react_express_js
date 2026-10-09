import { useState, useEffect, useRef } from 'react';
import { useAntiInspect } from './hooks/useAntiInspect';
import { storage } from './services/storage';
import { Student, ExamTest, ExamSubmission } from './types';
import { LoginPortal } from './components/LoginPortal';
import { AdminLayout, AdminTab } from './components/admin/AdminLayout';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { StudentManager } from './components/admin/StudentManager';
import { TeacherManager } from './components/admin/TeacherManager';
import { auth } from './services/auth';
import { CreateTestStudio } from './components/admin/CreateTestStudio';
import LiveTestControl from './components/admin/LiveTestControl';
import { ViewResponses } from './components/admin/ViewResponses';
import { ResponsesByTest } from './components/admin/ResponsesByTest';
import { ResultPending } from './components/student/ResultPending';
import { AdminSecurity } from './components/admin/AdminSecurity';
import { StudentInstructions } from './components/student/StudentInstructions';
import { StudentTestDashboard } from './components/student/StudentTestDashboard';
import { PinGate } from './components/student/PinGate';
import { ExamScreen } from './components/student/ExamScreen';
import { ExamResult } from './components/student/ExamResult';

export default function App() {
  const [currentView, setCurrentView] = useState<
    'login' | 'admin' | 'student_dashboard' | 'student_instructions' | 'student_exam' | 'student_result' | 'student_result_pending' | 'student_already_submitted'
  >('login');

  const [adminTab, setAdminTab] = useState<AdminTab>('dashboard');
  const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
  const [activeTest, setActiveTest] = useState<ExamTest | null>(null);
  const [pinTest, setPinTest] = useState<ExamTest | null>(null); // test jiska PIN student se maanga ja raha hai
  const [currentSubmission, setCurrentSubmission] = useState<ExamSubmission | null>(null);
  const [availableTests, setAvailableTests] = useState<ExamTest[]>([]);

  // Login ke baad (student ke har page par) inspect / copy / right-click block.
  // Admin aur login screen par band rehta hai.
  const isStudentView = currentView.startsWith('student_');
  useAntiInspect(isStudentView);

  // Full screen exam: exit hone par "Return to fullscreen" overlay
  const [fsLost, setFsLost] = useState(false);
  useEffect(() => {
    if (currentView !== 'student_exam') {
      setFsLost(false);
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
      return;
    }
    const onFsChange = () => setFsLost(!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, [currentView]);

  const enterFullscreen = () =>
    document.documentElement.requestFullscreen().catch(() => {});

  // Restore session or test state if available
  useEffect(() => {
  const initializeAppData = async () => {
    await storage.syncFromFirebase();

    const student = storage.getCurrentStudent();

    if (student) {
      setCurrentStudent(student);
    }
  };

  void initializeAppData();
}, []);

  const handleStudentLogin = async (student: Student) => {
    await storage.syncFromFirebase();
    const publishedTests = storage.getTests().filter((test) => test.status === 'published');
    setCurrentStudent(student);
    setCurrentSubmission(null);
    setAvailableTests(publishedTests);
    setActiveTest(null);
    setCurrentView('student_dashboard');
  };

  const handleSelectTest = (test: ExamTest) => {
    if (!currentStudent) return;
    const alreadySubmitted =
      storage.getSubmissionForStudentAndTest(String(currentStudent.id), String(test.id)) ||
      storage.getSubmissionForStudentAndTest(String(currentStudent.regNumber), String(test.id)) ||
      storage.getSubmissionForStudentAndTest(String(currentStudent.rollNumber), String(test.id));
    setActiveTest(test);
    if (alreadySubmitted) {
      setCurrentSubmission(alreadySubmitted);
      setCurrentView('student_already_submitted');
      return;
    }
    setCurrentSubmission(null);

    // Teacher ka diya hua PIN dalne ke baad hi instructions page khulega
    if (test.accessPin) {
      setPinTest(test);
      return;
    }
    setCurrentView('student_instructions');
  };

  const handlePinVerified = (test: ExamTest) => {
    setActiveTest(test);
    setPinTest(null);
    setCurrentSubmission(null);
    setCurrentView('student_instructions');
  };

  const handleAdminLogin = (_user?: unknown) => {
    setCurrentView('admin');
    setAdminTab('dashboard');
  };

  const handleLogout = () => {
    void auth.logout();
    setPinTest(null);
    storage.setCurrentStudent(null);
    setCurrentStudent(null);
    setActiveTest(null);
    setCurrentSubmission(null);
    setAvailableTests([]);
    setCurrentView('login');
  };

  // ---------- Browser Back / Forward ----------
  // Har page / admin tab ek history entry banata hai, isliye Back dabane par ek-ek karke
  // pichhle tab / page par jaate hain. Sabse pehle page ke baad hi login (home) aata hai.
  // Live exam ke dauran Back band rehta hai.
  type NavState = { view: typeof currentView; tab: AdminTab };
  const viewRef = useRef(currentView);
  const tabRef = useRef(adminTab);
  viewRef.current = currentView;
  tabRef.current = adminTab;
  const logoutRef = useRef(handleLogout);
  logoutRef.current = handleLogout;
  const skipPush = useRef(false);
  const firstNav = useRef(true);

  useEffect(() => {
    const state = { nav: { view: currentView, tab: adminTab } as NavState };
    if (firstNav.current) {
      firstNav.current = false;
      window.history.replaceState(state, '');
      return;
    }
    if (skipPush.current) {
      skipPush.current = false;
      return;
    }
    // login aur exam par nayi entry nahi banti (exam mein Back ko wapas aana hi nahi hai)
    if (currentView === 'login' || currentView === 'student_exam') {
      window.history.replaceState(state, '');
      return;
    }
    window.history.pushState(state, '');
  }, [currentView, adminTab]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const nav = (e.state && (e.state as { nav?: NavState }).nav) || undefined;
      const cur = viewRef.current;

      // Live test chal raha hai: Back disable
      if (cur === 'student_exam') {
        window.history.pushState({ nav: { view: 'student_exam', tab: tabRef.current } as NavState }, '');
        return;
      }

      // Logout ke baad purane portal pages par wapas na ja sako
      if (cur === 'login') {
        window.history.replaceState({ nav: { view: 'login', tab: 'dashboard' } as NavState }, '');
        return;
      }

      // Sabse pehle page se Back = home (login) page
      if (!nav || nav.view === 'login') {
        skipPush.current = true;
        logoutRef.current();
        return;
      }

      // Exam wali entry par kabhi wapas nahi jaana, ek aur step peeche jao
      if (nav.view === 'student_exam') {
        window.history.back();
        return;
      }

      const changed = nav.view !== cur || (nav.view === 'admin' && nav.tab !== tabRef.current);
      if (!changed) return;
      skipPush.current = true;
      if (nav.view === 'admin') setAdminTab(nav.tab);
      setCurrentView(nav.view);
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleStartExam = () => {
    if (!currentStudent || !activeTest) return;

    const alreadySubmitted =
      storage.getSubmissionForStudentAndTest(String(currentStudent.id), String(activeTest.id)) ||
      storage.getSubmissionForStudentAndTest(String(currentStudent.regNumber), String(activeTest.id)) ||
      storage.getSubmissionForStudentAndTest(String(currentStudent.rollNumber), String(activeTest.id));

    if (alreadySubmitted) {
      setCurrentSubmission(alreadySubmitted);
      setCurrentView('student_already_submitted');
      return;
    }

    // Click ke turant andar hi fullscreen maango (browser sirf user-click par allow karta hai)
    void enterFullscreen();
    setCurrentView('student_exam');
  };

  // A student sees the score only after the admin has published the result of that test.
  // Always re-reads Firestore so a result published a moment ago is picked up.
  const openResultIfPublished = async (submission: ExamSubmission): Promise<boolean> => {
    try {
      await storage.syncFromFirebase();
    } catch (error) {
      console.error(error);
    }
    const test = storage.getTests().find((t) => String(t.id) === String(submission.testId));
    const published = !!test?.resultPublished;
    setCurrentSubmission(submission);
    setCurrentView(published ? 'student_result' : 'student_result_pending');
    return published;
  };

  const handleExamCompleted = (submission: ExamSubmission) => {
    setCurrentSubmission(submission);
    void openResultIfPublished(submission);
  };

  return (
    <div className="min-h-screen bg-[#faf8ff] text-[#131b2e]">
      {/* 1. LOGIN PORTAL VIEW (Screen 1) */}
      {currentView === 'login' && (
       <LoginPortal onStudentLogin={handleStudentLogin} onStaffLogin={handleAdminLogin} />
      )}
      {/* 2. ADMIN PORTAL VIEW (Screens 2, 3, 6, 7, 8, 9) */}
      {currentView === 'admin' && (
        <AdminLayout
          currentTab={adminTab}
          onTabChange={(tab) => setAdminTab(tab)}
          onLogout={handleLogout}
        >
          {adminTab === 'dashboard' && <AdminDashboard onNavigateTab={(tab) => setAdminTab(tab)} />}
          {adminTab === 'students' && <StudentManager onNavigateTab={(tab) => setAdminTab(tab)} />}
          {(adminTab as string) === 'teachers' && auth.isAdmin() && <TeacherManager />}
          {adminTab === 'create_test' && (
            <CreateTestStudio
              onTestPublished={(newTest) => {
                setActiveTest(newTest);
              }}
              onPreviewStudentView={() => {
                const sampleStudent: Student = {
                  id: 'demo_inspector',
                  name: 'Rahul Sharma',
                  email: 'rahul.sharma@mce.edu',
                  rollNumber: '101',
                  regNumber: 'STU001',
                  department: 'B.Sc. (Computer Science)',
                  password: 'demo',
                  status: 'active',
                  createdAt: new Date().toISOString(),
                };
                const test = storage.getActiveTest() || {
                  id: 'preview_test',
                  title: 'Mathematics & Sciences (Paper I)',
                  code: 'MCE-MATH-2025-CBT',
                  subject: 'Mathematics & Logic',
                  paperRef: 'CBT-ENG-09',
                  department: 'B.Sc. (Computer Science)',
                  durationMinutes: 60,
                  passingPercentage: 40,
                  markingScheme: { correct: 1.0, incorrect: 0.0 },
                  questions: [],
                  proctorRules: {
                    tabBlurAutoSubmit: true,
                    toleranceThreshold: 'zero_tolerance',
                    blurSensitivity: 'instantaneous',
                    fullscreenLock: true,
                    webcamProctoring: false,
                    clipboardLock: true,
                    dualMonitorBlocker: true,
                    securePasscode: 'MCE-MATH-9921',
                  },
                  status: 'published',
                };
                setCurrentStudent(sampleStudent);
                setActiveTest(test);
                setCurrentView('student_instructions');
              }}
            />
          )}
          {adminTab === 'live_tests' && <LiveTestControl />}
          {adminTab === 'responses' && (
            <>
              <ResponsesByTest />
              <ViewResponses />
            </>
          )}
          {adminTab === 'security' && <AdminSecurity />}
        </AdminLayout>
      )}

      {/* 3. STUDENT AVAILABLE TESTS */}
      {currentView === 'student_dashboard' && currentStudent && (
        <StudentTestDashboard
          student={currentStudent}
          tests={availableTests}
          submissions={storage.getSubmissions()}
          onSelectTest={handleSelectTest}
          onLogout={handleLogout}
        />
      )}
      {currentView === 'student_dashboard' && currentStudent && pinTest && (
        <PinGate test={pinTest} onVerified={handlePinVerified} onCancel={() => setPinTest(null)} />
      )}

      {/* 3. STUDENT PRE-EXAM INSTRUCTIONS */}
      {currentView === 'student_instructions' && currentStudent && (
        <>
          {activeTest ? (
            <StudentInstructions
              student={currentStudent}
              activeTest={activeTest}
              onStartExam={handleStartExam}
              onLogout={handleLogout}
            />
          ) : (
            <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
              <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-3xl">pending_actions</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">No Published Examination Available</h2>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Welcome, <strong>{currentStudent.name}</strong>. Currently, the administrator has not scheduled or
                  published any active examination for your department ({currentStudent.department}).
                </p>
                <div className="p-3 bg-blue-50 text-blue-800 text-xs rounded-xl border border-blue-100">
                  Please ask the administrator to log into the Admin Portal and publish the examination via the &quot;Create
                  Test&quot; section.
                </div>
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      const test = storage.getActiveTest();
                      if (test) setActiveTest(test);
                      else alert('Still no examination published. Please publish from the Admin section.');
                    }}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                  >
                    Check for Published Exam Again
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer"
                  >
                    Log Out of Student Section
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 4. STUDENT ALREADY-SUBMITTED NOTICE */}
      {currentView === 'student_already_submitted' && currentStudent && currentSubmission && (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
          <div className="max-w-lg w-full bg-white rounded-3xl border border-emerald-200 shadow-xl p-8 text-center">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mb-5">
              <span className="material-symbols-outlined text-4xl">check_circle</span>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900">Already Submitted</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              Hi <strong className="text-slate-800">{currentStudent.name}</strong>, you have already submitted this examination.
              You cannot start the same examination again.
            </p>
            <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-200 text-left">
              <div className="text-xs text-slate-400 uppercase tracking-wider font-bold">Examination</div>
              <div className="mt-1 text-sm font-bold text-slate-900">
                {activeTest?.title || currentSubmission.testTitle}
              </div>
              <div className="mt-1 text-xs text-slate-500 font-mono">
                {activeTest?.code || currentSubmission.testCode}
              </div>
            </div>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => void openResultIfPublished(currentSubmission)}
                className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition"
              >
                View Submitted Result
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. STUDENT LIVE EXAM WITH STRICT WINDOW BLUR SENTINEL (Screen 4) */}
      {currentView === 'student_exam' && currentStudent && activeTest && (
        <ExamScreen
          student={currentStudent}
          test={activeTest}
          onExamCompleted={handleExamCompleted}
        />
      )}

      {currentView === 'student_exam' && fsLost && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/95 flex items-center justify-center p-6 text-center">
          <div className="max-w-sm space-y-4">
            <h2 className="text-white text-xl font-extrabold">Full screen required</h2>
            <p className="text-slate-300 text-sm">
              Exam full screen mein hi chalega. Continue karne ke liye neeche click karo.
            </p>
            <button
              type="button"
              onClick={() => void enterFullscreen()}
              className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold"
            >
              Return to Full Screen
            </button>
          </div>
        </div>
      )}

      {/* 4b. SUBMITTED - RESULT NOT PUBLISHED YET */}
      {currentView === 'student_result_pending' && currentStudent && currentSubmission && (
        <ResultPending
          submission={currentSubmission}
          onCheck={() => openResultIfPublished(currentSubmission)}
          onLogout={handleLogout}
        />
      )}

      {/* 5. STUDENT EXAM RESULT & AUDIT REVIEW (Screen 5) */}
      {currentView === 'student_result' && currentSubmission && (
        <ExamResult
          submission={currentSubmission}
          test={
            activeTest || {
              id: currentSubmission.testId,
              title: currentSubmission.testTitle,
              code: currentSubmission.testCode,
              subject: 'Mathematics & Logic',
              paperRef: 'CBT-ENG-09',
              department: currentSubmission.studentDepartment,
              durationMinutes: 60,
              passingPercentage: 40,
              markingScheme: { correct: 1.0, incorrect: 0.0 },
              questions: [],
              proctorRules: {
                tabBlurAutoSubmit: true,
                toleranceThreshold: 'zero_tolerance',
                blurSensitivity: 'instantaneous',
                fullscreenLock: true,
                webcamProctoring: false,
                clipboardLock: true,
                dualMonitorBlocker: true,
                securePasscode: 'MCE-MATH-9921',
              },
              status: 'published',
            }
          }
          onReturnToDashboard={handleLogout}
        />
      )}
    </div>
  );
}
