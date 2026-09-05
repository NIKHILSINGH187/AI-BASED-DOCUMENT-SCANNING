
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
  // Liveness / live-camera capture is intentionally not part of this
  // workflow anymore (verification now compares the document photo against
  // an existing reference photo already on file — e.g. HR records, hotel
  // registration, bank KYC records — rather than a fresh live selfie). When
  // `liveness` is null it means the check was never applicable, and that
  // should be neutral, not a penalized failure.
  const livenessAttempted = liveness !== null;
  const livenessStatus = liveness?.status || (livenessAttempted ? 'PENDING' : 'NOT_APPLICABLE');
  const livenessPassed = !livenessAttempted || livenessStatus === 'PASSED';
  const ocrCompleted = ocr?.status === 'COMPLETED';
  const ocrConfidence = ocr?.ocr_confidence || 0;
  const forensicStatus = forensic?.status || 'PENDING';
  const forensicPassed = forensicStatus === 'PASSED';
  const forensicFlagged = forensicStatus === 'FLAGGED';
  const forensicReview = forensicStatus === 'REVIEW';
  const tamperingProbability = forensic?.tampering_probability ?? 0;
  const faceMatchStatus = biometric?.match_status || 'PENDING';
  const govStatus = government?.status || 'NOT_CONFIGURED';
  const govConnected = govStatus === 'VERIFIED';
  const govUnavailable =
    govStatus === 'NOT_CONFIGURED' ||
    govStatus === 'UNAVAILABLE' ||
    govStatus === 'SANDBOX_VALID' ||
    govStatus === 'SANDBOX_INVALID';
  const govSandboxInvalid = govStatus === 'SANDBOX_INVALID';
  const identityStatus = identityBinding?.identity_status || 'PENDING';
  const identityMismatch = identityStatus === 'MISMATCH';
  const antiSpoof = liveness?.anti_spoof_status || (livenessAttempted ? 'MANUAL REVIEW' : 'NOT APPLICABLE');
  const antiSpoofFailed = antiSpoof.includes('WARNING') || antiSpoof.includes('FAIL');

  // Forensics contributes to risk in proportion to how suspicious the
  // document actually looked, instead of a flat penalty for "not PASSED".
  // A FLAGGED result (multiple anomalies / high tampering probability) is
  // treated as a much bigger red flag than a single-anomaly REVIEW result.
  let forensicPenalty = 0;
  if (forensicFlagged) forensicPenalty = 35;
  else if (forensicReview) forensicPenalty = 15;
  else if (!forensicPassed) forensicPenalty = 10; // PENDING / MODEL_NOT_CONNECTED
  forensicPenalty = Math.max(forensicPenalty, Math.round(tamperingProbability * 0.3));

  let riskScore = 0;
  if (!livenessPassed) riskScore += 25;
  if (!ocrCompleted || ocrConfidence < 0.5) riskScore += 15;
  riskScore += forensicPenalty;
  if (faceMatchStatus === 'NO MATCH' || faceMatchStatus === 'NO_MATCH') riskScore += 25;
  if (govUnavailable) riskScore += 10;
  if (identityMismatch) riskScore += 30;
  if (govSandboxInvalid) riskScore += 20;
  if (antiSpoofFailed) riskScore += 15;

  riskScore = Math.min(100, riskScore);

  // Collect every real problem so the reason shown to the reviewer names
  // the actual failing check(s) instead of a single canned sentence that
  // only ever mentions government verification.
  const reasons: string[] = [];
  if (identityMismatch) reasons.push('OCR and government/reference data do not match');
  if (govSandboxInvalid) reasons.push('the document number fails its own official checksum/format — it is not a structurally valid number');
  if (forensicFlagged) reasons.push(`document forensics flagged this document as likely tampered (tampering probability ${Math.round(tamperingProbability)}%)`);
  else if (forensicReview) reasons.push(`document forensics found an anomaly that needs manual review (tampering probability ${Math.round(tamperingProbability)}%)`);
  if (faceMatchStatus === 'NO MATCH' || faceMatchStatus === 'NO_MATCH') reasons.push('the live face does not match the document photo');
  if (livenessAttempted && !livenessPassed) reasons.push('liveness check did not pass');
  if (antiSpoofFailed) reasons.push('anti-spoofing check raised a warning');
  if (!ocrCompleted || ocrConfidence < 0.5) reasons.push('document text could not be read with confidence');
  if (govUnavailable) reasons.push('government identity verification could not be completed');

  let riskLevel: RiskLevel;
  let riskReason: string;

  // Real, document-level red flags (tampering, identity mismatch, face
  // mismatch, a high aggregate score) always take priority over the
  // "everything's fine except government verification" message — a missing
  // government check should never mask actual evidence of fraud.
  if (identityMismatch || forensicFlagged || govSandboxInvalid || faceMatchStatus === 'NO MATCH' || faceMatchStatus === 'NO_MATCH' || riskScore >= 60) {
    riskLevel = 'HIGH RISK';
    riskReason = `Significant verification failures detected: ${reasons.join('; ')}.`;
  } else if (govConnected && livenessPassed && ocrCompleted && forensicPassed && faceMatchStatus === 'MATCH') {
    riskLevel = 'CLEAR';
    riskReason = 'All verification layers passed including government verification.';
  } else if (forensicReview || riskScore >= 30) {
    riskLevel = 'REVIEW';
    riskReason = `Manual review recommended: ${reasons.join('; ')}.`;
  } else if (govUnavailable && livenessPassed && ocrCompleted && forensicPassed) {
    riskLevel = 'REVIEW';
    riskReason = 'Document screened — identity NOT government verified. Government verification could not be completed.';
  } else if (govUnavailable) {
    riskLevel = 'UNVERIFIED';
    riskReason = 'Government identity verification could not be completed.';
  } else {
    riskLevel = 'REVIEW';
    riskReason = 'Verification incomplete — manual review recommended.';
  }

  return {
    capture_integrity: !livenessAttempted ? 'N/A' : livenessPassed ? 'VERIFIED' : 'FAILED',
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
      forensic_penalty: forensicPenalty,
      tampering_probability: tamperingProbability,
      face_match: faceMatchStatus,
      government_connected: govConnected,
      identity_status: identityStatus,
      anti_spoof: antiSpoof,
    },
  };
}
