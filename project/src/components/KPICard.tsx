import { useEffect, useState, type ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  accent?: 'blue' | 'emerald' | 'amber' | 'red' | 'slate' | 'cyan';
  delay?: number;
}

const accentMap = {
  blue: 'bg-blue-50 text-blue-600 border-blue-200',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  amber: 'bg-amber-50 text-amber-600 border-amber-200',
  red: 'bg-red-50 text-red-600 border-red-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
};

const glowMap = {
  blue: 'hover:shadow-[0_8px_24px_-4px_rgba(59,130,246,0.25)] hover:border-blue-300',
  emerald: 'hover:shadow-[0_8px_24px_-4px_rgba(16,185,129,0.25)] hover:border-emerald-300',
  amber: 'hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,0.25)] hover:border-amber-300',
  red: 'hover:shadow-[0_8px_24px_-4px_rgba(239,68,68,0.25)] hover:border-red-300',
  slate: 'hover:shadow-[0_8px_24px_-4px_rgba(100,116,139,0.25)] hover:border-slate-300',
  cyan: 'hover:shadow-[0_8px_24px_-4px_rgba(6,182,212,0.25)] hover:border-cyan-300',
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
        <span className="text-2xl font-bold text-slate-900 tabular-nums">
          {isNumber ? displayValue : value}
        </span>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-500">{label}</p>
      <div className="mt-2 h-0.5 w-0 overflow-hidden rounded-full bg-gradient-to-r from-transparent via-current to-transparent opacity-0 transition-all duration-500 group-hover:w-full group-hover:opacity-30" />
    </div>
  );
}
