/**
 * Excel / CSV se MCQ questions import.
 * Koi extra npm package nahi chahiye (studentImport.ts ka xlsx reader use hota hai).
 *
 * Header row (koi bhi order, naam thode flexible hain):
 *   Question | Option A | Option B | Option C | Option D | Correct | Marks | Negative | Section | Explanation
 * Correct = A / B / C / D  (ya 1-4)
 */
import { Question } from '../types';
import { readXlsxRows, parseCsv } from './studentImport';

export interface ParsedQuestions {
  list: Question[];
  errors: string[];
}

const norm = (s: string) => String(s || '').replace(/^\\uFEFF/, '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

const FIELD_ALIASES: Record<string, string[]> = {
  statement: ['question', 'questions', 'statement', 'questiontext', 'questionstatement', 'questiontitle', 'problem', 'que', 'q'],
  A: ['optiona', 'option1', 'optionaanswer', 'opta', 'opt1', 'choicea', 'choice1', 'answeroptiona'],
  B: ['optionb', 'option2', 'optionbanswer', 'optb', 'opt2', 'choiceb', 'choice2', 'answeroptionb'],
  C: ['optionc', 'option3', 'optioncanswer', 'optc', 'opt3', 'choicec', 'choice3', 'answeroptionc'],
  D: ['optiond', 'option4', 'optiondanswer', 'optd', 'opt4', 'choiced', 'choice4', 'answeroptiond'],
  correct: ['correct', 'correctoption', 'correctanswer', 'rightanswer', 'answerkey', 'correctchoice', 'answer', 'ans', 'key', 'solutionoption'],
  marks: ['marks', 'mark', 'score', 'points'],
  negative: ['negative', 'negativemarks', 'negmarks', 'penalty'],
  section: ['section', 'subject', 'topic'],
  explanation: ['explanation', 'solution', 'reason'],
};

export async function parseQuestionFile(file: File, startId = 1, startNumber = 1): Promise<ParsedQuestions> {
  const lower = file.name.toLowerCase();
  let rows: string[][];

  if (lower.endsWith('.xlsx') || lower.endsWith('.xlsm')) rows = await readXlsxRows(file);
  else if (lower.endsWith('.csv') || lower.endsWith('.txt')) rows = parseCsv(await file.text());
  else throw new Error('Please upload an .xlsx or .csv file. (Purani .xls ko Excel mein Save As .xlsx karo)');

  const errors: string[] = [];
  if (rows.length < 2) throw new Error('File mein header ke baad koi question row nahi mili.');

  // Locate a header row even when a spreadsheet starts with a title row.
  let headerRowIndex = 0;
  let bestScore = -1;
  for (let i = 0; i < Math.min(rows.length, 8); i++) {
    const candidate = rows[i].map(norm);
    const score = Object.values(FIELD_ALIASES).filter(aliases => candidate.some(h => aliases.includes(h))).length;
    if (score > bestScore) { bestScore = score; headerRowIndex = i; }
  }
  const header = rows[headerRowIndex].map(norm);
  const col: Record<string, number> = {};
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    col[field] = header.findIndex((h) => aliases.includes(h));
  }
  if (col.statement < 0) throw new Error('Question column nahi mila. Header mein Question / Question Text / Statement jaisa naam hona chahiye. Download Template karke questions paste karein.');
  if ([col.A, col.B, col.C, col.D].some((c) => c < 0)) {
    throw new Error('Option A, Option B, Option C, Option D columns chahiye.');
  }
  if (col.correct < 0) throw new Error('"Correct" column nahi mila (A/B/C/D).');

  const get = (row: string[], idx: number) => (idx >= 0 ? String(row[idx] ?? '').trim() : '');
  const list: Question[] = [];

  rows.slice(headerRowIndex + 1).forEach((row, i) => {
    const line = headerRowIndex + i + 2;
    const statement = get(row, col.statement);
    if (!statement && row.every((c) => !String(c || '').trim())) return; // blank row

    if (!statement) {
      errors.push(`Row ${line}: question khali hai.`);
      return;
    }

    const options = (['A', 'B', 'C', 'D'] as const).map((id) => ({ id, text: get(row, col[id]) }));
    if (options.some((o) => !o.text)) {
      errors.push(`Row ${line}: 4 options bharna zaruri hai.`);
      return;
    }

    let c = get(row, col.correct).toUpperCase().replace(/[^A-D1-4]/g, '');
    if (/^[1-4]$/.test(c)) c = 'ABCD'[Number(c) - 1];
    if (!/^[A-D]$/.test(c)) {
      errors.push(`Row ${line}: Correct answer A/B/C/D hona chahiye.`);
      return;
    }

    const marks = Number(get(row, col.marks));
    const neg = Math.abs(Number(get(row, col.negative)));

    list.push({
      id: startId + list.length,
      questionNumber: startNumber + list.length,
      type: 'mcq_single',
      statement,
      options,
      correctOption: c as 'A' | 'B' | 'C' | 'D',
      marks: Number.isFinite(marks) && marks > 0 ? marks : 1,
      negativeMarks: Number.isFinite(neg) ? neg : 0,
      section: get(row, col.section) || 'General',
      explanation: get(row, col.explanation),
    });
  });

  return { list, errors };
}

export const QUESTION_CSV_TEMPLATE =
  'Question,Option A,Option B,Option C,Option D,Correct,Marks,Negative,Section,Explanation\n' +
  '2 + 2 = ?,3,4,5,6,B,1,0,Maths,Simple addition\n';

export function downloadQuestionTemplate() {
  const blob = new Blob(['\uFEFF' + QUESTION_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'questions_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(link.href), 1500);
}
