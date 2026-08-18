/// <reference lib="webworker" />
// Web Worker entry: runs Monte Carlo simulation off the main UI thread.

import { runSimulation } from './simulation';
import type { SimConfig, SimResult } from './simulation';

self.onmessage = (e: MessageEvent<{ id: number; config: SimConfig }>) => {
  const { id, config } = e.data;
  try {
    const result = runSimulation(config);
    (self as unknown as Worker).postMessage({ id, result } as { id: number; result: SimResult });
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      error: err instanceof Error ? err.message : 'Simulation failed',
    });
  }
};
