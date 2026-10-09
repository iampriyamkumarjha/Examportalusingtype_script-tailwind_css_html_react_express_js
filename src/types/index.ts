export interface Student {
  id: string;
  name: string;
  email: string;
  rollNumber: string;
  regNumber: string;
  department: string;
  password: string;
  status: 'active' | 'in_exam' | 'completed' | 'locked';
  createdAt: string;
  capturedPhotoUrl?: string;
  photoCapturedAt?: string;
}

export interface QuestionOption {
  id: 'A' | 'B' | 'C' | 'D';
  text: string;
  annotation?: string;
}

export interface Question {
  id: number;
  questionNumber: number;
  type: 'mcq_single' | 'mcq_multi' | 'numerical';
  statement: string;
  options: QuestionOption[];
  correctOption: 'A' | 'B' | 'C' | 'D';
  marks: number;
  negativeMarks: number;
  section: string;
  explanation: string;
  hint?: string;
}

export interface ProctorRules {
  tabBlurAutoSubmit: boolean;
  toleranceThreshold: 'zero_tolerance' | '1_warning' | '2_warnings' | 'audit_only';
  blurSensitivity: 'instantaneous' | 'standard' | 'relaxed';
  fullscreenLock: boolean;
  webcamProctoring: boolean;
  clipboardLock: boolean;
  dualMonitorBlocker: boolean;
  allowedSubnet?: string;
  securePasscode: string;
}

export interface ExamTest {
  id: string;
  /** 6-digit PIN jo admin ko test banate waqt milta hai; student ko test kholne se pehle dalna padta hai */
  accessPin?: string;
  title: string;
  code: string;
  subject: string;
  paperRef: string;
  department: string;
  durationMinutes: number;
  passingPercentage: number;
  markingScheme: {
    correct: number;
    incorrect: number;
  };
  questions: Question[];
  proctorRules: ProctorRules;
  status: 'draft' | 'published';
  publishedAt?: string;
  startTime?: string;
  endTime?: string;
  updatedAt?: string;
  /** Students can see their result only after the admin publishes it. */
  resultPublished?: boolean;
  resultPublishedAt?: string | null;
}

export interface ExamAnswer {
  questionId: number;
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
  status: 'answered' | 'not_answered' | 'marked_review' | 'answered_marked_review' | 'not_visited';
  timeSpentSeconds: number;
}

export interface ExamSubmission {
  id: string;
  testId: string;
  testTitle: string;
  testCode: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRoll: string;
  studentReg: string;
  studentDepartment: string;
  totalMarks: number;
  maxMarks: number;
  percentageScore: number;
  passed: boolean;
  correctAnswersCount: number;
  incorrectAnswersCount: number;
  unattemptedCount: number;
  timeSpentSeconds: number;
  submittedAt: string;
  isViolation: boolean;
  violationReason?: string;
  tabSwitchCount: number;
  answers: Record<number, ExamAnswer>;
  capturedPhotoUrl?: string;
  photoCapturedAt?: string;
}

export interface AdminCredentials {
  email: string;
  username: string;
  password: string;
  name: string;
  role: string;
  twoFactorEnabled: boolean;
  lastPasswordChanged: string;
}

export interface AdminSession {
  id: string;
  device: string;
  ip: string;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}
