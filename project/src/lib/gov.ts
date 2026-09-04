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

    if (error || !data) {
      return buildNotConfiguredResult(documentType, 'Backend verification service returned an error.');
    }

    return {
      document_type: documentType,
      verification_method: data.verification_method || 'API',
      status: data.status || 'NOT_CONFIGURED',
      verified_name: data.verified_name || null,
      verified_document_number: data.verified_document_number || null,
      verified_dob: data.verified_dob || null,
      details: data.details || { message: 'No details returned from backend.' },
    };
  } catch {
    return buildNotConfiguredResult(documentType, 'Government verification backend not reachable.');
  }
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
