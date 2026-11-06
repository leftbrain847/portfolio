-- DuckDB port of "Analyzing Clinician Performance" in code/Analysis.sql
SELECT
    ClinicianName,
    CAST(SUM(DecisionDenominator) AS INTEGER) AS PatientsEncountered,
    ROUND(SUM(DecisionAlignment) / SUM(DecisionDenominator), 2) AS AlignmentQuotient,
    ROUND(SUM(CardiacArrestWithin3DaysOfBeingSentHome) / SUM(ClinicianDenominator), 2) AS ClinicianError,
    ROUND(SUM(GoldmanNumerator) / SUM(GoldmanDenominator), 2) AS GoldmanError,
    ROUND(SUM(CardiacArrestWithin3DaysOfBeingSentHome) / SUM(ClinicianDenominator)
        - SUM(GoldmanNumerator) / SUM(GoldmanDenominator), 2) AS ClinicianErrorAboveBenchmark
FROM ClinicianPerformance
GROUP BY ClinicianName
ORDER BY ClinicianErrorAboveBenchmark DESC;
