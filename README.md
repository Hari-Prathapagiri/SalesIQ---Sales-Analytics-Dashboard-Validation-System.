# SalesIQ – Sales Analytics & Dashboard Validation System

An enterprise-grade sales analytics, relational SQL validation, data quality monitoring, and automated QA reconciliation platform engineered for Data Analytics & Quality Engineering workflows.

## Key Capabilities

1. **Sales Overview Dashboard**: Real-time KPIs (Total Revenue, Total Units Sold, Total Profit, Profit Percentage), interactive Country Bar, Category Donut, Monthly Revenue/Profit Area, Category Profit Horizontal Bar, Category Treemap, Top Products, Best Countries, and Recent Transactions.
2. **Sales Data Management**: CSV upload, automatic column detection, data type inference, configurable column mapping, multi-column sorting, live search/filtering, and processed CSV download.
3. **Sales Analytics**: Deep-dive business metrics (AOV, Profit Margin %, MoM Growth %, Year-over-Year comparison, Country/Category/Product breakdowns) with multi-dimensional slicers.
4. **Dashboard Validation (QA Reconciliation)**: 12 independent QA validation rules reconciling UI metrics against in-browser SQLite SQL (`sql.js`) and fixed-point reference arithmetic, including expandable dimension-level drill-downs.
5. **SQL Analysis & Query Validation**: Relational star-schema SQLite console (`sales`, `products`, `countries`, `dim_date`) with 12 predefined analytical & audit queries, safe read-only query guardrails, and SQL-vs-Dashboard KPI comparisons.
6. **Data Quality Monitoring**: 10-rule row-level anomaly detector (Missing values, Duplicate Order IDs, Invalid dates, Negative units, Invalid price/cost, Revenue mismatches, Profit mismatches, Invalid country, Invalid category, Statistical IQR outliers) with failed-records CSV export.
7. **Reports & Exports**: Live 8-sheet Excel `.xlsx` workbook export, 8 focused CSV reports, and Power BI Star Schema CSV datasets (`fact_sales.csv`, `dim_products.csv`, `dim_countries.csv`, `dim_date.csv`).
8. **Settings & Documentation**: Light/Dark theme switcher, multi-currency formatting, date formatting, tolerance configuration, transparent business formulas, and Power BI Desktop setup + DAX guide.

## Repository Structure (`salesiq-analytics`)

```text
salesiq-analytics/
├── data/
│   ├── sales_clean.csv          # 600 verified clean transaction records (2024–2025)
│   └── sales_dirty.csv          # 540 records with 10 injected data quality anomaly types
├── docs/
│   └── powerbi-guide.md         # Step-by-step Power BI Desktop modeling & DAX guide
├── public/
│   ├── data/                    # Static CSV copies for client access
│   └── sql-wasm.wasm            # SQLite 3 WebAssembly binary for in-browser SQL
├── python-analytics/
│   ├── data_loader.py
│   ├── sales_analysis.py
│   ├── data_validation.py
│   ├── dashboard_validation.py
│   ├── test_sales_analysis.py
│   ├── test_data_validation.py
│   ├── test_dashboard_validation.py
│   ├── requirements.txt
│   └── README.md
├── sql/
│   ├── schema.sql
│   ├── sample_data.sql
│   ├── sales_analysis.sql
│   ├── dashboard_validation.sql
│   └── data_quality_checks.sql
├── src/
│   ├── components/
│   ├── context/
│   ├── data/
│   ├── lib/
│   ├── pages/
│   ├── tests/salesiq.test.ts
│   └── types/
├── index.html
├── package.json
└── vite.config.ts
```

## Quick Start (Web App & Automated Tests)

```bash
npm install
npm run dev       # Starts Vite development server on port 3000
npm test          # Runs Vitest automated suite
npm run lint      # Runs TypeScript type checking
npm run build     # Builds production bundle into dist/
```

## Python Analytics & Pytest

```bash
cd python-analytics
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
pytest -v
```

## PostgreSQL Setup

```bash
createdb salesiq
psql -d salesiq -f sql/schema.sql
psql -d salesiq -f sql/sample_data.sql
psql -d salesiq -c "\copy sales(order_id, order_date, country_name, product_id, product_name, product_category, units_sold, unit_price, revenue, cost, profit) FROM 'data/sales_clean.csv' WITH (FORMAT csv, HEADER true);"
psql -d salesiq -f sql/dashboard_validation.sql
```

## GitHub Upload Instructions

```bash
git init
git add .
git commit -m "Initial commit: SalesIQ Sales Analytics & Dashboard Validation System"
git branch -M main
git remote add origin https://github.com/<your-username>/salesiq-analytics.git
git push -u origin main
```

## Deployment Instructions

- **Static / Cloud Run / Vercel / Netlify**: Run `npm run build` and deploy the `dist/` directory (`dist/sql-wasm.wasm` is automatically included from `public/`). Ensure SPA routing serves `index.html` and no secrets are stored in client environment variables.
