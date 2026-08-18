// Scenario Challenge Game definitions and engine.
// Each scenario is a scripted multi-year market path with in-flight events
// that prompt the player to make allocation decisions.

export type DecisionChoice = 'stay' | 'panic' | 'buydip';

export interface GameEvent {
  month: number;
  headline: string;
  body: string;
  shock: number;
  driftMonths?: number;
  driftAdjust?: number;
}

export interface Scenario {
  id: string;
  name: string;
  tagline: string;
  description: string;
  years: number;
  initialBalance: number;
  monthlyContribution: number;
  inflationRate: number;
  baseDrift: number;
  baseVol: number;
  events: GameEvent[];
  icon: string;
}

export const SCENARIOS: Scenario[] = [
  {
    id: 'gfc-2008',
    name: 'Survive the 2008 Financial Crisis',
    tagline: 'Lehman falls. Credit freezes. Do you hold, flee, or buy?',
    description:
      'Start in 2006 with a diversified portfolio. The subprime crisis erupts, markets plunge, and you face gut-wrenching decisions as the world economy buckles.',
    years: 6,
    initialBalance: 250_000,
    monthlyContribution: 1500,
    inflationRate: 0.025,
    baseDrift: 0.006,
    baseVol: 0.035,
    icon: 'TrendingDown',
    events: [
      {
        month: 18,
        headline: 'Subprime mortgages wobble',
        body: 'Two Bear Stearns hedge funds collapse as subprime bonds implode. Analysts say contagion is "contained."',
        shock: -0.03,
      },
      {
        month: 30,
        headline: 'Lehman Brothers collapses',
        body: 'The 158-year-old investment bank files the largest bankruptcy in US history. Global credit markets freeze overnight. The S&P 500 enters freefall.',
        shock: -0.09,
        driftMonths: 9,
        driftAdjust: -0.02,
      },
      {
        month: 42,
        headline: 'Capitulation & ray of hope',
        body: 'Markets have halved. Fear is everywhere — but the Fed has slashed rates to zero and launched QE. Is this the bottom?',
        shock: -0.05,
        driftMonths: 12,
        driftAdjust: 0.025,
      },
    ],
  },
  {
    id: 'covid-2020',
    name: 'COVID Flash Crash & Recovery',
    tagline: 'The fastest bear in history. The fastest bull too.',
    description:
      'Late 2019: markets grind higher. Then a novel virus halts the global economy in weeks. A record plunge is followed by a staggering V-shaped recovery.',
    years: 4,
    initialBalance: 200_000,
    monthlyContribution: 2000,
    inflationRate: 0.02,
    baseDrift: 0.008,
    baseVol: 0.03,
    icon: 'Zap',
    events: [
      {
        month: 12,
        headline: 'Mystery pneumonia in Wuhan',
        body: 'A cluster of viral pneumonia cases appears. Most investors shrug it off as a localized issue.',
        shock: -0.01,
      },
      {
        month: 16,
        headline: 'Global pandemic declared',
        body: 'WHO declares a pandemic. Borders close, cities lock down, oil crashes. The S&P 500 drops ~34% in 33 days — the fastest bear market ever.',
        shock: -0.12,
        driftMonths: 3,
        driftAdjust: -0.01,
      },
      {
        month: 22,
        headline: 'Unprecedented stimulus',
        body: 'The Fed slashes rates to zero and buys bonds. Congress passes trillions in stimulus. Tech surges as the world moves online. The recovery is explosive.',
        shock: 0.05,
        driftMonths: 18,
        driftAdjust: 0.03,
      },
    ],
  },
  {
    id: 'dotcom-2000',
    name: 'Dot-Com Boom to Bust',
    tagline: 'Pets.com or Amazon? The bubble finds out.',
    description:
      'It is 1998. Internet stocks are moonbound, day-traders are quitting their jobs, and "new economy" gurus say valuation no longer matters. Then gravity returns.',
    years: 6,
    initialBalance: 180_000,
    monthlyContribution: 1200,
    inflationRate: 0.025,
    baseDrift: 0.01,
    baseVol: 0.045,
    icon: 'Rocket',
    events: [
      {
        month: 14,
        headline: 'Irrational exuberance 2.0',
        body: 'IPOs double on day one. Companies with no revenue hit billion-dollar valuations. Your tech allocation is on fire — on the way up.',
        shock: 0.08,
        driftMonths: 12,
        driftAdjust: 0.02,
      },
      {
        month: 28,
        headline: 'The bubble bursts',
        body: 'The NASDAQ peaks and rolls over. Pets.com liquidates. Telecoms implode. Over three years, the index loses 78% of its value.',
        shock: -0.1,
        driftMonths: 24,
        driftAdjust: -0.025,
      },
      {
        month: 56,
        headline: 'Slow rebirth',
        body: 'The survivors (Amazon, Google) begin their climb. Markets start to heal, but investors who bought the top are still deep underwater.',
        shock: 0.02,
        driftMonths: 12,
        driftAdjust: 0.015,
      },
    ],
  },
  {
    id: 'ai-boom',
    name: 'AI Boom vs. Bubble Burst',
    tagline: 'Hypothetical: the AI supercycle — and what comes after.',
    description:
      'A speculative scenario set in the near future. Generative AI sends tech stocks parabolic, productivity booms, then valuations stretch to extremes. Will you ride it or fear the pop?',
    years: 5,
    initialBalance: 220_000,
    monthlyContribution: 1800,
    inflationRate: 0.03,
    baseDrift: 0.009,
    baseVol: 0.04,
    icon: 'BrainCircuit',
    events: [
      {
        month: 10,
        headline: 'AI mania accelerates',
        body: 'Chipmakers and model labs report blowout earnings. The AI index doubles in a year. Commentators declare a new productivity revolution.',
        shock: 0.07,
        driftMonths: 14,
        driftAdjust: 0.025,
      },
      {
        month: 36,
        headline: 'Valuation anxiety',
        body: 'Forward PE ratios hit record highs. A major lab misses revenue. Shorts pile in. Is this the top of the AI bubble, or just a pause?',
        shock: -0.08,
        driftMonths: 8,
        driftAdjust: -0.015,
      },
      {
        month: 52,
        headline: 'Resolution',
        body: 'Earnings catch up to hype (or they do not). The market settles into its next leg — up sharply, or grinding lower.',
        shock: 0.03,
        driftMonths: 8,
        driftAdjust: 0.012,
      },
    ],
  },
];

