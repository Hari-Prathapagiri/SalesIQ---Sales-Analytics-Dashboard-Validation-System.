import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Download } from 'lucide-react';
import { KpiCard, SectionCard, StatusLabel } from '../components/ui/DataComponents';
import { useSales } from '../context/SalesContext';
import { downloadCsv } from '../lib/exportEngine';
import { formatCurrency, formatNumber } from '../lib/formatters';

export const DashboardValidationPage: React.FC = () => {
  const { validationResults, sqlReady, datasetName, allRecords, settings } = useSales();
  const [expandedRuleId, setExpandedRuleId] = useState<string | null>('VAL-05');

  const totalRules = validationResults.length;
  const passedCount = validationResults.filter((r) => r.passed).length;
  const failedCount = totalRules - passedCount;
  const passRate = totalRules === 0 ? 100 : (passedCount / totalRules) * 100;

  const handleExportValidation = () => {
    const rows = validationResults.map((v) => ({
      'Validation ID': v.id,
      'Validation Rule': v.ruleName,
      Category: v.category,
      Methodology: v.methodology,
      'Expected Result': v.expectedDisplay,
      'Actual Dashboard Result': v.actualDisplay,
      Difference: v.differenceDisplay,
      Tolerance: v.toleranceDisplay,
      Status: v.passed ? 'PASS' : 'FAIL',
    }));
    downloadCsv(`dashboard_validation_${datasetName}`, rows);
  };

  return (
    <div className="space-y-5">
      {/* QA Validation KPI Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Validation Rules Executed"
          value={formatNumber(totalRules)}
          detail={`${formatNumber(allRecords.length)} rows audited · ${sqlReady ? 'SQLite SQL engine active' : 'Fixed-point audit active'}`}
        />
        <KpiCard
          label="Passed Checks"
          value={formatNumber(passedCount)}
          detail={`${passRate.toFixed(1)}% suite pass rate`}
          tone="positive"
        />
        <KpiCard
          label="Failed Checks"
          value={formatNumber(failedCount)}
          detail={failedCount === 0 ? 'Zero source-to-dashboard drift' : 'Integrity anomalies detected'}
          tone={failedCount === 0 ? 'positive' : 'danger'}
        />
        <KpiCard
          label="Numeric Tolerance"
          value={`±$${settings.validationTolerance.toFixed(2)}`}
          detail="Configurable in Settings & Docs"
        />
      </div>

      {/* Independent Architecture Note */}
      <SectionCard
        title="Automated Source-to-Dashboard QA Reconciliation"
        subtitle="Compares the React UI analytical engine against independent SQLite relational SQL queries and fixed-point cent-precision verification"
        action={
          <button
            type="button"
            onClick={handleExportValidation}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 text-xs font-medium text-white hover:bg-blue-800 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            Export QA Report CSV
          </button>
        }
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2.5 pr-2 font-medium">ID</th>
                <th className="py-2.5 px-2 font-medium">Validation Rule</th>
                <th className="py-2.5 px-2 font-medium">Independent Expected</th>
                <th className="py-2.5 px-2 font-medium">Actual Dashboard</th>
                <th className="py-2.5 px-2 font-medium">Difference</th>
                <th className="py-2.5 px-2 font-medium">Tolerance</th>
                <th className="py-2.5 pl-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {validationResults.map((rule) => {
                const hasDetails = rule.details && rule.details.length > 0;
                const isExpanded = expandedRuleId === rule.id;

                return (
                  <React.Fragment key={rule.id}>
                    <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-3 pr-2 font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {hasDetails ? (
                          <button
                            type="button"
                            onClick={() => setExpandedRuleId(isExpanded ? null : rule.id)}
                            className="inline-flex items-center gap-1 hover:text-blue-700 dark:hover:text-blue-400"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5" />
                            )}
                            {rule.id}
                          </button>
                        ) : (
                          <span className="pl-4">{rule.id}</span>
                        )}
                      </td>
                      <td className="py-3 px-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">{rule.ruleName}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {rule.category} · {rule.methodology}
                        </p>
                      </td>
                      <td className="py-3 px-2 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {rule.expectedDisplay}
                      </td>
                      <td className="py-3 px-2 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                        {rule.actualDisplay}
                      </td>
                      <td className="py-3 px-2 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {rule.differenceDisplay}
                      </td>
                      <td className="py-3 px-2 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {rule.toleranceDisplay}
                      </td>
                      <td className="py-3 pl-2 text-right">
                        <StatusLabel
                          status={rule.passed ? 'pass' : 'fail'}
                          label={rule.passed ? 'PASS' : 'FAIL'}
                        />
                      </td>
                    </tr>

                    {hasDetails && isExpanded && (
                      <tr className="bg-slate-50/80 dark:bg-slate-800/30">
                        <td colSpan={7} className="px-6 py-4">
                          <p className="mb-2 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                            Dimension-Level Reconciliation Drill-Down ({rule.details!.length} buckets)
                          </p>
                          <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                            <table className="w-full text-left text-[11px]">
                              <thead>
                                <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                                  <th className="py-2 px-3 font-medium">Dimension Key</th>
                                  <th className="py-2 px-3 text-right font-medium">Expected (SQL)</th>
                                  <th className="py-2 px-3 text-right font-medium">Actual (UI)</th>
                                  <th className="py-2 px-3 text-right font-medium">Difference</th>
                                  <th className="py-2 px-3 text-right font-medium">Status</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {rule.details!.map((d) => (
                                  <tr key={d.dimensionKey}>
                                    <td className="py-1.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                                      {d.dimensionKey}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                      {formatCurrency(d.expectedValue)}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                                      {formatCurrency(d.actualValue)}
                                    </td>
                                    <td className="py-1.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                                      {formatCurrency(d.difference)}
                                    </td>
                                    <td className="py-1.5 px-3 text-right">
                                      <StatusLabel
                                        status={d.passed ? 'pass' : 'fail'}
                                        label={d.passed ? 'PASS' : 'FAIL'}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
    </div>
  );
};
