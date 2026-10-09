/**
 * Reads student lists from .xlsx / .csv files in the browser.
 * No extra npm package is needed (uses the browser's built-in DecompressionStream).
 *
 * Expected header row: Name, Roll Number, Registration Number, Department, Email, Password
 * (Department, Email and Password are optional. Password defaults to the Roll Number.)
 */
import { Student } from '../types';

export type NewStudent = Omit<Student, 'id' | 'createdAt' | 'status'>;

export interface ParsedStudents {
  list: NewStudent[];
  errors: string[];
  duplicates: number;
}

export const DEFAULT_BRANCH = 'CSE (AI)';

/* ------------------------------ XLSX (zip + xml) ------------------------------ */

interface ZipEntry {
  method: number;
  compressedSize: number;
  localOffset: number;
}

interface ZipArchive {
  entries: Record<string, ZipEntry>;
  bytes: Uint8Array;
  view: DataView;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new DecompressionStream('deflate-raw');
  const writer = stream.writable.getWriter();
  void writer.write(data as unknown as BufferSource);
  void writer.close();
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

function openZip(buffer: ArrayBuffer): ZipArchive {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('This is not a valid .xlsx file.');

  const count = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  const entries: Record<string, ZipEntry> = {};

  for (let k = 0; k < count; k++) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    entries[name] = { method, compressedSize, localOffset };
    pos += 46 + nameLen + extraLen + commentLen;
  }

  return { entries, bytes, view };
}

async function readEntry(zip: ZipArchive, name: string): Promise<string | null> {
  const entry = zip.entries[name];
  if (!entry) return null;

  const nameLen = zip.view.getUint16(entry.localOffset + 26, true);
  const extraLen = zip.view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLen + extraLen;
  const data = zip.bytes.subarray(start, start + entry.compressedSize);

  const raw = entry.method === 0 ? data : await inflateRaw(data);
  return new TextDecoder().decode(raw);
}

function unescapeXml(value: string): string {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, d: string) => String.fromCharCode(parseInt(d, 16)))
    .replace(/&amp;/g, '&');
}

function columnIndex(ref: string): number {
  const match = /^([A-Z]+)/.exec(ref);
  let n = 0;
  for (const ch of match ? match[1] : '') n = n * 26 + ch.charCodeAt(0) - 64;
  return n - 1;
}

function textOf(xml: string): string {
  let out = '';
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out += m[1];
  return unescapeXml(out);
}

export async function readXlsxRows(file: File): Promise<string[][]> {
  const zip = openZip(await file.arrayBuffer());

  const shared: string[] = [];
  const sharedXml = await readEntry(zip, 'xl/sharedStrings.xml');
  if (sharedXml) {
    const re = /<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(sharedXml))) shared.push(textOf(m[1]));
  }

  const sheetNames = Object.keys(zip.entries)
    .filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort(
      (a, b) =>
        Number(a.match(/(\d+)\.xml/)![1]) - Number(b.match(/(\d+)\.xml/)![1])
    );
  if (sheetNames.length === 0) throw new Error('No worksheet found in this file.');

  const sheetXml = (await readEntry(zip, sheetNames[0])) || '';
  const rows: string[][] = [];

  const rowRe = /<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g;
  let rm: RegExpExecArray | null;
  while ((rm = rowRe.exec(sheetXml))) {
    const cells: string[] = [];
    const cellRe = /<c\s([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    const rowBody = rm[1] || '';
    let cm: RegExpExecArray | null;

    while ((cm = cellRe.exec(rowBody))) {
      const attrs = cm[1];
      const body = cm[2] || '';
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs);
      const type = /\bt="(\w+)"/.exec(attrs);
      const index = ref ? columnIndex(ref[1]) : cells.length;

      let value = '';
      if (type && type[1] === 's') {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body);
        value = v ? shared[Number(v[1])] || '' : '';
      } else if (type && type[1] === 'inlineStr') {
        value = textOf(body);
      } else {
        const v = /<v>([\s\S]*?)<\/v>/.exec(body);
        value = v ? unescapeXml(v[1]) : '';
      }
      cells[index] = String(value).trim();
    }

    rows.push(Array.from(cells, (c) => (c == null ? '' : c)));
  }

  return rows;
}

