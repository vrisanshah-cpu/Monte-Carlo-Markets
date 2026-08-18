import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ChallengeForm } from '@/components/admin/ChallengeForm';

export default async function EditChallengePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: challenge } = await supabase.from('challenges').select('*').eq('id', id).single();

  if (!challenge) notFound();

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold text-slate-100">Edit: {challenge.title}</h2>
      <ChallengeForm initial={challenge} />
    </div>
  );
}
