import React from 'react';
import { RotateCcw } from 'lucide-react';
import { SectionCard } from '../components/ui/DataComponents';
import { useSales } from '../context/SalesContext';
import { CurrencyCode, DateFormatOption } from '../types/sales';

export const SettingsDocsPage: React.FC = () => {
  const {
    settings,
    updateSettings,
    resetDemoData,
    datasetName,
    datasetSource,
    rawRows,
    allRecords,
    dateBounds,
  } = useSales();

  return (
    <div className="space-y-5">
      {/* Preferences & Application Settings */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <SectionCard
          title="Display & Calculation Preferences"
          subtitle="Theme, currency formatting, date formatting, and validation tolerances"
          className="xl:col-span-7"
          action={
            <button
              type="button"
              onClick={resetDemoData}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Demo Data
            </button>
          }
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pref-theme" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Interface Theme
              </label>
              <select
                id="pref-theme"
                value={settings.theme}
                onChange={(e) => updateSettings({ theme: e.target.value as 'light' | 'dark' })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="light">Light Enterprise</option>
                <option value="dark">Dark Slate</option>
              </select>
            </div>

            <div>
              <label htmlFor="pref-currency" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Display Currency
              </label>
              <select
                id="pref-currency"
                value={settings.currency}
                onChange={(e) => updateSettings({ currency: e.target.value as CurrencyCode })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="USD">USD ($) — Base</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="INR">INR (₹)</option>
                <option value="AUD">AUD (A$)</option>
                <option value="JPY">JPY (¥)</option>
              </select>
            </div>

            <div>
              <label htmlFor="pref-date" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                Date Display Format
              </label>
              <select
                id="pref-date"
                value={settings.dateFormat}
                onChange={(e) => updateSettings({ dateFormat: e.target.value as DateFormatOption })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="YYYY-MM-DD">ISO (YYYY-MM-DD)</option>
                <option value="MM/DD/YYYY">US (MM/DD/YYYY)</option>
                <option value="DD/MM/YYYY">International (DD/MM/YYYY)</option>
              </select>
            </div>

            <div>
              <label htmlFor="pref-tol" className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                QA Validation Tolerance (USD)
              </label>
              <select
                id="pref-tol"
                value={String(settings.validationTolerance)}
                onChange={(e) => updateSettings({ validationTolerance: Number(e.target.value) })}
                className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="0.01">±$0.01 (Strict)</option>
                <option value="0.05">±$0.05 (Standard)</option>
                <option value="0.5">±$0.50 (Relaxed)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40">
            <input
              id="pref-exclude-invalid"
              type="checkbox"
              checked={settings.excludeInvalidFromAnalytics}
              onChange={(e) => updateSettings({ excludeInvalidFromAnalytics: e.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-700"
            />
            <label htmlFor="pref-exclude-invalid" className="text-xs text-slate-700 dark:text-slate-300">
              <span className="block font-semibold text-slate-900 dark:text-slate-100">
                Exclude invalid & duplicate rows from analytical charts
              </span>
              When disabled (default), Dirty QA dataset anomalies flow into validation checks so you can inspect both failed QA rules and data quality errors side by side.
            </label>
          </div>
        </SectionCard>

        {/* Application & Dataset Info */}
        <SectionCard
          title="Application & Active Dataset Metadata"
          subtitle="System configuration and loaded dataset profile"
          className="xl:col-span-5"
        >
          <dl className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Application</dt>
              <dd className="font-semibold text-slate-900 dark:text-slate-100">SalesIQ Analytics & QA</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Active Source Mode</dt>
              <dd className="font-mono text-slate-800 dark:text-slate-200">{datasetSource}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Dataset Name</dt>
              <dd className="font-mono text-slate-800 dark:text-slate-200">{datasetName}</dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Raw Rows / Active Rows</dt>
              <dd className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {rawRows.length} / {allRecords.length}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">Date Window</dt>
              <dd className="font-mono tabular-nums text-slate-800 dark:text-slate-200">
                {dateBounds.minDate} to {dateBounds.maxDate}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-slate-500 dark:text-slate-400">SQL Engine</dt>
              <dd className="font-mono text-slate-800 dark:text-slate-200">SQLite 3 WASM (sql.js)</dd>
            </div>
          </dl>
        </SectionCard>
      </div>

      {/* Business Calculation Rules */}
      <SectionCard
        title="Transparent Business Calculation Logic"
        subtitle="Standardized formulas shared across React UI, SQL queries, Python Pandas analytics, and Power BI DAX"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 text-xs">
          <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Revenue & Profit</p>
            <p className="mt-1.5 font-mono text-[11px] text-blue-700 dark:text-blue-400">
              Revenue = Units Sold × Unit Price
            </p>
            <p className="mt-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
              Profit = Revenue − Cost
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-100">
              Profit Margin % vs Markup %
            </p>
            <p className="mt-1.5 text-slate-600 dark:text-slate-300">
              <strong>Profit Margin %</strong> (used on KPIs) = (Total Profit / Total Revenue) × 100.
              <strong> Markup %</strong> = (Total Profit / Total Cost) × 100. Zero revenue returns 0.00% safely.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Average Order Value (AOV)</p>
            <p className="mt-1.5 font-mono text-[11px] text-blue-700 dark:text-blue-400">
              AOV = Total Revenue / COUNT(DISTINCT Order ID)
            </p>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              Uses distinct Order ID denominator so multi-line or duplicate orders do not understate AOV.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Power BI Setup & DAX Documentation */}
      <SectionCard
        title="Power BI Desktop Implementation Guide & DAX Measures"
        subtitle="Recreate the SalesIQ executive dashboard in Power BI Desktop using the Star Schema CSVs exported from Reports & Exports"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 text-xs">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              1. Data Import & Star Schema Model
            </h3>
            <ol className="list-decimal space-y-1.5 pl-4 text-slate-600 dark:text-slate-300">
              <li>
                Export <code className="font-mono">fact_sales.csv</code>,{' '}
                <code className="font-mono">dim_products.csv</code>,{' '}
                <code className="font-mono">dim_countries.csv</code>, and{' '}
                <code className="font-mono">dim_date.csv</code> from the Reports & Exports page.
              </li>
              <li>
                In Power BI Desktop, use <strong>Get Data → Text/CSV</strong> to load all four tables and verify column types in Power Query Editor.
              </li>
              <li>
                Create 1-to-Many single-direction relationships:
                <ul className="mt-1 list-disc pl-4 font-mono text-[11px]">
                  <li>dim_date[DateKey] (1) → fact_sales[DateKey] (*)</li>
                  <li>dim_products[Product ID] (1) → fact_sales[Product ID] (*)</li>
                  <li>dim_countries[Country] (1) → fact_sales[Country] (*)</li>
                </ul>
              </li>
              <li>
                Mark <code className="font-mono">dim_date</code> as the official Date Table using{' '}
                <code className="font-mono">dim_date[Date]</code>.
              </li>
              <li>
                Configure visuals: 4 KPI Cards, Clustered Bar (Country Revenue & Profit), Donut (Units by Category), Area Chart (Month Revenue & Profit), Horizontal Bar (Category Profit), Treemap (Units by Category), and Slicers (Date, Country, Category).
              </li>
            </ol>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              2. Core DAX Measures (Validated Against SQL & Python)
            </h3>
            <pre className="overflow-x-auto rounded-lg bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-slate-200">{`Total Revenue = SUM(Sales[Revenue])

Total Units Sold = SUM(Sales[Units Sold])

Total Profit = SUM(Sales[Profit])

Profit Margin % =
DIVIDE([Total Profit], [Total Revenue], 0) * 100

Average Order Value =
DIVIDE([Total Revenue], DISTINCTCOUNT(Sales[Order ID]), 0)`}</pre>
          </div>
        </div>
      </SectionCard>

      {/* Repository, Python & SQL Documentation */}
      <SectionCard
        title="Python Analytics, SQL & Project Architecture"
        subtitle="Repository modules included in salesiq-analytics for backend processing and automated QA"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 text-xs">
          <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Python Pandas Module</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              Located in <code className="font-mono">python-analytics/</code>: includes{' '}
              <code className="font-mono">data_loader.py</code>,{' '}
              <code className="font-mono">sales_analysis.py</code>,{' '}
              <code className="font-mono">data_validation.py</code>,{' '}
              <code className="font-mono">dashboard_validation.py</code>, and Pytest suites.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-100">PostgreSQL & SQLite SQL</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              Located in <code className="font-mono">sql/</code>: includes{' '}
              <code className="font-mono">schema.sql</code>,{' '}
              <code className="font-mono">sample_data.sql</code>,{' '}
              <code className="font-mono">sales_analysis.sql</code>,{' '}
              <code className="font-mono">dashboard_validation.sql</code>, and{' '}
              <code className="font-mono">data_quality_checks.sql</code>.
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
            <p className="font-semibold text-slate-900 dark:text-slate-100">Automated Test Coverage</p>
            <p className="mt-1 text-slate-600 dark:text-slate-300">
              Vitest tests (<code className="font-mono">npm test</code>) validate CSV parsing, KPI formulas, aggregations, date slicing, SQLite queries, and 10-rule data quality checks.
            </p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
