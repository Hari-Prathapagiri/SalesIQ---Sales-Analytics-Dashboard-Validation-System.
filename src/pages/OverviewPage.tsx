import React, { useMemo } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from 'recharts';
import { RotateCcw } from 'lucide-react';
import { EmptyState, KpiCard, SectionCard } from '../components/ui/DataComponents';
import { useSales } from '../context/SalesContext';
import {
  formatCurrency,
  formatDateDisplay,
  formatNumber,
  formatPercent,
} from '../lib/formatters';

const CHART_COLORS = ['#1D4ED8', '#0D9488', '#D97706', '#6366F1', '#DC2626', '#0284C7'];

interface TreemapCellProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  size?: number;
  index?: number;
}

const CustomTreemapCell: React.FC<TreemapCellProps> = ({
  x = 0,
  y = 0,
  width = 0,
  height = 0,
  name = '',
  size = 0,
  index = 0,
}) => {
  const fill = CHART_COLORS[index % CHART_COLORS.length];
  const showText = width > 72 && height > 44;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={fill}
        stroke="#FFFFFF"
        strokeWidth={2}
        rx={4}
      />
      {showText && (
        <>
          <text
            x={x + 8}
            y={y + 20}
            fill="#FFFFFF"
            fontSize={12}
            fontWeight={600}
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            {name.length > 18 ? `${name.slice(0, 16)}…` : name}
          </text>
          <text
            x={x + 8}
            y={y + 37}
            fill="rgba(255,255,255,0.9)"
            fontSize={11}
            fontFamily="JetBrains Mono, monospace"
          >
            {formatNumber(size)} units
          </text>
        </>
      )}
    </g>
  );
};

