import type { LivenessResult, OcrResult, ForensicResult, BiometricResult, GovernmentVerification, IdentityBinding, RiskLevel } from './types';

export interface RiskResult {
  capture_integrity: string;
  liveness_status: string;
  face_match_status: string;
  ocr_quality: string;
  government_status: string;
  forensics_status: string;
  identity_consistency: string;
  injection_status: string;
  risk_level: RiskLevel;
  risk_reason: string;
  risk_score: number;
  details: Record<string, unknown>;
}

export function evaluateRisk(
  liveness: LivenessResult | null,
  ocr: OcrResult | null,
  forensic: ForensicResult | null,
  biometric: BiometricResult | null,
  government: GovernmentVerification | null,
  identityBinding: IdentityBinding | null,
): RiskResult {
  const livenessStatus = liveness?.status || 'PENDING';
  const livenessPassed = livenessStatus === 'PASSED';
  const ocrCompleted = ocr?.status === 'COMPLETED';
  const ocrConfidence = ocr?.ocr_confidence || 0;
  const forensicStatus = forensic?.status || 'PENDING';
  const forensicPassed = forensicStatus === 'PASSED';
  const faceMatchStatus = biometric?.match_status || 'PENDING';
  const govStatus = government?.status || 'NOT_CONFIGURED';
  const govConnected = govStatus === 'VERIFIED';
  const govUnavailable = govStatus === 'NOT_CONFIGURED' || govStatus === 'UNAVAILABLE';
  const identityStatus = identityBinding?.identity_status || 'PENDING';
  const antiSpoof = liveness?.anti_spoof_status || 'MANUAL REVIEW';

  let riskScore = 0;
  if (!livenessPassed) riskScore += 25;
  if (!ocrCompleted || ocrConfidence < 0.5) riskScore += 15;
  if (!forensicPassed) riskScore += 20;
  if (faceMatchStatus === 'NO MATCH') riskScore += 25;
  if (govUnavailable) riskScore += 10;
  if (identityStatus === 'MISMATCH') riskScore += 30;
  if (antiSpoof.includes('WARNING') || antiSpoof.includes('FAIL')) riskScore += 15;

  riskScore = Math.min(100, riskScore);

  let riskLevel: RiskLevel;
  let riskReason: string;

  if (govUnavailable && livenessPassed && ocrCompleted && forensicPassed) {
    riskLevel = 'REVIEW';
    riskReason =
      'Document screened — identity NOT government verified. Government verification could not be completed.';
  } else if (govConnected && livenessPassed && ocrCompleted && forensicPassed && faceMatchStatus === 'MATCH') {
    riskLevel = 'CLEAR';
    riskReason = 'All verification layers passed including government verification.';
  } else if (identityStatus === 'MISMATCH' || riskScore >= 60) {
    riskLevel = 'HIGH RISK';
    riskReason = 'Significant verification failures detected across multiple layers.';
  } else if (govUnavailable) {
    riskLevel = 'UNVERIFIED';
    riskReason = 'Government identity verification could not be completed.';
  } else if (riskScore >= 30) {
    riskLevel = 'REVIEW';
    riskReason = 'Some verification layers require manual review.';
  } else {
    riskLevel = 'REVIEW';
    riskReason = 'Verification incomplete — manual review recommended.';
  }

  return {
    capture_integrity: livenessPassed ? 'VERIFIED' : 'FAILED',
    liveness_status: livenessStatus,
    face_match_status: faceMatchStatus,
    ocr_quality: ocrCompleted ? (ocrConfidence > 0.7 ? 'HIGH' : ocrConfidence > 0.5 ? 'MEDIUM' : 'LOW') : 'FAILED',
    government_status: govStatus,
    forensics_status: forensicStatus,
    identity_consistency: identityStatus,
    injection_status: antiSpoof,
    risk_level: riskLevel,
    risk_reason: riskReason,
    risk_score: riskScore,
    details: {
      liveness_passed: livenessPassed,
      ocr_confidence: ocrConfidence,
      forensic_passed: forensicPassed,
      face_match: faceMatchStatus,
      government_connected: govConnected,
      identity_status: identityStatus,
      anti_spoof: antiSpoof,
    },
  };
}
