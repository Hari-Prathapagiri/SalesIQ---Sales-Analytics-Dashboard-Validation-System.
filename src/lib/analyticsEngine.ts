import {
  CategoryMetric,
  CountryMetric,
  FilterState,
  KPIStats,
  MonthlyMetric,
  ProductMetric,
  SalesRecord,
  YoYComparison,
} from '../types/sales';
import { isValidIsoDate, round2 } from './formatters';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function filterSalesRecords(records: SalesRecord[], filters: FilterState): SalesRecord[] {
  const searchLower = filters.search.trim().toLowerCase();

  return records.filter((r) => {
    if (filters.countries.length > 0 && !filters.countries.includes(r.country)) {
      return false;
    }
    if (filters.categories.length > 0 && !filters.categories.includes(r.productCategory)) {
      return false;
    }
    if (filters.products.length > 0 && !filters.products.includes(r.productName)) {
      return false;
    }
    if (filters.startDate || filters.endDate) {
      if (!isValidIsoDate(r.orderDate)) return false;
      if (filters.startDate && r.orderDate < filters.startDate) return false;
      if (filters.endDate && r.orderDate > filters.endDate) return false;
    }
    if (searchLower) {
      const matches =
        r.orderId.toLowerCase().includes(searchLower) ||
        r.country.toLowerCase().includes(searchLower) ||
        r.productName.toLowerCase().includes(searchLower) ||
        r.productCategory.toLowerCase().includes(searchLower) ||
        r.productId.toLowerCase().includes(searchLower);
      if (!matches) return false;
    }
    return true;
  });
}

export function calculateKPIs(records: SalesRecord[]): KPIStats {
  let totalRevenue = 0;
  let totalUnitsSold = 0;
  let totalProfit = 0;
  let totalCost = 0;
  const distinctOrders = new Set<string>();

  for (const r of records) {
    totalRevenue += r.revenue;
    totalUnitsSold += r.unitsSold;
    totalProfit += r.profit;
    totalCost += r.cost;
    if (r.orderId) distinctOrders.add(r.orderId);
  }

  totalRevenue = round2(totalRevenue);
  totalProfit = round2(totalProfit);
  totalCost = round2(totalCost);

  const orderCount = distinctOrders.size;
  const profitMarginPercentage =
    totalRevenue === 0 ? 0 : round2((totalProfit / totalRevenue) * 100);
  const markupPercentage =
    totalCost === 0 ? 0 : round2((totalProfit / totalCost) * 100);
  const averageOrderValue =
    orderCount === 0 ? 0 : round2(totalRevenue / orderCount);

  return {
    totalRevenue,
    totalUnitsSold,
    totalProfit,
    profitPercentage: profitMarginPercentage,
    profitMarginPercentage,
    markupPercentage,
    totalCost,
    orderCount,
    recordCount: records.length,
    averageOrderValue,
  };
}

