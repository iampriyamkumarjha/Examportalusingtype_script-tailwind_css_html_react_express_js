import { generatePin } from './testPin';
import { auth, TeacherOwned } from './auth';
import { Student, ExamTest, ExamSubmission, AdminCredentials, AdminSession, Question } from '../types';
import { db, collection, doc, setDoc, deleteDoc, getDocs, getDoc } from './localDb';

const STORAGE_KEYS = {
  STUDENTS: 'mce_students_data_v1',
  TESTS: 'mce_tests_data_v1',
  SUBMISSIONS: 'mce_submissions_data_v1',
  ADMIN_AUTH: 'mce_admin_auth_v1',
  ADMIN_SESSIONS: 'mce_admin_sessions_v1',
  CURRENT_STUDENT: 'mce_current_logged_student_v1',
  ACTIVE_EXAM_ID: 'mce_active_exam_id_v1',
};

const FIRESTORE_COLLECTIONS = {
  STUDENTS: 'students',
  TESTS: 'tests',
  SUBMISSIONS: 'submissions',
  ADMIN_CONFIG: 'adminConfig',
};

const DEFAULT_ADMIN: AdminCredentials = {
  email: 'owner@mce-exam.edu.in',
  username: 'owner@mce-exam.edu.in',
  password: '97987730041',
  name: 'Dr. A. Harrison',
  role: 'Chief Examiner (Admin)',
  twoFactorEnabled: true,
  lastPasswordChanged: new Date().toISOString(),
};

const DEFAULT_SESSIONS: AdminSession[] = [
  {
    id: 'sess-1',
    device: 'Chrome on Windows 11',
    ip: '192.168.1.45',
    location: 'Campus Network (This Device)',
    lastActive: 'Active Now',
    isCurrent: true,
  },
  {
    id: 'sess-2',
    device: 'Mobile Safari',
    ip: '103.21.144.2',
    location: 'Mumbai, IN',
    lastActive: '2 days ago',
    isCurrent: false,
  },
];

