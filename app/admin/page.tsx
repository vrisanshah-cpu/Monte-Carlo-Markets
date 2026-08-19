import Link from 'next/link';
import { listChallenges } from '@/actions/challenges';
import { ArchiveButton } from '@/components/admin/ArchiveButton';

export default async function AdminChallengesPage() {
  const challenges = await listChallenges();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Admin Dashboard
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Manage challenges and simulated trading competitions.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/admin/challenges/new"
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
          >
            + Challenge
          </Link>

          <Link
            href="/admin/competitions/new"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white hover:bg-cyan-500"
          >
            + Competition
          </Link>
        </div>
      </div>

      <div className="rounded-xl border border-cyan-900/40 bg-cyan-950/20 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-cyan-200">
              Climate Trading Competitions
            </h3>
            <p className="mt-1 text-xs text-cyan-300/70">
              Create, edit, open, close, and archive paper-trading
              competitions.
            </p>
          </div>

          <Link
            href="/admin/competitions"
            className="rounded-lg border border-cyan-800 px-3 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-950/60"
          >
            Manage Competitions →
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Scenario</th>
              <th className="px-4 py-3 text-left">Window</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {challenges.map((c) => (
              <tr
                key={c.id}
                className="hover:bg-slate-900/40"
              >
                <td className="px-4 py-3 text-slate-200">
                  {c.title}
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      c.status === 'active'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : c.status === 'archived'
                          ? 'bg-slate-700 text-slate-400'
                          : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {c.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-slate-400">
                  {c.climate_scenario ?? '—'}
                </td>

                <td className="px-4 py-3 text-xs text-slate-500">
                  {c.starts_at
                    ? new Date(c.starts_at).toLocaleDateString()
                    : '—'}{' '}
                  –{' '}
                  {c.ends_at
                    ? new Date(c.ends_at).toLocaleDateString()
                    : '—'}
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/admin/challenges/${c.id}/edit`}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
                    >
                      Edit
                    </Link>

                    <ArchiveButton
                      id={c.id}
                      disabled={c.status === 'archived'}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}