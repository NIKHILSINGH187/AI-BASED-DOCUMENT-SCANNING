
import { Gauge } from 'lucide-react';
import type { RiskLevel } from '@/lib/types';

interface RiskGaugeProps {
  level: RiskLevel;
  score: number;
  reason: string;
}

const levelConfig: Record<RiskLevel, { color: string; bg: string; label: string }> = {
  CLEAR: { color: 'text-emerald-400', bg: 'from-emerald-500/20 to-emerald-500/5', label: 'CLEAR' },
  REVIEW: { color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5', label: 'REVIEW' },
  'HIGH RISK': { color: 'text-red-400', bg: 'from-red-500/20 to-red-500/5', label: 'HIGH RISK' },
  UNVERIFIED: { color: 'text-amber-400', bg: 'from-amber-500/20 to-amber-500/5', label: 'UNVERIFIED' },
};

export default function RiskGauge({ level, score, reason }: RiskGaugeProps) {
  const config = levelConfig[level];
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor =
    level === 'CLEAR' ? '#10b981' : level === 'REVIEW' || level === 'UNVERIFIED' ? '#f59e0b' : level === 'HIGH RISK' ? '#ef4444' : '#64748b';

  return (
    <div className={`rounded-2xl border border-slate-800 bg-gradient-to-br ${config.bg} p-6`}>
      <div className="flex items-center gap-3">
        <Gauge className={`h-5 w-5 ${config.color}`} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Risk Assessment</h3>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <div className="relative h-40 w-40">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="#1e293b" strokeWidth="10" />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${config.color}`}>{Math.round(score)}</span>
            <span className="text-xs text-slate-500">Risk Score</span>
          </div>
        </div>

        <div className={`mt-4 rounded-full border border-slate-700 bg-slate-900/80 px-6 py-2 text-lg font-bold ${config.color}`}>
          {config.label}
        </div>
      </div>

      <p className="mt-4 text-center text-sm leading-relaxed text-slate-400">{reason}</p>
    </div>
  );
}

