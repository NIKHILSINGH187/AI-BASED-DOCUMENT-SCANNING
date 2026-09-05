
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area,
} from 'recharts';
import {
  ShieldCheck, FileCheck2, ScanFace, AlertTriangle, ClipboardList, HelpCircle,
  ArrowRight, TrendingUp, Sparkles,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { VerificationCase } from '@/lib/types';
import KPICard from '@/components/KPICard';
import StatusBadge from '@/components/StatusBadge';

export default function Dashboard() {
  const navigate = useNavigate();
  const [cases, setCases] = useState<VerificationCase[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getCases()
      .then(setCases)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total = cases.length;
  const govVerified = cases.filter((c) => c.final_decision === 'CLEAR').length;
  const biometricPassed = cases.filter((c) => c.final_decision === 'CLEAR' || c.final_decision === 'REVIEW').length;
  const flagged = cases.filter((c) => c.final_decision === 'HIGH RISK').length;
  const manualReview = cases.filter((c) => c.final_decision === 'REVIEW').length;
  const unverified = cases.filter((c) => c.final_decision === 'UNVERIFIED' || !c.final_decision).length;

  const volumeData = aggregateByDate(cases);

  const riskData = [
    { name: 'Clear', value: govVerified, color: '#10b981' },
    { name: 'Review', value: manualReview, color: '#f59e0b' },
    { name: 'High Risk', value: flagged, color: '#ef4444' },
    { name: 'Unverified', value: unverified, color: '#64748b' },
  ].filter((d) => d.value > 0);

  const docTypeData = aggregateByDocType(cases);

  const recentCases = cases.slice(0, 8);

  return (
    <div className="relative space-y-6">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-20 left-1/3 h-[400px] w-[400px] animate-glow-pulse rounded-full bg-cyan-500/[0.06] blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[350px] w-[350px] animate-float-slow rounded-full bg-blue-500/[0.05] blur-[100px]" />
      </div>

      <div className="flex animate-fade-in-up items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Sparkles className="h-6 w-6 text-cyan-400" />
            <span className="bg-gradient-to-r from-white via-cyan-100 to-white bg-clip-text">
              Dashboard
            </span>
          </h1>
          <p className="mt-1 text-sm text-slate-400">Identity verification overview and analytics</p>
        </div>
        <button
          onClick={() => navigate('/verification/new')}
          className="btn-glow flex items-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:scale-[1.03]"
        >
          <ScanFace className="h-4 w-4" />
          New Verification
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPICard label="Total Verifications" value={total} icon={<ShieldCheck className="h-5 w-5" />} accent="blue" delay={0} />
        <KPICard label="Gov Verified" value={govVerified} icon={<FileCheck2 className="h-5 w-5" />} accent="emerald" delay={60} />
        <KPICard label="Biometric Passed" value={biometricPassed} icon={<ScanFace className="h-5 w-5" />} accent="cyan" delay={120} />
        <KPICard label="Flagged" value={flagged} icon={<AlertTriangle className="h-5 w-5" />} accent="red" delay={180} />
        <KPICard label="Manual Review" value={manualReview} icon={<ClipboardList className="h-5 w-5" />} accent="amber" delay={240} />
        <KPICard label="Unverified" value={unverified} icon={<HelpCircle className="h-5 w-5" />} accent="slate" delay={300} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-panel animate-fade-in-up p-5 lg:col-span-2" style={{ animationDelay: '150ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Verification Volume</h2>
            <TrendingUp className="h-4 w-4 animate-float text-cyan-500" />
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={volumeData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="volumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.5} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px', backdropFilter: 'blur(8px)' }}
                labelStyle={{ color: '#94a3b8' }}
              />
              <Area type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2.5} fill="url(#volumeGrad)" animationDuration={1200} animationEasing="ease-out" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel animate-fade-in-up p-5" style={{ animationDelay: '250ms' }}>
          <h2 className="text-sm font-semibold text-slate-300">Risk Distribution</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={riskData.length > 0 ? riskData : [{ name: 'No Data', value: 1, color: '#334155' }]}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                animationDuration={1000}
                animationBegin={200}
              >
                {(riskData.length > 0 ? riskData : [{ name: 'No Data', value: 1, color: '#334155' }]).map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="rgba(255,255,255,0.1)" strokeWidth={1} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px', backdropFilter: 'blur(8px)' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="glass-panel animate-fade-in-up p-5" style={{ animationDelay: '350ms' }}>
          <h2 className="text-sm font-semibold text-slate-300">Document Types</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={docTypeData} layout="vertical" margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#64748b" fontSize={11} allowDecimals={false} />
              <YAxis type="category" dataKey="name" stroke="#64748b" fontSize={11} width={80} />
              <Tooltip
                contentStyle={{ backgroundColor: 'rgba(15,23,42,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px', backdropFilter: 'blur(8px)' }}
              />
              <Bar dataKey="count" fill="#3b82f6" radius={[0, 6, 6, 0]} animationDuration={900} animationEasing="ease-out" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-panel animate-fade-in-up p-5 lg:col-span-2" style={{ animationDelay: '450ms' }}>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">Recent Cases</h2>
            <button
              onClick={() => navigate('/cases')}
              className="group flex items-center gap-1 text-xs text-cyan-400 transition-colors hover:text-cyan-300"
            >
              View All <ArrowRight className="h-3 w-3 transition-transform duration-200 group-hover:translate-x-1" />
            </button>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-500">
                  <th className="px-3 py-2 text-left font-medium">Case ID</th>
                  <th className="px-3 py-2 text-left font-medium">Document</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Risk</th>
                  <th className="px-3 py-2 text-left font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      <span className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-500" />
                    </td>
                  </tr>
                ) : recentCases.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-slate-500">
                      No cases yet. Start a new verification.
                    </td>
                  </tr>
                ) : (
                  recentCases.map((c, i) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate(`/cases/${c.id}`)}
                      className="animate-fade-in-up cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.04]"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      <td className="px-3 py-3 font-mono text-xs text-cyan-400">{c.case_id}</td>
                      <td className="px-3 py-3 text-slate-300">{c.document_type}</td>
                      <td className="px-3 py-3"><StatusBadge status={c.status} size="sm" /></td>
                      <td className="px-3 py-3">
                        {c.final_decision ? <StatusBadge status={c.final_decision} size="sm" /> : <span className="text-slate-600">--</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function aggregateByDate(cases: VerificationCase[]) {
  const map = new Map<string, number>();
  cases.forEach((c) => {
    const d = new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    map.set(d, (map.get(d) || 0) + 1);
  });
  return Array.from(map.entries()).map(([date, count]) => ({ date, count })).slice(-14);
}

function aggregateByDocType(cases: VerificationCase[]) {
  const map = new Map<string, number>();
  cases.forEach((c) => {
    map.set(c.document_type, (map.get(c.document_type) || 0) + 1);
  });
  return Array.from(map.entries()).map(([name, count]) => ({ name, count }));
}
