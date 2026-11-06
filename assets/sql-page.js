import { query, fetchText, renderTable, showLoadError } from './db.js';

const cols = (first, label) => [
  { key: first, label },
  { key: 'PatientsEncountered', label: 'Patients Encountered' },
  { key: 'AlignmentQuotient', label: 'Alignment Quotient', fixed: 2 },
  { key: 'ClinicianError', label: 'Clinician Error', fixed: 2 },
  { key: 'GoldmanError', label: 'Goldman Error', fixed: 2 },
  { key: 'ClinicianErrorAboveBenchmark', label: 'Clinician Error Above Benchmark', fixed: 2 },
];

try {
  const [facility, clinician] = await Promise.all([
    fetchText('queries/facility_performance.sql').then(query),
    fetchText('queries/clinician_performance.sql').then(query),
  ]);
  renderTable(document.getElementById('facility-results'), facility, cols('Location', 'Location'));
  renderTable(document.getElementById('clinician-results'), clinician, cols('ClinicianName', 'Clinician'));
} catch (err) {
  showLoadError(document.getElementById('status'), err);
}
