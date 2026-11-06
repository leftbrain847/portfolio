import { query, lit, renderTable, showLoadError } from './db.js';

const TARGET = 0.9; // alignment target shown on the gauge
const DECISIONS = ['Admit', 'Send Home'];
const OUTCOMES = [
  { name: 'None/ Other', color: '--series-1' },
  { name: 'Cardiac Arrest', color: '--series-2' },
];
const FILTERS = [
  { id: 'f-location', column: 'Location' },
  { id: 'f-clinician', column: 'ClinicianName' },
  { id: 'f-alignment', column: 'DecisionAlignmentLabel' },
];

const statusEl = document.getElementById('status');
const barEl = document.getElementById('outcome-chart');
const gaugeEl = document.getElementById('alignment-gauge');
const tableEl = document.getElementById('patient-table');
const countEl = document.getElementById('patient-count');
let bar, gauge, lastData, requestId = 0;

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

function whereClause() {
  const parts = FILTERS.map(({ id, column }) => {
    const v = document.getElementById(id).value;
    return v ? `${column} = ${lit(v)}` : null;
  }).filter(Boolean);
  return parts.length ? `WHERE ${parts.join(' AND ')}` : '';
}

async function populateFilters() {
  for (const { id, column } of FILTERS) {
    const rows = await query(`SELECT DISTINCT ${column} AS v FROM ClinicianPerformance WHERE ${column} IS NOT NULL ORDER BY v`);
    const sel = document.getElementById(id);
    for (const { v } of rows) sel.add(new Option(v, v));
    sel.addEventListener('change', refresh);
  }
}

async function refresh() {
  const id = ++requestId; // ignore results from older requests that finish late
  const where = whereClause();
  const [outcomes, [align], patients] = await Promise.all([
    // Share of each outcome within each decision, for both decision makers
    query(`
      WITH d AS (
        SELECT 'Clinician Decision' AS who, ClinicianDecision AS decision, Outcome FROM ClinicianPerformance ${where}
        UNION ALL
        SELECT 'Goldman Recommendation', GoldmanRecommendation, Outcome FROM ClinicianPerformance ${where}
      )
      SELECT who, decision, Outcome, COUNT(*) AS n,
             COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY who, decision) AS share
      FROM d GROUP BY who, decision, Outcome`),
    query(`SELECT AVG(DecisionAlignment) AS alignment, COUNT(*) AS patients FROM ClinicianPerformance ${where}`),
    query(`
      SELECT Location, ClinicianName, PatientID, ClinicianDecision, GoldmanRecommendation,
             ComplaintDescription, Outcome, DxDescription
      FROM ClinicianPerformance ${where}
      ORDER BY Location, ClinicianName, PatientID`),
  ]);
  if (id !== requestId) return;
  lastData = { outcomes, align };
  drawCharts();
  countEl.textContent = `${patients.length.toLocaleString()} patients`;
  renderTable(tableEl, patients, [
    { key: 'Location', label: 'Location' },
    { key: 'ClinicianName', label: 'Intake Clinician Name' },
    { key: 'PatientID', label: 'Patient ID' },
    { key: 'ClinicianDecision', label: 'Clinician Decision' },
    { key: 'GoldmanRecommendation', label: 'Goldman Recommendation' },
    { key: 'ComplaintDescription', label: 'Presenting Complaint' },
    { key: 'Outcome', label: 'Outcome' },
    { key: 'DxDescription', label: 'Primary Diagnosis' },
  ]);
}

