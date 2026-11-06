# Synthetic data

Put the synthetic data warehouse CSVs here. File name = table name (same rule as `code/create_db.py`):

| File | Used for |
|---|---|
| `FactCardiacEvents.csv` | One row per patient intake |
| `DimClinician.csv` | Clinician names (`ClinicianID` → `ClinicianName`) |
| `DimComplaint.csv` | Presenting complaint descriptions |
| `DimDx.csv` | Primary diagnosis descriptions |
| `DimDxDomains.csv` | Diagnosis value sets |

The SQL and dashboard pages load these in the browser with DuckDB; nothing else needs to be built.
