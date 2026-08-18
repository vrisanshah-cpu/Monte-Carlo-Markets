'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Percent,
  Activity,
  Thermometer,
  Zap,
  AlertTriangle,
  Flame,
  Leaf,
} from 'lucide-react';
import { Controls } from './Controls';
import { FanChart, HistogramChart, ScenarioComparisonChart, CorrelationHeatmap, AttributionHeatmap } from './Charts';
import { MetricCard } from './MetricCard';
import { Tooltip, TERMS } from './Tooltip';
import { useSimulation } from '@/lib/useSimulation';
import { DEFAULT_ALLOCATIONS } from '@/lib/assets';
import { CLIMATE_SCENARIOS, computePortfolioClimateMetrics } from '@/lib/climate';
import { formatCurrency, formatPercent } from '@/lib/stats';
import { DEFAULT_SIM_CONFIG, type SimConfig, type LifeEvent, runSimulation } from '@/lib/simulation';

interface SandboxProps {
  resetKey: number;
}

export function Sandbox({ resetKey }: SandboxProps) {
  const [config, setConfig] = useState<SimConfig>(() => ({
    ...DEFAULT_SIM_CONFIG,
    initialBalance: 100_000,
    monthlyContribution: 500,
    years: 25,
    allocations: { ...DEFAULT_ALLOCATIONS },
    mode: 'gbm',
    crisisShockKey: 'full',
    inflationRate: 0.03,
    adjustForInflation: true,
    rebalance: 'annual',
    lifeEvents: [],
    numSims: 10_000,
    accountType: 'taxable',
    isRetirementPhase: false,
    initialAnnualWithdrawal: 40_000,
    retirementStartYear: 0,
    volatilityClustering: false,
    showBenchmark: false,
    climate: {
      scenario: 'orderly',
      carbonTaxOnsetYear: 5,
      enableClimateRisk: false,
      physicalRiskIntensity: 1.0,
      tippingPointProb: 0,
    },
  }));
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [showScenarioComparison, setShowScenarioComparison] = useState(false);

  const { result, running, run } = useSimulation();

  useEffect(() => {
    setConfig((c) => ({
      ...DEFAULT_SIM_CONFIG,
      initialBalance: 100_000,
      monthlyContribution: 500,
      years: 25,
      allocations: { ...DEFAULT_ALLOCATIONS },
      mode: 'gbm',
      crisisShockKey: 'full',
      inflationRate: 0.03,
      adjustForInflation: true,
      rebalance: 'annual',
      lifeEvents: [],
      numSims: 10_000,
      accountType: 'taxable',
      isRetirementPhase: false,
      initialAnnualWithdrawal: 40_000,
      retirementStartYear: 0,
      volatilityClustering: false,
      showBenchmark: false,
      climate: {
        scenario: 'orderly',
        carbonTaxOnsetYear: 5,
        enableClimateRisk: false,
        physicalRiskIntensity: 1.0,
        tippingPointProb: 0,
      },
    }));
    setLifeEvents([]);
    setShowScenarioComparison(false);
  }, [resetKey]);

  // Auto-run simulation when inputs change (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      run({ ...config, lifeEvents });
    }, 300);
    return () => clearTimeout(t);
  }, [config, lifeEvents, run]);

  const patch = (p: Partial<SimConfig>) => setConfig((c) => ({ ...c, ...p }));

  const climateMetrics = useMemo(() => {
    return computePortfolioClimateMetrics(config.allocations);
  }, [config.allocations]);

  const metrics = useMemo(() => {
    if (!result) return null;
    const totalContributions =
      config.initialBalance +
      config.monthlyContribution * config.years * 12 +
      lifeEvents.reduce((a, b) => a + b.amount, 0);
    const growth = result.medianFinal - totalContributions;
    return {
      medianFinal: result.medianFinal,
      p10Final: result.p10Final,
      p90Final: result.p90Final,
      probLoss: result.probLoss,
      probMillion: result.probMillion,
      maxDrawdown: result.maxDrawdownMedian,
      totalContributions,
      growth,
      probDepletion: result.probDepletion,
      climateVaR95: result.climateVaR95,
      climateVaR99: result.climateVaR99,
      tippingPointHitRate: result.tippingPointHitRate,
    };
  }, [result, config, lifeEvents]);

  // Scenario comparison: run all 3 climate scenarios synchronously
  const scenarioResults = useMemo(() => {
    if (!showScenarioComparison || !config.climate.enableClimateRisk) return [];
    return CLIMATE_SCENARIOS.map((sc) => {
      const scenarioConfig: SimConfig = {
        ...config,
        lifeEvents,
        climate: {
          ...config.climate,
          scenario: sc.id,
        },
        numSims: 2000, // lower sim count for comparison runs
        showBenchmark: false,
      };
      const r = runSimulation(scenarioConfig);
      return {
        label: sc.shortName,
        color: sc.color,
        median: r.median,
        medianFinal: r.medianFinal,
        p10Final: r.p10Final,
        p90Final: r.p90Final,
      };
    });
  }, [showScenarioComparison, config, lifeEvents]);

  const isClimateEnabled = config.climate.enableClimateRisk;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      {/* Sidebar */}
      <div className="lg:max-h-[calc(100vh-140px)] lg:overflow-y-auto lg:pr-2 custom-scroll">
        <Controls
          config={config}
          onChange={patch}
          allocations={config.allocations}
          onAllocationsChange={(a) => patch({ allocations: a })}
          lifeEvents={lifeEvents}
          onLifeEventsChange={setLifeEvents}
        />
      </div>

      {/* Main area */}
      <div className="space-y-6">
        {/* Status bar */}
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-300">
              10,000 Monte Carlo Simulations
            </span>
            <Tooltip content={TERMS.monteCarlo} />
            {isClimateEnabled && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-400">
                <Leaf className="h-3 w-3" />
                Climate Risk: {CLIMATE_SCENARIOS.find((s) => s.id === config.climate.scenario)?.shortName}
              </span>
            )}
          </div>
          {running ? (
            <span className="flex items-center gap-2 text-xs text-cyan-400">
              <motion.span
                className="inline-block h-2 w-2 rounded-full bg-cyan-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              Running...
            </span>
          ) : (
            <span className="text-xs text-emerald-400">Complete</span>
          )}
        </div>

        {/* Fan chart */}
        <Panel
          title="Simulation Fan Chart"
          subtitle="Median path with bull/bear bands over time"
          tooltip={<Tooltip content={TERMS.percentile} />}
        >
          {result ? (
            <FanChart result={result} years={config.years} />
          ) : (
            <ChartSkeleton />
          )}
          <Legend showBenchmark={config.showBenchmark} />
        </Panel>

        {/* Standard metrics */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          {metrics ? (
            <>
              <MetricCard
                label="Median Final Value"
                value={formatCurrency(metrics.medianFinal, true)}
                tone="positive"
                icon={<TrendingUp className="h-4 w-4 text-slate-500" />}
              />
              <MetricCard
                label="Growth vs Contributions"
                value={formatCurrency(metrics.growth, true)}
                tone={metrics.growth >= 0 ? 'positive' : 'negative'}
                sublabel={`Contributions: ${formatCurrency(metrics.totalContributions, true)}`}
                icon={<DollarSign className="h-4 w-4 text-slate-500" />}
              />
              <MetricCard
                label="Max Drawdown"
                value={formatPercent(metrics.maxDrawdown)}
                tone="negative"
                sublabel="Median path peak-to-trough"
                icon={<TrendingDown className="h-4 w-4 text-slate-500" />}
                tooltip={<Tooltip content={TERMS.drawdown} />}
              />
              <MetricCard
                label="Bear Case (10%)"
                value={formatCurrency(metrics.p10Final, true)}
                tone="negative"
                sublabel="Worst 1-in-10 outcome"
              />
              <MetricCard
                label="Bull Case (90%)"
                value={formatCurrency(metrics.p90Final, true)}
                tone="positive"
                sublabel="Best 1-in-10 outcome"
              />
              <MetricCard
                label="Probability of Loss"
                value={formatPercent(metrics.probLoss)}
                tone={metrics.probLoss > 0.3 ? 'negative' : 'neutral'}
                icon={<Percent className="h-4 w-4 text-slate-500" />}
              />
              {config.isRetirementPhase && (
                <MetricCard
                  label="Probability of Depletion"
                  value={formatPercent(metrics.probDepletion)}
                  tone={metrics.probDepletion > 0.1 ? 'negative' : 'neutral'}
                  sublabel="Chance of running out of money"
                  icon={<AlertTriangle className="h-4 w-4 text-slate-500" />}
                />
              )}
              <MetricCard
                label="Total Simulations"
                value="10,000"
                sublabel={config.mode === 'gbm' ? 'Geometric Brownian Motion' : 'Historical Bootstrap'}
                icon={<Activity className="h-4 w-4 text-slate-500" />}
              />
            </>
          ) : (
            <ChartSkeleton />
          )}
        </div>

        {/* Climate dashboard */}
        {isClimateEnabled && metrics && (
          <>
            <div className="rounded-2xl border border-emerald-800/40 bg-emerald-950/20 p-5">
              <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-emerald-300">
                <Thermometer className="h-5 w-5" />
                Climate Risk Dashboard
              </h3>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <MetricCard
                  label="Implied Temp Rise"
                  value={`${climateMetrics.impliedTemperatureRise}°C`}
                  tone={climateMetrics.impliedTemperatureRise <= 2 ? 'positive' : 'negative'}
                  sublabel="Portfolio alignment"
                  icon={<Flame className="h-4 w-4 text-slate-500" />}
                />
                <MetricCard
                  label="Carbon Intensity"
                  value={`${climateMetrics.weightedCarbonIntensity}`}
                  sublabel="tons CO₂ / $M revenue"
                  tone={climateMetrics.weightedCarbonIntensity <= 100 ? 'positive' : 'negative'}
                  icon={<Zap className="h-4 w-4 text-slate-500" />}
                />
                <MetricCard
                  label="Climate VaR (95%)"
                  value={formatCurrency(Math.abs(metrics.climateVaR95), true)}
                  tone="negative"
                  sublabel="Loss from climate shocks"
                  icon={<TrendingDown className="h-4 w-4 text-slate-500" />}
                />
                <MetricCard
                  label="Tipping Point Hit Rate"
                  value={formatPercent(metrics.tippingPointHitRate)}
                  tone={metrics.tippingPointHitRate > 0.1 ? 'negative' : 'neutral'}
                  sublabel="Fraction of runs crossing threshold"
                  icon={<AlertTriangle className="h-4 w-4 text-slate-500" />}
                />
              </div>

              {/* Green/brown bar */}
              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-slate-400">
                  <span>Portfolio Climate Alignment</span>
                  <span>
                    Green {Math.round(climateMetrics.greenWeight * 100)}% / Neutral {Math.round(climateMetrics.neutralWeight * 100)}% / Brown {Math.round(climateMetrics.brownWeight * 100)}%
                  </span>
                </div>
                <div className="flex h-3 overflow-hidden rounded-full border border-slate-700">
                  <div className="bg-emerald-500" style={{ width: `${climateMetrics.greenWeight * 100}%` }} />
                  <div className="bg-slate-500" style={{ width: `${climateMetrics.neutralWeight * 100}%` }} />
                  <div className="bg-rose-500" style={{ width: `${climateMetrics.brownWeight * 100}%` }} />
                </div>
              </div>
            </div>

            {/* Scenario comparison */}
            <Panel
              title="Scenario Comparison"
              subtitle="Portfolio wealth under different IPCC warming pathways"
              right={
                <button
                  onClick={() => setShowScenarioComparison((s) => !s)}
                  className="rounded-lg bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  {showScenarioComparison ? 'Hide' : 'Compare scenarios'}
                </button>
              }
            >
              {showScenarioComparison && scenarioResults.length > 0 ? (
                <>
                  <ScenarioComparisonChart scenarios={scenarioResults} years={config.years} />
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {scenarioResults.map((sc) => (
                      <div key={sc.label} className="rounded-lg border border-slate-800 bg-slate-950/40 p-3">
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <span className="h-2 w-2 rounded-full" style={{ background: sc.color }} />
                          {sc.label}
                        </div>
                        <div className="mt-2 space-y-1 text-xs text-slate-400">
                          <div className="flex justify-between">
                            <span>Median</span>
                            <span className="tabular-nums text-slate-200">{formatCurrency(sc.medianFinal, true)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bear (10%)</span>
                            <span className="tabular-nums text-rose-400">{formatCurrency(sc.p10Final, true)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Bull (90%)</span>
                            <span className="tabular-nums text-emerald-400">{formatCurrency(sc.p90Final, true)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex h-32 items-center justify-center text-sm text-slate-500">
                  {showScenarioComparison
                    ? 'Computing scenario comparison...'
                    : 'Click "Compare scenarios" to run all three IPCC pathways side-by-side.'}
                </div>
              )}
            </Panel>

            {/* Green vs Brown Attribution Heatmap */}
            <Panel
              title="Green vs Brown Attribution"
              subtitle="Which assets suffer most under climate transition and physical risk"
            >
              {result ? (
                <AttributionHeatmap
                  allocations={config.allocations}
                  stressImpact={result.assetStressImpact}
                />
              ) : (
                <ChartSkeleton />
              )}
            </Panel>
          </>
        )}

        {/* Histogram */}
        <Panel
          title="Outcome Distribution"
          subtitle="Frequency of final wealth across all 10,000 runs"
        >
          {result ? (
            <HistogramChart result={result} />
          ) : (
            <ChartSkeleton />
          )}
        </Panel>

        {/* Correlation Heatmap */}
        <Panel
          title="Asset Correlation Matrix"
          subtitle="How asset classes move together — useful for diversification under stress"
        >
          <CorrelationHeatmap />
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
  tooltip,
  right,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  tooltip?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-slate-100">
            {title}
            {tooltip}
          </h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function Legend({ showBenchmark }: { showBenchmark: boolean }) {
  return (
    <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400">
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full bg-emerald-400" /> Median (50th %ile)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full bg-cyan-400/60" /> 25th-75th %ile band
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-2 w-4 rounded-full bg-rose-400/30" /> 10th-90th %ile band
      </span>
      {showBenchmark && (
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-slate-400" style={{ borderTop: '2px dashed #94a3b8' }} /> 60/40 Benchmark
        </span>
      )}
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40">
      <motion.div
        className="h-6 w-6 rounded-full border-2 border-slate-700 border-t-cyan-400"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
