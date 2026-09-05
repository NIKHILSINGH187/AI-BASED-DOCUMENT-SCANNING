import { useAuth } from '@/lib/auth';
import { User as UserIcon, Mail, Shield, Calendar, KeyRound } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h1 className="text-2xl font-bold text-slate-900">Profile</h1>
        <p className="mt-1 text-sm text-slate-500">Your account information</p>
      </div>

      <div className="glass-panel animate-fade-in-up p-6" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-4">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20 transition-transform duration-300 hover:scale-105 hover:rotate-3">
            <UserIcon className="h-10 w-10 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.email || 'Verification Officer'}</h2>
            <p className="text-sm text-slate-500">IDShield AI Platform</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <InfoCard icon={Mail} label="Email" value={user?.email || '--'} delay={140} />
        <InfoCard icon={Shield} label="Role" value="Verification Officer" delay={180} />
        <InfoCard icon={KeyRound} label="User ID" value={user?.id?.slice(0, 12) + '...' || '--'} delay={220} />
        <InfoCard
          icon={Calendar}
          label="Member Since"
          value={user?.created_at ? new Date(user.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : '--'}
          delay={260}
        />
      </div>

      <div className="glass-panel animate-fade-in-up p-6" style={{ animationDelay: '320ms' }}>
        <h3 className="text-sm font-semibold text-slate-900">Security & Privacy</h3>
        <div className="mt-4 space-y-3">
          <SecurityRow label="Row Level Security" value="Enabled on all tables" status="active" />
          <SecurityRow label="Audit Logging" value="All actions logged" status="active" />
          <SecurityRow label="Consent Tracking" value="Biometric consent required" status="active" />
          <SecurityRow label="Session Management" value="Supabase Auth sessions" status="active" />
          <SecurityRow label="Data Retention" value="Case data retained per policy" status="active" />
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value, delay }: { icon: typeof UserIcon; label: string; value: string; delay?: number }) {
  return (
    <div className="glass-card animate-fade-in-up p-5" style={{ animationDelay: `${delay || 0}ms` }}>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-slate-400" />
        <span className="text-xs font-medium text-slate-400">{label}</span>
      </div>
      <p className="mt-2 text-sm text-slate-700 break-words">{value}</p>
    </div>
  );
}

function SecurityRow({ label, value, status }: { label: string; value: string; status: 'active' | 'inactive' }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-slate-100">
      <div>
        <p className="text-sm font-medium text-slate-700">{label}</p>
        <p className="text-xs text-slate-400">{value}</p>
      </div>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${status === 'active' ? 'text-emerald-600' : 'text-slate-400'}`}>
        <span className={`h-2 w-2 rounded-full ${status === 'active' ? 'animate-pulse bg-emerald-500' : 'bg-slate-300'}`} />
        {status === 'active' ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
}
