import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  CLEAN_RAW_ROWS,
  DEFAULT_COLUMN_MAPPING,
  DIRTY_RAW_ROWS,
  rawRowsToCsv,
} from '../data/sampleDatasets';
import {
  aggregateByCategory,
  aggregateByCountry,
  aggregateByMonth,
  aggregateByProduct,
  calculateKPIs,
  computeYoYComparisons,
  filterSalesRecords,
} from '../lib/analyticsEngine';
import {
  inferColumnMapping,
  inferColumnSchema,
  normalizeRawRowsToSalesRecords,
  parseCsvContent,
} from '../lib/csvEngine';
import { runDataQualityAudit } from '../lib/dataQualityEngine';
import {
  buildExcelWorkbook,
  buildPowerBiStarSchemaCSVs,
  objectsToCsv,
} from '../lib/exportEngine';
import {
  formatCurrency,
  formatDateDisplay,
  isValidIsoDate,
} from '../lib/formatters';
import {
  PREDEFINED_SQL_QUERIES,
  buildSalesDatabase,
  executeSafeSqlQuery,
  validateSafeSelectQuery,
} from '../lib/sqlEngine';
import { runDashboardValidationSuite } from '../lib/validationEngine';

describe('SalesIQ Analytics & Validation Suite', () => {
  const cleanRecords = normalizeRawRowsToSalesRecords(CLEAN_RAW_ROWS, DEFAULT_COLUMN_MAPPING);
  const dirtyRecords = normalizeRawRowsToSalesRecords(DIRTY_RAW_ROWS, DEFAULT_COLUMN_MAPPING);

  it('generates >= 500 realistic clean records and parses CSV round-trip accurately', () => {
    expect(CLEAN_RAW_ROWS.length).toBe(600);
    const csvText = rawRowsToCsv(CLEAN_RAW_ROWS);
    const parsed = parseCsvContent(csvText);
    expect(parsed.rows.length).toBe(600);
    expect(parsed.headers).toContain('Order ID');
    expect(parsed.headers).toContain('Revenue');

    const schema = inferColumnSchema(parsed.headers, parsed.rows, parsed.detectedMapping);
    const revCol = schema.find((c) => c.columnName === 'Revenue');
    expect(revCol?.inferredType).toBe('decimal');
    expect(revCol?.nullCount).toBe(0);
  });

  it('supports configurable column mapping and excludeInvalid cleanup mode', () => {
    const customCsv = [
      'txn_id,sale_date,market,sku,item_name,segment,qty,price,total_sales,cogs,net_profit',
      'ORD-999,2025-05-10,United States,PRD-101,CloudCore Compute Node,Cloud Infrastructure,4,1000.00,4000.00,2400.00,1600.00',
    ].join('\n');
    const parsed = parseCsvContent(customCsv);
    const mapping = inferColumnMapping(parsed.headers);
    expect(mapping.orderId).toBe('txn_id');
    expect(mapping.revenue).toBe('total_sales');

    const normalized = normalizeRawRowsToSalesRecords(parsed.rows, mapping);
    expect(normalized.length).toBe(1);
    expect(normalized[0].revenue).toBe(4000);
    expect(normalized[0].profit).toBe(1600);

    const cleanedDirty = normalizeRawRowsToSalesRecords(DIRTY_RAW_ROWS, DEFAULT_COLUMN_MAPPING, {
      excludeInvalid: true,
    });
    expect(cleanedDirty.length).toBeLessThan(DIRTY_RAW_ROWS.length);
    expect(new Set(cleanedDirty.map((r) => r.orderId)).size).toBe(cleanedDirty.length);
  });

  it('computes KPIs, profit margin, markup, AOV, and handles zero-revenue safely', () => {
    const kpis = calculateKPIs(cleanRecords);
    expect(kpis.totalRevenue).toBeGreaterThan(0);
    expect(kpis.totalProfit).toBeGreaterThan(0);
    expect(kpis.totalUnitsSold).toBeGreaterThan(0);
    expect(kpis.profitMarginPercentage).toBeCloseTo(
      (kpis.totalProfit / kpis.totalRevenue) * 100,
      1
    );
    expect(kpis.markupPercentage).toBeCloseTo((kpis.totalProfit / kpis.totalCost) * 100, 1);
    expect(kpis.averageOrderValue).toBeCloseTo(kpis.totalRevenue / kpis.orderCount, 1);

    const emptyKpis = calculateKPIs([]);
    expect(emptyKpis.totalRevenue).toBe(0);
    expect(emptyKpis.profitMarginPercentage).toBe(0);
    expect(emptyKpis.averageOrderValue).toBe(0);
  });

  it('aggregates cleanly across countries, categories, products, and months', () => {
    const kpis = calculateKPIs(cleanRecords);
    const countries = aggregateByCountry(cleanRecords);
    const categories = aggregateByCategory(cleanRecords);
    const products = aggregateByProduct(cleanRecords);
    const months = aggregateByMonth(cleanRecords);
    const yoy = computeYoYComparisons(months);

    const countrySum = countries.reduce((s, c) => s + c.revenue, 0);
    const catProfitSum = categories.reduce((s, c) => s + c.profit, 0);
    const prodSum = products.reduce((s, p) => s + p.revenue, 0);
    const monthSum = months.reduce((s, m) => s + m.revenue, 0);

    expect(Math.abs(countrySum - kpis.totalRevenue)).toBeLessThan(0.05);
    expect(Math.abs(catProfitSum - kpis.totalProfit)).toBeLessThan(0.05);
    expect(Math.abs(prodSum - kpis.totalRevenue)).toBeLessThan(0.05);
    expect(Math.abs(monthSum - kpis.totalRevenue)).toBeLessThan(0.05);
    expect(yoy.length).toBe(12);
  });

  it('applies date range and multi-dimensional filters accurately', () => {
    const sliced = filterSalesRecords(cleanRecords, {
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      countries: ['United States'],
      categories: ['Cloud Infrastructure'],
      products: [],
      search: '',
    });
    expect(sliced.length).toBeGreaterThan(0);
    for (const r of sliced) {
      expect(r.orderDate >= '2025-01-01' && r.orderDate <= '2025-06-30').toBe(true);
      expect(r.country).toBe('United States');
      expect(r.productCategory).toBe('Cloud Infrastructure');
    }
  });

  it('validates ISO calendar dates and currency/date formatters', () => {
    expect(isValidIsoDate('2024-02-29')).toBe(true);
    expect(isValidIsoDate('2025-02-29')).toBe(false);
    expect(isValidIsoDate('2025-13-45')).toBe(false);
    expect(formatDateDisplay('2025-04-09', 'MM/DD/YYYY')).toBe('04/09/2025');
    expect(formatDateDisplay('2025-04-09', 'DD/MM/YYYY')).toBe('09/04/2025');
    expect(formatCurrency(1250, 'USD')).toContain('$1,250.00');
    expect(formatCurrency(1000, 'EUR')).toContain('€');
  });

  it('detects 0 issues on clean dataset and all anomaly categories on dirty dataset', () => {
    const cleanAudit = runDataQualityAudit(CLEAN_RAW_ROWS, DEFAULT_COLUMN_MAPPING);
    expect(cleanAudit.totalRecordsChecked).toBe(600);
    expect(cleanAudit.failedRecords).toBe(0);
    expect(cleanAudit.qualityScore).toBe(100);

    const dirtyAudit = runDataQualityAudit(DIRTY_RAW_ROWS, DEFAULT_COLUMN_MAPPING);
    expect(dirtyAudit.totalRecordsChecked).toBe(540);
    expect(dirtyAudit.failedRecords).toBeGreaterThan(40);
    expect(dirtyAudit.qualityScore).toBeLessThan(95);

    const detectedCategories = new Set(dirtyAudit.issues.map((i) => i.category));
    expect(detectedCategories.has('Duplicate Order ID')).toBe(true);
    expect(detectedCategories.has('Missing Value')).toBe(true);
    expect(detectedCategories.has('Invalid Date')).toBe(true);
    expect(detectedCategories.has('Negative or Zero Units')).toBe(true);
    expect(detectedCategories.has('Incorrect Revenue Calculation')).toBe(true);
    expect(detectedCategories.has('Incorrect Profit Calculation')).toBe(true);
    expect(detectedCategories.has('Invalid Country')).toBe(true);
    expect(detectedCategories.has('Invalid Product Category')).toBe(true);
    expect(detectedCategories.has('Statistical Outlier')).toBe(true);
  });

  it('enforces safe SQL guardrails and executes all 12 predefined SQL queries on clean & dirty DBs', async () => {
    expect(validateSafeSelectQuery('DROP TABLE sales;').valid).toBe(false);
    expect(validateSafeSelectQuery('DELETE FROM sales;').valid).toBe(false);
    expect(validateSafeSelectQuery('SELECT 1; DROP TABLE sales;').valid).toBe(false);
    expect(validateSafeSelectQuery("SELECT * FROM sales WHERE product_name LIKE '%update%';").valid).toBe(true);
    expect(validateSafeSelectQuery('WITH x AS (SELECT * FROM sales) SELECT COUNT(*) FROM x;').valid).toBe(true);

    const cleanDb = await buildSalesDatabase(cleanRecords);
    const dirtyDb = await buildSalesDatabase(dirtyRecords);

    for (const q of PREDEFINED_SQL_QUERIES) {
      const cleanRes = executeSafeSqlQuery(cleanDb, q.sql);
      expect(cleanRes.error).toBeUndefined();

      const dirtyRes = executeSafeSqlQuery(dirtyDb, q.sql);
      expect(dirtyRes.error).toBeUndefined();
    }

    const dirtyDupRes = executeSafeSqlQuery(
      dirtyDb,
      PREDEFINED_SQL_QUERIES.find((q) => q.id === 'sql-duplicate-orders')!.sql
    );
    expect(dirtyDupRes.rows.length).toBeGreaterThan(0);

    const dirtyAuditRes = executeSafeSqlQuery(
      dirtyDb,
      PREDEFINED_SQL_QUERIES.find((q) => q.id === 'sql-missing-invalid-data')!.sql
    );
    expect(dirtyAuditRes.rows.length).toBeGreaterThan(20);

    cleanDb.close();
    dirtyDb.close();
  });

  it('passes all 12 QA validation checks on clean data and flags integrity checks on dirty data', async () => {
    const cleanDb = await buildSalesDatabase(cleanRecords);
    const qaSuite = runDashboardValidationSuite(cleanRecords, cleanDb, 0.05);
    expect(qaSuite.length).toBe(12);
    for (const rule of qaSuite) {
      expect(rule.passed).toBe(true);
    }

    // Verify dirty dataset reconciles math rules VAL-01..VAL-10 while failing VAL-11 & VAL-12
    const dirtyDb = await buildSalesDatabase(dirtyRecords);
    const dirtyQa = runDashboardValidationSuite(dirtyRecords, dirtyDb, 0.05);
    for (const rule of dirtyQa.filter((r) => !['VAL-11', 'VAL-12'].includes(r.id))) {
      expect(rule.passed).toBe(true);
    }
    expect(dirtyQa.find((r) => r.id === 'VAL-11')?.passed).toBe(false);
    expect(dirtyQa.find((r) => r.id === 'VAL-12')?.passed).toBe(false);

    cleanDb.close();
    dirtyDb.close();
  });

  it('builds 8-sheet Excel XLSX workbook and Power BI Star Schema CSV datasets', async () => {
    const cleanDb = await buildSalesDatabase(cleanRecords);
    const qaSuite = runDashboardValidationSuite(cleanRecords, cleanDb, 0.05);
    const audit = runDataQualityAudit(CLEAN_RAW_ROWS, DEFAULT_COLUMN_MAPPING);

    const wb = buildExcelWorkbook(cleanRecords, qaSuite, audit);
    expect(wb.SheetNames).toEqual([
      'Executive Summary',
      'Sales Transactions',
      'Country Analysis',
      'Category Analysis',
      'Product Analysis',
      'Monthly Trends',
      'Dashboard Validation',
      'Data Quality Issues',
    ]);

    const binary = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const parsedWb = XLSX.read(binary, { type: 'array' });
    expect(parsedWb.SheetNames.length).toBe(8);
    expect(XLSX.utils.sheet_to_json(parsedWb.Sheets['Sales Transactions']).length).toBe(600);

    const star = buildPowerBiStarSchemaCSVs(cleanRecords);
    expect(star.factSales.length).toBe(600);
    expect(star.dimCountries.length).toBe(8);
    expect(star.dimProducts.length).toBe(15);
    expect(star.dimDate.length).toBeGreaterThan(200);
    expect(objectsToCsv(star.dimCountries)).toContain('United States');

    cleanDb.close();
  });
});