function drawCharts() {
  if (!lastData) return;
  const { outcomes, align } = lastData;
  const text = css('--text'), text2 = css('--text-2'), border = css('--border'), surface = css('--surface');
  const groups = ['Clinician Decision', 'Goldman Recommendation'];
  const cats = groups.flatMap((g) => DECISIONS.map((d) => ({ g, d })));
  const find = (g, d, o) => outcomes.find((r) => r.who === g && r.decision === d && r.Outcome === o);

  bar ??= echarts.init(barEl, null, { renderer: 'svg' });
  bar.setOption({
    animationDuration: 300,
    textStyle: { fontFamily: css('--font') },
    legend: { top: 0, left: 0, icon: 'roundRect', itemWidth: 12, itemHeight: 12, textStyle: { color: text2 } },
    grid: { top: 36, left: 44, right: 8, bottom: 64 },
    tooltip: {
      trigger: 'item',
      formatter: (p) => {
        const c = cats[p.dataIndex], r = find(c.g, c.d, p.seriesName);
        return `${c.g}: <b>${c.d}</b><br>${p.marker}${p.seriesName}: ${Math.round(p.value * 100)}% (${r ? r.n : 0} patients)`;
      },
    },
    xAxis: [
      { type: 'category', data: cats.map((c) => c.d), axisTick: { show: false }, axisLine: { lineStyle: { color: border } }, axisLabel: { color: text, interval: 0, width: 64, overflow: 'break' } },
      { type: 'category', position: 'bottom', offset: 34, data: groups, axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: text2, fontSize: 12, interval: 0, width: 120, overflow: 'break' } },
    ],
    yAxis: {
      type: 'value', max: 1, interval: 0.5,
      axisLabel: { color: text2, formatter: (v) => `${v * 100}%` },
      splitLine: { lineStyle: { color: border } },
    },
    series: OUTCOMES.map((o, i) => ({
      name: o.name,
      type: 'bar',
      stack: 'share',
      barMaxWidth: 56,
      itemStyle: { color: css(o.color), borderColor: surface, borderWidth: 1, borderRadius: i === OUTCOMES.length - 1 ? [4, 4, 0, 0] : 0 },
      label: { show: true, color: '#fff', fontSize: 12, formatter: (p) => (p.value >= 0.06 ? `${Math.round(p.value * 100)}%` : '') },
      data: cats.map((c) => find(c.g, c.d, o.name)?.share ?? 0),
    })),
  }, true);

  const value = align?.alignment ?? 0;
  gauge ??= echarts.init(gaugeEl, null, { renderer: 'svg' });
  const arc = { type: 'gauge', startAngle: 180, endAngle: 0, min: 0, max: 100, radius: '95%', center: ['50%', '72%'], splitNumber: 1 };
  gauge.setOption({
    animationDuration: 300,
    series: [
      {
        ...arc,
        progress: { show: true, width: 28, itemStyle: { color: css('--series-1') } },
        axisLine: { lineStyle: { width: 28, color: [[1, css('--track')]] } },
        pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false },
        axisLabel: { distance: 36, color: text2, fontSize: 12, formatter: (v) => `${v}%` },
        detail: { valueAnimation: true, offsetCenter: [0, '-12%'], fontSize: 34, fontWeight: 600, color: text, formatter: (v) => `${Math.round(v)}%` },
        title: { offsetCenter: [0, '18%'], fontSize: 12, color: text2 },
        data: [{ value: value * 100, name: `${(align?.patients ?? 0).toLocaleString()} patients` }],
      },
      {
        ...arc,
        axisLine: { show: false }, axisTick: { show: false }, splitLine: { show: false }, progress: { show: false },
        axisLabel: { show: false }, detail: { show: false }, title: { show: false },
        pointer: { icon: 'rect', width: 3, length: '22%', offsetCenter: [0, '-78%'], itemStyle: { color: css('--target') } },
        anchor: { show: false },
        data: [{ value: TARGET * 100 }],
      },
    ],
  }, true);
  document.getElementById('target-label').textContent = `Target ${Math.round(TARGET * 100)}%`;
}

window.addEventListener('resize', () => { bar?.resize(); gauge?.resize(); });
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', drawCharts);

try {
  await populateFilters();
  await refresh();
} catch (err) {
  showLoadError(statusEl, err);
}
