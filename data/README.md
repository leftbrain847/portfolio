# Synthetic data

CSVs for the synthetic health system data warehouse. File name = table name (same rule as `code/create_db.py`).

Regenerate them with:

```sh
python3 data/generate_synthetic_data.py
```

| File | Contents |
|---|---|
| `FactCardiacEvents.csv` | One row per patient intake |
| `DimClinician.csv` | Clinicians and their hospital |
| `DimLocation.csv` | Hospitals |
| `DimComplaint.csv` | Presenting complaints |
| `DimDx.csv` | Diagnoses |
| `DimDxDomains.csv` | Diagnosis value sets |

The SQL and dashboard pages load these in the browser with DuckDB; nothing needs to be built.
