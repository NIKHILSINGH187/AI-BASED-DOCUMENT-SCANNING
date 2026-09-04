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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cases</h1>
          <p className="mt-1 text-sm text-slate-400">All verification cases</p>
        </div>
        <button
          onClick={() => navigate('/verification/new')}
          className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
        >
          <ScanFace className="h-4 w-4" />
          New Verification
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Case ID or document type..."
            className="w-full rounded-lg border border-slate-700 bg-slate-800/50 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-2.5 text-sm text-white outline-none focus:border-cyan-500"
        >
          <option value="ALL">All Statuses</option>
          <option value="CLEAR">Clear</option>
          <option value="REVIEW">Review</option>
          <option value="HIGH RISK">High Risk</option>
          <option value="UNVERIFIED">Unverified</option>
          <option value="PROCESSING">Processing</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-xs text-slate-500">
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
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">Loading...</td></tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center">
                  <FolderOpen className="mx-auto mb-3 h-10 w-10 text-slate-600" />
                  <p className="text-slate-500">No cases found</p>
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="border-b border-slate-800/50 transition-colors hover:bg-slate-800/30">
                  <td className="px-4 py-3 font-mono text-xs text-cyan-400">{c.case_id}</td>
                  <td className="px-4 py-3 text-slate-300">{c.document_type}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} size="sm" /></td>
                  <td className="px-4 py-3">
                    {c.final_decision ? <StatusBadge status={c.final_decision} size="sm" /> : <span className="text-slate-600">--</span>}
                  </td>
                  <td className="px-4 py-3">
                    {c.demo_mode ? <span className="text-xs text-amber-400">DEMO</span> : <span className="text-xs text-slate-600">--</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {new Date(c.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => navigate(`/cases/${c.id}`)}
                      className="text-xs font-medium text-cyan-400 hover:text-cyan-300"
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
