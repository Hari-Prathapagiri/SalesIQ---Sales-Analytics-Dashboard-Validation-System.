import Papa from 'papaparse';
import { CANONICAL_FIELDS } from '../data/sampleDatasets';
import {
  CanonicalField,
  ColumnMapping,
  ColumnSchemaInfo,
  RawCsvRow,
  SalesRecord,
} from '../types/sales';
import { isValidIsoDate, round2 } from './formatters';

export interface ParsedCsvResult {
  headers: string[];
  rows: RawCsvRow[];
  detectedMapping: ColumnMapping;
  errors: string[];
}

export function parseCsvContent(csvText: string): ParsedCsvResult {
  const parsed = Papa.parse<RawCsvRow>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  const headers = parsed.meta.fields ?? [];
  const rows = (parsed.data ?? []).map((row) => {
    const clean: RawCsvRow = {};
    for (const h of headers) {
      clean[h] = row[h] !== undefined && row[h] !== null ? String(row[h]).trim() : '';
    }
    return clean;
  });

  const errors = parsed.errors.map((e) => `Row ${e.row ?? '?'}: ${e.message}`);
  const detectedMapping = inferColumnMapping(headers);

  return { headers, rows, detectedMapping, errors };
}

export function inferColumnMapping(headers: string[]): ColumnMapping {
  const mapping: Partial<ColumnMapping> = {};
  const normalizedHeaders = headers.map((h) => ({
    original: h,
    norm: h.toLowerCase().replace(/[^a-z0-9]/g, '_'),
  }));

  for (const field of CANONICAL_FIELDS) {
    const exactMatch = normalizedHeaders.find(
      (h) => h.original.toLowerCase() === field.expectedHeader.toLowerCase()
    );
    if (exactMatch) {
      mapping[field.key] = exactMatch.original;
      continue;
    }

    const aliasMatch = normalizedHeaders.find((h) =>
      field.aliases.some(
        (alias) => h.norm === alias || h.norm.includes(alias) || alias.includes(h.norm)
      )
    );
    mapping[field.key] = aliasMatch ? aliasMatch.original : headers[0] ?? field.expectedHeader;
  }

  return mapping as ColumnMapping;
}

export function inferColumnSchema(
  headers: string[],
  rows: RawCsvRow[],
  mapping: ColumnMapping
): ColumnSchemaInfo[] {
  const reverseMap = new Map<string, CanonicalField>();
  for (const [k, v] of Object.entries(mapping)) {
    if (v) reverseMap.set(v, k as CanonicalField);
  }

  return headers.map((col) => {
    let nonNullCount = 0;
    let nullCount = 0;
    const distinct = new Set<string>();
    const samples: string[] = [];

    let intHits = 0;
    let decHits = 0;
    let dateHits = 0;

    for (const row of rows) {
      const raw = (row[col] ?? '').trim();
      if (!raw || raw.toUpperCase() === 'NULL' || raw.toUpperCase() === 'N/A') {
        nullCount++;
        continue;
      }
      nonNullCount++;
      distinct.add(raw);
      if (samples.length < 3 && !samples.includes(raw)) {
        samples.push(raw);
      }

      if (isValidIsoDate(raw) || /^\d{1,2}\/\d{1,2}\/\d{4}$/.test(raw)) {
        dateHits++;
      } else if (/^-?\d+$/.test(raw)) {
        intHits++;
      } else if (/^-?\d+(\.\d+)?$/.test(raw.replace(/[$,]/g, ''))) {
        decHits++;
      }
    }

    let inferredType: ColumnSchemaInfo['inferredType'] = 'string';
    if (nonNullCount > 0) {
      if (dateHits / nonNullCount >= 0.7) {
        inferredType = 'date';
      } else if (intHits === nonNullCount) {
        inferredType = 'integer';
      } else if (intHits + decHits === nonNullCount) {
        inferredType = 'decimal';
      } else if (intHits + decHits + dateHits > 0 && intHits + decHits + dateHits < nonNullCount) {
        inferredType = 'mixed';
      }
    }

    return {
      columnName: col,
      mappedTo: reverseMap.get(col) ?? null,
      inferredType,
      nonNullCount,
      nullCount,
      distinctCount: distinct.size,
      sampleValues: samples,
    };
  });
}

function parseSafeNumber(val: string | undefined): number {
  if (!val) return NaN;
  const cleaned = val.replace(/[$,\s]/g, '');
  if (!cleaned || cleaned.toUpperCase() === 'NULL' || cleaned.toUpperCase() === 'N/A') {
    return NaN;
  }
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : NaN;
}

export function normalizeRawRowsToSalesRecords(
  rows: RawCsvRow[],
  mapping: ColumnMapping,
  options: { excludeInvalid?: boolean } = {}
): SalesRecord[] {
  const result: SalesRecord[] = [];
  const seenOrders = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const orderId = (r[mapping.orderId] ?? '').trim();
    const orderDate = (r[mapping.orderDate] ?? '').trim();
    const country = (r[mapping.country] ?? '').trim();
    const productId = (r[mapping.productId] ?? '').trim();
    const productName = (r[mapping.productName] ?? '').trim();
    const productCategory = (r[mapping.productCategory] ?? '').trim();

    const unitsRaw = parseSafeNumber(r[mapping.unitsSold]);
    const priceRaw = parseSafeNumber(r[mapping.unitPrice]);
    const revenueRaw = parseSafeNumber(r[mapping.revenue]);
    const costRaw = parseSafeNumber(r[mapping.cost]);
    const profitRaw = parseSafeNumber(r[mapping.profit]);

    if (options.excludeInvalid) {
      const hasMissing =
        !orderId ||
        !isValidIsoDate(orderDate) ||
        !country ||
        !productId ||
        !productName ||
        !productCategory ||
        !Number.isFinite(unitsRaw) ||
        unitsRaw <= 0 ||
        !Number.isFinite(priceRaw) ||
        priceRaw <= 0 ||
        !Number.isFinite(revenueRaw) ||
        !Number.isFinite(costRaw) ||
        !Number.isFinite(profitRaw);

      if (hasMissing || seenOrders.has(orderId)) {
        continue;
      }
      seenOrders.add(orderId);
    }

    const unitsSold = Number.isFinite(unitsRaw) ? unitsRaw : 0;
    const unitPrice = Number.isFinite(priceRaw) ? round2(priceRaw) : 0;
    const revenue = Number.isFinite(revenueRaw) ? round2(revenueRaw) : round2(unitsSold * unitPrice);
    const cost = Number.isFinite(costRaw) ? round2(costRaw) : 0;
    const profit = Number.isFinite(profitRaw) ? round2(profitRaw) : round2(revenue - cost);

    result.push({
      rowIndex: i + 1,
      orderId: orderId || `ROW-${i + 1}`,
      orderDate: orderDate || 'Invalid',
      country: country || 'Unassigned',
      productId: productId || 'N/A',
      productName: productName || 'Unnamed Product',
      productCategory: productCategory || 'Uncategorized',
      unitsSold,
      unitPrice,
      revenue,
      cost,
      profit,
    });
  }

  return result;
}
