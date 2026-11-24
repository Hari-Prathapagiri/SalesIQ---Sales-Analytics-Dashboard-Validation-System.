import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

export const SectionCard: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, children, className = '' }) => (
  <section
    className={`rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 ${className}`}
  >
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
    {children}
  </section>
);

export const KpiCard: React.FC<{
  label: string;
  value: string;
  detail: string;
  tone?: 'default' | 'positive' | 'warning' | 'danger';
}> = ({ label, value, detail, tone = 'default' }) => {
  const accentText =
    tone === 'positive'
      ? 'text-emerald-700 dark:text-emerald-400'
      : tone === 'warning'
      ? 'text-amber-700 dark:text-amber-400'
      : tone === 'danger'
      ? 'text-red-700 dark:text-red-400'
      : 'text-slate-900 dark:text-slate-100';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
      <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-2 text-2xl font-bold tracking-tight tabular-nums ${accentText} truncate`}>
        {value}
      </p>
      <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 truncate">{detail}</p>
    </div>
  );
};

export const StatusLabel: React.FC<{
  status: 'pass' | 'fail' | 'warning';
  label: string;
}> = ({ status, label }) => {
  if (status === 'pass') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
    );
  }
  if (status === 'warning') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-400 whitespace-nowrap">
      <XCircle className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
};

export const EmptyState: React.FC<{
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}> = ({ title, description, actionLabel, onAction }) => (
  <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center dark:border-slate-700 dark:bg-slate-900/40">
    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
    <p className="mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">{description}</p>
    {actionLabel && onAction && (
      <button
        type="button"
        onClick={onAction}
        className="mt-4 rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
      >
        {actionLabel}
      </button>
    )}
  </div>
);
