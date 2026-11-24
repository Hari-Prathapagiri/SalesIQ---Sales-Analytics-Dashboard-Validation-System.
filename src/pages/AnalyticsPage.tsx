import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { RotateCcw } from 'lucide-react';
import { EmptyState, KpiCard, SectionCard } from '../components/ui/DataComponents';
import { useSales } from '../context/SalesContext';
import { formatCurrency, formatNumber, formatPercent } from '../lib/formatters';

export const AnalyticsPage: React.FC = () => {
  const {
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
    settings,
  } = useSales();

  const isDark = settings.theme === 'dark';
  const gridStroke = isDark ? '#1E293B' : '#E2E8F0';
  const tickColor = isDark ? '#94A3B8' : '#64748B';
  const tooltipStyle = {
    backgroundColor: isDark ? '#0F172A' : '#FFFFFF',
    borderColor: isDark ? '#334155' : '#E2E8F0',
    borderRadius: '8px',
    fontSize: '12px',
    color: isDark ? '#F1F5F9' : '#0F172A',
  };

  return (
    <div className="space-y-5">
      {/* Multi-Dimensional Filter Panel */}
      <SectionCard
        title="Analytical Slice Controls"
        subtitle="Filter by date range, country, category, and product to recalculate all metrics dynamically"
        action={
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset All
          </button>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="an-start" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Start Date
            </label>
            <input
              id="an-start"
              type="date"
              value={filters.startDate}
              min={dateBounds.minDate}
              max={dateBounds.maxDate}
              onChange={(e) => setFilters((p) => ({ ...p, startDate: e.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="an-end" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              End Date
            </label>
            <input
              id="an-end"
              type="date"
              value={filters.endDate}
              min={dateBounds.minDate}
              max={dateBounds.maxDate}
              onChange={(e) => setFilters((p) => ({ ...p, endDate: e.target.value }))}
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div>
            <label htmlFor="an-country" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Country
            </label>
            <select
              id="an-country"
              value={filters.countries[0] ?? ''}
              onChange={(e) =>
                setFilters((p) => ({ ...p, countries: e.target.value ? [e.target.value] : [] }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All Countries</option>
              {availableCountries.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="an-category" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Category
            </label>
            <select
              id="an-category"
              value={filters.categories[0] ?? ''}
              onChange={(e) =>
                setFilters((p) => ({ ...p, categories: e.target.value ? [e.target.value] : [] }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All Categories</option>
              {availableCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="an-product" className="block text-xs font-medium text-slate-600 dark:text-slate-400">
              Product
            </label>
            <select
              id="an-product"
              value={filters.products[0] ?? ''}
              onChange={(e) =>
                setFilters((p) => ({ ...p, products: e.target.value ? [e.target.value] : [] }))
              }
              className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              <option value="">All Products</option>
              {availableProducts.map((pr) => (
                <option key={pr} value={pr}>
                  {pr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SectionCard>

      {/* 5 Business KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(kpis.totalRevenue, settings.currency)}
          detail={`${formatNumber(kpis.recordCount)} transactions`}
        />
        <KpiCard
          label="Total Profit"
          value={formatCurrency(kpis.totalProfit, settings.currency)}
          detail={`Cost ${formatCurrency(kpis.totalCost, settings.currency)}`}
          tone="positive"
        />
        <KpiCard
          label="Total Units Sold"
          value={formatNumber(kpis.totalUnitsSold)}
          detail={`${formatNumber(kpis.orderCount)} distinct orders`}
        />
        <KpiCard
          label="Average Order Value"
          value={formatCurrency(kpis.averageOrderValue, settings.currency)}
          detail="Revenue / Distinct Orders"
        />
        <KpiCard
          label="Profit Margin %"
          value={formatPercent(kpis.profitMarginPercentage)}
          detail={`Markup: ${formatPercent(kpis.markupPercentage)}`}
          tone="positive"
        />
      </div>

      {filteredRecords.length === 0 ? (
        <EmptyState
          title="No analytical records match your slice"
          description="Try widening your date range or clearing country, category, and product filters."
          actionLabel="Clear Filters"
          onAction={resetFilters}
        />
      ) : (
        <>
          {/* Monthly Sales & MoM Growth Chart */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <SectionCard
              title="Monthly Sales & MoM Growth Rate"
              subtitle="Revenue bars paired with month-over-month percentage growth"
              className="xl:col-span-7 min-w-0"
            >
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyMetrics} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      yAxisId="left"
                      tick={{ fill: tickColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fill: tickColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="momGrowthPct"
                      name="MoM Growth %"
                      stroke="#D97706"
                      strokeWidth={2}
                      dot={{ r: 3 }}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            {/* Year-over-Year Comparison */}
            <SectionCard
              title="Year-over-Year Revenue Comparison"
              subtitle={
                yoyComparisons.length > 0
                  ? `${yoyComparisons[0].previousYear} vs ${yoyComparisons[0].currentYear} monthly revenue benchmark`
                  : 'Select a date range spanning multiple years to inspect YoY growth'
              }
              className="xl:col-span-5 min-w-0"
            >
              {yoyComparisons.length > 0 ? (
                <div className="h-72 w-full min-w-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yoyComparisons} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                      <XAxis dataKey="monthName" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        tick={{ fill: tickColor, fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                      />
                      <Tooltip
                        contentStyle={tooltipStyle}
                        formatter={(val) => formatCurrency(Number(val), settings.currency)}
                      />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar
                        dataKey="previousRevenue"
                        name={String(yoyComparisons[0].previousYear)}
                        fill="#94A3B8"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="currentRevenue"
                        name={String(yoyComparisons[0].currentYear)}
                        fill="#0D9488"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-72 items-center justify-center text-xs text-slate-500 dark:text-slate-400">
                  Insufficient multi-year overlap in the active date filter.
                </div>
              )}
            </SectionCard>
          </div>

          {/* Country & Category Performance Tables */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard
              title="Country-wise Performance Breakdown"
              subtitle="Orders, units, revenue, profit, and margin per country"
              className="min-w-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="py-2.5 pr-2 font-medium">Country</th>
                      <th className="py-2.5 px-2 text-right font-medium">Orders</th>
                      <th className="py-2.5 px-2 text-right font-medium">Units</th>
                      <th className="py-2.5 px-2 text-right font-medium">Revenue</th>
                      <th className="py-2.5 px-2 text-right font-medium">Profit</th>
                      <th className="py-2.5 pl-2 text-right font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {countryMetrics.map((c) => (
                      <tr key={c.country} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 pr-2 font-medium text-slate-900 dark:text-slate-100">{c.country}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {formatNumber(c.orderCount)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {formatNumber(c.unitsSold)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(c.revenue, settings.currency)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(c.profit, settings.currency)}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {formatPercent(c.profitMargin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="Category-wise Performance Breakdown"
              subtitle="Revenue, unit share, profit, and profitability by category"
              className="min-w-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="py-2.5 pr-2 font-medium">Category</th>
                      <th className="py-2.5 px-2 text-right font-medium">Units</th>
                      <th className="py-2.5 px-2 text-right font-medium">Share</th>
                      <th className="py-2.5 px-2 text-right font-medium">Revenue</th>
                      <th className="py-2.5 px-2 text-right font-medium">Profit</th>
                      <th className="py-2.5 pl-2 text-right font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {categoryMetrics.map((c) => (
                      <tr key={c.category} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 pr-2 font-medium text-slate-900 dark:text-slate-100">{c.category}</td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {formatNumber(c.unitsSold)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {formatPercent(c.unitShare)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(c.revenue, settings.currency)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(c.profit, settings.currency)}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {formatPercent(c.profitMargin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          {/* Product-wise Performance Matrix */}
          <SectionCard
            title="Product-wise Performance Matrix"
            subtitle="Complete SKU-level revenue, cost, profit, and margin analysis"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[740px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pr-2 font-medium">Product ID</th>
                    <th className="py-2.5 px-2 font-medium">Product Name</th>
                    <th className="py-2.5 px-2 font-medium">Category</th>
                    <th className="py-2.5 px-2 text-right font-medium">Orders</th>
                    <th className="py-2.5 px-2 text-right font-medium">Units</th>
                    <th className="py-2.5 px-2 text-right font-medium">Revenue</th>
                    <th className="py-2.5 px-2 text-right font-medium">Cost</th>
                    <th className="py-2.5 px-2 text-right font-medium">Profit</th>
                    <th className="py-2.5 pl-2 text-right font-medium">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {productMetrics.map((p) => (
                    <tr key={`${p.productId}-${p.productName}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 pr-2 font-mono text-slate-600 dark:text-slate-400">{p.productId}</td>
                      <td className="py-2.5 px-2 font-medium text-slate-900 dark:text-slate-100">{p.productName}</td>
                      <td className="py-2.5 px-2 text-slate-600 dark:text-slate-300">{p.category}</td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatNumber(p.orderCount)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatNumber(p.unitsSold)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(p.revenue, settings.currency)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatCurrency(p.cost, settings.currency)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(p.profit, settings.currency)}
                      </td>
                      <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatPercent(p.profitMargin)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      )}
    </div>
  );
};
