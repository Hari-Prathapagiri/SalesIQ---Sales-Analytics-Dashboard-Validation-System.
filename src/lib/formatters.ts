import { CurrencyCode, DateFormatOption } from '../types/sales';

export const CURRENCY_CONFIG: Record<
  CurrencyCode,
  { symbol: string; rateFromUsd: number; locale: string; decimals: number }
> = {
  USD: { symbol: '$', rateFromUsd: 1, locale: 'en-US', decimals: 2 },
  EUR: { symbol: '€', rateFromUsd: 0.92, locale: 'en-IE', decimals: 2 },
  GBP: { symbol: '£', rateFromUsd: 0.79, locale: 'en-GB', decimals: 2 },
  INR: { symbol: '₹', rateFromUsd: 83.5, locale: 'en-IN', decimals: 2 },
  AUD: { symbol: 'A$', rateFromUsd: 1.52, locale: 'en-AU', decimals: 2 },
  JPY: { symbol: '¥', rateFromUsd: 154.0, locale: 'ja-JP', decimals: 0 },
};

export function round2(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(
  usdAmount: number,
  currency: CurrencyCode = 'USD',
  compact = false
): string {
  const cfg = CURRENCY_CONFIG[currency] ?? CURRENCY_CONFIG.USD;
  const converted = (Number.isFinite(usdAmount) ? usdAmount : 0) * cfg.rateFromUsd;

  if (compact && Math.abs(converted) >= 1_000_000) {
    return `${cfg.symbol}${(converted / 1_000_000).toFixed(2)}M`;
  }
  if (compact && Math.abs(converted) >= 1_000) {
    return `${cfg.symbol}${(converted / 1_000).toFixed(1)}K`;
  }

  return new Intl.NumberFormat(cfg.locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: cfg.decimals,
    maximumFractionDigits: cfg.decimals,
  }).format(converted);
}

export function formatNumber(value: number, decimals = 0): string {
  const safe = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safe);
}

export function formatPercent(value: number, decimals = 2): string {
  const safe = Number.isFinite(value) ? value : 0;
  return `${safe.toFixed(decimals)}%`;
}

export function isValidIsoDate(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 2000 || year > 2035 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }
  const dt = new Date(Date.UTC(year, month - 1, day));
  return (
    dt.getUTCFullYear() === year &&
    dt.getUTCMonth() === month - 1 &&
    dt.getUTCDate() === day
  );
}

export function formatDateDisplay(isoDate: string, format: DateFormatOption = 'YYYY-MM-DD'): string {
  if (!isValidIsoDate(isoDate)) return isoDate || 'Invalid Date';
  const [y, m, d] = isoDate.trim().split('-');
  if (format === 'MM/DD/YYYY') return `${m}/${d}/${y}`;
  if (format === 'DD/MM/YYYY') return `${d}/${m}/${y}`;
  return `${y}-${m}-${d}`;
}
