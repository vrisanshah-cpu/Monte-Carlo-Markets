import Link from 'next/link';
import { listCompetitions } from '@/actions/competitions';
import { CompetitionArchiveButton } from '@/components/admin/CompetitionArchiveButton';

export default async function AdminCompetitionsPage() {
  const competitions = await listCompetitions();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">
            Simulated Climate Competitions
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Create and manage paper-trading competitions.
          </p>
        </div>

        <Link
          href="/admin/competitions/new"
          className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-500"
        >
          + New Competition
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Scenario</th>
              <th className="px-4 py-3 text-left">Dates</th>
              <th className="px-4 py-3 text-left">Shocks</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800">
            {competitions.map((competition) => (
              <tr
                key={competition.id}
                className="hover:bg-slate-900/40"
              >
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-200">
                    {competition.title}
                  </p>
                  <p className="mt-1 max-w-xs truncate text-xs text-slate-500">
                    {competition.description}
                  </p>
                </td>

                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      competition.status === 'open'
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : competition.status === 'archived'
                          ? 'bg-slate-700 text-slate-400'
                          : competition.status === 'closed'
                            ? 'bg-slate-600/50 text-slate-300'
                            : 'bg-amber-500/15 text-amber-400'
                    }`}
                  >
                    {competition.status}
                  </span>
                </td>

                <td className="px-4 py-3 text-slate-400">
                  {competition.climate_scenario}
                </td>

                <td className="px-4 py-3 text-xs text-slate-500">
                  {new Date(
                    competition.start_date
                  ).toLocaleDateString()}{' '}
                  –{' '}
                  {new Date(
                    competition.end_date
                  ).toLocaleDateString()}
                </td>

                <td className="px-4 py-3 text-slate-400">
                  {Array.isArray(competition.scripted_shocks)
                    ? competition.scripted_shocks.length
                    : 0}
                </td>

                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/competitions/${competition.id}`}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
                    >
                      View
                    </Link>

                    <Link
                      href={`/admin/competitions/${competition.id}/edit`}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs text-slate-200 hover:bg-slate-700"
                    >
                      Edit
                    </Link>

                    <CompetitionArchiveButton
                      id={competition.id}
                      disabled={
                        competition.status === 'archived'
                      }
                    />
                  </div>
                </td>
              </tr>
            ))}

            {competitions.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-12 text-center text-sm text-slate-500"
                >
                  No competitions yet. Create your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}