export function applyDecision(
  allocations: Record<string, number>,
  choice: DecisionChoice
): Record<string, number> {
  const next = { ...allocations };
  const total = Object.values(next).reduce((a, b) => a + b, 0) || 100;
  if (total !== 100) {
    for (const k of Object.keys(next)) next[k] = (next[k] / total) * 100;
  }
  if (choice === 'stay') return next;

  const stockIds = ['sp500', 'tech', 'value', 'intl'];
  const stockSum = stockIds.reduce((a, k) => a + (next[k] ?? 0), 0);

  if (choice === 'panic') {
    const move = stockSum * 0.75;
    for (const k of stockIds) {
      if (next[k]) next[k] = next[k]! * 0.25;
    }
    next.cash = (next.cash ?? 0) + move;
  } else if (choice === 'buydip') {
    const safeToMove = ((next.cash ?? 0) + (next.bonds ?? 0)) * 0.6;
    next.cash = (next.cash ?? 0) * 0.4;
    next.bonds = (next.bonds ?? 0) * 0.4;
    if (stockSum > 0) {
      for (const k of stockIds) {
        if (next[k]) next[k] = next[k]! + safeToMove * (next[k]! / stockSum);
      }
    } else {
      next.sp500 = (next.sp500 ?? 0) + safeToMove;
    }
  }
  const t = Object.values(next).reduce((a, b) => a + b, 0) || 100;
  for (const k of Object.keys(next)) next[k] = (next[k] / t) * 100;
  return next;
}

export interface GameScore {
  finalWealth: number;
  inflationAdjustedWealth: number;
  totalContributions: number;
  cagr: number;
  sharpe: number;
  resilience: number;
  badge: string;
  badgeDescription: string;
  decisions: number;
}

export function computeGameScore(
  wealthPath: number[],
  monthlyReturns: number[],
  scenario: Scenario,
  decisions: number,
  panicCount: number,
  stayCount: number,
  buyDipCount: number
): GameScore {
  const finalWealth = wealthPath[wealthPath.length - 1] ?? 0;
  const totalContributions =
    scenario.initialBalance + scenario.monthlyContribution * (scenario.years * 12);
  const inflationAdj =
    finalWealth / Math.pow(1 + scenario.inflationRate, scenario.years);

  const years = scenario.years;
  const cagr =
    scenario.initialBalance > 0 && years > 0
      ? (finalWealth / scenario.initialBalance) ** (1 / years) - 1
      : 0;

  const meanR =
    monthlyReturns.reduce((a, b) => a + b, 0) / (monthlyReturns.length || 1);
  const variance =
    monthlyReturns.reduce((a, b) => a + (b - meanR) ** 2, 0) /
    (monthlyReturns.length || 1);
  const sd = Math.sqrt(variance);
  const sharpe = sd > 0 ? (meanR * 12 - 0.02) / (sd * Math.sqrt(12)) : 0;

  const growthScore = Math.max(0, Math.min(50, ((finalWealth / totalContributions) - 1) * 50));
  let peak = wealthPath[0] ?? 0;
  let maxDD = 0;
  for (const v of wealthPath) {
    if (v > peak) peak = v;
    const dd = peak > 0 ? (peak - v) / peak : 0;
    if (dd > maxDD) maxDD = dd;
  }
  const ddScore = Math.max(0, 25 - maxDD * 50);
  const decisionScore = Math.max(0, Math.min(25, buyDipCount * 8 + stayCount * 5 - panicCount * 10));
  const resilience = Math.round(Math.max(0, Math.min(100, growthScore + ddScore + decisionScore)));

  let badge = 'Steady Hand';
  let badgeDescription = 'You kept your composure and stuck to your plan.';
  if (panicCount >= 2 && buyDipCount === 0) {
    badge = 'Panic Seller';
    badgeDescription = 'You fled for the exits every time. Safety has a price.';
  } else if (buyDipCount >= 2 && panicCount === 0) {
    badge = 'Diamond Hands';
    badgeDescription = 'You bought every dip and never flinched. Legendary nerve.';
  } else if (buyDipCount >= 1 && stayCount >= 1) {
    badge = 'Tactical Rebalancer';
    badgeDescription = 'A balanced blend of conviction and opportunism.';
  } else if (stayCount === decisions && decisions > 0) {
    badge = 'Iron Stomach';
    badgeDescription = 'You never blinked, not even once.';
  }

  return {
    finalWealth,
    inflationAdjustedWealth: inflationAdj,
    totalContributions,
    cagr,
    sharpe,
    resilience,
    badge,
    badgeDescription,
    decisions,
  };
}
