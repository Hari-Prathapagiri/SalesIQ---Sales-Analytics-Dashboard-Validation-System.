import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Database } from 'sql.js';
import {
  CLEAN_RAW_ROWS,
  DEFAULT_COLUMN_MAPPING,
  DIRTY_RAW_ROWS,
} from '../data/sampleDatasets';
import {
  aggregateByCategory,
  aggregateByCountry,
  aggregateByMonth,
  aggregateByProduct,
  calculateKPIs,
  computeYoYComparisons,
  filterSalesRecords,
  getDateBounds,
} from '../lib/analyticsEngine';
import {
  inferColumnSchema,
  normalizeRawRowsToSalesRecords,
  parseCsvContent,
} from '../lib/csvEngine';
import { runDataQualityAudit } from '../lib/dataQualityEngine';
import { buildSalesDatabase } from '../lib/sqlEngine';
import { runDashboardValidationSuite } from '../lib/validationEngine';
import {
  AppSettings,
  CategoryMetric,
  ColumnMapping,
  ColumnSchemaInfo,
  CountryMetric,
  DataQualityReport,
  DatasetSource,
  FilterState,
  KPIStats,
  MonthlyMetric,
  PageId,
  ProductMetric,
  RawCsvRow,
  SalesRecord,
  ValidationRuleResult,
  YoYComparison,
} from '../types/sales';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  currency: 'USD',
  dateFormat: 'YYYY-MM-DD',
  validationTolerance: 0.05,
  excludeInvalidFromAnalytics: false,
};

interface SalesContextValue {
  activePage: PageId;
  setActivePage: (page: PageId) => void;
  datasetSource: DatasetSource;
  datasetName: string;
  switchSampleDataset: (source: 'clean' | 'dirty') => void;
  uploadCsvFile: (fileName: string, csvText: string) => { ok: boolean; error?: string };
  resetDemoData: () => void;

  headers: string[];
  rawRows: RawCsvRow[];
  columnMapping: ColumnMapping;
  setColumnMapping: (mapping: ColumnMapping) => void;
  schemaInfo: ColumnSchemaInfo[];

  allRecords: SalesRecord[];
  filteredRecords: SalesRecord[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;

  availableCountries: string[];
  availableCategories: string[];
  availableProducts: string[];
  dateBounds: { minDate: string; maxDate: string };

  kpis: KPIStats;
  countryMetrics: CountryMetric[];
  categoryMetrics: CategoryMetric[];
  productMetrics: ProductMetric[];
  monthlyMetrics: MonthlyMetric[];
  yoyComparisons: YoYComparison[];

  qualityReport: DataQualityReport;
  validationResults: ValidationRuleResult[];
  sqlDb: Database | null;
  sqlReady: boolean;

  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
}

const SalesContext = createContext<SalesContextValue | null>(null);

export const SalesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [datasetSource, setDatasetSource] = useState<DatasetSource>('clean');
  const [datasetName, setDatasetName] = useState<string>('sales_clean.csv');
  const [headers, setHeaders] = useState<string[]>(() => Object.keys(CLEAN_RAW_ROWS[0]));
  const [rawRows, setRawRows] = useState<RawCsvRow[]>(CLEAN_RAW_ROWS);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>(DEFAULT_COLUMN_MAPPING);

