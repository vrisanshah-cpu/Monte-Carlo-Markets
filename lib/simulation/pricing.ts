import type { Stock, Competition, ScriptedShock } from '@/lib/types/trading';

/**
 * Simulate stock price using Geometric Brownian Motion (GBM)
 * P(t) = P0 * e^((μ - σ²/2)*t + σ*√t*Z)
 * 
 * Where:
 * - P0 = initial price (100)
 * - μ = drift (base_return)
 * - σ = volatility
 * - Z = standard normal random variable
 * - Apply climate shocks to specific tickers
 */

export function simulateStockPrice(
  stock: Stock,
  competition: Competition,
  tradeDate: Date,
  seed?: number // optional seed for reproducibility
): number {
  const competitionStart = new Date(competition.start_date);
  const daysSinceStart = Math.floor(
    (tradeDate.getTime() - competitionStart.getTime()) / (1000 * 60 * 60 * 24)
  );
  const yearFraction = daysSinceStart / 365.25;

  if (yearFraction <= 0) {
    return 100; // Initial price
  }

  // Base GBM calculation
  const mu = stock.base_return;
  const sigma = stock.volatility;
  const drift = (mu - (sigma * sigma) / 2) * yearFraction;
  const random = seed !== undefined ? seededRandom(seed) : Math.random();
  const diffusion = sigma * Math.sqrt(yearFraction) * normalInverse(random);

  let price = 100 * Math.exp(drift + diffusion);

  // Apply climate shocks if they've occurred by this date
  const applicableShocks = competition.scripted_shocks.filter((shock) => {
    const shockDate = new Date(competitionStart);
    shockDate.setFullYear(shockDate.getFullYear() + shock.year);
    return shockDate <= tradeDate && shock.affects.includes(stock.ticker);
  });

  applicableShocks.forEach((shock) => {
    // Apply shock as a multiplicative impact
    price *= 1 + shock.magnitude;
  });

  return Math.max(price, 0.01); // Ensure price never goes negative
}

/**
 * Simulate all stock prices for a given competition and date
 * Returns map of stock_id -> price
 */
export function simulateAllPricesForDate(
  stocks: Stock[],
  competition: Competition,
  tradeDate: Date,
  seed?: number
): Map<string, number> {
  const prices = new Map<string, number>();
  stocks.forEach((stock, index) => {
    const stockSeed = seed !== undefined ? seed + index : undefined;
    prices.set(stock.id, simulateStockPrice(stock, competition, tradeDate, stockSeed));
  });
  return prices;
}

/**
 * Get the price of a single stock on a specific date
 * (Wrapper for convenience)
 */
export function getStockPrice(
  stock: Stock,
  competition: Competition,
  tradeDate: Date
): number {
  return simulateStockPrice(stock, competition, tradeDate);
}

/**
 * Inverse cumulative normal distribution (Box-Muller transform)
 * Converts uniform random [0,1] to standard normal
 */
function normalInverse(u: number): number {
  if (u <= 0 || u >= 1) return 0;
  const a1 = -3.969683028665376e2;
  const a2 = 2.221222899801429e2;
  const a3 = -2.821152023902548;
  const a4 = -6.424914543005481e-2;
  const a5 = 1.03948003991848e-1;
  const a6 = -3.457989426307629e-1;

  const b1 = -5.447609879822406e1;
  const b2 = 1.615858368580409e2;
  const b3 = -1.556989798598866e2;
  const b4 = 6.680131188771972;
  const b5 = -7.028666854603e-1;

  const c1 = -7.784894002430293e-3;
  const c2 = -3.223964580411365e-1;
  const c3 = -2.400758277161838;
  const c4 = -2.549732539343734;
  const c5 = 4.374664141464968;
  const c6 = 2.938163357918667;

  const d1 = 7.784695709041462e-3;
  const d2 = 3.224671290700398e-1;
  const d3 = 2.445134137142996;
  const d4 = 3.754408661907416;

  const p_low = 0.02425;
  const p_high = 1 - p_low;

  let z: number;
  if (u < p_low) {
    z = Math.sqrt(-2 * Math.log(u));
    z = (((((c1 * z + c2) * z + c3) * z + c4) * z + c5) * z + c6) /
      ((((d1 * z + d2) * z + d3) * z + d4) * z + 1);
  } else if (u <= p_high) {
    z = u - 0.5;
    const r = z * z;
    z = (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * z /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    z = Math.sqrt(-2 * Math.log(1 - u));
    z = -(((((c1 * z + c2) * z + c3) * z + c4) * z + c5) * z + c6) /
      ((((d1 * z + d2) * z + d3) * z + d4) * z + 1);
  }

  return z;
}

/**
 * Seeded random number generator (for reproducibility in testing)
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

/**
 * Calculate a user's portfolio value at a given date
 * Useful for leaderboard calculations
 */
export function calculatePortfolioValue(
  holdings: Array<{ stock: Stock; shares: number }>,
  competition: Competition,
  asOfDate: Date,
  cashBalance: number
): number {
  let holdingsValue = 0;
  holdings.forEach(({ stock, shares }) => {
    const price = simulateStockPrice(stock, competition, asOfDate);
    holdingsValue += shares * price;
  });
  return holdingsValue + cashBalance;
}

/**
 * Get all prices for a portfolio as of a date (for display)
 */
export function getPortfolioPrices(
  holdings: Array<{ stock: Stock; shares: number }>,
  competition: Competition,
  asOfDate: Date
): Map<string, { price: number; value: number }> {
  const prices = new Map<string, { price: number; value: number }>();
  holdings.forEach(({ stock, shares }) => {
    const price = simulateStockPrice(stock, competition, asOfDate);
    prices.set(stock.id, {
      price,
      value: shares * price,
    });
  });
  return prices;
}
