
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, FileText, ScanFace, Eye, Fingerprint, ShieldCheck,
  Loader2, AlertCircle, Copy, Check,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { CaseDetails } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import RiskGauge from '@/components/RiskGauge';
import IdentityBindingMatrix from '@/components/IdentityBindingMatrix';
import EvidenceViewer from '@/components/EvidenceViewer';

export default function CaseDetails() {
  const { caseId } = useParams<{ caseId: string }>();
  const navigate = useNavigate();
  const [details, setDetails] = useState<CaseDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!caseId) return;
    api.getCaseDetails(caseId)
      .then((d) => setDetails(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (error || !details) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="mt-3 text-sm text-slate-400">{error || 'Case not found'}</p>
        <button onClick={() => navigate('/cases')} className="mt-4 text-sm text-cyan-400 hover:text-cyan-300">
          Back to Cases
        </button>
      </div>
    );
  }

  const { case: caseData, document: doc, face_capture: face, liveness, biometric, ocr, forensic, government, identity_binding, risk, evidence, audit_logs } = details;

  const copyCaseId = () => {
    navigator.clipboard.writeText(caseData.case_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/cases')}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">{caseData.case_id}</h1>
            <button onClick={copyCaseId} className="text-slate-500 hover:text-slate-300">
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            {caseData.document_type} · {new Date(caseData.created_at).toLocaleString('en-IN')}
            {caseData.demo_mode && <span className="ml-2 rounded bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">DEMO MODE</span>}
          </p>
        </div>
        <StatusBadge status={caseData.status} />
      </div>

      {/* Final Result Banner */}
      {risk && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <RiskGauge level={risk.risk_level} score={risk.risk_score} reason={risk.risk_reason || ''} />
          </div>
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <ResultCard label="Capture Integrity" value={risk.capture_integrity} icon={ScanFace} />
              <ResultCard label="Liveness" value={risk.liveness_status} icon={Eye} />
              <ResultCard label="Face Match" value={risk.face_match_status} icon={Fingerprint} />
              <ResultCard label="OCR Quality" value={risk.ocr_quality} icon={FileText} />
              <ResultCard label="Government" value={risk.government_status} icon={ShieldCheck} />
              <ResultCard label="Forensics" value={risk.forensics_status} icon={FileText} />
              <ResultCard label="Identity Consistency" value={risk.identity_consistency} icon={ShieldCheck} />
              <ResultCard label="Anti-Spoof" value={risk.injection_status} icon={ScanFace} />
            </div>
          </div>
        </div>
      )}

      {/* Document & Face */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Submitted Document</h3>
          </div>
          {doc?.image_data ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-700">
              <img src={doc.image_data} alt="Document" className="w-full" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No document uploaded</p>
          )}
          {doc && (
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <p>File: {doc.file_name}</p>
              <p>Size: {doc.file_size ? (doc.file_size / 1024).toFixed(1) + ' KB' : '--'}</p>
              <p>Type: {doc.mime_type || '--'}</p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center gap-2">
            <ScanFace className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Live Face Capture</h3>
          </div>
          {face?.image_data ? (
            <div className="mt-3 overflow-hidden rounded-lg border border-slate-700">
              <img src={face.image_data} alt="Face capture" className="w-full" />
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No face captured</p>
          )}
          {face && (
            <div className="mt-3 space-y-1 text-xs text-slate-500">
              <p>Face detected: {face.face_detected ? 'Yes' : 'No'}</p>
              <p>Face count: {face.face_count}</p>
            </div>
          )}
        </div>
      </div>

      {/* Liveness & Biometric */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Liveness Result</h3>
            </div>
            {liveness && <StatusBadge status={liveness.status} size="sm" />}
          </div>
          {liveness ? (
            <div className="mt-3 space-y-2 text-sm">
              <KV label="Challenge" value={liveness.challenge_type || '--'} />
              <KV label="Passed" value={liveness.challenge_passed ? 'Yes' : 'No'} />
              <KV label="Score" value={`${Math.round(liveness.liveness_score * 100)}%`} />
              <KV label="Anti-Spoof" value={liveness.anti_spoof_status || '--'} />
            </div>
          ) : <p className="mt-3 text-sm text-slate-500">Liveness not performed</p>}
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Biometric Match</h3>
            </div>
            {biometric && <StatusBadge status={biometric.match_status} size="sm" />}
          </div>
          {biometric ? (
            <div className="mt-3 space-y-2 text-sm">
              <KV label="Match Status" value={biometric.match_status} />
              <KV label="Similarity Score" value={`${Math.round(biometric.similarity_score * 100)}%`} />
              <div className="flex gap-3">
                {biometric.live_face_image && (
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Live Face</p>
                    <img src={biometric.live_face_image} alt="Live" className="h-24 rounded-lg border border-slate-700" />
                  </div>
                )}
                {biometric.reference_face_image ? (
                  <div>
                    <p className="mb-1 text-xs text-slate-500">Reference Face</p>
                    <img src={biometric.reference_face_image} alt="Reference" className="h-24 rounded-lg border border-slate-700" />
                  </div>
                ) : (
                  <div className="flex h-24 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/50 p-3 text-center text-xs text-slate-500">
                    No reference face available
                  </div>
                )}
              </div>
              {biometric.details && typeof biometric.details === 'object' && 'note' in biometric.details && (
                <p className="mt-2 rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400">
                  {String((biometric.details as Record<string, unknown>).note)}
                </p>
              )}
            </div>
          ) : <p className="mt-3 text-sm text-slate-500">Biometric not performed</p>}
        </div>
      </div>

      {/* OCR Results */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">OCR Results</h3>
          </div>
          {ocr && <StatusBadge status={ocr.status} size="sm" />}
        </div>
        {ocr ? (
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <KV label="Name" value={ocr.extracted_name || '--'} />
              <KV label="Document Number" value={ocr.extracted_document_number || '--'} />
              <KV label="Date of Birth" value={ocr.extracted_dob || '--'} />
              <KV label="Gender" value={ocr.extracted_gender || '--'} />
              <KV label="Expiry" value={ocr.extracted_expiry || '--'} />
              <KV label="Document Type" value={ocr.extracted_document_type || '--'} />
              <KV label="OCR Confidence" value={`${Math.round(ocr.ocr_confidence * 100)}%`} />
            </div>
            {ocr.extracted_address && (
              <KV label="Address" value={ocr.extracted_address} />
            )}
            {ocr.raw_text && (
              <div>
                <p className="mb-1 text-xs font-medium text-slate-500">Raw OCR Text</p>
                <pre className="max-h-40 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs text-slate-400 whitespace-pre-wrap">{ocr.raw_text}</pre>
              </div>
            )}
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-xs text-amber-400">
                OCR-extracted data is NOT government verification. It is machine-read from the uploaded document only.
              </p>
            </div>
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">OCR not performed</p>}
      </div>

      {/* Forensics */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Document Forensics</h3>
          </div>
          {forensic && <StatusBadge status={forensic.status} size="sm" />}
        </div>
        {forensic ? (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <KV label="Image Quality" value={`${forensic.image_quality}/100`} />
            <KV label="Tampering Probability" value={`${forensic.tampering_probability}%`} />
            <KV label="CNN Authenticity" value={`${forensic.cnn_authenticity_score}/100`} />
            <KV label="Compression Anomaly" value={forensic.compression_anomaly ? 'Detected' : 'None'} />
            <KV label="Pixel Inconsistency" value={forensic.pixel_inconsistency ? 'Detected' : 'None'} />
            <KV label="Copy/Paste Anomaly" value={forensic.copy_paste_anomaly ? 'Detected' : 'None'} />
            {forensic.ela_result && (
              <div className="col-span-full rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-medium text-slate-500">ELA Analysis</p>
                <p className="mt-1 text-sm text-slate-300">
                  {(forensic.ela_result as Record<string, unknown>).description as string}
                </p>
              </div>
            )}
            {forensic.details && (
              <div className="col-span-full rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-medium text-slate-500">Analysis Details</p>
                <pre className="mt-1 text-xs text-slate-400 whitespace-pre-wrap">
                  {JSON.stringify(forensic.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">Forensics not performed</p>}
      </div>

      {/* Government Verification */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <h3 className="text-sm font-semibold text-white">Government Verification</h3>
          </div>
          {government && <StatusBadge status={government.status} size="sm" />}
        </div>
        {government ? (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <KV label="Document Type" value={government.document_type} />
              <KV label="Verification Method" value={government.verification_method || '--'} />
              <KV label="Verified Name" value={government.verified_name || '--'} />
              <KV label="Verified Document Number" value={government.verified_document_number || '--'} />
              <KV label="Verified DOB" value={government.verified_dob || '--'} />
            </div>
            {government.details && (
              <div className="rounded-lg border border-slate-800 bg-slate-950 p-3">
                <p className="text-xs font-medium text-slate-500">Details</p>
                <pre className="mt-1 text-xs text-slate-400 whitespace-pre-wrap">
                  {JSON.stringify(government.details, null, 2)}
                </pre>
              </div>
            )}
            {government.status === 'NOT_CONFIGURED' && (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs text-amber-400">
                  Government API Not Connected. Identity has NOT been government verified.
                  Configure authorized API credentials to enable government verification.
                </p>
              </div>
            )}
          </div>
        ) : <p className="mt-3 text-sm text-slate-500">Government verification not attempted</p>}
      </div>

      {/* Identity Binding */}
      {identity_binding && identity_binding.binding_matrix && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
              <h3 className="text-sm font-semibold text-white">Identity Binding Matrix</h3>
            </div>
            <StatusBadge status={identity_binding.identity_status} size="sm" />
          </div>
          <div className="mt-4">
            <IdentityBindingMatrix entries={identity_binding.binding_matrix as unknown as import('@/lib/types').BindingMatrixEntry[]} />
          </div>
        </div>
      )}

      {/* Evidence Viewer */}
      <EvidenceViewer evidence={evidence} />

      {/* Audit Trail */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h3 className="text-sm font-semibold text-white">Audit Trail</h3>
        <div className="mt-4 space-y-2">
          {audit_logs.length === 0 ? (
            <p className="text-sm text-slate-500">No audit logs</p>
          ) : (
            audit_logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-lg border border-slate-800/50 bg-slate-950/50 p-3">
                <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                  log.result === 'Success' || log.result === 'CLEAR' ? 'bg-emerald-500' :
                  log.result === 'Failed' || log.result === 'HIGH RISK' ? 'bg-red-500' :
                  log.result === 'NOT_CONFIGURED' ? 'bg-slate-500' :
                  'bg-amber-500'
                }`} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-200">{log.action}</p>
                    <span className="text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  <div className="mt-0.5 flex gap-3 text-xs text-slate-500">
                    {log.service && <span>Service: {log.service}</span>}
                    {log.result && <span>Result: {log.result}</span>}
                    {log.session_id && <span>Session: {log.session_id.slice(0, 12)}...</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ResultCard({ label, value, icon: Icon }: { label: string; value: string | null; icon: typeof FileText }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-500" />
        <span className="text-xs font-medium text-slate-500">{label}</span>
      </div>
      <p className="mt-1.5 text-sm font-medium text-slate-200">{value || '--'}</p>
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm text-slate-200 break-words">{value}</p>
    </div>
  );
}

