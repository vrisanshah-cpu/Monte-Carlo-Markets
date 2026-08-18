// Monte Carlo simulation engine — shared logic used by both the main thread
// fallback and the Web Worker. Worker-safe (no DOM, no imports beyond stats).

import { randNormal, sampleUniform } from './stats';
import {
  ASSET_CLASSES,
  HISTORICAL_SHOCKS,
  monthlyParams,
} from './assets';
import type { AssetClass } from './assets';
import {
  CLIMATE_ASSET_META,
  getClimateScenario,
  type ClimateConfig,
} from './climate';

export type SimMode = 'gbm' | 'bootstrap';
export type RebalanceStrategy = 'annual' | 'buyhold';
export type AccountType = 'taxable' | 'roth_ira' | 'tax_deferred';

export interface LifeEvent {
  id: string;
  year: number;
  amount: number;
  label: string;
}

export interface SimConfig {
  initialBalance: number;
  monthlyContribution: number;
  years: number;
  allocations: Record<string, number>;
  mode: SimMode;
  crisisShockKey?: string;
  inflationRate: number;
  adjustForInflation: boolean;
  rebalance: RebalanceStrategy;
  lifeEvents: LifeEvent[];
  numSims: number;
  isRetirementPhase: boolean;
  initialAnnualWithdrawal: number;
  retirementStartYear: number;
  accountType: AccountType;
  volatilityClustering: boolean;
  showBenchmark: boolean;
  climate: ClimateConfig;
}

export interface SimResult {
  median: number[];
  p10: number[];
  p25: number[];
  p75: number[];
  p90: number[];
  finalValues: number[];
  medianFinal: number;
  p10Final: number;
  p90Final: number;
  probLoss: number;
  probMillion: number;
  maxDrawdownMedian: number;
  totalContributions: number;
  totalWithdrawals: number;
  growth: number;
  probDepletion: number;
  medianDepletionMonth: number;
  histogram: { x0: number; x1: number; count: number }[];
  benchmarkMedian: number[];
  depletionMonths: number[];
  climateVaR95: number;
  climateVaR99: number;
  tippingPointHitRate: number;
  assetStressImpact: Record<string, number>;
}

interface AssetParams {
  id: string;
  weight: number;
  monthlyMu: number;
  monthlySigma: number;
  annualReturn: number;
  annualVol: number;
  classification: 'green' | 'brown' | 'neutral';
  physicalRiskExposure: number;
  transitionRiskExposure: number;
}

function buildParams(allocations: Record<string, number>): AssetParams[] {
  const total = Object.values(allocations).reduce((a, b) => a + b, 0) || 1;
  return ASSET_CLASSES.filter((a) => (allocations[a.id] ?? 0) > 0).map((a) => {
    const { monthlyMu, monthlySigma } = monthlyParams(a.annualReturn, a.annualVol);
    const meta = CLIMATE_ASSET_META[a.id];
    return {
      id: a.id,
      weight: (allocations[a.id] ?? 0) / total,
      monthlyMu,
      monthlySigma,
      annualReturn: a.annualReturn,
      annualVol: a.annualVol,
      classification: meta?.classification ?? 'neutral',
      physicalRiskExposure: meta?.physicalRiskExposure ?? 0,
      transitionRiskExposure: meta?.transitionRiskExposure ?? 0,
    };
  });
}

function buildBenchmarkParams(): AssetParams[] {
  const bench = { sp500: 60, bonds: 40 };
  return buildParams(bench);
}

const BOOTSTRAP_BETA: Record<string, number> = {
  sp500: 1.0,
  tech: 1.5,
  value: 0.8,
  intl: 1.1,
  bonds: -0.2,
  commodities: 0.3,
  cash: 0.02,
  green_energy: 1.3,
  green_bonds: -0.15,
  fossil_fuel: 1.2,
  infra: 0.9,
  agri: 0.7,
  healthcare: 0.6,
};

const TAX_DRAG_ANNUAL = 0.0045;
const TAX_DRAG_MONTHLY = TAX_DRAG_ANNUAL / 12;

const CLUSTER_DD_THRESHOLD = 0.08;
const CLUSTER_VOL_MULT = 1.6;
const CLUSTER_DECAY = 0.92;

export const DEFAULT_SIM_CONFIG: SimConfig = {
  initialBalance: 100_000,
  monthlyContribution: 500,
  years: 25,
  allocations: {},
  mode: 'gbm',
  crisisShockKey: 'full',
  inflationRate: 0.03,
  adjustForInflation: true,
  rebalance: 'annual',
  lifeEvents: [],
  numSims: 10_000,
  isRetirementPhase: false,
  initialAnnualWithdrawal: 40_000,
  retirementStartYear: 0,
  accountType: 'taxable',
  volatilityClustering: false,
  showBenchmark: false,
  climate: {
    scenario: 'orderly',
    carbonTaxOnsetYear: 5,
    enableClimateRisk: false,
    physicalRiskIntensity: 1.0,
    tippingPointProb: 0,
  },
};