export const SAMPLE_MATH_QUESTIONS: Question[] = [
  { id: 1, questionNumber: 1, type: 'mcq_single', statement: 'If matrix A is of order 3×3 and |A| = 5, then find the value of |adj(A)|.', options: [{ id: 'A', text: '5' }, { id: 'B', text: '25', annotation: '|A|^(n-1) = 5^(3-1) = 25' }, { id: 'C', text: '125' }, { id: 'D', text: '1/5' }], correctOption: 'B', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'For any n×n matrix A, |adj(A)| = |A|^(n-1). Here n = 3 and |A| = 5, so |adj(A)| = 5^(3-1) = 5^2 = 25.' },
  { id: 2, questionNumber: 2, type: 'mcq_single', statement: 'The value of the limit lim (x → 0) [(sin 3x) / (tan 2x)] is equal to:', options: [{ id: 'A', text: '3/2' }, { id: 'B', text: '2/3' }, { id: 'C', text: '1' }, { id: 'D', text: '0' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'lim (x→0) (sin 3x / 3x) * (2x / tan 2x) * (3/2) = 1 * 1 * (3/2) = 3/2.' },
  { id: 3, questionNumber: 3, type: 'mcq_single', statement: 'Evaluate the definite integral: ∫ from 0 to π/2 of [sin³(x) cos(x)] dx.', options: [{ id: 'A', text: '1/4' }, { id: 'B', text: '1/2' }, { id: 'C', text: '1/3' }, { id: 'D', text: '1' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'Let u = sin(x), du = cos(x) dx. When x=0, u=0; when x=π/2, u=1. The integral becomes ∫₀¹ u³ du = [u⁴ / 4] from 0 to 1 = 1/4.' },
  { id: 4, questionNumber: 4, type: 'mcq_single', statement: 'What is the order and degree of the differential equation: [1 + (dy/dx)²]^(3/2) = k * (d²y/dx²)?', options: [{ id: 'A', text: 'Order = 2, Degree = 1' }, { id: 'B', text: 'Order = 2, Degree = 2' }, { id: 'C', text: 'Order = 1, Degree = 3' }, { id: 'D', text: 'Order = 3, Degree = 2' }], correctOption: 'B', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'Squaring both sides gives [1 + (dy/dx)²]³ = k² (d²y/dx²)². The highest order derivative is d²y/dx² (Order 2), and its power is 2 (Degree 2).' },
  { id: 5, questionNumber: 5, type: 'mcq_single', statement: 'If set A = {1, 2, 3, 4}, then find the total number of functions on set A which are NOT one-to-one (injective)?', options: [{ id: 'A', text: '24 functions' }, { id: 'B', text: '232 functions (256 - 24 = 232)' }, { id: 'C', text: '256 functions' }, { id: 'D', text: '216 functions' }], correctOption: 'B', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'Total number of functions from A to A = 4^4 = 256. Number of one-to-one (bijective) functions on set A is 4! = 24. Functions that are NOT one-to-one = 256 - 24 = 232.' },
  { id: 6, questionNumber: 6, type: 'mcq_single', statement: 'If the roots of the quadratic equation x² - px + q = 0 differ by 1, then which relation is true?', options: [{ id: 'A', text: 'p² = 4q + 1' }, { id: 'B', text: 'p² = 4q - 1' }, { id: 'C', text: 'q² = 4p + 1' }, { id: 'D', text: 'p² - 4q = 0' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: '|α - β| = 1 => (α - β)² = 1 => (α + β)² - 4αβ = 1 => p² - 4q = 1 => p² = 4q + 1.' },
  { id: 7, questionNumber: 7, type: 'mcq_single', statement: 'In how many ways can 5 boys and 5 girls sit in a circle such that no two girls sit together?', options: [{ id: 'A', text: '5! * 4!' }, { id: 'B', text: '4! * 5!' }, { id: 'C', text: '10!' }, { id: 'D', text: '4! * 4!' }], correctOption: 'B', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'First arrange 5 boys in a circle in (5-1)! = 4! ways. This creates 5 gaps between them. The 5 girls can be seated in these 5 gaps in 5! ways. Total = 4! * 5! = 2880.' },
  { id: 8, questionNumber: 8, type: 'mcq_single', statement: 'If vector a = 2i + j - 2k and vector b = i + j, find the scalar projection of a on b.', options: [{ id: 'A', text: '3 / √2' }, { id: 'B', text: '3 / 2' }, { id: 'C', text: '1 / √2' }, { id: 'D', text: '2 / √2' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'Scalar projection = (a · b) / |b|. a · b = (2)(1) + (1)(1) + (-2)(0) = 3. |b| = √(1² + 1²) = √2. Projection = 3 / √2.' },
  { id: 9, questionNumber: 9, type: 'mcq_single', statement: 'Two fair dice are thrown simultaneously. What is the probability that the sum of the numbers is greater than 9?', options: [{ id: 'A', text: '1/6' }, { id: 'B', text: '1/9' }, { id: 'C', text: '5/36' }, { id: 'D', text: '1/4' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'Sums greater than 9 are 10, 11, and 12. Pairs: for 10: (4,6), (5,5), (6,4) [3]; for 11: (5,6), (6,5) [2]; for 12: (6,6) [1]. Total favorable outcomes = 6. Probability = 6/36 = 1/6.' },
  { id: 10, questionNumber: 10, type: 'mcq_single', statement: 'The slope of the tangent to the curve y = x³ - x at the point where x = 2 is:', options: [{ id: 'A', text: '11' }, { id: 'B', text: '12' }, { id: 'C', text: '10' }, { id: 'D', text: '8' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'dy/dx = 3x² - 1. At x = 2: 3(2)² - 1 = 3(4) - 1 = 11.' },
  { id: 11, questionNumber: 11, type: 'mcq_single', statement: 'If A and B are symmetric matrices of the same order, then (AB - BA) is always:', options: [{ id: 'A', text: 'Skew-symmetric matrix' }, { id: 'B', text: 'Symmetric matrix' }, { id: 'C', text: 'Zero matrix' }, { id: 'D', text: 'Identity matrix' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: '(AB - BA)ᵀ = (AB)ᵀ - (BA)ᵀ = BᵀAᵀ - AᵀBᵀ = BA - AB = -(AB - BA). Hence it is a skew-symmetric matrix.' },
  { id: 12, questionNumber: 12, type: 'mcq_single', statement: 'The distance between the parallel planes 2x - y + 2z + 3 = 0 and 4x - 2y + 4z + 5 = 0 is:', options: [{ id: 'A', text: '1/6' }, { id: 'B', text: '1/3' }, { id: 'C', text: '2/3' }, { id: 'D', text: '1/2' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'Multiply first plane by 2: 4x - 2y + 4z + 6 = 0. Distance between 4x - 2y + 4z + d1=0 and +d2=0 is |d1 - d2| / √(a² + b² + c²) = |6 - 5| / √(16 + 4 + 16) = 1 / √36 = 1/6.' },
  { id: 13, questionNumber: 13, type: 'mcq_single', statement: 'Find the maximum value of f(x) = sin(x) + cos(x) for x ∈ ℝ.', options: [{ id: 'A', text: '√2' }, { id: 'B', text: '2' }, { id: 'C', text: '1' }, { id: 'D', text: '√3' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'For a sin x + b cos x, the maximum value is √(a² + b²). Here a=1, b=1, so max value is √(1 + 1) = √2.' },
  { id: 14, questionNumber: 14, type: 'mcq_single', statement: 'The eccentricity of the ellipse (x²/25) + (y²/16) = 1 is:', options: [{ id: 'A', text: '3/5' }, { id: 'B', text: '4/5' }, { id: 'C', text: '9/25' }, { id: 'D', text: '2/5' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'b² = a²(1 - e²) => 16 = 25(1 - e²) => 1 - e² = 16/25 => e² = 9/25 => e = 3/5.' },
  { id: 15, questionNumber: 15, type: 'mcq_single', statement: 'What is the sum of the infinite geometric series: 1 + 1/3 + 1/9 + 1/27 + ... ?', options: [{ id: 'A', text: '3/2' }, { id: 'B', text: '2/3' }, { id: 'C', text: '3' }, { id: 'D', text: '4/3' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'Sum = a / (1 - r) = 1 / (1 - 1/3) = 1 / (2/3) = 3/2.' },
  { id: 16, questionNumber: 16, type: 'mcq_single', statement: 'If log₁₀(x) + log₁₀(x - 3) = 1, then the value of x is:', options: [{ id: 'A', text: '5' }, { id: 'B', text: '-2' }, { id: 'C', text: '5 or -2' }, { id: 'D', text: '10' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'log₁₀[x(x - 3)] = 1 => x² - 3x = 10 => x² - 3x - 10 = 0 => (x - 5)(x + 2) = 0. Since log requires x > 3, only x = 5 is valid.' },
  { id: 17, questionNumber: 17, type: 'mcq_single', statement: 'The area bounded by the curve y = x² and the line y = 4 is:', options: [{ id: 'A', text: '32/3 sq. units' }, { id: 'B', text: '16/3 sq. units' }, { id: 'C', text: '8 sq. units' }, { id: 'D', text: '64/3 sq. units' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'Intersections at x = -2 and x = 2. Area = ∫ from -2 to 2 of (4 - x²) dx = 2 * [4x - x³/3]₀² = 2 * (8 - 8/3) = 2 * (16/3) = 32/3 sq. units.' },
  { id: 18, questionNumber: 18, type: 'mcq_single', statement: 'If a coin is tossed 4 times, what is the probability of getting exactly 2 heads?', options: [{ id: 'A', text: '3/8' }, { id: 'B', text: '1/2' }, { id: 'C', text: '1/4' }, { id: 'D', text: '5/16' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'P(X = 2) = ⁴C₂ * (1/2)² * (1/2)² = 6 * (1/16) = 6/16 = 3/8.' },
  { id: 19, questionNumber: 19, type: 'mcq_single', statement: 'If z = 1 + i√3, then the principal argument arg(z) is:', options: [{ id: 'A', text: 'π/3' }, { id: 'B', text: 'π/6' }, { id: 'C', text: '2π/3' }, { id: 'D', text: 'π/4' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'tan θ = (√3) / 1 = √3. Since z lies in the first quadrant, θ = π/3.' },
  { id: 20, questionNumber: 20, type: 'mcq_single', statement: 'The radius of the sphere x² + y² + z² - 2x + 4y - 6z - 11 = 0 is:', options: [{ id: 'A', text: '5 units' }, { id: 'B', text: '√14 units' }, { id: 'C', text: '4 units' }, { id: 'D', text: '6 units' }], correctOption: 'A', marks: 1.0, negativeMarks: 0.0, section: 'Mathematics & Logic', explanation: 'Center = (1, -2, 3), d = -11. Radius = √(1² + (-2)² + 3² - (-11)) = √(1 + 4 + 9 + 11) = √25 = 5 units.' },
];

class StorageService {
  private removeUndefined(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => this.removeUndefined(item));
    }

    if (value && typeof value === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
        if (item !== undefined) {
          result[key] = this.removeUndefined(item);
        }
      }
      return result;
    }

    return value;
  }

  private async firebaseSave(collectionName: string, id: string, data: unknown): Promise<void> {
    const safeData = this.removeUndefined(data) as Record<string, unknown>;
    await setDoc(doc(db, collectionName, id), safeData);
  }

  private async firebaseDelete(collectionName: string, id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, collectionName, id));
    } catch (error) {
      console.error(`Firebase delete failed [${collectionName}/${id}]:`, error);
    }
  }

  /** Teacher ka test ho to us par teacher ki id/naam laga do (server bhi khud lagata hai, ye local cache ke liye hai) */
  private stampOwner(test: ExamTest): void {
    const u = auth.getUser();
    if (u?.role === 'teacher') {
      const t = test as ExamTest & TeacherOwned;
      t.teacherId = u.teacherId || undefined;
      t.teacherName = u.name;
    }
  }

  /** Logout par tests/results ka local copy hata do, taaki agla login purana data na dekhe */
  clearStaffCache(): void {
    localStorage.removeItem(STORAGE_KEYS.TESTS);
    localStorage.removeItem(STORAGE_KEYS.SUBMISSIONS);
    localStorage.removeItem(STORAGE_KEYS.ADMIN_AUTH);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_EXAM_ID);
  }

  async syncFromFirebase(): Promise<void> {
    try {
      // Admin config sirf admin padh sakta hai. Teacher ko sirf apne tests/results milte hain (server filter karta hai).
      const isAdmin = auth.isAdmin();
      const [studentsSnapshot, testsSnapshot, submissionsSnapshot, adminSnapshot] = await Promise.all([
        getDocs(collection(db, FIRESTORE_COLLECTIONS.STUDENTS)),
        getDocs(collection(db, FIRESTORE_COLLECTIONS.TESTS)),
        getDocs(collection(db, FIRESTORE_COLLECTIONS.SUBMISSIONS)),
        isAdmin ? getDoc(doc(db, FIRESTORE_COLLECTIONS.ADMIN_CONFIG, 'main')) : Promise.resolve(null),
      ]);

      const students = studentsSnapshot.docs.map((item) => item.data() as Student);
      const tests = testsSnapshot.docs.map((item) => item.data() as ExamTest);
      const submissions = submissionsSnapshot.docs.map((item) => item.data() as ExamSubmission);

      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
      localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(tests));
      localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));

      if (adminSnapshot && adminSnapshot.exists()) {
        const adminCredentials = adminSnapshot.data() as AdminCredentials;
        localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, JSON.stringify(adminCredentials));
      }

      console.log('Firebase data synced successfully.', {
        students: students.length,
        tests: tests.length,
        submissions: submissions.length,
        adminConfig: adminSnapshot && adminSnapshot.exists() ? 'loaded' : 'skipped',
      });
    } catch (error) {
      console.error('Firebase initial sync failed:', error);
    }
  }

  getStudents(): Student[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.STUDENTS);
      return data ? (JSON.parse(data) as Student[]) : [];
    } catch (error) {
      console.error('Error reading students:', error);
      return [];
    }
  }

  saveStudents(students: Student[]): void {
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    for (const student of students) {
      void this.firebaseSave(FIRESTORE_COLLECTIONS.STUDENTS, String(student.id), student);
    }
  }

  addStudent(student: Omit<Student, 'id' | 'createdAt' | 'status'>): Student {
    const newStudent: Student = {
      ...student,
      id: `stu_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: 'active',
    };

    const students = this.getStudents();
    students.push(newStudent);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    void this.firebaseSave(FIRESTORE_COLLECTIONS.STUDENTS, String(newStudent.id), newStudent);

    return newStudent;
  }

  /**
   * Bulk-add students (used by the Excel/CSV upload).
   * Writes the local cache once and waits for every Firestore write.
   */
  async addStudents(
    list: Array<Omit<Student, 'id' | 'createdAt' | 'status'>>
  ): Promise<Student[]> {
    const now = Date.now();
    const created: Student[] = list.map((student, index) => ({
      ...student,
      id: `stu_${now}_${index}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      status: 'active',
    }));

    const students = this.getStudents().concat(created);
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));

    await Promise.all(
      created.map((student) =>
        this.firebaseSave(FIRESTORE_COLLECTIONS.STUDENTS, String(student.id), student)
      )
    );

    return created;
  }

  updateStudent(id: string, updates: Partial<Student>): Student | null {
    const students = this.getStudents();
    const index = students.findIndex((s) => String(s.id) === String(id));
    if (index === -1) return null;

    students[index] = { ...students[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
    void this.firebaseSave(
      FIRESTORE_COLLECTIONS.STUDENTS,
      String(students[index].id),
      students[index]
    );

    return students[index];
  }

  deleteStudent(id: string): boolean {
    const students = this.getStudents();
    const filtered = students.filter((s) => String(s.id) !== String(id));

    if (filtered.length === students.length) return false;

    localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(filtered));
    void this.firebaseDelete(FIRESTORE_COLLECTIONS.STUDENTS, String(id));

    return true;
  }

  findStudentByRegOrRoll(regOrRoll: string): Student | undefined {
    const students = this.getStudents();
    const query = regOrRoll.trim().toLowerCase();

    return students.find(
      (s) =>
        s.regNumber.toLowerCase() === query ||
        s.rollNumber.toLowerCase() === query
    );
  }

  getTests(): ExamTest[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.TESTS);
      return data ? (JSON.parse(data) as ExamTest[]) : [];
    } catch (error) {
      console.error('Error reading tests:', error);
      return [];
    }
  }

  saveTests(tests: ExamTest[]): void {
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(tests));
    for (const test of tests) {
      void this.firebaseSave(FIRESTORE_COLLECTIONS.TESTS, String(test.id), test);
    }
  }

  addTest(test: ExamTest): ExamTest {
    if (!test.accessPin) test.accessPin = generatePin();
    this.stampOwner(test);
    const tests = this.getTests();
    const existingIndex = tests.findIndex((t) => String(t.id) === String(test.id));

    if (existingIndex >= 0) tests[existingIndex] = test;
    else tests.push(test);

    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(tests));
    void this.firebaseSave(FIRESTORE_COLLECTIONS.TESTS, String(test.id), test);

    return test;
  }

  /**
   * Same as addTest(), but waits until Firestore confirms the write.
   * Used when editing questions or publishing results so the admin knows it really saved.
   */
  async saveTest(test: ExamTest): Promise<ExamTest> {
    if (!test.accessPin) test.accessPin = generatePin();
    this.stampOwner(test);
    const tests = this.getTests();
    const existingIndex = tests.findIndex((t) => String(t.id) === String(test.id));

    if (existingIndex >= 0) tests[existingIndex] = test;
    else tests.push(test);

    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(tests));
    await this.firebaseSave(FIRESTORE_COLLECTIONS.TESTS, String(test.id), test);

    return test;
  }

  deleteTest(id: string): void {
    const tests = this.getTests().filter((t) => String(t.id) !== String(id));
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(tests));
    void this.firebaseDelete(FIRESTORE_COLLECTIONS.TESTS, String(id));
  }

  /**
   * Test ko Firestore + local cache dono se permanently delete karta hai.
   * Firestore delete ka wait karta hai, warna 5-second auto-sync test ko wapas la deta.
   * Students ke submitted responses safe rehte hain (Responses tab mein dikhte rahenge).
   */
  async removeTest(id: string): Promise<void> {
    await deleteDoc(doc(db, FIRESTORE_COLLECTIONS.TESTS, String(id)));
    const tests = this.getTests().filter((t) => String(t.id) !== String(id));
    localStorage.setItem(STORAGE_KEYS.TESTS, JSON.stringify(tests));
    if (this.getActiveExamId() === String(id)) this.setActiveExamId(null);
  }

  getActiveTest(): ExamTest | null {
    const published = this.getTests().filter((t) => t.status === 'published');
    return published.length > 0 ? published[published.length - 1] : null;
  }

  getSubmissions(): ExamSubmission[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SUBMISSIONS);
      return data ? (JSON.parse(data) as ExamSubmission[]) : [];
    } catch (error) {
      console.error('Error reading submissions:', error);
      return [];
    }
  }

  getSubmissionForStudentAndTest(studentId: string, testId: string): ExamSubmission | null {
    const studentKey = String(studentId);
    const testKey = String(testId);

    return (
      this.getSubmissions().find((submission) => {
        const submissionStudentKeys = [
          submission.studentId,
          submission.studentReg,
          submission.studentRoll,
        ]
          .filter(Boolean)
          .map(String);

        return (
          String(submission.testId) === testKey &&
          submissionStudentKeys.includes(studentKey)
        );
      }) || null
    );
  }

  saveSubmissions(submissions: ExamSubmission[]): void {
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));

    for (const [index, submission] of submissions.entries()) {
      const submissionWithId = submission as ExamSubmission & { id?: string };
      const submissionId =
        submissionWithId.id ||
        `submission_${submission.testId}_${submission.studentId}_${index}`;

      void this.firebaseSave(
        FIRESTORE_COLLECTIONS.SUBMISSIONS,
        submissionId,
        { ...submission, id: submissionId }
      );
    }
  }

  async addSubmission(submission: ExamSubmission): Promise<void> {
    // One permanent Firestore document per student + test.
    // This makes the one-attempt rule independent of browser/device.
    const submissionId = `submission_${String(submission.testId)}_${String(submission.studentId)}`;

    const existing = this.getSubmissionForStudentAndTest(
      String(submission.studentId),
      String(submission.testId)
    );

    if (existing) {
      return;
    }

    const firebaseSubmission = this.removeUndefined({
      ...submission,
      id: submissionId,
    }) as ExamSubmission & { id: string };

    // Save to Firebase FIRST. If this fails, throw the error so the UI does not
    // falsely report a successful submission.
    await setDoc(
      doc(db, FIRESTORE_COLLECTIONS.SUBMISSIONS, submissionId),
      firebaseSubmission as unknown as Record<string, unknown>
    );

    // Only after Firebase confirms the write, update local cache and student status.
    const submissions = this.getSubmissions().filter(
      (item) => !(String(item.testId) === String(submission.testId) && String(item.studentId) === String(submission.studentId))
    );
    submissions.unshift(firebaseSubmission);
    localStorage.setItem(STORAGE_KEYS.SUBMISSIONS, JSON.stringify(submissions));

    this.updateStudent(submission.studentId, { status: 'completed' });
  }

  getAdminCredentials(): AdminCredentials {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ADMIN_AUTH);

      if (!data) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_AUTH, JSON.stringify(DEFAULT_ADMIN));
        return DEFAULT_ADMIN;
      }

      const credentials = JSON.parse(data) as AdminCredentials;
      credentials.name = 'Priyam';
      return credentials;
    } catch {
      return DEFAULT_ADMIN;
    }
  }

  async saveAdminCredentials(creds: AdminCredentials): Promise<void> {
    const credentialsToSave: AdminCredentials = {
      ...creds,
      lastPasswordChanged: creds.lastPasswordChanged || new Date().toISOString(),
    };

    // Local cache for this browser.
    localStorage.setItem(
      STORAGE_KEYS.ADMIN_AUTH,
      JSON.stringify(credentialsToSave)
    );

    // Central source of truth for every browser/device.
    await setDoc(
      doc(db, FIRESTORE_COLLECTIONS.ADMIN_CONFIG, 'main'),
      credentialsToSave
    );

    console.log('Admin credentials saved centrally in Firebase.');
  }

  async syncAdminCredentialsFromFirebase(): Promise<AdminCredentials> {
    const adminRef = doc(
      db,
      FIRESTORE_COLLECTIONS.ADMIN_CONFIG,
      'main'
    );

    const snapshot = await getDoc(adminRef);

    if (snapshot.exists()) {
      const credentials = snapshot.data() as AdminCredentials;
      localStorage.setItem(
        STORAGE_KEYS.ADMIN_AUTH,
        JSON.stringify(credentials)
      );
      return credentials;
    }

    await setDoc(adminRef, DEFAULT_ADMIN);
    localStorage.setItem(
      STORAGE_KEYS.ADMIN_AUTH,
      JSON.stringify(DEFAULT_ADMIN)
    );
    return DEFAULT_ADMIN;
  }

  getAdminSessions(): AdminSession[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ADMIN_SESSIONS);

      if (!data) {
        localStorage.setItem(STORAGE_KEYS.ADMIN_SESSIONS, JSON.stringify(DEFAULT_SESSIONS));
        return DEFAULT_SESSIONS;
      }

      return JSON.parse(data) as AdminSession[];
    } catch {
      return DEFAULT_SESSIONS;
    }
  }

  revokeAdminSessions(): void {
    const current = this.getAdminSessions().filter((s) => s.isCurrent);
    localStorage.setItem(STORAGE_KEYS.ADMIN_SESSIONS, JSON.stringify(current));
  }

  getCurrentStudent(): Student | null {
    try {
      const data = sessionStorage.getItem(STORAGE_KEYS.CURRENT_STUDENT);
      return data ? (JSON.parse(data) as Student) : null;
    } catch {
      return null;
    }
  }

  setCurrentStudent(student: Student | null): void {
    if (student) {
      sessionStorage.setItem(STORAGE_KEYS.CURRENT_STUDENT, JSON.stringify(student));
    } else {
      sessionStorage.removeItem(STORAGE_KEYS.CURRENT_STUDENT);
    }
  }

  getActiveExamId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_EXAM_ID);
  }

  setActiveExamId(examId: string | null): void {
    if (examId) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_EXAM_ID, examId);
    } else {
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_EXAM_ID);
    }
  }
}

export const storage = new StorageService();
