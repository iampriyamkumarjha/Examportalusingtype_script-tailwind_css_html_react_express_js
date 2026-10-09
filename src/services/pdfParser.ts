import type { Question, QuestionOption } from '../types';
import * as pdfjsLib from 'pdfjs-dist';
// Bundled worker (works offline / on exam-lab LAN, always matches installed pdfjs version).
// Requires Vite (you already use it). If your pdfjs-dist is older than v4, change `.mjs` to `.js`.
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
}

export interface ParsedQuestionResult {
  questions: Question[];
  rawText: string;
  pageCount: number;
  /** Number of questions that need manual review (options/answer not detected properly) */
  unparsedCount: number;
  /** Human readable notes, e.g. "Q7: answer not found, defaulted to A" */
  warnings?: string[];
}

export interface ParseReport {
  questions: Question[];
  unparsedCount: number;
  warnings: string[];
}

type OptionId = 'A' | 'B' | 'C' | 'D';
const OPTION_IDS: OptionId[] = ['A', 'B', 'C', 'D'];

/* -------------------------------------------------------------------------- */
/*  1. PDF  ->  text                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Rebuilds real text lines from pdf.js text items using their Y position.
 * (The old code joined everything with spaces, which destroyed line structure
 * and made question/option detection unreliable.)
 */
function itemsToLines(items: any[]): string[] {
  const lines: string[] = [];
  let current = '';
  let lastY: number | null = null;
  let prevEnd: number | null = null;

  const flush = () => {
    const t = current.replace(/\s+/g, ' ').trim();
    if (t) lines.push(t);
    current = '';
    lastY = null;
    prevEnd = null;
  };

  for (const item of items) {
    if (typeof item?.str !== 'string') continue;

    const x: number = item.transform?.[4] ?? 0;
    const y: number = item.transform?.[5] ?? 0;
    const h: number = item.height || 10;

    if (lastY !== null && Math.abs(y - lastY) > Math.max(3, h * 0.6)) {
      flush();
    }

    // add a space when there is a visible horizontal gap between two items
    if (current && prevEnd !== null && x - prevEnd > h * 0.15 && !current.endsWith(' ') && !item.str.startsWith(' ')) {
      current += ' ';
    }

    current += item.str;
    lastY = y;
    prevEnd = x + (item.width || 0);

    if (item.hasEOL) flush();
  }
  flush();
  return lines;
}

/** Removes lines that repeat on most pages (running headers / footers) */
function stripRepeatedHeadersFooters(pages: string[][]): string[][] {
  if (pages.length < 3) return pages;

  const protectedLine = /^(?:Q(?:uestion)?\s*\.?\s*\d|\d{1,4}\s*[.)]\s|\(?[A-Da-d][.)]|\([A-Da-d]\)|(?:answer|ans|explanation|solution)\b)/i;
  const keyOf = (l: string) => l.replace(/\d+/g, '#').toLowerCase();

  const counts = new Map<string, number>();
  pages.forEach((lines) => {
    new Set(lines.map(keyOf)).forEach((k) => counts.set(k, (counts.get(k) || 0) + 1));
  });

  const threshold = Math.max(3, Math.ceil(pages.length * 0.6));
  return pages.map((lines) =>
    lines.filter((l) => protectedLine.test(l) || l.length > 120 || (counts.get(keyOf(l)) || 0) < threshold)
  );
}

/**
 * Extracts text from a text-based PDF (File or ArrayBuffer).
 * Throws a readable Error if the PDF cannot be opened (corrupt / password protected).
 */
export async function extractTextFromPdf(
  fileOrBuffer: File | ArrayBuffer
): Promise<{ text: string; pageCount: number }> {
  const arrayBuffer: ArrayBuffer =
    fileOrBuffer instanceof ArrayBuffer ? fileOrBuffer : await (fileOrBuffer as File).arrayBuffer();

  let pdf: pdfjsLib.PDFDocumentProxy;
  try {
    // slice(0): pdf.js transfers (detaches) the buffer to its worker, so give it a copy
    pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer.slice(0)) }).promise;
  } catch (err: any) {
    if (err?.name === 'PasswordException') {
      throw new Error('This PDF is password protected. Please remove the password and upload it again.');
    }
    throw new Error('Could not read this PDF. The file may be corrupted or is not a valid PDF.');
  }

  try {
    const pages: string[][] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      pages.push(itemsToLines(textContent.items as any[]));
      page.cleanup();
    }

    const cleaned = stripRepeatedHeadersFooters(pages);
    const text = cleaned.map((lines, i) => `\n--- Page ${i + 1} ---\n` + lines.join('\n') + '\n').join('');
    return { text, pageCount: pdf.numPages };
  } finally {
    // pdf.js versions differ; cleanup must not mask successfully parsed questions.
    try { if (typeof (pdf as any).destroy === 'function') void (pdf as any).destroy(); } catch { /* ignore cleanup errors */ }
  }
}

