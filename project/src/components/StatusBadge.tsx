
import type { VerificationStatus, GovernmentStatus, RiskLevel, MatchStatus, LivenessStatus, ForensicStatus, IdentityStatus } from '@/lib/types';

type StatusType = VerificationStatus | GovernmentStatus | RiskLevel | MatchStatus | LivenessStatus | ForensicStatus | IdentityStatus | string;

const statusConfig: Record<string, { bg: string; text: string; border: string; dot: string; glow?: string }> = {
  CLEAR: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]' },
  VERIFIED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]' },
  MATCH: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]' },
  PASSED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500', glow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]' },
  'LIVENESS PASS': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
  'REAL CAMERA': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },

  REVIEW: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500', glow: 'shadow-[0_0_10px_rgba(245,158,11,0.4)]' },
  PENDING: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  INCONCLUSIVE: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  'PARTIALLY VERIFIED': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  'MANUAL REVIEW': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  'VIRTUAL CAMERA WARNING': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  'REPLAY WARNING': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },

  'HIGH RISK': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500', glow: 'shadow-[0_0_10px_rgba(239,68,68,0.4)]' },
  FAILED: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  'NO MATCH': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  'LIVENESS FAIL': { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  FLAGGED: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  MISMATCH: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },

  UNVERIFIED: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30', dot: 'bg-amber-500' },
  SANDBOX_VALID: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30', dot: 'bg-cyan-500' },
  SANDBOX_INVALID: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30', dot: 'bg-red-500' },
  'SERVICE UNAVAILABLE': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' },
  'NOT_CONFIGURED': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' },
  'NOT CONNECTED': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' },
  UNAVAILABLE: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' },
  'MODEL NOT CONNECTED': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' },
  'GOVERNMENT SERVICE UNAVAILABLE': { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/30', dot: 'bg-slate-500' },
  N_A: { bg: 'bg-slate-700/10', text: 'text-slate-500', border: 'border-slate-700/30', dot: 'bg-slate-600' },

  PROCESSING: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', dot: 'bg-emerald-500' },
};

export default function StatusBadge({ status, size = 'md' }: { status: StatusType; size?: 'sm' | 'md' }) {
  const normalized = (status || '').toUpperCase().replace(/-/g, '_').replace(/\s+/g, ' ');
  const config = statusConfig[normalized] || statusConfig['PENDING'];
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1';

  return (
    <span
      className={`inline-flex animate-fade-in items-center gap-1.5 rounded-full border backdrop-blur-sm transition-shadow duration-300 ${config.bg} ${config.text} ${config.border} ${config.glow || ''} ${sizeClasses} font-medium whitespace-nowrap`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot} ${normalized === 'PROCESSING' ? 'animate-pulse' : ''}`} />
      {status || 'PENDING'}
    </span>
  );
}
