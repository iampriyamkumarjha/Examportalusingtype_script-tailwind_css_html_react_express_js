import type { Question } from '../types';
import { parseQuestionFile } from './questionImport';
import { extractTextFromPdf, parseQuestionsWithReport } from './pdfParser';
import * as pdfjsLib from 'pdfjs-dist';

export interface AutomaticQuestionImportResult {
  questions: Question[];
  warnings: string[];
  rawText: string;
  sourceKind: 'table' | 'text' | 'pdf' | 'ocr' | 'docx';
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const SUPPORTED = /\.(pdf|docx|xlsx|xlsm|csv|txt|json|png|jpe?g|webp)$/i;

function ext(name: string): string {
  return name.toLowerCase().split('.').pop() || '';
}

async function readZipText(file: File, wantedPath: string): Promise<string> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  let eocd = -1;
  for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('Invalid Word document. Please upload a .docx file.');
  const count = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  for (let i = 0; i < count; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const nameLen = view.getUint16(pos + 28, true);
    const extraLen = view.getUint16(pos + 30, true);
    const commentLen = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
    if (name === wantedPath) {
      const localNameLen = view.getUint16(localOffset + 26, true);
      const localExtraLen = view.getUint16(localOffset + 28, true);
      const start = localOffset + 30 + localNameLen + localExtraLen;
      const compressed = bytes.subarray(start, start + compressedSize);
      let data: Uint8Array;
      if (method === 0) data = compressed;
      else if (method === 8) {
        const stream = new DecompressionStream('deflate-raw');
        const writer = stream.writable.getWriter();
        void writer.write(compressed as unknown as BufferSource);
        void writer.close();
        data = new Uint8Array(await new Response(stream.readable).arrayBuffer());
      } else throw new Error('This Word document uses an unsupported compression format.');
      return new TextDecoder().decode(data);
    }
    pos += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('Could not find text in this Word document.');
}

function docxXmlToText(xml: string): string {
  return xml
    .replace(/<w:tab\b[^>]*\/>/g, '\t')
    .replace(/<w:(?:br|cr)\b[^>]*\/>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'").replace(/&amp;/g, '&')
    .replace(/\n{3,}/g, '\n\n').trim();
}

async function loadTesseract(): Promise<any> {
  const w = window as any;
  if (w.Tesseract?.createWorker) return w.Tesseract;
  await new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-mce-tesseract="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('OCR engine could not load. Check your internet connection and try again.')), { once: true });
      if (w.Tesseract?.createWorker) resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    script.async = true;
    script.dataset.mceTesseract = 'true';
    script.onload = () => w.Tesseract?.createWorker ? resolve() : reject(new Error('OCR engine loaded but is unavailable.'));
    script.onerror = () => reject(new Error('OCR engine could not load. Check your internet connection and try again.'));
    document.head.appendChild(script);
  });
  return w.Tesseract;
}

async function ocrImage(source: Blob | HTMLCanvasElement): Promise<string> {
  const Tesseract = await loadTesseract();
  const worker = await Tesseract.createWorker('eng+hin', 1, {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5',
    logger: () => undefined,
  });
  try {
    const result = await worker.recognize(source);
    return String(result?.data?.text || '').trim();
  } finally {
    await worker.terminate();
  }
}

async function ocrPdf(file: File): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  const parts: string[] = [];
  try {
    const pageLimit = Math.min(pdf.numPages, 20);
    for (let n = 1; n <= pageLimit; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not prepare scanned PDF page for OCR.');
      await page.render({ canvasContext: context, viewport, canvas } as any).promise;
      const text = await ocrImage(canvas);
      if (text) parts.push(text);
      canvas.width = 0; canvas.height = 0;
    }
    if (pdf.numPages > pageLimit) parts.push(`\n[OCR limit: only first ${pageLimit} pages were processed.]`);
  } finally {
    await pdf.destroy();
  }
  return parts.join('\n\n');
}

function textToQuestions(text: string, section: string): { questions: Question[]; warnings: string[] } {
  const cleaned = text.replace(/\r/g, '').trim();
  if (!cleaned) return { questions: [], warnings: ['File se readable text nahi mila.'] };
  try {
    const json = JSON.parse(cleaned);
    const items = Array.isArray(json) ? json : json?.questions;
    if (Array.isArray(items)) {
      const questions = items.map((q: any, i: number) => normalizeQuestion(q, i, section)).filter(Boolean) as Question[];
      const warnings = questions.length === items.length ? [] : ['JSON mein kuch questions ka format valid nahi tha.'];
      return { questions, warnings };
    }
  } catch { /* not JSON; parse as formatted question text */ }
  const report = parseQuestionsWithReport(cleaned, section);
  const warnings = [...report.warnings];
  if (!report.questions.length) warnings.unshift('Koi MCQ detect nahi hua. Question ke saath A), B), C), D) options aur Answer: B jaisa answer key format use karein.');
  return { questions: report.questions, warnings };
}

