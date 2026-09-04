import { useState } from 'react';
import {
  FileText, ScanFace, Eye, Fingerprint, ShieldCheck,
  FolderOpen, Lock, Code2, type LucideIcon,
} from 'lucide-react';
import type { EvidenceItem } from '@/lib/types';

const tabConfig: { type: string; label: string; icon: LucideIcon }[] = [
  { type: 'document', label: 'Document', icon: FileText },
  { type: 'face_capture', label: 'Live Capture', icon: ScanFace },
  { type: 'ocr', label: 'OCR', icon: FileText },
  { type: 'liveness', label: 'Liveness', icon: Eye },
  { type: 'biometric', label: 'Biometric', icon: Fingerprint },
  { type: 'forensics', label: 'Forensics', icon: ShieldCheck },
  { type: 'government', label: 'Gov Response', icon: ShieldCheck },
  { type: 'identity_binding', label: 'Identity Binding', icon: FolderOpen },
  { type: 'audit', label: 'Audit', icon: Lock },
];

export default function EvidenceViewer({ evidence }: { evidence: EvidenceItem[] }) {
  const [activeTab, setActiveTab] = useState<string>(tabConfig[0].type);

  const filtered = evidence.filter((e) => e.evidence_type === activeTab);
  const availableTabs = tabConfig.filter((t) => evidence.some((e) => e.evidence_type === t.type));

  const renderContent = (item: EvidenceItem) => {
    if (item.content && item.content.startsWith('data:image')) {
      return (
        <div className="overflow-hidden rounded-lg border border-slate-700">
          <img src={item.content} alt={item.label || 'Evidence'} className="w-full" />
        </div>
      );
    }
    return (
      <pre className="max-h-80 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 whitespace-pre-wrap">
        {item.content || 'No content'}
      </pre>
    );
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-5 w-5 text-cyan-400" />
        <h3 className="text-sm font-semibold text-white">Evidence Viewer</h3>
      </div>

      {evidence.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No evidence collected for this case.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {availableTabs.map((tab) => (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeTab === tab.type
                    ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400'
                    : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {filtered.length === 0 ? (
              <p className="text-sm text-slate-500">No evidence for this category.</p>
            ) : (
              filtered.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-200">{item.label || item.evidence_type}</span>
                    <span className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                    </span>
                  </div>
                  {renderContent(item)}
                  {item.metadata && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                      <Code2 className="h-3 w-3" />
                      <span>Metadata: {JSON.stringify(item.metadata)}</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
