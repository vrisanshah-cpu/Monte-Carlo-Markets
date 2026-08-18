import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ContestEntryForm } from '@/components/contests/ContestEntryForm';

export default async function ContestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: challenge } = await supabase.from('challenges').select('*').eq('id', id).single();

  if (!challenge) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">{challenge.title}</h1>
          <p className="mt-1 text-sm text-cyan-400/80">{challenge.tagline}</p>
        </div>
        <Link
          href={`/contests/${id}/leaderboard`}
          className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm text-slate-200 hover:bg-slate-700"
        >
          View Leaderboard
        </Link>
      </div>

      <p className="mb-6 text-sm leading-relaxed text-slate-400">{challenge.description}</p>

      <div className="mb-8 grid grid-cols-2 gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-xs md:grid-cols-4">
        <Rule label="Scenario" value={challenge.climate_scenario ?? 'â€”'} />
        <Rule label="Horizon" value={`${challenge.years} yrs`} />
        <Rule
          label="Min green alloc"
          value={challenge.min_green_allocation ? `${challenge.min_green_allocation * 100}%` : 'â€”'}
        />
        <Rule
          label="Max carbon intensity"
          value={challenge.max_carbon_intensity ? `${challenge.max_carbon_intensity} t/$M` : 'â€”'}
        />
      </div>

      <ContestEntryForm challenge={challenge} />
    </main>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-slate-500">{label}</div>
      <div className="mt-0.5 font-medium text-slate-200">{value}</div>
    </div>
  );
}
