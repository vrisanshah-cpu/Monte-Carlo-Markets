export interface AssetClass {
  id: string;
  name: string;
  description: string;
  annualReturn: number;
  annualVol: number;
  color: string;
  type: 'green' | 'brown' | 'neutral';
}

export interface ScriptedShock {
  year: number;
  name: string;
  type: 'market_event' | 'physical_shock' | 'policy_shock';
  magnitude: number;
  description: string;
  affects: string[];
}

export interface Challenge {
  id: string;
  slug: string;
  title: string;
  tagline?: string;
  description?: string;
  climate_scenario?: string;
  years: number;
  initial_balance: number;
  weight_sharpe?: number;
  weight_climate_var?: number;
  weight_temp_rise?: number;
  min_green_allocation?: number;
  max_carbon_intensity?: number;
  carbon_tax_onset_year?: number;
  physical_risk_intensity?: number;
  tipping_point_prob?: number;
  status: 'draft' | 'active' | 'archived';
  starts_at?: string | null;
  ends_at?: string | null;
  asset_universe: AssetClass[];
  scripted_shocks: ScriptedShock[];
}