/**
 * One-call helper for the UI: PDF file  ->  ready-to-use questions.
 * Throws readable errors for scanned PDFs / unrecognised format.
 */
export async function parseQuestionsFromPdf(
  fileOrBuffer: File | ArrayBuffer,
  defaultSection = 'Uploaded Exam Paper'
): Promise<ParsedQuestionResult> {
  const { text, pageCount } = await extractTextFromPdf(fileOrBuffer);

  if (normalizeText(text).replace(/\s+/g, '').length < 20) {
    throw new Error(
      'No readable text found in this PDF. It looks like a scanned / image-only PDF. Please upload a text-based PDF (exported from Word, Google Docs, etc.).'
    );
  }

  const report = parseQuestionsWithReport(text, defaultSection);
  if (report.questions.length === 0) {
    throw new Error(
      'No questions could be detected. Please use this format: "Q1. Question text", options "(A) ... (B) ... (C) ... (D) ...", then "Answer: B".'
    );
  }

  return {
    questions: report.questions,
    rawText: text,
    pageCount,
    unparsedCount: report.unparsedCount,
    warnings: report.warnings,
  };
}

/* -------------------------------------------------------------------------- */
/*  2. text  ->  Questions                                                    */
/* -------------------------------------------------------------------------- */

const PAGE_MARKER = /^\s*---\s*Page\s+\d+\s*---\s*$/i;
const PAGE_FOOTER = /^\s*(?:page\s+)?\d+\s+of\s+\d+\s*$|^\s*page\s+\d+\s*$/i;

function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/[\u00a0\u2007\u202f]/g, ' ')
    .split('\n')
    .map((l) => l.replace(/[ \t]+/g, ' ').trim())
    .filter((l) => !PAGE_MARKER.test(l) && !PAGE_FOOTER.test(l))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

/** Backwards compatible: returns only the questions */
export function parseQuestionsFromText(text: string, defaultSection = 'Uploaded Exam Paper'): Question[] {
  return parseQuestionsWithReport(text, defaultSection).questions;
}

/** Same as above but also tells which questions need manual review */
export function parseQuestionsWithReport(text: string, defaultSection = 'Uploaded Exam Paper'): ParseReport {
  const cleaned = normalizeText(text);
  const warnings: string[] = [];

  type Header = { index: number; end: number; num: number; style: 'q' | 'n' };
  const headerRe =
    /^(?:Q(?:uestion)?\.?\s*(\d{1,4})(?:\s*[.:)\-–]\s*|\s+)|(\d{1,4})\s*[.)]\s+)(?=\S)/gim;

  const all: Header[] = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(cleaned)) !== null) {
    all.push({
      index: m.index,
      end: m.index + m[0].length,
      num: parseInt(m[1] || m[2], 10),
      style: m[1] ? 'q' : 'n',
    });
  }

  // Prefer "Q1." / "Question 1:" style if present (avoids instruction lists like "1. Each question has 1 mark"
  // and "Match the following: 1. .. 2. .." lines inside a question)
  const qStyle = all.filter((h) => h.style === 'q');
  const usingQStyle = qStyle.length >= 2;
  const candidates = usingQStyle ? qStyle : all;

  // Keep only a sensible sequence: 1,2,3...  (numbering may restart at 1 for a new section)
  const looksComplete = (chunk: string) => /(^|\s)\(?[Dd][.)]/.test(chunk) || ANSWER_RE.test(chunk);
  const headers: Header[] = [];
  let expected = 1;
  for (const h of candidates) {
    const inSequence = h.num === expected || (h.num === 1 && headers.length > 0);
    if (!inSequence) continue;

    // plain "1." / "2." numbering is ambiguous (instruction lists, "Match the following: 1. .. 2. .."):
    // once the paper has really started, only trust it if the previous question already looks finished
    if (!usingQStyle && headers.length > 0) {
      const prev = headers[headers.length - 1];
      const prevDone = looksComplete(cleaned.slice(prev.end, h.index));
      const paperStarted = looksComplete(cleaned.slice(0, h.index));
      if (paperStarted && !prevDone) continue;
    }

    headers.push(h);
    expected = h.num + 1;
  }

  const blocks: string[] = [];
  if (headers.length > 0) {
    headers.forEach((h, i) => {
      const stop = i + 1 < headers.length ? headers[i + 1].index : cleaned.length;
      blocks.push(cleaned.slice(h.end, stop).trim());
    });
  } else {
    // No numbering found: fall back to blank-line separated blocks (e.g. pasted text)
    cleaned
      .split(/\n\s*\n/)
      .map((b) => b.trim())
      .filter((b) => b.length > 20)
      .forEach((b) => blocks.push(b));
  }

  const baseId = Date.now();
  const parsedBlocks = blocks.map((block, i) => parseSingleQuestionBlock(block, i + 1, defaultSection));

  // Plain "1." numbering: instruction items ("1. Each question carries 1 mark") look like questions.
  // Drop leading blocks that have no options at all.
  let kept = parsedBlocks;
  if (!usingQStyle) {
    let firstReal = parsedBlocks.findIndex((p) => p.optionsFound === 4);
    if (firstReal === -1) firstReal = 0;
    kept = parsedBlocks.slice(firstReal);
  }

  const questions: Question[] = [];
  let unparsedCount = 0;

  kept.forEach((p, idx) => {
    const qNo = idx + 1;
    const q: Question = { ...p.question, id: baseId + qNo, questionNumber: qNo };
    questions.push(q);
    if (p.issues.length > 0) {
      unparsedCount++;
      p.issues.forEach((msg) => warnings.push(`Q${qNo}: ${msg}`));
    }
  });

  return { questions, unparsedCount, warnings };
}

