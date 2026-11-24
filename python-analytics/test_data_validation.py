"""Pytest unit tests for SalesIQ Data Quality Monitoring."""

from pathlib import Path
from data_loader import load_sales_csv
from data_validation import validate_data_quality

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def test_clean_dataset_achieves_100_quality_score():
    raw = load_sales_csv(DATA_DIR / "sales_clean.csv")
    report = validate_data_quality(raw)
    assert report["total_records_checked"] == len(raw)
    assert report["failed_records"] == 0
    assert report["quality_score"] == 100.0


def test_dirty_dataset_detects_all_error_categories():
    raw = load_sales_csv(DATA_DIR / "sales_dirty.csv")
    report = validate_data_quality(raw)
    assert report["failed_records"] > 0
    assert report["quality_score"] < 100.0

    found_categories = {iss["category"] for iss in report["issues"]}
    expected_categories = {
        "Duplicate Order ID",
        "Missing Value",
        "Invalid Date",
        "Negative or Zero Units",
        "Incorrect Revenue Calculation",
        "Incorrect Profit Calculation",
        "Invalid Product Category",
        "Invalid Country",
        "Statistical Outlier",
    }
    assert expected_categories.issubset(found_categories)
