import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { api } from '../../lib/api';

export type ModUploadState = 'queued' | 'uploading' | 'completed' | 'error';

export interface ModUploadJob {
  id: string;
  fileName: string;
  size: number;
  uploadedBytes: number;
  progress: number;
  state: ModUploadState;
  error?: string;
}

interface UploadTask {
  id: string;
  file: File;
}

interface ModUploadContextValue {
  jobs: ModUploadJob[];
  enqueue: (files: File[]) => void;
  clearFinished: () => void;
}

const ModUploadContext = createContext<ModUploadContextValue | null>(null);

const createId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;

export const ModUploadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [jobs, setJobs] = useState<ModUploadJob[]>([]);
  const queueRef = useRef<UploadTask[]>([]);
  const processingRef = useRef(false);

  const updateJob = useCallback((id: string, patch: Partial<ModUploadJob>) => {
    setJobs((current) => current.map((job) => (job.id === id ? { ...job, ...patch } : job)));
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;

    try {
      while (queueRef.current.length > 0) {
        const task = queueRef.current.shift();
        if (!task) continue;

        updateJob(task.id, { state: 'uploading', progress: 0, uploadedBytes: 0 });
        try {
          await api.uploadModWithProgress(task.file, (progress) => {
            updateJob(task.id, {
              progress,
              uploadedBytes: Math.round((task.file.size * progress) / 100),
            });
          });
          updateJob(task.id, { state: 'completed', progress: 100, uploadedBytes: task.file.size });
        } catch (error: any) {
          updateJob(task.id, {
            state: 'error',
            error: error?.message || 'No se pudo subir el mod',
          });
        }
      }
    } finally {
      processingRef.current = false;
    }
  }, [updateJob]);

  const enqueue = useCallback((files: File[]) => {
    const tasks = files.map((file) => ({ id: createId(), file }));
    if (tasks.length === 0) return;

    setJobs((current) => [
      ...current.filter((job) => job.state === 'queued' || job.state === 'uploading'),
      ...tasks.map(({ id, file }) => ({
        id,
        fileName: file.name,
        size: file.size,
        uploadedBytes: 0,
        progress: 0,
        state: 'queued' as const,
      })),
    ]);
    queueRef.current.push(...tasks);
    void processQueue();
  }, [processQueue]);

  const clearFinished = useCallback(() => {
    setJobs((current) => current.filter((job) => job.state === 'queued' || job.state === 'uploading'));
  }, []);

  return (
    <ModUploadContext.Provider value={{ jobs, enqueue, clearFinished }}>
      {children}
    </ModUploadContext.Provider>
  );
};

export const useModUpload = (): ModUploadContextValue => {
  const context = useContext(ModUploadContext);
  if (!context) throw new Error('useModUpload must be used inside ModUploadProvider');
  return context;
};
