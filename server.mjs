/**
 * MCE Exam Portal - Express server + LOCAL DATABASE
 *  - `npm run dev`   : Vite dev server + database API + email API (port 3000)
 *  - `npm run build` ke baad `npm start` : dist/ serve + database API + email API
 *
 * Database: data/db.json  (aapke laptop par). Har start par aur har 6 ghante mein data/backups/ mein backup banta hai.
 */
import 'dotenv/config';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import express from 'express';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROD = process.argv.includes('--prod');
const PORT = Number(process.env.PORT) || 3000;

// =====================================================================
// LOCAL DATABASE
// =====================================================================

const DATA_DIR = path.join(__dirname, 'data');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const COLLECTIONS = [
  'students',
  'tests',
  'submissions',
  'adminConfig',
  'teachers'
];

fs.mkdirSync(BACKUP_DIR, { recursive: true });

const stamp = () =>
  new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

const emptyStore = () =>
  Object.fromEntries(COLLECTIONS.map((c) => [c, {}]));

function parseFile(file) {
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));

  for (const c of COLLECTIONS) {
    if (!j[c] || typeof j[c] !== 'object') {
      j[c] = {};
    }
  }

  return j;
}

function loadStore() {
  if (!fs.existsSync(DB_FILE)) {
    return emptyStore();
  }

  try {
    return parseFile(DB_FILE);
  } catch (e) {
    const bad = path.join(
      DATA_DIR,
      `db.corrupt-${stamp()}.json`
    );

    fs.copyFileSync(DB_FILE, bad);

    console.error(
      `[db] db.json padhi nahi ja saki (${e.message}). Copy saved: ${bad}`
    );

    const backups = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.endsWith('.json'))
      .sort()
      .reverse();

    for (const b of backups) {
      try {
        const s = parseFile(path.join(BACKUP_DIR, b));
        console.error(`[db] Backup se restore kiya: ${b}`);
        return s;
      } catch {
        // next backup
      }
    }

    return emptyStore();
  }
}

const store = loadStore();

function saveStore() {
  const tmp = DB_FILE + '.tmp';

  fs.writeFileSync(
    tmp,
    JSON.stringify(store, null, 2)
  );

  fs.renameSync(tmp, DB_FILE);

  scheduleReadable();
}

function makeBackup() {
  if (!fs.existsSync(DB_FILE)) return;

  fs.copyFileSync(
    DB_FILE,
    path.join(BACKUP_DIR, `db-${stamp()}.json`)
  );

  const all = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.endsWith('.json'))
    .sort();

  for (
    const old of all.slice(
      0,
      Math.max(0, all.length - 30)
    )
  ) {
    fs.unlinkSync(path.join(BACKUP_DIR, old));
  }
}

// =====================================================================
// READABLE CSV FILES
// =====================================================================

const READABLE_DIR = path.join(DATA_DIR, 'readable');

fs.mkdirSync(READABLE_DIR, { recursive: true });

const csvCell = (v) => {
  if (v === undefined || v === null) return '';

  let t =
    typeof v === 'object'
      ? JSON.stringify(v)
      : String(v);

  if (t.length > 5000) {
    t = t.slice(0, 5000) + '...';
  }

  return `"${t.replace(/"/g, '""')}"`;
};

function toCsv(rows, columns) {
  const lines = [
    columns.map(csvCell).join(',')
  ];

  for (const r of rows) {
    lines.push(
      columns.map((c) => csvCell(r[c])).join(',')
    );
  }

  return '\uFEFF' + lines.join('\r\n');
}

function writeCsv(
  name,
  rows,
  preferred,
  skip = []
) {
  const keys = new Set(preferred);

  for (const r of rows) {
    for (const k of Object.keys(r)) {
      if (!skip.includes(k)) {
        keys.add(k);
      }
    }
  }

  const cols = [...keys].filter(
    (k) => !skip.includes(k)
  );

  try {
    fs.writeFileSync(
      path.join(READABLE_DIR, name),
      toCsv(rows, cols)
    );
  } catch (e) {
    if (
      e.code !== 'EBUSY' &&
      e.code !== 'EPERM'
    ) {
      console.error(
        '[readable]',
        name,
        e.message
      );
    }
  }
}

