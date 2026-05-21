CREATE TABLE IF NOT EXISTS follow_ups (
  id UUID PRIMARY KEY,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessments(id) ON DELETE SET NULL,
  chw_user_id UUID NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  synced_at TIMESTAMPTZ,
  version INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE follow_ups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own follow_ups"
  ON follow_ups FOR SELECT
  USING (chw_user_id = auth.uid());

CREATE POLICY "Users can insert own follow_ups"
  ON follow_ups FOR INSERT
  WITH CHECK (chw_user_id = auth.uid());

CREATE POLICY "Users can update own follow_ups"
  ON follow_ups FOR UPDATE
  USING (chw_user_id = auth.uid());

CREATE INDEX idx_follow_ups_chw_user_id ON follow_ups(chw_user_id);
CREATE INDEX idx_follow_ups_scheduled_for ON follow_ups(scheduled_for);
CREATE INDEX idx_follow_ups_status ON follow_ups(status);
