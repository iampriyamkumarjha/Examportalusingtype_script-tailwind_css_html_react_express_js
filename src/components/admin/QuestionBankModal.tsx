import React, { useState } from 'react';
import { ALL_BANKS, BankQuestion } from '../../services/questionBank';
import { Question } from '../../types';

interface QuestionBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuestions: (questions: Question[]) => void;
  initialCategory?: 'all' | 'java' | 'python' | 'os' | 'dsa';
}

export const QuestionBankModal: React.FC<QuestionBankModalProps> = ({
  isOpen,
  onClose,
  onImportQuestions,
  initialCategory = 'java',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'java' | 'python' | 'os' | 'dsa'>(
    initialCategory === 'all' ? 'java' : initialCategory
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<'All' | 'Easy' | 'Medium' | 'Hard'>('All');
  const [selectedIds, setSelectedIds] = useState<Record<number, boolean>>({});

  if (!isOpen) return null;

  const currentBank = ALL_BANKS[selectedCategory];
  const allCategoryQuestions = currentBank.questions;

  // Filter questions
  const filteredQuestions = allCategoryQuestions.filter((q) => {
    const qText = (q.statement + ' ' + (q.topic || '') + ' ' + (q.explanation || '')).toLowerCase();
    const matchesSearch = !searchQuery || qText.includes(searchQuery.toLowerCase());
    const matchesDiff = difficultyFilter === 'All' || q.difficulty === difficultyFilter;
    return matchesSearch && matchesDiff;
  });

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSelectAllCategory = () => {
    const next: Record<number, boolean> = { ...selectedIds };
    filteredQuestions.forEach((q) => {
      next[q.id] = true;
    });
    setSelectedIds(next);
  };

  const handleDeselectAllCategory = () => {
    const next: Record<number, boolean> = { ...selectedIds };
    filteredQuestions.forEach((q) => {
      delete next[q.id];
    });
    setSelectedIds(next);
  };

  const selectedCount = Object.keys(selectedIds).filter((id) => selectedIds[Number(id)]).length;

  const handleImport = () => {
    // Collect all selected questions across banks
    const toImport: Question[] = [];
    const allList: BankQuestion[] = [
      ...ALL_BANKS.java.questions,
      ...ALL_BANKS.python.questions,
      ...ALL_BANKS.os.questions,
      ...ALL_BANKS.dsa.questions,
    ];

    allList.forEach((q) => {
      if (selectedIds[q.id]) {
        toImport.push({
          ...q,
          id: Date.now() + Math.floor(Math.random() * 10000) + toImport.length,
        });
      }
    });

    if (toImport.length === 0) {
      alert('Please select at least one question from the bank to import.');
      return;
    }

    onImportQuestions(toImport);
    onClose();
  };

  const handleImportWholeCategory = (catKey: 'java' | 'python' | 'os' | 'dsa') => {
    const bank = ALL_BANKS[catKey];
    const toImport: Question[] = bank.questions.map((q, idx) => ({
      ...q,
      id: Date.now() + idx + Math.floor(Math.random() * 1000),
    }));
    onImportQuestions(toImport);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl">account_balance</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Institutional Question Bank</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                  4 Disciplines Ready
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Browse, select, and import verified questions for Java, Python, Operating Systems, and DSA.
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

        {/* Category Navigation Tabs */}
        <div className="px-6 pt-3 bg-white border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            {(['java', 'python', 'os', 'dsa'] as const).map((cat) => {
              const info = ALL_BANKS[cat];
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-xs font-bold transition cursor-pointer border-b-2 ${
                    isSelected
                      ? 'border-blue-600 text-blue-700 bg-blue-50/70 shadow-xs'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-base">{info.icon}</span>
                  <span>{info.title}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {info.questions.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Toolbar: Search, Filters & Selection Helpers */}
        <div className="px-6 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-80">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${currentBank.title} questions...`}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end">
            <span className="text-slate-500 font-medium">Difficulty:</span>
            {(['All', 'Easy', 'Medium', 'Hard'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDifficultyFilter(d)}
                className={`px-2.5 py-1 rounded-lg font-semibold text-[11px] transition cursor-pointer ${
                  difficultyFilter === d
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {d}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-300 mx-1"></div>

            <button
              onClick={handleSelectAllCategory}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold cursor-pointer"
            >
              Select All
            </button>
            <button
              onClick={handleDeselectAllCategory}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Question Cards List */}
        <div className="p-6 overflow-y-auto max-h-[50vh] space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
            <span>
              Showing <strong>{filteredQuestions.length}</strong> questions in <strong>{currentBank.title}</strong>
            </span>
            <button
              onClick={() => handleImportWholeCategory(selectedCategory)}
              className="text-blue-600 font-bold hover:underline cursor-pointer flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">playlist_add</span>
              <span>Import Entire {currentBank.title} ({currentBank.questions.length} MCQs)</span>
            </button>
          </div>

          {filteredQuestions.map((q, idx) => {
            const isChecked = !!selectedIds[q.id];

            return (
              <div
                key={q.id}
                onClick={() => toggleSelect(q.id)}
                className={`p-4 rounded-xl border transition cursor-pointer ${
                  isChecked
                    ? 'border-2 border-blue-600 bg-blue-50/40 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleSelect(q.id)}
                    className="mt-1 h-4 w-4 rounded text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                          #{idx + 1}
                        </span>
                        {q.topic && (
                          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                            {q.topic}
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            q.difficulty === 'Easy'
                              ? 'bg-emerald-100 text-emerald-800'
                              : q.difficulty === 'Hard'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {q.difficulty || 'Medium'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">1.0 Mark</span>
                    </div>

                    <p className="text-xs md:text-sm font-bold text-slate-900 leading-relaxed">{q.statement}</p>

                    {/* Options Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      {q.options.map((opt) => {
                        const isCorrect = q.correctOption === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`p-2 rounded-lg border flex items-center justify-between ${
                              isCorrect
                                ? 'bg-emerald-50 border-emerald-300 text-emerald-900 font-semibold'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="flex items-center gap-2">
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${
                                  isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {opt.id}
                              </span>
                              <span>{opt.text}</span>
                            </span>
                            {isCorrect && (
                              <span className="text-[10px] uppercase font-bold text-emerald-700 flex items-center gap-0.5">
                                <span className="material-symbols-outlined text-xs">check</span> Key
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200 mt-2 flex items-start gap-1.5">
                        <span className="material-symbols-outlined text-blue-600 text-xs mt-0.5">lightbulb</span>
                        <span>
                          <strong>Rationale:</strong> {q.explanation}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-600">
            Selected Questions:{' '}
            <strong className="text-blue-700 text-sm font-bold">{selectedCount}</strong>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={selectedCount === 0}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              <span>Import Selected Questions ({selectedCount}) to Test</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