interface BlockResult {
  question: Question;
  optionsFound: number;
  issues: string[];
}

interface Marker {
  letter: OptionId;
  start: number; // where marker (incl. "(") begins
  end: number; // where marker ends
}

function findOptionMarkers(body: string): Marker[] | null {
  // matches "(A)", "(a)", "A)", "A.", "a)" ... only when preceded by line start / whitespace
  const re = /(^|\s)(?:\(([A-Da-d])\)|([A-Da-d])[.)](?=\s|$))/gm;
  const all: Marker[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    all.push({
      letter: (m[2] || m[3]).toUpperCase() as OptionId,
      start: m.index + m[1].length,
      end: m.index + m[0].length,
    });
  }

  // choose the LAST "A" that is followed by B, C, D in order
  const pickSequence = (list: Marker[]): Marker[] | null => {
    for (let i = list.length - 1; i >= 0; i--) {
      if (list[i].letter !== 'A') continue;
      const seq: Marker[] = [list[i]];
      let from = i + 1;
      for (const want of ['B', 'C', 'D'] as OptionId[]) {
        const next = list.slice(from).findIndex((x) => x.letter === want);
        if (next === -1) break;
        seq.push(list[from + next]);
        from = from + next + 1;
      }
      if (seq.length === 4) return seq;
    }
    return null;
  };

  // 1st choice: options that each start on their own line (ignores "(A)" mentioned inside option text)
  const lineStart = all.filter((mk) => mk.start === 0 || body[mk.start - 1] === '\n');
  // 2nd choice: inline options like "(A) x (B) y (C) z (D) w"
  return pickSequence(lineStart) || pickSequence(all);
}

const ANSWER_RE =
  /(?:^|\s)(?:correct\s+(?:answer|option|key|choice)|answer|ans|key)(?:\s*[:=\-–.]\s*|\s+is\s+)\(?\s*([A-Da-d1-4])\s*\)?(?=[\s.,;)]|$)/i;
const EXPLANATION_RE = /(?:^|\n)\s*(?:explanation|solution|rationale)\s*[:=\-–]\s*([\s\S]*)$/i;