export const OverviewPage: React.FC = () => {
  const {
    filteredRecords,
    filters,
    setFilters,
    resetFilters,
    availableCountries,
    availableCategories,
    dateBounds,
    kpis,
    countryMetrics,
    categoryMetrics,
    productMetrics,
    monthlyMetrics,
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

  const recentTransactions = useMemo(
    () =>
      [...filteredRecords]
        .sort((a, b) => b.orderDate.localeCompare(a.orderDate))
        .slice(0, 8),
    [filteredRecords]
  );

  const treemapData = useMemo(
    () =>
      categoryMetrics.map((c) => ({
        name: c.category,
        size: c.unitsSold,
        profit: c.profit,
      })),
    [categoryMetrics]
  );

  const latestMonth = monthlyMetrics[monthlyMetrics.length - 1];
  const hasActiveFilters =
    filters.countries.length > 0 ||
    filters.categories.length > 0 ||
    Boolean(filters.startDate) ||
    Boolean(filters.endDate);

  return (
    <div className="space-y-5">
      {/* Quick Filters Toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-[140px] flex-1 sm:flex-initial">
          <label
            htmlFor="overview-country-filter"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Country
          </label>
          <select
            id="overview-country-filter"
            value={filters.countries[0] ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                countries: e.target.value ? [e.target.value] : [],
              }))
            }
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Countries ({availableCountries.length})</option>
            {availableCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[160px] flex-1 sm:flex-initial">
          <label
            htmlFor="overview-category-filter"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Category
          </label>
          <select
            id="overview-category-filter"
            value={filters.categories[0] ?? ''}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                categories: e.target.value ? [e.target.value] : [],
              }))
            }
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">All Categories ({availableCategories.length})</option>
            {availableCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="min-w-[130px] flex-1 sm:flex-initial">
          <label
            htmlFor="overview-start-date"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            Start Date
          </label>
          <input
            id="overview-start-date"
            type="date"
            value={filters.startDate}
            min={dateBounds.minDate}
            max={dateBounds.maxDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, startDate: e.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        <div className="min-w-[130px] flex-1 sm:flex-initial">
          <label
            htmlFor="overview-end-date"
            className="block text-xs font-medium text-slate-600 dark:text-slate-400"
          >
            End Date
          </label>
          <input
            id="overview-end-date"
            type="date"
            value={filters.endDate}
            min={dateBounds.minDate}
            max={dateBounds.maxDate}
            onChange={(e) => setFilters((prev) => ({ ...prev, endDate: e.target.value }))}
            className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        )}
      </div>

      {/* 4 Core KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Revenue"
          value={formatCurrency(kpis.totalRevenue, settings.currency)}
          detail={`${formatNumber(kpis.orderCount)} distinct orders · AOV ${formatCurrency(
            kpis.averageOrderValue,
            settings.currency
          )}`}
        />
        <KpiCard
          label="Total Units Sold"
          value={formatNumber(kpis.totalUnitsSold)}
          detail={`${formatNumber(kpis.recordCount)} line items · ${(
            kpis.totalUnitsSold / Math.max(1, kpis.recordCount)
          ).toFixed(1)} avg units/order`}
        />
        <KpiCard
          label="Total Profit"
          value={formatCurrency(kpis.totalProfit, settings.currency)}
          detail={`Total Cost ${formatCurrency(kpis.totalCost, settings.currency)}`}
          tone="positive"
        />
        <KpiCard
          label="Profit Percentage"
          value={formatPercent(kpis.profitPercentage)}
          detail={
            latestMonth && latestMonth.momGrowthPct !== null
              ? `Latest month MoM: ${latestMonth.momGrowthPct >= 0 ? '+' : ''}${latestMonth.momGrowthPct}%`
              : `Markup: ${formatPercent(kpis.markupPercentage)}`
          }
          tone={kpis.profitPercentage >= 35 ? 'positive' : 'warning'}
        />
      </div>

      {filteredRecords.length === 0 ? (
        <EmptyState
          title="No matching sales records"
          description="The current filter selection returned zero rows. Reset filters to view all sales performance metrics."
          actionLabel="Reset Quick Filters"
          onAction={resetFilters}
        />
      ) : (
        <>
          {/* Row 1: Country Revenue & Profit Bar + Category Units Donut */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <SectionCard
              title="Country-wise Revenue and Profit"
              subtitle="Comparison across active regional markets"
              className="xl:col-span-7 min-w-0"
            >
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryMetrics} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                    <XAxis
                      dataKey="country"
                      tick={{ fill: tickColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      angle={-18}
                      textAnchor="end"
                      height={48}
                    />
                    <YAxis
                      tick={{ fill: tickColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => formatCurrency(Number(value), settings.currency)}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="profit" name="Profit" fill="#0D9488" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard
              title="Units Sold by Product Category"
              subtitle="Share of total volume across categories"
              className="xl:col-span-5 min-w-0"
            >
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryMetrics}
                      dataKey="unitsSold"
                      nameKey="category"
                      cx="50%"
                      cy="45%"
                      innerRadius={56}
                      outerRadius={86}
                      paddingAngle={2}
                    >
                      {categoryMetrics.map((entry, idx) => (
                        <Cell
                          key={entry.category}
                          fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val, name) => [`${formatNumber(Number(val))} units`, String(name)]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* Row 2: Month-wise Revenue and Profit Area Chart */}
          <SectionCard
            title="Month-wise Revenue and Profit Trend"
            subtitle="Time-series performance across reporting periods"
            className="min-w-0"
          >
            <div className="h-72 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyMetrics} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1D4ED8" stopOpacity={0.22} />
                      <stop offset="95%" stopColor="#1D4ED8" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="profGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.24} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: tickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: tickColor, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value) => formatCurrency(Number(value), settings.currency)}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    name="Revenue"
                    stroke="#1D4ED8"
                    strokeWidth={2}
                    fill="url(#revGrad)"
                  />
                  <Area
                    type="monotone"
                    dataKey="profit"
                    name="Profit"
                    stroke="#0D9488"
                    strokeWidth={2}
                    fill="url(#profGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          {/* Row 3: Category-wise Product Profits (Horizontal Bar) + Category-wise Products Sold (Treemap) */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
            <SectionCard
              title="Category-wise Product Profits"
              subtitle="Net profit contribution ranked by category"
              className="xl:col-span-6 min-w-0"
            >
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={categoryMetrics}
                    layout="vertical"
                    margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                    <XAxis
                      type="number"
                      tick={{ fill: tickColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => `$${Math.round(v / 1000)}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="category"
                      width={136}
                      tick={{ fill: tickColor, fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => formatCurrency(Number(value), settings.currency)}
                    />
                    <Bar dataKey="profit" name="Profit" fill="#0D9488" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </SectionCard>

            <SectionCard
              title="Category-wise Products Sold (Treemap)"
              subtitle="Proportional unit volume distribution"
              className="xl:col-span-6 min-w-0"
            >
              <div className="h-72 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={treemapData}
                    dataKey="size"
                    aspectRatio={4 / 3}
                    stroke="#FFFFFF"
                    content={<CustomTreemapCell />}
                  >
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(value) => [`${formatNumber(Number(value))} units`, 'Units Sold']}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            </SectionCard>
          </div>

          {/* Row 4: Top-Performing Products + Best-Performing Countries */}
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <SectionCard
              title="Top-Performing Products"
              subtitle="Ranked by total revenue"
              className="min-w-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="py-2.5 pr-3 font-medium">Product</th>
                      <th className="py-2.5 px-2 text-right font-medium">Units</th>
                      <th className="py-2.5 px-2 text-right font-medium">Revenue</th>
                      <th className="py-2.5 pl-2 text-right font-medium">Margin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {productMetrics.slice(0, 6).map((p) => (
                      <tr key={`${p.productId}-${p.productName}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 pr-3">
                          <p className="font-medium text-slate-900 dark:text-slate-100">{p.productName}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {p.productId} · {p.category}
                          </p>
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                          {formatNumber(p.unitsSold)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(p.revenue, settings.currency)}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatPercent(p.profitMargin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            <SectionCard
              title="Best-Performing Countries"
              subtitle="Market leaderboard by revenue & profit"
              className="min-w-0"
            >
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                      <th className="py-2.5 pr-3 font-medium">Country</th>
                      <th className="py-2.5 px-2 text-right font-medium">Orders</th>
                      <th className="py-2.5 px-2 text-right font-medium">Revenue</th>
                      <th className="py-2.5 pl-2 text-right font-medium">Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {countryMetrics.slice(0, 6).map((c) => (
                      <tr key={c.country} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-2.5 pr-3 font-medium text-slate-900 dark:text-slate-100">
                          {c.country}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          {formatNumber(c.orderCount)}
                        </td>
                        <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                          {formatCurrency(c.revenue, settings.currency)}
                        </td>
                        <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(c.profit, settings.currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>
          </div>

          {/* Row 5: Recent Sales Transactions */}
          <SectionCard
            title="Recent Sales Transactions"
            subtitle="Most recent orders matching active filter scope"
            className="min-w-0"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                    <th className="py-2.5 pr-3 font-medium">Order ID</th>
                    <th className="py-2.5 px-2 font-medium">Date</th>
                    <th className="py-2.5 px-2 font-medium">Country</th>
                    <th className="py-2.5 px-2 font-medium">Product</th>
                    <th className="py-2.5 px-2 text-right font-medium">Units</th>
                    <th className="py-2.5 px-2 text-right font-medium">Revenue</th>
                    <th className="py-2.5 pl-2 text-right font-medium">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {recentTransactions.map((tx) => (
                    <tr key={`${tx.rowIndex}-${tx.orderId}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="py-2.5 pr-3 font-mono font-medium text-slate-900 dark:text-slate-100">
                        {tx.orderId}
                      </td>
                      <td className="py-2.5 px-2 font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {formatDateDisplay(tx.orderDate, settings.dateFormat)}
                      </td>
                      <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300">{tx.country}</td>
                      <td className="py-2.5 px-2 text-slate-700 dark:text-slate-300">
                        {tx.productName}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300">
                        {formatNumber(tx.unitsSold)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono tabular-nums font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(tx.revenue, settings.currency)}
                      </td>
                      <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                        {formatCurrency(tx.profit, settings.currency)}
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
