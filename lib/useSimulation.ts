'use client';

// Hook to run Monte Carlo simulation in a Web Worker with a main-thread fallback.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { SimConfig, SimResult } from './simulation';
import { runSimulation as runSync } from './simulation';

interface WorkerMsg {
  id: number;
  result?: SimResult;
  error?: string;
}

export function useSimulation() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef(0);
  const [result, setResult] = useState<SimResult | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    try {
      const worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), {
        type: 'module',
      });
      worker.onmessage = (e: MessageEvent<WorkerMsg>) => {
        const { id, result: r, error } = e.data;
        if (id !== pendingRef.current) return; // stale
        setRunning(false);
        if (error) {
          console.error('Worker simulation error:', error);
        } else if (r) {
          setResult(r);
        }
        setProgress(1);
      };
      workerRef.current = worker;
      return () => {
        worker.terminate();
        workerRef.current = null;
      };
    } catch {
      workerRef.current = null;
    }
  }, []);

  const run = useCallback((config: SimConfig) => {
    const id = ++pendingRef.current;
    setRunning(true);
    setProgress(0);
    const worker = workerRef.current;
    if (worker) {
      worker.postMessage({ id, config });
    } else {
      try {
        const r = runSync(config);
        if (id !== pendingRef.current) return;
        setResult(r);
      } finally {
        if (id === pendingRef.current) {
          setRunning(false);
          setProgress(1);
        }
      }
    }
  }, []);

  return { result, running, progress, run };
}
