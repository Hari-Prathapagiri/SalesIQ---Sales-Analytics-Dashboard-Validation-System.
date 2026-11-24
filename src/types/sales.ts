export type PageId =
  | 'overview'
  | 'data-management'
  | 'analytics'
  | 'dashboard-validation'
  | 'sql-analysis'
  | 'data-quality'
  | 'reports'
  | 'settings';

export type DatasetSource = 'clean' | 'dirty' | 'uploaded';

export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'INR' | 'AUD' | 'JPY';
export type DateFormatOption = 'YYYY-MM-DD' | 'MM/DD/YYYY' | 'DD/MM/YYYY';

export interface AppSettings {
  theme: 'light' | 'dark';
  currency: CurrencyCode;
  dateFormat: DateFormatOption;
  validationTolerance: number;
  excludeInvalidFromAnalytics: boolean;
}

export interface SalesRecord {
  rowIndex: number;
  orderId: string;
  orderDate: string;
  country: string;
  productId: string;
  productName: string;
  productCategory: string;
  unitsSold: number;
  unitPrice: number;
  revenue: number;
  cost: number;
  profit: number;
}

export type RawCsvRow = Record<string, string>;

export type CanonicalField =
  | 'orderId'
  | 'orderDate'
  | 'country'
  | 'productId'
  | 'productName'
  | 'productCategory'
  | 'unitsSold'
  | 'unitPrice'
  | 'revenue'
  | 'cost'
  | 'profit';

export type ColumnMapping = Record<CanonicalField, string>;

export interface ColumnSchemaInfo {
  columnName: string;
  mappedTo: CanonicalField | null;
  inferredType: 'string' | 'integer' | 'decimal' | 'date' | 'mixed';
  nonNullCount: number;
  nullCount: number;
  distinctCount: number;
  sampleValues: string[];
}

export interface FilterState {
  startDate: string;
  endDate: string;
  countries: string[];
  categories: string[];
  products: string[];
  search: string;
}

export interface KPIStats {
  totalRevenue: number;
  totalUnitsSold: number;
  totalProfit: number;
  profitPercentage: number;
  profitMarginPercentage: number;
  markupPercentage: number;
  totalCost: number;
  orderCount: number;
  recordCount: number;
  averageOrderValue: number;
}

export interface CountryMetric {
  country: string;
  revenue: number;
  profit: number;
  cost: number;
  unitsSold: number;
  orderCount: number;
  profitMargin: number;
}

export interface CategoryMetric {
  category: string;
  revenue: number;
  profit: number;
  cost: number;
  unitsSold: number;
  orderCount: number;
  profitMargin: number;
  unitShare: number;
}

export interface ProductMetric {
  productId: string;
  productName: string;
  category: string;
  revenue: number;
  profit: number;
  cost: number;
  unitsSold: number;
  orderCount: number;
  profitMargin: number;
}

export interface MonthlyMetric {
  yearMonth: string;
  label: string;
  year: number;
  month: number;
  revenue: number;
  profit: number;
  cost: number;
  unitsSold: number;
  orderCount: number;
  momGrowthPct: number | null;
}

export interface YoYComparison {
  monthNumber: number;
  monthName: string;
  currentYear: number;
  previousYear: number;
  currentRevenue: number;
  previousRevenue: number;
  yoyGrowthPct: number | null;
}

export interface ValidationDetailRow {
  dimensionKey: string;
  expectedValue: number;
  actualValue: number;
  difference: number;
  passed: boolean;
}

export interface ValidationRuleResult {
  id: string;
  ruleName: string;
  category: 'KPI' | 'Aggregation' | 'Filter' | 'Integrity';
  methodology: string;
  expectedDisplay: string;
  actualDisplay: string;
  expectedNumeric: number;
  actualNumeric: number;
  differenceNumeric: number;
  differenceDisplay: string;
  toleranceDisplay: string;
  passed: boolean;
  details?: ValidationDetailRow[];
}

export type QualityIssueCategory =
  | 'Missing Value'
  | 'Duplicate Order ID'
  | 'Invalid Date'
  | 'Negative or Zero Units'
  | 'Invalid Price or Cost'
  | 'Incorrect Revenue Calculation'
  | 'Incorrect Profit Calculation'
  | 'Invalid Country'
  | 'Invalid Product Category'
  | 'Statistical Outlier';

export interface DataQualityIssue {
  issueId: string;
  rowIndex: number;
  orderId: string;
  category: QualityIssueCategory;
  severity: 'Critical' | 'Warning';
  field: string;
  observedValue: string;
  expectedRule: string;
  rawRow: RawCsvRow;
}

export interface DataQualityCategorySummary {
  category: QualityIssueCategory;
  count: number;
  severity: 'Critical' | 'Warning';
  percentage: number;
}

export interface DataQualityReport {
  totalRecordsChecked: number;
  passedRecords: number;
  failedRecords: number;
  totalIssuesFound: number;
  qualityScore: number;
  categoryBreakdown: DataQualityCategorySummary[];
  issues: DataQualityIssue[];
  failedRowIndices: number[];
}

export interface SqlQueryDefinition {
  id: string;
  title: string;
  category: 'KPIs' | 'Breakdowns' | 'Quality Audit' | 'Reconciliation';
  description: string;
  sql: string;
  dashboardKpiKey?: 'totalRevenue' | 'totalProfit' | 'totalUnitsSold' | 'averageOrderValue' | 'profitPercentage';
}

export interface SqlExecutionResult {
  columns: string[];
  rows: (string | number | null)[][];
  executionTimeMs: number;
  rowCount: number;
  error?: string;
}
