"""SalesIQ Pandas Analytical Engine & Excel Workbook Exporter."""

from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Dict
import numpy as np
import pandas as pd

from data_loader import coerce_and_clean_sales, load_sales_csv


def compute_kpis(df: pd.DataFrame) -> Dict[str, Any]:
    """Compute core business KPIs safely handling zero denominators."""
    if df.empty:
        return {
            "total_revenue": 0.0,
            "total_cost": 0.0,
            "total_profit": 0.0,
            "profit_margin_pct": 0.0,
            "markup_pct": 0.0,
            "total_units_sold": 0,
            "order_count": 0,
            "record_count": 0,
            "average_order_value": 0.0,
        }

    total_revenue = round(float(df["Revenue"].sum()), 2)
    total_cost = round(float(df["Cost"].sum()), 2)
    total_profit = round(float(df["Profit"].sum()), 2)
    total_units = int(df["Units Sold"].sum())
    order_count = int(df["Order ID"].nunique())
    record_count = int(len(df))

    profit_margin_pct = round((total_profit / total_revenue) * 100.0, 2) if total_revenue else 0.0
    markup_pct = round((total_profit / total_cost) * 100.0, 2) if total_cost else 0.0
    aov = round(total_revenue / order_count, 2) if order_count else 0.0

    return {
        "total_revenue": total_revenue,
        "total_cost": total_cost,
        "total_profit": total_profit,
        "profit_margin_pct": profit_margin_pct,
        "markup_pct": markup_pct,
        "total_units_sold": total_units,
        "order_count": order_count,
        "record_count": record_count,
        "average_order_value": aov,
    }


def aggregate_by_country(df: pd.DataFrame) -> pd.DataFrame:
    grouped = (
        df.groupby("Country", as_index=False)
        .agg(
            orders=("Order ID", "nunique"),
            units_sold=("Units Sold", "sum"),
            revenue=("Revenue", "sum"),
            cost=("Cost", "sum"),
            profit=("Profit", "sum"),
        )
        .sort_values("revenue", ascending=False)
    )
    grouped["revenue"] = grouped["revenue"].round(2)
    grouped["cost"] = grouped["cost"].round(2)
    grouped["profit"] = grouped["profit"].round(2)
    grouped["profit_margin_pct"] = np.where(
        grouped["revenue"] > 0, (grouped["profit"] / grouped["revenue"] * 100.0).round(2), 0.0
    )
    return grouped.reset_index(drop=True)


def aggregate_by_category(df: pd.DataFrame) -> pd.DataFrame:
    grouped = (
        df.groupby("Product Category", as_index=False)
        .agg(
            orders=("Order ID", "nunique"),
            units_sold=("Units Sold", "sum"),
            revenue=("Revenue", "sum"),
            cost=("Cost", "sum"),
            profit=("Profit", "sum"),
        )
        .sort_values("profit", ascending=False)
    )
    grouped["revenue"] = grouped["revenue"].round(2)
    grouped["cost"] = grouped["cost"].round(2)
    grouped["profit"] = grouped["profit"].round(2)
    grouped["profit_margin_pct"] = np.where(
        grouped["revenue"] > 0, (grouped["profit"] / grouped["revenue"] * 100.0).round(2), 0.0
    )
    return grouped.reset_index(drop=True)


def aggregate_by_product(df: pd.DataFrame) -> pd.DataFrame:
    grouped = (
        df.groupby(["Product ID", "Product Name", "Product Category"], as_index=False)
        .agg(
            orders=("Order ID", "nunique"),
            units_sold=("Units Sold", "sum"),
            revenue=("Revenue", "sum"),
            cost=("Cost", "sum"),
            profit=("Profit", "sum"),
        )
        .sort_values("revenue", ascending=False)
    )
    grouped["revenue"] = grouped["revenue"].round(2)
    grouped["cost"] = grouped["cost"].round(2)
    grouped["profit"] = grouped["profit"].round(2)
    grouped["profit_margin_pct"] = np.where(
        grouped["revenue"] > 0, (grouped["profit"] / grouped["revenue"] * 100.0).round(2), 0.0
    )
    return grouped.reset_index(drop=True)


def aggregate_monthly(df: pd.DataFrame) -> pd.DataFrame:
    dated = df[df["Order Date Parsed"].notna()].copy()
    dated["year_month"] = dated["Order Date Parsed"].dt.strftime("%Y-%m")
    grouped = (
        dated.groupby("year_month", as_index=False)
        .agg(
            orders=("Order ID", "nunique"),
            units_sold=("Units Sold", "sum"),
            revenue=("Revenue", "sum"),
            profit=("Profit", "sum"),
        )
        .sort_values("year_month")
    )
    grouped["revenue"] = grouped["revenue"].round(2)
    grouped["profit"] = grouped["profit"].round(2)
    grouped["mom_growth_pct"] = (grouped["revenue"].pct_change() * 100.0).round(2)
    return grouped.reset_index(drop=True)


def export_excel_report(df: pd.DataFrame, output_path: str | Path) -> Path:
    """Export multi-sheet Excel report using Pandas and openpyxl."""
    out = Path(output_path)
    kpis = compute_kpis(df)
    summary_df = pd.DataFrame([{"Metric": k, "Value": v} for k, v in kpis.items()])

    with pd.ExcelWriter(out, engine="openpyxl") as writer:
        summary_df.to_excel(writer, sheet_name="Executive Summary", index=False)
        df.drop(columns=["Order Date Parsed"], errors="ignore").to_excel(
            writer, sheet_name="Sales Transactions", index=False
        )
        aggregate_by_country(df).to_excel(writer, sheet_name="Country Analysis", index=False)
        aggregate_by_category(df).to_excel(writer, sheet_name="Category Analysis", index=False)
        aggregate_by_product(df).to_excel(writer, sheet_name="Product Analysis", index=False)
        aggregate_monthly(df).to_excel(writer, sheet_name="Monthly Trends", index=False)
    return out


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run SalesIQ Python Sales Analysis")
    parser.add_argument("--input", required=True, help="Path to sales CSV")
    parser.add_argument("--export", required=False, help="Optional XLSX output path")
    args = parser.parse_args()

    raw_df = load_sales_csv(args.input)
    clean_df = coerce_and_clean_sales(raw_df, drop_invalid=True)
    print("KPIs:", compute_kpis(clean_df))
    if args.export:
        out_file = export_excel_report(clean_df, args.export)
        print(f"Exported Excel workbook to {out_file}")
