import { supabase } from './supabase';
import type {
  VerificationCase,
  DocumentRecord,
  FaceCapture,
  LivenessResult,
  BiometricResult,
  OcrResult,
  ForensicResult,
  GovernmentVerification,
  IdentityBinding,
  RiskAssessment,
  EvidenceItem,
  AuditLog,
  Consent,
  CaseDetails,
  DocumentType,
} from './types';

function generateCaseId(): string {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ID-2026-${num.toString().padStart(5, '0')}`;
}

function getSessionId(): string {
  let id = sessionStorage.getItem('idshield_session');
  if (!id) {
    id = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem('idshield_session', id);
  }
  return id;
}

export const api = {
  async createCase(documentType: DocumentType, demoMode = false): Promise<VerificationCase> {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error('Not authenticated');

    const caseId = generateCaseId();
    const { data, error } = await supabase
      .from('verification_cases')
      .insert({
        case_id: caseId,
        document_type: documentType,
        status: 'PROCESSING',
        demo_mode: demoMode,
      })
      .select()
      .single();

    if (error) throw error;

    await this.addAuditLog(data.id, 'Case Created', 'System', 'Success', 'PROCESSING');
    return data;
  },

  async uploadDocument(
    caseId: string,
    documentType: DocumentType,
    file: File,
    imageData: string,
  ): Promise<DocumentRecord> {
    const { data, error } = await supabase
      .from('documents')
      .insert({
        case_id: caseId,
        document_type: documentType,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        image_data: imageData,
      })
      .select()
      .single();

    if (error) throw error;

    await this.addAuditLog(caseId, 'Document Uploaded', 'Document Service', 'Success', 'PROCESSING');
    return data;
  },

  async saveFaceCapture(
    caseId: string,
    imageData: string,
    faceDetected: boolean,
    faceCount: number,
  ): Promise<FaceCapture> {
    const { data, error } = await supabase
      .from('face_captures')
      .insert({
        case_id: caseId,
        image_data: imageData,
        face_detected: faceDetected,
        face_count: faceCount,
      })
      .select()
      .single();

    if (error) throw error;

    await this.addAuditLog(caseId, 'Face Captured', 'Biometric Service', 'Success', 'PROCESSING');
    return data;
  },

  async saveLivenessResult(
    caseId: string,
    result: {
      challenge_type: string;
      challenge_passed: boolean;
      liveness_score: number;
      anti_spoof_status: string;
      status: string;
      details?: Record<string, unknown>;
    },
  ): Promise<LivenessResult> {
    const { data, error } = await supabase
      .from('liveness_results')
      .insert({ case_id: caseId, ...result })
      .select()
      .single();

    if (error) throw error;

    await this.addAuditLog(
      caseId,
      result.challenge_passed ? 'Liveness Completed' : 'Liveness Failed',
      'Liveness Service',
      result.challenge_passed ? 'Success' : 'Failed',
      'PROCESSING',
    );
    return data;
  },

  async saveOcrResult(
    caseId: string,
    result: {
      extracted_name: string | null;
      extracted_document_number: string | null;
      extracted_dob: string | null;
      extracted_gender: string | null;
      extracted_address: string | null;
      extracted_expiry: string | null;
      extracted_document_type: string | null;
      ocr_confidence: number;
      raw_text: string;
      status: string;
    },
  ): Promise<OcrResult> {
    const { data, error } = await supabase
      .from('ocr_results')
      .insert({ case_id: caseId, ...result })
      .select()
      .single();

    if (error) throw error;

    await this.addAuditLog(caseId, 'OCR Completed', 'OCR Service', 'Success', 'PROCESSING');
    return data;
  },

  async saveForensicResult(
    caseId: string,
    result: {
      image_quality: number;
      compression_anomaly: boolean;
      pixel_inconsistency: boolean;
      copy_paste_anomaly: boolean;
      ela_result: Record<string, unknown> | null;
      tampering_probability: number;
      suspicious_regions: unknown[];
      cnn_authenticity_score: number;
      status: string;
      details: Record<string, unknown>;
    },
  ): Promise<ForensicResult> {
    const { data, error } = await supabase
      .from('forensic_results')
      .insert({ case_id: caseId, ...result })
      .select()
      .single();

    if (error) throw error;

    await this.addAuditLog(caseId, 'Forensics Completed', 'Forensics Service', 'Success', 'PROCESSING');
    return data;
  },

  async saveBiometricResult(
    caseId: string,
    result: {
      match_status: string;
      similarity_score: number;
      live_face_image: string | null;
      reference_face_image: string | null;
      details: Record<string, unknown>;
    },
  ): Promise<BiometricResult> {
    const { data, error } = await supabase
      .from('biometric_results')
      .insert({ case_id: caseId, ...result })
      .select()
      .single();

    if (error) throw error;

    await this.addAuditLog(caseId, 'Biometric Matching Completed', 'Biometric Service', 'Success', 'PROCESSING');
    return data;
  },

  async saveGovernmentVerification(
    caseId: string,
    result: {
      document_type: DocumentType;
      verification_method: string;
      status: string;
      verified_name: string | null;
      verified_document_number: string | null;
      verified_dob: string | null;
      details: Record<string, unknown>;
    },
  ): Promise<GovernmentVerification> {
    const { data, error } = await supabase
      .from('government_verifications')
      .insert({ case_id: caseId, ...result })
      .select()
      .single();

    if (error) throw error;

    await this.addAuditLog(
      caseId,
      'Government Verification Requested',
      'Government Service',
      result.status,
      'PROCESSING',
    );
    return data;
  },

  async saveIdentityBinding(
    caseId: string,
    result: {
      binding_matrix: unknown[];
      identity_status: string;
      details: Record<string, unknown>;
    },
  ): Promise<IdentityBinding> {
    const { data, error } = await supabase
      .from('identity_bindings')
      .insert({ case_id: caseId, ...result })
      .select()
      .single();

    if (error) throw error;

    await this.addAuditLog(caseId, 'Identity Binding Completed', 'Identity Binding Engine', 'Success', 'PROCESSING');
    return data;
  },

  async saveRiskAssessment(
    caseId: string,
    result: {
      capture_integrity: string;
      liveness_status: string;
      face_match_status: string;
      ocr_quality: string;
      government_status: string;
      forensics_status: string;
      identity_consistency: string;
      injection_status: string;
      risk_level: string;
      risk_reason: string;
      risk_score: number;
      details: Record<string, unknown>;
    },
  ): Promise<RiskAssessment> {
    const { data, error } = await supabase
      .from('risk_assessments')
      .insert({ case_id: caseId, ...result })
      .select()
      .single();

    if (error) throw error;

    await this.addAuditLog(caseId, 'Risk Decision Created', 'Risk Engine', result.risk_level, result.risk_level);
    return data;
  },

  async saveEvidence(
    caseId: string,
    evidenceType: string,
    label: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<EvidenceItem> {
    const { data, error } = await supabase
      .from('evidence')
      .insert({
        case_id: caseId,
        evidence_type: evidenceType,
        label,
        content,
        metadata: metadata || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addAuditLog(
    caseId: string,
    action: string,
    service: string | null,
    result: string,
    verificationState?: string,
  ): Promise<void> {
    const sessionId = getSessionId();
    await supabase.from('audit_logs').insert({
      case_id: caseId,
      action,
      service,
      result,
      session_id: sessionId,
      verification_state: verificationState || null,
    });
  },

  async saveConsent(
    caseId: string,
    consentType: string,
    consentText: string,
    granted: boolean,
  ): Promise<Consent> {
    const { data, error } = await supabase
      .from('consents')
      .insert({
        case_id: caseId,
        consent_type: consentType,
        consent_text: consentText,
        granted,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateCaseStatus(
    caseId: string,
    status: string,
    finalDecision?: string,
    finalReason?: string,
  ): Promise<void> {
    await supabase
      .from('verification_cases')
      .update({
        status,
        final_decision: finalDecision || null,
        final_reason: finalReason || null,
      })
      .eq('id', caseId);
  },

  async getCases(): Promise<VerificationCase[]> {
    const { data, error } = await supabase
      .from('verification_cases')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getCaseDetails(caseId: string): Promise<CaseDetails> {
    const { data: caseData, error: caseError } = await supabase
      .from('verification_cases')
      .select('*')
      .eq('id', caseId)
      .maybeSingle();

    if (caseError) throw caseError;
    if (!caseData) throw new Error('Case not found');

    const [
      { data: document },
      { data: faceCapture },
      { data: liveness },
      { data: biometric },
      { data: ocr },
      { data: forensic },
      { data: government },
      { data: identityBinding },
      { data: risk },
      { data: evidence },
      { data: auditLogs },
    ] = await Promise.all([
      supabase.from('documents').select('*').eq('case_id', caseId).maybeSingle(),
      supabase.from('face_captures').select('*').eq('case_id', caseId).maybeSingle(),
      supabase.from('liveness_results').select('*').eq('case_id', caseId).maybeSingle(),
      supabase.from('biometric_results').select('*').eq('case_id', caseId).maybeSingle(),
      supabase.from('ocr_results').select('*').eq('case_id', caseId).maybeSingle(),
      supabase.from('forensic_results').select('*').eq('case_id', caseId).maybeSingle(),
      supabase.from('government_verifications').select('*').eq('case_id', caseId).maybeSingle(),
      supabase.from('identity_bindings').select('*').eq('case_id', caseId).maybeSingle(),
      supabase.from('risk_assessments').select('*').eq('case_id', caseId).maybeSingle(),
      supabase.from('evidence').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
      supabase.from('audit_logs').select('*').eq('case_id', caseId).order('created_at', { ascending: true }),
    ]);

    return {
      case: caseData,
      document: document as DocumentRecord | null,
      face_capture: faceCapture as FaceCapture | null,
      liveness: liveness as LivenessResult | null,
      biometric: biometric as BiometricResult | null,
      ocr: ocr as OcrResult | null,
      forensic: forensic as ForensicResult | null,
      government: government as GovernmentVerification | null,
      identity_binding: identityBinding as IdentityBinding | null,
      risk: risk as RiskAssessment | null,
      evidence: (evidence || []) as EvidenceItem[],
      audit_logs: (auditLogs || []) as AuditLog[],
    };
  },
};
