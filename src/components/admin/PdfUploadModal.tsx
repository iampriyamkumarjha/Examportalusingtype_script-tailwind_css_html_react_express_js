import React, { useState, useRef } from 'react';
import { extractTextFromPdf, parseQuestionsWithReport, SAMPLE_PDF_TEXT_TEMPLATE } from '../../services/pdfParser';
import { Question } from '../../types';

interface PdfUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuestionsImported: (questions: Question[]) => void;
  defaultSectionName?: string;
}

export const PdfUploadModal: React.FC<PdfUploadModalProps> = ({
  isOpen,
  onClose,
  onQuestionsImported,
  defaultSectionName = 'Uploaded Section',
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'raw'>('preview');
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [pageCount, setPageCount] = useState<number>(0);
  const [rawText, setRawText] = useState('');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [issues, setIssues] = useState<Record<number, string[]>>({});
  const [reviewed, setReviewed] = useState<Set<number>>(new Set());

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Parses text and remembers which questions need a manual check (e.g. answer key not found)
  const applyParse = (text: string): Question[] => {
    const report = parseQuestionsWithReport(text, defaultSectionName);
    const map: Record<number, string[]> = {};
    report.warnings.forEach((w) => {
      const m = w.match(/^Q(\d+):\s*(.*)$/);
      if (!m) return;
      const n = parseInt(m[1], 10);
      map[n] = [...(map[n] || []), m[2]];
    });
    setIssues(map);
    setReviewed(new Set());
    setParsedQuestions(report.questions);
    return report.questions;
  };

  const isFlagged = (q: Question) => (issues[q.questionNumber]?.length ?? 0) > 0 && !reviewed.has(q.questionNumber);
  const flaggedCount = parsedQuestions.filter(isFlagged).length;

  const changeAnswer = (index: number, value: 'A' | 'B' | 'C' | 'D') => {
    const qn = parsedQuestions[index].questionNumber;
    setParsedQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, correctOption: value } : q)));
    setReviewed((prev) => new Set(prev).add(qn));
  };

  const handleProcessFile = async (file: File) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');

    try {
      let extractedText = '';
      let pages = 1;

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const result = await extractTextFromPdf(file);
        extractedText = result.text;
        pages = result.pageCount;

        const readable = extractedText.replace(/---\s*Page\s+\d+\s*---/gi, '').replace(/\s+/g, '');
        if (readable.length < 20) {
          setPageCount(pages);
          setRawText('');
          setParsedQuestions([]);
          setErrorMsg(
            'No readable text found. This looks like a scanned / image-only PDF. Please upload a text-based PDF (exported from Word or Google Docs).'
          );
          return;
        }
      } else {
        extractedText = await file.text();
      }

      setPageCount(pages);
      setRawText(extractedText);

      const questions = applyParse(extractedText);

      if (questions.length === 0) {
        setErrorMsg(
          'No questions could be automatically identified from the file. Please check the format in the "Raw Text" tab or use standard Q1. / (A), (B), (C), (D) formatting.'
        );
      }
    } catch (err: any) {
      setErrorMsg(`Failed to parse PDF file: ${err?.message || 'Unsupported format'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleLoadSampleTemplate = () => {
    setFileName('Sample_MCE_Question_Sheet.pdf');
    setFileSize('14.2 KB');
    setPageCount(1);
    setRawText(SAMPLE_PDF_TEXT_TEMPLATE);
    applyParse(SAMPLE_PDF_TEXT_TEMPLATE);
    setErrorMsg(null);
  };

  const handleRawTextChange = (text: string) => {
    setRawText(text);
    applyParse(text);
  };

  const handleDownloadSampleFile = () => {
    const element = document.createElement('a');
    const file = new Blob([SAMPLE_PDF_TEXT_TEMPLATE], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = 'MCE_Sample_Question_Paper_Format.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleConfirmImport = () => {
    if (parsedQuestions.length === 0) {
      alert('No parsed questions to import. Please upload a PDF or enter question text.');
      return;
    }

    if (
      flaggedCount > 0 &&
      !window.confirm(`${flaggedCount} question(s) still need review (answer key may be wrong). Import anyway?`)
    ) {
      return;
    }

    onQuestionsImported(parsedQuestions);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl">picture_as_pdf</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Upload PDF & Extract Questions</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                  Auto Extraction
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Upload your question paper in PDF or Text format. Questions, options, and answer keys are parsed automatically.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Upload Zone & Actions */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Dropzone */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-purple-300 hover:border-purple-500 bg-purple-50/30 hover:bg-purple-50/60 rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2 relative"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl">cloud_upload</span>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {isProcessing ? 'Processing PDF Document...' : 'Click to Browse or Drag & Drop PDF Question Sheet'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Supported formats: <strong>.pdf</strong> (text-based, not scanned) and <strong>.txt</strong>. Q1., options
                A-D and Answer keys are detected automatically.
              </p>
            </div>

            {/* Quick helper buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLoadSampleTemplate();
                }}
                className="px-3 py-1.5 bg-white border border-purple-200 hover:bg-purple-100 text-purple-700 text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                <span>Load Sample Question Sheet</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadSampleFile();
                }}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl transition shadow-xs cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span>Download Sample Format</span>
              </button>
            </div>
          </div>

          {/* Upload Status Card */}
          {fileName && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-purple-600 text-xl">description</span>
                <div>
                  <strong className="text-slate-900 font-bold block">{fileName}</strong>
                  <span className="text-[11px] text-slate-400">
                    Size: {fileSize} • Pages: {pageCount} • Questions Detected:{' '}
                    <strong className="text-purple-700 font-bold">{parsedQuestions.length}</strong>
                  </span>
                </div>
              </div>

              {parsedQuestions.length > 0 && (
                <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-bold text-[10px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">check_circle</span>
                  <span>{parsedQuestions.length} Questions Ready</span>
                </span>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-2">
              <span className="material-symbols-outlined text-amber-600 text-sm mt-0.5">warning</span>
              <div>{errorMsg}</div>
            </div>
          )}

          {/* Tabs: Extracted Questions Preview vs Raw Text */}
          {rawText && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      activeTab === 'preview'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">checklist</span>
                    <span>Parsed Questions Preview ({parsedQuestions.length})</span>
                    {flaggedCount > 0 && (
                      <span className="ml-1 px-1.5 rounded-full bg-amber-400 text-amber-950 text-[10px]">{flaggedCount} to check</span>
                    )}
                  </button>

                  <button
                    onClick={() => setActiveTab('raw')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                      activeTab === 'raw'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">code</span>
                    <span>Raw Document Text</span>
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">
                  Standard format: Q1. ... (A) ... (B) ... Ans: B
                </span>
              </div>

              {/* Preview Tab */}
              {activeTab === 'preview' && (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                  {parsedQuestions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No questions detected yet. Switch to the &quot;Raw Document Text&quot; tab to check formatting.
                    </div>
                  ) : (
                    parsedQuestions.map((q, idx) => (
                      <div
                        key={q.id || idx}
                        className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-purple-300 transition space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px]">
                            Question {idx + 1}
                          </span>
                          <label className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                            Key:
                            <select
                              value={q.correctOption}
                              onChange={(e) => changeAnswer(idx, e.target.value as 'A' | 'B' | 'C' | 'D')}
                              className="bg-transparent font-bold outline-none cursor-pointer"
                            >
                              {['A', 'B', 'C', 'D'].map((o) => (
                                <option key={o} value={o}>
                                  {o}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>

                        {isFlagged(q) && (
                          <div className="flex items-start gap-1.5 p-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900">
                            <span className="material-symbols-outlined text-amber-600 text-sm">warning</span>
                            <span>{issues[q.questionNumber].join(' • ')}</span>
                          </div>
                        )}

                        <p className="font-semibold text-slate-900 leading-relaxed">{q.statement}</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                          {q.options.map((opt) => {
                            const isCorrect = q.correctOption === opt.id;
                            return (
                              <div
                                key={opt.id}
                                className={`p-1.5 px-2 rounded-lg border text-[11px] flex items-center gap-2 ${
                                  isCorrect
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-bold'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                <span
                                  className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${
                                    isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {opt.id}
                                </span>
                                <span>{opt.text}</span>
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <p className="text-[10px] text-slate-500 italic mt-1">
                            Rationale: {q.explanation}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Raw Tab */}
              {activeTab === 'raw' && (
                <div className="space-y-2">
                  <textarea
                    rows={12}
                    value={rawText}
                    onChange={(e) => handleRawTextChange(e.target.value)}
                    placeholder="Paste or edit question paper text here..."
                    className="w-full p-3 font-mono text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none leading-relaxed"
                  />
                  <p className="text-[11px] text-slate-500">
                    Edits made here will immediately re-run the question parser (answer changes made in the preview are reset).
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Detected:{' '}
            <strong className="text-purple-700 text-sm font-bold">{parsedQuestions.length} Questions</strong>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmImport}
              disabled={parsedQuestions.length === 0}
              className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Import {parsedQuestions.length} Questions to Test</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
