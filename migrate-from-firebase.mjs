/**
 * Ek baar chalao:  npm run migrate
 * Firebase (Firestore) ka saara data (students, tests, submissions, admin) laptop ki data/db.json mein utaar deta hai.
 * Internet chahiye. Server band hona chahiye (ya migrate ke baad restart karo).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const app = initializeApp({
  apiKey: 'AIzaSyDDyWDDgLmgL_zXq1I_p7i9ca7l2nFt4J8',
  authDomain: 'exam-portal-18495.firebaseapp.com',
  projectId: 'exam-portal-18495',
  storageBucket: 'exam-portal-18495.firebasestorage.app',
  messagingSenderId: '785313781415',
  appId: '1:785313781415:web:323746970a2d0d309a6d82',
});
const db = getFirestore(app);

fs.mkdirSync(DATA_DIR, { recursive: true });
if (fs.existsSync(DB_FILE)) {
  const keep = path.join(DATA_DIR, `db.before-migrate-${Date.now()}.json`);
  fs.copyFileSync(DB_FILE, keep);
  console.log(`Purani db.json ka backup: ${keep}`);
}

const out = {};
for (const name of ['students', 'tests', 'submissions', 'adminConfig']) {
  const snap = await getDocs(collection(db, name));
  out[name] = {};
  snap.forEach((d) => { out[name][d.id] = d.data(); });
  console.log(`${name}: ${snap.size} documents`);
}
fs.writeFileSync(DB_FILE, JSON.stringify(out));
console.log(`\nDone. Data saved in ${DB_FILE}`);
process.exit(0);
