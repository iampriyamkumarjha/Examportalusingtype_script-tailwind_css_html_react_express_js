/**
 * Kisi bhi format ki question file -> Question[] (preview/edit ke liye).
 * Supported: .pdf (text-based), .xlsx/.xlsm, .csv, .txt, .md, .json, .docx
 * Nothing is published here - caller shows a preview and the admin edits first.
 */
import { Question } from '../types';
import { parseQuestionFile } from './questionImport';
import { parseQuestionsWithReport, extractTextFromPdf } from './pdfParser';
import { readDocxText } from './studentImport';

export interface ImportResult {
  questions: Question[];
  warnings: string[];
  sourceName: string;
}

export const SUPPORTED_ACCEPT = '.pdf,.docx,.xlsx,.xlsm,.csv,.txt,.md,.json';

const ext = (name: string) => (name.toLowerCase().split('.').pop() || '');

const normalise = (list: Question[]): Question[] =>
  list.map((q, i) => ({
    ...q,
    id: Date.now() + i,
    questionNumber: i + 1,
    type: q.type || 'mcq_single',
    statement: String(q.statement ?? ''),
    options: ['A', 'B', 'C', 'D'].map((id, k) => ({
      id: id as 'A' | 'B' | 'C' | 'D',
      text: String(q.options?.[k]?.text ?? ''),
    })),
    correctOption: (['A', 'B', 'C', 'D'].includes(q.correctOption) ? q.correctOption : 'A') as Question['correctOption'],
    marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
    negativeMarks: Math.abs(Number(q.negativeMarks)) || 0,
    section: q.section || 'General',
    explanation: q.explanation || '',
  }));

function fromText(text: string, section: string): { questions: Question[]; warnings: string[] } {
  const report = parseQuestionsWithReport(text, section);
  return { questions: report.questions, warnings: report.warnings || [] };
}

export async function importQuestionsFromAnyFile(file: File, section = 'General'): Promise<ImportResult> {
  const e = ext(file.name);
  let questions: Question[] = [];
  let warnings: string[] = [];

  if (e === 'pdf') {
    const { text } = await extractTextFromPdf(file);
    if (text.replace(/---\s*Page\s+\d+\s*---/gi, '').replace(/\s+/g, '').length < 20) {
      throw new Error('Is PDF mein text nahi mila (scanned/image PDF lagta hai). Text-based PDF ya Word/Excel file upload karein.');
    }
    ({ questions, warnings } = fromText(text, section));
  } else if (e === 'docx') {
    ({ questions, warnings } = fromText(await readDocxText(file), section));
  } else if (e === 'xlsx' || e === 'xlsm' || e === 'csv') {
    const r = await parseQuestionFile(file);
    questions = r.list;
    warnings = r.errors;
  } else if (e === 'json') {
    const parsed = JSON.parse(await file.text());
    const arr = Array.isArray(parsed) ? parsed : parsed?.questions;
    if (!Array.isArray(arr)) throw new Error('JSON mein questions ki array nahi mili.');
    questions = arr as Question[];
  } else if (e === 'txt' || e === 'md') {
    const text = await file.text();
    ({ questions, warnings } = fromText(text, section));
    if (!questions.length && text.includes(',')) {
      try {
        const r = await parseQuestionFile(new File([text], 'q.csv', { type: 'text/csv' }));
        questions = r.list;
        warnings = r.errors;
      } catch { /* not csv either */ }
    }
  } else if (e === 'xls' || e === 'doc') {
    throw new Error(`Purani .${e} file support nahi hai. Ise .${e === 'xls' ? 'xlsx' : 'docx'} mein Save As karke upload karein.`);
  } else {
    throw new Error('Ye format support nahi hai. PDF, Word (.docx), Excel (.xlsx), CSV, TXT ya JSON upload karein.');
  }

  if (!questions.length) {
    throw new Error('File se koi question detect nahi hua. Format check karein ya "Add question" se manually bharein.');
  }
  return { questions: normalise(questions), warnings, sourceName: file.name };
}
