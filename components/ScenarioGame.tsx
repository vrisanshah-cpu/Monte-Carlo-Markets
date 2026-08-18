'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingDown,
  Zap,
  Rocket,
  BrainCircuit,
  ChevronRight,
  RotateCcw,
  Trophy,
  Award,
  Gauge,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from './Modal';
import { Tooltip, TERMS } from './Tooltip';
import { MetricCard } from './MetricCard';
import {
  SCENARIOS,
  applyDecision,
  computeGameScore,
  type Scenario,
  type DecisionChoice,
  type GameScore,
} from '@/lib/game';
import { randNormal, formatCurrency, formatPercent } from '@/lib/stats';
import { ASSET_CLASSES, DEFAULT_ALLOCATIONS } from '@/lib/assets';

type Phase = 'select' | 'alloc' | 'running' | 'decision' | 'result';

export function ScenarioGame({ resetKey }: { resetKey: number }) {
  const [phase, setPhase] = useState<Phase>('select');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({ ...DEFAULT_ALLOCATIONS });
  const [chartData, setChartData] = useState<Record<string, number | string>[]>([]);
  const [month, setMonth] = useState(0);
  const [pendingEventIdx, setPendingEventIdx] = useState(0);
  const [decisionLog, setDecisionLog] = useState<{ choice: DecisionChoice; headline: string }[]>([]);
  const [score, setScore] = useState<GameScore | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [, forceRender] = useState(0);

  const balanceRef = useRef(0);
  const allocRef = useRef<Record<string, number>>({});
  const driftAdjustRef = useRef<{ remaining: number; value: number }>({ remaining: 0, value: 0 });
  const monthlyReturnsRef = useRef<number[]>([]);
  const eventFiredRef = useRef<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wealthPathRef = useRef<number[]>([]);
  const decisionLogRef = useRef<{ choice: DecisionChoice; headline: string }[]>([]);

  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey]);

  const reset = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setPhase('select');
    setScenario(null);
    setAllocations({ ...DEFAULT_ALLOCATIONS });
    setChartData([]);
    setMonth(0);
    setPendingEventIdx(0);
    setDecisionLog([]);
    setScore(null);
    setAutoPlay(false);
    balanceRef.current = 0;
    driftAdjustRef.current = { remaining: 0, value: 0 };
    monthlyReturnsRef.current = [];
    eventFiredRef.current = new Set();
    wealthPathRef.current = [];
    decisionLogRef.current = [];
  }, []);

  const startScenario = (sc: Scenario) => {
    setScenario(sc);
    setAllocations({ ...DEFAULT_ALLOCATIONS });
    setPhase('alloc');
  };

  const beginRun = () => {
    if (!scenario) return;
    balanceRef.current = scenario.initialBalance;
    allocRef.current = { ...allocations };
    driftAdjustRef.current = { remaining: 0, value: 0 };
    monthlyReturnsRef.current = [];
    eventFiredRef.current = new Set();
    wealthPathRef.current = [scenario.initialBalance];
    setChartData([{ month: 0, label: '0y', value: scenario.initialBalance }]);
    setMonth(0);
    setPendingEventIdx(0);
    setDecisionLog([]);
    decisionLogRef.current = [];
    setScore(null);
    setPhase('running');
    setAutoPlay(true);
  };

  const computeMonthlyReturn = (alloc: Record<string, number>): number => {
    if (!scenario) return 0;
    const total = Object.values(alloc).reduce((a, b) => a + b, 0) || 100;
    let r = 0;
    for (const a of ASSET_CLASSES) {
      const w = (alloc[a.id] ?? 0) / total;
      if (w <= 0) continue;
      const assetMonthlyDrift = a.annualReturn / 12;
      const assetMonthlyVol = a.annualVol / Math.sqrt(12);
      r += w * (assetMonthlyDrift + assetMonthlyVol * randNormal());
    }
    r = r * 0.4 + (scenario.baseDrift + scenario.baseVol * randNormal()) * 0.6;
    if (driftAdjustRef.current.remaining > 0) {
      r += driftAdjustRef.current.value;
      driftAdjustRef.current.remaining -= 1;
    }
    return r;
  };

  const stepMonth = useCallback(() => {
    if (!scenario) return;
    setMonth((prevMonth) => {
      const m = prevMonth + 1;
      const totalMonths = scenario.years * 12;

      const event = scenario.events.find((e) => e.month === m - 1);
      if (event && !eventFiredRef.current.has(event.month)) {
        const shockedBalance = balanceRef.current * (1 + event.shock);
        balanceRef.current = Math.max(0, shockedBalance);
        eventFiredRef.current.add(event.month);
        if (event.driftMonths && event.driftAdjust) {
          driftAdjustRef.current = { remaining: event.driftMonths, value: event.driftAdjust };
        }
        wealthPathRef.current = [...wealthPathRef.current, balanceRef.current];
        setChartData((d) => [
          ...d,
          { month: m, label: (m / 12).toFixed(1) + 'y', value: Math.round(balanceRef.current) },
        ]);
        setPendingEventIdx(scenario.events.indexOf(event));
        setAutoPlay(false);
        setPhase('decision');
        return m;
      }

      const r = computeMonthlyReturn(allocRef.current);
      monthlyReturnsRef.current.push(r);
      balanceRef.current = Math.max(0, balanceRef.current * (1 + r) + scenario.monthlyContribution);
      wealthPathRef.current = [...wealthPathRef.current, balanceRef.current];
      setChartData((d) => [
        ...d,
        { month: m, label: (m / 12).toFixed(1) + 'y', value: Math.round(balanceRef.current) },
      ]);

      if (m >= totalMonths) {
        setAutoPlay(false);
        const panicCount = decisionLogRef.current.filter((d) => d.choice === 'panic').length;
        const stayCount = decisionLogRef.current.filter((d) => d.choice === 'stay').length;
        const buyDipCount = decisionLogRef.current.filter((d) => d.choice === 'buydip').length;
        const s = computeGameScore(
          [...wealthPathRef.current],
          [...monthlyReturnsRef.current],
          scenario,
          decisionLogRef.current.length,
          panicCount,
          stayCount,
          buyDipCount
        );
        setScore(s);
        setPhase('result');
        return m;
      }
      return m;
    });
    forceRender((x) => x + 1);
  }, [scenario]);

  useEffect(() => {
    if (phase === 'running' && autoPlay) {
      timerRef.current = setInterval(() => {
        stepMonth();
      }, 120);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [phase, autoPlay, stepMonth]);

  const handleDecision = (choice: DecisionChoice) => {
    if (!scenario) return;
    const event = scenario.events[pendingEventIdx];
    allocRef.current = applyDecision(allocRef.current, choice);
    setAllocations({ ...allocRef.current });
    const entry = { choice, headline: event?.headline ?? '' };
    setDecisionLog((l) => [...l, entry]);
    decisionLogRef.current = [...decisionLogRef.current, entry];
    setPhase('running');
    setAutoPlay(true);
  };

  const step = () => {
    if (phase === 'running') stepMonth();
  };

  // --- Render ---

  if (phase === 'select') {
    return <ScenarioSelect onSelect={startScenario} />;
  }

  if (phase === 'alloc') {
    return (
      <ScenarioAlloc
        scenario={scenario!}
        allocations={allocations}
        onAllocationsChange={setAllocations}
        onBegin={beginRun}
        onBack={() => setPhase('select')}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
      {/* Left: status */}
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <button
            onClick={reset}
            className="mb-3 flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200"
          >
            <RotateCcw className="h-3 w-3" /> Change scenario
          </button>
          <h3 className="text-sm font-semibold text-slate-100">{scenario!.name}</h3>
          <p className="mt-1 text-xs text-slate-500">{scenario!.tagline}</p>
          <div className="mt-3 space-y-1.5 text-xs">
            <Row label="Starting balance" value={formatCurrency(scenario!.initialBalance)} />
            <Row label="Monthly add" value={formatCurrency(scenario!.monthlyContribution)} />
            <Row label="Duration" value={`${scenario!.years} years`} />
            <Row
              label="Current month"
              value={`${month} / ${scenario!.years * 12}`}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Current Allocation
          </h4>
          <div className="space-y-1.5">
            {ASSET_CLASSES.filter((a) => (allocations[a.id] ?? 0) > 0).map((a) => (
              <div key={a.id} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                  {a.shortName}
                </span>
                <span className="tabular-nums text-slate-400">{allocations[a.id].toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Decisions ({decisionLog.length})
          </h4>
          {decisionLog.length === 0 ? (
            <p className="text-xs text-slate-500">No decisions made yet.</p>
          ) : (
            <div className="space-y-1.5">
              {decisionLog.map((d, i) => (
                <div key={i} className="text-xs text-slate-400">
                  <span
                    className={
                      d.choice === 'panic'
                        ? 'text-rose-400'
                        : d.choice === 'buydip'
                        ? 'text-emerald-400'
                        : 'text-cyan-400'
                    }
                  >
                    {d.choice === 'panic' ? 'Panic Sell' : d.choice === 'buydip' ? 'Buy the Dip' : 'Stay the Course'}
                  </span>
                  <div className="text-slate-500">{d.headline}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: chart + controls */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-100">Portfolio Value</h3>
              <p className="text-xs text-slate-500">Year-by-year through the crisis</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold tabular-nums text-emerald-400">
                {formatCurrency(balanceRef.current, true)}
              </div>
              <div className="text-xs text-slate-500">
                Month {month} / {scenario!.years * 12}
              </div>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gameArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="label" stroke="#64748b" tick={{ fontSize: 11 }} />
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
                  formatter={(v) => [formatCurrency(Number(v)), 'Portfolio']}
                />
                <ReferenceLine
                  y={scenario!.initialBalance}
                  stroke="#475569"
                  strokeDasharray="4 4"
                  label={{ value: 'Start', fill: '#64748b', fontSize: 10 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#34d399"
                  strokeWidth={2.5}
                  fill="url(#gameArea)"
                  name="Portfolio"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {phase === 'running' && (
          <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <button
              onClick={() => setAutoPlay((a) => !a)}
              className="rounded-lg bg-cyan-600 px-5 py-2 text-sm font-medium text-white hover:bg-cyan-500 transition-colors"
            >
              {autoPlay ? 'Pause' : 'Auto-play'}
            </button>
            <button
              onClick={step}
              className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
            >
              Step 1 month
            </button>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" /> Events trigger automatically
            </span>
          </div>
        )}
      </div>

      {/* Decision modal */}
      <DecisionModal
        open={phase === 'decision'}
        scenario={scenario!}
        eventIdx={pendingEventIdx}
        onChoose={handleDecision}
      />

      {/* Result modal */}
      <ResultModal
        open={phase === 'result'}
        score={score}
        scenario={scenario!}
        onReset={reset}
        onReplay={() => beginRun()}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-300">{value}</span>
    </div>
  );
}

// --- Scenario selection ---
function ScenarioSelect({ onSelect }: { onSelect: (s: Scenario) => void }) {
  const icons: Record<string, React.ReactNode> = {
    TrendingDown: <TrendingDown className="h-6 w-6" />,
    Zap: <Zap className="h-6 w-6" />,
    Rocket: <Rocket className="h-6 w-6" />,
    BrainCircuit: <BrainCircuit className="h-6 w-6" />,
  };
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-6 text-center">
        <h2 className="text-2xl font-bold text-slate-100">Choose Your Challenge</h2>
        <p className="mt-1 text-sm text-slate-400">
          Step into a historical or hypothetical market crisis. Set your allocation, ride out the chaos, and make
          gut-wrenching decisions when events strike.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {SCENARIOS.map((sc) => (
          <motion.button
            key={sc.id}
            onClick={() => onSelect(sc)}
            className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-5 text-left hover:border-cyan-500/50 hover:bg-slate-900 transition-all"
            whileHover={{ y: -4 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          >
            <div className="flex items-start justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-800 text-cyan-400">
                {icons[sc.icon]}
              </div>
              <ChevronRight className="h-5 w-5 text-slate-600 group-hover:text-cyan-400 transition-colors" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-100">{sc.name}</h3>
            <p className="mt-1 text-sm text-cyan-400/80">{sc.tagline}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{sc.description}</p>
            <div className="mt-3 flex gap-3 text-xs text-slate-500">
              <span>{sc.years} years</span>
              <span>•</span>
              <span>{sc.events.length} events</span>
              <span>•</span>
              <span>Starts at {formatCurrency(sc.initialBalance, true)}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

// --- Allocation setup ---
function ScenarioAlloc({
  scenario,
  allocations,
  onAllocationsChange,
  onBegin,
  onBack,
}: {
  scenario: Scenario;
  allocations: Record<string, number>;
  onAllocationsChange: (a: Record<string, number>) => void;
  onBegin: () => void;
  onBack: () => void;
}) {
  const total = Object.values(allocations).reduce((a, b) => a + b, 0);
  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={onBack} className="mb-4 text-xs text-slate-400 hover:text-slate-200">
        ← Back to scenarios
      </button>
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-xl font-bold text-slate-100">{scenario.name}</h2>
        <p className="mt-1 text-sm text-slate-400">{scenario.description}</p>

        <div className="mt-5 mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200">Set your allocation</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              Math.abs(total - 100) < 0.1
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-rose-500/15 text-rose-400'
            }`}
          >
            {total.toFixed(0)}%
          </span>
        </div>

        <div className="space-y-3">
          {ASSET_CLASSES.map((a) => (
            <div key={a.id}>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-slate-300">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                  {a.name}
                </span>
                <span className="tabular-nums text-slate-400">{(allocations[a.id] ?? 0).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={allocations[a.id] ?? 0}
                onChange={(e) =>
                  onAllocationsChange({ ...allocations, [a.id]: Number(e.target.value) })
                }
                className="slider mt-1"
                style={{ accentColor: a.color }}
              />
            </div>
          ))}
        </div>

        <button
          onClick={onBegin}
          className="mt-6 w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Begin Simulation
        </button>
      </div>
    </div>
  );
}

// --- Decision modal ---
function DecisionModal({
  open,
  scenario,
  eventIdx,
  onChoose,
}: {
  open: boolean;
  scenario: Scenario;
  eventIdx: number;
  onChoose: (c: DecisionChoice) => void;
}) {
  const event = scenario.events[eventIdx];
  if (!event) return null;
  return (
    <Modal open={open} dismissable={false} maxWidth="max-w-xl">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-500/15 text-rose-400"
        >
          <AlertTriangle className="h-8 w-8" />
        </motion.div>
        <h2 className="mt-4 text-xl font-bold text-slate-100">{event.headline}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">{event.body}</p>
      </div>

      <div className="mt-6 space-y-2.5">
        <DecisionOption
          title="Stay the Course"
          desc="Maintain your current allocation. Ride it out."
          tone="cyan"
          onClick={() => onChoose('stay')}
        />
        <DecisionOption
          title="Panic Sell"
          desc="Shift heavily to cash. Protect what you have left."
          tone="rose"
          onClick={() => onChoose('panic')}
        />
        <DecisionOption
          title="Buy the Dip"
          desc="Move aggressively into stocks. This is an opportunity."
          tone="emerald"
          onClick={() => onChoose('buydip')}
        />
      </div>
    </Modal>
  );
}

function DecisionOption({
  title,
  desc,
  tone,
  onClick,
}: {
  title: string;
  desc: string;
  tone: 'cyan' | 'rose' | 'emerald';
  onClick: () => void;
}) {
  const tones = {
    cyan: 'border-cyan-500/50 hover:bg-cyan-500/10 text-cyan-300',
    rose: 'border-rose-500/50 hover:bg-rose-500/10 text-rose-300',
    emerald: 'border-emerald-500/50 hover:bg-emerald-500/10 text-emerald-300',
  };
  return (
    <motion.button
      onClick={onClick}
      className={`w-full rounded-xl border bg-slate-800/40 p-4 text-left transition-all ${tones[tone]}`}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="font-semibold">{title}</div>
      <div className="text-xs text-slate-400">{desc}</div>
    </motion.button>
  );
}

// --- Result modal ---
function ResultModal({
  open,
  score,
  scenario,
  onReset,
  onReplay,
}: {
  open: boolean;
  score: GameScore | null;
  scenario: Scenario;
  onReset: () => void;
  onReplay: () => void;
}) {
  if (!score) return null;
  const tone = score.resilience >= 70 ? 'emerald' : score.resilience >= 40 ? 'cyan' : 'rose';
  const toneColor =
    tone === 'emerald' ? '#34d399' : tone === 'cyan' ? '#22d3ee' : '#f43f5e';
  return (
    <Modal open={open} dismissable={false} maxWidth="max-w-lg" title="Game Results">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 12 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15 text-amber-400"
        >
          <Trophy className="h-10 w-10" />
        </motion.div>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-1.5">
          <Award className="h-4 w-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-300">{score.badge}</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">{score.badgeDescription}</p>
      </div>

      {/* Resilience gauge */}
      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 text-slate-300">
            <Gauge className="h-4 w-4" /> Resilience Score
            <Tooltip content={TERMS.resilience} />
          </span>
          <span className="text-lg font-bold tabular-nums" style={{ color: toneColor }}>
            {score.resilience}/100
          </span>
        </div>
        <div className="mt-2 h-3 overflow-hidden rounded-full bg-slate-800">
          <motion.div
            className="h-full rounded-full"
            style={{ background: toneColor }}
            initial={{ width: 0 }}
            animate={{ width: `${score.resilience}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <MetricCard label="Final Net Worth" value={formatCurrency(score.finalWealth, true)} tone="positive" />
        <MetricCard
          label="Inflation-Adjusted"
          value={formatCurrency(score.inflationAdjustedWealth, true)}
          tone="neutral"
          sublabel="Today's dollars"
        />
        <MetricCard
          label="Sharpe Ratio"
          value={score.sharpe.toFixed(2)}
          tone={score.sharpe > 0.5 ? 'positive' : score.sharpe < 0 ? 'negative' : 'neutral'}
          icon={<TrendingDown className="h-4 w-4 text-slate-500" />}
          tooltip={<Tooltip content={TERMS.sharpe} />}
        />
        <MetricCard
          label="CAGR"
          value={formatPercent(score.cagr)}
          tone={score.cagr > 0 ? 'positive' : 'negative'}
        />
      </div>

      <div className="mt-5 flex gap-3">
        <button
          onClick={onReplay}
          className="flex-1 rounded-lg bg-cyan-600 py-2.5 text-sm font-medium text-white hover:bg-cyan-500 transition-colors"
        >
          Replay scenario
        </button>
        <button
          onClick={onReset}
          className="flex-1 rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm text-slate-200 hover:bg-slate-700 transition-colors"
        >
          Choose new scenario
        </button>
      </div>
    </Modal>
  );
}
