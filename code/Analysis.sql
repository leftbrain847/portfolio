USE HealthcareWarehouse

/*************************************************************************************************
Initial Build
*************************************************************************************************/
--CREATE INDEX IDX_DimDx_DxKey_ValueSetKey ON DimDx (DxKey, DxValueSetKey) -- Adding composite index to speed up query

DROP TABLE IF EXISTS #ClinicianPerformance
SELECT DISTINCT F.[Location]
	,F.[PatientID]
	,F.[IntakeDate]
	,F.[ClinicianDecision]
	,F.[GoldmanRecommendation]
	,F.[CardiacArrestWithin3DaysOfBeingSentHome]
	,DCL.[ClinicianName]
	,DCO.[ComplaintDescription]
	,DX.[DxDescription]
	,DD.[ValueSetDescription]
	,F.[ConronaryAngiographyReading]
	,CASE WHEN ClinicianDecision = GoldmanRecommendation THEN 1.0 ELSE 0.0 END AS DecisionAlignment
	,1 AS DecisionDenominator
	,CASE WHEN ClinicianDecision = 'Send Home' THEN 1.0 ELSE 0.0 END AS ClinicianDenominator
	,CASE WHEN GoldmanRecommendation = 'Send Home' THEN 1.0 ELSE 0.0 END AS GoldmanDenominator
	,CASE WHEN GoldmanRecommendation = 'Send Home'
		AND CardiacArrestWithin3DaysOfBeingSentHome = 1 THEN 1.0 ELSE 0.0 END AS GoldmanNumerator
INTO #ClinicianPerformance
FROM [HealthcareWarehouse].[dbo].[FactCardiacEvents] F
	LEFT JOIN DBO.DimClinician DCL
		ON F.IntakeClinicianID = DCL.ClinicianID
	INNER JOIN DBO.DimComplaint DCO
		ON F.PresentingComplaint = DCO.ComplaintKey
		AND DCO.ComplaintKey IN ('C937', 'C941', 'C446') -- Filtering on 'Chest pain or discomfort', 'Palpitations or irregular heartbeat' and 'Shortness of breath'
	LEFT JOIN DBO.DimDx DX
		ON F.PrimaryDx = DX.DxKey
	LEFT JOIN DBO.DimDxDomains DD
		ON DX.DxValueSetKey = DD.ValueSetKey
WHERE
	(DX.DxKey IS NULL OR DX.DxKey IN ('DX341', 'DX342', 'DX343', 'DX344')) -- Filtering on 'Cardiac arrest, unspecified', 'Ventricular fibrillation', 'Pulseless electrical activity', 'Acute transmural myocardial infarction'
	AND (DX.DxValueSetKey IS NULL OR DX.DxValueSetKey IN ('VS507', 'VS519')) -- Filtering on 'Cardiovascular Distress', 'Respiratory Distress'

/*************************************************************************************************
Analyzing Facility Performance
*************************************************************************************************/
SELECT
	Location
	,SUM(DecisionDenominator) AS PatientsEncountered
	,CAST(SUM(DecisionAlignment) / SUM(DecisionDenominator) AS DECIMAL(10, 2)) AS AlignmentQuotient
	,CAST(SUM(CardiacArrestWithin3DaysOfBeingSentHome) / SUM(ClinicianDenominator) AS DECIMAL(10, 2)) AS ClinicianError
	,CAST(SUM(GoldmanNumerator) / SUM(GoldmanDenominator) AS DECIMAL(10, 2)) AS GoldmanError
	,CAST(SUM(CardiacArrestWithin3DaysOfBeingSentHome) / SUM(ClinicianDenominator) - SUM(GoldmanNumerator) / SUM(GoldmanDenominator) AS DECIMAL(10, 2)) AS ClinicianErrorAboveBenchmark
FROM #ClinicianPerformance
GROUP BY Location
ORDER BY Location

/*************************************************************************************************
Analyzing Clinician Performance
*************************************************************************************************/
SELECT
	ClinicianName
	,SUM(DecisionDenominator) AS PatientsEncountered
	,CAST(SUM(DecisionAlignment) / SUM(DecisionDenominator) AS DECIMAL(10, 2)) AS AlignmentQuotient
	,CAST(SUM(CardiacArrestWithin3DaysOfBeingSentHome) / SUM(ClinicianDenominator) AS DECIMAL(10, 2)) AS ClinicianError
	,CAST(SUM(GoldmanNumerator) / SUM(GoldmanDenominator) AS DECIMAL(10, 2)) AS GoldmanError
	,CAST(SUM(CardiacArrestWithin3DaysOfBeingSentHome) / SUM(ClinicianDenominator) - SUM(GoldmanNumerator) / SUM(GoldmanDenominator) AS DECIMAL(10, 2)) AS ClinicianErrorAboveBenchmark
FROM #ClinicianPerformance
GROUP BY ClinicianName
ORDER BY ClinicianErrorAboveBenchmark DESC
