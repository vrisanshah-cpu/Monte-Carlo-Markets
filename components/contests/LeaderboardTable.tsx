'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';

interface LeaderboardRow {
  rank: number;
  submission_id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  portfolio_return: number;
  climate_var_95: number;
  implied_temp_rise: number;
  composite_score: number;
  created_at: string;
}

export function LeaderboardTable({
  rows: initialRows,
  contestId,
}: {
  rows: LeaderboardRow[];
  contestId: string;
}) {
  const [rows, setRows] = useState<LeaderboardRow[]>(initialRows);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/leaderboard/${contestId}`, { cache: 'no-store' });
        if (!res.ok) return;
        const json = await res.json();
        setRows(json.leaderboard ?? []);
      } catch {
        // ignore transient polling errors
      }
    }, 15_000);
    return () => clearInterval(interval);
  }, [contestId]);

  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No entries yet — be the first to submit.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800">
      <table className="w-full text-sm">
        <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Rank</th>
            <th className="px-4 py-3 text-left">User</th>
            <th className="px-4 py-3 text-right">Return</th>
            <th className="px-4 py-3 text-right">Climate VaR</th>
            <th className="px-4 py-3 text-right">Temp Rise</th>
            <th className="px-4 py-3 text-right">Score</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {rows.map((r) => (
            <tr key={r.submission_id} className="hover:bg-slate-900/40">
              <td className="px-4 py-3 font-medium text-slate-300">
                <span className="flex items-center gap-1.5">
                  {r.rank <= 3 && <Trophy className="h-3.5 w-3.5 text-amber-400" />}
                  {r.rank}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-300">{r.display_name ?? r.username ?? 'Anonymous'}</td>
              <td className="px-4 py-3 text-right tabular-nums text-emerald-400">
                ${Math.round(r.portfolio_return).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-rose-400">
                ${Math.round(Math.abs(r.climate_var_95)).toLocaleString()}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-slate-300">
                {r.implied_temp_rise.toFixed(1)}°C
              </td>
              <td className="px-4 py-3 text-right tabular-nums font-semibold text-cyan-400">
                {r.composite_score.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
