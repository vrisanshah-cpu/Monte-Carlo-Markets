import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function ContestsPage() {
  const supabase = await createClient();
  const { data: challenges } = await supabase
    .from('challenges')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold text-slate-100">Climate-Finance Contests</h1>
      <p className="mb-8 text-sm text-slate-400">
        Build a portfolio, run the simulation, and get scored on risk-adjusted return and
        climate impact.
      </p>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {challenges?.map((c) => (
          <Link
            key={c.id}
            href={`/contests/${c.id}`}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 hover:border-cyan-500/50 transition-colors"
          >
            <h2 className="text-base font-semibold text-slate-100">{c.title}</h2>
            <p className="mt-1 text-sm text-cyan-400/80">{c.tagline}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{c.description}</p>
            <div className="mt-3 flex gap-3 text-xs text-slate-500">
              <span>{c.years} years</span>
              <span>•</span>
              <span>{c.climate_scenario ?? 'custom'} scenario</span>
            </div>
          </Link>
        ))}
        {(!challenges || challenges.length === 0) && (
          <p className="text-sm text-slate-500">No active contests right now — check back soon.</p>
        )}
      </div>
    </main>
  );
}
