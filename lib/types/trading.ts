export interface Stock {
  id: string;
  ticker: string;
  name: string;
  sector: string;
  esg_score: number; // 0-100, 70+ = green, <40 = brown, 40-70 = neutral
  base_return: number; // annual expected return as decimal (0.08 = 8%)
  volatility: number; // annual volatility as decimal (0.20 = 20%)
  created_at: string;
}

export interface ScriptedShock {
  year: number;
  name: string;
  type: 'market_event' | 'physical_shock' | 'policy_shock';
  magnitude: number; // decimal: -0.15 = -15%, 0.20 = +20%
  affects: string[]; // array of stock tickers affected
  description?: string;
}

export interface LifeEvent {
  year: number;
  label: string;
  amount: number; // positive = inflow, negative = expense
}

export interface Competition {
  id: string;
  title: string;
  description: string;
  climate_scenario: 'orderly' | 'disorderly' | 'hothouse';
  start_date: string;
  end_date: string;
  status: 'draft' | 'open' | 'closed' | 'archived';
  starting_balance: number;
  prize_pool: number | null;
  scripted_shocks: ScriptedShock[];
  life_events: LifeEvent[];
  created_by: string;
  created_at: string;
}

export interface CompetitionParticipant {
  id: string;
  competition_id: string;
  user_id: string;
  starting_balance: number;
  current_balance: number;
  joined_at: string;
}

export interface Holding {
  id: string;
  competition_id: string;
  user_id: string;
  stock_id: string;
  stock?: Stock; // joined data
  shares: number;
  avg_cost_basis: number;
  updated_at: string;
  // Computed fields (calculated client or server-side)
  current_price?: number;
  current_value?: number; // shares * current_price
  unrealized_gain?: number; // (current_price - avg_cost_basis) * shares
  unrealized_gain_percent?: number; // (unrealized_gain / (avg_cost_basis * shares)) * 100
}

export interface Trade {
  id: string;
  competition_id: string;
  user_id: string;
  stock_id: string;
  stock?: Stock; // joined data
  action: 'buy' | 'sell';
  shares: number;
  price: number;
  realized_gain: number | null;
  executed_at: string;
}

export interface CompetitionState {
  competition: Competition;
  participant: CompetitionParticipant;
  holdings: Holding[];
  trades: Trade[];
  // Computed
  cash_balance: number;
  holdings_value: number; // sum of all holding values
  total_portfolio_value: number; // holdings_value + cash_balance
  total_gain: number; // total_portfolio_value - starting_balance
  total_gain_percent: number; // (total_gain / starting_balance) * 100
  rank: number; // leaderboard rank
  rank_total: number; // total participants
}

export interface PriceData {
  stock_id: string;
  ticker: string;
  price: number;
  timestamp: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name: string;
  starting_balance: number;
  current_portfolio_value: number;
  total_gain: number;
  total_gain_percent: number;
  top_holdings: {
    ticker: string;
    shares: number;
    value: number;
    percent_of_portfolio: number;
  }[];
}
