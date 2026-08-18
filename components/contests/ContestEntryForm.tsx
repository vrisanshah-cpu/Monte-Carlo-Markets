'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Controls } from '@/components/Controls';
import { FanChart } from '@/components/Charts';
import { useSimulation } from '@/lib/useSimulation';
import { DEFAULT_ALLOCATIONS } from '@/lib/assets';
import { DEFAULT_SIM_CONFIG, type SimConfig, type LifeEvent } from '@/lib/simulation';
import { submitSimulation } from '@/actions/submissions';
import { createClient } from '@/lib/supabase/client';
import type { Challenge } from '@/lib/types/challenge';

interface ChallengeRow {
  id: string;
  years: number;
  initial_balance: number;
  climate_scenario: string | null;
  physical_risk_intensity: number;
  tipping_point_prob: number;
  carbon_tax_onset_year: number;
  asset_universe?: any[];
  scripted_shocks?: any[];
  min_green_allocation?: number;
  max_carbon_intensity?: number;
}

export function ContestEntryForm({
  challenge,
}: {
  challenge: ChallengeRow & Partial<Challenge>;
}) {
  const router = useRouter();

  const [config, setConfig] = useState<SimConfig>(() => ({
    ...DEFAULT_SIM_CONFIG,
    initialBalance: challenge.initial_balance,
    years: challenge.years,
    allocations: { ...DEFAULT_ALLOCATIONS },
    climate: {
      scenario:
        (challenge.climate_scenario as
          | 'orderly'
          | 'disorderly'
          | 'hothouse') ?? 'orderly',
      carbonTaxOnsetYear: challenge.carbon_tax_onset_year,
      enableClimateRisk: true,
      physicalRiskIntensity: challenge.physical_risk_intensity,
      tippingPointProb: challenge.tipping_point_prob,
    },
  }));

  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
  const [shocksEnabled, setShocksEnabled] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const { result, run } = useSimulation();

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(!!data.user);
      setCheckingAuth(false);
    });
  }, []);

  const patch = (p: Partial<SimConfig>) =>
    setConfig((c) => ({ ...c, ...p }));

  const handleRun = () => run({ ...config, lifeEvents });

  const assetUniverse = challenge.asset_universe ?? [];

  const greenAllocation = assetUniverse.reduce((total, asset) => {
    if (asset?.type !== 'green') return total;

    const allocationKey =
      asset?.id ??
      asset?.key ??
      asset?.symbol ??
      asset?.name;

    if (!allocationKey) return total;

    return total + Number(config.allocations[allocationKey] ?? 0);
  }, 0);

  const requiredGreenAllocation = challenge.min_green_allocation ?? 0;

  const normalizedRequiredGreenAllocation =
    requiredGreenAllocation > 1
      ? requiredGreenAllocation / 100
      : requiredGreenAllocation;

  const meetsGreenConstraint =
    greenAllocation >= normalizedRequiredGreenAllocation;

  const greenAllocationPercent = greenAllocation * 100;
  const requiredGreenPercent = normalizedRequiredGreenAllocation * 100;

  const hasScriptedShocks =
    (challenge.scripted_shocks?.length ?? 0) > 0;

  const handleSubmitEntry = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/contests/${challenge.id}`);
      return;
    }

    if (!meetsGreenConstraint) {
      setSubmitError(
        `Green allocation must be at least ${requiredGreenPercent.toFixed(
          0
        )}%. Current allocation is ${greenAllocationPercent.toFixed(1)}%.`
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitSimulation({
        challengeId: challenge.id,
        mode: 'contest',
        allocations: config.allocations,
        simConfig: { ...config, lifeEvents },
        shocksEnabled,
      });

      router.push(`/contests/${challenge.id}/leaderboard`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : 'Submission failed'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
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

      <div className="space-y-4">
        {challenge.min_green_allocation != null && (
          <div
            className={`rounded-lg border px-3 py-2 text-sm ${
              meetsGreenConstraint
                ? 'border-emerald-800 bg-emerald-950/40 text-emerald-300'
                : 'border-amber-800 bg-amber-950/40 text-amber-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>Green allocation</span>
              <span className="font-semibold">
                {greenAllocationPercent.toFixed(1)}% /{' '}
                {requiredGreenPercent.toFixed(1)}% required
              </span>
            </div>

            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${
                  meetsGreenConstraint
                    ? 'bg-emerald-500'
                    : 'bg-amber-500'
                }`}
                style={{
                  width: `${Math.min(
                    (greenAllocationPercent /
                      Math.max(requiredGreenPercent, 1)) *
                      100,
                    100
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {hasScriptedShocks && (
          <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={shocksEnabled}
              onChange={(e) => setShocksEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-slate-600 bg-slate-800"
            />

            <span>
              <span className="font-medium">
                Apply scripted shocks to this run
              </span>

              <span className="block text-xs text-slate-400">
                {challenge.scripted_shocks?.length} scripted shock
                {challenge.scripted_shocks?.length === 1 ? '' : 's'} will
                affect the simulation.
              </span>
            </span>
          </label>
        )}

        <button
          onClick={handleRun}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2.5 text-sm text-slate-200 hover:bg-slate-700"
        >
          Run Simulation
        </button>

        {result && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
            <FanChart result={result} years={config.years} />
          </div>
        )}

        {!checkingAuth && !isLoggedIn && (
          <p className="rounded-lg border border-cyan-800 bg-cyan-950/40 px-3 py-2 text-xs text-cyan-300">
            You need an account to submit an entry.{' '}
            <Link
              href={`/signup?redirect=/contests/${challenge.id}`}
              className="underline"
            >
              Sign up
            </Link>{' '}
            or{' '}
            <Link
              href={`/login?redirect=/contests/${challenge.id}`}
              className="underline"
            >
              log in
            </Link>
            .
          </p>
        )}

        {submitError && (
          <p className="text-xs text-rose-400">{submitError}</p>
        )}

        <button
          onClick={handleSubmitEntry}
          disabled={
            !result ||
            submitting ||
            checkingAuth ||
            !meetsGreenConstraint
          }
          className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {submitting
            ? 'Submitting...'
            : isLoggedIn
              ? 'Submit Entry'
              : 'Log in to Submit'}
        </button>
      </div>
    </div>
  );
}