function parseSingleQuestionBlock(rawBlock: string, qNumber: number, section: string): BlockResult {
  const issues: string[] = [];

  // drop trailing "Section B" / "Part II" style headings glued to the previous question
  let body = rawBlock.replace(/\n\s*(?:section|part)\s+[A-Z0-9IVX]+\b[^\n]*$/i, '').trim();

  // --- answer ---
  let correctOption: OptionId = 'A';
  const answerMatch = body.match(ANSWER_RE);
  if (answerMatch) {
    const raw = answerMatch[1].toUpperCase();
    correctOption = (/[1-4]/.test(raw) ? OPTION_IDS[parseInt(raw, 10) - 1] : raw) as OptionId;
    body = body.replace(answerMatch[0], '\n');
  } else {
    issues.push('correct answer not found, defaulted to A - please verify');
  }

  // --- explanation ---
  let explanation = '';
  const expMatch = body.match(EXPLANATION_RE);
  if (expMatch) {
    explanation = expMatch[1].replace(/\s+/g, ' ').trim();
    body = body.replace(expMatch[0], '').trim();
  }

  // --- options ---
  const markers = findOptionMarkers(body);
  let statement: string;
  let optionTexts: (string | null)[] = [null, null, null, null];

  if (markers) {
    statement = body.slice(0, markers[0].start);
    markers.forEach((mk, i) => {
      const stop = i + 1 < markers.length ? markers[i + 1].start : body.length;
      optionTexts[i] = cleanOptionText(body.slice(mk.end, stop));
    });
  } else {
    statement = body;
    issues.push('could not detect options (A)-(D), please edit manually');
  }

  statement = statement
    .replace(/^(?:Q(?:uestion)?\.?\s*\d+\s*[.:)]|\d+\s*[.:)])\s*/i, '')
    .replace(/\s*\n\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

  if (!statement || statement.length < 5) {
    statement = `Question ${qNumber}: Review problem statement`;
    issues.push('question statement not detected');
  }

  optionTexts.forEach((t, i) => {
    if (markers && !t) issues.push(`option ${OPTION_IDS[i]} is empty`);
  });

  const options: QuestionOption[] = OPTION_IDS.map((id, i) => ({
    id,
    text: optionTexts[i] || `Option ${id}`,
  }));

  return {
    optionsFound: markers ? 4 : 0,
    issues,
    question: {
      id: Date.now() + qNumber,
      questionNumber: qNumber,
      type: 'mcq_single',
      statement,
      options,
      correctOption,
      marks: 1.0,
      negativeMarks: 0.0,
      section,
      explanation,
    },
  };
}

function cleanOptionText(text: string): string {
  return text.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Standard sample PDF content template string that users can download or copy
 */
export const SAMPLE_PDF_TEXT_TEMPLATE = `MCE Examination Paper - Computer Science & Engineering
Code: MCE-CSE-2026-CBT
Total Questions: 5 | Duration: 60 Mins | Max Marks: 5.0

Q1. Which of the following data structures operates on a First-In-First-Out (FIFO) principle?
(A) Stack
(B) Queue
(C) Binary Tree
(D) Priority Queue
Answer: B
Explanation: A Queue follows the First-In-First-Out (FIFO) policy where insertions happen at the rear and deletions occur at the front.

Q2. What is the time complexity of searching for an element in a balanced Binary Search Tree (AVL Tree) with n nodes?
(A) O(1)
(B) O(n)
(C) O(log n)
(D) O(n log n)
Answer: C
Explanation: In an AVL tree, self-balancing rotations keep the height strictly bounded by O(log n), guaranteeing logarithmic search time.

Q3. In Python, what does the keyword "yield" indicate when used within a function?
(A) The function terminates immediately and clears local variables
(B) The function becomes a generator yielding values iteratively on demand
(C) The function executes on a separate operating system thread
(D) The function compiles into native C machine code
Answer: B
Explanation: The yield keyword turns a standard Python function into a generator that returns an iterator capable of producing a sequence of values lazily.

Q4. Which of the following conditions is NOT a necessary condition for a deadlock to occur in an Operating System?
(A) Mutual Exclusion
(B) Hold and Wait
(C) Preemptive Resource Scheduling
(D) Circular Wait
Answer: C
Explanation: The four necessary conditions for deadlock are Mutual Exclusion, Hold and Wait, No Preemption, and Circular Wait. Preemptive scheduling prevents deadlocks.

Q5. In Java, what is the primary role of the Java Virtual Machine (JVM) Metaspace?
(A) Storing local primitive variables for active thread stack frames
(B) Storing class metadata, bytecodes, and method descriptors in native memory
(C) Serving as the Eden space for newly allocated objects
(D) Managing synchronized locks for concurrent threads
Answer: B
Explanation: Introduced in Java 8 to replace PermGen, Metaspace resides in off-heap native memory and holds class metadata, method tables, and constant pools.
`;
