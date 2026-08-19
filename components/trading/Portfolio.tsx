'use client';

import type { Holding, CompetitionState } from '@/lib/types/trading';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface PortfolioProps {
  state: CompetitionState;
  onSellClick: (holding: Holding) => void;
}

export function Portfolio({ state, onSellClick }: PortfolioProps) {
  const isPositive = state.total_gain >= 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <p className="text-xs text-slate-400">Starting Balance</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">
            ${state.participant.starting_balance.toLocaleString('en-US', {
              maximumFractionDigits: 0,
            })}
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <p className="text-xs text-slate-400">Cash Balance</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">
            ${state.cash_balance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
          <p className="text-xs text-slate-400">Holdings Value</p>
          <p className="mt-1 text-lg font-semibold text-slate-100">
            ${state.holdings_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div
          className={`rounded-lg border p-3 ${
            isPositive
              ? 'border-emerald-700/50 bg-emerald-950/30'
              : 'border-rose-700/50 bg-rose-950/30'
          }`}
        >
          <p className={`text-xs ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
            Total P&L
          </p>
          <p
            className={`mt-1 text-lg font-semibold ${
              isPositive ? 'text-emerald-300' : 'text-rose-300'
            }`}
          >
            {isPositive ? '+' : ''}${state.total_gain.toLocaleString('en-US', {
              maximumFractionDigits: 0,
            })}{' '}
            ({state.total_gain_percent.toFixed(1)}%)
          </p>
        </div>
      </div>

      {/* Portfolio Value Card */}
      <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-4">
        <p className="text-sm text-slate-400">Total Portfolio Value</p>
        <p className="mt-2 text-3xl font-bold text-slate-100">
          ${state.total_portfolio_value.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          Rank: #{state.rank} of {state.rank_total}
        </p>
      </div>

      {/* Holdings List */}
      <div>
        <h3 className="mb-3 text-sm font-semibold text-slate-100">Your Holdings</h3>
        {state.holdings.length === 0 ? (
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center text-sm text-slate-500">
            No stocks owned yet. Start trading!
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {state.holdings.map((holding) => {
              const isGain = (holding.unrealized_gain || 0) >= 0;
              return (
                <div
                  key={holding.id}
                  className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-100">
                        {holding.stock?.ticker || 'N/A'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {holding.shares.toFixed(2)} shares @ ${holding.avg_cost_basis.toFixed(2)}
                      </p>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-slate-400">
                      <span>Current: ${holding.current_price?.toFixed(2) || 'N/A'}</span>
                      <span>
                        Value: $
                        {(holding.current_value || 0).toLocaleString('en-US', {
                          maximumFractionDigits: 0,
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <div
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 ${
                        isGain
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-rose-500/20 text-rose-300'
                      }`}
                    >
                      {isGain ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      <span className="text-xs font-semibold">
                        {isGain ? '+' : ''}
                        {(holding.unrealized_gain_percent || 0).toFixed(1)}%
                      </span>
                    </div>
                    <button
                      onClick={() => onSellClick(holding)}
                      className="rounded bg-slate-700 px-2 py-1 text-xs font-medium text-slate-200 hover:bg-slate-600"
                    >
                      Sell
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
