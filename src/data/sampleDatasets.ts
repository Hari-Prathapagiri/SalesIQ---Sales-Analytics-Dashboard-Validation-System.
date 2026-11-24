import { CanonicalField, ColumnMapping, RawCsvRow, SalesRecord } from '../types/sales';

export const CANONICAL_FIELDS: {
  key: CanonicalField;
  label: string;
  expectedHeader: string;
  aliases: string[];
}[] = [
  { key: 'orderId', label: 'Order ID', expectedHeader: 'Order ID', aliases: ['order_id', 'orderid', 'transaction_id', 'txn_id', 'id'] },
  { key: 'orderDate', label: 'Order Date', expectedHeader: 'Order Date', aliases: ['order_date', 'date', 'txn_date', 'sale_date'] },
  { key: 'country', label: 'Country', expectedHeader: 'Country', aliases: ['country', 'country_name', 'region_country', 'market'] },
  { key: 'productId', label: 'Product ID', expectedHeader: 'Product ID', aliases: ['product_id', 'sku', 'item_id', 'prod_id'] },
  { key: 'productName', label: 'Product Name', expectedHeader: 'Product Name', aliases: ['product_name', 'product', 'item_name', 'sku_name'] },
  { key: 'productCategory', label: 'Product Category', expectedHeader: 'Product Category', aliases: ['product_category', 'category', 'dept', 'segment'] },
  { key: 'unitsSold', label: 'Units Sold', expectedHeader: 'Units Sold', aliases: ['units_sold', 'units', 'quantity', 'qty'] },
  { key: 'unitPrice', label: 'Unit Price', expectedHeader: 'Unit Price', aliases: ['unit_price', 'price', 'selling_price'] },
  { key: 'revenue', label: 'Revenue', expectedHeader: 'Revenue', aliases: ['revenue', 'total_revenue', 'sales', 'gross_sales', 'amount'] },
  { key: 'cost', label: 'Cost', expectedHeader: 'Cost', aliases: ['cost', 'total_cost', 'cogs'] },
  { key: 'profit', label: 'Profit', expectedHeader: 'Profit', aliases: ['profit', 'net_profit', 'gross_profit', 'margin'] },
];

export const DEFAULT_COLUMN_MAPPING: ColumnMapping = {
  orderId: 'Order ID',
  orderDate: 'Order Date',
  country: 'Country',
  productId: 'Product ID',
  productName: 'Product Name',
  productCategory: 'Product Category',
  unitsSold: 'Units Sold',
  unitPrice: 'Unit Price',
  revenue: 'Revenue',
  cost: 'Cost',
  profit: 'Profit',
};

export const VALID_COUNTRIES: { name: string; region: string; currency: string; weight: number }[] = [
  { name: 'United States', region: 'North America', currency: 'USD', weight: 0.28 },
  { name: 'United Kingdom', region: 'Europe', currency: 'GBP', weight: 0.14 },
  { name: 'Germany', region: 'Europe', currency: 'EUR', weight: 0.13 },
  { name: 'Canada', region: 'North America', currency: 'CAD', weight: 0.11 },
  { name: 'Australia', region: 'APAC', currency: 'AUD', weight: 0.10 },
  { name: 'India', region: 'APAC', currency: 'INR', weight: 0.10 },
  { name: 'Singapore', region: 'APAC', currency: 'SGD', weight: 0.07 },
  { name: 'Japan', region: 'APAC', currency: 'JPY', weight: 0.07 },
];

export interface ProductCatalogItem {
  id: string;
  name: string;
  category: string;
  unitPrice: number;
  unitCostRatio: number;
}

