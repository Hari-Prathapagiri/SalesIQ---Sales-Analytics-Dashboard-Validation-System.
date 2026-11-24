import React, { useState } from 'react';
import {
  BarChart3,
  CheckSquare,
  Database,
  FileSpreadsheet,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Moon,
  Settings,
  ShieldAlert,
  Sun,
  X,
} from 'lucide-react';
import { useSales } from '../context/SalesContext';
import { PageId } from '../types/sales';

export const NAV_ITEMS: { id: PageId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Sales Overview', icon: LayoutDashboard },
  { id: 'data-management', label: 'Data Management', icon: FolderKanban },
  { id: 'analytics', label: 'Sales Analytics', icon: BarChart3 },
  { id: 'dashboard-validation', label: 'Dashboard Validation', icon: CheckSquare },
  { id: 'sql-analysis', label: 'SQL Analysis', icon: Database },
  { id: 'data-quality', label: 'Data Quality', icon: ShieldAlert },
  { id: 'reports', label: 'Reports & Exports', icon: FileSpreadsheet },
  { id: 'settings', label: 'Settings & Docs', icon: Settings },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activePage,
    setActivePage,
    datasetSource,
    datasetName,
    switchSampleDataset,
    settings,
    updateSettings,
    allRecords,
  } = useSales();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeNav = NAV_ITEMS.find((n) => n.id === activePage) ?? NAV_ITEMS[0];

  const handleSelectPage = (id: PageId) => {
    setActivePage(id);
    setMobileOpen(false);
  };

  const sidebarContent = (
    <div className="flex h-full flex-col bg-[#0B1528] text-slate-100 select-none">
      {/* Brand header */}
      <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
        <button
          type="button"
          onClick={() => handleSelectPage('overview')}
          className="flex items-center gap-2.5 text-left focus-visible:outline-2 focus-visible:outline-blue-400 rounded-md"
        >
          <svg
            viewBox="0 0 28 28"
            className="h-7 w-7 shrink-0"
            aria-hidden="true"
          >
            <rect width="28" height="28" rx="6" fill="#1D4ED8" />
            <path
              d="M7 18.5L11.5 14L15 16.5L21 9.5"
              stroke="#FFFFFF"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <path
              d="M17.5 9.5H21V13"
              stroke="#34D399"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
          <span className="text-lg font-bold tracking-tight text-white whitespace-nowrap">
            SalesIQ
          </span>
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation menu"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Primary Navigation">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectPage(item.id)}
              className={`flex w-full min-h-[44px] items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                isActive
                  ? 'bg-blue-700 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Active Dataset Summary Footer */}
      <div className="border-t border-slate-800/80 px-4 py-4 text-xs text-slate-400">
        <p className="font-medium text-slate-200 truncate">{datasetName}</p>
        <p className="mt-1 tabular-nums text-slate-400">
          {allRecords.length} records · {settings.currency}
        </p>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      {/* Desktop Fixed Navy Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Slide-Out Sidebar Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-[1px]"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative z-10 w-72 max-w-[85vw] shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar (Clean 3-Zone Contract) */}
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-3 sm:px-6 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/95">
          {/* Left: Mobile Menu + Breadcrumb */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden font-semibold text-slate-900 dark:text-slate-100 sm:inline whitespace-nowrap">
                SalesIQ
              </span>
              <span className="hidden text-slate-400 sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="truncate font-semibold text-slate-800 dark:text-slate-100">
                {activeNav.label}
              </h1>
            </div>
          </div>

          {/* Right: Dataset Switcher + Theme Toggle */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div
              className="flex items-center rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
              role="group"
              aria-label="Active dataset selector"
            >
              <button
                type="button"
                onClick={() => switchSampleDataset('clean')}
                className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  datasetSource === 'clean'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                Clean
              </button>
              <button
                type="button"
                onClick={() => switchSampleDataset('dirty')}
                className={`min-h-[32px] rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  datasetSource === 'dirty'
                    ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-700 dark:text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                Dirty
              </button>
              {datasetSource === 'uploaded' && (
                <span className="px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 whitespace-nowrap">
                  CSV
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() =>
                updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })
              }
              aria-label={`Switch to ${settings.theme === 'dark' ? 'light' : 'dark'} theme`}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {settings.theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="mx-auto w-full max-w-[1600px] flex-1 p-3 sm:p-5 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};
