ALTER TABLE assessments
ADD COLUMN IF NOT EXISTS referral_feedback JSONB DEFAULT NULL;

COMMENT ON COLUMN assessments.referral_feedback IS 'Structured feedback from referral facility: diagnosis, treatment, outcome, facilityName, facilityContact, providedAt';
