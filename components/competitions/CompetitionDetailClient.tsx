'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import type { Competition, CompetitionState } from '@/lib/types/trading';
import { joinCompetition, getCompetitionState } from '@/actions/trading';
import { Portfolio } from '@/components/trading/Portfolio';
import { TradeForm } from '@/components/trading/TradeForm';

interface CompetitionDetailClientProps {
  competition: Competition;
  initialState: CompetitionState | null;
  isJoined: boolean;
  userId: string;
}

type Tab = 'overview' | 'trade' | 'portfolio' | 'leaderboard';

export function CompetitionDetailClient({
  competition,
  initialState,
  isJoined: initialIsJoined,
  userId,
}: CompetitionDetailClientProps) {
  const [isJoined, setIsJoined] = useState(initialIsJoined);
  const [state, setState] = useState<CompetitionState | null>(initialState);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleJoin = async () => {
    setLoading(true);
    setError(null);
    try {
      await joinCompetition(competition.id);
      setIsJoined(true);
      // Fetch initial state
      const newState = await getCompetitionState(competition.id);
      setState(newState);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join');
    } finally {
      setLoading(false);
    }
  };

  const handleTradeComplete = async () => {
    try {
      const newState = await getCompetitionState(competition.id);
      setState(newState);
    } catch (err) {
      console.error('Error refreshing state:', err);
    }
  };

  const endDate = new Date(competition.end_date);
  const now = new Date();
  const isActive = now < endDate && competition.status === 'open';

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">{competition.title}</h1>
            <p className="mt-2 text-slate-400">{competition.description}</p>
          </div>
          {state && (
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-right">
              <p className="text-sm text-slate-400">Your Portfolio</p>
              <p className="mt-1 text-2xl font-bold text-slate-100">
                ${state.total_portfolio_value.toLocaleString('en-US', {
                  maximumFractionDigits: 0,
                })}
              </p>
              <p className={`mt-1 text-sm ${state.total_gain >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                {state.total_gain >= 0 ? '+' : ''}
                {state.total_gain_percent.toFixed(1)}%
              </p>
              <p className="mt-2 text-xs text-slate-500">Rank: #{state.rank} / {state.rank_total}</p>
            </div>
          )}
        </div>

        {/* Status & Countdown */}
        <div className="flex flex-wrap gap-2">
          {isActive ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
              ● Open
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-500/20 px-3 py-1 text-xs font-semibold text-slate-300">
              ● Closed
            </span>
          )}
          <span className="rounded-full border border-slate-700 bg-slate-800/50 px-3 py-1 text-xs text-slate-400">
            {isActive ? 'Closes' : 'Closed'} {formatDistanceToNow(endDate, { addSuffix: true })}
          </span>
        </div>
      </div>

      {!isJoined ? (
        /* Not Joined View */
        <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-8 text-center">
          <h2 className="text-xl font-semibold text-slate-100">Join this Competition</h2>
          <p className="mt-2 text-slate-400">
            Start with ${(competition.starting_balance || 100000).toLocaleString()} and compete against other investors.
          </p>

          {/* Competition Rules */}
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {/* Asset Universe */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-left">
              <h3 className="font-semibold text-slate-100">Available Assets</h3>
              <p className="mt-2 text-xs text-slate-500">
                Pick from 100+ stocks including Tesla, Apple, Shell, Exxon, and more. Filter by ESG rating (green, brown, neutral).
              </p>
            </div>

            {/* Climate Shocks */}
            {competition.scripted_shocks && competition.scripted_shocks.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-left">
                <h3 className="font-semibold text-slate-100">Climate Shocks</h3>
                <p className="mt-2 text-xs text-slate-500">
                  All participants face {competition.scripted_shocks.length} preset climate event
                  {competition.scripted_shocks.length !== 1 ? 's' : ''} (carbon taxes, green booms, physical events).
                </p>
              </div>
            )}

            {/* Life Events */}
            {competition.life_events && competition.life_events.length > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-left">
                <h3 className="font-semibold text-slate-100">Life Events</h3>
                <p className="mt-2 text-xs text-slate-500">
                  Realistic cash flows: job loss, inheritance, emergencies. Everyone faces the same events.
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-6 rounded-lg border border-rose-700/50 bg-rose-950/30 p-4 text-sm text-rose-300">
              {error}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={loading || !isActive}
            className="mt-6 rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white hover:bg-cyan-500 disabled:opacity-50"
          >
            {loading ? 'Joining...' : 'Join Competition'}
          </button>
        </div>
      ) : (
        /* Joined View - Tabs */
        <>
          <div className="mb-6 flex gap-2 border-b border-slate-700">
            {(['overview', 'trade', 'portfolio', 'leaderboard'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-b-2 border-cyan-500 text-cyan-400'
                    : 'text-slate-500 hover:text-slate-400'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-semibold text-slate-100">Competition Rules</h3>
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-sm text-slate-300 leading-relaxed">
                  <p>
                    Pick from 100+ stocks and build a portfolio over {competition.start_date ? 
                      Math.ceil((endDate.getTime() - new Date(competition.start_date).getTime()) / (1000 * 60 * 60 * 24)) 
                      : '30'} days.
                  </p>
                  <p className="mt-2">
                    Win by having the highest portfolio value at the end. Climate shocks and life events affect everyone equally—skill in stock picking is what counts.
                  </p>
                </div>
              </div>

              {competition.scripted_shocks && competition.scripted_shocks.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-slate-100">Climate Shocks</h3>
                  <div className="space-y-2">
                    {competition.scripted_shocks.map((shock, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-700 bg-slate-800/30 p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-slate-200">
                              Year {shock.year}: {shock.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-400">{shock.description}</p>
                          </div>
                          <span className={`flex-shrink-0 rounded px-2 py-1 text-xs font-semibold ${
                            shock.magnitude < 0
                              ? 'bg-rose-500/20 text-rose-300'
                              : 'bg-emerald-500/20 text-emerald-300'
                          }`}>
                            {shock.magnitude > 0 ? '+' : ''}{(shock.magnitude * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {competition.life_events && competition.life_events.length > 0 && (
                <div>
                  <h3 className="mb-3 font-semibold text-slate-100">Life Events</h3>
                  <div className="space-y-2">
                    {competition.life_events.map((event, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-700 bg-slate-800/30 p-3 text-sm">
                        <p className="font-semibold text-slate-200">Year {event.year}: {event.label}</p>
                        <p className="mt-1 text-slate-400">
                          {event.amount > 0 ? '+' : ''} ${Math.abs(event.amount).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Trade Tab */}
          {activeTab === 'trade' && state && (
            <TradeForm
              cashBalance={state.cash_balance}
              holdings={state.holdings}
              onTradeComplete={handleTradeComplete}
            />
          )}

          {/* Portfolio Tab */}
          {activeTab === 'portfolio' && state && (
            <Portfolio
              state={state}
              onSellClick={() => setActiveTab('trade')}
            />
          )}

          {/* Leaderboard Tab */}
          {activeTab === 'leaderboard' && (
            <Link
              href={`/competitions/${competition.id}/leaderboard`}
              className="inline-block rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
            >
              View Full Leaderboard →
            </Link>
          )}
        </>
      )}
    </main>
  );
}
