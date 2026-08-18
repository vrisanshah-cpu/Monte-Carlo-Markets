'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/stats';
import { ASSET_CLASSES, ASSET_CORRELATIONS } from '@/lib/assets';
import { CLIMATE_ASSET_META } from '@/lib/climate';
import type { SimResult } from '@/lib/simulation';

interface FanChartProps {
  result: SimResult;
  years: number;
}

export function FanChart({ result, years }: FanChartProps) {
  const showBenchmark = result.benchmarkMedian.length > 0;

  const data = useMemo(() => {
    const months = result.median.length;
    const step = Math.max(1, Math.floor(months / 120));
    const rows: Record<string, number | string>[] = [];
    for (let i = 0; i < months; i += step) {
      rows.push(buildRow(i, result, showBenchmark));
    }
    const last = months - 1;
    if (rows[rows.length - 1].month !== last) {
      rows.push(buildRow(last, result, showBenchmark));
    }
    return rows;
  }, [result, showBenchmark]);

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="bearBull" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="iqr" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.08} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}y`}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatCurrency(Number(v), true)}
            width={70}
          />
          <RTooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => `Year ${v}`}
            formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
          />
          <Area type="monotone" dataKey="p90" stroke="none" fill="url(#bearBull)" fillOpacity={1} name="90th %ile" />
          <Area type="monotone" dataKey="p10" stroke="none" fill="#0f172a" fillOpacity={0.55} name="10th %ile" />
          <Area type="monotone" dataKey="p75" stroke="none" fill="url(#iqr)" fillOpacity={1} name="75th %ile" />
          <Area type="monotone" dataKey="p25" stroke="none" fill="#0f172a" fillOpacity={0.7} name="25th %ile" />
          <Line type="monotone" dataKey="median" stroke="#34d399" strokeWidth={2.5} dot={false} name="Median" />
          <Line type="monotone" dataKey="p90" stroke="#f43f5e" strokeWidth={1.2} strokeDasharray="4 3" dot={false} name="Bull (90%)" />
          <Line type="monotone" dataKey="p10" stroke="#fb7185" strokeWidth={1.2} strokeDasharray="4 3" dot={false} name="Bear (10%)" />
          {showBenchmark && (
            <Line
              type="monotone"
              dataKey="benchmark"
              stroke="#94a3b8"
              strokeWidth={1.5}
              strokeDasharray="6 4"
              dot={false}
              name="60/40 Benchmark"
            />
          )}
          <ReferenceLine y={0} stroke="#475569" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function buildRow(i: number, result: SimResult, showBenchmark: boolean): Record<string, number | string> {
  const row: Record<string, number | string> = {
    month: i,
    label: (i / 12).toFixed(1),
    p10: Math.round(result.p10[i]),
    p25: Math.round(result.p25[i]),
    median: Math.round(result.median[i]),
    p75: Math.round(result.p75[i]),
    p90: Math.round(result.p90[i]),
  };
  if (showBenchmark) row.benchmark = Math.round(result.benchmarkMedian[i]);
  return row;
}

interface HistogramChartProps {
  result: SimResult;
}

export function HistogramChart({ result }: HistogramChartProps) {
  const data = useMemo(() => {
    return result.histogram.map((b, i) => ({
      bin: i,
      label: formatCurrency((b.x0 + b.x1) / 2, true),
      count: b.count,
    }));
  }, [result]);

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            tick={{ fontSize: 10 }}
            interval={Math.max(0, Math.floor(data.length / 6))}
          />
          <YAxis stroke="#64748b" tick={{ fontSize: 11 }} width={40} />
          <RTooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value) => [`${value} sims`, 'Count']}
            labelFormatter={(v) => {
              const bin = result.histogram[Number(v)];
              return bin
                ? `${formatCurrency(bin.x0, true)} – ${formatCurrency(bin.x1, true)}`
                : '';
            }}
          />
          <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} dot={false} name="Frequency" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Scenario Comparison Chart ---
interface ScenarioComparisonChartProps {
  scenarios: { label: string; color: string; median: number[] }[];
  years: number;
}

export function ScenarioComparisonChart({ scenarios, years }: ScenarioComparisonChartProps) {
  const data = useMemo(() => {
    if (scenarios.length === 0) return [];
    const months = scenarios[0].median.length;
    const step = Math.max(1, Math.floor(months / 100));
    const rows: Record<string, number | string>[] = [];
    for (let i = 0; i < months; i += step) {
      const row: Record<string, number | string> = { label: (i / 12).toFixed(1) };
      for (const sc of scenarios) {
        row[sc.label] = Math.round(sc.median[i]);
      }
      rows.push(row);
    }
    return rows;
  }, [scenarios]);

  if (scenarios.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        Run a simulation with climate risk enabled to see scenario comparison.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="label"
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => `${v}y`}
          />
          <YAxis
            stroke="#64748b"
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => formatCurrency(Number(v), true)}
            width={70}
          />
          <RTooltip
            contentStyle={{
              background: '#0f172a',
              border: '1px solid #334155',
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v) => `Year ${v}`}
            formatter={(value, name) => [formatCurrency(Number(value)), String(name)]}
          />
          {scenarios.map((sc) => (
            <Line
              key={sc.label}
              type="monotone"
              dataKey={sc.label}
              stroke={sc.color}
              strokeWidth={2}
              dot={false}
              name={sc.label}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// --- Correlation Heatmap ---
export function CorrelationHeatmap() {
  const assets = ASSET_CLASSES;
  const matrix = ASSET_CORRELATIONS;

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[500px]">
        <div
          className="grid gap-px"
          style={{ gridTemplateColumns: `80px repeat(${assets.length}, 1fr)` }}
        >
          <div />
          {assets.map((a) => (
            <div
              key={a.id}
              className="px-1 py-2 text-center text-[10px] font-medium text-slate-400"
              title={a.name}
            >
              {a.shortName}
            </div>
          ))}
          {assets.map((asset, i) => (
            <div key={asset.id} className="contents">
              <div className="flex items-center gap-1 px-1 py-1 text-[10px] text-slate-400" title={asset.name}>
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: asset.color }} />
                <span className="truncate">{asset.shortName}</span>
              </div>
              {matrix[i]?.map((val, j) => (
                <div
                  key={j}
                  className="flex items-center justify-center py-1 text-[10px] font-medium tabular-nums"
                  style={{
                    background: heatColor(val),
                    color: Math.abs(val) > 0.5 ? '#0f172a' : '#e2e8f0',
                  }}
                  title={`${asset.shortName} vs ${assets[j].shortName}: ${val.toFixed(2)}`}
                >
                  {val.toFixed(2)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function heatColor(val: number): string {
  if (val >= 0) {
    const alpha = val * 0.7;
    return `rgba(52, 211, 153, ${alpha})`;
  }
  const alpha = Math.abs(val) * 0.7;
  return `rgba(244, 63, 94, ${alpha})`;
}

// --- Green vs Brown Attribution Heatmap ---
interface AttributionHeatmapProps {
  allocations: Record<string, number>;
  stressImpact: Record<string, number>;
}

export function AttributionHeatmap({ allocations, stressImpact }: AttributionHeatmapProps) {
  const activeAssets = ASSET_CLASSES.filter((a) => (allocations[a.id] ?? 0) > 0);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_60px_60px_80px_80px] gap-2 text-xs font-medium text-slate-400">
        <div>Asset</div>
        <div className="text-center">Weight</div>
        <div className="text-center">Class</div>
        <div className="text-center">Phys Risk</div>
        <div className="text-center">Stress Impact</div>
      </div>
      {activeAssets.map((asset) => {
        const meta = CLIMATE_ASSET_META[asset.id];
        const weight = allocations[asset.id] ?? 0;
        const impact = stressImpact[asset.id] ?? 0;
        const classColor =
          meta?.classification === 'green' ? '#22c55e' :
          meta?.classification === 'brown' ? '#dc2626' : '#64748b';
        return (
          <div
            key={asset.id}
            className="grid grid-cols-[1fr_60px_60px_80px_80px] gap-2 items-center rounded-lg bg-slate-800/40 px-3 py-2 text-xs"
          >
            <div className="flex items-center gap-2 text-slate-300">
              <span className="h-2 w-2 rounded-full" style={{ background: asset.color }} />
              {asset.shortName}
            </div>
            <div className="text-center tabular-nums text-slate-400">{weight.toFixed(0)}%</div>
            <div className="text-center">
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
                style={{ background: `${classColor}30`, color: classColor }}
              >
                {meta?.classification ?? 'neutral'}
              </span>
            </div>
            <div className="text-center">
              <div className="mx-auto h-1.5 w-12 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-amber-500"
                  style={{ width: `${(meta?.physicalRiskExposure ?? 0) * 100}%` }}
                />
              </div>
            </div>
            <div
              className={`text-center tabular-nums font-medium ${
                impact < -0.05 ? 'text-rose-400' : impact < 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {impact !== 0 ? `${(impact * 100).toFixed(1)}%` : '—'}
            </div>
          </div>
        );
      })}
    </div>
  );
}
