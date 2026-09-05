import { CheckCircle2, XCircle, MinusCircle, HelpCircle } from 'lucide-react';
import type { BindingMatrixEntry } from '@/lib/types';

function getIcon(value: string) {
  const v = value.toUpperCase();
  if (['MATCH', 'VERIFIED', 'PASSED', 'EXTRACTED', 'REFERENCE', 'COMPLETED', 'SANDBOX VALID'].includes(v))
    return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (['NO MATCH', 'FAILED', 'MISMATCH', 'FLAGGED', 'LIVENESS FAIL', 'SANDBOX INVALID'].includes(v))
    return <XCircle className="h-4 w-4 text-red-500" />;
  if (['N/A', 'NOT APPLICABLE'].includes(v))
    return <MinusCircle className="h-4 w-4 text-slate-300" />;
  if (['NOT CONNECTED', 'NOT_CONFIGURED', 'UNAVAILABLE', 'MODEL NOT CONNECTED', 'GOVERNMENT SERVICE UNAVAILABLE'].includes(v))
    return <XCircle className="h-4 w-4 text-slate-400" />;
  return <HelpCircle className="h-4 w-4 text-amber-500" />;
}

function getCellColor(value: string) {
  const v = value.toUpperCase();
  if (['MATCH', 'VERIFIED', 'PASSED', 'EXTRACTED', 'REFERENCE', 'COMPLETED', 'SANDBOX VALID'].includes(v))
    return 'text-emerald-600';
  if (['NO MATCH', 'FAILED', 'MISMATCH', 'FLAGGED', 'LIVENESS FAIL', 'SANDBOX INVALID'].includes(v))
    return 'text-red-600';
  if (['N/A', 'NOT APPLICABLE'].includes(v))
    return 'text-slate-300';
  if (['NOT CONNECTED', 'NOT_CONFIGURED', 'UNAVAILABLE', 'MODEL NOT CONNECTED', 'GOVERNMENT SERVICE UNAVAILABLE'].includes(v))
    return 'text-slate-400';
  return 'text-amber-600';
}

export default function IdentityBindingMatrix({ entries }: { entries: BindingMatrixEntry[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-[0_2px_20px_rgba(15,23,42,0.06)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Field</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">OCR</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Government</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">Biometric</th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-cyan-600">Final</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, i) => (
            <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-700">{entry.field}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {getIcon(entry.ocr)}
                  <span className={getCellColor(entry.ocr)}>{entry.ocr}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {getIcon(entry.government)}
                  <span className={getCellColor(entry.government)}>{entry.government}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  {getIcon(entry.biometric)}
                  <span className={getCellColor(entry.biometric)}>{entry.biometric}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 font-medium">
                  {getIcon(entry.final)}
                  <span className={getCellColor(entry.final)}>{entry.final}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
