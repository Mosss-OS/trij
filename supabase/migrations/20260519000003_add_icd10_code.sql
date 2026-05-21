ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS icd10_code TEXT DEFAULT NULL;

COMMENT ON COLUMN assessments.icd10_code IS 'ICD-10 code for the primary condition assessed';
