"""Pytest unit tests for SalesIQ Independent Dashboard QA Validation."""

from pathlib import Path
from data_loader import coerce_and_clean_sales, load_sales_csv
from sales_analysis import compute_kpis
from dashboard_validation import validate_dashboard_metrics

DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def test_dashboard_validation_passes_on_clean_data():
    raw = load_sales_csv(DATA_DIR / "sales_clean.csv")
    clean = coerce_and_clean_sales(raw, drop_invalid=True)
    kpis = compute_kpis(clean)

    results = validate_dashboard_metrics(clean, kpis)
    assert len(results) >= 8
    assert all(r["passed"] for r in results)


def test_dashboard_validation_flags_kpi_drift():
    raw = load_sales_csv(DATA_DIR / "sales_clean.csv")
    clean = coerce_and_clean_sales(raw, drop_invalid=True)
    drifted_kpis = compute_kpis(clean)
    drifted_kpis["total_revenue"] += 500.0

    results = validate_dashboard_metrics(clean, drifted_kpis)
    rev_check = next(r for r in results if r["id"] == "VAL-01")
    assert rev_check["passed"] is False
    assert rev_check["difference"] == 500.0