  const [settings, setSettings] = useState<AppSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('salesiq_settings');
        if (saved) return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      } catch {
        // ignore storage errors
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem('salesiq_settings', JSON.stringify(settings));
    } catch {
      // ignore
    }
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const schemaInfo = useMemo(
    () => inferColumnSchema(headers, rawRows, columnMapping),
    [headers, rawRows, columnMapping]
  );

  const allRecords = useMemo(
    () =>
      normalizeRawRowsToSalesRecords(rawRows, columnMapping, {
        excludeInvalid: settings.excludeInvalidFromAnalytics,
      }),
    [rawRows, columnMapping, settings.excludeInvalidFromAnalytics]
  );

  const dateBounds = useMemo(() => getDateBounds(allRecords), [allRecords]);

  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    countries: [],
    categories: [],
    products: [],
    search: '',
  });

  const resetFilters = useCallback(() => {
    setFilters({
      startDate: '',
      endDate: '',
      countries: [],
      categories: [],
      products: [],
      search: '',
    });
  }, []);

  const switchSampleDataset = useCallback(
    (source: 'clean' | 'dirty') => {
      const targetRows = source === 'clean' ? CLEAN_RAW_ROWS : DIRTY_RAW_ROWS;
      setDatasetSource(source);
      setDatasetName(source === 'clean' ? 'sales_clean.csv' : 'sales_dirty.csv');
      setHeaders(Object.keys(targetRows[0]));
      setRawRows(targetRows);
      setColumnMapping(DEFAULT_COLUMN_MAPPING);
      resetFilters();
    },
    [resetFilters]
  );

  const uploadCsvFile = useCallback(
    (fileName: string, csvText: string): { ok: boolean; error?: string } => {
      const parsed = parseCsvContent(csvText);
      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        return { ok: false, error: 'CSV file is empty or missing valid column headers.' };
      }
      setDatasetSource('uploaded');
      setDatasetName(fileName);
      setHeaders(parsed.headers);
      setRawRows(parsed.rows);
      setColumnMapping(parsed.detectedMapping);
      resetFilters();
      return { ok: true };
    },
    [resetFilters]
  );

  const resetDemoData = useCallback(() => {
    switchSampleDataset('clean');
    setSettings(DEFAULT_SETTINGS);
  }, [switchSampleDataset]);

  const filteredRecords = useMemo(
    () => filterSalesRecords(allRecords, filters),
    [allRecords, filters]
  );

  const availableCountries = useMemo(
    () => Array.from(new Set(allRecords.map((r) => r.country))).sort(),
    [allRecords]
  );
  const availableCategories = useMemo(
    () => Array.from(new Set(allRecords.map((r) => r.productCategory))).sort(),
    [allRecords]
  );
  const availableProducts = useMemo(
    () => Array.from(new Set(allRecords.map((r) => r.productName))).sort(),
    [allRecords]
  );

  const kpis = useMemo(() => calculateKPIs(filteredRecords), [filteredRecords]);
  const countryMetrics = useMemo(() => aggregateByCountry(filteredRecords), [filteredRecords]);
  const categoryMetrics = useMemo(() => aggregateByCategory(filteredRecords), [filteredRecords]);
  const productMetrics = useMemo(() => aggregateByProduct(filteredRecords), [filteredRecords]);
  const monthlyMetrics = useMemo(() => aggregateByMonth(filteredRecords), [filteredRecords]);
  const yoyComparisons = useMemo(() => computeYoYComparisons(monthlyMetrics), [monthlyMetrics]);

  const qualityReport = useMemo(
    () => runDataQualityAudit(rawRows, columnMapping, settings.validationTolerance),
    [rawRows, columnMapping, settings.validationTolerance]
  );

  // Real SQLite database built asynchronously via sql.js whenever allRecords changes
  const [sqlDb, setSqlDb] = useState<Database | null>(null);
  const [sqlReady, setSqlReady] = useState(false);
  const activeDbRef = useRef<Database | null>(null);

  useEffect(() => {
    let cancelled = false;
    setSqlReady(false);
    setSqlDb(null);

    if (activeDbRef.current) {
      try {
        activeDbRef.current.close();
      } catch {
        // ignore close errors
      }
      activeDbRef.current = null;
    }

    buildSalesDatabase(allRecords)
      .then((db) => {
        if (cancelled) {
          try {
            db.close();
          } catch {
            // ignore
          }
          return;
        }
        activeDbRef.current = db;
        setSqlDb(db);
        setSqlReady(true);
      })
      .catch((err) => {
        console.error('SQLite initialization error:', err);
        if (!cancelled) {
          setSqlDb(null);
          setSqlReady(false);
        }
      });

    return () => {
      cancelled = true;
      if (activeDbRef.current) {
        try {
          activeDbRef.current.close();
        } catch {
          // ignore
        }
        activeDbRef.current = null;
      }
    };
  }, [allRecords]);

  const validationResults = useMemo(
    () => runDashboardValidationSuite(allRecords, sqlReady ? sqlDb : null, settings.validationTolerance),
    [allRecords, sqlReady, sqlDb, settings.validationTolerance]
  );

  const value: SalesContextValue = {
    activePage,
    setActivePage,
    datasetSource,
    datasetName,
    switchSampleDataset,
    uploadCsvFile,
    resetDemoData,
    headers,
    rawRows,
    columnMapping,
    setColumnMapping,
    schemaInfo,
    allRecords,
    filteredRecords,
    filters,
    setFilters,
    resetFilters,
    availableCountries,
    availableCategories,
    availableProducts,
    dateBounds,
    kpis,
    countryMetrics,
    categoryMetrics,
    productMetrics,
    monthlyMetrics,
    yoyComparisons,
    qualityReport,
    validationResults,
    sqlDb,
    sqlReady,
    settings,
    updateSettings,
  };

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
};

export function useSales(): SalesContextValue {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used inside SalesProvider');
  return ctx;
}
