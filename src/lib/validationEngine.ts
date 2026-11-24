import { Database } from 'sql.js';
import {
  SalesRecord,
  ValidationDetailRow,
  ValidationRuleResult,
} from '../types/sales';
import {
  aggregateByCategory,
  aggregateByCountry,
  aggregateByMonth,
  aggregateByProduct,
  calculateKPIs,
  filterSalesRecords,
  getDateBounds,
} from './analyticsEngine';
import { formatCurrency, formatNumber, formatPercent, isValidIsoDate, round2 } from './formatters';
import { executeSafeSqlQuery } from './sqlEngine';

/**
 * Independent Reference Audit Engine (Path C):
 * Uses integer-cent fixed-point accumulation directly from raw records,
 * completely decoupled from `analyticsEngine.ts`.
 */
function independentCentsSum(values: number[]): number {
  let cents = 0;
  for (let i = 0; i < values.length; i++) {
    cents += Math.round(values[i] * 100);
  }
  return cents / 100;
}

function querySingleScalar(db: Database | null, sql: string): number | null {
  if (!db) return null;
  const res = executeSafeSqlQuery(db, sql);
  if (res.error || res.rows.length === 0) return null;
  const val = res.rows[0][0];
  return typeof val === 'number' ? val : Number(val ?? 0);
}

function queryKeyValueMap(db: Database | null, sql: string): Map<string, number> | null {
  if (!db) return null;
  const res = executeSafeSqlQuery(db, sql);
  if (res.error) return null;
  const map = new Map<string, number>();
  for (const row of res.rows) {
    const k = String(row[0] ?? '');
    const v = typeof row[1] === 'number' ? row[1] : Number(row[1] ?? 0);
    map.set(k, v);
  }
  return map;
}