export const PRODUCT_CATALOG: ProductCatalogItem[] = [
  { id: 'PRD-101', name: 'CloudCore Compute Node', category: 'Cloud Infrastructure', unitPrice: 1250, unitCostRatio: 0.62 },
  { id: 'PRD-102', name: 'Elastic Storage Vault', category: 'Cloud Infrastructure', unitPrice: 680, unitCostRatio: 0.56 },
  { id: 'PRD-103', name: 'Multi-Region Mesh Gateway', category: 'Cloud Infrastructure', unitPrice: 940, unitCostRatio: 0.59 },
  { id: 'PRD-201', name: 'Enterprise ERP Core', category: 'Enterprise Software', unitPrice: 1850, unitCostRatio: 0.44 },
  { id: 'PRD-202', name: 'Workflow Automation Suite', category: 'Enterprise Software', unitPrice: 790, unitCostRatio: 0.41 },
  { id: 'PRD-203', name: 'Supply Chain Sync Pro', category: 'Enterprise Software', unitPrice: 1120, unitCostRatio: 0.47 },
  { id: 'PRD-301', name: 'InsightStream BI Engine', category: 'Data Analytics Suites', unitPrice: 1420, unitCostRatio: 0.39 },
  { id: 'PRD-302', name: 'Lakehouse Query Accelerator', category: 'Data Analytics Suites', unitPrice: 1640, unitCostRatio: 0.42 },
  { id: 'PRD-303', name: 'Data Quality Auditor Pro', category: 'Data Analytics Suites', unitPrice: 980, unitCostRatio: 0.36 },
  { id: 'PRD-401', name: 'ZeroTrust Identity Shield', category: 'Cybersecurity', unitPrice: 890, unitCostRatio: 0.43 },
  { id: 'PRD-402', name: 'SIEM Threat Telemetry', category: 'Cybersecurity', unitPrice: 1360, unitCostRatio: 0.46 },
  { id: 'PRD-403', name: 'Endpoint Vault Guard', category: 'Cybersecurity', unitPrice: 520, unitCostRatio: 0.40 },
  { id: 'PRD-501', name: 'Edge Telemetry Appliance', category: 'Hardware & Edge', unitPrice: 1580, unitCostRatio: 0.71 },
  { id: 'PRD-502', name: 'Rackmount Fiber Switch', category: 'Hardware & Edge', unitPrice: 1190, unitCostRatio: 0.68 },
  { id: 'PRD-503', name: 'Smart Gateway Sensor Kit', category: 'Hardware & Edge', unitPrice: 430, unitCostRatio: 0.65 },
];

export const VALID_CATEGORIES = Array.from(new Set(PRODUCT_CATALOG.map((p) => p.category)));

