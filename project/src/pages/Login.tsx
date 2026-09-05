import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) {
      setError(error);
      setLoading(false);
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[500px] w-[500px] -translate-x-1/2 animate-glow-pulse rounded-full bg-cyan-500/[0.08] blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] animate-float rounded-full bg-blue-500/[0.06] blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-md animate-fade-in-up">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 transition-transform duration-300 hover:scale-105 hover:rotate-3">
            <ShieldCheck className="h-9 w-9 text-white" />
          </div>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">IDShield AI</h1>
          <p className="mt-1 text-sm text-slate-500">AI-Based Fake Identity & Document Screening</p>
        </div>

        <div className="glass-panel p-8">
          <h2 className="text-lg font-semibold text-slate-900">Sign In</h2>
          <p className="mt-1 text-sm text-slate-500">Enter your credentials to access the verification platform</p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="animate-fade-in-up stagger-1">
              <label className="text-xs font-medium text-slate-600">Email</label>
              <div className="relative mt-1.5">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="glass-input w-full py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
                  placeholder="officer@idshield.ai"
                />
              </div>
            </div>

            <div className="animate-fade-in-up stagger-2">
              <label className="text-xs font-medium text-slate-600">Password</label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="glass-input w-full py-2.5 pl-10 pr-3 text-sm text-slate-900 placeholder-slate-400 outline-none"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="flex animate-fade-in items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-glow flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 py-2.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-cyan-600 transition-colors hover:text-cyan-700">
              Create one
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Smart India Hackathon 2026 · Identity Screening Platform
        </p>
      </div>
    </div>
  );
}
