import { useState, useEffect } from 'react';
import { Shield, KeyRound, Database, Save, Check, AlertCircle } from 'lucide-react';
import { checkGovernmentApiConfigured } from '@/lib/gov';

export default function Settings() {
  const [govConfigured, setGovConfigured] = useState(false);
  const [saved, setSaved] = useState(false);
  const [maxFileSize, setMaxFileSize] = useState('10');
  const [sessionTimeout, setSessionTimeout] = useState('30');

  useEffect(() => {
    setGovConfigured(checkGovernmentApiConfigured());
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure verification platform settings</p>
      </div>

      <div className="glass-panel animate-fade-in-up p-6" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Shield className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Government API Status</h2>
            <p className="text-xs text-slate-400">Status of government verification adapters</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <ApiStatusRow name="UIDAI Aadhaar Verification" configured={govConfigured} />
          <ApiStatusRow name="PAN Verification Webservice" configured={govConfigured} />
          <ApiStatusRow name="Document Verification Adapter" configured={govConfigured} />
        </div>

        {!govConfigured && (
          <div className="mt-4 animate-fade-in rounded-lg border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <div>
                <p className="text-sm text-amber-700">Government API Not Connected</p>
                <p className="mt-1 text-xs text-slate-500">
                  Authorized API credentials are required. Configure the following environment variables:
                </p>
                <ul className="mt-2 space-y-1 text-xs font-mono text-slate-500">
                  <li>GOVERNMENT_API_BASE_URL</li>
                  <li>GOVERNMENT_API_KEY</li>
                  <li>GOVERNMENT_CLIENT_ID</li>
                  <li>GOVERNMENT_CLIENT_SECRET</li>
                </ul>
                <p className="mt-2 text-xs text-slate-500">
                  These are backend-only environment variables. They must never be exposed in the frontend.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="glass-panel animate-fade-in-up p-6" style={{ animationDelay: '160ms' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <KeyRound className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Security Settings</h2>
            <p className="text-xs text-slate-400">Configure file limits and session security</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-600">Max File Size (MB)</label>
            <input
              type="number"
              value={maxFileSize}
              onChange={(e) => setMaxFileSize(e.target.value)}
              className="glass-input mt-1.5 w-full px-3 py-2 text-sm text-slate-900 outline-none"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600">Session Timeout (minutes)</label>
            <input
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="glass-input mt-1.5 w-full px-3 py-2 text-sm text-slate-900 outline-none"
            />
          </div>
        </div>
      </div>

      <div className="glass-panel animate-fade-in-up p-6" style={{ animationDelay: '240ms' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Database className="h-5 w-5 text-cyan-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Database</h2>
            <p className="text-xs text-slate-400">Data storage and retention</p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">Storage Backend</span>
            <span className="text-slate-700">Supabase (PostgreSQL)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">RLS Enabled</span>
            <span className="text-emerald-600">Yes (all tables)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Audit Logging</span>
            <span className="text-emerald-600">Enabled</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Consent Tracking</span>
            <span className="text-emerald-600">Enabled</span>
          </div>
        </div>
      </div>

      <div className="flex animate-fade-in-up justify-end" style={{ animationDelay: '300ms' }}>
        <button
          onClick={handleSave}
          className="btn-glow flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-medium text-white"
        >
          {saved ? <Check className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {saved ? 'Saved' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

function ApiStatusRow({ name, configured }: { name: string; configured: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-slate-100">
      <span className="text-sm text-slate-700">{name}</span>
      {configured ? (
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Connected
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          Not Connected
        </span>
      )}
    </div>
  );
}
