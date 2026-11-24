-- =============================================================================
-- SalesIQ Business & Analytical SQL Queries (PostgreSQL Compatible)
-- =============================================================================

-- 1. Core Executive KPIs
SELECT
    COUNT(*) AS total_records,
    COUNT(DISTINCT order_id) AS distinct_orders,
    SUM(units_sold) AS total_units_sold,
    ROUND(SUM(revenue), 2) AS total_revenue,
    ROUND(SUM(cost), 2) AS total_cost,
    ROUND(SUM(profit), 2) AS total_profit,
    ROUND((SUM(profit) * 100.0) / NULLIF(SUM(revenue), 0), 2) AS profit_margin_pct,
    ROUND(SUM(revenue) / NULLIF(COUNT(DISTINCT order_id), 0), 2) AS average_order_value
FROM sales;

-- 2. Country-wise Revenue, Profit, and Margin
SELECT
    c.country_name,
    c.region,
    COUNT(DISTINCT s.order_id) AS orders,
    SUM(s.units_sold) AS units_sold,
    ROUND(SUM(s.revenue), 2) AS revenue,
    ROUND(SUM(s.profit), 2) AS profit,
    ROUND((SUM(s.profit) * 100.0) / NULLIF(SUM(s.revenue), 0), 2) AS profit_margin_pct
FROM sales s
JOIN countries c ON s.country_name = c.country_name
GROUP BY c.country_name, c.region
ORDER BY revenue DESC;

-- 3. Category-wise Profit & Unit Share
SELECT
    p.product_category,
    SUM(s.units_sold) AS units_sold,
    ROUND(SUM(s.revenue), 2) AS revenue,
    ROUND(SUM(s.profit), 2) AS profit,
    ROUND((SUM(s.profit) * 100.0) / NULLIF(SUM(s.revenue), 0), 2) AS profit_margin_pct
FROM sales s
JOIN products p ON s.product_id = p.product_id
GROUP BY p.product_category
ORDER BY profit DESC;

-- 4. Top 10 Products by Revenue
SELECT
    s.product_id,
    s.product_name,
    s.product_category,
    SUM(s.units_sold) AS units_sold,
    ROUND(SUM(s.revenue), 2) AS revenue,
    ROUND(SUM(s.profit), 2) AS profit
FROM sales s
GROUP BY s.product_id, s.product_name, s.product_category
ORDER BY revenue DESC
LIMIT 10;

-- 5. Monthly Revenue Trend & MoM Growth %
WITH monthly AS (
    SELECT
        d.year_month,
        SUM(s.units_sold) AS units_sold,
        ROUND(SUM(s.revenue), 2) AS revenue,
        ROUND(SUM(s.profit), 2) AS profit
    FROM sales s
    JOIN dim_date d ON s.order_date = d.full_date
    GROUP BY d.year_month
)
SELECT
    year_month,
    units_sold,
    revenue,
    profit,
    ROUND(
        ((revenue - LAG(revenue) OVER (ORDER BY year_month)) * 100.0)
        / NULLIF(LAG(revenue) OVER (ORDER BY year_month), 0),
        2
    ) AS mom_growth_pct
FROM monthly
ORDER BY year_month;
