"""SalesIQ Data Loader & Cleaning Utilities."""

from __future__ import annotations

from pathlib import Path
from typing import Dict, Optional
import pandas as pd

REQUIRED_COLUMNS = [
    "Order ID",
    "Order Date",
    "Country",
    "Product ID",
    "Product Name",
    "Product Category",
    "Units Sold",
    "Unit Price",
    "Revenue",
    "Cost",
    "Profit",
]


def load_sales_csv(
    filepath: str | Path,
    column_mapping: Optional[Dict[str, str]] = None,
) -> pd.DataFrame:
    """Load a sales CSV file and optionally normalize column names."""
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"Sales CSV not found: {path}")

    df = pd.read_csv(path, dtype=str, keep_default_na=False)
    df.columns = [c.strip() for c in df.columns]

    if column_mapping:
        rename_map = {src: dst for dst, src in column_mapping.items() if src in df.columns}
        df = df.rename(columns=rename_map)

    return df


def coerce_and_clean_sales(df: pd.DataFrame, drop_invalid: bool = True) -> pd.DataFrame:
    """Coerce numeric and date columns, optionally dropping malformed or duplicate records."""
    cleaned = df.copy()

    for col in ["Order ID", "Order Date", "Country", "Product ID", "Product Name", "Product Category"]:
        if col in cleaned.columns:
            cleaned[col] = cleaned[col].astype(str).str.strip()

    numeric_cols = ["Units Sold", "Unit Price", "Revenue", "Cost", "Profit"]
    for col in numeric_cols:
        if col in cleaned.columns:
            cleaned[col] = pd.to_numeric(
                cleaned[col].astype(str).str.replace(r"[$,\s]", "", regex=True),
                errors="coerce",
            )

    cleaned["Order Date Parsed"] = pd.to_datetime(
        cleaned["Order Date"], format="%Y-%m-%d", errors="coerce"
    )

    if drop_invalid:
        valid_mask = (
            (cleaned["Order ID"] != "")
            & (cleaned["Country"] != "")
            & (cleaned["Product ID"] != "")
            & (cleaned["Product Name"] != "")
            & (cleaned["Product Category"] != "")
            & cleaned["Order Date Parsed"].notna()
            & (cleaned["Units Sold"] > 0)
            & (cleaned["Unit Price"] > 0)
            & cleaned["Revenue"].notna()
            & (cleaned["Cost"] >= 0)
            & cleaned["Profit"].notna()
        )
        cleaned = cleaned.loc[valid_mask].drop_duplicates(subset=["Order ID"], keep="first")

    cleaned["Revenue"] = cleaned["Revenue"].fillna(0.0).round(2)
    cleaned["Cost"] = cleaned["Cost"].fillna(0.0).round(2)
    cleaned["Profit"] = cleaned["Profit"].fillna(0.0).round(2)
    cleaned["Units Sold"] = cleaned["Units Sold"].fillna(0).astype(int)
    cleaned["Unit Price"] = cleaned["Unit Price"].fillna(0.0).round(2)

    return cleaned.reset_index(drop=True)
