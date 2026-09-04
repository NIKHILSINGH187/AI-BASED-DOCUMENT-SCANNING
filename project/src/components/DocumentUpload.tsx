import { useState, useRef, useCallback } from 'react';
import { Upload, FileImage, X, Camera, FileCheck2 } from 'lucide-react';
import type { DocumentType } from '@/lib/types';

interface DocumentUploadProps {
  onFileSelected: (file: File, imageData: string) => void;
  uploadedImage: string | null;
  fileName: string | null;
  onRemove: () => void;
}

export default function DocumentUpload({ onFileSelected, uploadedImage, fileName, onRemove }: DocumentUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const MAX_SIZE = 10 * 1024 * 1024;
  const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'];

  const processFile = useCallback(
    (file: File) => {
      setError(null);

      if (file.size > MAX_SIZE) {
        setError('File too large. Maximum size is 10 MB.');
        return;
      }

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError('Unsupported file type. Please upload JPG, PNG, WEBP, or BMP.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        onFileSelected(file, imageData);
      };
      reader.onerror = () => setError('Failed to read file.');
      reader.readAsDataURL(file);
    },
    [onFileSelected],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  if (uploadedImage) {
    return (
      <div className="space-y-4">
        <div className="relative overflow-hidden rounded-xl border border-slate-700 bg-slate-900">
          <img src={uploadedImage} alt="Document" className="w-full" />
          <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-medium text-white">
            <FileCheck2 className="h-3.5 w-3.5" />
            Uploaded
          </div>
          <div className="absolute bottom-3 left-3 rounded-md bg-black/60 px-2 py-1 text-xs text-slate-300 backdrop-blur-sm">
            {fileName}
          </div>
        </div>
        <button
          onClick={onRemove}
          className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-red-400"
        >
          <X className="h-4 w-4" />
          Remove Document
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={`flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-12 transition-colors ${
          dragOver ? 'border-cyan-500 bg-cyan-500/5' : 'border-slate-700 bg-slate-900/50'
        }`}
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-800">
          <FileImage className="h-8 w-8 text-slate-400" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-300">Drag & drop your document here</p>
          <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, BMP · Max 10 MB</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-cyan-400"
          >
            <Upload className="h-4 w-4" />
            Upload File
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-800"
          >
            <Camera className="h-4 w-4" />
            Capture Document
          </button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileInput}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileInput}
          className="hidden"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/5 p-3 text-sm text-red-400">
          <X className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
