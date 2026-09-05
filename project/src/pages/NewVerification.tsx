

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText, ScanFace, ShieldCheck,
  CheckCircle2, ChevronRight, AlertCircle, Loader2, Info,
} from 'lucide-react';
import type { DocumentType, ProcessingStep } from '@/lib/types';
import { api } from '@/lib/api';
import { runOcr } from '@/lib/ocr';
import { analyzeForensics } from '@/lib/forensics';
import { attemptGovernmentVerification } from '@/lib/gov';
import { computeIdentityBinding } from '@/lib/identityBinding';
import { compareFaces } from '@/lib/faceMatch';
import { evaluateRisk } from '@/lib/riskEngine';
import DocumentUpload from '@/components/DocumentUpload';
import ConsentModal from '@/components/ConsentModal';

// This workflow intentionally does NOT use a live webcam capture or a
// liveness/blink challenge. It is built for cases where an officer/agent is
// verifying someone using a document photo plus a reference photo that is
// already on file (HR records, hotel registration, bank KYC records,
// society/tenant records, delivery-partner onboarding photo, etc.) — not a
// self-service selfie flow. Face matching still runs (face-api.js), it just
// compares two existing images instead of requiring a fresh live capture.
type Step = 'document-type' | 'upload' | 'consent' | 'reference' | 'processing';

const docTypes: { type: DocumentType; icon: typeof FileText; desc: string }[] = [
  { type: 'Aadhaar', icon: FileText, desc: 'UIDAI Aadhaar Card' },
  { type: 'PAN', icon: FileText, desc: 'Income Tax PAN Card' },
  { type: 'Voter ID', icon: FileText, desc: 'Election Commission EPIC' },
  { type: 'Passport', icon: FileText, desc: 'Indian / Foreign Passport' },
  { type: 'Visa', icon: FileText, desc: 'Visa / Entry Permit' },
  { type: 'Driving Licence', icon: FileText, desc: 'State Transport DL' },
  { type: 'National ID', icon: FileText, desc: 'Foreign National ID Card' },
  { type: 'Other Government ID', icon: FileText, desc: 'Other official ID' },
];