function writeReadable() {
  const students = Object.values(store.students);
  const tests = Object.values(store.tests);
  const subs = Object.values(store.submissions);

  writeCsv(
    'students.csv',
    students,
    [
      'name',
      'rollNumber',
      'regNumber',
      'department',
      'email',
      'password'
    ],
    ['id', 'capturedPhotoUrl']
  );

  writeCsv(
    'tests.csv',
    tests.map((t) => ({
      ...t,
      questionCount: Array.isArray(t.questions)
        ? t.questions.length
        : 0
    })),
    [
      'title',
      'teacherName',
      'code',
      'department',
      'accessPin',
      'status',
      'questionCount',
      'durationMinutes',
      'passingPercentage'
    ],
    [
      'questions',
      'proctorRules',
      'markingScheme'
    ]
  );

  const qrows = [];

  for (const t of tests) {
    (
      Array.isArray(t.questions)
        ? t.questions
        : []
    ).forEach((q, i) => {
      const opt = (id) =>
        (q.options || []).find(
          (o) => o.id === id
        )?.text ?? '';

      qrows.push({
        test: t.title || t.id,
        no: i + 1,
        question: q.statement,
        A: opt('A'),
        B: opt('B'),
        C: opt('C'),
        D: opt('D'),
        correct: q.correctOption,
        marks: q.marks,
        section: q.section
      });
    });
  }

  writeCsv(
    'questions.csv',
    qrows,
    [
      'test',
      'no',
      'question',
      'A',
      'B',
      'C',
      'D',
      'correct',
      'marks',
      'section'
    ]
  );

  writeCsv(
    'submissions.csv',
    subs,
    [
      'studentName',
      'studentReg',
      'studentRoll',
      'studentDepartment',
      'testTitle',
      'totalMarks',
      'maxMarks',
      'percentageScore',
      'passed',
      'correctAnswersCount',
      'incorrectAnswersCount',
      'unattemptedCount',
      'submittedAt'
    ],
    [
      'answers',
      'capturedPhotoUrl',
      'id',
      'studentId',
      'testId'
    ]
  );
}

let readableTimer = null;

function scheduleReadable() {
  clearTimeout(readableTimer);

  readableTimer = setTimeout(() => {
    try {
      writeReadable();
    } catch (e) {
      console.error(
        '[readable]',
        e.message
      );
    }
  }, 1500);
}

if (!fs.existsSync(DB_FILE)) {
  saveStore();
}

makeBackup();
scheduleReadable();

setInterval(
  makeBackup,
  6 * 60 * 60 * 1000
).unref();

// =====================================================================
// GMAIL
// =====================================================================

const GMAIL_USER =
  (process.env.GMAIL_USER || '').trim();

const GMAIL_APP_PASSWORD =
  (process.env.GMAIL_APP_PASSWORD || '')
    .replace(/\s+/g, '');

const FROM_NAME =
  process.env.MAIL_FROM_NAME ||
  'MCE Examination Portal';

const mailConfigured = () =>
  !!(GMAIL_USER && GMAIL_APP_PASSWORD);

const transporter = mailConfigured()
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_APP_PASSWORD
      },
      pool: true,
      maxConnections: 2
    })
  : null;

const esc = (v) =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const EMAIL_RE =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const sleep = (ms) =>
  new Promise((r) => setTimeout(r, ms));

const row = (label, value) =>
  `<tr><td style="padding:8px 10px;border:1px solid #e2e8f0;background:#f8fafc;width:40%">${label}</td>` +
  `<td style="padding:8px 10px;border:1px solid #e2e8f0">${value}</td></tr>`;

