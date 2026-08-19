'use client';

import { useState } from 'react';
import type { Stock, Holding } from '@/lib/types/trading';
import { executeBuyTrade, executeSellTrade } from '@/actions/trading';
import { StockPicker } from './StockPicker';

interface TradeFormProps {
  cashBalance: number;
  holdings: Holding[];
  onTradeComplete: () => void;
}

type Tab = 'buy' | 'sell';

export function TradeForm({ cashBalance, holdings, onTradeComplete }: TradeFormProps) {
  const [tab, setTab] = useState<Tab>('buy');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);
  const [selectedHolding, setSelectedHolding] = useState<Holding | null>(null);
  const [quantity, setQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleBuyTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStock || !quantity) return;

    const shares = parseFloat(quantity);
    if (shares <= 0) {
      setError('Quantity must be positive');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await executeBuyTrade(
        typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '',
        selectedStock.id,
        shares
      );
      setSuccess(
        `Bought ${shares} shares of ${selectedStock.ticker} for $${result.cost.toFixed(2)}`
      );
      setSelectedStock(null);
      setQuantity('');
      onTradeComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSellTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedHolding || !quantity) return;

    const shares = parseFloat(quantity);
    if (shares <= 0) {
      setError('Quantity must be positive');
      return;
    }

    if (shares > selectedHolding.shares) {
      setError(`Max shares to sell: ${selectedHolding.shares.toFixed(2)}`);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await executeSellTrade(
        typeof window !== 'undefined' ? window.location.pathname.split('/')[2] : '',
        selectedHolding.stock_id,
        shares
      );
      setSuccess(
        `Sold ${shares} shares of ${selectedHolding.stock?.ticker} for $${result.proceeds.toFixed(2)}`
      );
      setSelectedHolding(null);
      setQuantity('');
      onTradeComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Trade failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => {
            setTab('buy');
            setSelectedStock(null);
            setSelectedHolding(null);
            setQuantity('');
            setError(null);
            setSuccess(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'buy'
              ? 'border-b-2 border-cyan-500 text-cyan-400'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => {
            setTab('sell');
            setSelectedStock(null);
            setSelectedHolding(null);
            setQuantity('');
            setError(null);
            setSuccess(null);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'sell'
              ? 'border-b-2 border-cyan-500 text-cyan-400'
              : 'text-slate-500 hover:text-slate-400'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-rose-700/50 bg-rose-950/30 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/30 p-3 text-sm text-emerald-300">
          {success}
        </div>
      )}

      {/* Buy Tab */}
      {tab === 'buy' && (
        <form onSubmit={handleBuyTrade} className="space-y-4">
          <StockPicker
            onSelectStock={setSelectedStock}
            disabled={loading}
          />

          {selectedStock && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <p className="text-sm text-slate-400">Selected Stock</p>
              <p className="mt-1 font-semibold text-slate-100">{selectedStock.name}</p>
              <p className="text-xs text-slate-500">{selectedStock.ticker}</p>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Quantity (shares)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              disabled={loading || !selectedStock}
              placeholder="0"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-600 disabled:opacity-50"
            />
          </div>

          {selectedStock && quantity && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <p className="text-xs text-slate-400">Estimated Cost</p>
              <p className="mt-1 text-lg font-semibold text-slate-100">
                $
                {(
                  parseFloat(quantity) * selectedStock.base_return * 100
                ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </p>
              <p className="mt-2 text-xs text-slate-500">
                Available Cash: ${cashBalance.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !selectedStock || !quantity}
            className="w-full rounded-lg bg-emerald-600 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Processing...' : 'Buy Shares'}
          </button>
        </form>
      )}

      {/* Sell Tab */}
      {tab === 'sell' && (
        <form onSubmit={handleSellTrade} className="space-y-4">
          {holdings.length === 0 ? (
            <p className="text-sm text-slate-500">No holdings to sell</p>
          ) : (
            <>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Select Position to Sell
                </label>
                <select
                  value={selectedHolding?.id || ''}
                  onChange={(e) => {
                    const holding = holdings.find((h) => h.id === e.target.value);
                    setSelectedHolding(holding || null);
                    setQuantity('');
                  }}
                  disabled={loading}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 disabled:opacity-50"
                >
                  <option value="">-- Choose a holding --</option>
                  {holdings.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.stock?.ticker} ({h.shares.toFixed(2)} shares @ $
                      {h.avg_cost_basis.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {selectedHolding && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <p className="text-sm text-slate-400">Position Details</p>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-slate-500">Shares Owned</p>
                      <p className="font-semibold text-slate-100">
                        {selectedHolding.shares.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Avg Cost</p>
                      <p className="font-semibold text-slate-100">
                        ${selectedHolding.avg_cost_basis.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Current Price</p>
                      <p className="font-semibold text-slate-100">
                        ${selectedHolding.current_price?.toFixed(2) || 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Current Value</p>
                      <p className="font-semibold text-slate-100">
                        ${(selectedHolding.current_value || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">
                  Quantity to Sell
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedHolding?.shares || 0}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  disabled={loading || !selectedHolding}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 placeholder-slate-600 disabled:opacity-50"
                />
              </div>

              {selectedHolding && quantity && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
                  <p className="text-xs text-slate-400">Sale Proceeds</p>
                  <p className="mt-1 text-lg font-semibold text-emerald-300">
                    $
                    {(
                      parseFloat(quantity) * (selectedHolding.current_price || 0)
                    ).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Realized Gain:{' '}
                    {(
                      parseFloat(quantity) *
                      ((selectedHolding.current_price || 0) - selectedHolding.avg_cost_basis)
                    ).toFixed(2)}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !selectedHolding || !quantity}
                className="w-full rounded-lg bg-rose-600 py-2 text-sm font-semibold text-white hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Sell Shares'}
              </button>
            </>
          )}
        </form>
      )}
    </div>
  );
}
