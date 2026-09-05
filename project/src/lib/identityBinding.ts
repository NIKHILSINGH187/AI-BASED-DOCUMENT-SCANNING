
import type { BindingMatrixEntry, IdentityStatus, OcrResult, GovernmentVerification, BiometricResult, LivenessResult, ForensicResult } from './types';

export interface IdentityBindingResult {
  binding_matrix: BindingMatrixEntry[];
  identity_status: IdentityStatus;
  details: Record<string, unknown>;
}

export function computeIdentityBinding(
  ocr: OcrResult | null,
  government: GovernmentVerification | null,
  biometric: BiometricResult | null,
  liveness: LivenessResult | null,
  forensic: ForensicResult | null,
): IdentityBindingResult {
  const matrix: BindingMatrixEntry[] = [];

  const govConnected = government?.status === 'VERIFIED';
  const govSandboxValid = government?.status === 'SANDBOX_VALID';
  const govSandboxInvalid = government?.status === 'SANDBOX_INVALID';
  const govAvailable = government !== null && government.status !== 'NOT_CONFIGURED';

  const nameEntry: BindingMatrixEntry = {
    field: 'Name',
    ocr: ocr?.extracted_name ? 'EXTRACTED' : 'N/A',
    government: govConnected ? (government?.verified_name ? 'MATCH' : 'N/A') : govAvailable ? 'N/A' : 'NOT CONNECTED',
    biometric: 'N/A',
    final: govConnected && government?.verified_name && ocr?.extracted_name ? 'MATCH' : ocr?.extracted_name ? 'EXTRACTED' : 'N/A',
  };
  matrix.push(nameEntry);

  const dobEntry: BindingMatrixEntry = {
    field: 'Date of Birth',
    ocr: ocr?.extracted_dob ? 'EXTRACTED' : 'N/A',
    government: govConnected ? (government?.verified_dob ? 'MATCH' : 'N/A') : govAvailable ? 'N/A' : 'NOT CONNECTED',
    biometric: 'N/A',
    final: govConnected && government?.verified_dob && ocr?.extracted_dob ? 'MATCH' : ocr?.extracted_dob ? 'EXTRACTED' : 'N/A',
  };
  matrix.push(dobEntry);

  const docNumEntry: BindingMatrixEntry = {
    field: 'Document Number',
    ocr: ocr?.extracted_document_number ? 'EXTRACTED' : 'N/A',
    government: govConnected
      ? (government?.verified_document_number ? 'MATCH' : 'N/A')
      : govSandboxValid
        ? 'SANDBOX VALID'
        : govSandboxInvalid
          ? 'SANDBOX INVALID'
          : govAvailable
            ? 'N/A'
            : 'NOT CONNECTED',
    biometric: 'N/A',
    final: govConnected && government?.verified_document_number && ocr?.extracted_document_number
      ? 'MATCH'
      : govSandboxInvalid
        ? 'REVIEW'
        : govSandboxValid
          ? 'EXTRACTED'
          : ocr?.extracted_document_number
            ? 'EXTRACTED'
            : 'N/A',
  };
  matrix.push(docNumEntry);

  const faceEntry: BindingMatrixEntry = {
    field: 'Face',
    ocr: 'N/A',
    government: government?.status === 'VERIFIED' ? 'REFERENCE' : 'N/A',
    biometric: biometric?.match_status || 'N/A',
    final: biometric?.match_status === 'MATCH' ? 'MATCH' : biometric?.match_status || 'N/A',
  };
  matrix.push(faceEntry);

  const livenessEntry: BindingMatrixEntry = {
    field: 'Liveness',
    ocr: 'N/A',
    government: 'N/A',
    biometric: liveness?.status === 'PASSED' ? 'PASSED' : liveness?.status || 'N/A',
    final: liveness?.status === 'PASSED' ? 'PASSED' : liveness?.status || 'N/A',
  };
  matrix.push(livenessEntry);

  const forensicsEntry: BindingMatrixEntry = {
    field: 'Document Forensics',
    ocr: 'N/A',
    government: 'N/A',
    biometric: 'N/A',
    final: forensic?.status || 'N/A',
  };
  matrix.push(forensicsEntry);

  let identityStatus: IdentityStatus = 'PENDING';
  const govUnavailable = !govConnected && (government?.status === 'NOT_CONFIGURED' || government?.status === 'UNAVAILABLE');

  if (govUnavailable) {
    identityStatus = 'GOVERNMENT SERVICE UNAVAILABLE';
  } else if (govConnected) {
    const allMatch = matrix.every((e) => e.final === 'MATCH' || e.final === 'N/A' || e.final === 'PASSED' || e.final === 'EXTRACTED');
    const hasMismatch = matrix.some((e) => e.final === 'NO MATCH' || e.final === 'MISMATCH');
    if (hasMismatch) {
      identityStatus = 'MISMATCH';
    } else if (allMatch) {
      identityStatus = 'VERIFIED';
    } else {
      identityStatus = 'PARTIALLY VERIFIED';
    }
  } else if (govSandboxInvalid) {
    identityStatus = 'MISMATCH';
  } else {
    const hasData = ocr?.extracted_name || ocr?.extracted_document_number;
    if (hasData) {
      identityStatus = 'INCONCLUSIVE';
    }
  }

  return {
    binding_matrix: matrix,
    identity_status: identityStatus,
    details: {
      government_connected: govConnected,
      government_sandbox_valid: govSandboxValid,
      ocr_completed: ocr?.status === 'COMPLETED',
      biometric_completed: biometric?.match_status !== 'PENDING',
      liveness_passed: liveness?.status === 'PASSED',
      forensics_status: forensic?.status,
    },
  };
}
