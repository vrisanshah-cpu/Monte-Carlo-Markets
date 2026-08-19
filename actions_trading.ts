'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { simulateStockPrice, calculatePortfolioValue } from '@/lib/simulation/pricing';
import type {
  CompetitionState,
  Trade,
  Holding,
  LeaderboardEntry,
} from '@/lib/types/trading';

/**
 * Join a competition
 * Creates a competition_participant row and initializes cash balance
 */
export async function joinCompetition(competitionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Get competition starting balance
  const { data: competition, error: compError } = await supabase
    .from('competitions')
    .select('starting_balance, end_date')
    .eq('id', competitionId)
    .single();

  if (compError || !competition) throw new Error('Competition not found');

  // Check if already joined
  const { data: existing } = await supabase
    .from('competition_participants')
    .select('id')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id)
    .single();

  if (existing) throw new Error('Already joined this competition');

  // Create participant row with starting balance
  const { error } = await supabase.from('competition_participants').insert({
    competition_id: competitionId,
    user_id: user.id,
    starting_balance: competition.starting_balance,
    current_balance: competition.starting_balance,
  });

  if (error) throw error;

  revalidatePath(`/competitions/${competitionId}`);
  return { success: true };
}

/**
 * Execute a buy trade
 * Deducts cash from participant, adds/updates holding
 */
export async function executeBuyTrade(
  competitionId: string,
  stockId: string,
  shares: number
) {
  if (shares <= 0) throw new Error('Shares must be positive');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Get current price
  const { data: stock } = await supabase
    .from('stocks')
    .select('*')
    .eq('id', stockId)
    .single();

  if (!stock) throw new Error('Stock not found');

  const { data: competition } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (!competition) throw new Error('Competition not found');

  const currentPrice = simulateStockPrice(stock, competition, new Date());
  const cost = shares * currentPrice;

  // Check cash balance
  const { data: participant } = await supabase
    .from('competition_participants')
    .select('current_balance')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id)
    .single();

  if (!participant || participant.current_balance < cost) {
    throw new Error('Insufficient cash balance');
  }

  // Get or create holding
  const { data: existingHolding } = await supabase
    .from('holdings')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id)
    .eq('stock_id', stockId)
    .single();

  let newAvgCost = currentPrice;
  let newShares = shares;

  if (existingHolding && existingHolding.shares > 0) {
    // Calculate new average cost basis
    const totalCost =
      existingHolding.shares * existingHolding.avg_cost_basis + cost;
    newShares = existingHolding.shares + shares;
    newAvgCost = totalCost / newShares;
  }

  // Update or insert holding
  if (existingHolding) {
    await supabase
      .from('holdings')
      .update({
        shares: newShares,
        avg_cost_basis: newAvgCost,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingHolding.id);
  } else {
    await supabase.from('holdings').insert({
      competition_id: competitionId,
      user_id: user.id,
      stock_id: stockId,
      shares: newShares,
      avg_cost_basis: newAvgCost,
    });
  }

  // Deduct cash from participant
  await supabase
    .from('competition_participants')
    .update({
      current_balance: participant.current_balance - cost,
    })
    .eq('competition_id', competitionId)
    .eq('user_id', user.id);

  // Record trade
  await supabase.from('trades').insert({
    competition_id: competitionId,
    user_id: user.id,
    stock_id: stockId,
    action: 'buy',
    shares,
    price: currentPrice,
  });

  revalidatePath(`/competitions/${competitionId}`);

  return { success: true, cost, price: currentPrice };
}

/**
 * Execute a sell trade
 * Adds cash to participant, updates holding
 */
export async function executeSellTrade(
  competitionId: string,
  stockId: string,
  shares: number
) {
  if (shares <= 0) throw new Error('Shares must be positive');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Get holding
  const { data: holding } = await supabase
    .from('holdings')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id)
    .eq('stock_id', stockId)
    .single();

  if (!holding || holding.shares < shares) {
    throw new Error('Insufficient shares to sell');
  }

  // Get current price
  const { data: stock } = await supabase
    .from('stocks')
    .select('*')
    .eq('id', stockId)
    .single();

  if (!stock) throw new Error('Stock not found');

  const { data: competition } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (!competition) throw new Error('Competition not found');

  const currentPrice = simulateStockPrice(stock, competition, new Date());
  const proceeds = shares * currentPrice;
  const realizedGain =
    shares * (currentPrice - holding.avg_cost_basis);

  // Update holding
  const newShares = holding.shares - shares;
  if (newShares <= 0) {
    // Delete holding if no shares left
    await supabase.from('holdings').delete().eq('id', holding.id);
  } else {
    // Update holding with remaining shares (avg cost stays same)
    await supabase
      .from('holdings')
      .update({
        shares: newShares,
        updated_at: new Date().toISOString(),
      })
      .eq('id', holding.id);
  }

  // Add cash to participant
  const { data: participant } = await supabase
    .from('competition_participants')
    .select('current_balance')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id)
    .single();

  if (participant) {
    await supabase
      .from('competition_participants')
      .update({
        current_balance: participant.current_balance + proceeds,
      })
      .eq('competition_id', competitionId)
      .eq('user_id', user.id);
  }

  // Record trade
  await supabase.from('trades').insert({
    competition_id: competitionId,
    user_id: user.id,
    stock_id: stockId,
    action: 'sell',
    shares,
    price: currentPrice,
    realized_gain: realizedGain,
  });

  revalidatePath(`/competitions/${competitionId}`);

  return { success: true, proceeds, price: currentPrice, realizedGain };
}

/**
 * Get user's current competition state (portfolio, holdings, P&L)
 */
