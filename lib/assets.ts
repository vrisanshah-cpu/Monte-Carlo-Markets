// Asset class model: expected returns, volatility, and historical monthly shocks.
// Annual return/vol figures are long-run real-world estimates.
// Historical monthly shock datasets are synthesized from well-known market episodes
// so the bootstrap mode reflects realistic crisis behavior.

export interface AssetClass {
  id: string;
  name: string;
  shortName: string;
  // Expected annual return (geometric, nominal)
  annualReturn: number;
  // Annual volatility (std dev of returns)
  annualVol: number;
  // Color for charts
  color: string;
  description: string;
}

export const ASSET_CLASSES: AssetClass[] = [
  {
    id: 'sp500',
    name: 'US Equities (S&P 500)',
    shortName: 'US Equity',
    annualReturn: 0.10,
    annualVol: 0.16,
    color: '#34d399',
    description: 'Large-cap US stocks. Long-run ~10% annual return with moderate volatility.',
  },
  {
    id: 'tech',
    name: 'Tech / Growth Stocks',
    shortName: 'Tech',
    annualReturn: 0.13,
    annualVol: 0.26,
    color: '#22d3ee',
    description: 'High-growth technology shares. Higher expected return, much higher volatility.',
  },
  {
    id: 'value',
    name: 'Dividend / Value Stocks',
    shortName: 'Value',
    annualReturn: 0.095,
    annualVol: 0.14,
    color: '#a3e635',
    description: 'Established dividend-paying companies. Lower volatility, steady income.',
  },
  {
    id: 'intl',
    name: 'International Equities',
    shortName: 'Intl',
    annualReturn: 0.085,
    annualVol: 0.18,
    color: '#60a5fa',
    description: 'Developed & emerging markets outside the US. Adds geographic diversification.',
  },
  {
    id: 'bonds',
    name: 'Government Bonds',
    shortName: 'Bonds',
    annualReturn: 0.04,
    annualVol: 0.06,
    color: '#fbbf24',
    description: 'US Treasury & high-grade bonds. Low return, low volatility, crisis hedge.',
  },
  {
    id: 'commodities',
    name: 'Commodities / Gold',
    shortName: 'Gold',
    annualReturn: 0.06,
    annualVol: 0.15,
    color: '#f59e0b',
    description: 'Gold and broad commodities. Inflation hedge, uncorrelated with stocks.',
  },
  {
    id: 'cash',
    name: 'Cash / HYSA',
    shortName: 'Cash',
    annualReturn: 0.035,
    annualVol: 0.005,
    color: '#cbd5e1',
    description: 'High-yield savings / money market. Near-zero risk, modest yield.',
  },
  // --- Climate-classified asset classes ---
  {
    id: 'green_energy',
    name: 'Clean Energy ETFs',
    shortName: 'Clean Energy',
    annualReturn: 0.14,
    annualVol: 0.32,
    color: '#22c55e',
    description: 'Solar, wind, EV, and battery companies. High growth potential, high volatility. Benefits from climate transition policy.',
  },
  {
    id: 'green_bonds',
    name: 'Green Bonds',
    shortName: 'Green Bonds',
    annualReturn: 0.045,
    annualVol: 0.05,
    color: '#16a34a',
    description: 'Bonds funding environmentally beneficial projects. Low risk, slight greenium. Stable income with climate co-benefits.',
  },
  {
    id: 'fossil_fuel',
    name: 'Fossil Fuel Energy',
    shortName: 'Fossil Fuel',
    annualReturn: 0.08,
    annualVol: 0.3,
    color: '#dc2626',
    description: 'Oil, gas, and coal companies. High current yield but faces severe transition risk from carbon pricing and divestment.',
  },
  {
    id: 'infra',
    name: 'Infrastructure',
    shortName: 'Infrastructure',
    annualReturn: 0.07,
    annualVol: 0.12,
    color: '#fb923c',
    description: 'Traditional infrastructure (ports, roads, utilities). High physical risk from sea-level rise and extreme weather.',
  },
  {
    id: 'agri',
    name: 'Agriculture & Land',
    shortName: 'Agriculture',
    annualReturn: 0.06,
    annualVol: 0.22,
    color: '#eab308',
    description: 'Farmland, agribusiness, and timber. Highly exposed to drought, heat stress, and changing growing seasons.',
  },
  {
    id: 'healthcare',
    name: 'Healthcare',
    shortName: 'Healthcare',
    annualReturn: 0.1,
    annualVol: 0.15,
    color: '#06b6d4',
    description: 'Pharma, biotech, and medical devices. Low climate risk, defensive in downturns, benefits from climate-related health impacts.',
  },
];