// Deterministic Mulberry32 PRNG so datasets are 100% reproducible across React, Python, SQL, and tests
function createRng(seed: number) {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

function pickWeightedCountry(rng: () => number): string {
  const r = rng();
  let acc = 0;
  for (const c of VALID_COUNTRIES) {
    acc += c.weight;
    if (r <= acc) return c.name;
  }
  return VALID_COUNTRIES[0].name;
}

export function generateCleanSalesRecords(count = 600): SalesRecord[] {
  const rng = createRng(20250417);
  const records: SalesRecord[] = [];
  const startYear = 2024;
  const totalMonths = 24; // Jan 2024 – Dec 2025

  for (let i = 0; i < count; i++) {
    const monthOffset = Math.floor((i / count) * totalMonths);
    const year = startYear + Math.floor(monthOffset / 12);
    const month = (monthOffset % 12) + 1;
    const maxDay = new Date(year, month, 0).getDate();
    const day = 1 + Math.floor(rng() * maxDay);

    const orderDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const orderId = `ORD-${year}-${String(10001 + i)}`;
    const country = pickWeightedCountry(rng);
    const product = PRODUCT_CATALOG[Math.floor(rng() * PRODUCT_CATALOG.length)];

    // Seasonal Q4 boost + 2025 YoY growth factor
    const seasonalFactor = month >= 10 ? 1.28 : month <= 2 ? 0.92 : 1.04;
    const yearBoost = year === 2025 ? 1.15 : 1.0;
    const baseUnits = 2 + Math.floor(rng() * 14 * seasonalFactor * yearBoost);
    const unitsSold = Math.max(1, Math.min(28, baseUnits));

    // Slight regional price variance (-3% to +4%) rounded to exact cents
    const priceJitter = 0.97 + rng() * 0.07;
    const unitPrice = round2(product.unitPrice * priceJitter);
    const revenue = round2(unitsSold * unitPrice);

    // Realistic cost ratio variance (+/- 4%)
    const costRatio = product.unitCostRatio + (rng() - 0.5) * 0.08;
    const cost = round2(revenue * costRatio);
    const profit = round2(revenue - cost);

    records.push({
      rowIndex: i + 1,
      orderId,
      orderDate,
      country,
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      unitsSold,
      unitPrice,
      revenue,
      cost,
      profit,
    });
  }

  return records;
}

export function recordsToRawRows(records: SalesRecord[]): RawCsvRow[] {
  return records.map((r) => ({
    'Order ID': r.orderId,
    'Order Date': r.orderDate,
    Country: r.country,
    'Product ID': r.productId,
    'Product Name': r.productName,
    'Product Category': r.productCategory,
    'Units Sold': String(r.unitsSold),
    'Unit Price': r.unitPrice.toFixed(2),
    Revenue: r.revenue.toFixed(2),
    Cost: r.cost.toFixed(2),
    Profit: r.profit.toFixed(2),
  }));
}

export function generateDirtyRawRows(): RawCsvRow[] {
  const cleanSubset = generateCleanSalesRecords(540);
  const rows = recordsToRawRows(cleanSubset);

  // 1. Duplicate Transaction IDs (10 rows)
  const dupIndices = [14, 48, 92, 137, 185, 229, 274, 318, 365, 412];
  dupIndices.forEach((idx, n) => {
    rows[idx]['Order ID'] = rows[idx - (n % 3) - 1]['Order ID'];
  });

  // 2. Missing Country Values (9 rows)
  const missingCountryIdx = [21, 67, 115, 163, 211, 258, 304, 389, 445];
  missingCountryIdx.forEach((idx, n) => {
    rows[idx]['Country'] = n % 2 === 0 ? '' : '   ';
  });

  // 3. Invalid Dates (8 rows)
  const invalidDates = ['2025-13-45', 'not-a-date', '2024-02-30', '99/99/2025', '', '2025-00-12', 'TBD', '2024/14/01'];
  [33, 78, 124, 179, 236, 291, 347, 468].forEach((idx, i) => {
    rows[idx]['Order Date'] = invalidDates[i];
  });

  // 4. Negative Units Sold (7 rows)
  [41, 88, 146, 204, 267, 333, 421].forEach((idx, i) => {
    rows[idx]['Units Sold'] = String(-(i + 2));
  });

  // 5. Missing Product Names (8 rows)
  [53, 102, 154, 219, 283, 355, 408, 492].forEach((idx) => {
    rows[idx]['Product Name'] = '';
  });

  // 6. Incorrect Revenue Calculations (9 rows where Revenue != Units * Unit Price)
  [27, 73, 131, 194, 249, 312, 376, 438, 505].forEach((idx, i) => {
    const rev = parseFloat(rows[idx]['Revenue']);
    rows[idx]['Revenue'] = round2(rev + (i % 2 === 0 ? 450.25 : -320.5)).toFixed(2);
  });

  // 7. Incorrect Profit Calculations (8 rows where Profit != Revenue - Cost)
  [38, 96, 159, 223, 287, 341, 401, 479].forEach((idx, i) => {
    const prof = parseFloat(rows[idx]['Profit']);
    rows[idx]['Profit'] = round2(prof + (i % 2 === 0 ? 610.0 : -275.8)).toFixed(2);
  });

  // 8. Invalid Product Categories (7 rows)
  const badCategories = ['Misc_Unknown', '', 'Legacy-Test', 'N/A', 'Deprecated', 'Unmapped', 'NULL'];
  [61, 118, 172, 241, 326, 395, 514].forEach((idx, i) => {
    rows[idx]['Product Category'] = badCategories[i];
  });

  // 9. Null / Non-Numeric Values & Invalid Countries (8 rows)
  [19, 82, 142, 262, 369, 456, 499, 528].forEach((idx, i) => {
    if (i % 3 === 0) {
      rows[idx]['Unit Price'] = 'NULL';
    } else if (i % 3 === 1) {
      rows[idx]['Cost'] = '';
    } else {
      rows[idx]['Country'] = i === 2 ? 'Atlantis' : 'UnknownRegion';
    }
  });

  // 10. Outlier Transactions (6 extreme revenue/unit spikes)
  [108, 199, 298, 381, 462, 521].forEach((idx, i) => {
    const units = 420 + i * 110;
    const price = 1490;
    const rev = round2(units * price);
    const cost = round2(rev * 0.45);
    const profit = round2(rev - cost);
    rows[idx]['Units Sold'] = String(units);
    rows[idx]['Unit Price'] = price.toFixed(2);
    rows[idx]['Revenue'] = rev.toFixed(2);
    rows[idx]['Cost'] = cost.toFixed(2);
    rows[idx]['Profit'] = profit.toFixed(2);
  });

  return rows;
}

export function rawRowsToCsv(rows: RawCsvRow[], headers?: string[]): string {
  if (rows.length === 0) return '';
  const cols = headers && headers.length > 0 ? headers : Object.keys(rows[0]);
  const escapeCell = (val: string) => {
    const s = val ?? '';
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [cols.map(escapeCell).join(',')];
  for (const row of rows) {
    lines.push(cols.map((c) => escapeCell(row[c] ?? '')).join(','));
  }
  return lines.join('\n');
}

export const CLEAN_RAW_ROWS: RawCsvRow[] = recordsToRawRows(generateCleanSalesRecords(600));
export const DIRTY_RAW_ROWS: RawCsvRow[] = generateDirtyRawRows();
