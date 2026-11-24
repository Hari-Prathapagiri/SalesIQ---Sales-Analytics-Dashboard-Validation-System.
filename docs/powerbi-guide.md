# SalesIQ Power BI Desktop Implementation Guide

> **Transparency Note**: SalesIQ does **not** claim to generate a binary `.pbix` file. Instead, it exports Power BI-ready Star Schema CSV datasets (`fact_sales.csv`, `dim_products.csv`, `dim_countries.csv`, `dim_date.csv`), SQL definitions, and verified DAX measures so you can build and validate the report in Power BI Desktop.

## 1. Exporting Star Schema Datasets from SalesIQ

1. Open **Reports & Exports** (Page 7) inside the SalesIQ web app.
2. Under **Power BI-Ready Star Schema CSV Datasets**, download:
   - `fact_sales.csv`
   - `dim_products.csv`
   - `dim_countries.csv`
   - `dim_date.csv`

## 2. Importing into Power BI Desktop

1. Open Power BI Desktop → **Home** → **Get Data** → **Text/CSV**.
2. Load each of the four CSV files into Power Query Editor.
3. Verify column data types:
   - `fact_sales`: `DateKey` (Text), `Order Date` (Date), `Units Sold` (Whole Number), `Unit Price` / `Revenue` / `Cost` / `Profit` (Fixed Decimal Number).
   - `dim_date`: `DateKey` (Text), `Date` (Date), `Year` / `MonthNumber` (Whole Number).
4. Click **Close & Apply**.

## 3. Star Schema Relationships

In **Model View**, establish 1-to-Many single-direction relationships:
- `dim_date[DateKey]` (1) → `fact_sales[DateKey]` (*)
- `dim_products[Product ID]` (1) → `fact_sales[Product ID]` (*)
- `dim_countries[Country]` (1) → `fact_sales[Country]` (*)

Right-click `dim_date` → **Mark as date table** → select `dim_date[Date]`.

## 4. Core DAX Measures

Create a dedicated `_Measures` table and define:

```dax
Total Revenue = SUM(fact_sales[Revenue])

Total Units Sold = SUM(fact_sales[Units Sold])

Total Profit = SUM(fact_sales[Profit])

Profit Margin % =
DIVIDE([Total Profit], [Total Revenue], 0) * 100

Average Order Value =
DIVIDE([Total Revenue], DISTINCTCOUNT(fact_sales[Order ID]), 0)
```

## 5. Visual Layout Setup

- **KPI Cards**: `Total Revenue`, `Total Units Sold`, `Total Profit`, `Profit Margin %`
- **Clustered Column/Bar Chart**: Axis = `dim_countries[Country]`, Values = `[Total Revenue]`, `[Total Profit]`
- **Donut Chart**: Legend = `dim_products[Product Category]`, Values = `[Total Units Sold]`
- **Area Chart**: X-Axis = `dim_date[YearMonth]`, Values = `[Total Revenue]`, `[Total Profit]`
- **Horizontal Bar Chart**: Y-Axis = `dim_products[Product Category]`, X-Axis = `[Total Profit]`
- **Treemap**: Category = `dim_products[Product Category]`, Values = `[Total Units Sold]`
- **Slicers**: `dim_date[Date]` (Between), `dim_countries[Country]`, `dim_products[Product Category]`

## 6. QA Reconciliation Against SQL & Python

Compare every Power BI visual card and matrix total against SalesIQ's **Dashboard Validation** (Page 4) and `sql/dashboard_validation.sql` or `python-analytics/dashboard_validation.py`.
