# jimtitusportfolio.com

Data analytics portfolio built on a synthetic health system data warehouse. A plain static site served by GitHub Pages: no build step, no paid tools.

## How it works

- **Dashboard and SQL results** run in the visitor's browser: [DuckDB-WASM](https://duckdb.org/docs/api/wasm/overview) loads the CSVs in `data/` and runs the SQL in `queries/`. Charts use [ECharts](https://echarts.apache.org/).
- **Code pages** display the files in `code/` with syntax highlighting.
- **ER diagram** is written in [Mermaid](https://mermaid.js.org/) inside `er-diagram.html`.

## Layout

| Path | What |
|---|---|
| `code/` | Original project code: `Analysis.sql` (SQL Server) and `create_db.py` |
| `queries/` | DuckDB versions of the analysis, run live on the site |
| `data/` | Synthetic data CSVs (see `data/README.md`) |
| `assets/` | Site CSS and JavaScript |
| `*.html` | One file per page |

## Run locally

```sh
python3 -m http.server 8000   # then open http://localhost:8000
```
