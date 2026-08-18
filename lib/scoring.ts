// Composite scoring engine for contest submissions.
// Score = w1*Sharpe + w2*(1/ClimateVaR) - w3*(ImpliedTempRise - 1.5)

export interface ScoreInputs {
  sharpeRatio: number;
  climateVaR95: number; // stored as a negative loss figure; magnitude is used
  impliedTemperatureRise: number;
  weightSharpe: number;
  weightClimateVar: number;
  weightTempRise: number;
}

export function computeCompositeScore({
  sharpeRatio,
  climateVaR95,
  impliedTemperatureRise,
  weightSharpe,
  weightClimateVar,
  weightTempRise,
}: ScoreInputs): number {
  // Floor at $1 so a zero/near-zero VaR doesn't blow up the inverse term.
  const varMagnitude = Math.max(1, Math.abs(climateVaR95));
  // Scale to "per $1k of VaR" so the term stays in a reasonable range
  // relative to the Sharpe term.
  const invVar = 1 / (varMagnitude / 1000);
  const tempPenalty = Math.max(0, impliedTemperatureRise - 1.5);

  const score =
    weightSharpe * sharpeRatio +
    weightClimateVar * invVar -
    weightTempRise * tempPenalty;

  return Math.round(score * 100) / 100;
}
