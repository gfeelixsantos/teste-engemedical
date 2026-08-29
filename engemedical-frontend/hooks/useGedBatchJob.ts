"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGedBatchSocket } from "@/app/context/GedBatchSocketProvider";
import { GedBatchStatusPayload, GedBatchProgressPayload } from "@/lib/websocket/events/events";

import {
  type CreateBatchRequest,
  type GedBatchJob,
  createBatchJob,
  getBatchJobStatus,
  isJobTerminal,
} from "@/lib/ged-batch-client";

const ACTIVE_JOB_KEY = "ged-batch:active-job";

// Deduplicação global entre múltiplas instâncias do hook (FileExplorer em /arquivos e /servicos)
let _globalTerminalJobId: string | null = null;

function getActiveJobId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_JOB_KEY);
  } catch {
    return null;
  }
}

function setActiveJobId(jobId: string) {
  try {
    localStorage.setItem(ACTIVE_JOB_KEY, jobId);
  } catch {}
}

function clearActiveJobId() {
  try {
    localStorage.removeItem(ACTIVE_JOB_KEY);
  } catch {}
}

interface UseGedBatchJobOptions {
  onCompleted?: (job: GedBatchJob) => void;
  onFailed?: (job: GedBatchJob) => void;
  onFinished?: (job: GedBatchJob) => void;
}

interface UseGedBatchJobReturn {
  currentJob: GedBatchJob | null;
  isCreating: boolean;
  isPolling: boolean;
  error: string | null;
  startBatch: (payload: CreateBatchRequest) => Promise<GedBatchJob | null>;
  clearJob: () => void;
}

export function useGedBatchJob({
  onCompleted,
  onFailed,
  onFinished,
}: UseGedBatchJobOptions = {}): UseGedBatchJobReturn {
  const [currentJob, setCurrentJob] = useState<GedBatchJob | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const onCompletedRef = useRef(onCompleted);
  const onFailedRef = useRef(onFailed);
  const onFinishedRef = useRef(onFinished);

  useEffect(() => {
    onCompletedRef.current = onCompleted;
    onFailedRef.current = onFailed;
    onFinishedRef.current = onFinished;
  }, [onCompleted, onFailed, onFinished]);
  
  const { registerHandlers } = useGedBatchSocket();
  const socketUnsubRef = useRef<(() => void) | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobIdRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (socketUnsubRef.current) {
      socketUnsubRef.current();
      socketUnsubRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const handleTerminalJob = useCallback(
    (job: GedBatchJob) => {
      if (_globalTerminalJobId === job.id) return;
      _globalTerminalJobId = job.id;

      clearActiveJobId();
      stopPolling();
      
      if (job.status === "completed" || job.status === "partial") {
        onCompletedRef.current?.(job);
      } else {
        onFailedRef.current?.(job);
      }
      onFinishedRef.current?.(job);
    },
    [stopPolling],
  );

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      setIsPolling(true);

      const unsub = registerHandlers({
        "ged-batch:status": (payload: GedBatchStatusPayload) => {
          if (payload.jobId !== jobId) return;
          
          setCurrentJob((prev) => {
            if (!prev) return prev;
            const updated: GedBatchJob = {
              ...prev,
              status: payload.status,
              processedFuncionarios: payload.processedFuncionarios,
              succeededFuncionarios: payload.succeededFuncionarios,
              failedFuncionarios: payload.failedFuncionarios,
              updatedAt: payload.updatedAt,
              result: payload.result ? {
                zipBlobName: payload.result.zipBlobName || "",
                zipUrl: payload.result.zipUrl,
              } : undefined,
            };
            
            if (isJobTerminal(payload.status)) {
              handleTerminalJob(updated);
            }
            return updated;
          });
        },
        "ged-batch:progress": (payload: GedBatchProgressPayload) => {
          if (payload.jobId !== jobId) return;
          
          setCurrentJob((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              processedFuncionarios: payload.processedFuncionarios,
              updatedAt: payload.updatedAt,
            };
          });
        }
      });
      
      if (unsub) {
        socketUnsubRef.current = unsub;
      }
    },
    [handleTerminalJob, registerHandlers, stopPolling],
  );

  // Restaura job ativo do localStorage ao montar
  useEffect(() => {
    const activeJobId = getActiveJobId();
    if (activeJobId) {
      getBatchJobStatus(activeJobId)
        .then((job) => {
          setCurrentJob(job);
          if (isJobTerminal(job.status)) {
            handleTerminalJob(job);
          } else {
            startPolling(activeJobId);
          }
        })
        .catch(() => {
          clearActiveJobId();
        });
    }
    
    return () => stopPolling();
  }, [startPolling, stopPolling, handleTerminalJob]);

  const startBatch = useCallback(
    async (payload: CreateBatchRequest) => {
      setIsCreating(true);
      setError(null);
      _globalTerminalJobId = null;

      try {
        const job = await createBatchJob(payload);
        setCurrentJob(job);
        setIsCreating(false);

        if (isJobTerminal(job.status)) {
          handleTerminalJob(job);
        } else {
          setActiveJobId(job.id);
          jobIdRef.current = job.id;
          startPolling(job.id);
        }

        return job;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao iniciar lote.",
        );
        setIsCreating(false);
        return null;
      }
    },
    [handleTerminalJob, startPolling],
  );

  const clearJob = useCallback(() => {
    stopPolling();
    clearActiveJobId();
    setCurrentJob(null);
    setError(null);
  }, [stopPolling]);

  return {
    currentJob,
    isCreating,
    isPolling,
    error,
    startBatch,
    clearJob,
  };
}
