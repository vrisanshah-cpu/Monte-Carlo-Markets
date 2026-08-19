import Link from 'next/link';
import { listPublicCompetitions } from '@/actions/competitions';

export default async function CompetitionsPage() {
  const competitions = await listPublicCompetitions();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-wider text-cyan-400">
          Paper Trading
        </p>

        <h1 className="mt-2 text-3xl font-bold text-slate-100">
          Climate Trading Competitions
        </h1>

        <p className="mt-3 max-w-2xl text-slate-400">
          Build simulated portfolios, respond to climate-market
          shocks, and compare your investment decisions with other
          participants. Every competition uses simulated money.
        </p>
      </div>

      {competitions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-12 text-center">
          <h2 className="text-xl font-semibold text-slate-200">
            No competitions are open right now
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Check back when the next climate competition opens.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2">
          {competitions.map((competition) => {
            const isOpen = competition.status === 'open';

            return (
              <article
                key={competition.id}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 transition hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                        isOpen
                          ? 'bg-emerald-500/15 text-emerald-300'
                          : 'bg-slate-700 text-slate-300'
                      }`}
                    >
                      {isOpen ? 'Open' : 'Closed'}
                    </span>

                    <h2 className="mt-4 text-xl font-bold text-slate-100">
                      {competition.title}
                    </h2>
                  </div>

                  <span className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                    {competition.climate_scenario}
                  </span>
                </div>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-400">
                  {competition.description}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-800/60 p-3">
                    <p className="text-slate-500">Simulated balance</p>
                    <p className="mt-1 font-semibold text-slate-200">
                      $
                      {Number(
                        competition.starting_balance
                      ).toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-lg bg-slate-800/60 p-3">
                    <p className="text-slate-500">Climate shocks</p>
                    <p className="mt-1 font-semibold text-slate-200">
                      {Array.isArray(
                        competition.scripted_shocks
                      )
                        ? competition.scripted_shocks.length
                        : 0}
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  {new Date(
                    competition.start_date
                  ).toLocaleDateString()}{' '}
                  →{' '}
                  {new Date(
                    competition.end_date
                  ).toLocaleDateString()}
                </div>

                <Link
                  href={`/competitions/${competition.id}`}
                  className="mt-6 block rounded-lg bg-cyan-600 px-4 py-2.5 text-center text-sm font-semibold text-white hover:bg-cyan-500"
                >
                  {isOpen
                    ? 'View & Join Competition'
                    : 'View Competition'}
                </Link>
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
}