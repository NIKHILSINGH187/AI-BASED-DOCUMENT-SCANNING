import type { ReactNode } from 'react';

interface KPICardProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  accent?: 'blue' | 'emerald' | 'amber' | 'red' | 'slate' | 'cyan';
}

const accentMap = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
};

export default function KPICard({ label, value, icon, accent = 'blue' }: KPICardProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4 transition-colors hover:border-slate-700">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${accentMap[accent]}`}>
          {icon}
        </div>
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <p className="mt-3 text-xs font-medium text-slate-400">{label}</p>
    </div>
  );
}
