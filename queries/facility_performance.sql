-- DuckDB port of "Analyzing Facility Performance" in code/Analysis.sql
SELECT
    Location,
    SUM(DecisionDenominator) AS PatientsEncountered,
    ROUND(SUM(DecisionAlignment) / SUM(DecisionDenominator), 2) AS AlignmentQuotient,
    ROUND(SUM(CardiacArrestWithin3DaysOfBeingSentHome) / SUM(ClinicianDenominator), 2) AS ClinicianError,
    ROUND(SUM(GoldmanNumerator) / SUM(GoldmanDenominator), 2) AS GoldmanError,
    ROUND(SUM(CardiacArrestWithin3DaysOfBeingSentHome) / SUM(ClinicianDenominator)
        - SUM(GoldmanNumerator) / SUM(GoldmanDenominator), 2) AS ClinicianErrorAboveBenchmark
FROM ClinicianPerformance
GROUP BY Location
ORDER BY Location;