/** .docx (Word) se plain text nikalta hai - har paragraph ek line. */
export async function readDocxText(file: File): Promise<string> {
  const zip = openZip(await file.arrayBuffer());
  const xml = await readEntry(zip, 'word/document.xml');
  if (!xml) throw new Error('This is not a valid .docx file.');
  const paragraphs = xml.match(/<w:p[ >][\s\S]*?<\/w:p>/g) || [];
  return paragraphs
    .map((p) => {
      let out = '';
      const re = /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>|<w:tab\/>|<w:br\/>/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(p))) out += m[1] !== undefined ? m[1] : ' ';
      return unescapeXml(out);
    })
    .join('\n');
}

/* ---------------------------------- CSV ---------------------------------- */

export function parseCsv(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let quoted = false;

  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (quoted) {
      if (ch === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i++;
        } else quoted = false;
      } else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      row.push(cur);
      cur = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else cur += ch;
  }
  if (cur !== '' || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows.map((r) => r.map((x) => String(x).trim()));
}

/* ------------------------- rows -> student objects ------------------------- */

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'studentname', 'candidatename', 'fullname'],
  roll: ['roll', 'rollno', 'rollnumber', 'rollnum'],
  reg: ['reg', 'regno', 'regnumber', 'registration', 'registrationno', 'registrationnumber', 'username'],
  dept: ['department', 'dept', 'branch', 'course'],
  email: ['email', 'emailid', 'mail'],
  pass: ['password', 'pass'],
};

const normalise = (value: unknown) =>
  String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function rowsToStudents(rows: string[][], existing: Student[]): ParsedStudents {
  const result: ParsedStudents = { list: [], errors: [], duplicates: 0 };
  const data = rows.filter((r) => r && r.some((c) => c && String(c).trim()));

  if (data.length === 0) {
    result.errors.push('The file is empty.');
    return result;
  }

  const header = data[0].map(normalise);
  const col: Record<string, number> = {};
  for (const key of Object.keys(HEADER_ALIASES)) {
    const idx = header.findIndex((h) => HEADER_ALIASES[key].includes(h));
    if (idx >= 0) col[key] = idx;
  }

  if (col.name === undefined || col.roll === undefined || col.reg === undefined) {
    result.errors.push(
      'First row must be a header row with: Name, Roll Number, Registration Number (Department, Email, Password are optional).'
    );
    return result;
  }

  const seen = new Set<string>();
  existing.forEach((s) => {
    seen.add(`r:${String(s.regNumber || '').toLowerCase()}`);
    seen.add(`o:${String(s.rollNumber || '').toLowerCase()}`);
  });

  data.slice(1).forEach((row, i) => {
    const get = (key: string) =>
      col[key] === undefined ? '' : String(row[col[key]] ?? '').trim();

    const name = get('name');
    const roll = get('roll');
    const reg = get('reg');
    const line = i + 2;

    if (!name && !roll && !reg) return;
    if (!name || !roll || !reg) {
      result.errors.push(`Row ${line}: Name, Roll Number and Registration Number are required.`);
      return;
    }

    const regKey = `r:${reg.toLowerCase()}`;
    const rollKey = `o:${roll.toLowerCase()}`;
    if (seen.has(regKey) || seen.has(rollKey)) {
      result.duplicates++;
      return;
    }
    seen.add(regKey);
    seen.add(rollKey);

    result.list.push({
      name,
      rollNumber: roll,
      regNumber: reg,
      department: get('dept') || DEFAULT_BRANCH,
      email: get('email'),
      password: get('pass') || roll,
    });
  });

  return result;
}

export async function parseStudentFile(file: File, existing: Student[]): Promise<ParsedStudents> {
  const lower = file.name.toLowerCase();
  let rows: string[][];

  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) rows = await readXlsxRows(file);
  else if (lower.endsWith('.csv') || lower.endsWith('.txt')) rows = parseCsv(await file.text());
  else
    throw new Error(
      'Please upload an .xlsx or .csv file. (For old .xls files: open in Excel and Save As .xlsx)'
    );

  return rowsToStudents(rows, existing);
}

export const STUDENT_CSV_TEMPLATE =
  'Name,Roll Number,Registration Number,Department,Email,Password\n' +
  'Rahul Sharma,101,STU001,CSE (AI),rahul@example.com,101\n';
