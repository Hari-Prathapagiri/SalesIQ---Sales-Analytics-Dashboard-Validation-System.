-- =============================================================================
-- SalesIQ Sample Dimension Seed & CSV Bulk Load Instructions (PostgreSQL)
-- =============================================================================

INSERT INTO countries (country_name, region, currency_code) VALUES
  ('United States', 'North America', 'USD'),
  ('United Kingdom', 'Europe', 'GBP'),
  ('Germany', 'Europe', 'EUR'),
  ('Canada', 'North America', 'CAD'),
  ('Australia', 'APAC', 'AUD'),
  ('India', 'APAC', 'INR'),
  ('Singapore', 'APAC', 'SGD'),
  ('Japan', 'APAC', 'JPY')
ON CONFLICT (country_name) DO NOTHING;

INSERT INTO products (product_id, product_name, product_category, standard_unit_price) VALUES
  ('PRD-101', 'CloudCore Compute Node', 'Cloud Infrastructure', 1250.00),
  ('PRD-102', 'Elastic Storage Vault', 'Cloud Infrastructure', 680.00),
  ('PRD-103', 'Multi-Region Mesh Gateway', 'Cloud Infrastructure', 940.00),
  ('PRD-201', 'Enterprise ERP Core', 'Enterprise Software', 1850.00),
  ('PRD-202', 'Workflow Automation Suite', 'Enterprise Software', 790.00),
  ('PRD-203', 'Supply Chain Sync Pro', 'Enterprise Software', 1120.00),
  ('PRD-301', 'InsightStream BI Engine', 'Data Analytics Suites', 1420.00),
  ('PRD-302', 'Lakehouse Query Accelerator', 'Data Analytics Suites', 1640.00),
  ('PRD-303', 'Data Quality Auditor Pro', 'Data Analytics Suites', 980.00),
  ('PRD-401', 'ZeroTrust Identity Shield', 'Cybersecurity', 890.00),
  ('PRD-402', 'SIEM Threat Telemetry', 'Cybersecurity', 1360.00),
  ('PRD-403', 'Endpoint Vault Guard', 'Cybersecurity', 520.00),
  ('PRD-501', 'Edge Telemetry Appliance', 'Hardware & Edge', 1580.00),
  ('PRD-502', 'Rackmount Fiber Switch', 'Hardware & Edge', 1190.00),
  ('PRD-503', 'Smart Gateway Sensor Kit', 'Hardware & Edge', 430.00)
ON CONFLICT (product_id) DO NOTHING;

-- Populate dim_date for 2024-01-01 through 2025-12-31
INSERT INTO dim_date (date_key, full_date, year, quarter, month, month_name, year_month)
SELECT
  TO_CHAR(d, 'YYYYMMDD'),
  d::DATE,
  EXTRACT(YEAR FROM d)::INT,
  EXTRACT(QUARTER FROM d)::INT,
  EXTRACT(MONTH FROM d)::INT,
  TO_CHAR(d, 'Mon'),
  TO_CHAR(d, 'YYYY-MM')
FROM generate_series('2024-01-01'::DATE, '2025-12-31'::DATE, '1 day'::INTERVAL) AS d
ON CONFLICT (date_key) DO NOTHING;

-- Load 600 clean sales transactions from repository CSV using psql:
-- \copy sales(order_id, order_date, country_name, product_id, product_name, product_category, units_sold, unit_price, revenue, cost, profit) FROM 'data/sales_clean.csv' WITH (FORMAT csv, HEADER true);
