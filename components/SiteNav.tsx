import Link from 'next/link';

export function SiteNav() {
  return (
    <header className="border-b border-slate-800 bg-slate-950/95">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <Link
          href="/"
          className="font-semibold text-slate-100"
        >
          Monte Carlo Markets
        </Link>

        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            href="/sandbox"
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Sandbox
          </Link>

          <Link
            href="/game"
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Game
          </Link>

          <Link
            href="/contests"
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Contests
          </Link>

          <Link
            href="/competitions"
            className="rounded-lg bg-cyan-950/50 px-3 py-1.5 text-sm font-medium text-cyan-300 hover:bg-cyan-950"
          >
            Competitions
          </Link>

          <Link
            href="/dashboard"
            className="rounded-lg px-3 py-1.5 text-sm text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            Dashboard
          </Link>
        </div>
      </nav>
    </header>
  );
}