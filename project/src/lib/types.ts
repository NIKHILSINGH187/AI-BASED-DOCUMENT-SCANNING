export type VerificationStatus =
  | 'CLEAR'
  | 'REVIEW'
  | 'HIGH RISK'
  | 'UNVERIFIED'
  | 'SERVICE UNAVAILABLE'
  | 'PROCESSING';

export type GovernmentStatus =
  | 'VERIFIED'
  | 'FAILED'
  | 'PENDING'
  | 'NOT_CONFIGURED'
  | 'UNAVAILABLE'
  | 'INCONCLUSIVE';

export type MatchStatus = 'MATCH' | 'NO MATCH' | 'INCONCLUSIVE' | 'SERVICE UNAVAILABLE' | 'PENDING';

export type LivenessStatus = 'PASSED' | 'FAILED' | 'PENDING' | 'SERVICE UNAVAILABLE';

export type ForensicStatus = 'PASSED' | 'REVIEW' | 'FLAGGED' | 'PENDING' | 'MODEL_NOT_CONNECTED';

export type OcrStatus = 'COMPLETED' | 'FAILED' | 'PENDING';

export type IdentityStatus =
  | 'VERIFIED'
  | 'PARTIALLY VERIFIED'
  | 'MISMATCH'
  | 'INCONCLUSIVE'
  | 'GOVERNMENT SERVICE UNAVAILABLE'
  | 'PENDING';

export type RiskLevel = 'CLEAR' | 'REVIEW' | 'HIGH RISK' | 'UNVERIFIED';

export type DocumentType =
  | 'Aadhaar'
  | 'PAN'
  | 'Voter ID'
  | 'Passport'
  | 'Driving Licence'
  | 'Other Government ID';

export type AntiSpoofStatus =
  | 'REAL CAMERA'
  | 'VIRTUAL CAMERA WARNING'
  | 'REPLAY WARNING'
  | 'LIVENESS PASS'
  | 'LIVENESS FAIL'
  | 'MANUAL REVIEW';

export interface VerificationCase {
  id: string;
  case_id: string;
  user_id: string;
  document_type: DocumentType;
  status: VerificationStatus;
  final_decision: RiskLevel | null;
  final_reason: string | null;
  demo_mode: boolean;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  case_id: string;
  document_type: DocumentType;
  file_name: string | null;
  file_size: number | null;
  mime_type: string | null;
  image_data: string | null;
  created_at: string;
}

export interface FaceCapture {
  id: string;
  case_id: string;
  image_data: string | null;
  face_detected: boolean;
  face_count: number;
  created_at: string;
}

export interface LivenessResult {
  id: string;
  case_id: string;
  challenge_type: string | null;
  challenge_passed: boolean;
  liveness_score: number;
  anti_spoof_status: string | null;
  status: LivenessStatus;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface BiometricResult {
  id: string;
  case_id: string;
  match_status: MatchStatus;
  similarity_score: number;
  live_face_image: string | null;
  reference_face_image: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface OcrResult {
  id: string;
  case_id: string;
  extracted_name: string | null;
  extracted_document_number: string | null;
  extracted_dob: string | null;
  extracted_gender: string | null;
  extracted_address: string | null;
  extracted_expiry: string | null;
  extracted_document_type: string | null;
  ocr_confidence: number;
  raw_text: string | null;
  status: OcrStatus;
  created_at: string;
}

export interface ForensicResult {
  id: string;
  case_id: string;
  image_quality: number;
  compression_anomaly: boolean;
  pixel_inconsistency: boolean;
  copy_paste_anomaly: boolean;
  ela_result: Record<string, unknown> | null;
  tampering_probability: number;
  suspicious_regions: unknown[] | null;
  cnn_authenticity_score: number;
  status: ForensicStatus;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface GovernmentVerification {
  id: string;
  case_id: string;
  document_type: DocumentType;
  verification_method: string | null;
  request_payload: Record<string, unknown> | null;
  response_payload: Record<string, unknown> | null;
  status: GovernmentStatus;
  verified_name: string | null;
  verified_document_number: string | null;
  verified_dob: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface IdentityBinding {
  id: string;
  case_id: string;
  binding_matrix: BindingMatrixEntry[] | null;
  identity_status: IdentityStatus;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface BindingMatrixEntry {
  field: string;
  ocr: string;
  government: string;
  biometric: string;
  final: string;
}

export interface RiskAssessment {
  id: string;
  case_id: string;
  capture_integrity: string | null;
  liveness_status: string | null;
  face_match_status: string | null;
  ocr_quality: string | null;
  government_status: string | null;
  forensics_status: string | null;
  identity_consistency: string | null;
  injection_status: string | null;
  risk_level: RiskLevel;
  risk_reason: string | null;
  risk_score: number;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface EvidenceItem {
  id: string;
  case_id: string;
  evidence_type: string;
  label: string | null;
  content: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  case_id: string | null;
  action: string;
  service: string | null;
  result: string | null;
  session_id: string | null;
  verification_state: string | null;
  created_at: string;
}

export interface Consent {
  id: string;
  case_id: string | null;
  consent_type: string;
  consent_text: string;
  granted: boolean;
  created_at: string;
}

export interface CaseDetails {
  case: VerificationCase;
  document: DocumentRecord | null;
  face_capture: FaceCapture | null;
  liveness: LivenessResult | null;
  biometric: BiometricResult | null;
  ocr: OcrResult | null;
  forensic: ForensicResult | null;
  government: GovernmentVerification | null;
  identity_binding: IdentityBinding | null;
  risk: RiskAssessment | null;
  evidence: EvidenceItem[];
  audit_logs: AuditLog[];
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'unavailable';
  detail?: string;
}
