import React, { useMemo } from 'react';
import { Download, FileSpreadsheet, Layers } from 'lucide-react';
import { KpiCard, SectionCard } from '../components/ui/DataComponents';
import { useSales } from '../context/SalesContext';
import {
  buildPowerBiStarSchemaCSVs,
  downloadCsv,
  exportFullExcelWorkbook,
} from '../lib/exportEngine';
import { formatCurrency, formatNumber, formatPercent } from '../lib/formatters';

export const ReportsPage: React.FC = () => {
  const {
    allRecords,
    kpis,
    countryMetrics,
    categoryMetrics,
    productMetrics,
    monthlyMetrics,
    validationResults,
    qualityReport,
    datasetName,
    settings,
  } = useSales();

  const handleExcelExport = () => {
    exportFullExcelWorkbook(
      allRecords,
      validationResults,
      qualityReport,
      `SalesIQ_Workbook_${datasetName.replace(/\.csv$/i, '')}.xlsx`
    );
  };

  const starSchema = useMemo(() => buildPowerBiStarSchemaCSVs(allRecords), [allRecords]);

  const individualReports = [
    {
      id: 'exec',
      title: 'Executive Sales Summary',
      description: 'Top-level KPIs, AOV, profit margin %, quality score, and QA pass rate.',
      rowsCount: 11,
      onDownload: () =>
        downloadCsv('salesiq_executive_summary.csv', [
          { Metric: 'Total Revenue (USD)', Value: kpis.totalRevenue },
          { Metric: 'Total Cost (USD)', Value: kpis.totalCost },
          { Metric: 'Total Profit (USD)', Value: kpis.totalProfit },
          { Metric: 'Profit Margin %', Value: kpis.profitPercentage },
          { Metric: 'Total Units Sold', Value: kpis.totalUnitsSold },
          { Metric: 'Distinct Orders', Value: kpis.orderCount },
          { Metric: 'Average Order Value (USD)', Value: kpis.averageOrderValue },
          { Metric: 'Data Quality Score %', Value: qualityReport.qualityScore },
          { Metric: 'Validation Passed', Value: `${validationResults.filter((v) => v.passed).length}/${validationResults.length}` },
        ]),
    },
    {
      id: 'revenue',
      title: 'Revenue Report (SKU & Order Detail)',
      description: 'Transaction-level units, unit price, and gross revenue lines.',
      rowsCount: allRecords.length,
      onDownload: () =>
        downloadCsv(
          'salesiq_revenue_report.csv',
          allRecords.map((r) => ({
            'Order ID': r.orderId,
            'Order Date': r.orderDate,
            Country: r.country,
            'Product Name': r.productName,
            Category: r.productCategory,
            'Units Sold': r.unitsSold,
            'Unit Price': r.unitPrice,
            Revenue: r.revenue,
          }))
        ),
    },
    {
      id: 'profit',
      title: 'Profitability Report',
      description: 'Product-level revenue, COGS, net profit, and profit margin %.',
      rowsCount: productMetrics.length,
      onDownload: () =>
        downloadCsv(
          'salesiq_profit_report.csv',
          productMetrics.map((p) => ({
            'Product ID': p.productId,
            'Product Name': p.productName,
            Category: p.category,
            'Units Sold': p.unitsSold,
            Revenue: p.revenue,
            Cost: p.cost,
            Profit: p.profit,
            'Profit Margin %': p.profitMargin,
          }))
        ),
    },
    {
      id: 'country',
      title: 'Country Performance Report',
      description: 'Orders, unit volume, revenue, profit, and margin across regions.',
      rowsCount: countryMetrics.length,
      onDownload: () =>
        downloadCsv(
          'salesiq_country_performance.csv',
          countryMetrics.map((c) => ({
            Country: c.country,
            Orders: c.orderCount,
            'Units Sold': c.unitsSold,
            Revenue: c.revenue,
            Cost: c.cost,
            Profit: c.profit,
            'Profit Margin %': c.profitMargin,
          }))
        ),
    },
    {
      id: 'category',
      title: 'Category Performance Report',
      description: 'Category unit share, gross revenue, net profit, and margin %.',
      rowsCount: categoryMetrics.length,
      onDownload: () =>
        downloadCsv(
          'salesiq_category_performance.csv',
          categoryMetrics.map((c) => ({
            Category: c.category,
            Orders: c.orderCount,
            'Units Sold': c.unitsSold,
            'Unit Share %': c.unitShare,
            Revenue: c.revenue,
            Profit: c.profit,
            'Profit Margin %': c.profitMargin,
          }))
        ),
    },
    {
      id: 'monthly',
      title: 'Monthly Trend Report',
      description: 'Chronological monthly revenue, profit, units, and MoM growth %.',
      rowsCount: monthlyMetrics.length,
      onDownload: () =>
        downloadCsv(
          'salesiq_monthly_trends.csv',
          monthlyMetrics.map((m) => ({
            'Year-Month': m.yearMonth,
            Orders: m.orderCount,
            'Units Sold': m.unitsSold,
            Revenue: m.revenue,
            Profit: m.profit,
            'MoM Growth %': m.momGrowthPct ?? '',
          }))
        ),
    },
    {
      id: 'validation',
      title: 'Dashboard Validation QA Report',
      description: 'All 12 source-to-dashboard reconciliation rules with expected vs actual.',
      rowsCount: validationResults.length,
      onDownload: () =>
        downloadCsv(
          'salesiq_dashboard_validation.csv',
          validationResults.map((v) => ({
            'Validation ID': v.id,
            Rule: v.ruleName,
            Category: v.category,
            Expected: v.expectedDisplay,
            Actual: v.actualDisplay,
            Difference: v.differenceDisplay,
            Tolerance: v.toleranceDisplay,
            Status: v.passed ? 'PASS' : 'FAIL',
          }))
        ),
    },
    {
      id: 'quality',
      title: 'Data Quality Audit Report',
      description: 'Row-level anomalies detected across missing, duplicate, date, and math checks.',
      rowsCount: qualityReport.issues.length,
      onDownload: () =>
        downloadCsv(
          'salesiq_data_quality_report.csv',
          qualityReport.issues.length > 0
            ? qualityReport.issues.map((iss) => ({
                'Issue ID': iss.issueId,
                'Row #': iss.rowIndex,
                'Order ID': iss.orderId,
                Category: iss.category,
                Severity: iss.severity,
                Field: iss.field,
                'Observed Value': iss.observedValue,
                'Expected Rule': iss.expectedRule,
              }))
            : [{ Status: '100% Clean', Issues: 0, Records: qualityReport.totalRecordsChecked }]
        ),
    },
  ];

  return (
    <div className="space-y-5">
      {/* Live Export Snapshot */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Active Export Revenue"
          value={formatCurrency(kpis.totalRevenue, settings.currency)}
          detail={`${formatNumber(allRecords.length)} rows from ${datasetName}`}
        />
        <KpiCard
          label="Workbook Worksheets"
          value="8 Sheets"
          detail="Executive, Sales, Country, Category, Product, Monthly, QA, Quality"
        />
        <KpiCard
          label="QA Suite Status"
          value={`${validationResults.filter((v) => v.passed).length}/${validationResults.length} Passed`}
          detail="Included in Workbook Sheet 7"
          tone={validationResults.every((v) => v.passed) ? 'positive' : 'danger'}
        />
        <KpiCard
          label="Data Quality Score"
          value={formatPercent(qualityReport.qualityScore)}
          detail="Included in Workbook Sheet 8"
        />
      </div>

      {/* Primary Excel XLSX Workbook Export */}
      <SectionCard
        title="Complete 8-Sheet Excel Workbook (.xlsx)"
        subtitle="Generates a live multi-sheet Excel workbook directly from the active dataset"
        action={
          <button
            type="button"
            onClick={handleExcelExport}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-700 px-4 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Download 8-Sheet Excel (.xlsx)
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs text-slate-600 dark:text-slate-300">
          {[
            '1. Executive Summary',
            '2. Sales Transactions',
            '3. Country Analysis',
            '4. Category Analysis',
            '5. Product Analysis',
            '6. Monthly Trends',
            '7. Dashboard Validation',
            '8. Data Quality Issues',
          ].map((sheet) => (
            <div
              key={sheet}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium dark:border-slate-800 dark:bg-slate-800/50"
            >
              {sheet}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Individual CSV Reports */}
      <SectionCard
        title="Individual Analytical & Audit CSV Reports"
        subtitle="Download focused CSV extracts for downstream BI or QA audit sign-off"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {individualReports.map((rep) => (
            <div
              key={rep.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30"
            >
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {rep.title}
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {rep.description}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                  {formatNumber(rep.rowsCount)} rows
                </span>
                <button
                  type="button"
                  onClick={rep.onDownload}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      {/* Power BI Star Schema Ready Datasets */}
      <SectionCard
        title="Power BI-Ready Star Schema CSV Datasets"
        subtitle="Normalized fact and dimension tables ready for Power BI Desktop import (no simulated .pbix file; see Settings & Docs for full DAX & modeling guide)"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              name: 'fact_sales.csv',
              desc: 'Fact table with DateKey, Country, Product ID, Units, Revenue, Cost, Profit',
              count: starSchema.factSales.length,
              action: () => downloadCsv('fact_sales.csv', starSchema.factSales),
            },
            {
              name: 'dim_products.csv',
              desc: 'Product dimension (Product ID, Name, Category, Standard Price)',
              count: starSchema.dimProducts.length,
              action: () => downloadCsv('dim_products.csv', starSchema.dimProducts),
            },
            {
              name: 'dim_countries.csv',
              desc: 'Country & Region dimension (CountryID, Country, Region, Currency)',
              count: starSchema.dimCountries.length,
              action: () => downloadCsv('dim_countries.csv', starSchema.dimCountries),
            },
            {
              name: 'dim_date.csv',
              desc: 'Calendar Date dimension (DateKey, Date, Year, Quarter, Month)',
              count: starSchema.dimDate.length,
              action: () => downloadCsv('dim_date.csv', starSchema.dimDate),
            },
          ].map((tbl) => (
            <div
              key={tbl.name}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
            >
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="h-4 w-4 text-blue-700 dark:text-blue-400" />
                  <h3 className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {tbl.name}
                  </h3>
                </div>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{tbl.desc}</p>
              </div>
              <div className="mt-4 flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
                <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                  {formatNumber(tbl.count)} rows
                </span>
                <button
                  type="button"
                  onClick={tbl.action}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-700 px-3 text-xs font-medium text-white hover:bg-blue-800 transition-colors"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
};
