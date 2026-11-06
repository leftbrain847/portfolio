-- DuckDB port of the "Initial Build" step in code/Analysis.sql.
-- Runs in the visitor's browser. Builds one view that every page queries.
-- Two columns are added for the dashboard: Outcome and DecisionAlignmentLabel.
CREATE OR REPLACE VIEW ClinicianPerformance AS
WITH f AS (
    SELECT
        *,
        -- CSV booleans may arrive as 1/0 or True/False; normalise to 1.0/0.0
        CASE WHEN lower(CAST(CardiacArrestWithin3DaysOfBeingSentHome AS VARCHAR)) IN ('1', '1.0', 'true')
             THEN 1.0 ELSE 0.0 END AS CardiacArrest3d
    FROM FactCardiacEvents
)
SELECT DISTINCT
    f.Location,
    f.PatientID,
    f.IntakeDate,
    f.ClinicianDecision,
    f.GoldmanRecommendation,
    f.CardiacArrest3d AS CardiacArrestWithin3DaysOfBeingSentHome,
    dcl.ClinicianName,
    dco.ComplaintDescription,
    dx.DxDescription,
    dd.ValueSetDescription,
    f.ConronaryAngiographyReading,
    CASE WHEN f.ClinicianDecision = f.GoldmanRecommendation THEN 1.0 ELSE 0.0 END AS DecisionAlignment,
    1 AS DecisionDenominator,
    CASE WHEN f.ClinicianDecision = 'Send Home' THEN 1.0 ELSE 0.0 END AS ClinicianDenominator,
    CASE WHEN f.GoldmanRecommendation = 'Send Home' THEN 1.0 ELSE 0.0 END AS GoldmanDenominator,
    CASE WHEN f.GoldmanRecommendation = 'Send Home' AND f.CardiacArrest3d = 1 THEN 1.0 ELSE 0.0 END AS GoldmanNumerator,
    -- Dashboard-only columns (ASSUMPTION: verify against the Power BI report)
    CASE WHEN dx.DxKey IS NOT NULL OR f.CardiacArrest3d = 1 THEN 'Cardiac Arrest' ELSE 'None/ Other' END AS Outcome,
    CASE WHEN f.ClinicianDecision = f.GoldmanRecommendation THEN 'Aligned' ELSE 'Not Aligned' END AS DecisionAlignmentLabel
FROM f
LEFT JOIN DimClinician dcl
    ON f.IntakeClinicianID = dcl.ClinicianID
INNER JOIN DimComplaint dco
    ON f.PresentingComplaint = dco.ComplaintKey
    AND dco.ComplaintKey IN ('C937', 'C941', 'C446')
LEFT JOIN DimDx dx
    ON f.PrimaryDx = dx.DxKey
LEFT JOIN DimDxDomains dd
    ON dx.DxValueSetKey = dd.ValueSetKey
WHERE (dx.DxKey IS NULL OR dx.DxKey IN ('DX341', 'DX342', 'DX343', 'DX344'))
  AND (dx.DxValueSetKey IS NULL OR dx.DxValueSetKey IN ('VS507', 'VS519'));
