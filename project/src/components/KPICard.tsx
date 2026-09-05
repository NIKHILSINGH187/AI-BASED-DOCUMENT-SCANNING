
import { useEffect, useState, type ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  accent?: 'blue' | 'emerald' | 'amber' | 'red' | 'slate' | 'cyan';
  delay?: number;
}

const accentMap = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

const glowMap = {
  blue: 'hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.5)] hover:border-blue-500/40',
  emerald: 'hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] hover:border-emerald-500/40',
  amber: 'hover:shadow-[0_0_30px_-5px_rgba(245,158,11,0.5)] hover:border-amber-500/40',
  red: 'hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.5)] hover:border-red-500/40',
  slate: 'hover:shadow-[0_0_30px_-5px_rgba(100,116,139,0.5)] hover:border-slate-500/40',
  cyan: 'hover:shadow-[0_0_30px_-5px_rgba(34,211,238,0.5)] hover:border-cyan-500/40',
};

function useCountUp(target: number, duration = 900) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (typeof target !== 'number' || isNaN(target)) return;
    let startTime: number | null = null;
    let raf: number;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

export default function KPICard({ label, value, icon, accent = 'blue', delay = 0 }: KPICardProps) {
  const numericValue = typeof value === 'number' ? value : 0;
  const displayValue = useCountUp(numericValue);
  const isNumber = typeof value === 'number';

  return (
    <div
      className={`glass-card group animate-fade-in-up p-4 hover:-translate-y-1 ${glowMap[accent]}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-transform duration-300 group-hover:scale-110 group-hover:rotate-6 ${accentMap[accent]}`}
        >
          {icon}
        </div>
        <span className="text-2xl font-bold text-white tabular-nums">
          {isNumber ? displayValue : value}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-400">{label}</p>
      <div className="mt-2 h-0.5 w-0 overflow-hidden rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-0 transition-all duration-500 group-hover:w-full group-hover:opacity-40" />
    </div>
  );
}
