import { useState, type ReactNode } from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="relative min-h-screen bg-slate-50">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 top-0 h-[500px] w-[500px] animate-float-slow rounded-full bg-cyan-500/[0.05] blur-[130px]" />
        <div className="absolute -right-40 bottom-0 h-[450px] w-[450px] animate-float rounded-full bg-blue-500/[0.05] blur-[130px]" />
      </div>

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex items-center gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <button onClick={() => setSidebarOpen(true)} className="text-slate-600 transition-colors hover:text-slate-900">
          <Menu className="h-6 w-6" />
        </button>
        <ShieldCheck className="h-5 w-5 text-cyan-600" />
        <span className="text-sm font-bold text-slate-900">IDShield AI</span>
      </div>

      <main className="min-h-screen lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
