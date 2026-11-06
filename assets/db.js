// Loads the CSVs in /data into DuckDB (running in the browser) and builds the
// ClinicianPerformance view from queries/base.sql.
import * as duckdb from 'https://cdn.jsdelivr.net/npm/@duckdb/duckdb-wasm@1.32.0/+esm';

// CSV file names (without .csv) == table names, same convention as code/create_db.py
export const TABLES = ['FactCardiacEvents', 'DimClinician', 'DimComplaint', 'DimDx', 'DimDxDomains'];

export class MissingDataError extends Error {
  constructor(files) {
    super(`Missing data files: ${files.join(', ')}`);
    this.files = files;
  }
}

let connPromise;
export function getConnection() {
  connPromise ??= init();
  return connPromise;
}

export async function fetchText(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

async function init() {
  // Fetch CSVs first so a missing file gives a clear message.
  const results = await Promise.all(
    TABLES.map(async (t) => {
      const res = await fetch(`data/${t}.csv`);
      return { t, ok: res.ok, text: res.ok ? await res.text() : null };
    })
  );
  const missing = results.filter((r) => !r.ok).map((r) => `data/${r.t}.csv`);
  if (missing.length) throw new MissingDataError(missing);

  const bundle = await duckdb.selectBundle(duckdb.getJsDelivrBundles());
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker}");`], { type: 'text/javascript' })
  );
  const db = new duckdb.AsyncDuckDB(new duckdb.VoidLogger(), new Worker(workerUrl));
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);

  const conn = await db.connect();
  for (const { t, text } of results) {
    await db.registerFileText(`${t}.csv`, text);
    await conn.query(`CREATE TABLE ${t} AS SELECT * FROM read_csv_auto('${t}.csv', header = true)`);
  }
  await conn.query(await fetchText('queries/base.sql'));
  return conn;
}

/** Run SQL and return plain JS objects (BigInt converted to Number). */
export async function query(sql) {
  const conn = await getConnection();
  const table = await conn.query(sql);
  return table.toArray().map((row) => {
    const obj = row.toJSON();
    for (const k in obj) if (typeof obj[k] === 'bigint') obj[k] = Number(obj[k]);
    return obj;
  });
}

/** Quote a value as a SQL string literal. */
export const lit = (v) => `'${String(v).replaceAll("'", "''")}'`;

/** Render rows into a <table class="data">. */
export function renderTable(el, rows, columns) {
  columns ??= rows.length ? Object.keys(rows[0]).map((k) => ({ key: k, label: k })) : [];
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const head = columns.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('');
  const body = rows
    .map((r) => '<tr>' + columns.map((c) => {
      const v = r[c.key];
      const isNum = typeof v === 'number';
      return `<td${isNum ? ' class="num"' : ''}>${esc(isNum && c.fixed != null ? v.toFixed(c.fixed) : v)}</td>`;
    }).join('') + '</tr>')
    .join('');
  el.innerHTML = `<table class="data"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

/** Show a friendly status message for load errors. */
export function showLoadError(el, err) {
  el.hidden = false;
  if (err instanceof MissingDataError) {
    el.innerHTML = `Data isn't loaded yet. Add the synthetic data CSVs to <code>data/</code>: ${err.files.map((f) => `<code>${f}</code>`).join(', ')}.`;
  } else {
    el.textContent = `Couldn't load data: ${err.message}`;
    console.error(err);
  }
}
