'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Trash2, AlertTriangle, ChevronDown, ChevronRight } from 'lucide-react';
import {
  ASSET_CLASSES,
  CRISIS_ERAS,
  PRESET_PORTFOLIOS,
  STOCK_HOLDINGS,
} from '@/lib/assets';
import { CLIMATE_SCENARIOS, computePortfolioClimateMetrics } from '@/lib/climate';
import { Tooltip, TERMS } from './Tooltip';
import type { SimConfig, LifeEvent, AccountType } from '@/lib/simulation';

interface ControlsProps {
  config: SimConfig;
  onChange: (patch: Partial<SimConfig>) => void;
  allocations: Record<string, number>;
  onAllocationsChange: (a: Record<string, number>) => void;
  lifeEvents: LifeEvent[];
  onLifeEventsChange: (e: LifeEvent[]) => void;
}

export function Controls({
  config,
  onChange,
  allocations,
  onAllocationsChange,
  lifeEvents,
  onLifeEventsChange,
}: ControlsProps) {
  const [showEvents, setShowEvents] = useState(false);
  const [showStocks, setShowStocks] = useState(false);
  const [newEvent, setNewEvent] = useState({ year: 5, amount: -30000, label: 'House down payment' });

  const allocTotal = Object.values(allocations).reduce((a, b) => a + b, 0);

  const setAllocation = (id: string, value: number) => {
    onAllocationsChange({ ...allocations, [id]: value });
  };

  const addEvent = () => {
    const ev: LifeEvent = {
      id: `ev-${Date.now()}`,
      year: newEvent.year,
      amount: newEvent.amount,
      label: newEvent.label || 'Custom event',
    };
    onLifeEventsChange([...lifeEvents, ev]);
  };

  const removeEvent = (id: string) => {
    onLifeEventsChange(lifeEvents.filter((e) => e.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Preset portfolios */}
      <Section title="Preset Portfolios">
        <div className="flex flex-wrap gap-1.5">
          {PRESET_PORTFOLIOS.map((p) => (
            <button
              key={p.id}
              onClick={() => onAllocationsChange({ ...p.allocations })}
              className="rounded-lg border border-slate-700 bg-slate-800/50 px-2.5 py-1.5 text-xs text-slate-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-all"
              title={p.description}
            >
              {p.name}
            </button>
          ))}
        </div>
      </Section>

      {/* Core inputs */}
      <Section title="Portfolio Inputs">
        <Field label="Initial Balance">
          <MoneyInput
            value={config.initialBalance}
            onChange={(v) => onChange({ initialBalance: v })}
            min={0}
          />
        </Field>
        <Field label="Monthly Contribution">
          <MoneyInput
            value={config.monthlyContribution}
            onChange={(v) => onChange({ monthlyContribution: v })}
            min={0}
          />
        </Field>
        <Field label={`Timeline: ${config.years} years`}>
          <input
            type="range"
            min={1}
            max={40}
            value={config.years}
            onChange={(e) => onChange({ years: Number(e.target.value) })}
            className="slider"
          />
        </Field>
      </Section>

      {/* FIRE / Retirement */}
      <Section
        title="Retirement / FIRE Mode"
        tooltip={<Tooltip content={<>Withdraw money each year instead of adding it. Tests whether your portfolio survives a long retirement (sequence-of-returns risk).</>}
        />}
      >
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={config.isRetirementPhase}
            onChange={(e) => onChange({ isRetirementPhase: e.target.checked })}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-amber-500"
          />
          Enable withdrawals (decumulation)
        </label>
        {config.isRetirementPhase && (
          <div className="mt-3 space-y-3">
            <Field label="Annual Withdrawal ($)">
              <MoneyInput
                value={config.initialAnnualWithdrawal}
                onChange={(v) => onChange({ initialAnnualWithdrawal: v })}
                min={0}
              />
            </Field>
            <Field label={`Withdrawals start: Year ${config.retirementStartYear}`}>
              <input
                type="range"
                min={0}
                max={config.years}
                value={config.retirementStartYear}
                onChange={(e) => onChange({ retirementStartYear: Number(e.target.value) })}
                className="slider"
              />
            </Field>
            <p className="text-xs text-slate-500">
              Withdrawals are inflation-adjusted and split monthly. The simulation tracks how often your money runs out.
            </p>
          </div>
        )}
      </Section>

      {/* Account type / taxes */}
      <Section
        title="Account Type"
        tooltip={<Tooltip content={<>Taxable accounts lose a small slice each year to dividend and capital-gains taxes. Tax-advantaged accounts (Roth, 401k) avoid this drag.</>}
        />}
      >
        <div className="grid grid-cols-3 gap-2">
          {(['taxable', 'roth_ira', 'tax_deferred'] as AccountType[]).map((t) => (
            <ModeButton
              key={t}
              active={config.accountType === t}
              onClick={() => onChange({ accountType: t })}
              label={t === 'taxable' ? 'Taxable' : t === 'roth_ira' ? 'Roth IRA' : 'Tax-Deferred'}
              sub={t === 'taxable' ? 'Tax drag' : 'No drag'}
            />
          ))}
        </div>
      </Section>

      {/* Simulation mode */}
      <Section title="Simulation Model" tooltip={<Tooltip content={TERMS.gbm}>GBM</Tooltip>}>
        <div className="grid grid-cols-2 gap-2">
          <ModeButton
            active={config.mode === 'gbm'}
            onClick={() => onChange({ mode: 'gbm' })}
            label="GBM"
            sub="Math model"
          />
          <ModeButton
            active={config.mode === 'bootstrap'}
            onClick={() => onChange({ mode: 'bootstrap' })}
            label="Historical"
            sub="Real shocks"
          />
        </div>
        {config.mode === 'gbm' && (
          <p className="mt-2 text-xs text-slate-500">
            Uses a mathematical model with drift + random jolts. <Tooltip content={TERMS.gbm} />
          </p>
        )}
        {config.mode === 'bootstrap' && (
          <p className="mt-2 text-xs text-slate-500">
            Replays real historical monthly returns. <Tooltip content={TERMS.bootstrap} />
          </p>
        )}

        {config.mode === 'bootstrap' && (
          <div className="mt-3 space-y-2">
            <p className="text-xs font-medium text-slate-400">Bias toward a crisis era:</p>
            <div className="flex flex-wrap gap-1.5">
              <CrisisChip
                active={!config.crisisShockKey || config.crisisShockKey === 'full'}
                onClick={() => onChange({ crisisShockKey: 'full' })}
                label="Full history"
              />
              {CRISIS_ERAS.map((era) => (
                <CrisisChip
                  key={era.id}
                  active={config.crisisShockKey === era.shockKey}
                  onClick={() => onChange({ crisisShockKey: era.shockKey })}
                  label={era.name}
                />
              ))}
            </div>
          </div>
        )}

        {/* Volatility clustering toggle */}
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={config.volatilityClustering}
            onChange={(e) => onChange({ volatilityClustering: e.target.checked })}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-rose-500"
          />
          Volatility clustering (GARCH-lite)
          <Tooltip content={<>When the market drops sharply, volatility stays elevated for a while — crashes cluster. This makes the simulation more realistic.</>} />
        </label>
      </Section>

      {/* Asset allocation */}
      <Section
        title="Asset Allocation"
        right={
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums ${
              Math.abs(allocTotal - 100) < 0.1
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-rose-500/15 text-rose-400'
            }`}
          >
            {allocTotal.toFixed(0)}%
          </span>
        }
      >
        <div className="space-y-3">
          {ASSET_CLASSES.map((asset) => (
            <div key={asset.id}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: asset.color }}
                  />
                  {asset.shortName}
                  <Tooltip content={asset.description} />
                </span>
                <span className="tabular-nums text-slate-400">
                  {(allocations[asset.id] ?? 0).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={allocations[asset.id] ?? 0}
                onChange={(e) => setAllocation(asset.id, Number(e.target.value))}
                className="slider mt-1"
                style={{ accentColor: asset.color }}
              />
            </div>
          ))}
        </div>
        {Math.abs(allocTotal - 100) > 0.1 && (
          <p className="mt-2 text-xs text-rose-400">
            Allocations should total 100%. They'll be normalized otherwise.
          </p>
        )}
        <button
          className="mt-3 w-full rounded-lg border border-slate-700 bg-slate-800 py-1.5 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
          onClick={() =>
            onAllocationsChange(
              Object.fromEntries(ASSET_CLASSES.map((a) => [a.id, 100 / ASSET_CLASSES.length]))
            )
          }
        >
          Equal-weight all
        </button>

        {/* Stock holdings explorer */}
        <button
          onClick={() => setShowStocks((s) => !s)}
          className="mt-3 flex w-full items-center justify-between text-xs text-slate-400 hover:text-slate-200"
        >
          <span className="flex items-center gap-1">
            {showStocks ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Specific stocks in each sleeve
          </span>
        </button>
        <AnimatePresence>
          {showStocks && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 space-y-2">
                {ASSET_CLASSES.map((asset) => {
                  const stocks = STOCK_HOLDINGS.filter((s) => s.assetId === asset.id);
                  if (stocks.length === 0) return null;
                  return (
                    <div key={asset.id} className="rounded-lg border border-slate-800 bg-slate-950/40 p-2">
                      <div className="mb-1 flex items-center gap-2 text-xs font-medium" style={{ color: asset.color }}>
                        <span className="h-2 w-2 rounded-full" style={{ background: asset.color }} />
                        {asset.shortName}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {stocks.map((s) => (
                          <span
                            key={s.ticker}
                            className="rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-400"
                            title={`${s.name} — ~${(s.annualReturn * 100).toFixed(0)}% return, ${(s.annualVol * 100).toFixed(0)}% vol`}
                          >
                            {s.ticker}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      {/* Inflation */}
      <Section title="Inflation" tooltip={<Tooltip content={TERMS.inflation} />}>
        <Field label={`Inflation Rate: ${(config.inflationRate * 100).toFixed(1)}%`}>
          <input
            type="range"
            min={0}
            max={10}
            step={0.1}
            value={config.inflationRate * 100}
            onChange={(e) => onChange({ inflationRate: Number(e.target.value) / 100 })}
            className="slider"
          />
        </Field>
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={config.adjustForInflation}
            onChange={(e) => onChange({ adjustForInflation: e.target.checked })}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-cyan-500"
          />
          Show results in today's dollars
        </label>
      </Section>

      {/* Rebalancing */}
      <Section title="Rebalancing Strategy" tooltip={<Tooltip content={TERMS.rebalance} />}>
        <div className="grid grid-cols-2 gap-2">
          <ModeButton
            active={config.rebalance === 'annual'}
            onClick={() => onChange({ rebalance: 'annual' })}
            label="Annual"
            sub="Reset yearly"
          />
          <ModeButton
            active={config.rebalance === 'buyhold'}
            onClick={() => onChange({ rebalance: 'buyhold' })}
            label="Buy & Hold"
            sub="Let drift"
          />
        </div>
      </Section>

      {/* Climate Risk */}
      <Section
        title="Climate Risk Modeling"
        tooltip={<Tooltip content={<>Model how climate change affects your portfolio: physical risks (extreme weather), transition risks (carbon taxes, policy shifts), and tipping points (irreversible warming thresholds).</>}
        />}
      >
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={config.climate.enableClimateRisk}
            onChange={(e) => onChange({ climate: { ...config.climate, enableClimateRisk: e.target.checked } })}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-emerald-500"
          />
          Enable climate risk simulation
        </label>

        {config.climate.enableClimateRisk && (
          <div className="mt-3 space-y-4">
            {/* Scenario selector */}
            <div>
              <p className="mb-2 text-xs font-medium text-slate-400">NGFS / IPCC Scenario Pathway</p>
              <div className="space-y-2">
                {CLIMATE_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => onChange({ climate: { ...config.climate, scenario: sc.id } })}
                    className={`w-full rounded-lg border px-3 py-2 text-left transition-all ${
                      config.climate.scenario === sc.id
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: sc.color }} />
                      <span className={`text-sm font-semibold ${
                        config.climate.scenario === sc.id ? 'text-emerald-300' : 'text-slate-300'
                      }`}>{sc.shortName}</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{sc.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Carbon tax onset */}
            <Field label={`Carbon Tax Onset: Year ${config.climate.carbonTaxOnsetYear}`}>
              <input
                type="range"
                min={1}
                max={Math.max(1, config.years)}
                value={config.climate.carbonTaxOnsetYear}
                onChange={(e) => onChange({ climate: { ...config.climate, carbonTaxOnsetYear: Number(e.target.value) } })}
                className="slider"
              />
              <p className="mt-1 text-xs text-slate-500">
                When carbon pricing kicks in, brown assets lose value and green assets get a drift boost.
              </p>
            </Field>

            {/* Physical risk intensity */}
            <Field label={`Physical Risk Intensity: ${config.climate.physicalRiskIntensity.toFixed(1)}x`}>
              <input
                type="range"
                min={0}
                max={3}
                step={0.1}
                value={config.climate.physicalRiskIntensity}
                onChange={(e) => onChange({ climate: { ...config.climate, physicalRiskIntensity: Number(e.target.value) } })}
                className="slider"
              />
              <p className="mt-1 text-xs text-slate-500">
                Multiplier on extreme weather event frequency. Higher = more droughts, floods, and infrastructure damage.
              </p>
            </Field>

            {/* Tipping point probability */}
            <Field label={`Tipping Point Probability: ${(config.climate.tippingPointProb * 100).toFixed(1)}%/yr`}>
              <input
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={config.climate.tippingPointProb * 100}
                onChange={(e) => onChange({ climate: { ...config.climate, tippingPointProb: Number(e.target.value) / 100 } })}
                className="slider"
              />
              <p className="mt-1 text-xs text-slate-500">
                Chance per year of crossing an irreversible warming threshold. If crossed, market volatility permanently rises and growth drift falls. Set to 0 to use the scenario default.
              </p>
            </Field>

            {/* Portfolio climate scorecard */}
            {(() => {
              const m = computePortfolioClimateMetrics(allocations);
              return (
                <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                  <p className="mb-2 text-xs font-medium text-slate-400">Portfolio Climate Scorecard</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <ClimateStat
                      label="Implied Temp Rise"
                      value={`${m.impliedTemperatureRise}°C`}
                      tone={m.impliedTemperatureRise <= 2 ? 'good' : m.impliedTemperatureRise <= 2.5 ? 'warn' : 'bad'}
                    />
                    <ClimateStat
                      label="Carbon Intensity"
                      value={`${m.weightedCarbonIntensity} t/$M`}
                      tone={m.weightedCarbonIntensity <= 100 ? 'good' : m.weightedCarbonIntensity <= 250 ? 'warn' : 'bad'}
                    />
                    <ClimateStat
                      label="Physical Risk"
                      value={`${m.physicalRiskScore}/100`}
                      tone={m.physicalRiskScore <= 25 ? 'good' : m.physicalRiskScore <= 50 ? 'warn' : 'bad'}
                    />
                    <ClimateStat
                      label="Transition Risk"
                      value={`${m.transitionRiskScore}/100`}
                      tone={m.transitionRiskScore <= 25 ? 'good' : m.transitionRiskScore <= 50 ? 'warn' : 'bad'}
                    />
                  </div>
                  <div className="mt-2 flex h-2 overflow-hidden rounded-full">
                    <div className="bg-emerald-500" style={{ width: `${m.greenWeight * 100}%` }} />
                    <div className="bg-slate-500" style={{ width: `${m.neutralWeight * 100}%` }} />
                    <div className="bg-rose-500" style={{ width: `${m.brownWeight * 100}%` }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-slate-500">
                    <span>Green {Math.round(m.greenWeight * 100)}%</span>
                    <span>Neutral {Math.round(m.neutralWeight * 100)}%</span>
                    <span>Brown {Math.round(m.brownWeight * 100)}%</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Section>

      {/* Benchmark overlay */}
      <Section title="Benchmark Overlay">
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={config.showBenchmark}
            onChange={(e) => onChange({ showBenchmark: e.target.checked })}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 accent-cyan-500"
          />
          Show 60/40 benchmark ghost line
        </label>
        <p className="mt-1 text-xs text-slate-500">
          Overlays a passive 60% stock / 40% bond portfolio median so you can compare.
        </p>
      </Section>

      {/* Life events */}
      <Section
        title="Life Events"
        right={
          <button
            onClick={() => setShowEvents((s) => !s)}
            className="flex items-center gap-1 rounded-lg bg-slate-800 px-2 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <Plus className="h-3 w-3" /> Add
          </button>
        }
      >
        <AnimatePresence>
          {showEvents && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950/50 p-3">
                <input
                  type="text"
                  value={newEvent.label}
                  onChange={(e) => setNewEvent({ ...newEvent, label: e.target.value })}
                  placeholder="Event label"
                  className="input"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-400">Year</label>
                    <input
                      type="number"
                      min={1}
                      max={config.years}
                      value={newEvent.year}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, year: Number(e.target.value) })
                      }
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Amount ($)</label>
                    <input
                      type="number"
                      value={newEvent.amount}
                      onChange={(e) =>
                        setNewEvent({ ...newEvent, amount: Number(e.target.value) })
                      }
                      className="input"
                    />
                  </div>
                </div>
                <button
                  onClick={() => {
                    addEvent();
                    setShowEvents(false);
                  }}
                  className="w-full rounded-lg bg-cyan-600 py-1.5 text-sm font-medium text-white hover:bg-cyan-500 transition-colors"
                >
                  Add event
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {lifeEvents.length === 0 ? (
          <p className="text-xs text-slate-500">
            No life events. Add one-time deposits or withdrawals (house, inheritance, college).
          </p>
        ) : (
          <div className="mt-2 space-y-1.5">
            {lifeEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-xs"
              >
                <span className="text-slate-300">
                  <span className="text-slate-500">Year {ev.year}:</span>{' '}
                  <span className={ev.amount < 0 ? 'text-rose-400' : 'text-emerald-400'}>
                    {ev.amount < 0 ? '-' : '+'}$
                    {Math.abs(ev.amount).toLocaleString()}
                  </span>{' '}
                  <span className="text-slate-400">{ev.label}</span>
                </span>
                <button
                  onClick={() => removeEvent(ev.id)}
                  className="text-slate-500 hover:text-rose-400 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

// --- Sub-components ---

function Section({
  title,
  children,
  right,
  tooltip,
}: {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  tooltip?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-200">
          {title}
          {tooltip}
        </h3>
        {right}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-3">
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      {children}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  min = 0,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
        $
      </span>
      <input
        type="number"
        min={min}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="input pl-7"
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  sub: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition-all ${
        active
          ? 'border-cyan-500 bg-cyan-500/10 text-cyan-300'
          : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:border-slate-600'
      }`}
    >
      <div className="text-sm font-semibold">{label}</div>
      <div className="text-xs opacity-70">{sub}</div>
    </button>
  );
}

function CrisisChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all ${
        active
          ? 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/40'
          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
      }`}
    >
      {active && <AlertTriangle className="h-3 w-3" />}
      {label}
    </button>
  );
}

function ClimateStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'good' | 'warn' | 'bad';
}) {
  const colorClass =
    tone === 'good' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : 'text-rose-400';
  return (
    <div className="flex items-center justify-between rounded bg-slate-800/50 px-2 py-1.5">
      <span className="text-slate-400">{label}</span>
      <span className={`font-semibold tabular-nums ${colorClass}`}>{value}</span>
    </div>
  );
}
