/*
# IDShield AI — Full Schema

Creates the complete database for the AI-Based Fake Identity & Document Screening System.

## Tables
- `verification_cases` — top-level case per verification attempt
- `documents` — uploaded/captured document images and metadata
- `face_captures` — live webcam frame captures
- `liveness_results` — liveness challenge outcomes
- `biometric_results` — face match / embedding results
- `ocr_results` — OCR-extracted identity fields
- `forensic_results` — document forensic analysis
- `government_verifications` — government adapter responses
- `identity_bindings` — cross-source identity binding matrix
- `risk_assessments` — risk engine final decisions
- `evidence` — evidence artifacts per case
- `audit_logs` — full audit trail per case
- `consents` — user consent records

## Security
- Multi-user app with sign-in: all tables are owner-scoped via `user_id` with `DEFAULT auth.uid()`.
- RLS enabled on every table. Four CRUD policies per table scoped to `authenticated` owners.
*/

-- ============ verification_cases ============
CREATE TABLE IF NOT EXISTS verification_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id text UNIQUE NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  status text NOT NULL DEFAULT 'PROCESSING',
  final_decision text,
  final_reason text,
  demo_mode boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE verification_cases ENABLE ROW LEVEL SECURITY;

-- ============ documents ============
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text,
  file_size bigint,
  mime_type text,
  image_data text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- ============ face_captures ============
CREATE TABLE IF NOT EXISTS face_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  image_data text,
  face_detected boolean DEFAULT false,
  face_count int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE face_captures ENABLE ROW LEVEL SECURITY;

-- ============ liveness_results ============
CREATE TABLE IF NOT EXISTS liveness_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_type text,
  challenge_passed boolean DEFAULT false,
  liveness_score float8 DEFAULT 0,
  anti_spoof_status text,
  status text NOT NULL DEFAULT 'PENDING',
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE liveness_results ENABLE ROW LEVEL SECURITY;

-- ============ biometric_results ============
CREATE TABLE IF NOT EXISTS biometric_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  match_status text NOT NULL DEFAULT 'PENDING',
  similarity_score float8 DEFAULT 0,
  live_face_image text,
  reference_face_image text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE biometric_results ENABLE ROW LEVEL SECURITY;

-- ============ ocr_results ============
CREATE TABLE IF NOT EXISTS ocr_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  extracted_name text,
  extracted_document_number text,
  extracted_dob text,
  extracted_gender text,
  extracted_address text,
  extracted_expiry text,
  extracted_document_type text,
  ocr_confidence float8 DEFAULT 0,
  raw_text text,
  status text NOT NULL DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE ocr_results ENABLE ROW LEVEL SECURITY;

-- ============ forensic_results ============
CREATE TABLE IF NOT EXISTS forensic_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  image_quality float8 DEFAULT 0,
  compression_anomaly boolean DEFAULT false,
  pixel_inconsistency boolean DEFAULT false,
  copy_paste_anomaly boolean DEFAULT false,
  ela_result jsonb,
  tampering_probability float8 DEFAULT 0,
  suspicious_regions jsonb,
  cnn_authenticity_score float8 DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING',
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE forensic_results ENABLE ROW LEVEL SECURITY;

-- ============ government_verifications ============
CREATE TABLE IF NOT EXISTS government_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  verification_method text,
  request_payload jsonb,
  response_payload jsonb,
  status text NOT NULL DEFAULT 'NOT_CONFIGURED',
  verified_name text,
  verified_document_number text,
  verified_dob text,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE government_verifications ENABLE ROW LEVEL SECURITY;

-- ============ identity_bindings ============
CREATE TABLE IF NOT EXISTS identity_bindings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  binding_matrix jsonb,
  identity_status text NOT NULL DEFAULT 'PENDING',
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE identity_bindings ENABLE ROW LEVEL SECURITY;

