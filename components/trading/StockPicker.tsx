'use client';

import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import type { Stock } from '@/lib/types/trading';
import { getStocks } from '@/actions/trading';

interface StockPickerProps {
  onSelectStock: (stock: Stock) => void;
  disabled?: boolean;
}

export function StockPicker({ onSelectStock, disabled = false }: StockPickerProps) {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [filteredStocks, setFilteredStocks] = useState<Stock[]>([]);
  const [search, setSearch] = useState('');
  const [esgFilter, setEsgFilter] = useState<'all' | 'green' | 'brown' | 'neutral'>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<string[]>([]);

  // Load stocks on mount
  useEffect(() => {
    const loadStocks = async () => {
      try {
        const data = await getStocks();
        setStocks(data);
        const uniqueSectors = [...new Set(data.map((s) => s.sector))].sort();
        setSectors(uniqueSectors);
        setFilteredStocks(data);
      } catch (error) {
        console.error('Error loading stocks:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStocks();
  }, []);

  // Filter stocks when search or filters change
  useEffect(() => {
    let filtered = stocks;

    // Text search
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (s) => s.ticker.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
      );
    }

    // ESG filter
    if (esgFilter !== 'all') {
      filtered = filtered.filter((s) => {
        if (esgFilter === 'green') return s.esg_score >= 70;
        if (esgFilter === 'brown') return s.esg_score < 40;
        if (esgFilter === 'neutral') return s.esg_score >= 40 && s.esg_score < 70;
        return true;
      });
    }

    // Sector filter
    if (sectorFilter !== 'all') {
      filtered = filtered.filter((s) => s.sector === sectorFilter);
    }

    setFilteredStocks(filtered);
  }, [search, esgFilter, sectorFilter, stocks]);

  if (loading) {
    return (
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-4 text-center text-sm text-slate-400">
        Loading stocks...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Search by ticker or company name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 py-2 pl-10 pr-3 text-sm text-slate-100 placeholder-slate-500 disabled:opacity-50"
        />
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {/* ESG Filter */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">ESG Rating</label>
          <select
            value={esgFilter}
            onChange={(e) => setEsgFilter(e.target.value as typeof esgFilter)}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-1.5 px-2 text-xs text-slate-100 disabled:opacity-50"
          >
            <option value="all">All</option>
            <option value="green">Green (70+)</option>
            <option value="neutral">Neutral (40-70)</option>
            <option value="brown">Brown (&lt;40)</option>
          </select>
        </div>

        {/* Sector Filter */}
        <div className="col-span-2 md:col-span-1">
          <label className="block text-xs font-semibold text-slate-400 mb-1">Sector</label>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            disabled={disabled}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 py-1.5 px-2 text-xs text-slate-100 disabled:opacity-50"
          >
            <option value="all">All Sectors</option>
            {sectors.map((sector) => (
              <option key={sector} value={sector}>
                {sector}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock List */}
      <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-700 bg-slate-800/50">
        {filteredStocks.length === 0 ? (
          <div className="p-4 text-center text-sm text-slate-500">No stocks found</div>
        ) : (
          <div className="divide-y divide-slate-700">
            {filteredStocks.map((stock) => (
              <button
                key={stock.id}
                onClick={() => onSelectStock(stock)}
                disabled={disabled}
                className="w-full p-3 text-left transition-colors hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-slate-100">{stock.ticker}</p>
                    <p className="text-xs text-slate-400">{stock.name}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${
                        stock.esg_score >= 70
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : stock.esg_score < 40
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      ESG: {stock.esg_score}
                    </span>
                    <span className="text-xs text-slate-500">
                      Vol: {(stock.volatility * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-slate-500">
        {filteredStocks.length} stock{filteredStocks.length !== 1 ? 's' : ''} available
      </p>
    </div>
  );
}