export function runSimulation(config: SimConfig): SimResult {
  const months = config.years * 12;
  const params = buildParams(config.allocations);
  const benchParams = buildBenchmarkParams();
  const shocks = HISTORICAL_SHOCKS[config.crisisShockKey ?? 'full'] ?? HISTORICAL_SHOCKS.full;
  const inflationMonthly = config.adjustForInflation
    ? (1 + config.inflationRate) ** (1 / 12) - 1
    : 0;
  const rawInflationMonthly = (1 + config.inflationRate) ** (1 / 12) - 1;

  const eventsByMonth = new Map<number, number>();
  for (const ev of config.lifeEvents) {
    const m = ev.year * 12;
    eventsByMonth.set(m, (eventsByMonth.get(m) ?? 0) + ev.amount);
  }

  const retirementStartMonth = config.isRetirementPhase
    ? config.retirementStartYear * 12
    : Infinity;
  const monthlyWithdrawalBase = config.isRetirementPhase
    ? config.initialAnnualWithdrawal / 12
    : 0;

  const totalSteps = months + 1;
  const allPaths = new Float64Array(config.numSims * totalSteps);
  const finalValues: number[] = new Array(config.numSims);
  const depletionMonths: number[] = new Array(config.numSims).fill(-1);

  let tippingPointHits = 0;
  const climateShockImpacts: number[] = new Array(config.numSims).fill(0);

  const benchPaths = config.showBenchmark
    ? new Float64Array(config.numSims * totalSteps)
    : null;

  const isBuyHold = config.rebalance === 'buyhold';
  const rebalEvery = 12;
  const applyTaxDrag = config.accountType === 'taxable';
  const useClustering = config.volatilityClustering;

  const climateEnabled = config.climate.enableClimateRisk;
  const scenario = climateEnabled ? getClimateScenario(config.climate.scenario) : null;
  const carbonTaxMonth = climateEnabled ? config.climate.carbonTaxOnsetYear * 12 : Infinity;
  const physicalMultiplier = climateEnabled
    ? scenario!.physicalShockMultiplier * config.climate.physicalRiskIntensity
    : 0;
  const monthlyPhysicalShockProb = physicalMultiplier * 0.01;
  const tippingProbMonthly = climateEnabled
    ? 1 - Math.pow(1 - (config.climate.tippingPointProb || scenario!.tippingPointProb), 1 / 12)
    : 0;
  const tippingVolIncrease = scenario?.tippingVolIncrease ?? 0;
  const tippingDriftReductionMonthly = (scenario?.tippingDriftReduction ?? 0) / 12;
  const carbonTaxSeverityMonthly = climateEnabled
    ? scenario!.carbonTaxSeverity / 12
    : 0;
  const greenDriftBoostMonthly = climateEnabled
    ? scenario!.greenDriftBoost / 12
    : 0;

  for (let s = 0; s < config.numSims; s++) {
    const base = s * totalSteps;
    const assetBal = new Float64Array(params.length);
    const benchBal = new Float64Array(benchParams.length);
    let balance = config.initialBalance;
    let benchBalance = config.initialBalance;
    let peakBalance = balance;
    let volMult = 1;
    let climateVolMult = 1;
    let climateDriftAdj = 0;
    let tippingCrossed = false;
    let climateShockTotal = 0;

    if (params.length === 0) {
      assetBal[0] = balance;
    } else {
      for (let i = 0; i < params.length; i++) assetBal[i] = balance * params[i].weight;
    }
    for (let i = 0; i < benchParams.length; i++) benchBal[i] = benchBalance * benchParams[i].weight;

    allPaths[base] = balance;
    if (benchPaths) benchPaths[base] = benchBalance;

    for (let m = 1; m <= months; m++) {
      if (useClustering && peakBalance > 0) {
        const dd = (peakBalance - balance) / peakBalance;
        if (dd > CLUSTER_DD_THRESHOLD) {
          volMult = Math.max(volMult, CLUSTER_VOL_MULT);
        }
        volMult = 1 + (volMult - 1) * CLUSTER_DECAY;
      }

      if (climateEnabled && !tippingCrossed && tippingProbMonthly > 0) {
        if (Math.random() < tippingProbMonthly) {
          tippingCrossed = true;
          climateVolMult = 1 + tippingVolIncrease;
          climateDriftAdj = -tippingDriftReductionMonthly;
          tippingPointHits++;
        }
      }

      const combinedVolMult = volMult * climateVolMult;
      const carbonTaxActiveNow = climateEnabled && m >= carbonTaxMonth;

      let newBalance = 0;
      if (config.mode === 'gbm') {
        for (let i = 0; i < params.length; i++) {
          const p = params[i];
          let mu = p.monthlyMu + climateDriftAdj;
          let sigma = p.monthlySigma * combinedVolMult;

          if (carbonTaxActiveNow) {
            if (p.classification === 'brown') {
              mu -= p.transitionRiskExposure * carbonTaxSeverityMonthly;
            } else if (p.classification === 'green') {
              mu += greenDriftBoostMonthly;
            }
          }

          assetBal[i] = assetBal[i] * (1 + (mu + sigma * randNormal()));
          newBalance += assetBal[i];
        }
      } else {
        const shock = sampleUniform(shocks);
        for (let i = 0; i < params.length; i++) {
          const p = params[i];
          const beta = BOOTSTRAP_BETA[p.id] ?? 1;
          let r = shock * beta + randNormal() * 0.01 * combinedVolMult;
          if (carbonTaxActiveNow) {
            if (p.classification === 'brown') {
              r -= p.transitionRiskExposure * carbonTaxSeverityMonthly;
            } else if (p.classification === 'green') {
              r += greenDriftBoostMonthly;
            }
          }
          assetBal[i] = assetBal[i] * (1 + r);
          newBalance += assetBal[i];
        }
      }
      balance = newBalance;

      if (climateEnabled && balance > 0 && monthlyPhysicalShockProb > 0) {
        for (let i = 0; i < params.length; i++) {
          const p = params[i];
          if (p.physicalRiskExposure > 0 && Math.random() < monthlyPhysicalShockProb * p.physicalRiskExposure) {
            const jumpSeverity = -0.10 - Math.random() * 0.20;
            const jumpLoss = assetBal[i] * jumpSeverity;
            assetBal[i] += jumpLoss;
            balance += jumpLoss;
            climateShockTotal += jumpLoss;
          }
        }
      }

      if (applyTaxDrag && balance > 0) {
        balance -= balance * TAX_DRAG_MONTHLY;
        if (params.length > 0) {
          for (let i = 0; i < params.length; i++) {
            assetBal[i] = assetBal[i] * (1 - TAX_DRAG_MONTHLY);
          }
        }
      }

      const contrib = config.monthlyContribution;
      const ev = eventsByMonth.get(m);
      const inject = contrib + (ev ?? 0);
      if (inject !== 0 && params.length > 0) {
        for (let i = 0; i < params.length; i++) assetBal[i] += inject * params[i].weight;
        balance += inject;
      }

      if (config.isRetirementPhase && m >= retirementStartMonth && balance > 0) {
        const inflationFactor = Math.pow(1 + rawInflationMonthly, m - retirementStartMonth);
        const withdrawal = monthlyWithdrawalBase * inflationFactor;
        balance -= withdrawal;
        if (params.length > 0) {
          const ratio = balance > 0 ? balance / (balance + withdrawal) : 0;
          for (let i = 0; i < params.length; i++) assetBal[i] = assetBal[i] * ratio;
        }
      }

      if (balance <= 0 && depletionMonths[s] === -1) {
        depletionMonths[s] = m;
        balance = 0;
        assetBal.fill(0);
      }

      if (!isBuyHold && m % rebalEvery === 0 && params.length > 0 && balance > 0) {
        for (let i = 0; i < params.length; i++) assetBal[i] = balance * params[i].weight;
      }

      if (balance > peakBalance) peakBalance = balance;

      if (benchPaths) {
        let newBench = 0;
        if (config.mode === 'gbm') {
          for (let i = 0; i < benchParams.length; i++) {
            const p = benchParams[i];
            benchBal[i] = benchBal[i] * (1 + (p.monthlyMu + p.monthlySigma * randNormal()));
            newBench += benchBal[i];
          }
        } else {
          const bshock = sampleUniform(shocks);
          for (let i = 0; i < benchParams.length; i++) {
            const p = benchParams[i];
            const beta = BOOTSTRAP_BETA[p.id] ?? 1;
            benchBal[i] = benchBal[i] * (1 + bshock * beta + randNormal() * 0.01);
            newBench += benchBal[i];
          }
        }
        benchBalance = newBench + contrib;
        if (config.isRetirementPhase && m >= retirementStartMonth && benchBalance > 0) {
          const inflationFactor = Math.pow(1 + rawInflationMonthly, m - retirementStartMonth);
          benchBalance -= monthlyWithdrawalBase * inflationFactor;
        }
        if (benchBalance < 0) benchBalance = 0;
        if (!isBuyHold && m % rebalEvery === 0 && benchBalance > 0) {
          for (let i = 0; i < benchParams.length; i++)
            benchBal[i] = benchBalance * benchParams[i].weight;
        }
        benchPaths[base + m] = benchBalance;
      }

      const real = inflationMonthly ? balance / Math.pow(1 + inflationMonthly, m) : balance;
      allPaths[base + m] = real;
    }
    finalValues[s] = allPaths[base + months];
    climateShockImpacts[s] = climateShockTotal;
  }

  const median = new Array<number>(totalSteps);
  const p10 = new Array<number>(totalSteps);
  const p25 = new Array<number>(totalSteps);
  const p75 = new Array<number>(totalSteps);
  const p90 = new Array<number>(totalSteps);
  const colBuf = new Float64Array(config.numSims);
  for (let m = 0; m < totalSteps; m++) {
    for (let s = 0; s < config.numSims; s++) colBuf[s] = allPaths[s * totalSteps + m];
    colBuf.sort();
    median[m] = percentileSorted(colBuf, 50);
    p10[m] = percentileSorted(colBuf, 10);
    p25[m] = percentileSorted(colBuf, 25);
    p75[m] = percentileSorted(colBuf, 75);
    p90[m] = percentileSorted(colBuf, 90);
  }

  let benchmarkMedian: number[] = [];
  if (benchPaths) {
    benchmarkMedian = new Array<number>(totalSteps);
    const bBuf = new Float64Array(config.numSims);
    for (let m = 0; m < totalSteps; m++) {
      for (let s = 0; s < config.numSims; s++) bBuf[s] = benchPaths[s * totalSteps + m];
      bBuf.sort();
      benchmarkMedian[m] = percentileSorted(bBuf, 50);
    }
  }

  const sortedFinal = Float64Array.from(finalValues).sort();
  const medianFinal = percentileSorted(sortedFinal, 50);
  const p10Final = percentileSorted(sortedFinal, 10);
  const p90Final = percentileSorted(sortedFinal, 90);
  let lossCount = 0;
  let millionCount = 0;
  const totalContributions =
    config.initialBalance + config.monthlyContribution * months +
    config.lifeEvents.reduce((a, b) => a + b.amount, 0);

  let totalWithdrawals = 0;
  if (config.isRetirementPhase) {
    const withdrawalMonths = Math.max(0, months - retirementStartMonth);
    totalWithdrawals = monthlyWithdrawalBase * withdrawalMonths;
  }

  for (const v of finalValues) {
    if (v < config.initialBalance) lossCount++;
    if (v >= 1_000_000) millionCount++;
  }
  const probLoss = lossCount / config.numSims;
  const probMillion = millionCount / config.numSims;

  const depleted = depletionMonths.filter((m) => m !== -1);
  const probDepletion = depleted.length / config.numSims;
  const medianDepletionMonth = depleted.length > 0
    ? depleted.sort((a, b) => a - b)[Math.floor(depleted.length / 2)]
    : -1;

  let peak = median[0] ?? 0;
  let maxDD = 0;
  for (const v of median) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }

  const hist = buildHistogram(finalValues, 50);

  const sortedClimate = Float64Array.from(climateShockImpacts).sort();
  const climateVaR95 = percentileSorted(sortedClimate, 5);
  const climateVaR99 = percentileSorted(sortedClimate, 1);

  const assetStressImpact: Record<string, number> = {};
  if (climateEnabled) {
    for (const p of params) {
      const transitionImpact = carbonTaxActive(carbonTaxMonth, months)
        ? p.transitionRiskExposure * (scenario?.carbonTaxSeverity ?? 0) * (config.years - config.climate.carbonTaxOnsetYear)
        : 0;
      const physicalImpact = p.physicalRiskExposure * physicalMultiplier * 0.05 * config.years;
      assetStressImpact[p.id] = -(transitionImpact + physicalImpact);
    }
  }

  return {
    median,
    p10,
    p25,
    p75,
    p90,
    finalValues,
    medianFinal,
    p10Final,
    p90Final,
    probLoss,
    probMillion,
    maxDrawdownMedian: maxDD,
    totalContributions,
    totalWithdrawals,
    growth: medianFinal - totalContributions + totalWithdrawals,
    probDepletion,
    medianDepletionMonth,
    histogram: hist,
    benchmarkMedian,
    depletionMonths,
    climateVaR95,
    climateVaR99,
    tippingPointHitRate: tippingPointHits / config.numSims,
    assetStressImpact,
  };
}

function carbonTaxActive(onsetMonth: number, currentMonth: number): boolean {
  return currentMonth >= onsetMonth;
}

function percentileSorted(sorted: ArrayLike<number>, p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const frac = idx - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

function buildHistogram(values: number[], binCount: number) {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (min === max) return [{ x0: min, x1: min + 1, count: values.length }];
  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count: 0,
  }));
  for (const v of values) {
    let idx = Math.floor((v - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  return bins;
}

export { ASSET_CLASSES };
export type { AssetClass };