-- ============ risk_assessments ============
CREATE TABLE IF NOT EXISTS risk_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  capture_integrity text,
  liveness_status text,
  face_match_status text,
  ocr_quality text,
  government_status text,
  forensics_status text,
  identity_consistency text,
  injection_status text,
  risk_level text NOT NULL DEFAULT 'UNVERIFIED',
  risk_reason text,
  risk_score float8 DEFAULT 0,
  details jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE risk_assessments ENABLE ROW LEVEL SECURITY;

-- ============ evidence ============
CREATE TABLE IF NOT EXISTS evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  evidence_type text NOT NULL,
  label text,
  content text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;

-- ============ audit_logs ============
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  service text,
  result text,
  session_id text,
  verification_state text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ consents ============
CREATE TABLE IF NOT EXISTS consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id uuid REFERENCES verification_cases(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type text NOT NULL,
  consent_text text NOT NULL,
  granted boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE consents ENABLE ROW LEVEL SECURITY;

-- ============ Indexes ============
CREATE INDEX IF NOT EXISTS idx_cases_user ON verification_cases(user_id);
CREATE INDEX IF NOT EXISTS idx_cases_case_id ON verification_cases(case_id);
CREATE INDEX IF NOT EXISTS idx_documents_case ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_face_captures_case ON face_captures(case_id);
CREATE INDEX IF NOT EXISTS idx_liveness_case ON liveness_results(case_id);
CREATE INDEX IF NOT EXISTS idx_biometric_case ON biometric_results(case_id);
CREATE INDEX IF NOT EXISTS idx_ocr_case ON ocr_results(case_id);
CREATE INDEX IF NOT EXISTS idx_forensic_case ON forensic_results(case_id);
CREATE INDEX IF NOT EXISTS idx_gov_case ON government_verifications(case_id);
CREATE INDEX IF NOT EXISTS idx_binding_case ON identity_bindings(case_id);
CREATE INDEX IF NOT EXISTS idx_risk_case ON risk_assessments(case_id);
CREATE INDEX IF NOT EXISTS idx_evidence_case ON evidence(case_id);
CREATE INDEX IF NOT EXISTS idx_audit_case ON audit_logs(case_id);
CREATE INDEX IF NOT EXISTS idx_consents_case ON consents(case_id);

-- ============ RLS Policies (explicit per table) ============

-- verification_cases
DROP POLICY IF EXISTS "select_own_cases" ON verification_cases;
CREATE POLICY "select_own_cases" ON verification_cases FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_cases" ON verification_cases;
CREATE POLICY "insert_own_cases" ON verification_cases FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_cases" ON verification_cases;
CREATE POLICY "update_own_cases" ON verification_cases FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_cases" ON verification_cases;
CREATE POLICY "delete_own_cases" ON verification_cases FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- documents
DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- face_captures
DROP POLICY IF EXISTS "select_own_face" ON face_captures;
CREATE POLICY "select_own_face" ON face_captures FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_face" ON face_captures;
CREATE POLICY "insert_own_face" ON face_captures FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_face" ON face_captures;
CREATE POLICY "update_own_face" ON face_captures FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_face" ON face_captures;
CREATE POLICY "delete_own_face" ON face_captures FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- liveness_results
DROP POLICY IF EXISTS "select_own_liveness" ON liveness_results;
CREATE POLICY "select_own_liveness" ON liveness_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_liveness" ON liveness_results;
CREATE POLICY "insert_own_liveness" ON liveness_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_liveness" ON liveness_results;
CREATE POLICY "update_own_liveness" ON liveness_results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_liveness" ON liveness_results;
CREATE POLICY "delete_own_liveness" ON liveness_results FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- biometric_results
DROP POLICY IF EXISTS "select_own_biometric" ON biometric_results;
CREATE POLICY "select_own_biometric" ON biometric_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_biometric" ON biometric_results;
CREATE POLICY "insert_own_biometric" ON biometric_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_biometric" ON biometric_results;
CREATE POLICY "update_own_biometric" ON biometric_results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_biometric" ON biometric_results;
CREATE POLICY "delete_own_biometric" ON biometric_results FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ocr_results
DROP POLICY IF EXISTS "select_own_ocr" ON ocr_results;
CREATE POLICY "select_own_ocr" ON ocr_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_ocr" ON ocr_results;
CREATE POLICY "insert_own_ocr" ON ocr_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_ocr" ON ocr_results;
CREATE POLICY "update_own_ocr" ON ocr_results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_ocr" ON ocr_results;
CREATE POLICY "delete_own_ocr" ON ocr_results FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- forensic_results
DROP POLICY IF EXISTS "select_own_forensic" ON forensic_results;
CREATE POLICY "select_own_forensic" ON forensic_results FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_forensic" ON forensic_results;
CREATE POLICY "insert_own_forensic" ON forensic_results FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_forensic" ON forensic_results;
CREATE POLICY "update_own_forensic" ON forensic_results FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_forensic" ON forensic_results;
CREATE POLICY "delete_own_forensic" ON forensic_results FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- government_verifications
DROP POLICY IF EXISTS "select_own_gov" ON government_verifications;
CREATE POLICY "select_own_gov" ON government_verifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_gov" ON government_verifications;
CREATE POLICY "insert_own_gov" ON government_verifications FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_gov" ON government_verifications;
CREATE POLICY "update_own_gov" ON government_verifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_gov" ON government_verifications;
CREATE POLICY "delete_own_gov" ON government_verifications FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- identity_bindings
DROP POLICY IF EXISTS "select_own_binding" ON identity_bindings;
CREATE POLICY "select_own_binding" ON identity_bindings FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_binding" ON identity_bindings;
CREATE POLICY "insert_own_binding" ON identity_bindings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_binding" ON identity_bindings;
CREATE POLICY "update_own_binding" ON identity_bindings FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_binding" ON identity_bindings;
CREATE POLICY "delete_own_binding" ON identity_bindings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- risk_assessments
DROP POLICY IF EXISTS "select_own_risk" ON risk_assessments;
CREATE POLICY "select_own_risk" ON risk_assessments FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_risk" ON risk_assessments;
CREATE POLICY "insert_own_risk" ON risk_assessments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_risk" ON risk_assessments;
CREATE POLICY "update_own_risk" ON risk_assessments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_risk" ON risk_assessments;
CREATE POLICY "delete_own_risk" ON risk_assessments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- evidence
DROP POLICY IF EXISTS "select_own_evidence" ON evidence;
CREATE POLICY "select_own_evidence" ON evidence FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_evidence" ON evidence;
CREATE POLICY "insert_own_evidence" ON evidence FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_evidence" ON evidence;
CREATE POLICY "update_own_evidence" ON evidence FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_evidence" ON evidence;
CREATE POLICY "delete_own_evidence" ON evidence FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- audit_logs
DROP POLICY IF EXISTS "select_own_audit" ON audit_logs;
CREATE POLICY "select_own_audit" ON audit_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_audit" ON audit_logs;
CREATE POLICY "insert_own_audit" ON audit_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_audit" ON audit_logs;
CREATE POLICY "update_own_audit" ON audit_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_audit" ON audit_logs;
CREATE POLICY "delete_own_audit" ON audit_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- consents
DROP POLICY IF EXISTS "select_own_consent" ON consents;
CREATE POLICY "select_own_consent" ON consents FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "insert_own_consent" ON consents;
CREATE POLICY "insert_own_consent" ON consents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "update_own_consent" ON consents;
CREATE POLICY "update_own_consent" ON consents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "delete_own_consent" ON consents;
CREATE POLICY "delete_own_consent" ON consents FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_cases_updated ON verification_cases;
CREATE TRIGGER trg_cases_updated BEFORE UPDATE ON verification_cases
FOR EACH ROW EXECUTE FUNCTION update_updated_at();