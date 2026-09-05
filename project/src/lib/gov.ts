
import type { DocumentType, GovernmentStatus } from './types';
import { supabase } from './supabase';

export interface GovernmentVerificationResult {
  document_type: DocumentType;
  verification_method: string;
  status: GovernmentStatus;
  verified_name: string | null;
  verified_document_number: string | null;
  verified_dob: string | null;
  details: Record<string, unknown>;
}

export function checkGovernmentApiConfigured(): boolean {
  return false;
}

export function getGovernmentApiStatus(): string {
  return 'NOT_CONFIGURED';
}

// --- Verhoeff checksum algorithm ---
// This is the exact checksum algorithm UIDAI itself uses to generate the
// 12th (last) digit of every real Aadhaar number. Validating it here is a
// genuine, offline, zero-cost mathematical check — it cannot confirm the
// number is actually issued to a real person (that requires a live UIDAI
// API, which is legally restricted to licensed AUA/KUA entities), but a
// number that FAILS this checksum is definitely not a valid Aadhaar number
// at all (e.g. randomly typed digits, or a fabricated number), which is a
// genuinely useful and free authenticity signal.
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

function isValidAadhaarChecksum(rawNumber: string): boolean {
  const digits = rawNumber.replace(/\D/g, '');
  if (digits.length !== 12) return false;
  // Aadhaar numbers never start with 0 or 1.
  if (digits[0] === '0' || digits[0] === '1') return false;

  let c = 0;
  const reversed = digits.split('').reverse().map(Number);
  for (let i = 0; i < reversed.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][reversed[i]]];
  }
  return c === 0;
}

// PAN format per Income Tax Department spec: AAAAA9999A. The 4th letter
// encodes the holder type (P = individual, C = company, H = HUF, etc).
const PAN_HOLDER_TYPES: Record<string, string> = {
  P: 'Individual',
  C: 'Company',
  H: 'Hindu Undivided Family',
  A: 'Association of Persons',
  B: 'Body of Individuals',
  G: 'Government',
  J: 'Artificial Juridical Person',
  L: 'Local Authority',
  F: 'Firm / LLP',
  T: 'Trust',
};

function isValidPanFormat(rawNumber: string): { valid: boolean; holderType: string | null } {
  const value = rawNumber.replace(/\s/g, '').toUpperCase();
  const match = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(value);
  if (!match) return { valid: false, holderType: null };
  return { valid: true, holderType: PAN_HOLDER_TYPES[value[3]] || null };
}

export async function attemptGovernmentVerification(
  documentType: DocumentType,
  extractedData: {
    extracted_name: string | null;
    extracted_document_number: string | null;
    extracted_dob: string | null;
  },
): Promise<GovernmentVerificationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('government-verify', {
      body: {
        document_type: documentType,
        extracted_name: extractedData.extracted_name,
        extracted_document_number: extractedData.extracted_document_number,
        extracted_dob: extractedData.extracted_dob,
      },
    });

    if (!error && data) {
      return {
        document_type: documentType,
        verification_method: data.verification_method || 'API',
        status: data.status || 'NOT_CONFIGURED',
        verified_name: data.verified_name || null,
        verified_document_number: data.verified_document_number || null,
        verified_dob: data.verified_dob || null,
        details: data.details || { message: 'No details returned from backend.' },
      };
    }
  } catch {
    // fall through to offline sandbox check below
  }

  return runSandboxChecksumVerification(documentType, extractedData);
}

