-- =============================================================================
-- SalesIQ PostgreSQL-Compatible Relational Schema
-- =============================================================================

CREATE TABLE IF NOT EXISTS countries (
    country_id      SERIAL PRIMARY KEY,
    country_name    VARCHAR(100) UNIQUE NOT NULL,
    region          VARCHAR(60) NOT NULL,
    currency_code   CHAR(3) NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    product_id          VARCHAR(20) PRIMARY KEY,
    product_name        VARCHAR(150) NOT NULL,
    product_category    VARCHAR(100) NOT NULL,
    standard_unit_price NUMERIC(12, 2) NOT NULL CHECK (standard_unit_price > 0)
);

CREATE TABLE IF NOT EXISTS dim_date (
    date_key    CHAR(8) PRIMARY KEY,
    full_date   DATE UNIQUE NOT NULL,
    year        INTEGER NOT NULL,
    quarter     INTEGER NOT NULL,
    month       INTEGER NOT NULL,
    month_name  VARCHAR(15) NOT NULL,
    year_month  CHAR(7) NOT NULL
);

CREATE TABLE IF NOT EXISTS sales (
    row_id              SERIAL PRIMARY KEY,
    order_id            VARCHAR(40) NOT NULL,
    order_date          DATE NOT NULL,
    country_name        VARCHAR(100) NOT NULL REFERENCES countries(country_name),
    product_id          VARCHAR(20) NOT NULL REFERENCES products(product_id),
    product_name        VARCHAR(150) NOT NULL,
    product_category    VARCHAR(100) NOT NULL,
    units_sold          INTEGER NOT NULL,
    unit_price          NUMERIC(12, 2) NOT NULL,
    revenue             NUMERIC(14, 2) NOT NULL,
    cost                NUMERIC(14, 2) NOT NULL,
    profit              NUMERIC(14, 2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sales_order_date ON sales(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_country ON sales(country_name);
CREATE INDEX IF NOT EXISTS idx_sales_category ON sales(product_category);
CREATE INDEX IF NOT EXISTS idx_sales_order_id ON sales(order_id);
