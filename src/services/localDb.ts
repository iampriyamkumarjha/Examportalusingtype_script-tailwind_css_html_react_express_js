/**
 * Local database client.
 * Firestore ke jaise hi functions (collection, doc, setDoc, getDoc, getDocs, deleteDoc) deta hai,
 * lekin data aapke laptop par chal rahe server.mjs ke zariye  data/db.json  mein save hota hai.
 */
const BASE = '/api/db';
const JSON_HEADERS = { 'Content-Type': 'application/json' };
const enc = encodeURIComponent;

export const db = { type: 'local-db' } as const;

export interface ColRef { kind: 'col'; name: string }
export interface DocRef { kind: 'doc'; col: string; id: string }

export const collection = (_db: unknown, name: string): ColRef => ({ kind: 'col', name });
export const doc = (_db: unknown, col: string, id: string): DocRef => ({ kind: 'doc', col, id });

const SERVER_HINT =
  'Local database server nahi mila. Project ko "npm run dev" se start karo (ye server.mjs chalata hai).';

async function call(url: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch {
    throw new Error(SERVER_HINT);
  }
}

async function readJson(res: Response): Promise<any> {
  try {
    return await res.json();
  } catch {
    throw new Error(SERVER_HINT);
  }
}

export async function setDoc(ref: DocRef, data: unknown): Promise<void> {
  const res = await call(`${BASE}/${enc(ref.col)}/${enc(ref.id)}`, {
    method: 'PUT',
    headers: JSON_HEADERS,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error((await readJson(res))?.error || `Save failed (${res.status})`);
}

export async function deleteDoc(ref: DocRef): Promise<void> {
  const res = await call(`${BASE}/${enc(ref.col)}/${enc(ref.id)}`, { method: 'DELETE' });
  if (!res.ok) throw new Error((await readJson(res))?.error || `Delete failed (${res.status})`);
}

export async function getDocs(ref: ColRef) {
  const res = await call(`${BASE}/${enc(ref.name)}`);
  const rows: { id: string; data: unknown }[] = await readJson(res);
  if (!res.ok) throw new Error((rows as any)?.error || `Read failed (${res.status})`);
  const docs = rows.map((row) => ({ id: row.id, exists: () => true, data: () => row.data }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: (cb: (d: (typeof docs)[number]) => void) => docs.forEach(cb) };
}

export async function getDoc(ref: DocRef) {
  const res = await call(`${BASE}/${enc(ref.col)}/${enc(ref.id)}`);
  if (res.status === 404) return { id: ref.id, exists: () => false, data: () => undefined as any };
  const row = await readJson(res);
  if (!res.ok) throw new Error(row?.error || `Read failed (${res.status})`);
  return { id: ref.id, exists: () => true, data: () => row.data };
}
