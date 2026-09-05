import { useState } from 'react';
import { Shield, X, Check } from 'lucide-react';

interface ConsentModalProps {
  open: boolean;
  title: string;
  description: string;
  onAccept: () => void;
  onDecline: () => void;
}

export default function ConsentModal({ open, title, description, onAccept, onDecline }: ConsentModalProps) {
  const [checked, setChecked] = useState(false);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <button onClick={onDecline} className="text-slate-400 hover:text-slate-900">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-700">{description}</p>

        <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 bg-white text-cyan-500 focus:ring-cyan-500"
          />
          <span className="text-sm text-slate-700">
            I consent to the capture and processing of my biometric/identity information for verification purposes.
          </span>
        </label>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onDecline}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
          >
            Decline
          </button>
          <button
            onClick={onAccept}
            disabled={!checked}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Check className="h-4 w-4" />
            Grant Consent
          </button>
        </div>
      </div>
    </div>
  );
}