// No licensed UIDAI/Income-Tax backend is configured (see buildNotConfiguredResult
// below for why that requires official credentials this project cannot obtain).
// As a genuinely useful, free, offline fallback, this validates the extracted
// document number's own checksum/format — the same first check a real
// verification backend would do before ever calling a government database.
// This is clearly labeled SANDBOX in the UI and is never presented as an
// actual UIDAI/Income-Tax confirmation.
function runSandboxChecksumVerification(
  documentType: DocumentType,
  extractedData: {
    extracted_name: string | null;
    extracted_document_number: string | null;
    extracted_dob: string | null;
  },
): GovernmentVerificationResult {
  const docNumber = extractedData.extracted_document_number;

  if (documentType === 'Aadhaar') {
    if (!docNumber) {
      return buildNotConfiguredResult(documentType, 'No Aadhaar number was extracted to validate.');
    }
    const valid = isValidAadhaarChecksum(docNumber);
    return {
      document_type: documentType,
      verification_method: 'Offline Verhoeff checksum (sandbox — not a live UIDAI lookup)',
      status: valid ? 'SANDBOX_VALID' : 'SANDBOX_INVALID',
      verified_name: null,
      verified_document_number: docNumber,
      verified_dob: null,
      details: {
        configured: false,
        mode: 'SANDBOX',
        message: valid
          ? 'The Aadhaar number passes the official Verhoeff checksum UIDAI uses to generate it — it is a structurally valid number. This does NOT confirm it is issued to a real person; that requires a live UIDAI e-KYC API, which is restricted to licensed AUA/KUA entities under the Aadhaar Act, 2016.'
          : 'The Aadhaar number FAILS the official Verhoeff checksum — this is not a structurally valid Aadhaar number (e.g. mistyped, fabricated, or OCR misread).',
        note: 'Real-time UIDAI verification unavailable — authorized integration required (GOVERNMENT_API_BASE_URL, GOVERNMENT_API_KEY, GOVERNMENT_CLIENT_ID, GOVERNMENT_CLIENT_SECRET).',
      },
    };
  }

  if (documentType === 'PAN') {
    if (!docNumber) {
      return buildNotConfiguredResult(documentType, 'No PAN number was extracted to validate.');
    }
    const { valid, holderType } = isValidPanFormat(docNumber);
    return {
      document_type: documentType,
      verification_method: 'Offline PAN format check (sandbox — not a live ITD lookup)',
      status: valid ? 'SANDBOX_VALID' : 'SANDBOX_INVALID',
      verified_name: null,
      verified_document_number: docNumber,
      verified_dob: null,
      details: {
        configured: false,
        mode: 'SANDBOX',
        holder_type: holderType,
        message: valid
          ? `The PAN matches the Income Tax Department's official format (AAAAA9999A)${holderType ? `, holder type: ${holderType}` : ''}. This does NOT confirm it is issued to a real person; that requires the ITD's PAN Verification Webservice, which requires authorized API credentials.`
          : 'The PAN does not match the required format (5 letters + 4 digits + 1 letter) — this is not a structurally valid PAN.',
        note: 'Real-time Income Tax Department verification unavailable — authorized integration required.',
      },
    };
  }

  return buildNotConfiguredResult(documentType, 'No offline sandbox check is defined for this document type.');
}

function buildNotConfiguredResult(documentType: DocumentType, extraMsg: string): GovernmentVerificationResult {
  let method = 'N/A';
  let detailsMessage = '';

  switch (documentType) {
    case 'Aadhaar':
      method = 'OTP / Demographic / Biometric / e-KYC';
      detailsMessage =
        'UIDAI verification unavailable — authorized integration required. Government API credentials must be configured on the backend (GOVERNMENT_API_BASE_URL, GOVERNMENT_API_KEY, GOVERNMENT_CLIENT_ID, GOVERNMENT_CLIENT_SECRET).';
      break;
    case 'PAN':
      method = 'Name + DOB + PAN verification';
      detailsMessage =
        'PAN Government Verification: NOT CONNECTED. Income Tax Department PAN Verification Webservice requires authorized API credentials configured on the backend.';
      break;
    default:
      method = 'Document verification';
      detailsMessage =
        'Government verification adapter not configured. Authorized API credentials required on the backend.';
      break;
  }

  return {
    document_type: documentType,
    verification_method: method,
    status: 'NOT_CONFIGURED',
    verified_name: null,
    verified_document_number: null,
    verified_dob: null,
    details: {
      configured: false,
      message: detailsMessage,
      adapter: `${documentType}VerificationAdapter`,
      note: extraMsg,
      required_backend_env_vars: [
        'GOVERNMENT_API_BASE_URL',
        'GOVERNMENT_API_KEY',
        'GOVERNMENT_CLIENT_ID',
        'GOVERNMENT_CLIENT_SECRET',
      ],
    },
  };
}
