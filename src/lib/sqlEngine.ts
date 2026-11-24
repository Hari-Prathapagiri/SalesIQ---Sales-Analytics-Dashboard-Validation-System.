import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { VALID_COUNTRIES } from '../data/sampleDatasets';
import { SalesRecord, SqlExecutionResult, SqlQueryDefinition } from '../types/sales';
import { isValidIsoDate, round2 } from './formatters';

let sqlModulePromise: Promise<SqlJsStatic> | null = null;

export async function getSqlModule(): Promise<SqlJsStatic> {
  if (!sqlModulePromise) {
    const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';
    sqlModulePromise = initSqlJs({
      locateFile: (file: string) =>
        isBrowser ? `/${file}` : `node_modules/sql.js/dist/${file}`,
      useOldExtensionFunctions: false,
    });
  }
  return sqlModulePromise;
}

export const SQL_SCHEMA_DDL = `
CREATE TABLE countries (
  country_id INTEGER PRIMARY KEY AUTOINCREMENT,
  country_name TEXT UNIQUE NOT NULL,
  region TEXT NOT NULL,
  currency_code TEXT NOT NULL
);

CREATE TABLE products (
  product_id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  standard_unit_price REAL NOT NULL
);

CREATE TABLE dim_date (
  date_key TEXT PRIMARY KEY,
  full_date TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  month INTEGER NOT NULL,
  month_name TEXT NOT NULL,
  year_month TEXT NOT NULL
);

CREATE TABLE sales (
  row_id INTEGER PRIMARY KEY,
  order_id TEXT NOT NULL,
  order_date TEXT NOT NULL,
  country_name TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_category TEXT NOT NULL,
  units_sold INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  revenue REAL NOT NULL,
  cost REAL NOT NULL,
  profit REAL NOT NULL
);
`;

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function buildSalesDatabase(records: SalesRecord[]): Promise<Database> {
  const SQL = await getSqlModule();
  const db = new SQL.Database();
  db.run(SQL_SCHEMA_DDL);

  const countryMeta = new Map(VALID_COUNTRIES.map((c) => [c.name, c]));
  const seenCountries = new Set<string>();
  const seenProducts = new Map<string, { name: string; category: string; price: number }>();
  const seenDates = new Set<string>();

  const insertCountry = db.prepare(
    'INSERT OR IGNORE INTO countries (country_name, region, currency_code) VALUES (?, ?, ?)'
  );
  const insertProduct = db.prepare(
    'INSERT OR IGNORE INTO products (product_id, product_name, product_category, standard_unit_price) VALUES (?, ?, ?, ?)'
  );
  const insertDate = db.prepare(
    'INSERT OR IGNORE INTO dim_date (date_key, full_date, year, quarter, month, month_name, year_month) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const insertSale = db.prepare(
    `INSERT INTO sales (
      row_id, order_id, order_date, country_name, product_id,
      product_name, product_category, units_sold, unit_price, revenue, cost, profit
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  db.run('BEGIN TRANSACTION');
  try {
    for (const r of records) {
      if (!seenCountries.has(r.country)) {
        seenCountries.add(r.country);
        const meta = countryMeta.get(r.country);
        insertCountry.run([r.country, meta?.region ?? 'Other', meta?.currency ?? 'USD']);
      }
      if (!seenProducts.has(r.productId)) {
        seenProducts.set(r.productId, {
          name: r.productName,
          category: r.productCategory,
          price: r.unitPrice,
        });
        insertProduct.run([r.productId, r.productName, r.productCategory, r.unitPrice]);
      }
      if (isValidIsoDate(r.orderDate) && !seenDates.has(r.orderDate)) {
        seenDates.add(r.orderDate);
        const year = Number(r.orderDate.slice(0, 4));
        const month = Number(r.orderDate.slice(5, 7));
        const quarter = Math.ceil(month / 3);
        const yearMonth = r.orderDate.slice(0, 7);
        insertDate.run([
          r.orderDate.replace(/-/g, ''),
          r.orderDate,
          year,
          quarter,
          month,
          MONTH_NAMES[month - 1],
          yearMonth,
        ]);
      }

      insertSale.run([
        r.rowIndex,
        r.orderId,
        r.orderDate,
        r.country,
        r.productId,
        r.productName,
        r.productCategory,
        r.unitsSold,
        r.unitPrice,
        r.revenue,
        r.cost,
        r.profit,
      ]);
    }
    db.run('COMMIT');
  } catch (err) {
    db.run('ROLLBACK');
    throw err;
  } finally {
    insertCountry.free();
    insertProduct.free();
    insertDate.free();
    insertSale.free();
  }

  return db;
}

const FORBIDDEN_SQL_PATTERN =
  /\b(DROP|DELETE|UPDATE|INSERT|ALTER|TRUNCATE|CREATE|REPLACE|ATTACH|DETACH|VACUUM|PRAGMA|REINDEX)\b/i;

export function validateSafeSelectQuery(sql: string): { valid: boolean; reason?: string } {
  const cleaned = sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .trim();

  if (!cleaned) {
    return { valid: false, reason: 'Query cannot be empty.' };
  }

  const strippedStrings = cleaned.replace(/'([^']|'')*'/g, "''");

  // Disallow multi-statement injection outside string literals
  const withoutTrailingSemi = strippedStrings.replace(/;+\s*$/, '');
  if (withoutTrailingSemi.includes(';')) {
    return {
      valid: false,
      reason: 'Only single-statement read-only SELECT or WITH queries are permitted.',
    };
  }

  if (!/^(SELECT|WITH)\b/i.test(withoutTrailingSemi)) {
    return {
      valid: false,
      reason: 'Only read-only SELECT or WITH (CTE) queries are permitted in the SQL console.',
    };
  }

  if (FORBIDDEN_SQL_PATTERN.test(withoutTrailingSemi)) {
    return {
      valid: false,
      reason: 'Destructive or schema-mutating SQL keywords are blocked.',
    };
  }

  return { valid: true };
}

export function executeSafeSqlQuery(db: Database, sql: string): SqlExecutionResult {
  const check = validateSafeSelectQuery(sql);
  if (!check.valid) {
    return {
      columns: [],
      rows: [],
      executionTimeMs: 0,
      rowCount: 0,
      error: check.reason,
    };
  }

  const start = performance.now();
  try {
    const res = db.exec(sql);
    const elapsed = round2(performance.now() - start);
    if (!res || res.length === 0) {
      return {
        columns: [],
        rows: [],
        executionTimeMs: elapsed,
        rowCount: 0,
      };
    }
    const first = res[0];
    return {
      columns: first.columns,
      rows: first.values as (string | number | null)[][],
      executionTimeMs: elapsed,
      rowCount: first.values.length,
    };
  } catch (err) {
    return {
      columns: [],
      rows: [],
      executionTimeMs: round2(performance.now() - start),
      rowCount: 0,
      error: err instanceof Error ? err.message : 'SQL execution failed',
    };
  }
}

export const PREDEFINED_SQL_QUERIES: SqlQueryDefinition[] = [
  {
    id: 'sql-total-revenue',
    title: 'Total Revenue',
    category: 'KPIs',
    description: 'Calculates total gross revenue across all sales records.',
    dashboardKpiKey: 'totalRevenue',
    sql: `SELECT
  ROUND(SUM(revenue), 2) AS total_revenue,
  COUNT(*) AS record_count
FROM sales;`,
  },
  {
    id: 'sql-total-profit',
    title: 'Total Profit',
    category: 'KPIs',
    description: 'Aggregates total net profit and total COGS across all transactions.',
    dashboardKpiKey: 'totalProfit',
    sql: `SELECT
  ROUND(SUM(profit), 2) AS total_profit,
  ROUND(SUM(cost), 2) AS total_cost
FROM sales;`,
  },
  {
    id: 'sql-total-units',
    title: 'Total Units Sold',
    category: 'KPIs',
    description: 'Sums total quantity sold across all orders.',
    dashboardKpiKey: 'totalUnitsSold',
    sql: `SELECT
  SUM(units_sold) AS total_units_sold,
  ROUND(AVG(units_sold), 2) AS avg_units_per_line
FROM sales;`,
  },
  {
    id: 'sql-aov',
    title: 'Average Order Value',
    category: 'KPIs',
    description: 'Computes revenue divided by distinct order count.',
    dashboardKpiKey: 'averageOrderValue',
    sql: `SELECT
  COUNT(DISTINCT order_id) AS distinct_orders,
  ROUND(SUM(revenue), 2) AS total_revenue,
  ROUND(SUM(revenue) / NULLIF(COUNT(DISTINCT order_id), 0), 2) AS average_order_value
FROM sales;`,
  },
  {
    id: 'sql-profit-margin',
    title: 'Profit Margin %',
    category: 'KPIs',
    description: 'Validates overall profit percentage = (Total Profit / Total Revenue) × 100.',
    dashboardKpiKey: 'profitPercentage',
    sql: `SELECT
  ROUND(SUM(profit), 2) AS total_profit,
  ROUND(SUM(revenue), 2) AS total_revenue,
  ROUND((SUM(profit) * 100.0) / NULLIF(SUM(revenue), 0), 2) AS profit_margin_pct
FROM sales;`,
  },
  {
    id: 'sql-monthly-sales',
    title: 'Monthly Sales Trend',
    category: 'Breakdowns',
    description: 'Joins sales with dim_date to aggregate monthly revenue, profit, and units.',
    sql: `SELECT
  d.year_month,
  d.year,
  d.month_name,
  COUNT(DISTINCT s.order_id) AS orders,
  SUM(s.units_sold) AS units_sold,
  ROUND(SUM(s.revenue), 2) AS revenue,
  ROUND(SUM(s.profit), 2) AS profit
FROM sales s
INNER JOIN dim_date d ON s.order_date = d.full_date
GROUP BY d.year_month, d.year, d.month_name
ORDER BY d.year_month ASC;`,
  },
  {
    id: 'sql-country-revenue',
    title: 'Country-wise Revenue & Profit',
    category: 'Breakdowns',
    description: 'Joins sales with countries dimension for regional revenue and margin analysis.',
    sql: `SELECT
  c.country_name,
  c.region,
  COUNT(DISTINCT s.order_id) AS orders,
  SUM(s.units_sold) AS units_sold,
  ROUND(SUM(s.revenue), 2) AS revenue,
  ROUND(SUM(s.profit), 2) AS profit,
  ROUND((SUM(s.profit) * 100.0) / NULLIF(SUM(s.revenue), 0), 2) AS profit_margin_pct
FROM sales s
LEFT JOIN countries c ON s.country_name = c.country_name
GROUP BY c.country_name, c.region
ORDER BY revenue DESC;`,
  },
  {
    id: 'sql-category-profit',
    title: 'Category-wise Profit',
    category: 'Breakdowns',
    description: 'Aggregates units sold, revenue, and profit by product category.',
    sql: `SELECT
  p.product_category,
  COUNT(*) AS line_items,
  SUM(s.units_sold) AS units_sold,
  ROUND(SUM(s.revenue), 2) AS revenue,
  ROUND(SUM(s.profit), 2) AS profit,
  ROUND((SUM(s.profit) * 100.0) / NULLIF(SUM(s.revenue), 0), 2) AS profit_margin_pct
FROM sales s
INNER JOIN products p ON s.product_id = p.product_id
GROUP BY p.product_category
ORDER BY profit DESC;`,
  },
  {
    id: 'sql-top-10-products',
    title: 'Top 10 Products by Revenue',
    category: 'Breakdowns',
    description: 'Ranks the top 10 revenue-generating products with profit margin.',
    sql: `SELECT
  s.product_id,
  s.product_name,
  s.product_category,
  SUM(s.units_sold) AS units_sold,
  ROUND(SUM(s.revenue), 2) AS revenue,
  ROUND(SUM(s.profit), 2) AS profit,
  ROUND((SUM(s.profit) * 100.0) / NULLIF(SUM(s.revenue), 0), 2) AS margin_pct
FROM sales s
GROUP BY s.product_id, s.product_name, s.product_category
ORDER BY revenue DESC
LIMIT 10;`,
  },
  {
    id: 'sql-duplicate-orders',
    title: 'Duplicate Order Detection',
    category: 'Quality Audit',
    description: 'Identifies order_id values appearing more than once in the sales table.',
    sql: `SELECT
  order_id,
  COUNT(*) AS occurrence_count,
  ROUND(SUM(revenue), 2) AS combined_revenue
FROM sales
GROUP BY order_id
HAVING COUNT(*) > 1
ORDER BY occurrence_count DESC, order_id ASC;`,
  },
  {
    id: 'sql-missing-invalid-data',
    title: 'Missing & Arithmetic Anomaly Audit',
    category: 'Quality Audit',
    description: 'Flags records with unassigned fields, non-positive units, or revenue/profit calculation drift.',
    sql: `SELECT
  row_id,
  order_id,
  order_date,
  country_name,
  product_name,
  units_sold,
  revenue,
  profit,
  CASE
    WHEN units_sold <= 0 THEN 'Non-positive units'
    WHEN unit_price <= 0 THEN 'Invalid unit price'
    WHEN cost < 0 THEN 'Negative cost'
    WHEN country_name = 'Unassigned' THEN 'Missing country'
    WHEN product_name = 'Unnamed Product' THEN 'Missing product name'
    WHEN product_category = 'Uncategorized' THEN 'Missing category'
    WHEN order_date NOT IN (SELECT full_date FROM dim_date) THEN 'Invalid date'
    WHEN ABS(revenue - ROUND(units_sold * unit_price, 2)) > 0.02 THEN 'Revenue mismatch'
    WHEN ABS(profit - ROUND(revenue - cost, 2)) > 0.02 THEN 'Profit mismatch'
    ELSE 'Other anomaly'
  END AS detected_issue
FROM sales
WHERE units_sold <= 0
   OR unit_price <= 0
   OR cost < 0
   OR country_name = 'Unassigned'
   OR product_name = 'Unnamed Product'
   OR product_category = 'Uncategorized'
   OR order_date NOT IN (SELECT full_date FROM dim_date)
   OR ABS(revenue - ROUND(units_sold * unit_price, 2)) > 0.02
   OR ABS(profit - ROUND(revenue - cost, 2)) > 0.02
ORDER BY row_id ASC;`,
  },
  {
    id: 'sql-kpi-reconciliation',
    title: 'Full KPI Reconciliation Summary',
    category: 'Reconciliation',
    description: 'Single relational verification query outputting all core dashboard KPIs.',
    sql: `SELECT
  COUNT(*) AS total_rows,
  COUNT(DISTINCT order_id) AS distinct_orders,
  SUM(units_sold) AS total_units_sold,
  ROUND(SUM(revenue), 2) AS total_revenue,
  ROUND(SUM(cost), 2) AS total_cost,
  ROUND(SUM(profit), 2) AS total_profit,
  ROUND((SUM(profit) * 100.0) / NULLIF(SUM(revenue), 0), 2) AS profit_margin_pct,
  ROUND(SUM(revenue) / NULLIF(COUNT(DISTINCT order_id), 0), 2) AS average_order_value
FROM sales;`,
  },
];
