
import { useState, type ReactNode } from 'react';
import { Menu, ShieldCheck } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex items-center gap-3 border-b border-slate-800 bg-slate-950 px-4 py-3 lg:hidden">
        <button onClick={() => setSidebarOpen(true)} className="text-slate-300 hover:text-white">
          <Menu className="h-6 w-6" />
        </button>
        <ShieldCheck className="h-5 w-5 text-cyan-500" />
        <span className="text-sm font-bold text-white">IDShield AI</span>
      </div>

      <main className="min-h-screen lg:ml-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
      </main>
    </div>
  );
}
