import React from 'react';

export type AdminTab =
  | 'dashboard'
  | 'responses'
  | 'create_test'
  | 'live_tests'
  | 'students'
  | 'security';

interface AdminLayoutProps {
  currentTab: AdminTab;
  onTabChange: (tab: AdminTab) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const tabs: Array<{ id: AdminTab; label: string }> = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'create_test', label: 'Create Test' },
  { id: 'live_tests', label: 'Live Tests' },
  { id: 'responses', label: 'Responses' },
  { id: 'students', label: 'Students' },
  { id: 'security', label: 'Security' },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentTab,
  onTabChange,
  onLogout,
  children,
}) => {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 bg-slate-950 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-[1500px] mx-auto px-4 sm:px-6">
          <div className="min-h-[72px] flex items-center justify-between gap-4">
            <div
              className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center shrink-0"
              aria-label="MCE"
              title="MCE"
            >
              <span className="text-white font-black text-sm tracking-tight">MCE</span>
            </div>

            <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                    currentTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            <button
              type="button"
              onClick={onLogout}
              className="px-4 py-2.5 rounded-lg border border-rose-800/70 text-rose-300 hover:bg-rose-950/50 text-xs font-bold whitespace-nowrap"
            >
              Logout
            </button>
          </div>

          <div className="lg:hidden pb-3 flex gap-1.5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap ${
                  currentTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-900 text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="min-h-[calc(100vh-72px)]">{children}</main>
    </div>
  );
};
