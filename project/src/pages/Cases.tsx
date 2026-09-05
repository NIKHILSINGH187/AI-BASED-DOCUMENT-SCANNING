
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderOpen, Search, ScanFace } from 'lucide-react';
import { api } from '@/lib/api';
import type { VerificationCase } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';

export default function Cases() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<string>('ALL');

  useEffect(() => {
    api.getCases()
      .then(setCases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = cases.filter((c) => {
    const matchSearch = !search || c.case_id.toLowerCase().includes(search.toLowerCase()) || c.document_type.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'ALL' || c.final_decision === filter || (filter === 'PROCESSING' && c.status === 'PROCESSING');
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-in-up items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Cases</h1>
          <p className="mt-1 text-sm text-slate-500">All verification cases</p>
        </div>
        <button
          onClick={() => navigate('/verification/new')}
          className="btn-glow flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:scale-[1.03]"
        >
          <ScanFace className="h-4 w-4" />
          New Verification
        </button>
      </div>

      <div className="flex animate-fade-in-up flex-col gap-3 sm:flex-row" style={{ animationDelay: '80ms' }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Case ID or document type..."
            className="glass-input w-full py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="glass-input px-3 py-2.5 text-sm text-slate-900 outline-none"
        >
          <option value="ALL">All Statuses</option>
          <option value="CLEAR">Clear</option>
          <option value="REVIEW">Review</option>
          <option value="HIGH RISK">High Risk</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="PROCESSING">Processing</option>
        </select>
      </div>

      <div className="glass-panel animate-fade-in-up overflow-x-auto" style={{ animationDelay: '150ms' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs text-slate-400">
              <th className="px-4 py-3 text-left font-medium">Case ID</th>
              <th className="px-4 py-3 text-left font-medium">Document</th>
              <th className="px-4 py-3 text-left font-medium">Verification Status</th>
              <th className="px-4 py-3 text-left font-medium">Risk</th>
              <th className="px-4 py-3 text-left font-medium">Demo</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
              <th className="px-4 py-3 text-left font-medium">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-cyan-500" />
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <FolderOpen className="mx-auto mb-3 h-10 w-10 animate-float text-slate-300" />
                  <p className="text-slate-400">No cases found</p>
                </td>
              </tr>
            ) : (
              filtered.map((c, i) => (
                <tr
                  key={c.id}
                  className="animate-fade-in-up border-b border-slate-100 transition-colors hover:bg-slate-50"
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  <td className="px-4 py-3 font-mono text-xs text-cyan-600">{c.case_id}</td>
                  <td className="px-4 py-3 text-slate-700">{c.document_type}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} size="sm" /></td>
                  <td className="px-4 py-3">
                    {c.final_decision ? <StatusBadge status={c.final_decision} size="sm" /> : <span className="text-slate-300">--</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.demo_mode ? <span className="text-xs text-amber-600">DEMO</span> : <span className="text-xs text-slate-300">--</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(c.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/cases/${c.id}`)}
                      className="text-xs font-medium text-cyan-600 transition-colors hover:text-cyan-700"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