export const DEFAULT_ALLOCATIONS: Record<string, number> = {
  sp500: 35,
  tech: 12,
  value: 8,
  intl: 10,
  bonds: 12,
  commodities: 3,
  cash: 5,
  green_energy: 5,
  green_bonds: 5,
  healthcare: 5,
  fossil_fuel: 0,
  infra: 0,
  agri: 0,
};

// Convert annual return/vol to monthly log-return parameters for GBM.
export function monthlyParams(annualReturn: number, annualVol: number) {
  return {
    monthlyMu: (annualReturn - 0.5 * annualVol ** 2) / 12,
    monthlySigma: annualVol / Math.sqrt(12),
  };
}

// Historical monthly return shock datasets for bootstrap mode.
export const HISTORICAL_SHOCKS: Record<string, number[]> = {
  full: generateGeneralSeries(),
  depression: generateDepressionSeries(),
  stagflation: generateStagflationSeries(),
  dotcom: generateDotComSeries(),
  gfc: generateGFCSeries(),
  covid: generateCovidSeries(),
};

function generateGeneralSeries(): number[] {
  const out: number[] = [];
  const rng = mulberry32(42);
  for (let i = 0; i < 600; i++) {
    const shock = (rng() * 2 - 1) * 0.06 + 0.006;
    out.push(round(shock));
  }
  for (let i = 0; i < 20; i++) out.push(-0.08 - rng() * 0.06);
  for (let i = 0; i < 20; i++) out.push(0.08 + rng() * 0.05);
  return out;
}

function generateDepressionSeries(): number[] {
  const rng = mulberry32(1929);
  const out: number[] = [];
  for (let i = 0; i < 18; i++) out.push(round(-0.04 - rng() * 0.1));
  for (let i = 0; i < 12; i++) out.push(round(-0.02 + rng() * 0.08));
  for (let i = 0; i < 60; i++) out.push(round(0.005 + (rng() * 2 - 1) * 0.07));
  return out;
}

function generateStagflationSeries(): number[] {
  const rng = mulberry32(1973);
  const out: number[] = [];
  for (let i = 0; i < 120; i++) {
    const inflationDrag = -0.01;
    out.push(round(inflationDrag + 0.004 + (rng() * 2 - 1) * 0.055));
  }
  for (let i = 0; i < 8; i++) out.push(round(-0.03 - rng() * 0.06));
  for (let i = 0; i < 6; i++) out.push(round(-0.025 - rng() * 0.04));
  return out;
}

function generateDotComSeries(): number[] {
  const rng = mulberry32(2000);
  const out: number[] = [];
  for (let i = 0; i < 30; i++) out.push(round(0.02 + rng() * 0.05));
  for (let i = 0; i < 24; i++) out.push(round(-0.03 - rng() * 0.07));
  for (let i = 0; i < 36; i++) out.push(round(0.006 + (rng() * 2 - 1) * 0.05));
  return out;
}

function generateGFCSeries(): number[] {
  const rng = mulberry32(2008);
  const out: number[] = [];
  for (let i = 0; i < 24; i++) out.push(round(0.005 + (rng() * 2 - 1) * 0.03));
  for (let i = 0; i < 12; i++) out.push(round(-0.05 - rng() * 0.08));
  for (let i = 0; i < 36; i++) out.push(round(0.015 + (rng() * 2 - 1) * 0.07));
  return out;
}

function generateCovidSeries(): number[] {
  const rng = mulberry32(2020);
  const out: number[] = [];
  for (let i = 0; i < 26; i++) out.push(round(0.01 + (rng() * 2 - 1) * 0.03));
  for (let i = 0; i < 4; i++) out.push(round(-0.06 - rng() * 0.08));
  for (let i = 0; i < 30; i++) out.push(round(0.02 + rng() * 0.05));
  return out;
}

// Deterministic PRNG so historical datasets are stable across reloads
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function round(v: number): number {
  return Math.round(v * 1e6) / 1e6;
}

export interface CrisisEra {
  id: string;
  name: string;
  year: string;
  description: string;
  shockKey: string;
}

export const CRISIS_ERAS: CrisisEra[] = [
  {
    id: 'depression',
    name: 'Great Depression',
    year: '1929',
    description: 'The worst stock collapse in US history. Equities lost ~89% peak-to-trough.',
    shockKey: 'depression',
  },
  {
    id: 'stagflation',
    name: "1970s Stagflation",
    year: '1973-1980',
    description: 'Oil shocks, soaring inflation, and sluggish growth hammered real returns.',
    shockKey: 'stagflation',
  },
  {
    id: 'dotcom',
    name: 'Dot-Com Bust',
    year: '2000-2002',
    description: 'The tech bubble burst, erasing years of gains in growth stocks.',
    shockKey: 'dotcom',
  },
  {
    id: 'gfc',
    name: 'Global Financial Crisis',
    year: '2008',
    description: 'Lehman collapse and a housing-driven credit crisis crushed global markets.',
    shockKey: 'gfc',
  },
  {
    id: 'covid',
    name: 'COVID Flash Crash',
    year: '2020',
    description: 'A record-fast bear market followed by an unprecedented V-shaped recovery.',
    shockKey: 'covid',
  },
];

