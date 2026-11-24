# SalesIQ Python Analytics & QA Validation Module

Independent Pandas-based data processing, aggregation, data quality auditing, Excel reporting, and dashboard reconciliation verification engine.

## Setup

```bash
cd python-analytics
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Run Automated Pytest Suite

```bash
pytest -v
```

## Run CLI Analysis & Export

```bash
python3 sales_analysis.py --input ../data/sales_clean.csv --export ../data/SalesIQ_Python_Report.xlsx
python3 data_validation.py --input ../data/sales_dirty.csv
python3 dashboard_validation.py --input ../data/sales_clean.csv
```
