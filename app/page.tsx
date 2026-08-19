import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">Monte Carlo Markets</h1>

      <p className="text-slate-400">
        Run 10,000-path portfolio simulations, play crisis scenarios,
        and compete in climate-finance investment challenges.
      </p>

      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/sandbox"
          className="rounded-lg bg-cyan-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-cyan-500"
        >
          Open Sandbox
        </Link>

        <Link
          href="/game"
          className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-700"
        >
          Scenario Game
        </Link>

        <Link
          href="/contests"
          className="rounded-lg border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm text-slate-200 hover:bg-slate-700"
        >
          Climate Contests
        </Link>

        <Link
          href="/competitions"
          className="rounded-lg border border-cyan-800 bg-cyan-950/40 px-5 py-2.5 text-sm font-medium text-cyan-300 hover:bg-cyan-950/70"
        >
          Trading Competitions
        </Link>
      </div>
    </main>
  );
}