export default function NewVerification() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('document-type');
  const [docType, setDocType] = useState<DocumentType | null>(null);
  const [docImage, setDocImage] = useState<string | null>(null);
  const [docFile, setDocFile] = useState<File | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const [refFile, setRefFile] = useState<File | null>(null);
  const [consentOpen, setConsentOpen] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [error, setError] = useState<string | null>(null);

  const stepOrder: Step[] = ['document-type', 'upload', 'consent', 'reference', 'processing'];
  const currentStepIndex = stepOrder.indexOf(step);

  const selectDocType = (type: DocumentType) => {
    setDocType(type);
    setStep('upload');
  };

  const handleFileSelected = (file: File, imageData: string) => {
    setDocFile(file);
    setDocImage(imageData);
  };

  const handleRemoveDoc = () => {
    setDocImage(null);
    setDocFile(null);
  };

  const handleReferenceSelected = (file: File, imageData: string) => {
    setRefFile(file);
    setRefImage(imageData);
  };

  const handleRemoveReference = () => {
    setRefImage(null);
    setRefFile(null);
  };

  const handleConsentAccept = () => {
    setConsentOpen(false);
    setStep('reference');
  };

  const handleConsentDecline = () => {
    setConsentOpen(false);
    setError('Consent is required to proceed with identity verification.');
  };

  const proceedToConsent = () => {
    setError(null);
    if (!docImage || !docFile || !docType) return;
    setConsentOpen(true);
  };

  const updateStepStatus = (id: string, status: ProcessingStep['status'], detail?: string) => {
    setProcessingSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, detail: detail ?? s.detail } : s)),
    );
  };

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const runProcessingPipeline = async () => {
    if (!docType || !docImage || !docFile || !refImage) return;

    setStep('processing');

    const steps: ProcessingStep[] = [
      { id: 'doc_received', label: 'Document received', status: 'pending' },
      { id: 'reference_received', label: 'Reference photo received', status: 'pending' },
      { id: 'ocr', label: 'OCR processing', status: 'pending' },
      { id: 'forensics', label: 'Forensics processing', status: 'pending' },
      { id: 'biometric', label: 'Biometric matching', status: 'pending' },
      { id: 'government', label: 'Government verification', status: 'pending' },
      { id: 'binding', label: 'Identity binding', status: 'pending' },
      { id: 'risk', label: 'Risk assessment', status: 'pending' },
    ];
    setProcessingSteps(steps);

    try {
      const caseRecord = await api.createCase(docType);

      updateStepStatus('doc_received', 'completed');
      await delay(200);

      await api.uploadDocument(caseRecord.id, docType, docFile, docImage);
      await api.saveFaceCapture(caseRecord.id, refImage, true, 1);
      await api.saveConsent(caseRecord.id, 'biometric', 'I consent to the processing of the document photo and reference photo for identity verification.', true);
      updateStepStatus('reference_received', 'completed');
      await delay(200);

      updateStepStatus('ocr', 'processing');
      let ocrResult = null;
      try {
        const ocrData = await runOcr(docImage);
        ocrResult = await api.saveOcrResult(caseRecord.id, {
          ...ocrData,
          status: 'COMPLETED',
        });
        updateStepStatus('ocr', 'completed', `Confidence: ${Math.round(ocrData.ocr_confidence * 100)}%`);
      } catch {
        ocrResult = await api.saveOcrResult(caseRecord.id, {
          extracted_name: null,
          extracted_document_number: null,
          extracted_dob: null,
          extracted_gender: null,
          extracted_address: null,
          extracted_expiry: null,
          extracted_document_type: null,
          ocr_confidence: 0,
          raw_text: '',
          status: 'FAILED',
        });
        updateStepStatus('ocr', 'failed', 'OCR processing failed');
      }
      await delay(300);

      updateStepStatus('forensics', 'processing');
      let forensicResult = null;
      try {
        const forensicData = await analyzeForensics(docImage);
        forensicResult = await api.saveForensicResult(caseRecord.id, forensicData);
        updateStepStatus('forensics', 'completed', `Tampering prob: ${forensicData.tampering_probability}%`);
      } catch {
        updateStepStatus('forensics', 'failed', 'Forensic analysis failed');
      }
      await delay(300);

      updateStepStatus('biometric', 'processing');
      let biometricResult;
      try {
        const matchResult = await compareFaces(docImage, refImage);
        biometricResult = await api.saveBiometricResult(caseRecord.id, {
          match_status: matchResult.status,
          similarity_score: matchResult.similarity / 100,
          live_face_image: refImage,
          reference_face_image: matchResult.referenceFaceImage,
          details: matchResult.details,
        });
        updateStepStatus(
          'biometric',
          'completed',
          `${matchResult.status} (${matchResult.similarity}%)`,
        );
      } catch (err) {
        biometricResult = await api.saveBiometricResult(caseRecord.id, {
          match_status: 'INCONCLUSIVE',
          similarity_score: 0,
          live_face_image: refImage,
          reference_face_image: null,
          details: {
            note: 'Biometric comparison failed due to an internal error.',
            error: err instanceof Error ? err.message : 'unknown',
          },
        });
        updateStepStatus('biometric', 'failed', 'Comparison failed — INCONCLUSIVE');
      }
      await delay(300);

      updateStepStatus('government', 'processing');
      const govResult = await attemptGovernmentVerification(docType, {
        extracted_name: ocrResult?.extracted_name || null,
        extracted_document_number: ocrResult?.extracted_document_number || null,
        extracted_dob: ocrResult?.extracted_dob || null,
      });
      const govRecord = await api.saveGovernmentVerification(caseRecord.id, govResult);
      if (govResult.status === 'NOT_CONFIGURED') {
        updateStepStatus('government', 'unavailable', 'Government API Not Connected');
      } else if (govResult.status === 'UNAVAILABLE') {
        updateStepStatus('government', 'unavailable', 'Government API Unavailable');
      } else {
        updateStepStatus('government', 'completed', govResult.status);
      }
      await delay(300);

      updateStepStatus('binding', 'processing');
      const bindingResult = computeIdentityBinding(ocrResult, govRecord, biometricResult, null, forensicResult);
      await api.saveIdentityBinding(caseRecord.id, {
        binding_matrix: bindingResult.binding_matrix,
        identity_status: bindingResult.identity_status,
        details: bindingResult.details,
      });
      updateStepStatus('binding', 'completed', bindingResult.identity_status);
      await delay(300);

      updateStepStatus('risk', 'processing');
      const riskResult = evaluateRisk(null, ocrResult, forensicResult, biometricResult, govRecord, { identity_status: bindingResult.identity_status, binding_matrix: bindingResult.binding_matrix, id: '', case_id: caseRecord.id, created_at: '', details: null });
      await api.saveRiskAssessment(caseRecord.id, riskResult);

      await api.saveEvidence(caseRecord.id, 'document', 'Uploaded Document', docImage);
      await api.saveEvidence(caseRecord.id, 'face_capture', 'Reference Photo (on file)', refImage);
      if (ocrResult) {
        await api.saveEvidence(caseRecord.id, 'ocr', 'OCR Extracted Text', ocrResult.raw_text || '', { confidence: ocrResult.ocr_confidence });
      }
      if (forensicResult) {
        await api.saveEvidence(caseRecord.id, 'forensics', 'Forensic Analysis', JSON.stringify(forensicResult.details, null, 2));
      }
      await api.saveEvidence(caseRecord.id, 'government', 'Government Response', JSON.stringify(govResult.details, null, 2));

      updateStepStatus('risk', 'completed', riskResult.risk_level);

      await api.updateCaseStatus(caseRecord.id, riskResult.risk_level === 'CLEAR' ? 'CLEAR' : riskResult.risk_level === 'HIGH RISK' ? 'HIGH RISK' : 'REVIEW', riskResult.risk_level, riskResult.risk_reason);

      await delay(500);
      navigate(`/cases/${caseRecord.id}`);
    } catch (err) {
      const e = err as Error;
      setError(e.message);
      updateStepStatus('risk', 'failed', e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">New Verification</h1>
        <p className="mt-1 text-sm text-slate-400">
          Verify a document and photo against a reference photo already on file — border checkpoints,
          hotel check-in, tenant/landlord verification, bank KYC, delivery partner or domestic staff
          onboarding, new employee checks, or any business, school, college or society.
        </p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { label: 'Document Type', key: 'document-type' },
          { label: 'Upload Document', key: 'upload' },
          { label: 'Consent', key: 'consent' },
          { label: 'Reference Photo', key: 'reference' },
          { label: 'Processing', key: 'processing' },
        ].map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={`flex h-8 items-center gap-2 rounded-lg border px-3 text-xs font-medium ${
                i === currentStepIndex
                  ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                  : i < currentStepIndex
                    ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-400'
                    : 'border-slate-700 bg-slate-800/30 text-slate-500'
              }`}
            >
              {i < currentStepIndex && <CheckCircle2 className="h-3.5 w-3.5" />}
              {s.label}
            </div>
            {i < 4 && <ChevronRight className="h-4 w-4 text-slate-600" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step: Document Type */}
      {step === 'document-type' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-400">Select the type of document to verify</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docTypes.map((d) => (
              <button
                key={d.type}
                onClick={() => selectDocType(d.type)}
                className="group flex items-center gap-4 rounded-xl border border-slate-800 bg-slate-900/50 p-5 text-left transition-all hover:border-cyan-500/50 hover:bg-slate-900"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-800 transition-colors group-hover:bg-cyan-500/10">
                  <d.icon className="h-6 w-6 text-slate-400 transition-colors group-hover:text-cyan-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{d.type}</p>
                  <p className="text-xs text-slate-500">{d.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step: Upload */}
      {step === 'upload' && docType && (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex items-center gap-3">
              <FileText className="h-5 w-5 text-cyan-400" />
              <div>
                <p className="text-sm font-semibold text-white">Document: {docType}</p>
                <p className="text-xs text-slate-500">Upload a clear photo or scan of the {docType}</p>
              </div>
            </div>
          </div>

          <DocumentUpload
            onFileSelected={handleFileSelected}
            uploadedImage={docImage}
            fileName={docFile?.name || null}
            onRemove={handleRemoveDoc}
          />

          {docImage && (
            <div className="flex justify-between">
              <button
                onClick={() => { setDocType(null); setDocImage(null); setDocFile(null); setStep('document-type'); }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
              >
                Back
              </button>
              <button
                onClick={proceedToConsent}
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
              >
                <ShieldCheck className="h-4 w-4" />
                Continue
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step: Reference Photo (no live camera / no liveness — an existing
          photo already on record is used for the face match) */}
      {step === 'reference' && (
        <div className="space-y-6">
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 shrink-0 text-cyan-400" />
              <div>
                <p className="text-sm font-medium text-white">Reference Photo</p>
                <p className="mt-1 text-xs text-slate-400">
                  Upload the photo already on file for this person — e.g. an HR/employee record, hotel
                  registration photo, bank KYC photo, tenant record, or a previous ID photo. This is
                  compared against the document photo; no live camera capture or liveness check is
                  required for this workflow.
                </p>
              </div>
            </div>
          </div>

          <DocumentUpload
            onFileSelected={handleReferenceSelected}
            uploadedImage={refImage}
            fileName={refFile?.name || null}
            onRemove={handleRemoveReference}
          />

          {refImage && (
            <div className="flex justify-between">
              <button
                onClick={() => { setRefImage(null); setRefFile(null); setStep('upload'); }}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
              >
                Back
              </button>
              <button
                onClick={runProcessingPipeline}
                className="flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
              >
                <ScanFace className="h-4 w-4" />
                Run Verification
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step: Processing */}
      {step === 'processing' && (
        <div className="mx-auto max-w-2xl space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-cyan-500/10">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Processing Verification</h2>
            <p className="mt-1 text-sm text-slate-400">Running all verification layers. Do not close this page.</p>
          </div>

          <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-900/50 p-6">
            {processingSteps.map((s) => (
              <div key={s.id} className="flex items-center gap-3 py-2">
                {s.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-emerald-400" />}
                {s.status === 'processing' && <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />}
                {s.status === 'pending' && <div className="h-5 w-5 rounded-full border-2 border-slate-700" />}
                {s.status === 'failed' && <AlertCircle className="h-5 w-5 text-red-400" />}
                {s.status === 'unavailable' && <div className="h-5 w-5 rounded-full border-2 border-slate-600 border-dashed" />}
                <div className="flex-1">
                  <p className={`text-sm ${s.status === 'pending' ? 'text-slate-500' : 'text-slate-200'}`}>{s.label}</p>
                  {s.detail && <p className="text-xs text-slate-500">{s.detail}</p>}
                </div>
                <span className="text-xs font-medium">
                  {s.status === 'completed' && <span className="text-emerald-400">Done</span>}
                  {s.status === 'processing' && <span className="text-cyan-400">Processing...</span>}
                  {s.status === 'pending' && <span className="text-slate-600">Pending</span>}
                  {s.status === 'failed' && <span className="text-red-400">Failed</span>}
                  {s.status === 'unavailable' && <span className="text-slate-500">Unavailable</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConsentModal
        open={consentOpen}
        title="Identity Verification Consent"
        description="You are about to begin identity verification. The uploaded document photo and the reference photo on file will be processed and compared for identity verification. Government verification will only be attempted if authorized API credentials are configured on the backend."
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
    </div>
  );
}

