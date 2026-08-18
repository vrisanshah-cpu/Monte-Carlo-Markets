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

interface ChallengeRow {
  id: string;
  years: number;
  initial_balance: number;
  climate_scenario: string | null;
  physical_risk_intensity: number;
  tipping_point_prob: number;
  carbon_tax_onset_year: number;
}

export function ContestEntryForm({ challenge }: { challenge: ChallengeRow }) {
  const router = useRouter();
  const [config, setConfig] = useState<SimConfig>(() => ({
    ...DEFAULT_SIM_CONFIG,
    initialBalance: challenge.initial_balance,
    years: challenge.years,
    allocations: { ...DEFAULT_ALLOCATIONS },
    climate: {
      scenario: (challenge.climate_scenario as 'orderly' | 'disorderly' | 'hothouse') ?? 'orderly',
      carbonTaxOnsetYear: challenge.carbon_tax_onset_year,
      enableClimateRisk: true,
      physicalRiskIntensity: challenge.physical_risk_intensity,
      tippingPointProb: challenge.tipping_point_prob,
    },
  }));
  const [lifeEvents, setLifeEvents] = useState<LifeEvent[]>([]);
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

  const patch = (p: Partial<SimConfig>) => setConfig((c) => ({ ...c, ...p }));
  const handleRun = () => run({ ...config, lifeEvents });

  const handleSubmitEntry = async () => {
    if (!isLoggedIn) {
      router.push(`/login?redirect=/contests/${challenge.id}`);
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
      });
      router.push(`/contests/${challenge.id}/leaderboard`);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Submission failed');
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
        <button
          onClick={handleRun}
          className="w-full rounded-lg bg-slate-800 border border-slate-700 py-2.5 text-sm text-slate-200 hover:bg-slate-700"
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
            <Link href={`/signup?redirect=/contests/${challenge.id}`} className="underline">
              Sign up
            </Link>{' '}
            or{' '}
            <Link href={`/login?redirect=/contests/${challenge.id}`} className="underline">
              log in
            </Link>
            .
          </p>
        )}
        {submitError && <p className="text-xs text-rose-400">{submitError}</p>}
        <button
          onClick={handleSubmitEntry}
          disabled={!result || submitting || checkingAuth}
          className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {submitting ? 'Submitting...' : isLoggedIn ? 'Submit Entry' : 'Log in to Submit'}
        </button>
      </div>
    </div>
  );
}