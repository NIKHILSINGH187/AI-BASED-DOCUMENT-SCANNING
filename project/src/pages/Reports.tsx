import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line,
} from 'recharts';
import { FileBarChart, Download, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { VerificationCase } from '@/lib/types';

export default function Reports() {
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
  const flagged = cases.filter((c) => c.final_decision === 'HIGH RISK').length;
  const review = cases.filter((c) => c.final_decision === 'REVIEW').length;
  const unverified = cases.filter((c) => c.final_decision === 'UNVERIFIED' || !c.final_decision).length;

  const riskData = [
    { name: 'Clear', value: govVerified, color: '#10b981' },
    { name: 'Review', value: review, color: '#f59e0b' },
    { name: 'High Risk', value: flagged, color: '#ef4444' },
    { name: 'Unverified', value: unverified, color: '#64748b' },
  ].filter((d) => d.value > 0);

  const docTypeData = aggregateByDocType(cases);
  const trendData = aggregateByDate(cases);

  const govStatusData = [
    { name: 'Verified', value: govVerified, color: '#10b981' },
    { name: 'Not Connected', value: total - govVerified, color: '#64748b' },
  ];

  const handleExport = () => {
    const csv = [
      ['Case ID', 'Document Type', 'Status', 'Final Decision', 'Demo Mode', 'Created At'],
      ...cases.map((c) => [
        c.case_id,
        c.document_type,
        c.status,
        c.final_decision || '',
        c.demo_mode ? 'Yes' : 'No',
        new Date(c.created_at).toISOString(),
      ]),
    ].map((row) => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `idshield-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex animate-fade-in-up items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Verification analytics and downloadable reports</p>
        </div>
        <button
          onClick={handleExport}
          className="glass-card flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Cases" value={total} delay={0} />
        <StatCard label="Government Verified" value={govVerified} accent="emerald" delay={60} />
        <StatCard label="Flagged" value={flagged} accent="red" delay={120} />
        <StatCard label="Manual Review" value={review} accent="amber" delay={180} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Verification Trend" delay={100}>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 20px rgba(15,23,42,0.1)' }} />
              <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2.5} dot={{ fill: '#06b6d4', r: 3 }} animationDuration={1200} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Risk Distribution" delay={180}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={riskData.length > 0 ? riskData : [{ name: 'No Data', value: 1, color: '#e2e8f0' }]}
                cx="50%"
                cy="50%"
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                animationDuration={1000}
              >
                {(riskData.length > 0 ? riskData : [{ name: 'No Data', value: 1, color: '#e2e8f0' }]).map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 20px rgba(15,23,42,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Document Types" delay={260}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={docTypeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} angle={-20} textAnchor="end" height={50} />
              <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 20px rgba(15,23,42,0.1)' }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} animationDuration={900} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Government Verification Status" delay={340}>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={govStatusData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={3}
                dataKey="value"
                animationDuration={1000}
              >
                {govStatusData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid #e2e8f0', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 20px rgba(15,23,42,0.1)' }} />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#64748b' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {total === 0 && (
        <div className="flex flex-col items-center justify-center py-16">
          <FileBarChart className="h-12 w-12 animate-float text-slate-300" />
          <p className="mt-3 text-sm text-slate-400">No data to report yet. Complete some verifications first.</p>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, accent, delay }: { label: string; value: number; accent?: 'emerald' | 'red' | 'amber'; delay?: number }) {
  const colorMap = {
    emerald: 'text-emerald-600',
    red: 'text-red-600',
    amber: 'text-amber-600',
  };
  return (
    <div className="glass-card animate-fade-in-up p-4" style={{ animationDelay: `${delay || 0}ms` }}>
      <p className="text-3xl font-bold text-slate-900">{value}</p>
      <p className={`mt-1 text-xs font-medium ${accent ? colorMap[accent] : 'text-slate-500'}`}>{label}</p>
    </div>
  );
}

function ChartCard({ title, children, delay }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <div className="glass-panel animate-fade-in-up p-5" style={{ animationDelay: `${delay || 0}ms` }}>
      <h2 className="mb-4 text-sm font-semibold text-slate-600">{title}</h2>
      {children}
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
