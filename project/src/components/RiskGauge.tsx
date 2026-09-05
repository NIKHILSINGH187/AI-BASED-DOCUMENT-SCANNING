import { useEffect, useState } from 'react';
import { Gauge } from 'lucide-react';
import type { RiskLevel } from '@/lib/types';

interface RiskGaugeProps {
  level: RiskLevel;
  score: number;
  reason: string;
}

const levelConfig: Record<RiskLevel, { color: string; bg: string; label: string }> = {
  CLEAR: { color: 'text-emerald-600', bg: 'from-emerald-50 to-white', label: 'CLEAR' },
  REVIEW: { color: 'text-amber-600', bg: 'from-amber-50 to-white', label: 'REVIEW' },
  'HIGH RISK': { color: 'text-red-600', bg: 'from-red-50 to-white', label: 'HIGH RISK' },
  UNVERIFIED: { color: 'text-amber-600', bg: 'from-amber-50 to-white', label: 'UNVERIFIED' },
};

export default function RiskGauge({ level, score, reason }: RiskGaugeProps) {
  const config = levelConfig[level];
  const circumference = 2 * Math.PI * 70;

  const [animatedOffset, setAnimatedOffset] = useState(circumference);

  useEffect(() => {
    const target = circumference - (score / 100) * circumference;
    const t = setTimeout(() => setAnimatedOffset(target), 150);
    return () => clearTimeout(t);
  }, [score, circumference]);

  const strokeColor =
    level === 'CLEAR' ? '#10b981' : level === 'REVIEW' || level === 'UNVERIFIED' ? '#f59e0b' : level === 'HIGH RISK' ? '#ef4444' : '#64748b';

  return (
    <div className={`glass-panel animate-fade-in-up bg-gradient-to-br ${config.bg} p-6`}>
      <div className="flex items-center gap-3">
        <Gauge className={`h-5 w-5 ${config.color}`} />
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600">Risk Assessment</h3>
      </div>

      <div className="mt-6 flex flex-col items-center">
        <div className="relative h-40 w-40">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="#f1f5f9" strokeWidth="10" />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={strokeColor}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={animatedOffset}
              className="transition-all duration-[1400ms] ease-out"
              style={{ filter: `drop-shadow(0 0 6px ${strokeColor}50)` }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-3xl font-bold ${config.color}`}>{Math.round(score)}</span>
            <span className="text-xs text-slate-400">Risk Score</span>
          </div>
        </div>

        <div className={`mt-4 animate-glow-pulse rounded-full border border-slate-200 bg-white px-6 py-2 text-lg font-bold shadow-sm ${config.color}`}>
          {config.label}
        </div>
      </div>

      <p className="mt-4 text-center text-sm leading-relaxed text-slate-500">{reason}</p>
    </div>
  );
}
