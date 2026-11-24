"""Pytest unit tests for SalesIQ Python Sales Analysis."""

from pathlib import Path
import pandas as pd

from data_loader import coerce_and_clean_sales, load_sales_csv
from sales_analysis import (
    aggregate_by_category,
    aggregate_by_country,
    aggregate_by_product,
    aggregate_monthly,
    compute_kpis,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def test_clean_dataset_loading_and_kpis():
    raw = load_sales_csv(DATA_DIR / "sales_clean.csv")
    assert len(raw) >= 500
    clean = coerce_and_clean_sales(raw, drop_invalid=True)
    assert len(clean) == len(raw)

    kpis = compute_kpis(clean)
    assert kpis["total_revenue"] > 0
    assert kpis["total_profit"] > 0
    assert kpis["total_units_sold"] > 0
    assert 0 < kpis["profit_margin_pct"] < 100
    assert kpis["average_order_value"] > 0


def test_zero_revenue_safe_division():
    empty_df = pd.DataFrame(
        columns=["Order ID", "Order Date", "Country", "Product ID", "Product Name", "Product Category", "Units Sold", "Unit Price", "Revenue", "Cost", "Profit"]
    )
    kpis = compute_kpis(empty_df)
    assert kpis["profit_margin_pct"] == 0.0
    assert kpis["average_order_value"] == 0.0


def test_aggregations_sum_to_totals():
    raw = load_sales_csv(DATA_DIR / "sales_clean.csv")
    clean = coerce_and_clean_sales(raw, drop_invalid=True)
    kpis = compute_kpis(clean)

    country_df = aggregate_by_country(clean)
    category_df = aggregate_by_category(clean)
    product_df = aggregate_by_product(clean)
    monthly_df = aggregate_monthly(clean)

    assert abs(country_df["revenue"].sum() - kpis["total_revenue"]) < 0.05
    assert abs(category_df["profit"].sum() - kpis["total_profit"]) < 0.05
    assert abs(product_df["revenue"].sum() - kpis["total_revenue"]) < 0.05
    assert abs(monthly_df["revenue"].sum() - kpis["total_revenue"]) < 0.05
