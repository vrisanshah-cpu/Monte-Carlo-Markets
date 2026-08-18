'use server';

import { createClient } from '@/lib/supabase/server';
import { runSimulation, type SimConfig } from '@/lib/simulation';
import { computeCompositeScore } from '@/lib/scoring';
import { sharpeRatio } from '@/lib/stats';
import { revalidatePath } from 'next/cache';

interface SubmitParams {
  challengeId: string | null;
  mode: 'sandbox' | 'contest' | 'game';
  allocations: Record<string, number>;
  simConfig: SimConfig;
  weights?: { sharpe: number; climateVar: number; tempRise: number };
}

export async function submitSimulation(params: SubmitParams) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Re-run the simulation server-side so results can't be fabricated client-side.
  const result = runSimulation(params.simConfig);

  const monthlyReturns: number[] = [];
  for (let i = 1; i < result.median.length; i++) {
    monthlyReturns.push(result.median[i] / result.median[i - 1] - 1);
  }
  const sharpe = sharpeRatio(monthlyReturns, 0.02, 12);

  // If a challenge is attached, pull its climate scenario to compute implied temp rise;
  // otherwise fall back to a neutral 1.5.
  let impliedTempRise = 1.5;
  let weights = params.weights ?? { sharpe: 1, climateVar: 1, tempRise: 1 };

  if (params.challengeId) {
    const { data: challenge } = await supabase
      .from('challenges')
      .select('weight_sharpe, weight_climate_var, weight_temp_rise')
      .eq('id', params.challengeId)
      .single();
    if (challenge) {
      weights = {
        sharpe: challenge.weight_sharpe,
        climateVar: challenge.weight_climate_var,
        tempRise: challenge.weight_temp_rise,
      };
    }
  }

  const compositeScore = params.challengeId
    ? computeCompositeScore({
        sharpeRatio: sharpe,
        climateVaR95: result.climateVaR95,
        impliedTemperatureRise: impliedTempRise,
        weightSharpe: weights.sharpe,
        weightClimateVar: weights.climateVar,
        weightTempRise: weights.tempRise,
      })
    : null;

  const { data, error } = await supabase
    .from('submissions')
    .insert({
      user_id: user.id,
      challenge_id: params.challengeId,
      mode: params.mode,
      allocations: params.allocations,
      sim_config: params.simConfig,
      result_summary: {
        medianFinal: result.medianFinal,
        p10Final: result.p10Final,
        p90Final: result.p90Final,
        maxDrawdown: result.maxDrawdownMedian,
        probLoss: result.probLoss,
      },
      sharpe_ratio: sharpe,
      climate_var_95: result.climateVaR95,
      implied_temp_rise: impliedTempRise,
      composite_score: compositeScore,
    })
    .select()
    .single();

  if (error) throw error;

  if (params.challengeId) {
    revalidatePath(`/contests/${params.challengeId}/leaderboard`);
  }
  revalidatePath('/dashboard');

  return data;
}

export async function getMySubmissions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('submissions')
    .select('*, challenges(title, slug)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data;
}
