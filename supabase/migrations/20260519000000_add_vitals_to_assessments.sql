-- Add vitals JSONB column to assessments table for vital signs capture
ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS vitals JSONB DEFAULT NULL;

COMMENT ON COLUMN assessments.vitals IS 'Structured vital signs: systolicBP, diastolicBP, heartRate, respiratoryRate, temperature, oxygenSaturation, muac, weight, painScale';
