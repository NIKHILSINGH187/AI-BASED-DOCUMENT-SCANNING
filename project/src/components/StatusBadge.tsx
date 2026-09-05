import type { VerificationStatus, GovernmentStatus, RiskLevel, MatchStatus, LivenessStatus, ForensicStatus, IdentityStatus } from '@/lib/types';

type StatusType = VerificationStatus | GovernmentStatus | RiskLevel | MatchStatus | LivenessStatus | ForensicStatus | IdentityStatus | string;

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string; glow?: string }> = {
  CLEAR: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', glow: 'shadow-[0_0_0_3px_rgba(16,185,129,0.1)]' },
  VERIFIED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', glow: 'shadow-[0_0_0_3px_rgba(16,185,129,0.1)]' },
  MATCH: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', glow: 'shadow-[0_0_0_3px_rgba(16,185,129,0.1)]' },
  PASSED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500', glow: 'shadow-[0_0_0_3px_rgba(16,185,129,0.1)]' },
  'LIVENESS PASS': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  'REAL CAMERA': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },

  REVIEW: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500', glow: 'shadow-[0_0_0_3px_rgba(245,158,11,0.1)]' },
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  INCONCLUSIVE: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'PARTIALLY VERIFIED': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'MANUAL REVIEW': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'VIRTUAL CAMERA WARNING': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  'REPLAY WARNING': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },

  'HIGH RISK': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500', glow: 'shadow-[0_0_0_3px_rgba(239,68,68,0.1)]' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  'NO MATCH': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  'LIVENESS FAIL': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  FLAGGED: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  MISMATCH: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },

  UNVERIFIED: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  SANDBOX_VALID: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  SANDBOX_INVALID: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  'SERVICE UNAVAILABLE': { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
  'NOT_CONFIGURED': { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
  'NOT CONNECTED': { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
  UNAVAILABLE: { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
  'MODEL NOT CONNECTED': { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
  'GOVERNMENT SERVICE UNAVAILABLE': { bg: 'bg-slate-100', text: 'text-slate-500', border: 'border-slate-200', dot: 'bg-slate-400' },
  N_A: { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200', dot: 'bg-slate-300' },

  PROCESSING: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
};

export default function StatusBadge({ status, size = 'md' }: { status: StatusType; size?: 'sm' | 'md' }) {
  const normalized = (status || '').toUpperCase().replace(/-/g, '_').replace(/\s+/g, ' ');
  const config = statusConfig[normalized] || statusConfig['PENDING'];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex animate-fade-in items-center gap-1.5 rounded-full border transition-shadow duration-300 ${config.bg} ${config.text} ${config.border} ${config.glow || ''} ${sizeClasses} font-medium whitespace-nowrap`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} ${normalized === 'PROCESSING' ? 'animate-pulse' : ''}`} />
      {status || 'PENDING'}
    </span>
  );
}
