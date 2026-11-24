import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDownUp,
  ChevronLeft,
  ChevronRight,
  Download,
  SlidersHorizontal,
  Upload,
} from 'lucide-react';
import { KpiCard, SectionCard } from '../components/ui/DataComponents';
import { useSales } from '../context/SalesContext';
import { CANONICAL_FIELDS } from '../data/sampleDatasets';
import { downloadCsv } from '../lib/exportEngine';
import { formatCurrency, formatDateDisplay, formatNumber } from '../lib/formatters';
import { CanonicalField, SalesRecord } from '../types/sales';

type SortField =
  | 'orderId'
  | 'orderDate'
  | 'country'
  | 'productName'
  | 'productCategory'
  | 'unitsSold'
  | 'unitPrice'
  | 'revenue'
  | 'cost'
  | 'profit';

export const DataManagementPage: React.FC = () => {
  const {
    datasetSource,
    datasetName,
    switchSampleDataset,
    uploadCsvFile,
    headers,
    rawRows,
    columnMapping,
    setColumnMapping,
    schemaInfo,
    allRecords,
    availableCountries,
    availableCategories,
    settings,
  } = useSales();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showMapping, setShowMapping] = useState(false);

  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('orderDate');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      const res = uploadCsvFile(file.name, text);
      if (!res.ok) {
        setUploadError(res.error ?? 'Failed to parse CSV file.');
      } else {
        setPage(1);
      }
    };
    reader.onerror = () => setUploadError('Unable to read selected file.');
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleMappingChange = (field: CanonicalField, csvColumn: string) => {
    setColumnMapping({ ...columnMapping, [field]: csvColumn });
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
    setPage(1);
  };

  const filteredAndSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = allRecords.filter((r) => {
      if (countryFilter && r.country !== countryFilter) return false;
      if (categoryFilter && r.productCategory !== categoryFilter) return false;
      if (q) {
        const hit =
          r.orderId.toLowerCase().includes(q) ||
          r.country.toLowerCase().includes(q) ||
          r.productId.toLowerCase().includes(q) ||
          r.productName.toLowerCase().includes(q) ||
          r.productCategory.toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });

    return filtered.sort((a: SalesRecord, b: SalesRecord) => {
      const va = a[sortField];
      const vb = b[sortField];
      const cmp =
        typeof va === 'number' && typeof vb === 'number'
          ? va - vb
          : String(va).localeCompare(String(vb));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [allRecords, search, countryFilter, categoryFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredAndSorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDownloadProcessed = () => {
    const rows = filteredAndSorted.map((r) => ({
      'Order ID': r.orderId,
      'Order Date': r.orderDate,
      Country: r.country,
      'Product ID': r.productId,
      'Product Name': r.productName,
      'Product Category': r.productCategory,
      'Units Sold': r.unitsSold,
      'Unit Price': r.unitPrice.toFixed(2),
      Revenue: r.revenue.toFixed(2),
      Cost: r.cost.toFixed(2),
      Profit: r.profit.toFixed(2),
    }));
    downloadCsv(`processed_${datasetName}`, rows);
  };

  return (
    <div className="space-y-5">
      {/* Dataset Source & Upload Controls */}
      <SectionCard
        title="Dataset Ingestion & Source Selection"
        subtitle={`Active file: ${datasetName} · Switch between clean/dirty demo datasets or upload any custom sales CSV`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMapping((s) => !s)}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              {showMapping ? 'Hide Column Mapping' : 'Configure Column Mapping'}
            </button>
            <button
              type="button"
              onClick={handleDownloadProcessed}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-blue-700 px-3.5 text-xs font-medium text-white hover:bg-blue-800 transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              Download Processed CSV
            </button>
          </div>
        }
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Upload Dropzone */}
          <div className="lg:col-span-7">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
              aria-label="Upload sales CSV file"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-6 text-center hover:border-blue-500 hover:bg-blue-50/40 transition-colors dark:border-slate-700 dark:bg-slate-800/40 dark:hover:border-blue-400"
            >
              <Upload className="h-6 w-6 text-blue-700 dark:text-blue-400" />
              <p className="mt-2 text-sm font-medium text-slate-900 dark:text-slate-100">
                Upload Sales CSV File
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Automatically detects column names, infers data types, and maps schema fields
              </p>
            </button>
            {uploadError && (
              <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                {uploadError}
              </p>
            )}
          </div>

          {/* Sample Dataset Selector */}
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30 lg:col-span-5">
            <div>
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Built-in Portfolio Datasets
              </p>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Compare clean verified baseline records against intentionally corrupted dirty data.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  switchSampleDataset('clean');
                  setPage(1);
                }}
                className={`min-h-[42px] rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  datasetSource === 'clean'
                    ? 'border-blue-700 bg-blue-50 text-blue-900 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span className="block font-semibold">Clean Baseline</span>
                <span className="block text-[11px] opacity-75">600 verified rows</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  switchSampleDataset('dirty');
                  setPage(1);
                }}
                className={`min-h-[42px] rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                  datasetSource === 'dirty'
                    ? 'border-amber-600 bg-amber-50 text-amber-950 dark:border-amber-500 dark:bg-amber-950/50 dark:text-amber-100'
                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <span className="block font-semibold">Dirty QA Dataset</span>
                <span className="block text-[11px] opacity-75">540 rows + anomalies</span>
              </button>
            </div>
          </div>
        </div>

        {/* Configurable Column Mapping Panel */}
        {showMapping && (
          <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Configurable Column Mapping
            </h3>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Map columns from your uploaded CSV file to the canonical SalesIQ analytical schema.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {CANONICAL_FIELDS.map((field) => (
                <div key={field.key}>
                  <label
                    htmlFor={`map-${field.key}`}
                    className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                  >
                    {field.label}
                  </label>
                  <select
                    id={`map-${field.key}`}
                    value={columnMapping[field.key]}
                    onChange={(e) => handleMappingChange(field.key, e.target.value)}
                    className="mt-1 h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </SectionCard>

      {/* Dataset Profile KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Raw CSV Rows"
          value={formatNumber(rawRows.length)}
          detail={`Active processed rows: ${formatNumber(allRecords.length)}`}
        />
        <KpiCard
          label="Detected Columns"
          value={formatNumber(headers.length)}
          detail="Canonical schema: 11 fields"
        />
        <KpiCard
          label="Filtered Preview Rows"
          value={formatNumber(filteredAndSorted.length)}
          detail={`Page ${currentPage} of ${totalPages}`}
        />
        <KpiCard
          label="Filtered Revenue"
          value={formatCurrency(
            filteredAndSorted.reduce((s, r) => s + r.revenue, 0),
            settings.currency
          )}
          detail="Live slice total"
        />
      </div>

      {/* Detected Schema & Type Inference Table */}
      <SectionCard
        title="Detected Schema & Inferred Data Types"
        subtitle="Automated column profiling across all loaded rows"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2.5 pr-3 font-medium">Source Column</th>
                <th className="py-2.5 px-2 font-medium">Mapped Schema Field</th>
                <th className="py-2.5 px-2 font-medium">Inferred Type</th>
                <th className="py-2.5 px-2 text-right font-medium">Non-Null</th>
                <th className="py-2.5 px-2 text-right font-medium">Null / Empty</th>
                <th className="py-2.5 px-2 text-right font-medium">Distinct</th>
                <th className="py-2.5 pl-2 font-medium">Sample Values</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {schemaInfo.map((col) => (
                <tr key={col.columnName} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 pr-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                    {col.columnName}
                  </td>
                  <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300">
                    {col.mappedTo ?? 'Unmapped'}
                  </td>
                  <td className="py-2.5 px-2 font-mono text-blue-700 dark:text-blue-400">
                    {col.inferredType}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {formatNumber(col.nonNullCount)}
                  </td>
                  <td
                    className={`py-2.5 px-2 text-right font-mono tabular-nums ${
                      col.nullCount > 0
                        ? 'font-semibold text-amber-700 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {formatNumber(col.nullCount)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {formatNumber(col.distinctCount)}
                  </td>
                  <td className="py-2.5 pl-2 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[220px]">
                    {col.sampleValues.join(' · ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCard>

      {/* Interactive Searchable, Sortable Records Explorer */}
      <SectionCard
        title="Sales Records Explorer"
        subtitle="Search, sort, and filter loaded transactions"
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search Order ID, Product, Country..."
            aria-label="Search sales records"
            className="h-10 min-w-[200px] flex-1 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
          <select
            value={countryFilter}
            onChange={(e) => {
              setCountryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by country"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Countries</option>
            {availableCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => {
              setCategoryFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by category"
            className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Categories</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                {(
                  [
                    ['orderId', 'Order ID', 'left'],
                    ['orderDate', 'Order Date', 'left'],
                    ['country', 'Country', 'left'],
                    ['productName', 'Product', 'left'],
                    ['productCategory', 'Category', 'left'],
                    ['unitsSold', 'Units', 'right'],
                    ['unitPrice', 'Unit Price', 'right'],
                    ['revenue', 'Revenue', 'right'],
                    ['cost', 'Cost', 'right'],
                    ['profit', 'Profit', 'right'],
                  ] as [SortField, string, 'left' | 'right'][]
                ).map(([field, label, align]) => (
                  <th key={field} className={`py-2.5 px-2 font-medium ${align === 'right' ? 'text-right' : ''}`}>
                    <button
                      type="button"
                      onClick={() => toggleSort(field)}
                      className={`inline-flex items-center gap-1 hover:text-slate-900 dark:hover:text-white ${
                        align === 'right' ? 'flex-row-reverse' : ''
                      }`}
                    >
                      <span>{label}</span>
                      <ArrowDownUp className="h-3 w-3 opacity-60" />
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {pageRows.map((r) => (
                <tr key={`${r.rowIndex}-${r.orderId}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                  <td className="py-2.5 px-2 font-mono font-medium text-slate-900 dark:text-slate-100">
                    {r.orderId}
                  </td>
                  <td className="py-2.5 px-2 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {formatDateDisplay(r.orderDate, settings.dateFormat)}
                  </td>
                  <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300">{r.country}</td>
                  <td className="py-2.5 px-2 text-slate-800 dark:text-slate-200">{r.productName}</td>
                  <td className="py-2.5 px-2 text-slate-600 dark:text-slate-400">
                    {r.productCategory}
                  </td>
                  <td
                    className={`py-2.5 px-2 text-right font-mono tabular-nums ${
                      r.unitsSold <= 0 ? 'font-semibold text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {formatNumber(r.unitsSold)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                    {formatCurrency(r.unitPrice, settings.currency)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                    {formatCurrency(r.revenue, settings.currency)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                    {formatCurrency(r.cost, settings.currency)}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(r.profit, settings.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-400">
          <span className="tabular-nums">
            Showing {(currentPage - 1) * pageSize + 1}–
            {Math.min(currentPage * pageSize, filteredAndSorted.length)} of{' '}
            {formatNumber(filteredAndSorted.length)} records
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-medium disabled:opacity-40 dark:border-slate-700"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Prev
            </button>
            <span className="font-mono tabular-nums px-2">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-300 px-3 text-xs font-medium disabled:opacity-40 dark:border-slate-700"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
};
