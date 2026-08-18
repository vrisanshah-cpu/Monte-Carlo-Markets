import { createClient } from '@/lib/supabase/server';
import { LeaderboardTable } from '@/components/contests/LeaderboardTable';

export default async function LeaderboardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: challenge }, { data: leaderboard }] = await Promise.all([
    supabase.from('challenges').select('title').eq('id', id).single(),
    supabase
      .from('leaderboard')
      .select('*')
      .eq('challenge_id', id)
      .order('rank', { ascending: true })
      .limit(100),
  ]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold text-slate-100">
        {challenge?.title ?? 'Contest'} — Leaderboard
      </h1>
      <LeaderboardTable rows={leaderboard ?? []} contestId={id} />
    </main>
  );
}