function normalizeQuestion(q: any, index: number, section: string): Question | null {
  if (!q || typeof q.statement !== 'string' || !q.statement.trim()) return null;
  const rawOptions = Array.isArray(q.options) ? q.options : [];
  const options = (['A', 'B', 'C', 'D'] as const).map((id, i) => {
    const found = rawOptions.find((o: any) => String(o?.id || '').toUpperCase() === id) ?? rawOptions[i];
    return { id, text: String(found?.text ?? q[id] ?? q[`option${id}`] ?? '').trim() };
  });
  const correct = String(q.correctOption ?? q.correct ?? q.answer ?? '').trim().toUpperCase();
  const answer = /^[1-4]$/.test(correct) ? 'ABCD'[Number(correct) - 1] : correct;
  if (options.some(o => !o.text) || !/^[A-D]$/.test(answer)) return null;
  return {
    id: Date.now() + index,
    questionNumber: index + 1,
    type: 'mcq_single',
    statement: q.statement.trim(), options,
    correctOption: answer as Question['correctOption'],
    marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
    negativeMarks: Number.isFinite(Number(q.negativeMarks)) ? Math.max(0, Number(q.negativeMarks)) : 0,
    section: String(q.section || section || 'General'),
    explanation: String(q.explanation || ''),
  };
}

export async function importQuestionsAutomatically(file: File, section = 'General'): Promise<AutomaticQuestionImportResult> {
  if (!SUPPORTED.test(file.name)) throw new Error('Supported files: PDF, DOCX, XLSX, XLSM, CSV, TXT, JSON, JPG, PNG, WEBP.');
  if (file.size > MAX_FILE_SIZE) throw new Error('File 25 MB se chhoti honi chahiye.');
  if (!file.size) throw new Error('Selected file is empty.');
  const fileExt = ext(file.name);

  if (['xlsx', 'xlsm', 'csv'].includes(fileExt)) {
    const parsed = await parseQuestionFile(file);
    return { questions: parsed.list, warnings: parsed.errors, rawText: '', sourceKind: 'table' };
  }
  if (fileExt === 'docx') {
    const xml = await readZipText(file, 'word/document.xml');
    const rawText = docxXmlToText(xml);
    const parsed = textToQuestions(rawText, section);
    return { ...parsed, rawText, sourceKind: 'docx' };
  }
  if (fileExt === 'pdf') {
    const extracted = await extractTextFromPdf(file);
    let rawText = extracted.text;
    let sourceKind: AutomaticQuestionImportResult['sourceKind'] = 'pdf';
    let parsed = textToQuestions(rawText, section);
    if (rawText.replace(/\s/g, '').length < 30 || !parsed.questions.length) {
      const ocrText = await ocrPdf(file);
      if (ocrText.replace(/\s/g, '').length > rawText.replace(/\s/g, '').length) {
        rawText = ocrText;
        sourceKind = 'ocr';
        parsed = textToQuestions(rawText, section);
      }
    }
    return { ...parsed, rawText, sourceKind };
  }
  if (['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) {
    const rawText = await ocrImage(file);
    const parsed = textToQuestions(rawText, section);
    return { ...parsed, rawText, sourceKind: 'ocr' };
  }
  const rawText = await file.text();
  if (fileExt === 'txt' || fileExt === 'json') {
    const parsed = textToQuestions(rawText, section);
    return { ...parsed, rawText, sourceKind: 'text' };
  }
  throw new Error('This file type is not supported.');
}

/** Return true only if all extracted questions have usable options and a source-provided answer. */
export function validateExtractedQuestions(questions: Question[], warnings: string[]): string[] {
  const issues = [...warnings];
  if (!questions.length) issues.push('Publish karne ke liye kam se kam ek question zaroori hai.');
  questions.forEach((q, i) => {
    if (!q.statement?.trim()) issues.push(`Q${i + 1}: question text missing.`);
    if (!Array.isArray(q.options) || ['A', 'B', 'C', 'D'].some(id => !q.options.some(o => o.id === id && o.text?.trim()))) issues.push(`Q${i + 1}: all four options are required.`);
    if (!['A', 'B', 'C', 'D'].includes(q.correctOption)) issues.push(`Q${i + 1}: correct answer missing.`);
  });
  return [...new Set(issues)];
}
