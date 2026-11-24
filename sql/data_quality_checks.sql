-- =============================================================================
-- SalesIQ Data Quality Audit Queries (PostgreSQL)
-- =============================================================================

-- DQ-01: Duplicate Order ID Detection
SELECT
    order_id,
    COUNT(*) AS duplicate_count,
    ROUND(SUM(revenue), 2) AS total_revenue_impact
FROM sales
GROUP BY order_id
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- DQ-02: Arithmetic Revenue & Profit Mismatch Detection
SELECT
    row_id,
    order_id,
    units_sold,
    unit_price,
    revenue,
    ROUND(units_sold * unit_price, 2) AS expected_revenue,
    cost,
    profit,
    ROUND(revenue - cost, 2) AS expected_profit
FROM sales
WHERE ABS(revenue - ROUND(units_sold * unit_price, 2)) > 0.02
   OR ABS(profit - ROUND(revenue - cost, 2)) > 0.02;

-- DQ-03: Non-Positive Units or Invalid Price/Cost Checks
SELECT
    row_id,
    order_id,
    units_sold,
    unit_price,
    cost
FROM sales
WHERE units_sold <= 0
   OR unit_price <= 0
   OR cost < 0;

-- DQ-04: Referential Country / Category Completeness Audit
SELECT
    s.row_id,
    s.order_id,
    s.country_name,
    s.product_category
FROM sales s
LEFT JOIN countries c ON s.country_name = c.country_name
WHERE c.country_name IS NULL
   OR TRIM(s.product_category) = '';