export async function getCompetitionState(
  competitionId: string
): Promise<CompetitionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('Not authenticated');

  // Get competition
  const { data: competition } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (!competition) throw new Error('Competition not found');

  // Get participant
  const { data: participant } = await supabase
    .from('competition_participants')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id)
    .single();

  if (!participant) throw new Error('Not joined this competition');

  // Get holdings with stock data
  const { data: holdings } = await supabase
    .from('holdings')
    .select('*, stocks(*)')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id);

  if (!holdings) throw new Error('Error fetching holdings');

  // Get all trades
  const { data: trades } = await supabase
    .from('trades')
    .select('*')
    .eq('competition_id', competitionId)
    .eq('user_id', user.id)
    .order('executed_at', { ascending: true });

  if (!trades) throw new Error('Error fetching trades');

  // Calculate current values
  const now = new Date();
  let holdingsValue = 0;
  const enrichedHoldings = holdings.map((holding: any) => {
    const currentPrice = simulateStockPrice(holding.stocks, competition, now);
    const currentValue = holding.shares * currentPrice;
    holdingsValue += currentValue;

    return {
      ...holding,
      current_price: currentPrice,
      current_value: currentValue,
      unrealized_gain: (currentPrice - holding.avg_cost_basis) * holding.shares,
      unrealized_gain_percent:
        ((currentPrice - holding.avg_cost_basis) / holding.avg_cost_basis) * 100,
    };
  });

  const totalPortfolioValue = holdingsValue + participant.current_balance;
  const totalGain = totalPortfolioValue - participant.starting_balance;
  const totalGainPercent =
    (totalGain / participant.starting_balance) * 100;

  // Get leaderboard rank
  const { data: leaderboard } = await supabase.rpc('get_competition_leaderboard', {
    comp_id: competitionId,
  });

  let rank = 1;
  if (leaderboard && Array.isArray(leaderboard)) {
    rank =
      leaderboard.findIndex((entry: any) => entry.user_id === user.id) + 1 ||
      leaderboard.length;
  }

  return {
    competition,
    participant,
    holdings: enrichedHoldings,
    trades,
    cash_balance: participant.current_balance,
    holdings_value: holdingsValue,
    total_portfolio_value: totalPortfolioValue,
    total_gain: totalGain,
    total_gain_percent: totalGainPercent,
    rank,
    rank_total: leaderboard?.length || 1,
  };
}

/**
 * Get all stocks available to trade
 */
export async function getStocks(filters?: {
  esgMin?: number;
  esgMax?: number;
  sector?: string;
  search?: string;
}) {
  const supabase = await createClient();

  let query = supabase.from('stocks').select('*');

  if (filters?.esgMin !== undefined) {
    query = query.gte('esg_score', filters.esgMin);
  }
  if (filters?.esgMax !== undefined) {
    query = query.lte('esg_score', filters.esgMax);
  }
  if (filters?.sector) {
    query = query.eq('sector', filters.sector);
  }
  if (filters?.search) {
    query = query.or(
      `ticker.ilike.%${filters.search}%,name.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query.order('ticker');

  if (error) throw error;
  return data || [];
}

/**
 * Get competition brief (public info + shocks + events)
 */
export async function getCompetitionBrief(competitionId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (error) throw new Error('Competition not found');
  return data;
}

/**
 * Get leaderboard for a competition
 */
export async function getCompetitionLeaderboard(
  competitionId: string
): Promise<LeaderboardEntry[]> {
  const supabase = await createClient();

  // Get all participants
  const { data: participants } = await supabase
    .from('competition_participants')
    .select('*, auth_user:user_id(id)')
    .eq('competition_id', competitionId);

  if (!participants) return [];

  // Get competition for price calculations
  const { data: competition } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', competitionId)
    .single();

  if (!competition) return [];

  // Calculate portfolio values for each participant
  const now = new Date();
  const leaderboard: LeaderboardEntry[] = [];

  for (const participant of participants) {
    // Get holdings
    const { data: holdings } = await supabase
      .from('holdings')
      .select('*, stocks(*)')
      .eq('competition_id', competitionId)
      .eq('user_id', participant.user_id);

    let holdingsValue = 0;
    const topHoldings: any[] = [];

    if (holdings && holdings.length > 0) {
      holdings.forEach((holding: any) => {
        const currentPrice = simulateStockPrice(
          holding.stocks,
          competition,
          now
        );
        const value = holding.shares * currentPrice;
        holdingsValue += value;
        topHoldings.push({
          ticker: holding.stocks.ticker,
          shares: holding.shares,
          value,
          percent_of_portfolio:
            (value / (holdingsValue + participant.current_balance)) * 100,
        });
      });
    }

    const totalPortfolioValue = holdingsValue + participant.current_balance;
    const totalGain = totalPortfolioValue - participant.starting_balance;
    const totalGainPercent =
      (totalGain / participant.starting_balance) * 100;

    leaderboard.push({
      rank: 0, // will be set below
      user_id: participant.user_id,
      username: participant.auth_user?.username || 'Anonymous',
      display_name: participant.auth_user?.display_name || 'Anonymous',
      starting_balance: participant.starting_balance,
      current_portfolio_value: totalPortfolioValue,
      total_gain: totalGain,
      total_gain_percent: totalGainPercent,
      top_holdings: topHoldings
        .sort((a, b) => b.value - a.value)
        .slice(0, 3),
    });
  }

  // Sort by portfolio value and assign ranks
  leaderboard.sort((a, b) => b.current_portfolio_value - a.current_portfolio_value);
  leaderboard.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return leaderboard;
}
