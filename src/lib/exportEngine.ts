import * as XLSX from 'xlsx';
import { VALID_COUNTRIES, rawRowsToCsv } from '../data/sampleDatasets';
import {
  DataQualityReport,
  RawCsvRow,
  SalesRecord,
  ValidationRuleResult,
} from '../types/sales';
import {
  aggregateByCategory,
  aggregateByCountry,
  aggregateByMonth,
  aggregateByProduct,
  calculateKPIs,
} from './analyticsEngine';
import { isValidIsoDate, round2 } from './formatters';

export function triggerDownload(filename: string, content: BlobPart, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function objectsToCsv(rows: Record<string, string | number | boolean | null>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val: unknown) => {
    const str = val === null || val === undefined ? '' : String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  return [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(',')),
  ].join('\n');
}

export function downloadCsv(
  filename: string,
  rows: Record<string, string | number | boolean | null>[]
): void {
  const csv = objectsToCsv(rows);
  triggerDownload(filename, csv, 'text/csv;charset=utf-8;');
}

export function downloadRawCsv(filename: string, rows: RawCsvRow[]): void {
  const csv = rawRowsToCsv(rows);
  triggerDownload(filename, csv, 'text/csv;charset=utf-8;');
}

export function buildExcelWorkbook(
  records: SalesRecord[],
  validationResults: ValidationRuleResult[],
  qualityReport: DataQualityReport
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const kpis = calculateKPIs(records);
  const countries = aggregateByCountry(records);
  const categories = aggregateByCategory(records);
  const products = aggregateByProduct(records);
  const monthly = aggregateByMonth(records);

  // 1. Executive Summary
  const execRows = [
    { Metric: 'Total Revenue (USD)', Value: kpis.totalRevenue, Notes: 'SUM(Units Sold * Unit Price)' },
    { Metric: 'Total Cost (USD)', Value: kpis.totalCost, Notes: 'SUM(Cost)' },
    { Metric: 'Total Profit (USD)', Value: kpis.totalProfit, Notes: 'SUM(Revenue - Cost)' },
    { Metric: 'Profit Margin %', Value: kpis.profitPercentage, Notes: '(Total Profit / Total Revenue) * 100' },
    { Metric: 'Markup %', Value: kpis.markupPercentage, Notes: '(Total Profit / Total Cost) * 100' },
    { Metric: 'Total Units Sold', Value: kpis.totalUnitsSold, Notes: 'SUM(Units Sold)' },
    { Metric: 'Distinct Orders', Value: kpis.orderCount, Notes: 'COUNT(DISTINCT Order ID)' },
    { Metric: 'Total Line Records', Value: kpis.recordCount, Notes: 'Row count in active dataset' },
    { Metric: 'Average Order Value (USD)', Value: kpis.averageOrderValue, Notes: 'Total Revenue / Distinct Orders' },
    { Metric: 'Data Quality Score %', Value: qualityReport.qualityScore, Notes: `${qualityReport.passedRecords}/${qualityReport.totalRecordsChecked} passed` },
    { Metric: 'Validation Rules Passed', Value: `${validationResults.filter((v) => v.passed).length}/${validationResults.length}`, Notes: 'Independent SQL & Reference QA' },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(execRows), 'Executive Summary');

  // 2. Sales Transactions
  const txRows = records.map((r) => ({
    'Order ID': r.orderId,
    'Order Date': r.orderDate,
    Country: r.country,
    'Product ID': r.productId,
    'Product Name': r.productName,
    'Product Category': r.productCategory,
    'Units Sold': r.unitsSold,
    'Unit Price': r.unitPrice,
    Revenue: r.revenue,
    Cost: r.cost,
    Profit: r.profit,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(txRows), 'Sales Transactions');

  // 3. Country Analysis
  const countryRows = countries.map((c) => ({
    Country: c.country,
    Orders: c.orderCount,
    'Units Sold': c.unitsSold,
    'Revenue (USD)': c.revenue,
    'Cost (USD)': c.cost,
    'Profit (USD)': c.profit,
    'Profit Margin %': c.profitMargin,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(countryRows), 'Country Analysis');

  // 4. Category Analysis
  const catRows = categories.map((c) => ({
    Category: c.category,
    Orders: c.orderCount,
    'Units Sold': c.unitsSold,
    'Unit Share %': c.unitShare,
    'Revenue (USD)': c.revenue,
    'Cost (USD)': c.cost,
    'Profit (USD)': c.profit,
    'Profit Margin %': c.profitMargin,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(catRows), 'Category Analysis');

  // 5. Product Analysis
  const prodRows = products.map((p) => ({
    'Product ID': p.productId,
    'Product Name': p.productName,
    Category: p.category,
    Orders: p.orderCount,
    'Units Sold': p.unitsSold,
    'Revenue (USD)': p.revenue,
    'Cost (USD)': p.cost,
    'Profit (USD)': p.profit,
    'Profit Margin %': p.profitMargin,
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prodRows), 'Product Analysis');

  // 6. Monthly Trends
  const monthRows = monthly.map((m) => ({
    'Year-Month': m.yearMonth,
    Year: m.year,
    Month: m.month,
    Orders: m.orderCount,
    'Units Sold': m.unitsSold,
    'Revenue (USD)': m.revenue,
    'Profit (USD)': m.profit,
    'MoM Growth %': m.momGrowthPct ?? '',
  }));
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(monthRows), 'Monthly Trends');

  // 7. Dashboard Validation
  const valRows = validationResults.map((v) => ({
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
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(valRows), 'Dashboard Validation');

  // 8. Data Quality Issues
  const dqRows =
    qualityReport.issues.length > 0
      ? qualityReport.issues.map((iss) => ({
          'Issue ID': iss.issueId,
          'Row #': iss.rowIndex,
          'Order ID': iss.orderId,
          'Issue Category': iss.category,
          Severity: iss.severity,
          Field: iss.field,
          'Observed Value': iss.observedValue,
          'Expected Rule': iss.expectedRule,
        }))
      : [
          {
            'Issue ID': 'NONE',
            'Row #': 0,
            'Order ID': '-',
            'Issue Category': 'No anomalies detected',
            Severity: 'Info',
            Field: '-',
            'Observed Value': '-',
            'Expected Rule': '100% dataset compliance',
          },
        ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dqRows), 'Data Quality Issues');
  return wb;
}

export function exportFullExcelWorkbook(
  records: SalesRecord[],
  validationResults: ValidationRuleResult[],
  qualityReport: DataQualityReport,
  filename = 'SalesIQ_Analytics_Workbook.xlsx'
): void {
  const wb = buildExcelWorkbook(records, validationResults, qualityReport);
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  triggerDownload(
    filename,
    out,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
}

export function buildPowerBiStarSchemaCSVs(records: SalesRecord[]): {
  factSales: Record<string, string | number>[];
  dimProducts: Record<string, string | number>[];
  dimCountries: Record<string, string | number>[];
  dimDate: Record<string, string | number>[];
} {
  const countryMeta = new Map(VALID_COUNTRIES.map((c) => [c.name, c]));
  const productMap = new Map<string, { id: string; name: string; category: string; price: number }>();
  const countrySet = new Set<string>();
  const dateSet = new Set<string>();

  const factSales = records.map((r) => {
    countrySet.add(r.country);
    if (!productMap.has(r.productId)) {
      productMap.set(r.productId, {
        id: r.productId,
        name: r.productName,
        category: r.productCategory,
        price: r.unitPrice,
      });
    }
    if (isValidIsoDate(r.orderDate)) {
      dateSet.add(r.orderDate);
    }
    return {
      'Order ID': r.orderId,
      DateKey: isValidIsoDate(r.orderDate) ? r.orderDate.replace(/-/g, '') : '',
      'Order Date': r.orderDate,
      Country: r.country,
      'Product ID': r.productId,
      'Units Sold': r.unitsSold,
      'Unit Price': round2(r.unitPrice),
      Revenue: round2(r.revenue),
      Cost: round2(r.cost),
      Profit: round2(r.profit),
    };
  });

  const dimProducts = Array.from(productMap.values()).map((p) => ({
    'Product ID': p.id,
    'Product Name': p.name,
    'Product Category': p.category,
    'Standard Unit Price': round2(p.price),
  }));

  const dimCountries = Array.from(countrySet).map((c, idx) => {
    const m = countryMeta.get(c);
    return {
      CountryID: idx + 1,
      Country: c,
      Region: m?.region ?? 'Other',
      Currency: m?.currency ?? 'USD',
    };
  });

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dimDate = Array.from(dateSet)
    .sort()
    .map((d) => {
      const year = Number(d.slice(0, 4));
      const month = Number(d.slice(5, 7));
      const quarter = Math.ceil(month / 3);
      return {
        DateKey: d.replace(/-/g, ''),
        Date: d,
        Year: year,
        Quarter: `Q${quarter}`,
        MonthNumber: month,
        MonthName: monthNames[month - 1],
        YearMonth: d.slice(0, 7),
      };
    });

  return { factSales, dimProducts, dimCountries, dimDate };
}
