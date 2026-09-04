import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Shield, KeyRound, Database, Save, Check, AlertCircle } from 'lucide-react';
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
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">Configure verification platform settings</p>
      </div>

      {/* Government API Status */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
            <Shield className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Government API Status</h2>
            <p className="text-xs text-slate-500">Status of government verification adapters</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <ApiStatusRow name="UIDAI Aadhaar Verification" configured={govConfigured} />
          <ApiStatusRow name="PAN Verification Webservice" configured={govConfigured} />
          <ApiStatusRow name="Document Verification Adapter" configured={govConfigured} />
        </div>

        {!govConfigured && (
          <div className="mt-4 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm text-amber-400">Government API Not Connected</p>
                <p className="mt-1 text-xs text-slate-400">
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

      {/* Security Settings */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
            <KeyRound className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Security Settings</h2>
            <p className="text-xs text-slate-500">Configure file limits and session security</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs font-medium text-slate-400">Max File Size (MB)</label>
            <input
              type="number"
              value={maxFileSize}
              onChange={(e) => setMaxFileSize(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400">Session Timeout (minutes)</label>
            <input
              type="number"
              value={sessionTimeout}
              onChange={(e) => setSessionTimeout(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2 text-sm text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Database Info */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800">
            <Database className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Database</h2>
            <p className="text-xs text-slate-500">Data storage and retention</p>
          </div>
        </div>

        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Storage Backend</span>
            <span className="text-slate-300">Supabase (PostgreSQL)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">RLS Enabled</span>
            <span className="text-emerald-400">Yes (all tables)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Audit Logging</span>
            <span className="text-emerald-400">Enabled</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Consent Tracking</span>
            <span className="text-emerald-400">Enabled</span>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-2 rounded-lg bg-cyan-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
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
    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 p-3">
      <span className="text-sm text-slate-300">{name}</span>
      {configured ? (
        <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Connected
        </span>
      ) : (
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
          <span className="h-2 w-2 rounded-full bg-slate-600" />
          Not Connected
        </span>
      )}
    </div>
  );
}
