import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCompetitionBrief, getCompetitionLeaderboard } from '@/actions/trading';
import { notFound } from 'next/navigation';

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    notFound();
  }

  try {
    const competition = await getCompetitionBrief(id);
    const leaderboard = await getCompetitionLeaderboard(id);

    if (!competition) {
      notFound();
    }

    return (
      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-100">{competition.title}</h1>
            <p className="mt-1 text-slate-400">Leaderboard</p>
          </div>
          <Link
            href={`/competitions/${id}`}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-medium text-slate-200 hover:bg-slate-700"
          >
            ← Back to Competition
          </Link>
        </div>

        {/* Leaderboard Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full">
            <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">Rank</th>
                <th className="px-4 py-3 text-left">Player</th>
                <th className="px-4 py-3 text-right">Starting Balance</th>
                <th className="px-4 py-3 text-right">Current Value</th>
                <th className="px-4 py-3 text-right">Total Gain</th>
                <th className="px-4 py-3 text-right">Return %</th>
                <th className="px-4 py-3 text-left">Top Holdings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No participants yet
                  </td>
                </tr>
              ) : (
                leaderboard.map((entry) => (
                  <tr key={entry.user_id} className="hover:bg-slate-900/40 transition-colors">
                    {/* Rank */}
                    <td className="px-4 py-3 font-bold text-slate-300">
                      <span className="flex items-center gap-2">
                        {entry.rank <= 3 && (
                          <Trophy className="h-4 w-4 text-amber-400" />
                        )}
                        #{entry.rank}
                      </span>
                    </td>

                    {/* Player */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-100">{entry.display_name}</p>
                      <p className="text-xs text-slate-500">@{entry.username}</p>
                    </td>

                    {/* Starting Balance */}
                    <td className="px-4 py-3 text-right text-sm text-slate-300">
                      $
                      {entry.starting_balance.toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })}
                    </td>

                    {/* Current Value */}
                    <td className="px-4 py-3 text-right text-sm font-semibold text-slate-100">
                      $
                      {entry.current_portfolio_value.toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })}
                    </td>

                    {/* Total Gain */}
                    <td
                      className={`px-4 py-3 text-right text-sm font-semibold ${
                        entry.total_gain >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {entry.total_gain >= 0 ? '+' : ''}$
                      {Math.abs(entry.total_gain).toLocaleString('en-US', {
                        maximumFractionDigits: 0,
                      })}
                    </td>

                    {/* Return % */}
                    <td
                      className={`px-4 py-3 text-right text-sm font-semibold ${
                        entry.total_gain_percent >= 0 ? 'text-emerald-300' : 'text-rose-300'
                      }`}
                    >
                      {entry.total_gain_percent >= 0 ? '+' : ''}
                      {entry.total_gain_percent.toFixed(1)}%
                    </td>

                    {/* Top Holdings */}
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {entry.top_holdings.length > 0 ? (
                        <div className="flex gap-2">
                          {entry.top_holdings.map((holding, idx) => (
                            <span
                              key={idx}
                              className="rounded-full bg-slate-700/50 px-2 py-1"
                              title={`${holding.percent_of_portfolio.toFixed(1)}%`}
                            >
                              {holding.ticker}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600">No positions</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="mt-8 rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-400">
            <Trophy className="mb-1 inline h-4 w-4 text-amber-400 mr-1" />
            Top 3 finishers are highlighted with a trophy icon.
          </p>
        </div>
      </main>
    );
  } catch (error) {
    console.error('Error loading leaderboard:', error);
    notFound();
  }
}
