import { VALID_CATEGORIES, VALID_COUNTRIES } from '../data/sampleDatasets';
import {
  ColumnMapping,
  DataQualityCategorySummary,
  DataQualityIssue,
  DataQualityReport,
  QualityIssueCategory,
  RawCsvRow,
} from '../types/sales';
import { isValidIsoDate, round2 } from './formatters';

const VALID_COUNTRY_SET = new Set(VALID_COUNTRIES.map((c) => c.name.toLowerCase()));
const VALID_CATEGORY_SET = new Set(VALID_CATEGORIES.map((c) => c.toLowerCase()));

function parseNumStrict(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.toUpperCase() === 'NULL' || trimmed.toUpperCase() === 'N/A') {
    return null;
  }
  const num = Number(trimmed.replace(/[$,]/g, ''));
  return Number.isFinite(num) ? num : null;
}

function computeIQRUpperBound(values: number[]): number {
  if (values.length < 8) return 100000;
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = sorted[Math.floor(sorted.length * 0.25)];
  const q3 = sorted[Math.floor(sorted.length * 0.75)];
  const iqr = q3 - q1;
  return Math.max(q3 + 3.5 * iqr, 60000);
}

export function runDataQualityAudit(
  rawRows: RawCsvRow[],
  mapping: ColumnMapping,
  tolerance = 0.02
): DataQualityReport {
  const issues: DataQualityIssue[] = [];
  const failedRowSet = new Set<number>();

  // Pass 1: collect Order ID frequency & valid positive revenues/profits for IQR outlier threshold
  const orderIdCounts = new Map<string, number>();
  const revenueValues: number[] = [];
  const profitValues: number[] = [];

  for (const r of rawRows) {
    const oid = (r[mapping.orderId] ?? '').trim();
    if (oid) {
      orderIdCounts.set(oid, (orderIdCounts.get(oid) ?? 0) + 1);
    }
    const rev = parseNumStrict(r[mapping.revenue]);
    if (rev !== null && rev > 0) revenueValues.push(rev);
    const prof = parseNumStrict(r[mapping.profit]);
    if (prof !== null && prof > 0) profitValues.push(prof);
  }

  const revenueOutlierThreshold = computeIQRUpperBound(revenueValues);
  const profitOutlierThreshold = computeIQRUpperBound(profitValues);

  let issueSeq = 1;
  const pushIssue = (
    rowIndex: number,
    orderId: string,
    category: QualityIssueCategory,
    severity: 'Critical' | 'Warning',
    field: string,
    observedValue: string,
    expectedRule: string,
    rawRow: RawCsvRow
  ) => {
    failedRowSet.add(rowIndex);
    issues.push({
      issueId: `DQ-${String(issueSeq++).padStart(4, '0')}`,
      rowIndex,
      orderId: orderId || `(Row ${rowIndex})`,
      category,
      severity,
      field,
      observedValue: observedValue || '(empty)',
      expectedRule,
      rawRow,
    });
  };

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 1;

    const orderId = (row[mapping.orderId] ?? '').trim();
    const orderDate = (row[mapping.orderDate] ?? '').trim();
    const country = (row[mapping.country] ?? '').trim();
    const productId = (row[mapping.productId] ?? '').trim();
    const productName = (row[mapping.productName] ?? '').trim();
    const productCategory = (row[mapping.productCategory] ?? '').trim();

    const unitsStr = (row[mapping.unitsSold] ?? '').trim();
    const priceStr = (row[mapping.unitPrice] ?? '').trim();
    const revenueStr = (row[mapping.revenue] ?? '').trim();
    const costStr = (row[mapping.cost] ?? '').trim();
    const profitStr = (row[mapping.profit] ?? '').trim();

    // 1. Missing required values
    if (!orderId) {
      pushIssue(rowNum, '', 'Missing Value', 'Critical', mapping.orderId, orderId, 'Non-empty Order ID required', row);
    }
    if (!productId) {
      pushIssue(rowNum, orderId, 'Missing Value', 'Critical', mapping.productId, productId, 'Non-empty Product ID required', row);
    }
    if (!productName) {
      pushIssue(rowNum, orderId, 'Missing Value', 'Critical', mapping.productName, productName, 'Non-empty Product Name required', row);
    }

    // 2. Duplicate Order IDs
    if (orderId && (orderIdCounts.get(orderId) ?? 0) > 1) {
      pushIssue(
        rowNum,
        orderId,
        'Duplicate Order ID',
        'Critical',
        mapping.orderId,
        orderId,
        `Order ID must be unique (found ${orderIdCounts.get(orderId)} occurrences)`,
        row
      );
    }

    // 3. Invalid dates
    if (!orderDate || !isValidIsoDate(orderDate)) {
      pushIssue(
        rowNum,
        orderId,
        'Invalid Date',
        'Critical',
        mapping.orderDate,
        orderDate,
        'Valid ISO calendar date YYYY-MM-DD (2000–2035) required',
        row
      );
    }

    // 4. Country checks (missing vs unrecognized)
    if (!country) {
      pushIssue(rowNum, orderId, 'Missing Value', 'Critical', mapping.country, country, 'Country must not be blank', row);
    } else if (!VALID_COUNTRY_SET.has(country.toLowerCase())) {
      pushIssue(
        rowNum,
        orderId,
        'Invalid Country',
        'Warning',
        mapping.country,
        country,
        'Country must match approved ISO business region registry',
        row
      );
    }

    // 5. Category checks
    if (!productCategory) {
      pushIssue(
        rowNum,
        orderId,
        'Missing Value',
        'Critical',
        mapping.productCategory,
        productCategory,
        'Product Category must not be blank',
        row
      );
    } else if (!VALID_CATEGORY_SET.has(productCategory.toLowerCase())) {
      pushIssue(
        rowNum,
        orderId,
        'Invalid Product Category',
        'Warning',
        mapping.productCategory,
        productCategory,
        `Category must be one of: ${VALID_CATEGORIES.join(', ')}`,
        row
      );
    }

    // 6. Numeric parsing & validity
    const units = parseNumStrict(unitsStr);
    const unitPrice = parseNumStrict(priceStr);
    const revenue = parseNumStrict(revenueStr);
    const cost = parseNumStrict(costStr);
    const profit = parseNumStrict(profitStr);

    if (units === null) {
      pushIssue(rowNum, orderId, 'Missing Value', 'Critical', mapping.unitsSold, unitsStr, 'Valid numeric Units Sold required', row);
    } else if (units <= 0) {
      pushIssue(
        rowNum,
        orderId,
        'Negative or Zero Units',
        'Critical',
        mapping.unitsSold,
        unitsStr,
        'Units Sold must be greater than 0',
        row
      );
    }

    if (unitPrice === null) {
      pushIssue(rowNum, orderId, 'Missing Value', 'Critical', mapping.unitPrice, priceStr, 'Valid numeric Unit Price required', row);
    } else if (unitPrice <= 0) {
      pushIssue(
        rowNum,
        orderId,
        'Invalid Price or Cost',
        'Critical',
        mapping.unitPrice,
        priceStr,
        'Unit Price must be strictly positive',
        row
      );
    }

    if (cost === null) {
      pushIssue(rowNum, orderId, 'Missing Value', 'Critical', mapping.cost, costStr, 'Valid numeric Cost required', row);
    } else if (cost < 0) {
      pushIssue(rowNum, orderId, 'Invalid Price or Cost', 'Critical', mapping.cost, costStr, 'Cost cannot be negative', row);
    }

    if (revenue === null) {
      pushIssue(rowNum, orderId, 'Missing Value', 'Critical', mapping.revenue, revenueStr, 'Valid numeric Revenue required', row);
    } else if (units !== null && unitPrice !== null && units > 0 && unitPrice > 0) {
      const expectedRev = round2(units * unitPrice);
      if (Math.abs(revenue - expectedRev) > tolerance) {
        pushIssue(
          rowNum,
          orderId,
          'Incorrect Revenue Calculation',
          'Critical',
          mapping.revenue,
          revenue.toFixed(2),
          `Expected Units × Unit Price = ${expectedRev.toFixed(2)}`,
          row
        );
      }
    }

    if (profit === null) {
      pushIssue(rowNum, orderId, 'Missing Value', 'Critical', mapping.profit, profitStr, 'Valid numeric Profit required', row);
    } else if (revenue !== null && cost !== null) {
      const expectedProfit = round2(revenue - cost);
      if (Math.abs(profit - expectedProfit) > tolerance) {
        pushIssue(
          rowNum,
          orderId,
          'Incorrect Profit Calculation',
          'Critical',
          mapping.profit,
          profit.toFixed(2),
          `Expected Revenue − Cost = ${expectedProfit.toFixed(2)}`,
          row
        );
      }
    }

    // 7. Statistical outlier checks
    if (revenue !== null && revenue > revenueOutlierThreshold) {
      pushIssue(
        rowNum,
        orderId,
        'Statistical Outlier',
        'Warning',
        mapping.revenue,
        revenue.toFixed(2),
        `Exceeds IQR outlier fence (${revenueOutlierThreshold.toFixed(2)})`,
        row
      );
    } else if (profit !== null && profit > profitOutlierThreshold) {
      pushIssue(
        rowNum,
        orderId,
        'Statistical Outlier',
        'Warning',
        mapping.profit,
        profit.toFixed(2),
        `Exceeds profit IQR outlier fence (${profitOutlierThreshold.toFixed(2)})`,
        row
      );
    }
  }

  const totalRecordsChecked = rawRows.length;
  const failedRecords = failedRowSet.size;
  const passedRecords = Math.max(0, totalRecordsChecked - failedRecords);
  const qualityScore =
    totalRecordsChecked === 0 ? 100 : round2((passedRecords / totalRecordsChecked) * 100);

  const catMap = new Map<QualityIssueCategory, { count: number; severity: 'Critical' | 'Warning' }>();
  for (const iss of issues) {
    const existing = catMap.get(iss.category);
    if (existing) {
      existing.count++;
    } else {
      catMap.set(iss.category, { count: 1, severity: iss.severity });
    }
  }

  const categoryBreakdown: DataQualityCategorySummary[] = Array.from(catMap.entries())
    .map(([category, v]) => ({
      category,
      count: v.count,
      severity: v.severity,
      percentage: totalRecordsChecked === 0 ? 0 : round2((v.count / totalRecordsChecked) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalRecordsChecked,
    passedRecords,
    failedRecords,
    totalIssuesFound: issues.length,
    qualityScore,
    categoryBreakdown,
    issues,
    failedRowIndices: Array.from(failedRowSet).sort((a, b) => a - b),
  };
}
