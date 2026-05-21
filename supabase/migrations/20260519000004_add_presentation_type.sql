ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS presentation_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT NULL;

COMMENT ON COLUMN assessments.presentation_type IS 'Body system / presentation type: dermatology, respiratory, fever, gastrointestinal, neurological, malnutrition, eye_ear, musculoskeletal';
COMMENT ON COLUMN assessments.description IS 'Free-text symptom description for non-dermatology assessments';
