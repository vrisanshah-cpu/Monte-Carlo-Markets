// Climate finance modeling: NGFS scenarios, carbon classification, climate shocks.
// All parameters are illustrative for educational simulation, not investment advice.

export type ClimateClassification = 'green' | 'brown' | 'neutral';

export interface ClimateAssetMeta {
  classification: ClimateClassification;
  carbonIntensity: number;
  physicalRiskExposure: number;
  transitionRiskExposure: number;
}

export const CLIMATE_ASSET_META: Record<string, ClimateAssetMeta> = {
  sp500: { classification: 'neutral', carbonIntensity: 120, physicalRiskExposure: 0.3, transitionRiskExposure: 0.35 },
  tech: { classification: 'green', carbonIntensity: 40, physicalRiskExposure: 0.1, transitionRiskExposure: 0.05 },
  value: { classification: 'brown', carbonIntensity: 280, physicalRiskExposure: 0.25, transitionRiskExposure: 0.7 },
  intl: { classification: 'neutral', carbonIntensity: 160, physicalRiskExposure: 0.45, transitionRiskExposure: 0.4 },
  bonds: { classification: 'neutral', carbonIntensity: 0, physicalRiskExposure: 0.15, transitionRiskExposure: 0.2 },
  commodities: { classification: 'brown', carbonIntensity: 350, physicalRiskExposure: 0.2, transitionRiskExposure: 0.6 },
  cash: { classification: 'neutral', carbonIntensity: 0, physicalRiskExposure: 0, transitionRiskExposure: 0 },
  green_energy: { classification: 'green', carbonIntensity: 5, physicalRiskExposure: 0.15, transitionRiskExposure: 0.0 },
  green_bonds: { classification: 'green', carbonIntensity: 0, physicalRiskExposure: 0.05, transitionRiskExposure: 0.0 },
  fossil_fuel: { classification: 'brown', carbonIntensity: 520, physicalRiskExposure: 0.3, transitionRiskExposure: 0.95 },
  infra: { classification: 'neutral', carbonIntensity: 200, physicalRiskExposure: 0.6, transitionRiskExposure: 0.45 },
  agri: { classification: 'brown', carbonIntensity: 310, physicalRiskExposure: 0.85, transitionRiskExposure: 0.3 },
  healthcare: { classification: 'green', carbonIntensity: 35, physicalRiskExposure: 0.1, transitionRiskExposure: 0.1 },
};

export type ClimateScenarioId = 'orderly' | 'disorderly' | 'hothouse';

export interface ClimateScenario {
  id: ClimateScenarioId;
  name: string;
  shortName: string;
  description: string;
  targetWarming: number;
  tippingPointProb: number;
  tippingVolIncrease: number;
  tippingDriftReduction: number;
  physicalShockMultiplier: number;
  carbonTaxOnsetYear: number;
  carbonTaxSeverity: number;
  greenDriftBoost: number;
  color: string;
}

export const CLIMATE_SCENARIOS: ClimateScenario[] = [
  {
    id: 'orderly',
    name: 'Orderly Transition (1.5°C)',
    shortName: '1.5°C Orderly',
    description:
      'Early, ambitious policy action keeps warming near 1.5°C. Carbon pricing ramps up gradually, green assets thrive, and physical damages stay moderate.',
    targetWarming: 1.5,
    tippingPointProb: 0.005,
    tippingVolIncrease: 0.15,
    tippingDriftReduction: 0.01,
    physicalShockMultiplier: 0.8,
    carbonTaxOnsetYear: 3,
    carbonTaxSeverity: 0.02,
    greenDriftBoost: 0.03,
    color: '#22d3ee',
  },
  {
    id: 'disorderly',
    name: 'Disorderly Transition (2.0°C)',
    shortName: '2.0°C Disorderly',
    description:
      'Delayed then sudden policy shifts. Carbon taxes arrive late but harsh, causing sharp repricing of brown assets. Higher transition risk, moderate physical risk.',
    targetWarming: 2.0,
    tippingPointProb: 0.02,
    tippingVolIncrease: 0.25,
    tippingDriftReduction: 0.02,
    physicalShockMultiplier: 1.2,
    carbonTaxOnsetYear: 8,
    carbonTaxSeverity: 0.06,
    greenDriftBoost: 0.04,
    color: '#fbbf24',
  },
  {
    id: 'hothouse',
    name: 'Hot House World (3.0°C+)',
    shortName: '3.0°C+ Hot House',
    description:
      'No meaningful transition. Emissions keep rising, warming exceeds 3°C. Severe physical risks dominate: extreme weather, sea-level rise, agricultural collapse. No carbon tax relief.',
    targetWarming: 3.0,
    tippingPointProb: 0.06,
    tippingVolIncrease: 0.4,
    tippingDriftReduction: 0.035,
    physicalShockMultiplier: 2.5,
    carbonTaxOnsetYear: Infinity,
    carbonTaxSeverity: 0,
    greenDriftBoost: 0,
    color: '#f43f5e',
  },
];

export function getClimateScenario(id: ClimateScenarioId): ClimateScenario {
  return CLIMATE_SCENARIOS.find((s) => s.id === id) ?? CLIMATE_SCENARIOS[0];
}

export interface ClimateConfig {
  scenario: ClimateScenarioId;
  carbonTaxOnsetYear: number;
  enableClimateRisk: boolean;
  physicalRiskIntensity: number;
  tippingPointProb: number;
}

export const DEFAULT_CLIMATE_CONFIG: ClimateConfig = {
  scenario: 'orderly',
  carbonTaxOnsetYear: 5,
  enableClimateRisk: false,
  physicalRiskIntensity: 1.0,
  tippingPointProb: 0,
};

export interface PortfolioClimateMetrics {
  weightedCarbonIntensity: number;
  impliedTemperatureRise: number;
  physicalRiskScore: number;
  transitionRiskScore: number;
  greenWeight: number;
  brownWeight: number;
  neutralWeight: number;
}

export function computePortfolioClimateMetrics(
  allocations: Record<string, number>
): PortfolioClimateMetrics {
  const total = Object.values(allocations).reduce((a, b) => a + b, 0) || 1;
  let wci = 0;
  let physRisk = 0;
  let transRisk = 0;
  let greenW = 0;
  let brownW = 0;
  let neutralW = 0;

  for (const [id, weight] of Object.entries(allocations)) {
    const w = weight / total;
    const meta = CLIMATE_ASSET_META[id];
    if (!meta) {
      neutralW += w;
      continue;
    }
    wci += meta.carbonIntensity * w;
    physRisk += meta.physicalRiskExposure * w;
    transRisk += meta.transitionRiskExposure * w;
    if (meta.classification === 'green') greenW += w;
    else if (meta.classification === 'brown') brownW += w;
    else neutralW += w;
  }

  const impliedTemp = 1.5 + Math.min(1.5, wci / 300);

  return {
    weightedCarbonIntensity: Math.round(wci),
    impliedTemperatureRise: Math.round(impliedTemp * 10) / 10,
    physicalRiskScore: Math.round(physRisk * 100),
    transitionRiskScore: Math.round(transRisk * 100),
    greenWeight: greenW,
    brownWeight: brownW,
    neutralWeight: neutralW,
  };
}
