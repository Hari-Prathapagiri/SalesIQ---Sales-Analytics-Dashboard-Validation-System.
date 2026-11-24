import React, { useEffect, useState } from 'react';
import { Download, Play } from 'lucide-react';
import { SectionCard, StatusLabel } from '../components/ui/DataComponents';
import { useSales } from '../context/SalesContext';
import { downloadCsv } from '../lib/exportEngine';
import { formatCurrency, formatNumber, formatPercent, round2 } from '../lib/formatters';
import {
  PREDEFINED_SQL_QUERIES,
  SQL_SCHEMA_DDL,
  executeSafeSqlQuery,
} from '../lib/sqlEngine';
import { SqlExecutionResult, SqlQueryDefinition } from '../types/sales';

export const SqlAnalysisPage: React.FC = () => {
  const { sqlDb, sqlReady, kpis, allRecords, settings } = useSales();
  const [selectedQuery, setSelectedQuery] = useState<SqlQueryDefinition>(
    PREDEFINED_SQL_QUERIES[0]
  );
  const [sqlText, setSqlText] = useState<string>(PREDEFINED_SQL_QUERIES[0].sql);
  const [result, setResult] = useState<SqlExecutionResult | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  const runQuery = (sqlToRun: string) => {
    if (!sqlDb) return;
    const res = executeSafeSqlQuery(sqlDb, sqlToRun);
    setResult(res);
  };

  useEffect(() => {
    if (sqlReady && sqlDb) {
      runQuery(sqlText);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sqlReady, sqlDb]);

  const handleSelectPredefined = (q: SqlQueryDefinition) => {
    setSelectedQuery(q);
    setSqlText(q.sql);
    if (sqlDb) {
      runQuery(q.sql);
    }
  };

  const handleExportResults = () => {
    if (!result || result.columns.length === 0) return;
    const rows = result.rows.map((r) => {
      const obj: Record<string, string | number | null> = {};
      result.columns.forEach((col, i) => {
        obj[col] = r[i];
      });
      return obj;
    });
    downloadCsv(`${selectedQuery.id}_results.csv`, rows);
  };

  // Compare SQL KPI result with Dashboard KPI if matching query is active
  const renderKpiComparison = () => {
    if (!result || result.error || result.rows.length === 0 || !selectedQuery.dashboardKpiKey) {
      return null;
    }

    const key = selectedQuery.dashboardKpiKey;
    const firstRow = result.rows[0];
    let sqlVal = 0;
    let dashVal = 0;
    let label = '';
    let formatter = (v: number) => formatCurrency(v, settings.currency);

    if (key === 'totalRevenue') {
      label = 'Total Revenue';
      sqlVal = Number(firstRow[0] ?? 0);
      dashVal = kpis.totalRevenue;
    } else if (key === 'totalProfit') {
      label = 'Total Profit';
      sqlVal = Number(firstRow[0] ?? 0);
      dashVal = kpis.totalProfit;
    } else if (key === 'totalUnitsSold') {
      label = 'Total Units Sold';
      sqlVal = Number(firstRow[0] ?? 0);
      dashVal = kpis.totalUnitsSold;
      formatter = (v: number) => formatNumber(v);
    } else if (key === 'averageOrderValue') {
      label = 'Average Order Value';
      sqlVal = Number(firstRow[2] ?? 0);
      dashVal = kpis.averageOrderValue;
    } else if (key === 'profitPercentage') {
      label = 'Profit Margin %';
      sqlVal = Number(firstRow[2] ?? 0);
      dashVal = kpis.profitPercentage;
      formatter = (v: number) => formatPercent(v);
    }

    const diff = round2(Math.abs(sqlVal - dashVal));
    const matched = diff <= settings.validationTolerance;

    return (
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-800/50">
        <div>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            SQL vs Dashboard KPI Check ({label})
          </p>
          <p className="mt-0.5 text-slate-500 dark:text-slate-400">
            Comparing query output against full-dataset dashboard calculation ({allRecords.length} rows)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <div>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">SQL Result</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatter(sqlVal)}
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">Dashboard KPI</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {formatter(dashVal)}
            </span>
          </div>
          <div>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">Delta</span>
            <span className="font-mono font-semibold tabular-nums text-slate-700 dark:text-slate-300">
              {formatter(diff)}
            </span>
          </div>
          <StatusLabel status={matched ? 'pass' : 'fail'} label={matched ? 'MATCH' : 'DRIFT'} />
        </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
      {/* Left Column: Predefined Queries & Schema */}
      <div className="space-y-5 lg:col-span-4">
        <SectionCard
          title="Predefined Analytical Queries"
          subtitle="Safe read-only SQL queries running against live relational tables"
          action={
            <button
              type="button"
              onClick={() => setShowSchema((s) => !s)}
              className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {showSchema ? 'Hide Schema' : 'View Schema'}
            </button>
          }
        >
          <div className="space-y-1.5 max-h-[540px] overflow-y-auto pr-1">
            {PREDEFINED_SQL_QUERIES.map((q) => {
              const active = selectedQuery.id === q.id;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => handleSelectPredefined(q)}
                  className={`w-full rounded-lg border px-3 py-2.5 text-left transition-colors ${
                    active
                      ? 'border-blue-700 bg-blue-50/80 text-blue-950 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-100'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold">{q.title}</span>
                    <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                      {q.category}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">
                    {q.description}
                  </p>
                </button>
              );
            })}
          </div>
        </SectionCard>

        {showSchema && (
          <SectionCard
            title="Relational Database Schema"
            subtitle="PostgreSQL-compatible tables: sales, products, countries, dim_date"
          >
            <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] leading-relaxed text-slate-200">
              {SQL_SCHEMA_DDL.trim()}
            </pre>
          </SectionCard>
        )}
      </div>

      {/* Right Column: SQL Console + Results Table */}
      <div className="space-y-5 lg:col-span-8 min-w-0">
        <SectionCard
          title="Safe SQL Query Console"
          subtitle="Read-only SELECT / WITH queries permitted; destructive DML/DDL statements are blocked"
          action={
            <button
              type="button"
              disabled={!sqlReady}
              onClick={() => runQuery(sqlText)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-4 text-xs font-medium text-white hover:bg-blue-800 disabled:opacity-50 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              Run SQL Query
            </button>
          }
        >
          <textarea
            value={sqlText}
            onChange={(e) => setSqlText(e.target.value)}
            rows={7}
            spellCheck={false}
            aria-label="SQL query editor"
            className="w-full rounded-lg border border-slate-300 bg-slate-950 p-3.5 font-mono text-xs leading-relaxed text-emerald-300 focus:border-blue-500 focus:outline-none dark:border-slate-700"
          />
          {!sqlReady && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Initializing in-memory relational SQL engine...
            </p>
          )}
        </SectionCard>

        <SectionCard
          title="Query Execution Output"
          subtitle={
            result && !result.error
              ? `${result.rowCount} row(s) returned in ${result.executionTimeMs} ms`
              : 'Results and KPI comparison'
          }
          action={
            result && result.rows.length > 0 ? (
              <button
                type="button"
                onClick={handleExportResults}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            ) : undefined
          }
        >
          {renderKpiComparison()}

          {result?.error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
              {result.error}
            </div>
          ) : result && result.columns.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    {result.columns.map((col) => (
                      <th key={col} className="py-2.5 px-2.5 font-mono font-medium">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {result.rows.slice(0, 100).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      {row.map((cell, cIdx) => (
                        <td
                          key={cIdx}
                          className="py-2 px-2.5 font-mono tabular-nums text-slate-800 dark:text-slate-200"
                        >
                          {cell === null ? 'NULL' : String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.rows.length > 100 && (
                <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                  Showing first 100 rows of {result.rows.length}. Export CSV to download all rows.
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Query executed with 0 rows returned.
            </p>
          )}
        </SectionCard>
      </div>
    </div>
  );
};
