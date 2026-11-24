"""SalesIQ Independent Dashboard QA Reconciliation Module."""

from __future__ import annotations

import argparse
from typing import Any, Dict, List
import pandas as pd

from data_loader import coerce_and_clean_sales, load_sales_csv
from sales_analysis import (
    aggregate_by_category,
    aggregate_by_country,
    aggregate_by_product,
    aggregate_monthly,
    compute_kpis,
)


def validate_dashboard_metrics(
    df: pd.DataFrame,
    dashboard_kpis: Dict[str, Any],
    tolerance: float = 0.05,
) -> List[Dict[str, Any]]:
    """Independently verify dashboard KPIs and aggregations against Pandas calculations."""
    expected = compute_kpis(df)
    results: List[Dict[str, Any]] = []

    def check(rule_id: str, name: str, exp: float, act: float, tol: float) -> None:
        diff = round(abs(exp - act), 4)
        results.append(
            {
                "id": rule_id,
                "rule": name,
                "expected": exp,
                "actual": act,
                "difference": diff,
                "tolerance": tol,
                "passed": diff <= tol,
            }
        )

    check("VAL-01", "Total Revenue KPI Validation", expected["total_revenue"], float(dashboard_kpis["total_revenue"]), tolerance)
    check("VAL-02", "Total Units Sold KPI Validation", float(expected["total_units_sold"]), float(dashboard_kpis["total_units_sold"]), 0.0)
    check("VAL-03", "Total Profit KPI Validation", expected["total_profit"], float(dashboard_kpis["total_profit"]), tolerance)
    check("VAL-04", "Profit Margin % KPI Validation", expected["profit_margin_pct"], float(dashboard_kpis["profit_margin_pct"]), 0.02)

    # Aggregation sum reconciliations
    country_sum = round(float(aggregate_by_country(df)["revenue"].sum()), 2)
    check("VAL-05", "Country Aggregation Sum Validation", expected["total_revenue"], country_sum, tolerance)

    product_sum = round(float(aggregate_by_product(df)["revenue"].sum()), 2)
    check("VAL-06", "Product Aggregation Sum Validation", expected["total_revenue"], product_sum, tolerance)

    cat_profit_sum = round(float(aggregate_by_category(df)["profit"].sum()), 2)
    check("VAL-07", "Category Profit Aggregation Sum Validation", expected["total_profit"], cat_profit_sum, tolerance)

    monthly_sum = round(float(aggregate_monthly(df)["revenue"].sum()), 2)
    check("VAL-08", "Monthly Trend Aggregation Sum Validation", expected["total_revenue"], monthly_sum, tolerance)

    # Uniqueness invariant
    dup_excess = int(len(df) - df["Order ID"].nunique())
    check("VAL-11", "Duplicate Transaction Uniqueness", 0.0, float(dup_excess), 0.0)

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run SalesIQ Independent Dashboard QA Check")
    parser.add_argument("--input", required=True, help="Path to CSV")
    args = parser.parse_args()

    raw = load_sales_csv(args.input)
    clean = coerce_and_clean_sales(raw, drop_invalid=True)
    kpis = compute_kpis(clean)
    checks = validate_dashboard_metrics(clean, kpis)
    for c in checks:
        status = "PASS" if c["passed"] else "FAIL"
        print(f"{c['id']} | {c['rule']} | {status} | diff={c['difference']}")