export function runDashboardValidationSuite(
  records: SalesRecord[],
  db: Database | null,
  tolerance = 0.05
): ValidationRuleResult[] {
  const dashboardKpis = calculateKPIs(records);
  const rules: ValidationRuleResult[] = [];
  const methodLabel = db ? 'Independent SQLite SQL vs UI Engine' : 'Independent Fixed-Point Audit vs UI Engine';

  // 1. Revenue KPI Validation
  const sqlRev = querySingleScalar(db, 'SELECT ROUND(SUM(revenue), 2) FROM sales;');
  const expectedRev = sqlRev !== null ? sqlRev : independentCentsSum(records.map((r) => r.revenue));
  const revDiff = round2(Math.abs(dashboardKpis.totalRevenue - expectedRev));
  rules.push({
    id: 'VAL-01',
    ruleName: 'Total Revenue KPI Validation',
    category: 'KPI',
    methodology: methodLabel,
    expectedDisplay: formatCurrency(expectedRev),
    actualDisplay: formatCurrency(dashboardKpis.totalRevenue),
    expectedNumeric: expectedRev,
    actualNumeric: dashboardKpis.totalRevenue,
    differenceNumeric: revDiff,
    differenceDisplay: formatCurrency(revDiff),
    toleranceDisplay: `±$${tolerance.toFixed(2)}`,
    passed: revDiff <= tolerance,
  });

  // 2. Total Units Validation
  const sqlUnits = querySingleScalar(db, 'SELECT COALESCE(SUM(units_sold), 0) FROM sales;');
  const expectedUnits =
    sqlUnits !== null ? sqlUnits : records.reduce((acc, r) => acc + Number(r.unitsSold), 0);
  const unitsDiff = Math.abs(dashboardKpis.totalUnitsSold - expectedUnits);
  rules.push({
    id: 'VAL-02',
    ruleName: 'Total Units Sold KPI Validation',
    category: 'KPI',
    methodology: methodLabel,
    expectedDisplay: formatNumber(expectedUnits),
    actualDisplay: formatNumber(dashboardKpis.totalUnitsSold),
    expectedNumeric: expectedUnits,
    actualNumeric: dashboardKpis.totalUnitsSold,
    differenceNumeric: unitsDiff,
    differenceDisplay: formatNumber(unitsDiff),
    toleranceDisplay: '0 units',
    passed: unitsDiff === 0,
  });

  // 3. Total Profit Validation
  const sqlProfit = querySingleScalar(db, 'SELECT ROUND(SUM(profit), 2) FROM sales;');
  const expectedProfit = sqlProfit !== null ? sqlProfit : independentCentsSum(records.map((r) => r.profit));
  const profitDiff = round2(Math.abs(dashboardKpis.totalProfit - expectedProfit));
  rules.push({
    id: 'VAL-03',
    ruleName: 'Total Profit KPI Validation',
    category: 'KPI',
    methodology: methodLabel,
    expectedDisplay: formatCurrency(expectedProfit),
    actualDisplay: formatCurrency(dashboardKpis.totalProfit),
    expectedNumeric: expectedProfit,
    actualNumeric: dashboardKpis.totalProfit,
    differenceNumeric: profitDiff,
    differenceDisplay: formatCurrency(profitDiff),
    toleranceDisplay: `±$${tolerance.toFixed(2)}`,
    passed: profitDiff <= tolerance,
  });

  // 4. Profit Percentage Validation
  const sqlPct = querySingleScalar(
    db,
    'SELECT ROUND((SUM(profit) * 100.0) / NULLIF(SUM(revenue), 0), 2) FROM sales;'
  );
  const expectedPct =
    sqlPct !== null
      ? sqlPct
      : expectedRev === 0
      ? 0
      : round2((expectedProfit / expectedRev) * 100);
  const pctDiff = round2(Math.abs(dashboardKpis.profitPercentage - expectedPct));
  rules.push({
    id: 'VAL-04',
    ruleName: 'Profit Percentage (Margin %) KPI Validation',
    category: 'KPI',
    methodology: methodLabel,
    expectedDisplay: formatPercent(expectedPct),
    actualDisplay: formatPercent(dashboardKpis.profitPercentage),
    expectedNumeric: expectedPct,
    actualNumeric: dashboardKpis.profitPercentage,
    differenceNumeric: pctDiff,
    differenceDisplay: formatPercent(pctDiff),
    toleranceDisplay: '±0.02%',
    passed: pctDiff <= 0.02,
  });

  // 5. Country-wise Aggregation Validation
  const dashCountries = aggregateByCountry(records);
  const sqlCountryMap = queryKeyValueMap(
    db,
    'SELECT country_name, ROUND(SUM(revenue), 2) FROM sales GROUP BY country_name;'
  );
  const refCountryMap = new Map<string, number>();
  for (const r of records) {
    const k = r.country || 'Unassigned';
    refCountryMap.set(k, (refCountryMap.get(k) ?? 0) + Math.round(r.revenue * 100));
  }
  const countryDetails: ValidationDetailRow[] = dashCountries.map((c) => {
    const exp = sqlCountryMap
      ? sqlCountryMap.get(c.country) ?? 0
      : (refCountryMap.get(c.country) ?? 0) / 100;
    const diff = round2(Math.abs(c.revenue - exp));
    return {
      dimensionKey: c.country,
      expectedValue: exp,
      actualValue: c.revenue,
      difference: diff,
      passed: diff <= tolerance,
    };
  });
  const maxCountryDiff = countryDetails.reduce((m, d) => Math.max(m, d.difference), 0);
  const sumDashCountries = round2(dashCountries.reduce((s, c) => s + c.revenue, 0));
  const sumExpCountries = round2(countryDetails.reduce((s, d) => s + d.expectedValue, 0));
  rules.push({
    id: 'VAL-05',
    ruleName: 'Country-wise Aggregation Validation',
    category: 'Aggregation',
    methodology: `${countryDetails.length} country buckets checked via GROUP BY`,
    expectedDisplay: formatCurrency(sumExpCountries),
    actualDisplay: formatCurrency(sumDashCountries),
    expectedNumeric: sumExpCountries,
    actualNumeric: sumDashCountries,
    differenceNumeric: maxCountryDiff,
    differenceDisplay: `Max bucket Δ ${formatCurrency(maxCountryDiff)}`,
    toleranceDisplay: `±$${tolerance.toFixed(2)}/bucket`,
    passed: countryDetails.every((d) => d.passed) && countryDetails.length === (sqlCountryMap?.size ?? refCountryMap.size),
    details: countryDetails,
  });

  // 6. Product-wise Aggregation Validation
  const dashProducts = aggregateByProduct(records);
  const sqlProductMap = queryKeyValueMap(
    db,
    'SELECT product_id || "::" || product_name, ROUND(SUM(revenue), 2) FROM sales GROUP BY product_id, product_name;'
  );
  const refProductMap = new Map<string, number>();
  for (const r of records) {
    const k = `${r.productId}::${r.productName}`;
    refProductMap.set(k, (refProductMap.get(k) ?? 0) + Math.round(r.revenue * 100));
  }
  const productDetails: ValidationDetailRow[] = dashProducts.map((p) => {
    const key = `${p.productId}::${p.productName}`;
    const exp = sqlProductMap ? sqlProductMap.get(key) ?? 0 : (refProductMap.get(key) ?? 0) / 100;
    const diff = round2(Math.abs(p.revenue - exp));
    return {
      dimensionKey: p.productName,
      expectedValue: exp,
      actualValue: p.revenue,
      difference: diff,
      passed: diff <= tolerance,
    };
  });
  const maxProdDiff = productDetails.reduce((m, d) => Math.max(m, d.difference), 0);
  rules.push({
    id: 'VAL-06',
    ruleName: 'Product-wise Aggregation Validation',
    category: 'Aggregation',
    methodology: `${productDetails.length} product SKUs checked via GROUP BY`,
    expectedDisplay: formatCurrency(round2(productDetails.reduce((s, d) => s + d.expectedValue, 0))),
    actualDisplay: formatCurrency(round2(dashProducts.reduce((s, p) => s + p.revenue, 0))),
    expectedNumeric: round2(productDetails.reduce((s, d) => s + d.expectedValue, 0)),
    actualNumeric: round2(dashProducts.reduce((s, p) => s + p.revenue, 0)),
    differenceNumeric: maxProdDiff,
    differenceDisplay: `Max SKU Δ ${formatCurrency(maxProdDiff)}`,
    toleranceDisplay: `±$${tolerance.toFixed(2)}/SKU`,
    passed: productDetails.every((d) => d.passed),
    details: productDetails,
  });

  // 7. Category-wise Aggregation Validation
  const dashCategories = aggregateByCategory(records);
  const sqlCategoryMap = queryKeyValueMap(
    db,
    'SELECT product_category, ROUND(SUM(profit), 2) FROM sales GROUP BY product_category;'
  );
  const refCatMap = new Map<string, number>();
  for (const r of records) {
    const k = r.productCategory || 'Uncategorized';
    refCatMap.set(k, (refCatMap.get(k) ?? 0) + Math.round(r.profit * 100));
  }
  const catDetails: ValidationDetailRow[] = dashCategories.map((c) => {
    const exp = sqlCategoryMap ? sqlCategoryMap.get(c.category) ?? 0 : (refCatMap.get(c.category) ?? 0) / 100;
    const diff = round2(Math.abs(c.profit - exp));
    return {
      dimensionKey: c.category,
      expectedValue: exp,
      actualValue: c.profit,
      difference: diff,
      passed: diff <= tolerance,
    };
  });
  const maxCatDiff = catDetails.reduce((m, d) => Math.max(m, d.difference), 0);
  rules.push({
    id: 'VAL-07',
    ruleName: 'Category-wise Profit Aggregation Validation',
    category: 'Aggregation',
    methodology: `${catDetails.length} categories checked via GROUP BY`,
    expectedDisplay: formatCurrency(round2(catDetails.reduce((s, d) => s + d.expectedValue, 0))),
    actualDisplay: formatCurrency(round2(dashCategories.reduce((s, c) => s + c.profit, 0))),
    expectedNumeric: round2(catDetails.reduce((s, d) => s + d.expectedValue, 0)),
    actualNumeric: round2(dashCategories.reduce((s, c) => s + c.profit, 0)),
    differenceNumeric: maxCatDiff,
    differenceDisplay: `Max bucket Δ ${formatCurrency(maxCatDiff)}`,
    toleranceDisplay: `±$${tolerance.toFixed(2)}/cat`,
    passed: catDetails.every((d) => d.passed),
    details: catDetails,
  });

  // 8. Monthly Trend Validation
  const dashMonths = aggregateByMonth(records);
  const sqlMonthMap = queryKeyValueMap(
    db,
    `SELECT d.year_month, ROUND(SUM(s.revenue), 2)
     FROM sales s INNER JOIN dim_date d ON s.order_date = d.full_date
     GROUP BY d.year_month;`
  );
  const refMonthMap = new Map<string, number>();
  for (const r of records) {
    if (!isValidIsoDate(r.orderDate)) continue;
    const ym = r.orderDate.slice(0, 7);
    refMonthMap.set(ym, (refMonthMap.get(ym) ?? 0) + Math.round(r.revenue * 100));
  }
  const monthDetails: ValidationDetailRow[] = dashMonths.map((m) => {
    const exp = sqlMonthMap ? sqlMonthMap.get(m.yearMonth) ?? 0 : (refMonthMap.get(m.yearMonth) ?? 0) / 100;
    const diff = round2(Math.abs(m.revenue - exp));
    return {
      dimensionKey: m.yearMonth,
      expectedValue: exp,
      actualValue: m.revenue,
      difference: diff,
      passed: diff <= tolerance,
    };
  });
  const maxMonthDiff = monthDetails.reduce((m, d) => Math.max(m, d.difference), 0);
  rules.push({
    id: 'VAL-08',
    ruleName: 'Monthly Trend Aggregation Validation',
    category: 'Aggregation',
    methodology: `${monthDetails.length} monthly periods checked via dim_date JOIN`,
    expectedDisplay: formatCurrency(round2(monthDetails.reduce((s, d) => s + d.expectedValue, 0))),
    actualDisplay: formatCurrency(round2(dashMonths.reduce((s, m) => s + m.revenue, 0))),
    expectedNumeric: round2(monthDetails.reduce((s, d) => s + d.expectedValue, 0)),
    actualNumeric: round2(dashMonths.reduce((s, m) => s + m.revenue, 0)),
    differenceNumeric: maxMonthDiff,
    differenceDisplay: `Max month Δ ${formatCurrency(maxMonthDiff)}`,
    toleranceDisplay: `±$${tolerance.toFixed(2)}/mo`,
    passed: monthDetails.every((d) => d.passed),
    details: monthDetails,
  });

  // 9. Filter Accuracy Validation (Slice on top country + top category)
  const targetCountry = dashCountries[0]?.country ?? 'United States';
  const targetCategory = dashCategories[0]?.category ?? 'Cloud Infrastructure';
  const filteredDash = calculateKPIs(
    filterSalesRecords(records, {
      startDate: '',
      endDate: '',
      countries: [targetCountry],
      categories: [targetCategory],
      products: [],
      search: '',
    })
  );
  let expectedFilteredRev = 0;
  if (db) {
    const res = db.exec(
      `SELECT ROUND(COALESCE(SUM(revenue), 0), 2) FROM sales WHERE country_name = '${targetCountry.replace(/'/g, "''")}' AND product_category = '${targetCategory.replace(/'/g, "''")}';`
    );
    expectedFilteredRev = Number(res[0]?.values[0]?.[0] ?? 0);
  } else {
    let cents = 0;
    for (const r of records) {
      if (r.country === targetCountry && r.productCategory === targetCategory) {
        cents += Math.round(r.revenue * 100);
      }
    }
    expectedFilteredRev = cents / 100;
  }
  const filterDiff = round2(Math.abs(filteredDash.totalRevenue - expectedFilteredRev));
  rules.push({
    id: 'VAL-09',
    ruleName: `Multi-Filter Accuracy (${targetCountry} × ${targetCategory})`,
    category: 'Filter',
    methodology: 'UI multi-dimensional filter vs SQL WHERE clause',
    expectedDisplay: formatCurrency(expectedFilteredRev),
    actualDisplay: formatCurrency(filteredDash.totalRevenue),
    expectedNumeric: expectedFilteredRev,
    actualNumeric: filteredDash.totalRevenue,
    differenceNumeric: filterDiff,
    differenceDisplay: formatCurrency(filterDiff),
    toleranceDisplay: `±$${tolerance.toFixed(2)}`,
    passed: filterDiff <= tolerance,
  });

  // 10. Date Range Boundary Validation (Latest 6-month window)
  const bounds = getDateBounds(records);
  const endYr = Number(bounds.maxDate.slice(0, 4)) || 2025;
  const windowStart = `${endYr}-07-01`;
  const windowEnd = bounds.maxDate;
  const dateSlicedDash = calculateKPIs(
    filterSalesRecords(records, {
      startDate: windowStart,
      endDate: windowEnd,
      countries: [],
      categories: [],
      products: [],
      search: '',
    })
  );
  let expectedWindowRev = 0;
  if (db) {
    const res = db.exec(
      `SELECT ROUND(COALESCE(SUM(revenue), 0), 2) FROM sales WHERE order_date BETWEEN '${windowStart}' AND '${windowEnd}' AND order_date IN (SELECT full_date FROM dim_date);`
    );
    expectedWindowRev = Number(res[0]?.values[0]?.[0] ?? 0);
  } else {
    let cents = 0;
    for (const r of records) {
      if (isValidIsoDate(r.orderDate) && r.orderDate >= windowStart && r.orderDate <= windowEnd) {
        cents += Math.round(r.revenue * 100);
      }
    }
    expectedWindowRev = cents / 100;
  }
  const dateDiff = round2(Math.abs(dateSlicedDash.totalRevenue - expectedWindowRev));
  rules.push({
    id: 'VAL-10',
    ruleName: `Date Range Boundary (${windowStart} to ${windowEnd})`,
    category: 'Filter',
    methodology: 'UI date range slicer vs SQL BETWEEN predicate',
    expectedDisplay: formatCurrency(expectedWindowRev),
    actualDisplay: formatCurrency(dateSlicedDash.totalRevenue),
    expectedNumeric: expectedWindowRev,
    actualNumeric: dateSlicedDash.totalRevenue,
    differenceNumeric: dateDiff,
    differenceDisplay: formatCurrency(dateDiff),
    toleranceDisplay: `±$${tolerance.toFixed(2)}`,
    passed: dateDiff <= tolerance,
  });

  // 11. Duplicate Transaction Validation (Pass only when 0 duplicates exist)
  const sqlDupCount = querySingleScalar(
    db,
    'SELECT COUNT(*) - COUNT(DISTINCT order_id) FROM sales;'
  );
  const dupSet = new Set<string>();
  let scanDupCount = 0;
  for (const r of records) {
    if (dupSet.has(r.orderId)) scanDupCount++;
    else dupSet.add(r.orderId);
  }
  const duplicateExcess = sqlDupCount !== null ? sqlDupCount : scanDupCount;
  rules.push({
    id: 'VAL-11',
    ruleName: 'Duplicate Transaction Uniqueness Check',
    category: 'Integrity',
    methodology: 'COUNT(*) − COUNT(DISTINCT order_id) uniqueness invariant',
    expectedDisplay: '0 duplicates',
    actualDisplay: `${duplicateExcess} duplicate(s)`,
    expectedNumeric: 0,
    actualNumeric: duplicateExcess,
    differenceNumeric: duplicateExcess,
    differenceDisplay: `${duplicateExcess} excess rows`,
    toleranceDisplay: '0 duplicates',
    passed: duplicateExcess === 0,
  });

  // 12. Missing & Invalid Data Validation
  const sqlInvalidCount = querySingleScalar(
    db,
    `SELECT COUNT(*) FROM sales
     WHERE units_sold <= 0
        OR unit_price <= 0
        OR cost < 0
        OR country_name = 'Unassigned'
        OR product_name = 'Unnamed Product'
        OR product_category = 'Uncategorized'
        OR order_date NOT IN (SELECT full_date FROM dim_date)
        OR ABS(revenue - ROUND(units_sold * unit_price, 2)) > 0.02
        OR ABS(profit - ROUND(revenue - cost, 2)) > 0.02;`
  );
  let scanInvalidCount = 0;
  for (const r of records) {
    const revMismatch = Math.abs(r.revenue - round2(r.unitsSold * r.unitPrice)) > 0.02;
    const profMismatch = Math.abs(r.profit - round2(r.revenue - r.cost)) > 0.02;
    if (
      r.unitsSold <= 0 ||
      r.unitPrice <= 0 ||
      r.cost < 0 ||
      r.country === 'Unassigned' ||
      r.productName === 'Unnamed Product' ||
      r.productCategory === 'Uncategorized' ||
      !isValidIsoDate(r.orderDate) ||
      revMismatch ||
      profMismatch
    ) {
      scanInvalidCount++;
    }
  }
  const invalidRows = sqlInvalidCount !== null ? sqlInvalidCount : scanInvalidCount;
  rules.push({
    id: 'VAL-12',
    ruleName: 'Missing & Arithmetic Integrity Check',
    category: 'Integrity',
    methodology: 'SQL integrity & arithmetic formula predicates',
    expectedDisplay: '0 invalid rows',
    actualDisplay: `${invalidRows} invalid row(s)`,
    expectedNumeric: 0,
    actualNumeric: invalidRows,
    differenceNumeric: invalidRows,
    differenceDisplay: `${invalidRows} anomalies`,
    toleranceDisplay: '0 anomalies',
    passed: invalidRows === 0,
  });

  return rules;
}