function buildEmail(
  s,
  testTitle,
  testCode
) {
  const status = s.passed ? 'PASS' : 'FAIL';
  const color = s.passed
    ? '#16a34a'
    : '#dc2626';

  const subject = `Result: ${testTitle}`;

  const text =
    `Dear ${s.studentName},\n\n` +
    `Your result for ${testTitle} has been published.\n\n` +
    `Name: ${s.studentName}\n` +
    `Registration No: ${s.studentReg}\n` +
    `Roll No: ${s.studentRoll}\n` +
    `Marks: ${s.totalMarks} / ${s.maxMarks} (${s.percentageScore}%)\n` +
    `Result: ${status}\n` +
    `Correct / Wrong / Skipped: ${s.correctAnswersCount} / ${s.incorrectAnswersCount} / ${s.unattemptedCount}\n`;

  const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;color:#0f172a">
  <div style="background:#0f172a;color:#ffffff;padding:18px 24px">
    <div style="font-size:18px;font-weight:bold">${esc(FROM_NAME)}</div>
    <div style="font-size:13px;color:#cbd5e1;margin-top:4px">Result Notification</div>
  </div>

  <div style="padding:24px">
    <p style="margin:0 0 16px;font-size:15px">
      Dear <b>${esc(s.studentName)}</b>,
    </p>

    <p style="margin:0 0 16px;font-size:14px">
      Your result for <b>${esc(testTitle)}</b> has been published.
    </p>

    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${row(
        'Name',
        `<b>${esc(s.studentName)}</b>`
      )}
      ${row(
        'Registration No',
        `<b>${esc(s.studentReg)}</b>`
      )}
      ${row(
        'Roll No',
        esc(s.studentRoll)
      )}
      ${row(
        'Test',
        `${esc(testTitle)}${
          testCode
            ? ` (${esc(testCode)})`
            : ''
        }`
      )}
      ${row(
        'Marks',
        `<b>${esc(
          s.totalMarks
        )} / ${esc(
          s.maxMarks
        )}</b> (${esc(
          s.percentageScore
        )}%)`
      )}
      ${row(
        'Result',
        `<b style="color:${color}">${status}</b>`
      )}
      ${row(
        'Correct / Wrong / Skipped',
        `${esc(
          s.correctAnswersCount
        )} / ${esc(
          s.incorrectAnswersCount
        )} / ${esc(
          s.unattemptedCount
        )}`
      )}
    </table>

    <p style="margin:20px 0 0;font-size:12px;color:#64748b">
      This is an automatically generated email. Please do not reply.
    </p>
  </div>
</div>`;

  return {
    subject,
    text,
    html
  };
}

// =====================================================================
// API
// =====================================================================

const app = express();

const bigJson = express.json({
  limit: '25mb'
});

const smallJson = express.json({
  limit: '100kb'
});

app.get(
  '/api/health',
  (_req, res) =>
    res.json({
      ok: true,
      mailConfigured:
        mailConfigured(),
      dbFile: DB_FILE,
      counts: Object.fromEntries(
        COLLECTIONS.map((c) => [
          c,
          Object.keys(store[c]).length
        ])
      )
    })
);

// =====================================================================
// LOGIN / SESSIONS
// =====================================================================

const sessions = new Map();

const SESSION_MS =
  12 * 60 * 60 * 1000;

const fails = new Map();

const hashPw = (
  pw,
  salt = crypto
    .randomBytes(16)
    .toString('hex')
) => ({
  salt,
  hash: crypto
    .scryptSync(
      String(pw),
      salt,
      32
    )
    .toString('hex')
});

const checkPw = (pw, rec) => {
  if (!rec?.salt || !rec?.hash) {
    return false;
  }

  const h = crypto.scryptSync(
    String(pw),
    rec.salt,
    32
  );

  const b = Buffer.from(
    rec.hash,
    'hex'
  );

  return (
    b.length === h.length &&
    crypto.timingSafeEqual(h, b)
  );
};

const sameText = (a, b) => {
  const x = crypto
    .createHash('sha256')
    .update(String(a))
    .digest();

  const y = crypto
    .createHash('sha256')
    .update(String(b))
    .digest();

  return crypto.timingSafeEqual(
    x,
    y
  );
};

// =====================================================================
// ADMIN AUTH
// =====================================================================
//
// IMPORTANT FIX:
// Purane db.json mein credentials:
// store.adminSection.main
//
// Naye format mein:
// store.adminConfig.credentials
//
// Dono formats support kiye gaye hain.
// =====================================================================

const ENV_ADMIN_USER =
  process.env.ADMIN_USERNAME ||
  'admin';

const ENV_ADMIN_PASS =
  process.env.ADMIN_PASSWORD ||
  'admin123';

if (!process.env.ADMIN_PASSWORD) {
  console.warn(
    '[auth] ADMIN_PASSWORD .env mein set nahi hai - default "admin123" chal raha hai. Jaldi badlo!'
  );
}

const adminOk = (
  username,
  password
) => {
  // ---------------------------------------------------------------
  // 1. New secure format
  // ---------------------------------------------------------------
  const rec =
    store.adminConfig?.credentials;

  if (
    rec?.hash &&
    rec?.username
  ) {
    return (
      sameText(
        username,
        rec.username
      ) &&
      checkPw(
        password,
        rec
      )
    );
  }

  // ---------------------------------------------------------------
  // 2. Legacy format
  //    Existing db.json ke liye
  // ---------------------------------------------------------------
  const legacy =
    store.adminSection?.main;

  if (
    legacy?.username &&
    legacy?.password
  ) {
    return (
      sameText(
        username,
        legacy.username
      ) &&
      sameText(
        password,
        legacy.password
      )
    );
  }

  // ---------------------------------------------------------------
  // 3. .env / default fallback
  // ---------------------------------------------------------------
  return (
    sameText(
      username,
      ENV_ADMIN_USER
    ) &&
    sameText(
      password,
      ENV_ADMIN_PASS
    )
  );
};

// =====================================================================
// AUTH MIDDLEWARE
// =====================================================================

app.use(
  (req, _res, next) => {
    const token = (
      req.headers.authorization || ''
    ).replace(
      /^Bearer\s+/i,
      ''
    );

    const s =
      token &&
      sessions.get(token);

    if (
      s &&
      s.exp > Date.now()
    ) {
      req.user = {
        ...s,
        token
      };
    } else if (s) {
      sessions.delete(token);
    }

    next();
  }
);

const need =
  (...roles) =>
  (req, res, next) =>
    req.user &&
    roles.includes(
      req.user.role
    )
      ? next()
      : res
          .status(401)
          .json({
            error:
              'Pehle login karo.'
          });

const newSession = (data) => {
  const token =
    crypto
      .randomBytes(32)
      .toString('hex');

  sessions.set(
    token,
    {
      ...data,
      exp:
        Date.now() +
        SESSION_MS
    }
  );

  return token;
};

// =====================================================================
// PUBLIC TEACHERS
// =====================================================================

app.get(
  '/api/teachers/public',
  (_req, res) => {
    res.json(
      Object.entries(
        store.teachers
      )
        .map(([id, t]) => ({
          id,
          name: t.name
        }))
        .sort((a, b) =>
          a.name.localeCompare(
            b.name
          )
        )
    );
  }
);

// =====================================================================
// LOGIN
// =====================================================================

app.post(
  '/api/auth/login',
  smallJson,
  (req, res) => {
    const ip = req.ip;

    const f = fails.get(ip);

    if (
      f &&
      f.until > Date.now()
    ) {
      return res
        .status(429)
        .json({
          error:
            'Bahut galat koshish. 15 minute baad try karo.'
        });
    }

    const {
      role,
      teacherId
    } = req.body || {};

    const username =
      String(
        req.body?.username || ''
      ).trim();

    const password =
      String(
        req.body?.password || ''
      );

    let user = null;

    // ---------------------------------------------------------------
    // ADMIN LOGIN
    // ---------------------------------------------------------------

    if (role === 'admin') {
      if (
        adminOk(
          username,
          password
        )
      ) {
        user = {
          role: 'admin',
          name: 'Admin'
        };
      }
    }

    // ---------------------------------------------------------------
    // TEACHER LOGIN
    // ---------------------------------------------------------------

    else if (
      role === 'teacher'
    ) {
      const t =
        store.teachers[
          String(
            teacherId || ''
          )
        ];

      if (
        t &&
        t.username.toLowerCase() ===
          username.toLowerCase() &&
        checkPw(password, t)
      ) {
        user = {
          role: 'teacher',
          teacherId:
            String(
              teacherId
            ),
          name: t.name
        };
      }
    }

    // ---------------------------------------------------------------
    // INVALID LOGIN
    // ---------------------------------------------------------------

    if (!user) {
      const n =
        (f?.n || 0) + 1;

      fails.set(
        ip,
        {
          n,
          until:
            n >= 10
              ? Date.now() +
                15 *
                  60 *
                  1000
              : 0
        }
      );

      return res
        .status(401)
        .json({
          error:
            'Username ya password galat hai.'
        });
    }

    fails.delete(ip);

    res.json({
      token:
        newSession(user),
      role: user.role,
      teacherId:
        user.teacherId ||
        null,
      name: user.name
    });
  }
);

// =====================================================================
// LOGOUT
// =====================================================================

app.post(
  '/api/auth/logout',
  (req, res) => {
    if (req.user) {
      sessions.delete(
        req.user.token
      );
    }

    res.json({
      ok: true
    });
  }
);

// =====================================================================
// CURRENT USER
// =====================================================================

app.get(
  '/api/auth/me',
  need(
    'admin',
    'teacher'
  ),
  (req, res) =>
    res.json({
      role:
        req.user.role,
      teacherId:
        req.user
          .teacherId ||
        null,
      name:
        req.user.name
    })
);

// =====================================================================
// CHANGE PASSWORD
// =====================================================================

app.post(
  '/api/auth/password',
  smallJson,
  need(
    'admin',
    'teacher'
  ),
  (req, res) => {
    const oldPassword =
      String(
        req.body?.oldPassword ||
          ''
      );

    const newPassword =
      String(
        req.body?.newPassword ||
          ''
      );

    if (
      newPassword.length < 6
    ) {
      return res
        .status(400)
        .json({
          error:
            'Naya password kam se kam 6 akshar ka rakho.'
        });
    }

    try {
      // -------------------------------------------------------------
      // TEACHER PASSWORD
      // -------------------------------------------------------------

      if (
        req.user.role ===
        'teacher'
      ) {
        const t =
          store.teachers[
            req.user.teacherId
          ];

        if (
          !t ||
          !checkPw(
            oldPassword,
            t
          )
        ) {
          return res
            .status(401)
            .json({
              error:
                'Purana password galat hai.'
            });
        }

        Object.assign(
          t,
          hashPw(
            newPassword
          )
        );
      }

      // -------------------------------------------------------------
      // ADMIN PASSWORD
      // -------------------------------------------------------------

      else {
        const rec =
          store.adminConfig
            ?.credentials;

        const legacy =
          store.adminSection
            ?.main;

        // New DB credentials -> legacy -> .env
        const username =
          rec?.username ||
          legacy?.username ||
          ENV_ADMIN_USER;

        // IMPORTANT:
        // adminOk() legacy + new + env teeno support karta hai.
        if (
          !adminOk(
            username,
            oldPassword
          )
        ) {
          return res
            .status(401)
            .json({
              error:
                'Purana password galat hai.'
            });
        }

        // Password successfully changed.
        // Ab secure hashed format mein save hoga.
        if (
          !store.adminConfig ||
          typeof store.adminConfig !==
            'object'
        ) {
          store.adminConfig =
            {};
        }

        store.adminConfig.credentials =
          {
            username,
            ...hashPw(
              newPassword
            )
          };
      }

      saveStore();

      res.json({
        ok: true
      });
    } catch (e) {
      console.error(
        '[auth] password save failed:',
        e
      );

      res
        .status(500)
        .json({
          error:
            'Save nahi ho paya'
        });
    }
  }
);

// =====================================================================
// ADMIN: TEACHERS
// =====================================================================

const cleanTeacher = (
  id,
  t
) => ({
  id,
  name: t.name,
  username: t.username,
  createdAt:
    t.createdAt,
  testCount:
    Object.values(
      store.tests
    ).filter(
      (x) =>
        x.teacherId === id
    ).length
});

const usernameTaken = (
  username,
  exceptId
) =>
  Object.entries(
    store.teachers
  ).some(
    ([id, t]) =>
      id !== exceptId &&
      t.username.toLowerCase() ===
        username.toLowerCase()
  );

app.get(
  '/api/admin/teachers',
  need('admin'),
  (_req, res) =>
    res.json(
      Object.entries(
        store.teachers
      ).map(
        ([id, t]) =>
          cleanTeacher(
            id,
            t
          )
      )
    )
);

app.post(
  '/api/admin/teachers',
  smallJson,
  need('admin'),
  (req, res) => {
    const name =
      String(
        req.body?.name || ''
      ).trim();

    const username =
      String(
        req.body?.username ||
          ''
      ).trim();

    const password =
      String(
        req.body?.password ||
          ''
      );

    if (
      !name ||
      !username
    ) {
      return res
        .status(400)
        .json({
          error:
            'Teacher ka naam aur username bharo.'
        });
    }

    if (
      password.length < 6
    ) {
      return res
        .status(400)
        .json({
          error:
            'Password kam se kam 6 akshar ka rakho.'
        });
    }

    if (
      usernameTaken(
        username
      )
    ) {
      return res
        .status(409)
        .json({
          error:
            'Ye username pehle se kisi aur teacher ka hai.'
        });
    }

    const id =
      't_' +
      crypto
        .randomBytes(6)
        .toString('hex');

    store.teachers[id] = {
      name,
      username,
      ...hashPw(password),
      createdAt:
        new Date().toISOString()
    };

    try {
      saveStore();

      res.json(
        cleanTeacher(
          id,
          store.teachers[id]
        )
      );
    } catch (e) {
      delete store.teachers[id];

      console.error(
        '[db] save failed:',
        e
      );

      res
        .status(500)
        .json({
          error:
            'Disk par save nahi ho paya'
        });
    }
  }
);

app.put(
  '/api/admin/teachers/:id',
  smallJson,
  need('admin'),
  (req, res) => {
    const t =
      store.teachers[
        req.params.id
      ];

    if (!t) {
      return res
        .status(404)
        .json({
          error:
            'Teacher nahi mila.'
        });
    }

    const name =
      req.body?.name !==
      undefined
        ? String(
            req.body.name
          ).trim()
        : t.name;

    const username =
      req.body?.username !==
      undefined
        ? String(
            req.body.username
          ).trim()
        : t.username;

    if (
      !name ||
      !username
    ) {
      return res
        .status(400)
        .json({
          error:
            'Naam aur username khali nahi ho sakte.'
        });
    }

    if (
      usernameTaken(
        username,
        req.params.id
      )
    ) {
      return res
        .status(409)
        .json({
          error:
            'Ye username pehle se kisi aur teacher ka hai.'
        });
    }

    t.name = name;
    t.username =
      username;

    if (
      req.body?.password
    ) {
      if (
        String(
          req.body.password
        ).length < 6
      ) {
        return res
          .status(400)
          .json({
            error:
              'Password kam se kam 6 akshar ka rakho.'
          });
      }

      Object.assign(
        t,
        hashPw(
          req.body.password
        )
      );
    }

    // Existing tests mein teacher name update
    for (
      const test of Object.values(
        store.tests
      )
    ) {
      if (
        test.teacherId ===
        req.params.id
      ) {
        test.teacherName =
          name;
      }
    }

    // Password change ke baad purane sessions logout
    for (
      const [tok, s] of sessions
    ) {
      if (
        s.teacherId ===
          req.params.id &&
        req.body?.password
      ) {
        sessions.delete(tok);
      }
    }

    saveStore();

    res.json(
      cleanTeacher(
        req.params.id,
        t
      )
    );
  }
);

app.delete(
  '/api/admin/teachers/:id',
  need('admin'),
  (req, res) => {
    if (
      !store.teachers[
        req.params.id
      ]
    ) {
      return res
        .status(404)
        .json({
          error:
            'Teacher nahi mila.'
        });
    }

    // Tests/results delete NAHI hote.
    delete store.teachers[
      req.params.id
    ];

    for (
      const [tok, s] of sessions
    ) {
      if (
        s.teacherId ===
        req.params.id
      ) {
        sessions.delete(tok);
      }
    }

    saveStore();

    res.json({
      ok: true
    });
  }
);

// =====================================================================
// DATABASE
// =====================================================================

const validCol = (
  req,
  res,
  next
) =>
  COLLECTIONS.includes(
    req.params.col
  ) &&
  req.params.col !==
    'teachers'
    ? next()
    : res
        .status(404)
        .json({
          error:
            'Unknown collection'
        });

const isTeacher = (
  req
) =>
  req.user?.role ===
  'teacher';

const canTouch = (
  req,
  col,
  id,
  data
) => {
  if (!isTeacher(req)) {
    return true;
  }

  const me =
    req.user.teacherId;

  if (col === 'tests') {
    return (
      data?.teacherId ===
      me
    );
  }

  if (
    col ===
    'submissions'
  ) {
    return (
      store.tests[
        data?.testId
      ]?.teacherId === me
    );
  }

  if (
    col ===
    'adminConfig'
  ) {
    return false;
  }

  // students shared hain
  return true;
};

app.get(
  '/api/db/:col',
  validCol,
  (req, res) => {
    const { col } =
      req.params;

    res.json(
      Object.entries(
        store[col]
      )
        .filter(
          ([id, data]) =>
            canTouch(
              req,
              col,
              id,
              data
            )
        )
        .map(
          ([id, data]) => ({
            id,
            data
          })
        )
    );
  }
);

app.get(
  '/api/db/:col/:id',
  validCol,
  (req, res) => {
    const {
      col,
      id
    } = req.params;

    const data =
      store[col][id];

    if (
      data ===
        undefined ||
      !canTouch(
        req,
        col,
        id,
        data
      )
    ) {
      return res
        .status(404)
        .json({
          exists: false
        });
    }

    res.json({
      id,
      data
    });
  }
);

app.put(
  '/api/db/:col/:id',
  validCol,
  bigJson,
  (req, res) => {
    const {
      col,
      id
    } = req.params;

    if (
      !req.body ||
      typeof req.body !==
        'object' ||
      Array.isArray(
        req.body
      )
    ) {
      return res
        .status(400)
        .json({
          error:
            'JSON object chahiye'
        });
    }

    const role =
      req.user?.role;

    if (
      (col === 'tests' ||
        col ===
          'adminConfig') &&
      !role
    ) {
      return res
        .status(401)
        .json({
          error:
            'Pehle login karo.'
        });
    }

    if (
      col ===
        'adminConfig' &&
      role !==
        'admin'
    ) {
      return res
        .status(403)
        .json({
          error:
            'Sirf admin.'
        });
    }

    let body =
      req.body;

    // Teacher apne tests ka owner khud nahi badal sakta
    if (
      col === 'tests' &&
      role === 'teacher'
    ) {
      const old =
        store.tests[id];

      if (
        old &&
        old.teacherId !==
          req.user
            .teacherId
      ) {
        return res
          .status(403)
          .json({
            error:
              'Ye test kisi aur teacher ka hai.'
          });
      }

      body = {
        ...body,
        teacherId:
          req.user
            .teacherId,
        teacherName:
          req.user.name
      };
    }

    if (
      col === 'tests' &&
      role === 'admin'
    ) {
      const old =
        store.tests[id];

      if (
        body.teacherId ===
          undefined &&
        old?.teacherId
      ) {
        body = {
          ...body,
          teacherId:
            old.teacherId,
          teacherName:
            old.teacherName
        };
      }
    }

    if (
      col ===
        'submissions' &&
      role === 'teacher' &&
      !canTouch(
        req,
        col,
        id,
        body
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            'Ye result aapke test ka nahi hai.'
        });
    }

    try {
      store[col][id] =
        body;

      saveStore();

      res.json({
        ok: true
      });
    } catch (e) {
      console.error(
        '[db] save failed:',
        e
      );

      res
        .status(500)
        .json({
          error:
            'Disk par save nahi ho paya'
        });
    }
  }
);

app.delete(
  '/api/db/:col/:id',
  validCol,
  need(
    'admin',
    'teacher'
  ),
  (req, res) => {
    const {
      col,
      id
    } = req.params;

    const data =
      store[col][id];

    if (
      data !==
        undefined &&
      !canTouch(
        req,
        col,
        id,
        data
      )
    ) {
      return res
        .status(403)
        .json({
          error:
            'Ye aapka nahi hai.'
        });
    }

    if (
      col ===
        'adminConfig' &&
      req.user.role !==
        'admin'
    ) {
      return res
        .status(403)
        .json({
          error:
            'Sirf admin.'
        });
    }

    try {
      delete store[col][id];

      saveStore();

      res.json({
        ok: true
      });
    } catch (e) {
      console.error(
        '[db] delete failed:',
        e
      );

      res
        .status(500)
        .json({
          error:
            'Disk par delete nahi ho paya'
        });
    }
  }
);

// =====================================================================
// RESULT EMAILS
// =====================================================================

const sendingNow =
  new Set();

app.post(
  '/api/send-results',
  smallJson,
  need(
    'admin',
    'teacher'
  ),
  async (req, res) => {
    const testId =
      String(
        req.body?.testId ||
          ''
      ).trim();

    if (!testId) {
      return res
        .status(400)
        .json({
          error:
            'testId missing'
        });
    }

    if (!transporter) {
      return res
        .status(500)
        .json({
          error:
            'Gmail set nahi hai. .env mein GMAIL_USER aur GMAIL_APP_PASSWORD daalo aur server restart karo.'
        });
    }

    if (
      sendingNow.has(
        testId
      )
    ) {
      return res
        .status(429)
        .json({
          error:
            'Is test ke emails abhi bheje ja rahe hain. Thoda ruko.'
        });
    }

    sendingNow.add(
      testId
    );

    try {
      const test =
        store.tests[
          testId
        ];

      if (!test) {
        return res
          .status(404)
          .json({
            error:
              'Test database mein nahi mila.'
          });
      }

      if (
        req.user.role ===
          'teacher' &&
        test.teacherId !==
          req.user.teacherId
      ) {
        return res
          .status(403)
          .json({
            error:
              'Ye test aapka nahi hai.'
          });
      }

      const testTitle =
        test.title ||
        test.name ||
        test.subject ||
        `Test ${testId}`;

      const testCode =
        test.code || '';

      const emailById =
        new Map(
          Object.entries(
            store.students
          ).map(
            ([id, st]) => [
              String(
                st.id ?? id
              ),
              String(
                st.email || ''
              ).trim()
            ]
          )
        );

      const subs =
        Object.values(
          store.submissions
        ).filter(
          (s) =>
            String(
              s.testId
            ) === testId
        );

      const report = {
        total:
          subs.length,
        sent: 0,
        failed: [],
        noEmail: []
      };

      const jobs = [];

      for (
        const s of subs
      ) {
        const email =
          String(
            s.studentEmail ||
              emailById.get(
                String(
                  s.studentId
                )
              ) ||
              ''
          ).trim();

        if (
          !EMAIL_RE.test(
            email
          )
        ) {
          report.noEmail.push(
            s.studentName ||
              s.studentReg ||
              'Unknown'
          );
        } else {
          jobs.push({
            s,
            email
          });
        }
      }

      for (
        let i = 0;
        i < jobs.length;
        i++
      ) {
        const {
          s,
          email
        } = jobs[i];

        try {
          const mail =
            buildEmail(
              s,
              testTitle,
              testCode
            );

          await transporter.sendMail(
            {
              from: `"${FROM_NAME}" <${GMAIL_USER}>`,
              to: email,
              subject:
                mail.subject,
              text:
                mail.text,
              html:
                mail.html
            }
          );

          report.sent++;
        } catch (e) {
          report.failed.push({
            name:
              s.studentName,
            email,
            reason:
              String(
                e?.message ||
                  e
              ).slice(
                0,
                140
              )
          });
        }

        if (
          i <
          jobs.length - 1
        ) {
          await sleep(
            300
          );
        }
      }

      console.log(
        `[mail] ${testTitle}: sent ${report.sent}, failed ${report.failed.length}, no-email ${report.noEmail.length}`
      );

      res.json(
        report
      );
    } catch (e) {
      console.error(
        '[mail] error:',
        e
      );

      res
        .status(500)
        .json({
          error:
            String(
              e?.message || e
            ).slice(
              0,
              200
            )
        });
    } finally {
      sendingNow.delete(
        testId
      );
    }
  }
);

// =====================================================================
// FRONTEND
// =====================================================================

const server =
  http.createServer(
    app
  );

server.requestTimeout =
  0;

if (PROD) {
  const dist =
    path.join(
      __dirname,
      'dist'
    );

  app.use(
    express.static(
      dist
    )
  );

  app.get(
    '*',
    (_req, res) =>
      res.sendFile(
        path.join(
          dist,
          'index.html'
        )
      )
  );
} else {
  const {
    createServer:
      createVite
  } = await import(
    'vite'
  );

  const vite =
    await createVite({
      server: {
        middlewareMode:
          true,
        hmr:
          process.env
            .DISABLE_HMR ===
          'true'
            ? false
            : {
                server
              },
        watch: {
          ignored: [
            '**/data/**'
          ]
        }
      },
      appType: 'spa'
    });

  app.use(
    vite.middlewares
  );
}

// =====================================================================
// START SERVER
// =====================================================================

server.listen(
  PORT,
  '0.0.0.0',
  () => {
    console.log(
      `\n  Portal running on http://localhost:${PORT}  (${PROD ? 'production' : 'development'})`
    );

    const lan =
      Object.values(
        os.networkInterfaces()
      )
        .flat()
        .filter(
          (n) =>
            n &&
            n.family ===
              'IPv4' &&
            !n.internal
        );

    for (
      const n of lan
    ) {
      console.log(
        `  Other laptops (same Wi-Fi) open:  http://${n.address}:${PORT}`
      );
    }

    console.log(
      `  Database: ${DB_FILE}`
    );

    console.log(
      `  Excel-readable copies: ${READABLE_DIR}`
    );

    console.log(
      `  Email: ${
        mailConfigured()
          ? 'Gmail ready (' +
            GMAIL_USER +
            ')'
          : 'NOT configured (.env mein GMAIL_USER / GMAIL_APP_PASSWORD)'
      }\n`
    );
  }
);