// Statistical math utilities for Monte Carlo simulation

// Box-Muller transform: generates standard normal random variable (mean 0, std 1)
// Uses caching to avoid wasting the second generated value.
let spare: number | null = null;

export function randNormal(): number {
  if (spare !== null) {
    const s = spare;
    spare = null;
    return s;
  }
  let u = 0;
  let v = 0;
  let s = 0;
  do {
    u = Math.random() * 2 - 1;
    v = Math.random() * 2 - 1;
    s = u * u + v * v;
  } while (s >= 1 || s === 0);
  const mul = Math.sqrt((-2 * Math.log(s)) / s);
  spare = v * mul;
  return u * mul;
}

// Sample one value from an array uniformly at random
export function sampleUniform<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Percentile of a sorted numeric array (0-100)
export function percentile(sortedAsc: number[], p: number): number {
  if (sortedAsc.length === 0) return 0;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const idx = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sortedAsc[lo];
  const frac = idx - lo;
  return sortedAsc[lo] * (1 - frac) + sortedAsc[hi] * frac;
}

// Standard deviation (population)
export function stdDev(arr: number[]): number {
  if (arr.length === 0) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const variance = arr.reduce((a, b) => a + (b - mean) ** 2, 0) / arr.length;
  return Math.sqrt(variance);
}

// Mean
export function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Compound annual growth rate from start/end values over years
export function cagr(startValue: number, endValue: number, years: number): number {
  if (startValue <= 0 || years <= 0) return 0;
  return (endValue / startValue) ** (1 / years) - 1;
}

// Sharpe ratio: (meanReturn - riskFreeRate) / stdReturn
// Inputs are per-period (e.g. monthly). We annualize inside.
export function sharpeRatio(
  periodicReturns: number[],
  riskFreeAnnual: number,
  periodsPerYear: number
): number {
  const sd = stdDev(periodicReturns);
  if (sd === 0) return 0;
  const meanAnnual = mean(periodicReturns) * periodsPerYear;
  return (meanAnnual - riskFreeAnnual) / (sd * Math.sqrt(periodsPerYear));
}

// Maximum peak-to-trough drawdown across a wealth path
export function maxDrawdown(path: number[]): number {
  let peak = path[0] ?? 0;
  let maxDD = 0;
  for (const v of path) {
    if (v > peak) peak = v;
    const dd = (peak - v) / peak;
    if (dd > maxDD) maxDD = dd;
  }
  return maxDD;
}

// Build histogram bins from raw final values
export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
}

export function histogram(values: number[], binCount: number): HistogramBin[] {
  if (values.length === 0) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) {
    return [{ x0: min, x1: min + 1, count: values.length }];
  }
  const width = (max - min) / binCount;
  const bins: HistogramBin[] = [];
  for (let i = 0; i < binCount; i++) {
    bins.push({ x0: min + i * width, x1: min + (i + 1) * width, count: 0 });
  }
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  return bins;
}

// Format currency compactly
export function formatCurrency(v: number, compact = false): string {
  const abs = Math.abs(v);
  if (compact) {
    if (abs >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(2)}B`;
    if (abs >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}M`;
    if (abs >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  }
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });
}

export function formatPercent(v: number, digits = 1): string {
  return `${(v * 100).toFixed(digits)}%`;
}
