import React from 'react';
import { storage } from '../../services/storage';
import { auth } from '../../services/auth';

interface Props {
  onNavigateTab?: (tab: any) => void;
}

export const AdminDashboard: React.FC<Props> = ({ onNavigateTab }) => {
  const students = storage.getStudents();
  const tests = storage.getTests();
  const submissions = storage.getSubmissions();
  const publishedTests = tests.filter((test) => test.status === 'published');

  const cards = [
    { label: 'Students', value: students.length, tab: 'students' },
    { label: 'Tests', value: tests.length, tab: 'create_test' },
    { label: 'Live Tests', value: publishedTests.length, tab: 'live_tests' },
    { label: 'Responses', value: submissions.length, tab: 'responses' },
    ...(auth.isAdmin() ? [{ label: 'Teachers', value: 'Manage', tab: 'teachers' }] : []),
  ];

  return (
    <section className="min-h-[calc(100vh-72px)] bg-slate-50 p-5 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">
          Dashboard
        </h1>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {cards.map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigateTab?.(card.tab)}
              className="text-left bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-blue-300 hover:shadow-md transition"
            >
              <div className="text-sm font-semibold text-slate-500">{card.label}</div>
              <div className="mt-2 text-3xl font-black text-slate-900">{card.value}</div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};
