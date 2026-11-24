import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, ShieldCheck } from 'lucide-react';
import { KpiCard, SectionCard, StatusLabel } from '../components/ui/DataComponents';
import { useSales } from '../context/SalesContext';
import { downloadCsv, downloadRawCsv } from '../lib/exportEngine';
import { formatNumber, formatPercent } from '../lib/formatters';

export const DataQualityPage: React.FC = () => {
  const {
    qualityReport,
    rawRows,
    datasetSource,
    datasetName,
    switchSampleDataset,
    settings,
  } = useSales();

  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const isDark = settings.theme === 'dark';
  const gridStroke = isDark ? '#1E293B' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';

  const filteredIssues = useMemo(() => {
    const q = search.trim().toLowerCase();
    return qualityReport.issues.filter((iss) => {
      if (categoryFilter && iss.category !== categoryFilter) return false;
      if (q) {
        const hit =
          iss.orderId.toLowerCase().includes(q) ||
          iss.category.toLowerCase().includes(q) ||
          iss.field.toLowerCase().includes(q) ||
          iss.observedValue.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [qualityReport.issues, categoryFilter, search]);

  const handleDownloadFailedRows = () => {
    const failedIdxSet = new Set(qualityReport.failedRowIndices);
    const failedRaw = rawRows.filter((_, idx) => failedIdxSet.has(idx + 1));
    downloadRawCsv(`failed_records_${datasetName}`, failedRaw);
  };

  const handleDownloadIssueLog = () => {
    const rows = qualityReport.issues.map((iss) => ({
      'Issue ID': iss.issueId,
      'Row #': iss.rowIndex,
      'Order ID': iss.orderId,
      'Issue Category': iss.category,
      Severity: iss.severity,
      Field: iss.field,
      'Observed Value': iss.observedValue,
      'Expected Rule': iss.expectedRule,
    }));
    downloadCsv(`data_quality_issues_${datasetName}`, rows);
  };

  return (
    <div className="space-y-5">
      {/* Banner prompt to inspect Dirty dataset if currently on Clean */}
      {datasetSource === 'clean' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs shadow-xs dark:border-slate-800 dark:bg-slate-900">
          <p className="text-slate-600 dark:text-slate-300">
            Currently monitoring <strong className="text-slate-900 dark:text-white">{datasetName}</strong> (100% clean baseline). Switch to the corrupted Dirty QA dataset to inspect all 10 anomaly detection rules in action.
          </p>
          <button
            type="button"
            onClick={() => switchSampleDataset('dirty')}
            className="h-9 rounded-lg bg-amber-600 px-3.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors whitespace-nowrap"
          >
            Load Dirty QA Dataset
          </button>
        </div>
      )}

      {/* 4 Quality KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Records Checked"
          value={formatNumber(qualityReport.totalRecordsChecked)}
          detail={`Active dataset: ${datasetName}`}
        />
        <KpiCard
          label="Passed Records"
          value={formatNumber(qualityReport.passedRecords)}
          detail="Zero rule violations"
          tone="positive"
        />
        <KpiCard
          label="Failed Records"
          value={formatNumber(qualityReport.failedRecords)}
          detail={`${formatNumber(qualityReport.totalIssuesFound)} total rule violations`}
          tone={qualityReport.failedRecords === 0 ? 'positive' : 'danger'}
        />
        <KpiCard
          label="Data Quality Score"
          value={formatPercent(qualityReport.qualityScore)}
          detail="Passed Records / Total Checked"
          tone={
            qualityReport.qualityScore >= 98
              ? 'positive'
              : qualityReport.qualityScore >= 85
              ? 'warning'
              : 'danger'
          }
        />
      </div>

      {/* Category Breakdown Chart + Table */}
      {qualityReport.categoryBreakdown.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <SectionCard
            title="Error Categories Distribution"
            subtitle="Violation counts across all 10 automated audit rules"
            className="xl:col-span-6 min-w-0"
          >
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={qualityReport.categoryBreakdown}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    width={165}
                    tick={{ fill: tickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
                      borderColor: isDark ? '#334155' : '#E2E8F0',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="count" name="Violations" fill="#DC2626" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Anomaly Category Summary"
            subtitle="Click a category row to filter row-level diagnostics below"
            className="xl:col-span-6 min-w-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pr-2 font-medium">Error Category</th>
                    <th className="py-2.5 px-2 font-medium">Severity</th>
                    <th className="py-2.5 px-2 text-right font-medium">Count</th>
                    <th className="py-2.5 pl-2 text-right font-medium">% of Rows</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {qualityReport.categoryBreakdown.map((cat) => (
                    <tr
                      key={cat.category}
                      onClick={() =>
                        setCategoryFilter((prev) => (prev === cat.category ? '' : cat.category))
                      }
                      className={`cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 ${
                        categoryFilter === cat.category ? 'bg-blue-50/60 dark:bg-blue-950/30' : ''
                      }`}
                    >
                      <td className="py-2.5 pr-2 font-medium text-slate-900 dark:text-slate-100">
                        {cat.category}
                      </td>
                      <td className="py-2.5 px-2">
                        <StatusLabel
                          status={cat.severity === 'Critical' ? 'fail' : 'warning'}
                          label={cat.severity}
                        />
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-slate-200">
                        {formatNumber(cat.count)}
                      </td>
                      <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                        {formatPercent(cat.percentage)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </div>
      ) : (
        <SectionCard
          title="Dataset Quality Verification Passed"
          subtitle="All 10 automated data quality checks passed with zero anomalies"
        >
          <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-200">
            <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" />
            <div>
              <p className="font-semibold">100.00% Clean Compliance</p>
              <p className="mt-0.5 opacity-90">
                No missing values, duplicate Order IDs, invalid dates, negative units, arithmetic mismatches, or outliers were found across {formatNumber(qualityReport.totalRecordsChecked)} rows.
              </p>
            </div>
          </div>
        </SectionCard>
      )}

      {/* Row-Level Error Details Table */}
      <SectionCard
        title="Row-Level Anomaly Diagnostics"
        subtitle={`Showing ${formatNumber(filteredIssues.length)} issue(s) across ${formatNumber(qualityReport.failedRecords)} failed row(s)`}
        action={
          qualityReport.failedRecords > 0 ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadIssueLog}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                Download Issue Log CSV
              </button>
              <button
                type="button"
                onClick={handleDownloadFailedRows}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-red-700 px-3.5 text-xs font-medium text-white hover:bg-red-800 transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                Download Failed Records ({qualityReport.failedRecords})
              </button>
            </div>
          ) : undefined
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Order ID, field, observed value..."
            aria-label="Search data quality issues"
            className="h-10 min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by error category"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Error Categories</option>
            {qualityReport.categoryBreakdown.map((c) => (
              <option key={c.category} value={c.category}>
                {c.category} ({c.count})
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2.5 pr-2 font-medium">Issue ID</th>
                <th className="py-2.5 px-2 text-right font-medium">Row #</th>
                <th className="py-2.5 px-2 font-medium">Order ID</th>
                <th className="py-2.5 px-2 font-medium">Category</th>
                <th className="py-2.5 px-2 font-medium">Severity</th>
                <th className="py-2.5 px-2 font-medium">Field</th>
                <th className="py-2.5 px-2 font-medium">Observed</th>
                <th className="py-2.5 pl-2 font-medium">Expected Rule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {filteredIssues.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 dark:text-slate-400">
                    No row-level errors match the active filter.
                  </td>
                </tr>
              ) : (
                filteredIssues.slice(0, 150).map((iss) => (
                  <tr key={iss.issueId} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="py-2.5 pr-2 font-mono text-slate-600 dark:text-slate-400">{iss.issueId}</td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {iss.rowIndex}
                    </td>
                    <td className="py-2.5 px-2 font-mono font-medium text-slate-900 dark:text-slate-100">
                      {iss.orderId}
                    </td>
                    <td className="py-2.5 px-2 font-medium text-slate-800 dark:text-slate-200">{iss.category}</td>
                    <td className="py-2.5 px-2">
                      <StatusLabel
                        status={iss.severity === 'Critical' ? 'fail' : 'warning'}
                        label={iss.severity}
                      />
                    </td>
                    <td className="py-2.5 px-2 font-mono text-slate-700 dark:text-slate-300">{iss.field}</td>
                    <td className="py-2.5 px-2 font-mono text-red-700 dark:text-red-400">{iss.observedValue}</td>
                    <td className="py-2.5 pl-2 text-slate-600 dark:text-slate-400">{iss.expectedRule}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};