export function aggregateByCountry(records: SalesRecord[]): CountryMetric[] {
  const map = new Map<
    string,
    { revenue: number; profit: number; cost: number; unitsSold: number; orders: Set<string> }
  >();

  for (const r of records) {
    const key = r.country || 'Unassigned';
    let entry = map.get(key);
    if (!entry) {
      entry = { revenue: 0, profit: 0, cost: 0, unitsSold: 0, orders: new Set() };
      map.set(key, entry);
    }
    entry.revenue += r.revenue;
    entry.profit += r.profit;
    entry.cost += r.cost;
    entry.unitsSold += r.unitsSold;
    entry.orders.add(r.orderId);
  }

  return Array.from(map.entries())
    .map(([country, v]) => {
      const revenue = round2(v.revenue);
      const profit = round2(v.profit);
      const cost = round2(v.cost);
      return {
        country,
        revenue,
        profit,
        cost,
        unitsSold: v.unitsSold,
        orderCount: v.orders.size,
        profitMargin: revenue === 0 ? 0 : round2((profit / revenue) * 100),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function aggregateByCategory(records: SalesRecord[]): CategoryMetric[] {
  const map = new Map<
    string,
    { revenue: number; profit: number; cost: number; unitsSold: number; orders: Set<string> }
  >();

  let totalUnits = 0;
  for (const r of records) {
    const key = r.productCategory || 'Uncategorized';
    let entry = map.get(key);
    if (!entry) {
      entry = { revenue: 0, profit: 0, cost: 0, unitsSold: 0, orders: new Set() };
      map.set(key, entry);
    }
    entry.revenue += r.revenue;
    entry.profit += r.profit;
    entry.cost += r.cost;
    entry.unitsSold += r.unitsSold;
    entry.orders.add(r.orderId);
    totalUnits += r.unitsSold;
  }

  return Array.from(map.entries())
    .map(([category, v]) => {
      const revenue = round2(v.revenue);
      const profit = round2(v.profit);
      const cost = round2(v.cost);
      return {
        category,
        revenue,
        profit,
        cost,
        unitsSold: v.unitsSold,
        orderCount: v.orders.size,
        profitMargin: revenue === 0 ? 0 : round2((profit / revenue) * 100),
        unitShare: totalUnits === 0 ? 0 : round2((v.unitsSold / totalUnits) * 100),
      };
    })
    .sort((a, b) => b.profit - a.profit);
}

export function aggregateByProduct(records: SalesRecord[]): ProductMetric[] {
  const map = new Map<
    string,
    {
      productId: string;
      productName: string;
      category: string;
      revenue: number;
      profit: number;
      cost: number;
      unitsSold: number;
      orders: Set<string>;
    }
  >();

  for (const r of records) {
    const key = `${r.productId}::${r.productName}`;
    let entry = map.get(key);
    if (!entry) {
      entry = {
        productId: r.productId,
        productName: r.productName,
        category: r.productCategory,
        revenue: 0,
        profit: 0,
        cost: 0,
        unitsSold: 0,
        orders: new Set(),
      };
      map.set(key, entry);
    }
    entry.revenue += r.revenue;
    entry.profit += r.profit;
    entry.cost += r.cost;
    entry.unitsSold += r.unitsSold;
    entry.orders.add(r.orderId);
  }

  return Array.from(map.values())
    .map((v) => {
      const revenue = round2(v.revenue);
      const profit = round2(v.profit);
      const cost = round2(v.cost);
      return {
        productId: v.productId,
        productName: v.productName,
        category: v.category,
        revenue,
        profit,
        cost,
        unitsSold: v.unitsSold,
        orderCount: v.orders.size,
        profitMargin: revenue === 0 ? 0 : round2((profit / revenue) * 100),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function aggregateByMonth(records: SalesRecord[]): MonthlyMetric[] {
  const map = new Map<
    string,
    { year: number; month: number; revenue: number; profit: number; cost: number; unitsSold: number; orders: Set<string> }
  >();

  for (const r of records) {
    if (!isValidIsoDate(r.orderDate)) continue;
    const yearMonth = r.orderDate.slice(0, 7);
    const year = Number(yearMonth.slice(0, 4));
    const month = Number(yearMonth.slice(5, 7));

    let entry = map.get(yearMonth);
    if (!entry) {
      entry = { year, month, revenue: 0, profit: 0, cost: 0, unitsSold: 0, orders: new Set() };
      map.set(yearMonth, entry);
    }
    entry.revenue += r.revenue;
    entry.profit += r.profit;
    entry.cost += r.cost;
    entry.unitsSold += r.unitsSold;
    entry.orders.add(r.orderId);
  }

  const sorted = Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([yearMonth, v]) => {
      const revenue = round2(v.revenue);
      const profit = round2(v.profit);
      const cost = round2(v.cost);
      const label = `${MONTH_NAMES[v.month - 1]} ${String(v.year).slice(2)}`;
      return {
        yearMonth,
        label,
        year: v.year,
        month: v.month,
        revenue,
        profit,
        cost,
        unitsSold: v.unitsSold,
        orderCount: v.orders.size,
        momGrowthPct: null as number | null,
      };
    });

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].revenue;
    sorted[i].momGrowthPct =
      prev === 0 ? null : round2(((sorted[i].revenue - prev) / prev) * 100);
  }

  return sorted;
}

export function computeYoYComparisons(monthly: MonthlyMetric[]): YoYComparison[] {
  const years = Array.from(new Set(monthly.map((m) => m.year))).sort((a, b) => a - b);
  if (years.length < 2) return [];

  const currentYear = years[years.length - 1];
  const previousYear = years[years.length - 2];

  const byYearMonth = new Map<string, number>();
  for (const m of monthly) {
    byYearMonth.set(`${m.year}-${m.month}`, m.revenue);
  }

  const comparisons: YoYComparison[] = [];
  for (let m = 1; m <= 12; m++) {
    const cur = byYearMonth.get(`${currentYear}-${m}`) ?? 0;
    const prev = byYearMonth.get(`${previousYear}-${m}`) ?? 0;
    if (cur === 0 && prev === 0) continue;

    comparisons.push({
      monthNumber: m,
      monthName: MONTH_NAMES[m - 1],
      currentYear,
      previousYear,
      currentRevenue: round2(cur),
      previousRevenue: round2(prev),
      yoyGrowthPct: prev === 0 ? null : round2(((cur - prev) / prev) * 100),
    });
  }

  return comparisons;
}

export function getDateBounds(records: SalesRecord[]): { minDate: string; maxDate: string } {
  let minDate = '';
  let maxDate = '';
  for (const r of records) {
    if (!isValidIsoDate(r.orderDate)) continue;
    if (!minDate || r.orderDate < minDate) minDate = r.orderDate;
    if (!maxDate || r.orderDate > maxDate) maxDate = r.orderDate;
  }
  return { minDate: minDate || '2024-01-01', maxDate: maxDate || '2025-12-31' };
}