export interface PresetPortfolio {
  id: string;
  name: string;
  description: string;
  allocations: Record<string, number>;
}

export const PRESET_PORTFOLIOS: PresetPortfolio[] = [
  {
    id: 'balanced',
    name: 'Balanced 60/40',
    description: 'Classic diversified mix. 60% stocks, 40% bonds & cash.',
    allocations: { sp500: 35, tech: 10, value: 10, intl: 5, bonds: 30, commodities: 5, cash: 5 },
  },
  {
    id: 'aggressive',
    name: 'Aggressive Growth',
    description: 'High equity tilt for long horizons and strong nerves.',
    allocations: { sp500: 35, tech: 30, value: 10, intl: 15, bonds: 5, commodities: 3, cash: 2 },
  },
  {
    id: 'conservative',
    name: 'Conservative Income',
    description: 'Capital preservation with steady income.',
    allocations: { sp500: 15, tech: 5, value: 15, intl: 5, bonds: 40, commodities: 10, cash: 10 },
  },
  {
    id: 'fire',
    name: 'FIRE Portfolio',
    description: '4% rule-ready: growth-focused for long retirements.',
    allocations: { sp500: 45, tech: 10, value: 10, intl: 15, bonds: 15, commodities: 3, cash: 2 },
  },
  {
    id: 'allweather',
    name: 'All-Weather (Dalio-style)',
    description: 'Risk parity across growth and inflation regimes.',
    allocations: { sp500: 20, tech: 5, value: 5, intl: 10, bonds: 40, commodities: 15, cash: 5 },
  },
  {
    id: 'techtilt',
    name: 'Tech Heavy',
    description: 'Concentrated bet on technology and growth.',
    allocations: { sp500: 25, tech: 50, value: 5, intl: 10, bonds: 5, commodities: 2, cash: 3 },
  },
  {
    id: 'goldbug',
    name: 'Gold Bug & Inflation Shield',
    description: 'Heavy commodities for inflation fear.',
    allocations: { sp500: 20, tech: 5, value: 10, intl: 10, bonds: 15, commodities: 35, cash: 5 },
  },
  {
    id: 'climatetransition',
    name: 'Climate Transition',
    description: 'Positions for an orderly green transition. Heavy clean energy, green bonds, and healthcare; minimal fossil fuels.',
    allocations: { sp500: 15, tech: 15, intl: 10, green_energy: 25, green_bonds: 15, healthcare: 12, bonds: 5, cash: 3 },
  },
  {
    id: 'brownlegacy',
    name: 'Brown Legacy (High Carbon)',
    description: 'Concentrated in fossil fuels and carbon-heavy industries. Tests what happens under aggressive carbon policy.',
    allocations: { sp500: 15, value: 20, fossil_fuel: 30, infra: 15, agri: 10, commodities: 5, cash: 5 },
  },
  {
    id: 'climateresilient',
    name: 'Climate Resilient',
    description: 'Balanced portfolio tilted toward low-carbon, low-physical-risk assets.',
    allocations: { sp500: 25, tech: 15, intl: 10, green_energy: 10, green_bonds: 10, healthcare: 12, bonds: 13, cash: 5 },
  },
];

export interface StockHolding {
  ticker: string;
  name: string;
  assetId: string;
  annualReturn: number;
  annualVol: number;
}

