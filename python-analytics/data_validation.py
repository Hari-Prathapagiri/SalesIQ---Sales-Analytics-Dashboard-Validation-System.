"""SalesIQ Data Quality Validation Module."""

from __future__ import annotations

import argparse
from typing import Any, Dict, List
import pandas as pd

from data_loader import load_sales_csv

VALID_COUNTRIES = {
    "United States",
    "United Kingdom",
    "Germany",
    "Canada",
    "Australia",
    "India",
    "Singapore",
    "Japan",
}

VALID_CATEGORIES = {
    "Cloud Infrastructure",
    "Enterprise Software",
    "Data Analytics Suites",
    "Cybersecurity",
    "Hardware & Edge",
}


def validate_data_quality(df: pd.DataFrame, tolerance: float = 0.02) -> Dict[str, Any]:
    """Run 10 automated data quality checks across raw string DataFrame rows."""
    issues: List[Dict[str, Any]] = []
    failed_rows = set()

    order_counts = df["Order ID"].astype(str).str.strip().value_counts().to_dict()

    revenues_num = pd.to_numeric(df["Revenue"], errors="coerce").dropna()
    revenues_pos = revenues_num[revenues_num > 0]
    if len(revenues_pos) >= 8:
        q1, q3 = revenues_pos.quantile(0.25), revenues_pos.quantile(0.75)
        outlier_fence = max(float(q3 + 3.5 * (q3 - q1)), 60000.0)
    else:
        outlier_fence = 100000.0

    for idx, row in df.iterrows():
        row_num = int(idx) + 1
        oid = str(row.get("Order ID", "")).strip()
        odate = str(row.get("Order Date", "")).strip()
        country = str(row.get("Country", "")).strip()
        pname = str(row.get("Product Name", "")).strip()
        cat = str(row.get("Product Category", "")).strip()

        def add_issue(category: str, severity: str, field: str, observed: str, rule: str) -> None:
            failed_rows.add(row_num)
            issues.append(
                {
                    "row_index": row_num,
                    "order_id": oid or f"(Row {row_num})",
                    "category": category,
                    "severity": severity,
                    "field": field,
                    "observed_value": observed or "(empty)",
                    "expected_rule": rule,
                }
            )

        if not oid:
            add_issue("Missing Value", "Critical", "Order ID", oid, "Non-empty Order ID required")
        elif order_counts.get(oid, 0) > 1:
            add_issue("Duplicate Order ID", "Critical", "Order ID", oid, "Unique Order ID required")

        if not pname:
            add_issue("Missing Value", "Critical", "Product Name", pname, "Product Name required")

        if not country:
            add_issue("Missing Value", "Critical", "Country", country, "Country required")
        elif country not in VALID_COUNTRIES:
            add_issue("Invalid Country", "Warning", "Country", country, "Must match approved country registry")

        if not cat:
            add_issue("Missing Value", "Critical", "Product Category", cat, "Product Category required")
        elif cat not in VALID_CATEGORIES:
            add_issue("Invalid Product Category", "Warning", "Product Category", cat, "Unrecognized category")

        parsed_date = pd.to_datetime(odate, format="%Y-%m-%d", errors="coerce")
        if pd.isna(parsed_date):
            add_issue("Invalid Date", "Critical", "Order Date", odate, "Valid YYYY-MM-DD date required")

        units = pd.to_numeric(row.get("Units Sold", ""), errors="coerce")
        price = pd.to_numeric(row.get("Unit Price", ""), errors="coerce")
        rev = pd.to_numeric(row.get("Revenue", ""), errors="coerce")
        cost = pd.to_numeric(row.get("Cost", ""), errors="coerce")
        prof = pd.to_numeric(row.get("Profit", ""), errors="coerce")

        if pd.isna(units):
            add_issue("Missing Value", "Critical", "Units Sold", str(row.get("Units Sold", "")), "Numeric Units required")
        elif units <= 0:
            add_issue("Negative or Zero Units", "Critical", "Units Sold", str(units), "Units Sold > 0 required")

        if pd.isna(price):
            add_issue("Missing Value", "Critical", "Unit Price", str(row.get("Unit Price", "")), "Numeric Unit Price required")
        elif price <= 0:
            add_issue("Invalid Price or Cost", "Critical", "Unit Price", str(price), "Unit Price > 0 required")

        if pd.isna(cost):
            add_issue("Missing Value", "Critical", "Cost", str(row.get("Cost", "")), "Numeric Cost required")
        elif cost < 0:
            add_issue("Invalid Price or Cost", "Critical", "Cost", str(cost), "Cost >= 0 required")

        if pd.isna(rev):
            add_issue("Missing Value", "Critical", "Revenue", str(row.get("Revenue", "")), "Numeric Revenue required")
        elif pd.notna(units) and pd.notna(price) and units > 0 and price > 0:
            expected_rev = round(float(units) * float(price), 2)
            if abs(float(rev) - expected_rev) > tolerance:
                add_issue(
                    "Incorrect Revenue Calculation",
                    "Critical",
                    "Revenue",
                    f"{rev:.2f}",
                    f"Expected Units * Unit Price = {expected_rev:.2f}",
                )

        if pd.isna(prof):
            add_issue("Missing Value", "Critical", "Profit", str(row.get("Profit", "")), "Numeric Profit required")
        elif pd.notna(rev) and pd.notna(cost):
            expected_prof = round(float(rev) - float(cost), 2)
            if abs(float(prof) - expected_prof) > tolerance:
                add_issue(
                    "Incorrect Profit Calculation",
                    "Critical",
                    "Profit",
                    f"{prof:.2f}",
                    f"Expected Revenue - Cost = {expected_prof:.2f}",
                )

        if pd.notna(rev) and float(rev) > outlier_fence:
            add_issue(
                "Statistical Outlier",
                "Warning",
                "Revenue",
                f"{rev:.2f}",
                f"Exceeds IQR fence {outlier_fence:.2f}",
            )

    total_checked = len(df)
    failed_count = len(failed_rows)
    passed_count = total_checked - failed_count
    score = round((passed_count / total_checked) * 100.0, 2) if total_checked else 100.0

    return {
        "total_records_checked": total_checked,
        "passed_records": passed_count,
        "failed_records": failed_count,
        "total_issues": len(issues),
        "quality_score": score,
        "issues": issues,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run SalesIQ Data Quality Audit")
    parser.add_argument("--input", required=True, help="Path to CSV file")
    args = parser.parse_args()

    raw = load_sales_csv(args.input)
    report = validate_data_quality(raw)
    print(
        f"Checked: {report['total_records_checked']}, Passed: {report['passed_records']}, "
        f"Failed: {report['failed_records']}, Score: {report['quality_score']}%"
    )
