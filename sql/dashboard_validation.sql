-- =============================================================================
-- SalesIQ Source-to-Dashboard QA Reconciliation Queries (PostgreSQL)
-- =============================================================================

-- VAL-01..04: KPI Baseline Reconciliation
SELECT
    ROUND(SUM(revenue), 2) AS expected_total_revenue,
    SUM(units_sold) AS expected_total_units,
    ROUND(SUM(profit), 2) AS expected_total_profit,
    ROUND((SUM(profit) * 100.0) / NULLIF(SUM(revenue), 0), 2) AS expected_profit_margin_pct
FROM sales;

-- VAL-05: Country Aggregation Reconciliation Check
SELECT
    country_name,
    ROUND(SUM(revenue), 2) AS expected_revenue,
    ROUND(SUM(profit), 2) AS expected_profit
FROM sales
GROUP BY country_name
ORDER BY expected_revenue DESC;

-- VAL-07: Category Aggregation Reconciliation Check
SELECT
    product_category,
    SUM(units_sold) AS expected_units,
    ROUND(SUM(profit), 2) AS expected_profit
FROM sales
GROUP BY product_category
ORDER BY expected_profit DESC;

-- VAL-08: Monthly Trend Reconciliation Check
SELECT
    TO_CHAR(order_date, 'YYYY-MM') AS year_month,
    ROUND(SUM(revenue), 2) AS expected_revenue,
    ROUND(SUM(profit), 2) AS expected_profit
FROM sales
GROUP BY TO_CHAR(order_date, 'YYYY-MM')
ORDER BY year_month;

-- VAL-09 & VAL-10: Filtered Slice Reconciliation Example
SELECT
    ROUND(SUM(revenue), 2) AS expected_slice_revenue,
    ROUND(SUM(profit), 2) AS expected_slice_profit
FROM sales
WHERE country_name = 'United States'
  AND product_category = 'Cloud Infrastructure'
  AND order_date BETWEEN '2025-07-01' AND '2025-12-31';
