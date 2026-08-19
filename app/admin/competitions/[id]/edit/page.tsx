import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CompetitionForm } from '@/components/admin/CompetitionForm';

export default async function EditCompetitionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();

  const { data: competition } = await supabase
    .from('competitions')
    .select('*')
    .eq('id', id)
    .single();

  if (!competition) notFound();

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-slate-100">
        Edit: {competition.title}
      </h2>

      <p className="mb-6 text-sm text-slate-500">
        Update the competition settings and simulated events.
      </p>

      <CompetitionForm initial={competition} />
    </div>
  );
}