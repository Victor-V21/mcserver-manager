import React from 'react';
import { AlertCircle, UploadCloud, X } from 'lucide-react';
import { useModUpload } from './ModUploadContext';

interface ModUploadStatusProps {
  onOpenMods: () => void;
}

export const ModUploadStatus: React.FC<ModUploadStatusProps> = ({ onOpenMods }) => {
  const { jobs, clearFinished } = useModUpload();
  const activeJobs = jobs.filter((job) => job.state === 'queued' || job.state === 'uploading');
  const errorJobs = jobs.filter((job) => job.state === 'error');

  if (activeJobs.length === 0 && errorJobs.length === 0) return null;

  const totalBytes = activeJobs.reduce((sum, job) => sum + job.size, 0);
  const uploadedBytes = activeJobs.reduce((sum, job) => sum + job.uploadedBytes, 0);
  const progress = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : 0;
  const hasErrors = activeJobs.length === 0 && errorJobs.length > 0;

  return (
    <div
      className="fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-4 z-50 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-slate-700/80 bg-dark-900/95 p-3 shadow-2xl backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        <div className={`rounded-lg p-2 ${hasErrors ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
          {hasErrors ? <AlertCircle className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-xs font-semibold text-white">
              {hasErrors ? `${errorJobs.length} subida(s) con error` : `Subiendo ${activeJobs.length} mod(s)`}
            </p>
            {!hasErrors && <span className="font-mono text-[11px] text-emerald-300">{progress}%</span>}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-slate-400">
            {hasErrors ? errorJobs[0]?.error : activeJobs[0]?.fileName}
          </p>
          {!hasErrors && (
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-emerald-400 transition-[width] duration-200" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
        {hasErrors ? (
          <button
            type="button"
            onClick={clearFinished}
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            aria-label="Cerrar aviso de subida"
          >
            <X className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenMods}
            className="shrink-0 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/10"
          >
            Mods
          </button>
        )}
      </div>
    </div>
  );
};