export const STOCK_HOLDINGS: StockHolding[] = [
  { ticker: 'AAPL', name: 'Apple', assetId: 'sp500', annualReturn: 0.12, annualVol: 0.25 },
  { ticker: 'MSFT', name: 'Microsoft', assetId: 'sp500', annualReturn: 0.13, annualVol: 0.24 },
  { ticker: 'BRK.B', name: 'Berkshire Hathaway', assetId: 'sp500', annualReturn: 0.1, annualVol: 0.18 },
  { ticker: 'JPM', name: 'JPMorgan Chase', assetId: 'sp500', annualReturn: 0.1, annualVol: 0.27 },
  { ticker: 'NVDA', name: 'NVIDIA', assetId: 'tech', annualReturn: 0.25, annualVol: 0.5 },
  { ticker: 'TSLA', name: 'Tesla', assetId: 'tech', annualReturn: 0.2, annualVol: 0.6 },
  { ticker: 'AMZN', name: 'Amazon', assetId: 'tech', annualReturn: 0.15, annualVol: 0.35 },
  { ticker: 'GOOGL', name: 'Alphabet', assetId: 'tech', annualReturn: 0.14, annualVol: 0.3 },
  { ticker: 'META', name: 'Meta Platforms', assetId: 'tech', annualReturn: 0.15, annualVol: 0.38 },
  { ticker: 'JNJ', name: 'Johnson & Johnson', assetId: 'value', annualReturn: 0.07, annualVol: 0.16 },
  { ticker: 'PG', name: 'Procter & Gamble', assetId: 'value', annualReturn: 0.07, annualVol: 0.15 },
  { ticker: 'KO', name: 'Coca-Cola', assetId: 'value', annualReturn: 0.065, annualVol: 0.16 },
  { ticker: 'XOM', name: 'Exxon Mobil', assetId: 'value', annualReturn: 0.08, annualVol: 0.28 },
  { ticker: 'TSM', name: 'TSMC', assetId: 'intl', annualReturn: 0.12, annualVol: 0.35 },
  { ticker: 'TM', name: 'Toyota', assetId: 'intl', annualReturn: 0.07, annualVol: 0.25 },
  { ticker: 'NVO', name: 'Novo Nordisk', assetId: 'intl', annualReturn: 0.15, annualVol: 0.3 },
  { ticker: 'ENPH', name: 'Enphase Energy', assetId: 'green_energy', annualReturn: 0.2, annualVol: 0.55 },
  { ticker: 'SEDG', name: 'SolarEdge', assetId: 'green_energy', annualReturn: 0.18, annualVol: 0.5 },
  { ticker: 'NEE', name: 'NextEra Energy', assetId: 'green_energy', annualReturn: 0.1, annualVol: 0.2 },
  { ticker: 'CVX', name: 'Chevron', assetId: 'fossil_fuel', annualReturn: 0.07, annualVol: 0.3 },
  { ticker: 'COP', name: 'ConocoPhillips', assetId: 'fossil_fuel', annualReturn: 0.08, annualVol: 0.35 },
  { ticker: 'UNH', name: 'UnitedHealth', assetId: 'healthcare', annualReturn: 0.12, annualVol: 0.2 },
  { ticker: 'LLY', name: 'Eli Lilly', assetId: 'healthcare', annualReturn: 0.15, annualVol: 0.25 },
];

// Correlation matrix for asset classes (approximate long-run correlations).
export const ASSET_CORRELATIONS: number[][] = [
  /* sp500       */ [1.00, 0.85, 0.85, 0.75, -0.10, 0.10, 0.00, 0.70, -0.05, 0.60, 0.55, 0.40, 0.65],
  /* tech        */ [0.85, 1.00, 0.70, 0.65, -0.05, 0.05, 0.00, 0.75, -0.05, 0.35, 0.40, 0.30, 0.60],
  /* value       */ [0.85, 0.70, 1.00, 0.70, 0.05, 0.15, 0.00, 0.50, 0.05, 0.65, 0.55, 0.45, 0.55],
  /* intl        */ [0.75, 0.65, 0.70, 1.00, -0.05, 0.20, 0.00, 0.55, -0.05, 0.50, 0.50, 0.40, 0.50],
  /* bonds       */ [-0.10, -0.05, 0.05, -0.05, 1.00, 0.25, 0.10, -0.05, 0.80, -0.10, 0.20, 0.10, 0.05],
  /* commodities */ [0.10, 0.05, 0.15, 0.20, 0.25, 1.00, 0.05, 0.20, 0.10, 0.50, 0.35, 0.55, 0.10],
  /* cash        */ [0.00, 0.00, 0.00, 0.00, 0.10, 0.05, 1.00, 0.00, 0.10, 0.00, 0.00, 0.00, 0.00],
  /* green_energy*/ [0.70, 0.75, 0.50, 0.55, -0.05, 0.20, 0.00, 1.00, 0.15, -0.30, 0.30, 0.20, 0.55],
  /* green_bonds */ [-0.05, -0.05, 0.05, -0.05, 0.80, 0.10, 0.10, 0.15, 1.00, -0.15, 0.15, 0.05, 0.10],
  /* fossil_fuel */ [0.60, 0.35, 0.65, 0.50, -0.10, 0.50, 0.00, -0.30, -0.15, 1.00, 0.45, 0.35, 0.25],
  /* infra       */ [0.55, 0.40, 0.55, 0.50, 0.20, 0.35, 0.00, 0.30, 0.15, 0.45, 1.00, 0.40, 0.45],
  /* agri        */ [0.40, 0.30, 0.45, 0.40, 0.10, 0.55, 0.00, 0.20, 0.05, 0.35, 0.40, 1.00, 0.30],
  /* healthcare  */ [0.65, 0.60, 0.55, 0.50, 0.05, 0.10, 0.00, 0.55, 0.10, 0.25, 0.45, 0.30, 1.00],
];
